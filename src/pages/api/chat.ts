import { NextRequest } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Store active threads
const activeThreads: { [key: string]: string } = {};

export const config = {
  runtime: 'edge',
};

export default async function handler(req: NextRequest) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    console.log('🔵 API: Starting chat request');
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

    // Run the assistant
    console.log('🔵 API: Running assistant');
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: process.env.OPENAI_ASSISTANT_ID!,
    });

    // Create a new TransformStream for streaming
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Start streaming in the background
    (async () => {
      try {
        while (true) {
          const runStatus = await openai.beta.threads.runs.retrieve(
            threadId,
            run.id
          );

          if (runStatus.status === 'completed') {
            // Get the assistant's messages
            const messages = await openai.beta.threads.messages.list(threadId);
            const lastMessage = messages.data[0];

            if (lastMessage.role === 'assistant') {
              // Stream each character of the message
              const content = lastMessage.content[0].text.value;
              for (const char of content) {
                await writer.write(
                  new TextEncoder().encode(`data: ${JSON.stringify({ token: char })}\n\n`)
                );
              }
            }
            break;
          } else if (runStatus.status === 'failed') {
            throw new Error('Assistant run failed');
          }

          // Wait before checking again
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error('🔴 API Error:', error);
        await writer.write(
          new TextEncoder().encode(
            `data: ${JSON.stringify({ error: 'An error occurred' })}\n\n`
          )
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