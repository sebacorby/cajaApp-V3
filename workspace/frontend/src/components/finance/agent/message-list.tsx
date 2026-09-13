import { Bot } from "lucide-react";
import { MessageContent } from "./message-content";

export interface AgentUiMessage {
  id: string;
  role: "user" | "assistant" | "tool";
  text: string;
}

export function MessageList({ messages }: { messages: AgentUiMessage[] }) {
  return (
    <div className="space-y-4 px-4 py-5" data-testid="agent-message-list">
      {messages.map((message) => {
        const user = message.role === "user";
        return (
          <div key={message.id} className={`flex ${user ? "justify-end" : "justify-start"}`}>
            <div className={`flex max-w-[78%] gap-2 ${user ? "flex-row-reverse" : ""}`}>
              {!user && <div className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Bot className="size-4" /></div>}
              <div className={user ? "rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-sm text-primary-foreground" : "rounded-2xl rounded-bl-md bg-muted/70 px-3.5 py-2.5 text-sm"}>
                <MessageContent text={message.text} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
