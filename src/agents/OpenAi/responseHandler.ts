import OpenAI from "openai";
import type { AssistantStream } from "openai/lib/AssistantStream";
import type { Channel, Event, MessageResponse, StreamChat } from "stream-chat";

export class responseHandler {
  private message_text = "";
  private chunk_counter = 0;
  private run_id = "";
  private is_done = false;
  private last_update_time = 0;

  constructor(
    private readonly openai: OpenAI,
    private readonly openAiThread: OpenAI.Beta.Threads.Thread,
    private readonly assistanceStreram: AssistantStream,
    private readonly chatClient: StreamChat,
    private readonly channel: Channel,
    private readonly message: MessageResponse,
    private readonly onDisposel: () => void,
  ) {
    this.chatClient.on("ai_indicator.stop", this.handleStopGenerating);
  }

  run = async () => {};
  dispose = async () => {};
  private handleStreamEvents = async (event: Event) => {};
  private handleError = async (event: Event) => {};
  private performWebSearch = async (query:string) :Promise<string> => {
    const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
    if(!TAVILY_API_KEY){
        return JSON.stringify({
            error:"web search not available, API key not configured"
        });
    }

    console.log(`Performing a web search for ${query}`);
    try{
        const response = await fetch("https://api.tavily.com/search",{
            method:"POST",
            headers:{
                "content-Type":"application/json",
                Authorization:`Bearer ${TAVILY_API_KEY}`
            },
            body:JSON.stringify({
                query:query,
                search_depth:"advanced",
                max_result:5,
                include_answer:true,
                include_raw_content:false,
            })
        });

        if(!response.ok){
            const errorText = await response.text();
            console.log(`Tavily search failed for query "${query}":`,errorText);
            
            return JSON.stringify({
                error:`search failed with status:${response.status}`,
                details: errorText
            })
        }
        const data = await response.json()
        console.log(`tavily search is successful for query :${query}`);
        return JSON.stringify(data);
    }
    catch(error){}
  };

  private handleStopGenerating = async (event: Event) => {};
}
