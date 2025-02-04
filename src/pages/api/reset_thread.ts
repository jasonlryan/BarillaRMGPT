import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get the current thread ID from the session
    const threadId = req.cookies.threadId;
    
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

    // Set the new thread ID in a cookie
    res.setHeader(
      "Set-Cookie",
      `threadId=${thread.id}; Path=/; HttpOnly; SameSite=Strict`
    );

    return res.status(200).json({ success: true, threadId: thread.id });
  } catch (error) {
    console.error("Error resetting thread:", error);
    return res.status(500).json({ error: "Failed to reset thread" });
  }
} 