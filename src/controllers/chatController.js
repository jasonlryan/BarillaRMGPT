const openaiService = require("../services/openaiService");
const cache = require("../utils/cache");

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

      // Wait for completion
      await openaiService.waitForRunCompletion(threadId, runId);

      // Get messages
      const messages = await openaiService.getMessages(threadId);

      // Send the latest assistant message
      const latestMessage = messages[0];
      if (latestMessage && latestMessage.role === "assistant") {
        // Send the message content as tokens to match frontend expectations
        const content = latestMessage.content[0].text.value;
        res.write(
          `data: ${JSON.stringify({
            token: content,
            done: false,
          })}\n\n`
        );
      }

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
