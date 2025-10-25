import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { AgentNodeData } from './AgentNode';
import { AvatarSelector } from './AvatarSelector';
import logger from '../lib/logger';

interface NodeConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeData: AgentNodeData;
  onUpdate: (updates: Partial<AgentNodeData>) => void;
}

const voiceOptions = [
  { value: 'Clear voice (1.0x)', label: 'Clear voice (1.0x)' },
  { value: 'Warm voice (0.9x)', label: 'Warm voice (0.9x)' },
  { value: 'Friendly voice (1.1x)', label: 'Friendly voice (1.1x)' },
];

const agentTypes = [
  { value: 'sales', label: 'Sales Agent' },
  { value: 'support', label: 'Support Agent' },
  { value: 'custom', label: 'Custom' },
];

export function NodeConfigDialog({ open, onOpenChange, nodeData, onUpdate }: NodeConfigDialogProps) {
  const [activeTab, setActiveTab] = useState('form');
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [name, setName] = useState(nodeData.name);
  const [type, setType] = useState(nodeData.type || 'custom');
  const [persona, setPersona] = useState(nodeData.persona);
  const [voice, setVoice] = useState(nodeData.voice || 'Clear voice (1.0x)');
  const [tools, setTools] = useState<string[]>(nodeData.tools || []);
  const [newTool, setNewTool] = useState('');
  const [avatarReplicaId, setAvatarReplicaId] = useState<string | undefined>();

  const handleAddTool = () => {
    if (newTool.trim() && !tools.includes(newTool)) {
      setTools([...tools, newTool]);
      setNewTool('');
    }
  };

  const handleRemoveTool = (tool: string) => {
    setTools(tools.filter(t => t !== tool));
  };

  const handleSave = async () => {
    if (!name.trim() || !persona.trim()) {
      toast.error('Name and persona are required');
      return;
    }

    setLoading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_URL}/agents/${nodeData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: persona,
          goals: tools,
          tone: voice.includes('friendly') ? 'friendly' : voice.includes('warm') ? 'warm' : 'neutral',
          avatarReplicaId: avatarReplicaId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update agent');
      }

      const data = await response.json();
      onUpdate({
        name,
        type,
        persona,
        voice,
        tools,
        ...data.agent
      });

      toast.success('Agent updated successfully');
      onOpenChange(false);
    } catch (error) {
      logger.error('Failed to update agent', 'NodeConfigDialog', error);
      toast.error('Failed to update agent');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure {nodeData.name}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="form">Form</TabsTrigger>
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="voice">Voice</TabsTrigger>
          </TabsList>

          {/* Form Tab */}
          <TabsContent value="form" className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Agent Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Sales Agent"
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
              <Label htmlFor="tools">Tools</Label>
              <div className="flex gap-2">
                <Input
                  id="tools"
                  value={newTool}
                  onChange={(e) => setNewTool(e.target.value)}
                  placeholder="Add a tool"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTool()}
                />
                <Button onClick={handleAddTool} variant="outline">Add</Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {tools.map((tool) => (
                  <Badge key={tool} variant="secondary" className="gap-1">
                    {tool}
                    <button
                      onClick={() => handleRemoveTool(tool)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleSave} disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </div>
          </TabsContent>

          {/* Chat Tab */}
          <TabsContent value="chat" className="mt-4">
            <div className="p-4 text-center text-muted-foreground">
              Chat-based configuration coming soon
            </div>
          </TabsContent>

          {/* Voice Tab */}
          <TabsContent value="voice" className="mt-4">
            <div className="p-4 text-center text-muted-foreground">
              Voice-based configuration coming soon
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

