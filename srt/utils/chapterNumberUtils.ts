import { ChapterMetadata } from "@/types/chapter";

/**
 * Extracts chapter number from title, with intelligent fallbacks
 */
export function getChapterNumber(
  chapter: ChapterMetadata, 
  fallbackNumber: number,
  context?: { maxReasonable?: number }
): number {
  // First try: Extract number from title using regex
  const titleMatch = chapter.title?.match(/^(\d+)(?:\n|\s|$)/);
  if (titleMatch) {
    const extractedNum = parseInt(titleMatch[1], 10);
    
    // Check if the extracted number seems "odd" and should use fallback
    if (isOddChapterNumber(extractedNum, context)) {
      return fallbackNumber;
    }
    
    return extractedNum;
  }
  
  // Final fallback: Use provided fallback number
  return fallbackNumber;
}

/**
 * Determines if an extracted chapter number seems "odd" and should use fallback
 */
function isOddChapterNumber(
  extractedNum: number, 
  context?: { maxReasonable?: number }
): boolean {
  // Years like 1862 from Les Misérables should use chapter_order instead
  if (extractedNum > 1000) return true;
  
  // If context provides a reasonable maximum and we exceed it
  if (context?.maxReasonable && extractedNum > context.maxReasonable) return true;
  
  return false;
}