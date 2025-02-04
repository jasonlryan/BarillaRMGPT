import { NextRequest } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const config = {
  runtime: "edge",
};

export default async function handler(req: NextRequest) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Get the current thread ID from the cookie
    const threadId = req.cookies.get("threadId")?.value;
    
    if (threadId) {
      try {
        // Delete the existing thread
        await openai.beta.threads.del(threadId);
      } catch (error) {
        console.log("Error deleting thread or thread already deleted:", error);
        // Continue even if thread deletion fails
      }
    }

    // Create a new thread
    const thread = await openai.beta.threads.create();

    // Create the response with the new thread ID
    const response = new Response(
      JSON.stringify({ success: true, threadId: thread.id }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": `threadId=${thread.id}; Path=/; HttpOnly; SameSite=Strict`,
        },
      }
    );

    return response;
  } catch (error) {
    console.error("Error resetting thread:", error);
    return new Response(
      JSON.stringify({ error: "Failed to reset thread" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
} 