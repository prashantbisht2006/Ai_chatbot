"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.responseHandler = void 0;
class responseHandler {
    constructor(openai, openAiThread, assistanceStreram, chatClient, channel, message, onDisposel) {
        this.openai = openai;
        this.openAiThread = openAiThread;
        this.assistanceStreram = assistanceStreram;
        this.chatClient = chatClient;
        this.channel = channel;
        this.message = message;
        this.onDisposel = onDisposel;
        this.message_text = "";
        this.chunk_counter = 0;
        this.run_id = "";
        this.is_done = false;
        this.last_update_time = 0;
        this.run = async () => { };
        this.dispose = async () => { };
        this.handleStreamEvents = async (event) => { };
        this.handleError = async (event) => { };
        this.performWebSearch = async (query) => {
            const TAVILY_API_;
        };
        this.handleStopGenerating = async (event) => { };
        this.chatClient.on("ai_indicator.stop", this.handleStopGenerating);
    }
}
exports.responseHandler = responseHandler;
//# sourceMappingURL=responseHandler.js.map