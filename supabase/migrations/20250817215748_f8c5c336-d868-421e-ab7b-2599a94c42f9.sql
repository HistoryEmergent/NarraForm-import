-- Create project collaborators table
CREATE TABLE public.project_collaborators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('owner', 'editor', 'viewer')),
  invited_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Enable RLS
ALTER TABLE public.project_collaborators ENABLE ROW LEVEL SECURITY;

-- Create policies for collaborators
CREATE POLICY "Users can view collaborators for their projects" 
ON public.project_collaborators 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = project_collaborators.project_id 
    AND projects.user_id = auth.uid()
  ) OR auth.uid() = user_id
);

CREATE POLICY "Project owners can manage collaborators" 
ON public.project_collaborators 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = project_collaborators.project_id 
    AND projects.user_id = auth.uid()
  )
);

-- Create script versions table
CREATE TABLE public.script_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  episode_id UUID NOT NULL REFERENCES public.episodes(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_current BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(episode_id, version_number)
);

-- Enable RLS
ALTER TABLE public.script_versions ENABLE ROW LEVEL SECURITY;

-- Create policies for script versions
CREATE POLICY "Users can view versions for episodes they can access" 
ON public.script_versions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.episodes e
    JOIN public.projects p ON e.project_id = p.id
    LEFT JOIN public.project_collaborators pc ON p.id = pc.project_id
    WHERE e.id = script_versions.episode_id 
    AND (p.user_id = auth.uid() OR pc.user_id = auth.uid())
  )
);

CREATE POLICY "Users can create versions for episodes they can edit" 
ON public.script_versions 
FOR INSERT 
WITH CHECK (
  auth.uid() = created_by AND
  EXISTS (
    SELECT 1 FROM public.episodes e
    JOIN public.projects p ON e.project_id = p.id
    LEFT JOIN public.project_collaborators pc ON p.id = pc.project_id
    WHERE e.id = script_versions.episode_id 
    AND (
      p.user_id = auth.uid() OR 
      (pc.user_id = auth.uid() AND pc.role IN ('owner', 'editor'))
    )
  )
);

CREATE POLICY "Users can update versions they created" 
ON public.script_versions 
FOR UPDATE 
USING (created_by = auth.uid());

-- Add trigger for updated_at on collaborators
CREATE TRIGGER update_project_collaborators_updated_at
BEFORE UPDATE ON public.project_collaborators
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update projects RLS to include collaborators
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
CREATE POLICY "Users can view their projects and collaborated projects" 
ON public.projects 
FOR SELECT 
USING (
  user_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM public.project_collaborators WHERE project_id = projects.id AND user_id = auth.uid())
);

-- Update episodes RLS to include collaborators
DROP POLICY IF EXISTS "Users can view episodes from their projects" ON public.episodes;
CREATE POLICY "Users can view episodes from accessible projects" 
ON public.episodes 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    LEFT JOIN public.project_collaborators pc ON p.id = pc.project_id
    WHERE p.id = episodes.project_id 
    AND (p.user_id = auth.uid() OR pc.user_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can create episodes in their projects" ON public.episodes;
CREATE POLICY "Users can create episodes in accessible projects" 
ON public.episodes 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    LEFT JOIN public.project_collaborators pc ON p.id = pc.project_id
    WHERE p.id = episodes.project_id 
    AND (
      p.user_id = auth.uid() OR 
      (pc.user_id = auth.uid() AND pc.role IN ('owner', 'editor'))
    )
  )
);

DROP POLICY IF EXISTS "Users can update episodes in their projects" ON public.episodes;
CREATE POLICY "Users can update episodes in accessible projects" 
ON public.episodes 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    LEFT JOIN public.project_collaborators pc ON p.id = pc.project_id
    WHERE p.id = episodes.project_id 
    AND (
      p.user_id = auth.uid() OR 
      (pc.user_id = auth.uid() AND pc.role IN ('owner', 'editor'))
    )
  )
);

DROP POLICY IF EXISTS "Users can delete episodes in their projects" ON public.episodes;
CREATE POLICY "Users can delete episodes in accessible projects" 
ON public.episodes 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    LEFT JOIN public.project_collaborators pc ON p.id = pc.project_id
    WHERE p.id = episodes.project_id 
    AND (
      p.user_id = auth.uid() OR 
      (pc.user_id = auth.uid() AND pc.role IN ('owner', 'editor'))
    )
  )
);