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
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);

  useEffect(() => {
    setIsLoadingTemplates(true);
    getTemplates()
      .then((list: TemplateItem[]) => {
        if (!list || list.length === 0) {
          // No custom templates, keep local defaults
          setIsLoadingTemplates(false);
          return;
        }

        // Merge custom templates with local templates, avoiding duplicates
        const customTemplates: AgentTemplate[] = list.map((t) => ({
          id: t.key,
          name: t.name || t.key,
          icon: <Lightbulb className="w-5 h-5" />,
          description: t.description || "",
          color: "bg-blue-500",
        }));

        // Filter out local templates that have the same ID or name as custom templates
        const customIds = new Set(customTemplates.map(t => t.id));
        const customNames = new Set(customTemplates.map(t => t.name.toLowerCase()));
        const filteredLocal = localTemplates.filter(
          t => !customIds.has(t.id) && !customNames.has(t.name.toLowerCase())
        );

        // Combine: custom templates first, then remaining local templates
        setTemplates([...customTemplates, ...filteredLocal]);
        setIsLoadingTemplates(false);
      })
      .catch((e) => {
        console.error('Failed to load custom templates:', e);
        // Silently keep local defaults - don't show error toast for optional feature
        setIsLoadingTemplates(false);
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
