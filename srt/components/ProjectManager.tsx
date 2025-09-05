// ProjectManager Component - Handles project listing and selection
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { FolderPlus, Folder, Trash2, Upload, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ProjectCreationDialog } from "@/components/ProjectCreationDialog";
import { useUserRole } from "@/hooks/useUserRole";

interface Project {
  id: string;
  title: string;
  description: string;
  content_type: string;
  purpose?: string;
  original_language?: string;
  output_language?: string;
  output_medium?: string;
  created_at: string;
  updated_at: string;
  user_id?: string;
  is_demo?: boolean;
  original_demo_project_id?: string;
}

interface LocalProject {
  id: string;
  name: string;
  description: string;
  type: 'novel' | 'screenplay' | 'series';
  createdAt: string;
  updatedAt: string;
}

interface ProjectManagerProps {
  onProjectSelect: (projectId: string, fileImportData?: {parsedContent: any, initialMedium?: 'novel' | 'screenplay', outputMedium?: string, originalLanguage?: string, outputLanguage?: string, fileName: string, purpose: string}) => void;
  currentProjectId?: string;
  user?: any;
}

export function ProjectManager({ onProjectSelect, currentProjectId, user }: ProjectManagerProps) {
  const [open, setOpen] = useState(false);
  const [creationDialogOpen, setCreationDialogOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [localProjects, setLocalProjects] = useState<LocalProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  
  const { toast } = useToast();
  const { isAdmin } = useUserRole();

  useEffect(() => {
    if (user) {
      loadProjects();
    }
  }, [user]);

  // Listen for project refresh events (e.g., after accepting invites)
  useEffect(() => {
    const handleRefresh = () => {
      console.log('🔄 Refreshing projects due to custom event');
      loadProjects();
    };
    
    window.addEventListener('refresh-projects', handleRefresh);
    return () => window.removeEventListener('refresh-projects', handleRefresh);
  }, [user]);

  useEffect(() => {
    if (user && localProjects.length > 0) {
      detectAndMigrateLocalProjects();
    }
  }, [user, localProjects]);

  const loadProjects = async () => {
    if (!user) return;
    
    console.log('📂 Loading projects for user:', user.id);
    setLoading(true);
    try {
      // RLS policy "Users can view accessible projects safe" should handle 
      // returning both owned projects and collaborated projects automatically
      const { data: supabaseProjects, error } = await supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false });

      console.log('📊 Projects query result:', { 
        projects: supabaseProjects, 
        error,
        count: supabaseProjects?.length 
      });

      if (error) throw error;
      setProjects(supabaseProjects || []);

      const savedLocal = localStorage.getItem('audiodrama-projects');
      if (savedLocal) {
        try {
          const localProjects = JSON.parse(savedLocal);
          setLocalProjects(localProjects);
        } catch {
          setLocalProjects([]);
        }
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      toast({
        title: "Error",
        description: "Failed to load projects",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const startProjectCreation = () => {
    setOpen(false);
    setCreationDialogOpen(true);
  };

  const handleProjectCreated = (projectId: string, fileImportData?: any) => {
    console.log('🆕 Project created:', projectId);
    loadProjects(); // Refresh projects list
    onProjectSelect(projectId, fileImportData);
    setCreationDialogOpen(false);
  };

  const selectProject = (projectId: string) => {
    console.log('🎯 Project selected:', projectId);
    onProjectSelect(projectId);
    setOpen(false);
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;
    
    try {
      if (projectToDelete.startsWith('project-')) {
        const updatedLocal = localProjects.filter(p => p.id !== projectToDelete);
        setLocalProjects(updatedLocal);
        localStorage.setItem('audiodrama-projects', JSON.stringify(updatedLocal));
        localStorage.removeItem(`${projectToDelete}-chapters`);
        localStorage.removeItem(`${projectToDelete}-episodes`);
      } else {
        const { error } = await supabase
          .from('projects')
          .delete()
          .eq('id', projectToDelete);

        if (error) throw error;
        setProjects(prev => prev.filter(p => p.id !== projectToDelete));
      }
      
      toast({
        title: "Project Deleted",
        description: "Project and all its data have been removed."
      });

      if (currentProjectId === projectToDelete) {
        onProjectSelect('');
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: "Error",
        description: "Failed to delete project",
        variant: "destructive"
      });
    } finally {
      setProjectToDelete(null);
    }
  };

  const migrateLocalProject = async (localProject: LocalProject) => {
    // Migration logic would go here - simplified for now
    toast({
      title: "Migration",
      description: "Migration feature coming soon",
    });
  };

  const toggleDemoStatus = async (project: Project) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ is_demo: !project.is_demo })
        .eq('id', project.id);

      if (error) throw error;

      toast({
        title: project.is_demo ? "Removed from Demo Projects" : "Added to Demo Projects",
        description: project.is_demo 
          ? "Project is no longer a demo project" 
          : "Project is now a demo project and will be visible to new users"
      });

      loadProjects();
    } catch (error: any) {
      console.error('Error toggling demo status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update demo status",
        variant: "destructive"
      });
    }
  };

  const detectAndMigrateLocalProjects = async () => {
    if (!user || localProjects.length === 0) return;

    const unmigrated = localProjects.filter(project => {
      const hasChapters = localStorage.getItem(`${project.id}-chapters`);
      const hasNewFormat = localStorage.getItem(`storyConverter_project_${project.id}`);
      return hasChapters || hasNewFormat;
    });

    if (unmigrated.length > 0) {
      toast({
        title: "Local Projects Detected",
        description: `Found ${unmigrated.length} local projects with content. Use the migration buttons to move them to the cloud.`,
      });
    }
  };

  const currentProject = projects.find(p => p.id === currentProjectId) || 
    localProjects.find(p => p.id === currentProjectId);

  const getDisplayName = (project: Project | LocalProject) => {
    return 'title' in project ? project.title : project.name;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Folder className="h-4 w-4" />
          {currentProject ? getDisplayName(currentProject) : 'Select Project'}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Project Manager</DialogTitle>
            <Button onClick={startProjectCreation} className="gap-2">
              <FolderPlus className="h-4 w-4" />
              Create New Project
            </Button>
          </div>
        </DialogHeader>
        
        <div className="flex flex-col h-[70vh]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Your Projects</h2>
            {isAdmin && (
              <p className="text-sm text-muted-foreground">
                Use the eye icon to toggle demo projects for new users
              </p>
            )}
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center py-4">Loading projects...</div>
            </div>
          ) : projects.length === 0 && localProjects.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center py-12">
                <FolderPlus className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
                <p className="text-muted-foreground mb-4">Create your first project to get started</p>
                <Button onClick={startProjectCreation} className="gap-2">
                  <FolderPlus className="h-4 w-4" />
                  Create Project
                </Button>
              </div>
            </div>
          ) : (
            <ScrollArea className="flex-1">
              <div className="space-y-1 pr-4">
                {/* Cloud Projects Section */}
                {projects.length > 0 && (
                  <>
                    <div className="sticky top-0 bg-background py-2 mb-2">
                      <h3 className="text-sm font-medium text-muted-foreground">Cloud Projects</h3>
                    </div>
                    {projects.map((project) => (
                      <div
                        key={project.id}
                        className={`flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer ${
                          currentProjectId === project.id ? 'bg-muted' : ''
                        }`}
                        onClick={() => selectProject(project.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium truncate">{project.title}</h4>
                            <Badge variant="secondary" className="text-xs shrink-0">
                              {project.content_type}
                            </Badge>
                            {(project.is_demo || project.original_demo_project_id) && (
                              <Badge variant="default" className="text-xs shrink-0">
                                DEMO
                              </Badge>
                            )}
                          </div>
                          {project.description && (
                            <p className="text-sm text-muted-foreground truncate">
                              {project.description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Updated {new Date(project.updated_at).toLocaleDateString()}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-1 ml-2">
                          {isAdmin && project.user_id === user?.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleDemoStatus(project);
                              }}
                              className="hover:bg-primary/10 h-8 w-8 p-0"
                              title={project.is_demo ? "Remove from demo projects" : "Make demo project"}
                            >
                              {project.is_demo ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setProjectToDelete(project.id);
                            }}
                            className="hover:bg-destructive/10 h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {/* Local Projects Section */}
                {localProjects.length > 0 && (
                  <>
                    <div className="sticky top-0 bg-background py-2 mb-2 mt-6">
                      <h3 className="text-sm font-medium text-muted-foreground">Local Projects</h3>
                      <p className="text-xs text-muted-foreground">
                        Migrate these to the cloud for better collaboration and data safety.
                      </p>
                    </div>
                    {localProjects.map((project) => (
                      <div
                        key={project.id}
                        className={`flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer ${
                          currentProjectId === project.id ? 'bg-muted' : ''
                        }`}
                        onClick={() => selectProject(project.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium truncate">{project.name}</h4>
                            <Badge variant="secondary" className="text-xs shrink-0">
                              {project.type}
                            </Badge>
                            <Badge variant="outline" className="text-xs shrink-0 bg-yellow-50 border-yellow-200 text-yellow-800">
                              Local
                            </Badge>
                          </div>
                          {project.description && (
                            <p className="text-sm text-muted-foreground truncate">
                              {project.description}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 ml-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              migrateLocalProject(project);
                            }}
                            disabled={migrating}
                            className="gap-1 h-8 text-xs"
                          >
                            <Upload className="h-3 w-3" />
                            {migrating ? 'Migrating...' : 'Migrate'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setProjectToDelete(project.id);
                            }}
                            className="hover:bg-destructive/10 h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>

      {/* Project Creation Dialog */}
      <ProjectCreationDialog
        open={creationDialogOpen}
        onOpenChange={setCreationDialogOpen}
        onProjectCreated={handleProjectCreated}
        user={user}
      />
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!projectToDelete} onOpenChange={() => setProjectToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this project? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteProject} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}