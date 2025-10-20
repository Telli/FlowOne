import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

interface Avatar {
  id: string;
  replicaId: string;
  name: string;
  thumbnailUrl?: string;
  createdAt: string;
}

interface AvatarSelectorProps {
  value?: string;
  onChange?: (replicaId: string) => void;
  initialAvatarReplicaId?: string;
  onSelect?: (replicaId: string) => void;
  label?: string;
}

export function AvatarSelector({
  value,
  onChange,
  initialAvatarReplicaId,
  onSelect,
  label = "Avatar",
}: AvatarSelectorProps) {
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const finalValue = value || initialAvatarReplicaId || "";
  const handleChange = onChange || onSelect;

  useEffect(() => {
    const fetchAvatars = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/avatars/replicas");
        if (!response.ok) {
          throw new Error("Failed to fetch avatars");
        }
        const data = await response.json();
        // Transform replicas to avatar format
        const transformedAvatars: Avatar[] = (data.replicas || []).map(
          (replica: any, index: number) => ({
            id: replica.id || `avatar-${index}`,
            replicaId: replica.id || replica.replica_id,
            name: replica.name || `Avatar ${index + 1}`,
            thumbnailUrl: replica.thumbnail_url || replica.thumbnailUrl,
            createdAt: new Date().toISOString(),
          })
        );
        setAvatars(transformedAvatars);
      } catch (err) {
        console.error("Error fetching avatars:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchAvatars();
  }, []);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <Select value={finalValue} onValueChange={(val) => handleChange?.(val)}>
        <SelectTrigger>
          <SelectValue placeholder="Select an avatar..." />
        </SelectTrigger>
        <SelectContent>
          {loading && (
            <div className="p-2 text-sm text-muted-foreground">Loading...</div>
          )}
          {error && (
            <div className="p-2 text-sm text-red-500">Error: {error}</div>
          )}
          {!loading && avatars.length === 0 && !error && (
            <div className="p-2 text-sm text-muted-foreground">
              No avatars available
            </div>
          )}
          {avatars.map((avatar) => (
            <SelectItem key={avatar.replicaId} value={avatar.replicaId}>
              <div className="flex items-center gap-2">
                {avatar.thumbnailUrl && (
                  <img
                    src={avatar.thumbnailUrl}
                    alt={avatar.name}
                    className="w-6 h-6 rounded-full"
                  />
                )}
                <span>{avatar.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
