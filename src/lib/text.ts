

export interface CustomRule {
  find: string;
  replace: string;
  isRegex: boolean;
  flags: string;
}

export interface StandardRule extends CustomRule {
  id: string;
  name: string;
  enabled: boolean;
}

export interface CleaningOptions {
  standardRules: StandardRule[];
  customRules: CustomRule[];
}

export const initialCleaningOptions: CleaningOptions = {
    standardRules: [
        { id: 'removeHeaders', name: 'Remove Repeating Headers (placeholder)', find: '', replace: '', isRegex: false, enabled: true, flags: '' },
        { id: 'removeFooters', name: 'Remove Repeating Footers (placeholder)', find: '', replace: '', isRegex: false, enabled: true, flags: '' },
        { id: 'removePageNumbers', name: 'Remove "Page X of Y"', find: '^Page\\s+\\d+(\\s+of\\s+\\d+)?$', replace: '', isRegex: true, enabled: true, flags: 'gm' },
        { id: 'normalizeWhitespace', name: 'Normalize Whitespace', find: '', replace: '', isRegex: false, enabled: true, flags: '' },
    ],
    customRules: [],
};

export interface Chunk {
  chunk_id: string;
  title: string;
  content: string;
  metadata: {
    parent_id: string | null;
    section: string | null;
    section_id: string | null;
    keywords: string[];
    related_chunks: string[];
    toc_reference: string | null;
    resolved_glossary_terms: Record<string, string>;
    semantic_label: string;
    semantic_label_reason: string | null;
    char_count: number;
    token_count: number;
  };
}


export function applyCleaningRules(text: string, options: CleaningOptions): string {
  if (!text) return '';

  let cleanedText = text;

  const applyRule = (rule: CustomRule | StandardRule) => {
    if (!rule.find) return;
    if (rule.isRegex) {
        try {
            const regex = new RegExp(rule.find, rule.flags || 'gi');
            cleanedText = cleanedText.replace(regex, rule.replace);
        } catch (e) {
            console.error("Invalid regex:", rule.find, e);
        }
    } else {
        // Simple string replacement, flags are ignored
        cleanedText = cleanedText.split(rule.find).join(rule.replace);
    }
  };

  // Process all enabled standard rules
  options.standardRules.forEach(rule => {
    if ('enabled' in rule && rule.enabled) {
      // Special handling for placeholder rules that have more complex logic
      if (rule.id === 'normalizeWhitespace') return;
      applyRule(rule);
    }
  });

  // Process all custom rules
  options.customRules.forEach(rule => {
    applyRule(rule);
  });

  // Handle special non-regex rules
  const normalizeWhitespaceRule = options.standardRules.find(r => r.id === 'normalizeWhitespace');
  if (normalizeWhitespaceRule?.enabled) {
    cleanedText = cleanedText.replace(/[ \t]{2,}/g, ' '); 
    cleanedText = cleanedText.replace(/\r\n/g, '\n'); 
    cleanedText = cleanedText.replace(/^\s*PAGE_BREAK\s*/gm, ''); // Remove page break markers from content
    cleanedText = cleanedText.replace(/(\n\s*){3,}/g, '\n\n'); // Collapse multiple newlines
  }
  
  // Note: removeHeaders, removeFooters are not implemented here
  // as they require more complex, multi-page context that this function doesn't have.
  // Their toggles serve as placeholders for a more advanced implementation.

  return cleanedText.trim();
}

function escapeRegex(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const estimateTokens = (text: string) => Math.ceil(text.length / 4);

const extractKeywords = (text: string, count = 10): string[] => {
    const stopWords = new Set(['a', 'an', 'the', 'and', 'in', 'is', 'it', 'of', 'for', 'on', 'with', 'to', 'by', 'as', 'at', 'but', 'if', 'or', 'so', 'then', 'from', 'this', 'that', 'these', 'those', 'be', 'are', 'was', 'were', 'has', 'have', 'had', 'do', 'does', 'did', 'not', 'will', 'would', 'should', 'can', 'could', 'may', 'might', 'must']);
    const words = text.toLowerCase().replace(/[^\w\s-]/g, '').split(/\s+/);
    const freq: Record<string, number> = {};
    
    words.forEach(word => {
        if (word && !stopWords.has(word) && isNaN(parseInt(word)) && word.length > 2) {
            freq[word] = (freq[word] || 0) + 1;
        }
    });

    return Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, count)
        .map(entry => entry[0]);
};

const isSectionHeader = (line: string): { isHeader: boolean; id: string | null; title: string; raw: string } => {
    const trimmed = line.trim();
    if (trimmed.length > 200 || trimmed.length < 3) return { isHeader: false, id: null, title: '', raw: '' };

    // Regex to capture section IDs (e.g., 1., 1.2, 1.2.3, Appendix A, IV.) and titles.
    const match = trimmed.match(/^(?<id>(\d+(\.\d+)*\s*)|(Appendix\s+[A-Z0-9]+\s*)|([IVXLCDM]+\.\s*))(?<title>[A-Za-z0-9\s,'"-][A-Za-z0-9\s,'"-]+.*)/);
    
    if (match && match.groups && !trimmed.endsWith('.')) {
        return {
            isHeader: true,
            id: match.groups.id.trim().replace(/\.$/, ''), // Remove trailing dot from ID
            title: match.groups.title.trim(),
            raw: trimmed
        };
    }
    // Handle cases with no section ID but capitalized, short lines (potential titles)
    if (trimmed.toUpperCase() === trimmed && trimmed.length < 80 && !trimmed.endsWith('.')) {
         return { isHeader: true, id: null, title: trimmed, raw: trimmed };
    }
    return { isHeader: false, id: null, title: '', raw: '' };
};

const parseGlossary = (text: string): Map<string, string> => {
    const glossary = new Map<string, string>();
    const lines = text.split('\n');
    // Regex for term: definition, handles multi-word terms.
    const termRegex = /^(?<term>[A-Z0-9\s_-]{2,})(?:\s*[:–-]\s*|\s{2,})(?<definition>.+)$/;

    for (const line of lines) {
        const match = line.match(termRegex);
        if (match && match.groups) {
            const term = match.groups.term.trim();
            const definition = match.groups.definition.trim();
            if (term.toUpperCase() === term) { // Assume acronyms/terms are uppercase
                glossary.set(term, definition);
            }
        }
    }
    return glossary;
};

const parseToc = (text: string): Map<string, string> => {
    const toc = new Map<string, string>();
    const lines = text.split('\n');
    // Regex for TOC lines with page numbers
    const tocRegex = /^(?<title>.*?)\s*[.|_]{2,}\s*[\dIVXLCDMivxlcdm]+$/;
    
    for (const line of lines) {
        const match = line.match(tocRegex);
        if (match && match.groups) {
            const rawTitle = match.groups.title.trim();
            // Clean up the title by removing section numbers
            const cleanTitle = rawTitle.replace(/^((\d+(\.\d+)*\s*)|(Appendix\s+[A-Z0-9]+\s*)|([IVXLCDM]+\.\s*))/,'').trim();
            if (cleanTitle) {
                toc.set(cleanTitle, line.trim());
            }
        }
    }
    return toc;
};

const SEMANTIC_LABELS: Record<string, string[]> = {
    'Functional Requirement': ['shall', 'must', 'required to'],
    'Non-Functional Requirement': ['performance', 'scalability', 'reliability', 'usability', 'security'],
    'Safety': ['safety', 'sotif', 'asil', 'iso 26262', 'hazard', 'risk'],
    'Cybersecurity': ['cybersecurity', 'threat', 'vulnerability', 'iso 21434'],
    'Architecture': ['component', 'interface', 'module', 'architecture', 'design'],
    'Glossary': ['glossary', 'abbreviations', 'acronyms', 'definitions'],
};

const getSemanticLabel = (content: string): { label: string; reason: string | null } => {
    const lowerContent = content.toLowerCase();
    for (const [label, keywords] of Object.entries(SEMANTIC_LABELS)) {
        for (const keyword of keywords) {
            if (lowerContent.includes(keyword)) {
                return { label, reason: `Detected based on keyword: '${keyword}'` };
            }
        }
    }
    return { label: 'Uncategorized', reason: null };
};

export function performLocalChunking(text: string, contextWindow: number, overlap: number): Chunk[] {
    if (!text) return [];

    const glossary = new Map<string, string>();
    const toc = new Map<string, string>();
    const tocSections = text.match(/^(Table of Contents|Contents)[\s\S]*/im);
    if (tocSections) {
        parseToc(tocSections[0]).forEach((value, key) => toc.set(key, value));
    }
    const glossarySections = text.match(/^(Glossary|Abbreviations|Acronyms)[\s\S]*/im);
    if (glossarySections) {
        parseGlossary(glossarySections[0]).forEach((value, key) => glossary.set(key, value));
    }

    const lines = text.split('\n');
    const chunks: Chunk[] = [];
    let chunkIndex = 1;
    let currentSectionInfo: { id: string | null; title: string | null; section: string | null; parent_id: string | null } = { id: null, title: 'Introduction', section: null, parent_id: null };
    let contentBuffer: string[] = [];
    const sectionHistory: {id: string | null, chunk_id: string}[] = [];


    const finalizeChunk = (content: string) => {
        if (!content.trim()) return;
        const chunkId = `C${chunkIndex}`;
        const title = currentSectionInfo.title || `Chunk ${chunkIndex}`;

        // Find parent chunk based on section hierarchy
        if (currentSectionInfo.id) {
            const currentIdParts = currentSectionInfo.id.split('.');
            if (currentIdParts.length > 1) {
                const parentIdPrefix = currentIdParts.slice(0, -1).join('.');
                const parent = sectionHistory.slice().reverse().find(s => s.id === parentIdPrefix);
                if (parent) {
                    currentSectionInfo.parent_id = parent.chunk_id;
                }
            }
        } else if (chunks.length > 0) {
            // Fallback for non-ID'd sections to inherit from previous chunk in same section
            const lastChunk = chunks[chunks.length - 1];
            if (lastChunk.title === title && lastChunk.chunk_id !== chunkId) {
                currentSectionInfo.parent_id = lastChunk.metadata.parent_id;
            }
        }
        
        const { label, reason } = getSemanticLabel(content);

        chunks.push({
            chunk_id: chunkId,
            title: title,
            content: content.trim(),
            metadata: {
                parent_id: currentSectionInfo.parent_id,
                section: currentSectionInfo.section,
                section_id: currentSectionInfo.id,
                keywords: extractKeywords(content),
                related_chunks: [],
                toc_reference: toc.get(title) || null,
                resolved_glossary_terms: {},
                semantic_label: label,
                semantic_label_reason: reason,
                char_count: content.trim().length,
                token_count: estimateTokens(content.trim()),
            }
        });
        chunkIndex++;
        return chunkId;
    };
    
    for (const line of lines) {
        const headerInfo = isSectionHeader(line);

        if (headerInfo.isHeader) {
            if (contentBuffer.length > 0) {
                const chunkId = finalizeChunk(contentBuffer.join('\n'));
                if(chunkId && currentSectionInfo.id && !sectionHistory.find(s => s.id === currentSectionInfo.id)){
                    sectionHistory.push({id: currentSectionInfo.id, chunk_id: chunkId});
                }
            }
            // Start new buffer with overlap from previous content if needed
            const overlapText = contentBuffer.length > 0 ? contentBuffer.join('\n').split(' ').slice(-Math.floor(overlap/4)).join(' ') : '';
            contentBuffer = overlap > 0 && overlapText ? [overlapText] : [];
            
            // Update section info
            currentSectionInfo.id = headerInfo.id;
            currentSectionInfo.title = headerInfo.title;
            currentSectionInfo.section = headerInfo.raw;
            currentSectionInfo.parent_id = null; // Reset parent_id for new section
            
            contentBuffer.push(line);
            
        } else {
            const lineTokenCount = estimateTokens(line);
            const currentBufferTokenCount = estimateTokens(contentBuffer.join('\n'));

            if (currentBufferTokenCount + lineTokenCount > contextWindow && contentBuffer.length > 0) {
                const chunkId = finalizeChunk(contentBuffer.join('\n'));
                if(chunkId && currentSectionInfo.id && !sectionHistory.find(s => s.id === currentSectionInfo.id)){
                    sectionHistory.push({id: currentSectionInfo.id, chunk_id: chunkId});
                }

                // Create overlap
                const overlapText = contentBuffer.join('\n').split(' ').slice(-Math.floor(overlap/4)).join(' ');
                contentBuffer = overlap > 0 && overlapText ? [overlapText, line] : [line];
                
                // Set parent_id for continuation chunks to the first chunk of the section
                const sectionStartChunk = sectionHistory.find(s => s.id === currentSectionInfo.id);
                if (sectionStartChunk) {
                    currentSectionInfo.parent_id = sectionStartChunk.chunk_id;
                }
            } else {
                contentBuffer.push(line);
            }
        }
    }

    if (contentBuffer.length > 0) {
        finalizeChunk(contentBuffer.join('\n'));
    }

    return chunks.map((chunk, index, allChunks) => {
        // Post-process for related_chunks and glossary
        const related: string[] = [];
        if (chunk.metadata.parent_id && chunk.metadata.parent_id !== chunk.chunk_id) {
            related.push(chunk.metadata.parent_id);
        }
        if (index > 0) {
           const prevChunkId = allChunks[index - 1].chunk_id;
           if(!related.includes(prevChunkId)) related.push(prevChunkId);
        }
        if (index < allChunks.length - 1) {
            related.push(allChunks[index + 1].chunk_id);
        }
        chunk.metadata.related_chunks = [...new Set(related)];

        // Populate resolved glossary terms
        const resolvedTerms: Record<string, string> = {};
        if (glossary.size > 0) {
            for (const [term, definition] of glossary.entries()) {
                const termRegex = new RegExp(`\\b${escapeRegex(term)}\\b`, 'g');
                if (termRegex.test(chunk.content)) {
                    resolvedTerms[term] = definition;
                }
            }
        }
        chunk.metadata.resolved_glossary_terms = resolvedTerms;
        
        return chunk;
    });
}
