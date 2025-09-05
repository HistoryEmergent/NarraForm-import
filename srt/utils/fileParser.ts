import mammoth from 'mammoth';
import JSZip from 'jszip';

export interface ParsedContent {
  text: string;
  sections: Array<{
    id: string;
    title: string;
    content: string;
    type: 'chapter' | 'scene';
  }>;
}

export async function parseFile(file: File, contentType: 'novel' | 'screenplay'): Promise<ParsedContent> {
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  let text = '';

  console.log('Parsing file:', file.name, 'extension:', extension, 'contentType:', contentType);

  try {
    switch (extension) {
      case '.txt':
        text = await file.text();
        break;
      
      case '.rtf':
        // For RTF files, we'll need to parse them properly
        // For now, let's try reading as text and see if we can extract content
        const rtfText = await file.text();
        text = extractRTFText(rtfText);
        break;
      
      case '.doc':
      case '.docx':
        const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
        text = result.value;
        break;
      
      case '.pages':
        // Pages files are complex - for now we'll show an error message
        throw new Error('Pages files require special handling. Please export as .txt or .docx first.');
      
      case '.fdx':
        const fdxText = await file.text();
        text = extractFDXText(fdxText);
        break;
      
      case '.epub':
        text = await extractEPUBText(file);
        break;
      
      default:
        text = await file.text();
    }

    // Split content based on type
    console.log('Text after processing:', text.substring(0, 500) + '...');
    const sections = contentType === 'novel' 
      ? splitNovelIntoChapters(text)
      : splitScreenplayIntoScenes(text);

    console.log('Sections created:', sections.length, sections.map(s => s.title));

    return { text, sections };
  } catch (error) {
    console.error('Error parsing file:', error);
    throw error;
  }
}

function extractRTFText(rtfContent: string): string {
  // Basic RTF text extraction - remove RTF control codes
  let text = rtfContent;
  
  // Remove RTF header and control words
  text = text.replace(/\{\*?\\[^{}]+}|\\[a-z]+\d*\s?/gi, '');
  
  // Clean up remaining formatting
  text = text.replace(/[{}]/g, '');
  text = text.replace(/\\\\/g, '\\');
  text = text.replace(/\\'/g, "'");
  
  // Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
}

function extractFDXText(fdxContent: string): string {
  // FDX files are XML-based Final Draft files
  let text = fdxContent;
  
  // Parse FDX XML more carefully to preserve screenplay structure
  // Look for Scene Heading elements and preserve them
  text = text.replace(/<SceneHeading[^>]*>(.*?)<\/SceneHeading>/gs, (match, content) => {
    // Extract the actual scene heading text
    const cleanContent = content.replace(/<[^>]*>/g, '').trim();
    return `\n\n${cleanContent}\n\n`;
  });
  
  // Look for Action elements
  text = text.replace(/<Action[^>]*>(.*?)<\/Action>/gs, (match, content) => {
    const cleanContent = content.replace(/<[^>]*>/g, '').trim();
    return `\n${cleanContent}\n`;
  });
  
  // Look for Character elements
  text = text.replace(/<Character[^>]*>(.*?)<\/Character>/gs, (match, content) => {
    const cleanContent = content.replace(/<[^>]*>/g, '').trim();
    return `\n\n${cleanContent}\n`;
  });
  
  // Look for Dialogue elements
  text = text.replace(/<Dialogue[^>]*>(.*?)<\/Dialogue>/gs, (match, content) => {
    const cleanContent = content.replace(/<[^>]*>/g, '').trim();
    return `${cleanContent}\n`;
  });
  
  // Look for Parenthetical elements
  text = text.replace(/<Parenthetical[^>]*>(.*?)<\/Parenthetical>/gs, (match, content) => {
    const cleanContent = content.replace(/<[^>]*>/g, '').trim();
    return `(${cleanContent})\n`;
  });
  
  // Look for generic Text elements that might contain scene headers
  text = text.replace(/<Text[^>]*>(.*?)<\/Text>/gs, (match, content) => {
    const cleanContent = content.replace(/<[^>]*>/g, '').trim();
    // Check if this looks like a scene header
    if (/^(INT\.|EXT\.|INTERIOR|EXTERIOR)/i.test(cleanContent)) {
      return `\n\n${cleanContent}\n\n`;
    }
    return `${cleanContent} `;
  });
  
  // Remove any remaining XML tags
  text = text.replace(/<[^>]*>/g, '');
  
  // Decode HTML entities
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  
  // Clean up excessive whitespace but preserve scene breaks
  text = text.replace(/\n{4,}/g, '\n\n\n');
  text = text.replace(/[ \t]+/g, ' ');
  text = text.trim();
  
  return text;
}

async function extractEPUBText(file: File): Promise<string> {
  try {
    const zip = new JSZip();
    const contents = await zip.loadAsync(file);
    
    // Find the OPF file (contains the book's metadata and structure)
    let opfFile: JSZip.JSZipObject | null = null;
    
    // Look for container.xml first to find the OPF file location
    const containerFile = contents.file('META-INF/container.xml');
    if (containerFile) {
      const containerXML = await containerFile.async('text');
      const opfPathMatch = containerXML.match(/full-path="([^"]+)"/);
      if (opfPathMatch) {
        opfFile = contents.file(opfPathMatch[1]);
      }
    }
    
    // Fallback: look for common OPF file names
    if (!opfFile) {
      const possibleOPFFiles = ['content.opf', 'package.opf', 'book.opf'];
      for (const filename of possibleOPFFiles) {
        opfFile = contents.file(filename);
        if (opfFile) break;
        
        // Also check in OEBPS folder
        opfFile = contents.file(`OEBPS/${filename}`);
        if (opfFile) break;
      }
    }
    
    if (!opfFile) {
      throw new Error('Could not find OPF file in EPUB');
    }
    
    const opfContent = await opfFile.async('text');
    
    // Extract reading order from OPF spine
    const spineMatches = [...opfContent.matchAll(/<itemref[^>]+idref="([^"]+)"/g)];
    const manifestItems: { [key: string]: string } = {};
    
    // Extract manifest items (maps IDs to file paths)
    const manifestMatches = [...opfContent.matchAll(/<item[^>]+id="([^"]+)"[^>]+href="([^"]+)"/g)];
    manifestMatches.forEach(match => {
      manifestItems[match[1]] = match[2];
    });
    
    let extractedText = '';
    const basePath = opfFile.name.includes('/') ? opfFile.name.substring(0, opfFile.name.lastIndexOf('/') + 1) : '';
    
    // Process files in spine order
    for (const spineMatch of spineMatches) {
      const idref = spineMatch[1];
      const href = manifestItems[idref];
      
      if (href && href.endsWith('.xhtml')) {
        const filePath = basePath + href;
        const xhtmlFile = contents.file(filePath);
        
        if (xhtmlFile) {
          const xhtmlContent = await xhtmlFile.async('text');
          const cleanText = extractTextFromXHTML(xhtmlContent);
          if (cleanText.trim()) {
            extractedText += cleanText + '\n\n';
          }
        }
      }
    }
    
    // Fallback: if no spine processing worked, try to extract from all XHTML files
    if (!extractedText.trim()) {
      const xhtmlFiles = Object.keys(contents.files).filter(name => 
        name.endsWith('.xhtml') || name.endsWith('.html')
      );
      
      for (const fileName of xhtmlFiles.sort()) {
        const file = contents.file(fileName);
        if (file) {
          const content = await file.async('text');
          const cleanText = extractTextFromXHTML(content);
          if (cleanText.trim()) {
            extractedText += cleanText + '\n\n';
          }
        }
      }
    }
    
    return extractedText.trim();
  } catch (error) {
    console.error('Error extracting EPUB text:', error);
    throw new Error('Failed to extract text from EPUB file. The file may be corrupted or use an unsupported format.');
  }
}

function extractTextFromXHTML(xhtml: string): string {
  // Remove XML declaration and DOCTYPE
  let text = xhtml.replace(/<\?xml[^>]*\?>/gi, '');
  text = text.replace(/<!DOCTYPE[^>]*>/gi, '');
  
  // Extract text from common EPUB elements while preserving structure
  // Handle chapter headings
  text = text.replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n\n$1\n\n');
  
  // Handle paragraphs
  text = text.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');
  
  // Handle line breaks
  text = text.replace(/<br[^>]*\/?>/gi, '\n');
  
  // Handle divs and sections
  text = text.replace(/<div[^>]*>(.*?)<\/div>/gi, '$1\n');
  text = text.replace(/<section[^>]*>(.*?)<\/section>/gi, '$1\n');
  
  // Remove all remaining HTML tags
  text = text.replace(/<[^>]*>/g, '');
  
  // Decode HTML entities
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&nbsp;/g, ' ');
  
  // Clean up whitespace
  text = text.replace(/\n\s*\n\s*\n/g, '\n\n'); // Replace multiple line breaks
  text = text.replace(/[ \t]+/g, ' '); // Replace multiple spaces/tabs
  text = text.trim();
  
  return text;
}

function splitNovelIntoChapters(text: string): Array<{ id: string; title: string; content: string; type: 'chapter' }> {
  const chapters = [];
  
  // Try multiple chapter detection patterns
  const patterns = [
    // "Chapter 1", "Chapter One", etc.
    /(?:^|\n\n)\s*(Chapter\s+(?:\d+|[A-Z][a-z]+)(?:\s*[:\-\s]\s*.*?)?)\s*\n/gi,
    // "1. Chapter Title" or "I. Chapter Title"
    /(?:^|\n\n)\s*([IVX]+\.?\s+.*?|^\d+\.?\s+.*?)\s*\n/gm,
    // Just numbers "1", "2", etc.
    /(?:^|\n\n)\s*(\d+)\s*\n/gm,
    // Section breaks with asterisks or dashes
    /(?:^|\n\n)\s*[\*\-]{3,}\s*\n/gm
  ];

  let chapterMatches = [];
  
  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern)];
    if (matches.length > 1) {
      chapterMatches = matches;
      break;
    }
  }

  if (chapterMatches.length === 0) {
    // No clear chapter structure found, split by paragraph breaks
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 100);
    const chunkSize = Math.ceil(paragraphs.length / Math.max(1, Math.floor(paragraphs.length / 10)));
    
    for (let i = 0; i < paragraphs.length; i += chunkSize) {
      const chunk = paragraphs.slice(i, i + chunkSize).join('\n\n');
        chapters.push({
          id: crypto.randomUUID(),
          title: `Section ${Math.floor(i / chunkSize) + 1}`,
          content: chunk.trim(),
          type: 'chapter' as const
        });
    }
  } else {
    // Split by detected chapters
    for (let i = 0; i < chapterMatches.length; i++) {
      const match = chapterMatches[i];
      const nextMatch = chapterMatches[i + 1];
      
      const startIndex = match.index! + match[0].length;
      const endIndex = nextMatch ? nextMatch.index! : text.length;
      
      const content = text.substring(startIndex, endIndex).trim();
      const title = match[1]?.trim() || `Chapter ${i + 1}`;
      
      if (content.length > 0) {
        chapters.push({
          id: crypto.randomUUID(),
          title: title,
          content: content,
          type: 'chapter' as const
        });
      }
    }
  }

  return chapters.length > 0 ? chapters : [{
    id: crypto.randomUUID(),
    title: 'Full Content',
    content: text.trim(),
    type: 'chapter' as const
  }];
}

function splitScreenplayIntoScenes(text: string): Array<{ id: string; title: string; content: string; type: 'scene' }> {
  console.log('Splitting screenplay text:', text.substring(0, 500) + '...');
  
  // Simple and reliable scene detection: split on every EXT. or INT. occurrence
  const scenes = [];
  
  // Find all EXT./INT. occurrences with their positions
  const sceneMarkers = [];
  const regex = /(?:^|\n)\s*((?:EXT\.|INT\.|EXTERIOR|INTERIOR)[^\n]*)/gim;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    sceneMarkers.push({
      index: match.index,
      header: match[1].trim(),
      fullMatch: match[0]
    });
  }
  
  console.log('Found scene markers:', sceneMarkers.length, sceneMarkers.map(m => m.header));
  
  if (sceneMarkers.length === 0) {
    // No scene headers found, try fallback patterns
    const fallbackPatterns = [
      // Look for numbered scenes: SCENE 1, Scene 1:, etc.
      /(?:^|\n)\s*(SCENE\s+\d+[:\s]*[^\n]*)/gim,
      // Look for FADE IN, FADE OUT patterns
      /(?:^|\n)\s*(FADE\s+(?:IN|OUT)[^\n]*)/gim,
      // Look for action lines that might indicate scene breaks
      /(?:^|\n)\s*([A-Z][A-Z\s]{10,}[^\n]*)/gm
    ];
    
    for (const pattern of fallbackPatterns) {
      const matches = [...text.matchAll(pattern)];
      if (matches.length > 1) {
        matches.forEach(match => {
          sceneMarkers.push({
            index: match.index!,
            header: match[1].trim(),
            fullMatch: match[0]
          });
        });
        break;
      }
    }
  }
  
  // Sort markers by position
  sceneMarkers.sort((a, b) => a.index - b.index);
  
  if (sceneMarkers.length === 0) {
    // Still no markers found, split by large paragraph breaks
    const sections = text.split(/\n\s*\n\s*\n/).filter(s => s.trim().length > 50);
    return sections.map((section, index) => ({
      id: crypto.randomUUID(),
      title: `Scene ${index + 1}`,
      content: section.trim(),
      type: 'scene' as const
    }));
  }
  
  // Split text based on scene markers
  for (let i = 0; i < sceneMarkers.length; i++) {
    const currentMarker = sceneMarkers[i];
    const nextMarker = sceneMarkers[i + 1];
    
    const startIndex = currentMarker.index;
    const endIndex = nextMarker ? nextMarker.index : text.length;
    
    const sceneContent = text.substring(startIndex, endIndex).trim();
    
    if (sceneContent.length > 0) {
      // Clean up the scene header for display
      let sceneHeader = currentMarker.header;
      
      // Standardize the header format
      sceneHeader = sceneHeader.replace(/^(INT\.|EXT\.|INTERIOR|EXTERIOR)\s*/i, (match) => match.toUpperCase());
      
      // Remove extra whitespace and formatting
      sceneHeader = sceneHeader.replace(/\s+/g, ' ').trim();
      
      scenes.push({
        id: crypto.randomUUID(),
        title: sceneHeader || `Scene ${i + 1}`,
        content: sceneContent,
        type: 'scene' as const
      });
    }
  }
  
  // Ensure we have at least one scene
  return scenes.length > 0 ? scenes : [{
    id: crypto.randomUUID(),
    title: 'Full Script',
    content: text.trim(),
    type: 'scene' as const
  }];
}