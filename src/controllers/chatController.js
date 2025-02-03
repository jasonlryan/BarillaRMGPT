const openaiService = require("../services/openaiService");

class ChatController {
  async handleChat(req, res) {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");

    try {
      // Get or create thread ID from session
      let threadId = req.session.threadId;
      if (!threadId) {
        threadId = await openaiService.createThread();
        req.session.threadId = threadId;
      }

      // Add message to thread
      await openaiService.addMessageToThread(threadId, message);

      // Run the assistant
      const runId = await openaiService.runAssistant(threadId);

      // Flush headers immediately
      res.flushHeaders();

      // Stream the response
      for await (const chunk of openaiService.streamResponse(threadId, runId)) {
        const data = JSON.stringify({
          token: chunk,
          done: false,
        });
        res.write(`data: ${data}\n\n`);
        // Ensure the chunk is sent immediately
        if (res.flush) res.flush();
      }

      // Send completion signal
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Chat error:", error);
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }

  resetThread(req, res) {
    req.session.threadId = null;
    res.status(204).end();
  }
}

module.exports = new ChatController();
