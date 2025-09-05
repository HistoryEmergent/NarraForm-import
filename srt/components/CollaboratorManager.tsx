import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Users, UserPlus, Trash2, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Collaborator {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  profiles?: {
    display_name?: string;
    avatar_url?: string;
  } | null;
}

interface CollaboratorManagerProps {
  projectId: string;
  isOwner: boolean;
}

export function CollaboratorManager({ projectId, isOwner }: CollaboratorManagerProps) {
  const [open, setOpen] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadCollaborators();
    }
  }, [open, projectId]);

  const loadCollaborators = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('project_collaborators')
        .select(`
          id,
          user_id,
          role,
          created_at
        `)
        .eq('project_id', projectId);

      if (error) throw error;
      setCollaborators(data || []);
    } catch (error) {
      console.error('Error loading collaborators:', error);
      toast({
        title: "Error",
        description: "Failed to load collaborators",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateInviteLink = async () => {
    if (!inviteRole) return;

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "You must be logged in to create invite links",
          variant: "destructive"
        });
        return;
      }

      // Generate a unique invite code
      const inviteCode = `${Math.random().toString(36).substr(2, 9)}-${Date.now().toString(36)}`;
      
      // Set expiration to 7 days from now
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { data, error } = await supabase
        .from('project_invites')
        .insert({
          project_id: projectId,
          created_by: user.id,
          invite_code: inviteCode,
          role: inviteRole,
          expires_at: expiresAt.toISOString(),
          max_uses: 10 // Allow up to 10 people to use this link
        })
        .select()
        .single();

      if (error) throw error;

      // Create the invite URL
      const inviteUrl = `${window.location.origin}/?invite=${inviteCode}`;
      
      // Copy to clipboard
      await navigator.clipboard.writeText(inviteUrl);
      
      toast({
        title: "Invite Link Created",
        description: "Invite link copied to clipboard! Valid for 7 days.",
      });
      
    } catch (error) {
      console.error('Error creating invite link:', error);
      toast({
        title: "Error",
        description: "Failed to create invite link",
        variant: "destructive"
      });
    }
  };

  const removeCollaborator = async (collaboratorId: string) => {
    try {
      const { error } = await supabase
        .from('project_collaborators')
        .delete()
        .eq('id', collaboratorId);

      if (error) throw error;

      setCollaborators(prev => prev.filter(c => c.id !== collaboratorId));
      toast({
        title: "Collaborator Removed",
        description: "Collaborator has been removed from the project"
      });
    } catch (error) {
      console.error('Error removing collaborator:', error);
      toast({
        title: "Error",
        description: "Failed to remove collaborator",
        variant: "destructive"
      });
    }
  };

  const updateRole = async (collaboratorId: string, newRole: 'editor' | 'viewer') => {
    try {
      const { error } = await supabase
        .from('project_collaborators')
        .update({ role: newRole })
        .eq('id', collaboratorId);

      if (error) throw error;

      setCollaborators(prev => prev.map(c => 
        c.id === collaboratorId ? { ...c, role: newRole } : c
      ));
      
      toast({
        title: "Role Updated",
        description: "Collaborator role has been updated"
      });
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: "Error",
        description: "Failed to update role",
        variant: "destructive"
      });
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner': return 'default';
      case 'editor': return 'secondary';
      case 'viewer': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="p-2">
          <Users className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Project Collaborators</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Invite Section */}
          {isOwner && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Invite Collaborator</CardTitle>
                <CardDescription>
                  Add team members to collaborate on this project
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <div className="w-32">
                    <Label>Role</Label>
                    <Select value={inviteRole} onValueChange={(value: 'editor' | 'viewer') => setInviteRole(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={generateInviteLink} className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Create Invite Link
                </Button>
                <p className="text-xs text-muted-foreground">
                  Creates a shareable link that allows people to join as {inviteRole}s. Link expires in 7 days.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Current Collaborators */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Current Collaborators</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">Loading collaborators...</div>
              ) : collaborators.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No collaborators yet. Invite team members to get started.
                </div>
              ) : (
                <div className="space-y-3">
                  {collaborators.map((collaborator) => (
                    <div key={collaborator.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          <span className="text-sm font-medium">
                            {collaborator.user_id.substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">
                            User {collaborator.user_id.substring(0, 8)}...
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Joined {new Date(collaborator.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isOwner && collaborator.role !== 'owner' ? (
                          <Select 
                            value={collaborator.role} 
                            onValueChange={(value: 'editor' | 'viewer') => updateRole(collaborator.id, value)}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="editor">Editor</SelectItem>
                              <SelectItem value="viewer">Viewer</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant={getRoleBadgeVariant(collaborator.role)}>
                            {collaborator.role}
                          </Badge>
                        )}
                        {isOwner && collaborator.role !== 'owner' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeCollaborator(collaborator.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}