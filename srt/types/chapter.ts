export interface Reports {
  soundEffects: string[];
  characters: string[];
}

export interface ChapterMetadata {
  id: string;
  title: string;
  type: 'chapter' | 'scene';
  contentType: 'novel' | 'screenplay';
  episodeId?: string;
  reports?: Reports;
  character_count?: number;
  chapter_order?: number;
  position?: 'before' | 'after';
  relativeToEpisode?: string;
  processedText?: string;
  processing_count?: number;
}

export interface Chapter extends ChapterMetadata {
  originalText: string;
  processedText?: string;
}

export interface Episode {
  id: string;
  title: string;
  description?: string;
  chapterIds: string[];
}