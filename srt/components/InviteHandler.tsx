import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserPlus, ExternalLink } from "lucide-react";

interface InviteHandlerProps {
  inviteCode?: string;
  onProjectSelect: (projectId: string) => void;
}

export function InviteHandler({ inviteCode, onProjectSelect }: InviteHandlerProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [inviteInfo, setInviteInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (inviteCode) {
      checkInvite(inviteCode);
    }
  }, [inviteCode]);

  const checkInvite = async (code: string) => {
    console.log('🔍 Checking invite code:', code);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('project_invites')
        .select('*')
        .eq('invite_code', code)
        .single();

      console.log('📧 Invite check result:', { data, error });

      if (error) {
        console.error('❌ Invite check error:', error);
        toast({
          title: "Invalid Invite",
          description: "This invite link is invalid or has expired.",
          variant: "destructive"
        });
        return;
      }

      // Check if expired
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        toast({
          title: "Invite Expired",
          description: "This invite link has expired.",
          variant: "destructive"
        });
        return;
      }

      // Check max uses
      if (data.max_uses && data.current_uses >= data.max_uses) {
        toast({
          title: "Invite Limit Reached",
          description: "This invite link has reached its maximum number of uses.",
          variant: "destructive"
        });
        return;
      }

      // Get project details separately
      const { data: projectData } = await supabase
        .from('projects')
        .select('title, description')
        .eq('id', data.project_id)
        .single();

      setInviteInfo({
        ...data,
        project: projectData
      });
      setShowDialog(true);
    } catch (error) {
      console.error('Error checking invite:', error);
      toast({
        title: "Error",
        description: "Failed to process invite link",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const acceptInvite = async () => {
    if (!inviteCode) return;

    console.log('🤝 Accepting invite with code:', inviteCode);
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('👤 Current user for invite:', user?.id);
      
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to accept this invite.",
          variant: "destructive"
        });
        return;
      }

      const { data, error } = await supabase
        .rpc('accept_project_invite', { invite_code: inviteCode });

      console.log('📝 Accept invite result:', { data, error });

      if (error) throw error;

      const result = data as any;

      if (result.success) {
        console.log('✅ Invite accepted successfully:', result);
        toast({
          title: "Invite Accepted!",
          description: `You've joined "${result.project_title}" as a ${result.role}.`
        });
        
        console.log('🎯 Selecting project:', result.project_id);
        onProjectSelect(result.project_id);
        setShowDialog(false);
        
        // Clear the invite code from URL
        const url = new URL(window.location.href);
        url.searchParams.delete('invite');
        window.history.replaceState({}, '', url.toString());
      } else {
        console.error('❌ Invite acceptance failed:', result);
        toast({
          title: "Cannot Accept Invite",
          description: result.error,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('💥 Error accepting invite:', error);
      toast({
        title: "Error",
        description: "Failed to accept invite",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  if (!inviteCode || !showDialog) return null;

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Project Invitation
          </DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="text-center py-4">Loading invite details...</div>
        ) : inviteInfo ? (
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="font-semibold text-lg">{inviteInfo.project?.title}</h3>
              {inviteInfo.project?.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {inviteInfo.project.description}
                </p>
              )}
            </div>
            
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Role</p>
                  <p className="text-sm text-muted-foreground capitalize">{inviteInfo.role}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Invited by</p>
                  <p className="text-sm text-muted-foreground">
                    Project Owner
                  </p>
                </div>
              </div>
            </div>

            {inviteInfo.expires_at && (
              <p className="text-xs text-muted-foreground text-center">
                Expires {new Date(inviteInfo.expires_at).toLocaleDateString()}
              </p>
            )}
            
            <div className="flex gap-2">
              <Button 
                onClick={acceptInvite} 
                disabled={processing}
                className="flex-1 gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                {processing ? 'Joining...' : 'Join Project'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowDialog(false)}
                disabled={processing}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-muted-foreground">Invalid invite link</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}