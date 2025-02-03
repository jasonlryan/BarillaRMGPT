const OpenAI = require("openai");

class OpenAIService {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not set");
    }
    if (!process.env.OPENAI_ASSISTANT_ID) {
      console.error("OPENAI_ASSISTANT_ID is not set");
    }

    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.assistantId = process.env.OPENAI_ASSISTANT_ID;
  }

  async createThread() {
    try {
      const thread = await this.client.beta.threads.create();
      return thread.id;
    } catch (error) {
      console.error("Error creating thread:", error);
      throw error;
    }
  }

  async addMessageToThread(threadId, message) {
    try {
      await this.client.beta.threads.messages.create(threadId, {
        role: "user",
        content: message,
      });
    } catch (error) {
      console.error("Error adding message:", error);
      throw error;
    }
  }

  async *streamResponse(threadId, runId) {
    try {
      let lastMessageId = null;

      while (true) {
        const run = await this.client.beta.threads.runs.retrieve(
          threadId,
          runId
        );

        if (run.status === "completed") {
          const messages = await this.client.beta.threads.messages.list(
            threadId
          );
          const latestMessage = messages.data[0];

          if (latestMessage.id !== lastMessageId) {
            lastMessageId = latestMessage.id;
            if (latestMessage.role === "assistant") {
              const content = latestMessage.content[0].text.value;
              const cleanContent = content.replace(/【\d+:\d+†source】/g, "");

              const chunks = cleanContent.match(/.{1,3}/g) || [];
              for (const chunk of chunks) {
                yield chunk;
                await new Promise((resolve) => setTimeout(resolve, 10));
              }
            }
          }
          break;
        }

        if (run.status === "failed" || run.status === "cancelled") {
          throw new Error(`Assistant run ${run.status}`);
        }

        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    } catch (error) {
      console.error("Error in stream:", error);
      throw error;
    }
  }

  async runAssistant(threadId) {
    try {
      const run = await this.client.beta.threads.runs.create(threadId, {
        assistant_id: this.assistantId,
      });
      return run.id;
    } catch (error) {
      console.error("Error running assistant:", error);
      throw error;
    }
  }

  async getMessages(threadId) {
    try {
      const response = await this.client.beta.threads.messages.list(threadId);
      return response.data;
    } catch (error) {
      console.error("Error getting messages:", error);
      throw error;
    }
  }
}

module.exports = new OpenAIService();
