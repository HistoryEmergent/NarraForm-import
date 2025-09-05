import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, RotateCcw, Eye, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ScriptVersion {
  id: string;
  version_number: number;
  content: string;
  created_by: string;
  created_at: string;
  is_current: boolean;
  profiles?: {
    display_name?: string;
  } | null;
}

interface VersionManagerProps {
  episodeId: string;
  currentContent: string;
  onVersionRestore: (content: string) => void;
}

export function VersionManager({ episodeId, currentContent, onVersionRestore }: VersionManagerProps) {
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<ScriptVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewVersion, setPreviewVersion] = useState<ScriptVersion | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadVersions();
    }
  }, [open, episodeId]);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('script_versions')
        .select(`
          id,
          version_number,
          content,
          created_by,
          created_at,
          is_current
        `)
        .eq('episode_id', episodeId)
        .order('version_number', { ascending: false });

      if (error) throw error;
      setVersions(data || []);
    } catch (error) {
      console.error('Error loading versions:', error);
      toast({
        title: "Error",
        description: "Failed to load version history",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveCurrentVersion = async () => {
    try {
      // Get the next version number
      const maxVersion = versions.length > 0 ? Math.max(...versions.map(v => v.version_number)) : 0;
      const nextVersion = maxVersion + 1;

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to save versions",
          variant: "destructive"
        });
        return;
      }

      // Mark all existing versions as not current
      await supabase
        .from('script_versions')
        .update({ is_current: false })
        .eq('episode_id', episodeId);

      // Save new version
      const { error } = await supabase
        .from('script_versions')
        .insert({
          episode_id: episodeId,
          version_number: nextVersion,
          content: currentContent,
          created_by: user.id,
          is_current: true
        });

      if (error) throw error;

      await loadVersions();
      toast({
        title: "Version Saved",
        description: `Version ${nextVersion} has been saved`
      });
    } catch (error) {
      console.error('Error saving version:', error);
      toast({
        title: "Error",
        description: "Failed to save version",
        variant: "destructive"
      });
    }
  };

  const restoreVersion = async (version: ScriptVersion) => {
    try {
      // Mark all versions as not current
      await supabase
        .from('script_versions')
        .update({ is_current: false })
        .eq('episode_id', episodeId);

      // Mark selected version as current
      await supabase
        .from('script_versions')
        .update({ is_current: true })
        .eq('id', version.id);

      onVersionRestore(version.content);
      setOpen(false);
      
      toast({
        title: "Version Restored",
        description: `Restored to version ${version.version_number}`
      });
    } catch (error) {
      console.error('Error restoring version:', error);
      toast({
        title: "Error",
        description: "Failed to restore version",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <History className="h-4 w-4" />
          ({versions.length})
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Version History</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
          {/* Version List */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Saved Versions</h3>
              <Button onClick={saveCurrentVersion} size="sm" className="gap-2">
                <Save className="h-4 w-4" />
                Save Current
              </Button>
            </div>
            
            <ScrollArea className="h-[500px]">
              {loading ? (
                <div className="text-center py-4">Loading versions...</div>
              ) : versions.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No versions saved yet. Click "Save Current" to create your first version.
                </div>
              ) : (
                <div className="space-y-3">
                  {versions.map((version) => (
                    <Card 
                      key={version.id} 
                      className={`cursor-pointer transition-colors ${
                        previewVersion?.id === version.id ? 'border-primary' : ''
                      }`}
                      onClick={() => setPreviewVersion(version)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm flex items-center gap-2">
                            Version {version.version_number}
                            {version.is_current && (
                              <Badge variant="default" className="text-xs">Current</Badge>
                            )}
                          </CardTitle>
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewVersion(version);
                              }}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            {!version.is_current && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  restoreVersion(version);
                                }}
                              >
                                <RotateCcw className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <CardDescription className="text-xs">
                          By User {version.created_by.substring(0, 8)}... • {' '}
                          {new Date(version.created_at).toLocaleString()}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {version.content.substring(0, 150)}...
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Preview Pane */}
          <div className="space-y-4">
            <h3 className="font-semibold">
              {previewVersion ? `Version ${previewVersion.version_number} Preview` : 'Select a version to preview'}
            </h3>
            
            {previewVersion ? (
              <ScrollArea className="h-[500px]">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">
                        Version {previewVersion.version_number}
                        {previewVersion.is_current && (
                          <Badge variant="default" className="ml-2 text-xs">Current</Badge>
                        )}
                      </CardTitle>
                      {!previewVersion.is_current && (
                        <Button
                          onClick={() => restoreVersion(previewVersion)}
                          size="sm"
                          className="gap-2"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Restore This Version
                        </Button>
                      )}
                    </div>
                    <CardDescription>
                      By User {previewVersion.created_by.substring(0, 8)}... • {' '}
                      {new Date(previewVersion.created_at).toLocaleString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <pre className="whitespace-pre-wrap text-sm font-mono bg-muted p-4 rounded">
                      {previewVersion.content}
                    </pre>
                  </CardContent>
                </Card>
              </ScrollArea>
            ) : (
              <div className="h-[500px] flex items-center justify-center text-muted-foreground">
                Click on a version to see its content
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}