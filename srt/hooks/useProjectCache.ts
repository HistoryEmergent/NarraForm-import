// CENTRALIZED CACHE MANAGEMENT HOOK
import { useCallback } from 'react';

export const useProjectCache = () => {
  const clearProjectCache = useCallback((projectId: string) => {
    const keysToRemove = [
      `storyConverter_project_${projectId}`,
      `storyConverter_episodes_${projectId}`,  
      `storyConverter_chapters_${projectId}`,
      `${projectId}-chapters`,
      `${projectId}-episodes`,
      `project-${projectId}`,
      `chapters_${projectId}`,
      `episodes_${projectId}`,
    ];
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });

    console.log(`Cache cleared for project: ${projectId}`);
  }, []);

  const clearAllCache = useCallback(() => {
    // Clear all project-related localStorage keys
    const keys = Object.keys(localStorage);
    const projectKeys = keys.filter(key => 
      key.includes('storyConverter') || 
      key.includes('-chapters') || 
      key.includes('-episodes') ||
      key.startsWith('project-') ||
      key.includes('audiodrama-projects')
    );

    projectKeys.forEach(key => {
      localStorage.removeItem(key);
    });

    console.log('All project cache cleared');
  }, []);

  return { clearProjectCache, clearAllCache };
};