import { Bot, User } from "lucide-react";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";

interface TopNavProps {
  onAIAssistantToggle: () => void;
  isAIAssistantOpen: boolean;
}

export function TopNav({ onAIAssistantToggle, isAIAssistantOpen }: TopNavProps) {
  return (
    <div className="h-16 border-b border-border bg-background px-6 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-2xl">🎙️</span>
        <span className="font-semibold">FlowOne Voice</span>
      </div>
      
      <Button
        onClick={onAIAssistantToggle}
        variant={isAIAssistantOpen ? "default" : "outline"}
        className="gap-2"
      >
        <Bot className="w-5 h-5" />
        AI Assistant
        {!isAIAssistantOpen && <span className="text-xl">💬</span>}
        {!isAIAssistantOpen && <span className="text-xl">🎤</span>}
      </Button>

      <Avatar>
        <AvatarFallback className="bg-primary text-primary-foreground">
          <User className="w-5 h-5" />
        </AvatarFallback>
      </Avatar>
    </div>
  );
}
