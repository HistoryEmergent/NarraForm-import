import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { MainLayout } from "@/components/MainLayout";
import { InviteHandler } from "@/components/InviteHandler";

const App = () => {
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedEpisode, setSelectedEpisode] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const inviteCode = searchParams.get('invite');

  useEffect(() => {
    let sessionCheckRetries = 0;
    const maxRetries = 3;
    let logoutTimer: NodeJS.Timeout | null = null;
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Supabase auth state change:', event, {
          user: session?.user?.id,
          hasSession: !!session,
          accessToken: session?.access_token ? 'present' : 'missing'
        });
        
        // Clear any pending logout timer
        if (logoutTimer) {
          clearTimeout(logoutTimer);
          logoutTimer = null;
        }
        
        // Only synchronous state updates here
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Add grace period before redirecting on session loss
        if (!session && event !== 'INITIAL_SESSION') {
          console.log('Session lost, adding 5-second grace period before logout...');
          logoutTimer = setTimeout(() => {
            console.log('Grace period expired, attempting session recovery...');
            
            // Try to refresh session once before logout
            supabase.auth.getSession().then(({ data: { session: recoveredSession } }) => {
              if (recoveredSession) {
                console.log('Session recovered successfully');
                setSession(recoveredSession);
                setUser(recoveredSession.user);
              } else {
                console.log('Session recovery failed, redirecting to auth');
                navigate('/auth');
              }
            });
          }, 5000); // 5 second grace period
        }
      }
    );

    // THEN check for existing session with retry mechanism
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Session check error:', error);
          
          // Retry session check up to maxRetries times
          if (sessionCheckRetries < maxRetries) {
            sessionCheckRetries++;
            console.log(`Retrying session check (${sessionCheckRetries}/${maxRetries})...`);
            setTimeout(() => checkSession(), 1000 * sessionCheckRetries); // Progressive delay
            return;
          }
        }
        
        console.log('Initial session check:', session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Only redirect if no session after all retries
        if (!session && sessionCheckRetries >= maxRetries) {
          setTimeout(() => {
            navigate('/auth');
          }, 0);
        }
      } catch (error) {
        console.error('Error checking session:', error);
        if (sessionCheckRetries < maxRetries) {
          sessionCheckRetries++;
          console.log(`Retrying session check after error (${sessionCheckRetries}/${maxRetries})...`);
          setTimeout(() => checkSession(), 1000 * sessionCheckRetries);
        } else {
          setLoading(false);
          setTimeout(() => {
            navigate('/auth');
          }, 0);
        }
      }
    };

    checkSession();

    // Load selected project from localStorage on mount
    const savedProject = localStorage.getItem('selectedProject');
    if (savedProject) {
      setSelectedProject(savedProject);
    }

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Save selected project to localStorage when it changes
  useEffect(() => {
    if (selectedProject) {
      localStorage.setItem('selectedProject', selectedProject);
    } else {
      localStorage.removeItem('selectedProject');
    }
  }, [selectedProject]);

  const handleProjectSelect = (projectId: string | null) => {
    console.log('🔄 App handling project selection:', projectId);
    setSelectedProject(projectId);
    
    // Force refresh of project manager to show the newly joined project
    window.dispatchEvent(new CustomEvent('refresh-projects'));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div>Loading...</div>
      </div>
    );
  }

  if (!user || !session) {
    return null; // Will redirect to auth
  }

  return (
    <div className="min-h-screen bg-background">
      <MainLayout
        selectedProject={selectedProject}
        onProjectSelect={handleProjectSelect}
        selectedEpisode={selectedEpisode}
        onEpisodeSelect={setSelectedEpisode}
        user={user}
      />
      
      <InviteHandler 
        inviteCode={inviteCode || undefined}
        onProjectSelect={handleProjectSelect}
      />
    </div>
  );
};

export default App;