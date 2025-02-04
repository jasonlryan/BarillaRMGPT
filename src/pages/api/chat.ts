import { NextRequest } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const config = {
  runtime: 'edge',
};

function isMessageDelta(event: any): event is { 
  event: string; 
  data: { 
    delta: { 
      content: Array<{ type: 'text'; text: { value: string } }> 
    } 
  } 
} {
  return (
    event.event === 'thread.message.delta' &&
    event.data?.delta?.content?.[0]?.type === 'text' &&
    typeof event.data.delta.content[0].text?.value === 'string'
  );
}

export default async function handler(req: NextRequest) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { message } = await req.json();

    // Get or create thread ID from session
    let threadId = req.cookies.get('threadId')?.value;
    if (!threadId) {
      const thread = await openai.beta.threads.create();
      threadId = thread.id;
    }

    // Add the user's message to the thread
    await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: message,
    });

    // Create a new TransformStream for streaming
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Start streaming in the background
    (async () => {
      let isStreamClosed = false;
      try {
        const stream = await openai.beta.threads.runs.createAndStream(
          threadId,
          { assistant_id: process.env.OPENAI_ASSISTANT_ID! }
        );

        for await (const event of stream) {
          if (isStreamClosed) break;
          
          // Handle message deltas
          if (isMessageDelta(event)) {
            const content = event.data.delta.content[0].text.value;
            await writer.write(
              new TextEncoder().encode(`data: ${JSON.stringify({ token: content })}\n\n`)
            );
          }
        }
      } catch (error) {
        if (!isStreamClosed) {
          await writer.write(
            new TextEncoder().encode(
              `data: ${JSON.stringify({ error: 'An error occurred' })}\n\n`)
          );
        }
      } finally {
        isStreamClosed = true;
        try {
          await writer.close();
        } catch (e) {
          // Ignore errors from closing an already closed writer
        }
      }
    })();

    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'An error occurred' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 