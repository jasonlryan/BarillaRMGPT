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
        const POLLING_INTERVAL = 150;
        const STREAM_CHUNK_SIZE = 3; // Stream 3 characters at a time for smooth appearance
        let lastStatus = '';
        let lastContent = '';
        
        // Helper function to stream content in small chunks
        const streamInChunks = async (content: string) => {
          for (let i = 0; i < content.length; i += STREAM_CHUNK_SIZE) {
            const chunk = content.slice(i, Math.min(i + STREAM_CHUNK_SIZE, content.length));
            await writer.write(
              new TextEncoder().encode(`data: ${JSON.stringify({ token: chunk })}\n\n`)
            );
            // Small delay between chunks for more natural appearance
            await new Promise(resolve => setTimeout(resolve, 5));
          }
        };
        
        while (true) {
          const runStatus = await openai.beta.threads.runs.retrieve(
            threadId,
            run.id
          );

          // Only log when status changes
          if (runStatus.status !== lastStatus) {
            console.log(`🔵 API: Run status - ${runStatus.status}`);
            lastStatus = runStatus.status;
          }

          // Check messages while in progress or completed
          if (runStatus.status === 'in_progress' || runStatus.status === 'completed') {
            const messages = await openai.beta.threads.messages.list(threadId);
            const latestMessage = messages.data[0];

            if (latestMessage?.role === 'assistant' && latestMessage?.content?.[0]) {
              const messageContent = latestMessage.content[0];
              
              if ('text' in messageContent && messageContent.text.value) {
                const currentContent = messageContent.text.value;
                
                // Only stream the new content
                if (currentContent !== lastContent) {
                  const newContent = currentContent.slice(lastContent.length);
                  if (newContent.length > 0) {
                    console.log('🔵 API: New content length:', newContent.length);
                    await streamInChunks(newContent);
                  }
                  lastContent = currentContent;
                }
              }
            }
          }

          if (runStatus.status === 'completed') {
            const timeToComplete = Date.now() - startTime;
            console.log(`🔵 API: Run completed in ${timeToComplete}ms`);
            break;
          } else if (runStatus.status === 'failed') {
            console.error('🔴 API: Run failed');
            throw new Error('Assistant run failed');
          }

          // Wait before checking again
          await new Promise((resolve) => setTimeout(resolve, POLLING_INTERVAL));
        }
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