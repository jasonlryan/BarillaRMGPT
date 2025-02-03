import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import type { RunSubmitToolOutputsParams } from 'openai/resources/beta/threads/runs/runs';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Store active threads
const activeThreads: { [key: string]: string } = {};

export const config = {
  runtime: 'edge',
};

// Type guard for message delta events
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
    console.log('🔵 API: Starting chat request');
    const startTime = Date.now();
    const { message } = await req.json();

    // Get or create thread ID from session
    let threadId = activeThreads[req.cookies.get('sessionId')?.value || ''];
    if (!threadId) {
      console.log('🔵 API: Creating new thread');
      const thread = await openai.beta.threads.create();
      threadId = thread.id;
      // In a real app, store this in a database
      activeThreads[req.cookies.get('sessionId')?.value || ''] = threadId;
    }

    // Add the user's message to the thread
    console.log('🔵 API: Adding message to thread');
    await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: message,
    });

    // Create a new TransformStream for streaming
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Start streaming in the background
    (async () => {
      try {
        // Create and stream the run
        console.log('🔵 API: Creating and streaming run');
        const stream = await openai.beta.threads.runs.createAndStream(
          threadId,
          { assistant_id: process.env.OPENAI_ASSISTANT_ID! }
        );

        console.log('🔵 API: Starting event stream processing');
        for await (const event of stream) {
          console.log('🔵 API: Received event:', JSON.stringify(event));
          
          // Handle message deltas
          if (isMessageDelta(event)) {
            const content = event.data.delta.content[0].text.value;
            console.log('🔵 API: Streaming content:', content);
            await writer.write(
              new TextEncoder().encode(`data: ${JSON.stringify({ token: content })}\n\n`)
            );
          }
          
          // Handle run status updates
          if ('event' in event) {
            if (event.event === 'thread.run.created') {
              console.log('🔵 API: Run created');
            } else if (event.event === 'thread.run.queued') {
              console.log('🔵 API: Run queued');
            } else if (event.event === 'thread.run.in_progress') {
              console.log('🔵 API: Run in progress');
            } else if (event.event === 'thread.run.completed') {
              console.log('🔵 API: Run completed');
              const timeToComplete = Date.now() - startTime;
              console.log(`🔵 API: Run completed in ${timeToComplete}ms`);
            } else if (event.event === 'thread.run.failed') {
              console.error('🔴 API: Run failed');
              throw new Error('Assistant run failed');
            }
          }
        }
        console.log('🔵 API: Event stream ended');
      } catch (error) {
        console.error('🔴 API Error:', error);
        await writer.write(
          new TextEncoder().encode(
            `data: ${JSON.stringify({ error: 'An error occurred' })}\n\n`)
        );
      } finally {
        await writer.close();
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
    console.error('🔴 API Error:', error);
    return new Response(JSON.stringify({ error: 'An error occurred' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 