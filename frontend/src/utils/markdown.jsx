/* ------------------------------------------------------------------ */
/*  Lightweight Markdown renderer — handles bold, lists, line breaks  */
/* ------------------------------------------------------------------ */
export function renderMarkdown(text, options = { stripHeaders: false }) {
  if (!text) return null;

  let cleaned = text;

  if (options.stripHeaders) {
    // Strip ALL section headers globally (REASONING:, RECOMMENDATION:, CONFIDENCE:, etc.)
    cleaned = cleaned
      .replace(/^#{1,3}\s*(REASONING|RECOMMENDATION|ANALYSIS|SUMMARY|CONCLUSION|RISK DASHBOARD|PRIORITIZED)[:\s]*/gim, '')
      .replace(/^\*{1,2}(REASONING|RECOMMENDATION|CONFIDENCE|ANALYSIS|SUMMARY|CONCLUSION)\*{1,2}[:\s]*/gim, '')
      .replace(/^(REASONING|RECOMMENDATION|CONFIDENCE|ANALYSIS|SUMMARY|CONCLUSION)[:\s]+/gim, '')
      .replace(/\*{1,2}CONFIDENCE\*{1,2}[:\s]*[\d.]+[^\n]*/gim, '')
      .replace(/^CONFIDENCE[:\s]*[\d.]+[^\n]*/gim, '');
  }

  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

  // Deduplicate: split into blocks, hash each, and remove dups
  const blocks = cleaned.split(/\n\n+/);
  const seenBlocks = new Set();
  const dedupedBlocks = blocks.filter(block => {
    const key = block.trim().slice(0, 120).toLowerCase().replace(/\s+/g, ' ');
    if (seenBlocks.has(key)) return false;
    seenBlocks.add(key);
    return true;
  });
  cleaned = dedupedBlocks.join('\n\n');

  // Split into lines to parse block by block
  const lines = cleaned.split('\n');
  const elements = [];
  
  let i = 0;
  let pIdx = 0;
  
  while (i < lines.length) {
    let line = lines[i].trim();
    
    // Skip empty lines
    if (!line) {
      i++;
      continue;
    }

    // 1. Detect Markdown Table
    if (line.includes('|') && (line.startsWith('|') || lines[i+1]?.includes('|'))) {
      const tableLines = [];
      while (i < lines.length && lines[i].trim().includes('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }
      
      const isTable = tableLines.length >= 2 &&
        tableLines.some(l => /^[\s|:-]+$/.test(l.replace(/\|/g, '').replace(/[-:]/g, '').trim()) || /[-:]{3,}/.test(l));

      if (isTable) {
        const dataRows = tableLines.filter(l => !/^[\s|:-]+$/.test(l.replace(/[^|:-]/g, '').trim()) && !/^[-| :]+$/.test(l));
        const headers = dataRows[0]?.split('|').map(c => c.trim()).filter(c => c);
        const bodyRows = dataRows.slice(1).map(r => r.split('|').map(c => c.trim()).filter(c => c));

        if (headers?.length) {
          elements.push(
            <div key={`table-${pIdx++}`} className="my-3 overflow-x-auto rounded-lg border border-black/5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    {headers.map((h, idx) => (
                      <th key={idx} className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                        {renderInline(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bodyRows.map((row, rIdx) => (
                    <tr key={rIdx} className={rIdx % 2 ? 'bg-gray-50/50' : ''}>
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="px-3 py-2 text-foreground border-t border-black/5">
                          {renderInline(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
          continue;
        }
      }
      // If it failed table validation, fall back to parsing as normal text, but handle that.
      // To simplify, just push it back into the stream (this won't happen for valid tables)
    }

    // 2. Detect Lists
    if (/^\s*[-•*]\s|^\s*\d+[.)]\s/.test(line)) {
      const listItems = [];
      while (i < lines.length && (/^\s*[-•*]\s|^\s*\d+[.)]\s/.test(lines[i].trim()) || (lines[i].trim() && !lines[i].match(/^(#{1,6})\s/)))) {
        if (/^\s*[-•*]\s|^\s*\d+[.)]\s/.test(lines[i].trim())) {
          listItems.push(lines[i].trim().replace(/^\s*[-•*]\s*/, '').replace(/^\s*\d+[.)]\s*/, ''));
        } else if (lines[i].trim()) {
          // Continuation line
          listItems[listItems.length - 1] += ' ' + lines[i].trim();
        }
        i++;
      }
      
      elements.push(
        <ul key={`list-${pIdx++}`} className="space-y-1.5 my-2">
          {listItems.map((item, lIdx) => (
            <li key={lIdx} className="flex items-start gap-2 text-sm leading-relaxed">
              <span className="text-blue-400 mt-1.5 shrink-0">•</span>
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // 3. Detect Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = headingMatch[2];
      
      let headingClasses = "font-semibold text-foreground mt-6 mb-3";
      if (level === 1) headingClasses = "text-xl " + headingClasses;
      else if (level === 2) headingClasses = "text-lg " + headingClasses;
      else headingClasses = "text-base " + headingClasses;

      const Tag = `h${level}`;
      elements.push(
        <Tag key={`h-${pIdx++}`} className={headingClasses}>
          {renderInline(content)}
        </Tag>
      );
      i++;
      continue;
    }

    // 4. Regular Paragraph (accumulate until empty line or special block)
    const paraLines = [];
    while (
      i < lines.length && 
      lines[i].trim() && 
      !lines[i].match(/^(#{1,6})\s/) && 
      !/^\s*[-•*]\s|^\s*\d+[.)]\s/.test(lines[i]) &&
      !lines[i].includes('|')
    ) {
      paraLines.push(lines[i].trim());
      i++;
    }
    
    if (paraLines.length > 0) {
      elements.push(
        <p key={`p-${pIdx++}`} className="text-sm leading-relaxed my-1.5">
          {renderInline(paraLines.join(' '))}
        </p>
      );
    }
  }

  return elements;
}

export function renderInline(text) {
  const parts = [];
  let remaining = String(text);
  let key = 0;

  while (remaining.length > 0) {
    // Match **bold**
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    if (boldMatch) {
      const before = remaining.slice(0, boldMatch.index);
      if (before) parts.push(<span key={key++}>{before}</span>);
      parts.push(<strong key={key++} className="font-semibold text-foreground">{boldMatch[1]}</strong>);
      remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
      continue;
    }
    
    // Match *italic*
    const italicMatch = remaining.match(/\*([^*]+)\*/);
    if (italicMatch && !remaining.startsWith('**')) {
      const before = remaining.slice(0, italicMatch.index);
      if (before) parts.push(<span key={key++}>{before}</span>);
      parts.push(<em key={key++} className="italic">{italicMatch[1]}</em>);
      remaining = remaining.slice(italicMatch.index + italicMatch[0].length);
      continue;
    }
    
    parts.push(<span key={key++}>{remaining}</span>);
    break;
  }
  return parts;
}
