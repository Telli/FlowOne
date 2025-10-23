import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Loader2, Plus, Trash2, User, Calendar, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { createPersona, listPersonas, deletePersona } from '../lib/apiClient';
import type { TavusPersona, CreatePersonaRequest } from '../lib/types';

interface PersonaManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPersonaSelect?: (persona: TavusPersona) => void;
}

export function PersonaManager({ open, onOpenChange, onPersonaSelect }: PersonaManagerProps) {
  const [personas, setPersonas] = useState<TavusPersona[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Form state
  const [personaName, setPersonaName] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [context, setContext] = useState('');
  const [defaultReplicaId, setDefaultReplicaId] = useState('');

  useEffect(() => {
    if (open) {
      loadPersonas();
    }
  }, [open]);

  const loadPersonas = async () => {
    setLoading(true);
    try {
      const data = await listPersonas();
      setPersonas(data);
    } catch (error) {
      console.error('Failed to load personas:', error);
      toast.error('Failed to load personas');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePersona = async () => {
    if (!personaName.trim() || !systemPrompt.trim()) {
      toast.error('Persona name and system prompt are required');
      return;
    }

    setCreating(true);
    try {
      const request: CreatePersonaRequest = {
        persona_name: personaName,
        system_prompt: systemPrompt,
        context: context || undefined,
        default_replica_id: defaultReplicaId || undefined,
      };

      const newPersona = await createPersona(request);
      setPersonas([...personas, newPersona]);
      
      // Reset form
      setPersonaName('');
      setSystemPrompt('');
      setContext('');
      setDefaultReplicaId('');
      setShowCreateForm(false);
      
      toast.success('Persona created successfully');
    } catch (error) {
      console.error('Failed to create persona:', error);
      toast.error('Failed to create persona');
    } finally {
      setCreating(false);
    }
  };

  const handleDeletePersona = async (personaId: string) => {
    if (!confirm('Are you sure you want to delete this persona?')) {
      return;
    }

    try {
      await deletePersona(personaId);
      setPersonas(personas.filter(p => p.persona_id !== personaId));
      toast.success('Persona deleted successfully');
    } catch (error) {
      console.error('Failed to delete persona:', error);
      toast.error('Failed to delete persona');
    }
  };

  const handleSelectPersona = (persona: TavusPersona) => {
    if (onPersonaSelect) {
      onPersonaSelect(persona);
      onOpenChange(false);
      toast.success(`Selected persona: ${persona.persona_name}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Tavus Persona Management</DialogTitle>
          <DialogDescription>
            Create and manage AI personas for your avatar conversations
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Create Persona Section */}
          {showCreateForm ? (
            <Card className="p-4 border-2 border-primary/20">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Create New Persona</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCreateForm(false)}
                  >
                    Cancel
                  </Button>
                </div>

                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="persona-name">Persona Name *</Label>
                    <Input
                      id="persona-name"
                      value={personaName}
                      onChange={(e) => setPersonaName(e.target.value)}
                      placeholder="e.g., Fitness Coach"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="system-prompt">System Prompt *</Label>
                    <Textarea
                      id="system-prompt"
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                      placeholder="You are an energetic and motivating fitness coach..."
                      className="mt-1 min-h-[100px]"
                    />
                  </div>

                  <div>
                    <Label htmlFor="context">Context (Optional)</Label>
                    <Textarea
                      id="context"
                      value={context}
                      onChange={(e) => setContext(e.target.value)}
                      placeholder="Additional context about the persona's expertise..."
                      className="mt-1 min-h-[60px]"
                    />
                  </div>

                  <div>
                    <Label htmlFor="replica-id">Default Replica ID (Optional)</Label>
                    <Input
                      id="replica-id"
                      value={defaultReplicaId}
                      onChange={(e) => setDefaultReplicaId(e.target.value)}
                      placeholder="r123456789"
                      className="mt-1"
                    />
                  </div>

                  <Button
                    onClick={handleCreatePersona}
                    disabled={creating || !personaName.trim() || !systemPrompt.trim()}
                    className="w-full"
                  >
                    {creating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Persona
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <Button
              onClick={() => setShowCreateForm(true)}
              variant="outline"
              className="w-full border-dashed"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Persona
            </Button>
          )}

          {/* Personas List */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <h3 className="font-semibold mb-2">Available Personas</h3>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : personas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <User className="w-12 h-12 mb-2 opacity-50" />
                <p>No personas created yet</p>
                <p className="text-sm">Create your first persona to get started</p>
              </div>
            ) : (
              <ScrollArea className="flex-1">
                <div className="space-y-3 pr-4">
                  {personas.map((persona) => (
                    <Card
                      key={persona.persona_id}
                      className="p-4 hover:border-primary/50 transition-colors cursor-pointer"
                      onClick={() => handleSelectPersona(persona)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold truncate">{persona.persona_name}</h4>
                            {onPersonaSelect && (
                              <Badge variant="secondary" className="text-xs">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Select
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {persona.system_prompt}
                          </p>
                          
                          {persona.context && (
                            <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                              Context: {persona.context}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              <span className="font-mono">{persona.persona_id.slice(0, 12)}...</span>
                            </div>
                            {persona.created_at && (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span>{new Date(persona.created_at).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePersona(persona.persona_id);
                          }}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

