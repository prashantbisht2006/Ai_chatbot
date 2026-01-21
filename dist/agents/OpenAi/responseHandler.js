"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseHandler = void 0;
class ResponseHandler {
    constructor(openai, chatClient, channel, message, onDispose) {
        this.openai = openai;
        this.chatClient = chatClient;
        this.channel = channel;
        this.message = message;
        this.onDispose = onDispose;
        this.messageText = "";
        this.isDone = false;
        this.lastUpdateTime = 0;
        this.abortController = new AbortController();
        // ===============================
        // MAIN RUN METHOD
        // ===============================
        this.run = async () => {
            try {
                const response = await this.openai.responses.create({
                    model: "gpt-4.1",
                    input: this.message.text,
                    stream: true
                }, {
                    signal: this.abortController.signal
                });
                for await (const event of response) {
                    await this.handleStreamEvent(event);
                }
                await this.finalize();
            }
            catch (error) {
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
        this.handleStopGenerating = async (event) => {
            if (this.isDone || event.message_id !== this.message.id)
                return;
            console.log("Stopping AI generation for:", this.message.id);
            this.abortController.abort();
            await this.dispose();
        };
        // ===============================
        // STREAM HANDLING
        // ===============================
        this.handleStreamEvent = async (event) => {
            if (this.isDone)
                return;
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
        this.throttledUpdate = async () => {
            const now = Date.now();
            if (now - this.lastUpdateTime < 300)
                return;
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
        this.finalize = async () => {
            if (this.isDone)
                return;
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
        this.handleError = async (error) => {
            if (this.isDone)
                return;
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
        this.dispose = async () => {
            if (this.isDone)
                return;
            this.isDone = true;
            this.chatClient.off("ai_indicator.stop", this.handleStopGenerating);
            this.onDispose();
        };
        // ===============================
        // WEB SEARCH (OPTIONAL TOOL)
        // ===============================
        this.performWebSearch = async (query) => {
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
            }
            catch {
                return JSON.stringify({
                    error: "Web search exception"
                });
            }
        };
        this.chatClient.on("ai_indicator.stop", this.handleStopGenerating);
    }
}
exports.ResponseHandler = ResponseHandler;
//# sourceMappingURL=responseHandler.js.map