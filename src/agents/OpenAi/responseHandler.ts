import OpenAI from "openai";
import type { Channel, Event, MessageResponse, StreamChat } from "stream-chat";

export class ResponseHandler {
  private messageText = "";
  private isDone = false;
  private lastUpdateTime = 0;
  private abortController = new AbortController();

  constructor(
    private readonly openai: OpenAI,
    private readonly chatClient: StreamChat,
    private readonly channel: Channel,
    private readonly message: MessageResponse,
    private readonly onDispose: () => void
  ) {
    this.chatClient.on("ai_indicator.stop", this.handleStopGenerating);
  }

  // ===============================
  // MAIN RUN METHOD
  // ===============================
  run = async () => {
    try {
      const response = await this.openai.responses.create(
        {
          model: "gpt-4.1",
          input: this.message.text,
          stream: true
        },
        {
          signal: this.abortController.signal
        }
      );

      for await (const event of response) {
        await this.handleStreamEvent(event);
      }

      await this.finalize();
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log("AI generation aborted");
        return;
      }
      await this.handleError(error);
    }
  };

  // ===============================
  // STOP GENERATION (CANCEL)
  // ===============================
  private handleStopGenerating = async (event: Event) => {
    if (this.isDone || event.message_id !== this.message.id) return;

    console.log("Stopping AI generation for:", this.message.id);

    this.abortController.abort();
    await this.dispose();
  };

  // ===============================
  // STREAM HANDLING
  // ===============================
  private handleStreamEvent = async (event: any) => {
    if (this.isDone) return;

    if (event.type === "response.output_text.delta") {
      this.messageText += event.delta;
      await this.throttledUpdate();
    }

    if (event.type === "response.completed") {
      await this.finalize();
    }
  };

  // ===============================
  // THROTTLED MESSAGE UPDATE
  // ===============================
  private throttledUpdate = async () => {
    const now = Date.now();
    if (now - this.lastUpdateTime < 300) return;

    this.lastUpdateTime = now;

    await this.chatClient.partialUpdateMessage(this.message.id, {
      set: {
        text: this.messageText
      }
    });
  };

  // ===============================
  // FINALIZE MESSAGE
  // ===============================
  private finalize = async () => {
    if (this.isDone) return;
    this.isDone = true;

    await this.chatClient.partialUpdateMessage(this.message.id, {
      set: {
        text: this.messageText
      }
    });

    await this.dispose();
  };

  // ===============================
  // ERROR HANDLING
  // ===============================
  private handleError = async (error: Error) => {
    if (this.isDone) return;

    console.error("AI Error:", error);

    await this.channel.sendEvent({
      type: "ai_indicator.update",
      ai_state: "AI_STATE_ERROR",
      cid: this.message.cid,
      message_id: this.message.id
    });

    await this.chatClient.partialUpdateMessage(this.message.id, {
      set: {
        text: error.message || "Error generating response"
      }
    });

    await this.dispose();
  };

  // ===============================
  // CLEANUP
  // ===============================
  dispose = async () => {
    if (this.isDone) return;
    this.isDone = true;

    this.chatClient.off("ai_indicator.stop", this.handleStopGenerating);
    this.onDispose();
  };

  // ===============================
  // WEB SEARCH (OPTIONAL TOOL)
  // ===============================
  private performWebSearch = async (query: string): Promise<string> => {
    const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

    if (!TAVILY_API_KEY) {
      return JSON.stringify({
        error: "Web search not available. API key missing."
      });
    }

    try {
      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TAVILY_API_KEY}`
        },
        body: JSON.stringify({
          query,
          search_depth: "advanced",
          max_results: 5,
          include_answer: true
        })
      });

      if (!response.ok) {
        return JSON.stringify({
          error: "Search failed",
          status: response.status
        });
      }

      return JSON.stringify(await response.json());
    } catch {
      return JSON.stringify({
        error: "Web search exception"
      });
    }
  };
}
