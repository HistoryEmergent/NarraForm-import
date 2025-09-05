import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  BookOpen, 
  Eye, 
  EyeOff 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Project {
  id: string;
  title: string;
  description: string | null;
  content_type: string;
  output_medium: string | null;
  purpose: string;
  original_language: string | null;
  output_language: string | null;
  is_demo: boolean;
  original_demo_project_id?: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

interface ProjectFormData {
  title: string;
  description: string;
  content_type: string;
  output_medium: string;
  purpose: string;
  original_language: string;
  output_language: string;
}

export const DemoProjectManager = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [demoProjects, setDemoProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState<ProjectFormData>({
    title: '',
    description: '',
    content_type: 'novel',
    output_medium: 'audio_drama',
    purpose: 'transform_medium',
    original_language: 'en',
    output_language: 'en'
  });
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Load all projects owned by current user
      const { data: allProjects, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const projects = allProjects || [];
      setProjects(projects);
      setDemoProjects(projects.filter(p => p.is_demo));
    } catch (error: any) {
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

  const handleCreate = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('projects')
        .insert({
          ...formData,
          user_id: user.id,
          is_demo: true
        });

      if (error) throw error;

      toast({
        title: "Demo Project Created",
        description: "New demo project has been created successfully."
      });

      resetForm();
      setShowCreateDialog(false);
      loadProjects();
    } catch (error: any) {
      console.error('Error creating demo project:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create demo project",
        variant: "destructive"
      });
    }
  };

  const handleUpdate = async (projectId: string, updates: Partial<Project>) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', projectId);

      if (error) throw error;

      toast({
        title: "Project Updated",
        description: "Project has been updated successfully."
      });

      loadProjects();
    } catch (error: any) {
      console.error('Error updating project:', error);
      toast({
        title: "Error", 
        description: error.message || "Failed to update project",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;

      toast({
        title: "Project Deleted",
        description: "Project has been deleted successfully."
      });

      loadProjects();
    } catch (error: any) {
      console.error('Error deleting project:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete project",
        variant: "destructive"
      });
    }
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
          : "Project is now a demo project and will be copied to new users"
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

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      content_type: 'novel',
      output_medium: 'audio_drama',
      purpose: 'transform_medium',
      original_language: 'en',
      output_language: 'en'
    });
    setEditingProject(null);
  };

  const startEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      title: project.title,
      description: project.description || '',
      content_type: project.content_type,
      output_medium: project.output_medium || 'audio_drama',
      purpose: project.purpose,
      original_language: project.original_language || 'en',
      output_language: project.output_language || 'en'
    });
    setShowCreateDialog(true);
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Title is required",
        variant: "destructive"
      });
      return;
    }

    if (editingProject) {
      await handleUpdate(editingProject.id, formData);
    } else {
      await handleCreate();
    }
  };

  if (loading) {
    return <div className="p-4">Loading demo projects...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Demo Project Management</h3>
          <p className="text-sm text-muted-foreground">
            Manage your projects and toggle which ones serve as demo projects for new users
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Demo Project
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingProject ? 'Edit Demo Project' : 'Create Demo Project'}
              </DialogTitle>
              <DialogDescription>
                {editingProject 
                  ? 'Update the demo project details'
                  : 'Create a new demo project that will be copied to all new user accounts'
                }
              </DialogDescription>
            </DialogHeader>
            
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter project title"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter project description"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Content Type</Label>
                    <Select
                      value={formData.content_type}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, content_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="novel">Novel</SelectItem>
                        <SelectItem value="screenplay">Screenplay</SelectItem>
                        <SelectItem value="short_story">Short Story</SelectItem>
                        <SelectItem value="script">Script</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Output Medium</Label>
                    <Select
                      value={formData.output_medium}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, output_medium: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="audio_drama">Audio Drama</SelectItem>
                        <SelectItem value="podcast">Podcast</SelectItem>
                        <SelectItem value="screenplay">Screenplay</SelectItem>
                        <SelectItem value="radio_play">Radio Play</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Original Language</Label>
                    <Select
                      value={formData.original_language}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, original_language: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="de">German</SelectItem>
                        <SelectItem value="it">Italian</SelectItem>
                        <SelectItem value="pt">Portuguese</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Output Language</Label>
                    <Select
                      value={formData.output_language}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, output_language: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="de">German</SelectItem>
                        <SelectItem value="it">Italian</SelectItem>
                        <SelectItem value="pt">Portuguese</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

              </div>
            </ScrollArea>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSubmit}>
                <Save className="h-4 w-4 mr-2" />
                {editingProject ? 'Update' : 'Create'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* All Projects Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-md font-medium">Your Projects</h4>
          <p className="text-sm text-muted-foreground">
            Click the eye icon to toggle demo status
          </p>
        </div>
        
        <div className="grid gap-4">
          {projects.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Projects</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first project to get started
                </p>
                <Button onClick={() => {
                  resetForm();
                  setShowCreateDialog(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Project
                </Button>
              </CardContent>
            </Card>
          ) : (
            projects.map((project) => (
              <Card key={project.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        {project.title}
                        <div className="flex items-center gap-1">
                          {project.is_demo ? (
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              Demo Project
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <EyeOff className="h-3 w-3" />
                              Regular Project
                            </Badge>
                          )}
                        </div>
                      </CardTitle>
                      {project.description && (
                        <CardDescription>{project.description}</CardDescription>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleDemoStatus(project)}
                        title={project.is_demo ? "Remove from demo projects" : "Add to demo projects"}
                      >
                        {project.is_demo ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEdit(project)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(project.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Content Type:</span>{' '}
                      <span className="text-muted-foreground">{project.content_type}</span>
                    </div>
                    <div>
                      <span className="font-medium">Output Medium:</span>{' '}
                      <span className="text-muted-foreground">{project.output_medium}</span>
                    </div>
                    <div>
                      <span className="font-medium">Original Language:</span>{' '}
                      <span className="text-muted-foreground">{project.original_language}</span>
                    </div>
                    <div>
                      <span className="font-medium">Output Language:</span>{' '}
                      <span className="text-muted-foreground">{project.output_language}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};