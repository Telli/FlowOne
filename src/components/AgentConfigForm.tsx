import { useState } from "react";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { X } from "lucide-react";
import { AvatarSelector } from "./AvatarSelector";

interface AgentConfigFormProps {
  onSubmit: (config: {
    name: string;
    persona: string;
    voice: string;
    tools: string[];
    type: string;
    avatarReplicaId?: string;
  }) => void;
  initialConfig?: {
    name?: string;
    persona?: string;
    voice?: string;
    tools?: string[];
    type?: string;
    avatarReplicaId?: string;
  };
}

const availableTools = [
  'CRM', 'Calendar', 'Email', 'Calculator', 'Graphing', 
  'Quiz Maker', 'Ticket System', 'Knowledge Base', 
  'Goal Tracker', 'Journal', 'Resources', 'Analytics', 'Chat'
];

const voiceOptions = [
  { value: 'Clear voice (1.0x)', label: 'Clear (Normal)' },
  { value: 'Warm voice (0.9x)', label: 'Warm (Slower)' },
  { value: 'Calm voice (0.95x)', label: 'Calm' },
  { value: 'Energetic voice (1.1x)', label: 'Energetic (Faster)' },
  { value: 'Fast voice (1.2x)', label: 'Fast' },
  { value: 'Slow voice (0.8x)', label: 'Slow' },
];

const agentTypes = [
  { value: 'sales', label: 'Sales Agent' },
  { value: 'tutor', label: 'Tutor' },
  { value: 'support', label: 'Support' },
  { value: 'coach', label: 'Coach' },
  { value: 'custom', label: 'Custom' },
];

export function AgentConfigForm({ onSubmit, initialConfig = {} }: AgentConfigFormProps) {
  const [name, setName] = useState(initialConfig.name || '');
  const [persona, setPersona] = useState(initialConfig.persona || '');
  const [voice, setVoice] = useState(initialConfig.voice || 'Clear voice (1.0x)');
  const [selectedTools, setSelectedTools] = useState<string[]>(initialConfig.tools || []);
  const [type, setType] = useState(initialConfig.type || 'custom');
  const [newTool, setNewTool] = useState('');
  const [loading, setLoading] = useState(false);
  const [avatarReplicaId, setAvatarReplicaId] = useState<string | undefined>(initialConfig.avatarReplicaId);

  const handleAddTool = (tool: string) => {
    if (tool && !selectedTools.includes(tool)) {
      setSelectedTools([...selectedTools, tool]);
    }
  };

  const handleRemoveTool = (tool: string) => {
    setSelectedTools(selectedTools.filter(t => t !== tool));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          role: persona,
          goals: selectedTools,
          tone: voice.includes('friendly') ? 'friendly' : voice.includes('warm') ? 'friendly' : 'neutral',
          avatarReplicaId: avatarReplicaId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create agent');
      }

      const data = await response.json();
      onSubmit(data.agent);
    } catch (error) {
      console.error('Error creating agent:', error);
      // Fallback to original behavior for now
      onSubmit({
        name,
        persona,
        voice,
        tools: selectedTools,
        type,
        avatarReplicaId: avatarReplicaId
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Agent Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Sales Agent"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Agent Type</Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger id="type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {agentTypes.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="persona">Persona</Label>
        <Textarea
          id="persona"
          value={persona}
          onChange={(e) => setPersona(e.target.value)}
          placeholder="e.g., Professional, persuasive, friendly"
          rows={3}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="voice">Voice Style</Label>
        <Select value={voice} onValueChange={setVoice}>
          <SelectTrigger id="voice">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {voiceOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="avatar">Avatar</Label>
        <AvatarSelector
          initialAvatarReplicaId={avatarReplicaId}
          onSelect={(id) => setAvatarReplicaId(id)}
        />
      </div>

      <div className="space-y-2">
        <Label>Tools</Label>
        <div className="flex gap-2">
          <Select value={newTool} onValueChange={(value) => {
            handleAddTool(value);
            setNewTool('');
          }}>
            <SelectTrigger>
              <SelectValue placeholder="Add tools..." />
            </SelectTrigger>
            <SelectContent>
              {availableTools.map((tool) => (
                <SelectItem key={tool} value={tool} disabled={selectedTools.includes(tool)}>
                  {tool}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedTools.map((tool) => (
            <Badge key={tool} variant="secondary" className="gap-1">
              {tool}
              <button
                type="button"
                onClick={() => handleRemoveTool(tool)}
                className="ml-1 hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Creating...' : (initialConfig.name ? 'Update Agent' : 'Create Agent')}
      </Button>
    </form>
  );
}
