import { Briefcase, GraduationCap, Headphones, Lightbulb, Bot, TrendingUp, MessageCircle } from "lucide-react";

export const agentIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'sales': Briefcase,
  'tutor': GraduationCap,
  'support': Headphones,
  'coach': Lightbulb,
  'custom': Bot,
  'default': Bot,
};

export function getAgentIcon(type: string) {
  return agentIconMap[type] || agentIconMap.default;
}
