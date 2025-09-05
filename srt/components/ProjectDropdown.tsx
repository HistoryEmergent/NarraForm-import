import { useState, useEffect } from "react";
import { ChevronDown, FolderPlus, Folder, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";

interface Project {
  id: string;
  title: string;
  description: string;
  content_type: string;
  output_medium?: string;
  original_language?: string;
  output_language?: string;
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

interface ProjectDropdownProps {
  onProjectSelect: (projectId: string, fileImportData?: {parsedContent: any, initialMedium: 'novel' | 'screenplay', outputMedium: string, fileName: string}) => void;
  onCreateProject: () => void;
  currentProjectId?: string;
  user?: any;
  refreshTrigger?: number; // Add refresh trigger
}

export function ProjectDropdown({ onProjectSelect, onCreateProject, currentProjectId, user, refreshTrigger }: ProjectDropdownProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [demoProjects, setDemoProjects] = useState<Project[]>([]);
  const [localProjects, setLocalProjects] = useState<LocalProject[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { isAdmin } = useUserRole();

  useEffect(() => {
    if (user) {
      loadProjects();
    }
  }, [user, refreshTrigger]); // Add refreshTrigger dependency

  const loadProjects = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Load user's projects from Supabase with all fields including original_demo_project_id
      const { data: supabaseProjects, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      const userProjects = supabaseProjects || [];
      setProjects(userProjects);

      // Load demo projects for admins
      if (isAdmin) {
        const { data: demoProjectsData, error: demoError } = await supabase
          .from('projects')
          .select('*')
          .eq('is_demo', true)
          .neq('user_id', user.id) // Exclude own demo projects (already in userProjects)
          .order('updated_at', { ascending: false });

        if (demoError) throw demoError;
        setDemoProjects(demoProjectsData || []);
      }

      // Load local projects from localStorage for migration
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

  const toggleDemoStatus = async (project: Project, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent dropdown item selection
    
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

      loadProjects(); // Refresh the project list
    } catch (error: any) {
      console.error('Error toggling demo status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update demo status",
        variant: "destructive"
      });
    }
  };

  const getCurrentProject = () => {
    if (!currentProjectId) return null;
    
    const cloudProject = projects.find(p => p.id === currentProjectId);
    if (cloudProject) return cloudProject;
    
    const localProject = localProjects.find(p => p.id === currentProjectId);
    return localProject;
  };

  const currentProject = getCurrentProject();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2 min-w-[200px] justify-between">
          <div className="flex items-center gap-2">
            <Folder className="h-4 w-4" />
            <span className="truncate">
              {currentProject 
                ? ('title' in currentProject ? currentProject.title : currentProject.name)
                : "Select Project"
              }
            </span>
          </div>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[400px] bg-background border border-border shadow-lg z-50 p-0">
        <ScrollArea className="h-auto max-h-[400px]">
          <div className="p-2">
            {loading ? (
              <DropdownMenuItem disabled className="justify-center py-6">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="h-4 w-4 animate-spin border-2 border-current border-t-transparent rounded-full" />
                  Loading projects...
                </div>
              </DropdownMenuItem>
            ) : (
              <>
                {projects.length > 0 && (
                  <>
                    <DropdownMenuLabel className="text-sm font-semibold text-foreground px-2 py-1">
                      Your Projects
                    </DropdownMenuLabel>
                    {projects.map((project) => (
                      <DropdownMenuItem
                        key={project.id}
                        onClick={() => onProjectSelect(project.id)}
                        className={`flex items-center justify-between p-3 hover:bg-accent/70 cursor-pointer rounded-md mx-1 my-0.5 ${
                          project.id === currentProjectId ? 'bg-accent text-accent-foreground' : ''
                        }`}
                      >
                        <div className="flex flex-col items-start gap-1 flex-1 min-w-0">
                          <div className="font-medium flex items-center gap-2 w-full">
                            <span className="truncate">{project.title}</span>
                            {(project.is_demo || project.original_demo_project_id) && (
                              <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 border-orange-200 dark:border-orange-800 px-2 py-0.5 font-semibold">
                                DEMO
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground truncate w-full">
                            {project.description || (() => {
                              // Check if this is a translation project (different languages specified)
                              if (project.original_language && project.output_language && 
                                  project.original_language !== project.output_language) {
                                return `${project.original_language} to ${project.output_language}`;
                              }
                              
                              // Otherwise show medium transformation
                              const contentType = project.content_type || 'content';
                              const outputMedium = project.output_medium || 'audio drama';
                              return `${contentType} to ${outputMedium}`;
                            })()}
                          </div>
                        </div>
                        {isAdmin && project.user_id === user?.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => toggleDemoStatus(project, e)}
                            className="h-8 w-8 p-0 hover:bg-primary/20 hover:text-primary ml-3 flex-shrink-0 border border-transparent hover:border-primary/30"
                            title={project.is_demo ? "Remove from demo projects" : "Make demo project"}
                          >
                            {project.is_demo ? (
                              <EyeOff className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground hover:text-primary" />
                            )}
                          </Button>
                        )}
                      </DropdownMenuItem>
                    ))}
                    {(isAdmin && demoProjects.length > 0) || localProjects.length > 0 ? <DropdownMenuSeparator className="my-2" /> : null}
                  </>
                )}

                {isAdmin && demoProjects.length > 0 && (
                  <>
                    <DropdownMenuLabel className="text-sm font-semibold text-foreground px-2 py-1 flex items-center gap-2">
                      Demo Projects
                      <Badge variant="outline" className="text-xs">Admin</Badge>
                    </DropdownMenuLabel>
                    {demoProjects.map((project) => (
                      <DropdownMenuItem
                        key={project.id}
                        onClick={() => onProjectSelect(project.id)}
                        className={`flex items-center justify-between p-3 hover:bg-accent/70 cursor-pointer rounded-md mx-1 my-0.5 ${
                          project.id === currentProjectId ? 'bg-accent text-accent-foreground' : ''
                        }`}
                      >
                        <div className="flex flex-col items-start gap-1 flex-1 min-w-0">
                          <div className="font-medium flex items-center gap-2 w-full">
                            <span className="truncate">{project.title}</span>
                            <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 border-orange-200 dark:border-orange-800 px-2 py-0.5 font-semibold">
                              DEMO
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground truncate w-full">
                            {project.description || (() => {
                              // Check if this is a translation project (different languages specified)
                              if (project.original_language && project.output_language && 
                                  project.original_language !== project.output_language) {
                                return `${project.original_language} to ${project.output_language}`;
                              }
                              
                              // Otherwise show medium transformation
                              const contentType = project.content_type || 'content';
                              const outputMedium = project.output_medium || 'audio drama';
                              return `${contentType} to ${outputMedium}`;
                            })()}
                          </div>
                        </div>
                      </DropdownMenuItem>
                    ))}
                    {localProjects.length > 0 && <DropdownMenuSeparator className="my-2" />}
                  </>
                )}
                
                {localProjects.length > 0 && (
                  <>
                    <DropdownMenuLabel className="text-sm font-semibold text-foreground px-2 py-1 flex items-center gap-2">
                      Local Projects
                      <Badge variant="outline" className="text-xs">Migration Needed</Badge>
                    </DropdownMenuLabel>
                    {localProjects.map((project) => (
                      <DropdownMenuItem
                        key={project.id}
                        onClick={() => onProjectSelect(project.id)}
                        className={`flex items-center justify-between p-3 hover:bg-accent/70 cursor-pointer rounded-md mx-1 my-0.5 ${
                          project.id === currentProjectId ? 'bg-accent text-accent-foreground' : ''
                        }`}
                      >
                        <div className="flex flex-col items-start gap-1 flex-1 min-w-0">
                          <div className="font-medium flex items-center gap-2 w-full">
                            <span className="truncate">{project.name}</span>
                            <Badge variant="outline" className="text-xs">Local</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground truncate w-full">
                            {project.description || `${project.type} project`}
                          </div>
                        </div>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator className="my-2" />
                  </>
                )}
                
                <DropdownMenuItem
                  onClick={onCreateProject}
                  className="flex items-center gap-2 p-3 hover:bg-accent/70 font-medium text-primary cursor-pointer rounded-md mx-1 my-0.5"
                >
                  <FolderPlus className="h-4 w-4" />
                  Create / manage projects
                </DropdownMenuItem>
              </>
            )}
          </div>
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}