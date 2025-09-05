import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ChapterMetadata {
  id: string;
  project_id: string;
  episode_id: string | null;
  title: string;
  chapter_order: number | null;
  position: 'before' | 'after' | null;
  relative_to_episode: string | null;
  is_orphaned: boolean | null;
  type: string;
  content_type: string;
  character_count: number | null;
  processing_count: number | null;
  created_at: string;
  updated_at: string;
  processed_text: string | null;
}

export interface ChapterContent {
  id: string;
  original_text: string;
  processed_text: string | null;
}

export interface Chapter extends ChapterMetadata {
  original_text: string;
  processed_text: string | null;
}

interface ChapterCache {
  [chapterId: string]: {
    content: ChapterContent;
    lastAccessed: number;
  };
}

export function useChapterLoader() {
  const [chapterList, setChapterList] = useState<ChapterMetadata[]>([]);
  const [loadingStates, setLoadingStates] = useState<{ [chapterId: string]: boolean }>({});
  const chapterCache = useRef<ChapterCache>({});
  const maxCacheSize = 5; // Keep only 5 chapters in memory

  // Load chapter metadata only (fast for sidebar display)
  const loadChapterMetadata = useCallback(async (projectId: string) => {
    console.log('Loading chapter metadata for project:', projectId);
    
    const { data, error } = await supabase
      .from('chapters')
      .select(`
        id,
        project_id,
        episode_id,
        title,
        chapter_order,
        position,
        relative_to_episode,
        is_orphaned,
        type,
        content_type,
        character_count,
        processing_count,
        created_at,
        updated_at,
        processed_text
      `)
      .eq('project_id', projectId)
      .order('chapter_order', { nullsFirst: false })
      .order('created_at');

    if (error) {
      console.error('Error loading chapter metadata:', error);
      throw error;
    }

    // Simple sequential ordering - sort by chapter_order
    const convertedData = (data || []).map(chapter => ({
      ...chapter,
      // Keep position null for simplified system
      position: null,
      processing_count: chapter.processing_count || 0
    }));

    console.log('Loaded chapter metadata (no content):', convertedData.length, 'chapters');
    console.log('Unprocessed chapters:', convertedData.filter(ch => (ch.processing_count || 0) === 0).length);
    setChapterList(convertedData);
    return convertedData;
  }, []);

  // Load full chapter content on demand
  const loadChapterContent = useCallback(async (chapterId: string): Promise<ChapterContent | null> => {
    console.log('Loading chapter content for:', chapterId);
    
    // Check cache first
    const cached = chapterCache.current[chapterId];
    if (cached) {
      console.log('Chapter content found in cache:', chapterId);
      cached.lastAccessed = Date.now();
      return cached.content;
    }

    // Set loading state
    setLoadingStates(prev => ({ ...prev, [chapterId]: true }));

    try {
      const { data, error } = await supabase
        .from('chapters')
        .select('id, original_text, processed_text')
        .eq('id', chapterId)
        .single();

      if (error) {
        console.error('Error loading chapter content:', error);
        throw error;
      }

      if (data) {
        const content: ChapterContent = {
          id: data.id,
          original_text: data.original_text,
          processed_text: data.processed_text
        };

        // Add to cache
        chapterCache.current[chapterId] = {
          content,
          lastAccessed: Date.now()
        };

        // Clean up cache if it's too large
        cleanupCache();

        console.log('Loaded and cached chapter content:', chapterId);
        return content;
      }

      return null;
    } finally {
      setLoadingStates(prev => ({ ...prev, [chapterId]: false }));
    }
  }, []);

  // Clean up old cache entries
  const cleanupCache = useCallback(() => {
    const cacheEntries = Object.entries(chapterCache.current);
    if (cacheEntries.length > maxCacheSize) {
      // Sort by last accessed time and keep only the most recent ones
      const sortedEntries = cacheEntries.sort((a, b) => b[1].lastAccessed - a[1].lastAccessed);
      const toKeep = sortedEntries.slice(0, maxCacheSize);
      const toRemove = sortedEntries.slice(maxCacheSize);

      // Clear old entries
      toRemove.forEach(([chapterId]) => {
        delete chapterCache.current[chapterId];
      });

      // Rebuild cache with only kept entries
      const newCache: ChapterCache = {};
      toKeep.forEach(([chapterId, data]) => {
        newCache[chapterId] = data;
      });
      chapterCache.current = newCache;

      console.log('Cache cleanup: removed', toRemove.length, 'entries, keeping', toKeep.length);
    }
  }, []);

  // Get full chapter data (metadata + content)
  const getFullChapter = useCallback(async (chapterId: string): Promise<Chapter | null> => {
    const metadata = chapterList.find(ch => ch.id === chapterId);
    if (!metadata) {
      console.error('Chapter metadata not found:', chapterId);
      return null;
    }

    const content = await loadChapterContent(chapterId);
    if (!content) {
      return null;
    }

    return { ...metadata, ...content };
  }, [chapterList, loadChapterContent]);

  // Clear cache for specific chapter or all chapters
  const clearCache = useCallback((chapterId?: string) => {
    if (chapterId) {
      delete chapterCache.current[chapterId];
      console.log('Cleared cache for chapter:', chapterId);
    } else {
      chapterCache.current = {};
      console.log('Cleared all chapter cache');
    }
  }, []);

  // Check if chapter content is cached
  const isChapterCached = useCallback((chapterId: string) => {
    return !!chapterCache.current[chapterId];
  }, []);

  return {
    chapterList,
    loadingStates,
    loadChapterMetadata,
    loadChapterContent,
    getFullChapter,
    clearCache,
    isChapterCached,
    cacheSize: Object.keys(chapterCache.current).length
  };
}
