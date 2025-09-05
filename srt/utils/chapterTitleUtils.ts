/**
 * Cleans chapter titles by removing unwanted tags like "(inter-episode)"
 */
export function cleanChapterTitle(title: string): string {
  if (!title) return title;
  
  // Remove leading chapter numbers (e.g., "1 Title" -> "Title")
  let cleanedTitle = title.replace(/^(\d+)(?:\n|\s+)/, '');
  
  // Remove "(inter-episode)" text and any similar patterns
  cleanedTitle = cleanedTitle
    .replace(/\s*\(inter-episode\)\s*/gi, '')
    .replace(/\s*\(inter episode\)\s*/gi, '')
    .trim();
    
  return cleanedTitle;
}