import { GraduationCap, Headphones, Briefcase, MessageCircle, Lightbulb } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { useEffect, useState } from "react";
import { getTemplates, TemplateItem } from "../lib/apiClient";
import { toast } from 'sonner';

interface AgentTemplate {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  color: string;
}

const localTemplates: AgentTemplate[] = [
  { id: "sales", name: "Sales Agent", icon: <Briefcase className="w-5 h-5" />, description: "Professional & persuasive", color: "bg-blue-500" },
  { id: "tutor", name: "Math Tutor", icon: <GraduationCap className="w-5 h-5" />, description: "Friendly & patient", color: "bg-green-500" },
  { id: "support", name: "Support Agent", icon: <Headphones className="w-5 h-5" />, description: "Empathetic & helpful", color: "bg-purple-500" },
  { id: "coach", name: "Life Coach", icon: <Lightbulb className="w-5 h-5" />, description: "Motivating & inspiring", color: "bg-orange-500" },
];

interface AgentPaletteProps {
  onTalkToAI: () => void;
}

export function AgentPalette({ onTalkToAI }: AgentPaletteProps) {
  const [templates, setTemplates] = useState<AgentTemplate[]>(localTemplates);

  useEffect(() => {
    getTemplates()
      .then((list: TemplateItem[]) => {
        const mapped: AgentTemplate[] = list.map((t) => ({
          id: t.key,
          name: t.name || t.key,
          icon: <Lightbulb className="w-5 h-5" />,
          description: t.description || "",
          color: "bg-blue-500",
        }));
        if (mapped.length > 0) setTemplates(mapped);
      })
      .catch((e) => {
        toast.error('Failed to load templates', { description: (e as any)?.message } as any);
        // keep local defaults
      });
  }, []);
  const onDragStart = (event: React.DragEvent, template: AgentTemplate) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(template));
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="w-[280px] border-r border-border bg-background flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h3>Agent Palette</h3>
        <p className="text-sm text-muted-foreground mt-1">Drag to canvas or use AI</p>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-3">
        <div className="space-y-2">
          <h4 className="text-sm text-muted-foreground">Quick Start Templates</h4>
          {templates.map((template) => (
            <Card
              key={template.id}
              className="p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
              draggable
              onDragStart={(e) => onDragStart(e, template)}
            >
              <div className="flex items-start gap-3">
                <div className={`${template.color} p-2 rounded-lg text-white shrink-0`}>
                  {template.icon}
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-sm">{template.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {template.description}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div className="p-4 border-t border-border">
        <Button onClick={onTalkToAI} className="w-full gap-2" size="lg">
          <MessageCircle className="w-5 h-5" />
          Talk to AI
        </Button>
      </div>
    </div>
  );
}
