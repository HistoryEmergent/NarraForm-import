-- Create a function to help migrate localStorage projects to database
CREATE OR REPLACE FUNCTION public.migrate_local_project_to_db(
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_content_type TEXT DEFAULT 'novel',
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_project_id UUID;
BEGIN
  -- Create the project in the database
  INSERT INTO public.projects (title, description, content_type, user_id)
  VALUES (p_title, p_description, p_content_type, p_user_id)
  RETURNING id INTO new_project_id;
  
  RETURN new_project_id;
END;
$$;

-- Create a table for storing project invite links
CREATE TABLE IF NOT EXISTS public.project_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_code TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'editor',
  expires_at TIMESTAMP WITH TIME ZONE,
  max_uses INTEGER DEFAULT NULL,
  current_uses INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on project_invites
ALTER TABLE public.project_invites ENABLE ROW LEVEL SECURITY;

-- RLS policies for project_invites
CREATE POLICY "Project owners can manage invites"
ON public.project_invites
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = project_invites.project_id 
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Anyone can view non-expired invites"
ON public.project_invites
FOR SELECT
USING (
  expires_at IS NULL OR expires_at > NOW()
);

-- Function to accept invite and join project
CREATE OR REPLACE FUNCTION public.accept_project_invite(invite_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  invite_record public.project_invites%ROWTYPE;
  result JSONB;
BEGIN
  -- Get the invite
  SELECT * INTO invite_record
  FROM public.project_invites
  WHERE project_invites.invite_code = accept_project_invite.invite_code;
  
  -- Check if invite exists
  IF NOT FOUND THEN
    RETURN '{"success": false, "error": "Invalid invite code"}'::JSONB;
  END IF;
  
  -- Check if invite is expired
  IF invite_record.expires_at IS NOT NULL AND invite_record.expires_at < NOW() THEN
    RETURN '{"success": false, "error": "Invite has expired"}'::JSONB;
  END IF;
  
  -- Check max uses
  IF invite_record.max_uses IS NOT NULL AND invite_record.current_uses >= invite_record.max_uses THEN
    RETURN '{"success": false, "error": "Invite has reached maximum uses"}'::JSONB;
  END IF;
  
  -- Check if user is already a collaborator
  IF EXISTS (
    SELECT 1 FROM public.project_collaborators 
    WHERE project_id = invite_record.project_id 
    AND user_id = auth.uid()
  ) THEN
    RETURN '{"success": false, "error": "You are already a collaborator on this project"}'::JSONB;
  END IF;
  
  -- Add user as collaborator
  INSERT INTO public.project_collaborators (project_id, user_id, role, invited_by)
  VALUES (invite_record.project_id, auth.uid(), invite_record.role, invite_record.created_by);
  
  -- Update invite usage count
  UPDATE public.project_invites 
  SET current_uses = current_uses + 1, updated_at = NOW()
  WHERE id = invite_record.id;
  
  -- Get project info for response
  SELECT jsonb_build_object(
    'success', true,
    'project_id', p.id,
    'project_title', p.title,
    'role', invite_record.role
  ) INTO result
  FROM public.projects p
  WHERE p.id = invite_record.project_id;
  
  RETURN result;
END;
$$;

-- Add trigger for updated_at on project_invites
CREATE TRIGGER update_project_invites_updated_at
  BEFORE UPDATE ON public.project_invites
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();