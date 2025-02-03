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

    // Log assistant initialization
    console.log(
      "OpenAI Service initialized with Assistant ID:",
      this.assistantId
    );
  }

  async createThread() {
    try {
      console.log("Creating new thread...");
      const thread = await this.client.beta.threads.create();
      console.log("Thread created with ID:", thread.id);
      return thread.id;
    } catch (error) {
      console.error("Error creating thread:", error);
      throw error;
    }
  }

  async addMessageToThread(threadId, message) {
    try {
      console.log(`Adding message to thread ${threadId}:`, message);
      const response = await this.client.beta.threads.messages.create(
        threadId,
        {
          role: "user",
          content: message,
        }
      );
      console.log("Message added successfully:", response);
      return response;
    } catch (error) {
      console.error("Error adding message:", error);
      throw error;
    }
  }

  async runAssistant(threadId) {
    try {
      console.log(`Starting assistant run on thread ${threadId}`);
      console.log("Using assistant ID:", this.assistantId);

      const run = await this.client.beta.threads.runs.create(threadId, {
        assistant_id: this.assistantId,
      });

      console.log("Run created:", run);
      return run.id;
    } catch (error) {
      console.error("Error running assistant:", error);
      throw error;
    }
  }

  async waitForRunCompletion(threadId, runId) {
    try {
      console.log(`Waiting for run ${runId} completion...`);
      let run;
      do {
        run = await this.client.beta.threads.runs.retrieve(threadId, runId);
        console.log("Run status:", run.status);

        if (run.status === "failed") {
          console.error("Run failed:", run);
          throw new Error(
            `Assistant run failed: ${
              run.last_error?.message || "Unknown error"
            }`
          );
        }

        if (run.status !== "completed") {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } while (run.status !== "completed");

      console.log("Run completed successfully:", run);
    } catch (error) {
      console.error("Error checking run status:", error);
      throw error;
    }
  }

  async getMessages(threadId) {
    try {
      console.log(`Retrieving messages for thread ${threadId}`);
      const response = await this.client.beta.threads.messages.list(threadId);
      console.log("Raw messages response:", JSON.stringify(response, null, 2));

      // Log each message for debugging
      response.data.forEach((msg, index) => {
        console.log(`Message ${index}:`, {
          role: msg.role,
          content: msg.content,
          created_at: msg.created_at,
        });
      });

      return response.data;
    } catch (error) {
      console.error("Error getting messages:", error);
      throw error;
    }
  }
}

module.exports = new OpenAIService();
