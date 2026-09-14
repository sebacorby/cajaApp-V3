import { Bot } from "lucide-react";
import type { AgentRunSnapshot, AgentToolCallView } from "@/lib/finance/agent-api";
import { ActivityPanel } from "./activity-panel";
import { MessageContent } from "./message-content";
import { ToolCallCard } from "./tool-call-card";

export interface AgentUiMessage {
  id: string;
  role: "user" | "assistant" | "tool";
  text: string;
  toolCall?: AgentToolCallView;
}

export function MessageList({ messages, run }: { messages: AgentUiMessage[]; run?: AgentRunSnapshot | null }) {
  const calls = messages.flatMap((message) => message.toolCall ? [message.toolCall] : []);
  return (
    <div className="space-y-4 px-4 py-5" data-testid="agent-message-list">
      <ActivityPanel calls={calls} run={run} />
      {messages.map((message) => {
        if (message.role === "tool" && message.toolCall) {
          return <ToolCallCard key={message.id} call={message.toolCall} />;
        }
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
