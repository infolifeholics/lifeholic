// Minimal, safe markdown-to-HTML renderer for blog posts.
// Supports: headings (#..###), bold **x**, italic *x* / _x_, links [t](u),
// unordered/ordered lists, blockquotes, paragraphs, horizontal rules.
// Escapes HTML first so user content can't inject markup.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function inline(s: string): string {
  return s
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(/_([^_]+)_/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-foreground underline underline-offset-4">$1</a>');
}

export function renderMarkdown(md: string): string {
  const lines = escapeHtml(md).split(/\r?\n/);
  const out: string[] = [];
  let i = 0;
  let listType: 'ul' | 'ol' | null = null;

  const closeList = () => {
    if (listType) {
      out.push(`</${listType}>`);
      listType = null;
    }
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      closeList();
      i++;
      continue;
    }

    // Headings
    const h = /^(#{1,3})\s+(.*)$/.exec(trimmed);
    if (h) {
      closeList();
      const level = h[1].length;
      out.push(`<h${level} class="font-display font-medium tracking-tight text-foreground mt-10 mb-4 ${level === 1 ? 'text-3xl sm:text-4xl' : level === 2 ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'}">${inline(h[2])}</h${level}>`);
      i++;
      continue;
    }

    // HR
    if (/^---+$/.test(trimmed)) {
      closeList();
      out.push('<hr class="my-10 border-border/60" />');
      i++;
      continue;
    }

    // Blockquote
    if (/^&gt;\s?/.test(trimmed)) {
      closeList();
      const quote = trimmed.replace(/^&gt;\s?/, '');
      out.push(`<blockquote class="my-6 border-l-2 border-gold/60 pl-5 font-display text-xl italic text-foreground">${inline(quote)}</blockquote>`);
      i++;
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(trimmed)) {
      if (listType !== 'ol') {
        closeList();
        out.push('<ol class="my-6 list-decimal space-y-2 pl-6 text-foreground">');
        listType = 'ol';
      }
      out.push(`<li class="leading-relaxed">${inline(trimmed.replace(/^\d+\.\s+/, ''))}</li>`);
      i++;
      continue;
    }

    // Unordered list
    if (/^[-*]\s+/.test(trimmed)) {
      if (listType !== 'ul') {
        closeList();
        out.push('<ul class="my-6 list-disc space-y-2 pl-6 text-foreground">');
        listType = 'ul';
      }
      out.push(`<li class="leading-relaxed">${inline(trimmed.replace(/^[-*]\s+/, ''))}</li>`);
      i++;
      continue;
    }

    // Paragraph
    closeList();
    out.push(`<p class="my-5 text-pretty leading-relaxed text-muted-foreground">${inline(trimmed)}</p>`);
    i++;
  }
  closeList();
  return out.join('\n');
}

/**
 * Smart formatter for workshop descriptions.
 * - Preserves existing HTML content as-is (if HTML tags like <p>, <ul>, <li>, <h3> exist).
 * - For plain text / Markdown-like input:
 *   - Safely escapes HTML special characters to prevent XSS.
 *   - Converts headings (#, ##, ###, ####).
 *   - Converts bullet lists (*, -, •).
 *   - Converts numbered lists (1., 2., etc.).
 *   - Converts **bold** and *italic* emphasis.
 *   - Wraps text paragraphs in <p> tags with proper spacing.
 */
export function formatWorkshopDescription(input: string): string {
  if (!input) return '';

  // 1. If content contains actual HTML tags, preserve as trusted HTML
  const hasHtmlTags = /<\/?(p|div|ul|ol|li|h[1-6]|br|blockquote|strong|em|span|a)\b[^>]*>/i.test(input);
  if (hasHtmlTags) {
    return input;
  }

  // 2. Escape HTML special characters for safety before parsing plain text
  const escapeText = (s: string): string => {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  const inlineFormat = (s: string): string => {
    return escapeText(s)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
      .replace(/_([^_]+)_/g, '<em>$1</em>');
  };

  const lines = input.split(/\r?\n/);
  const out: string[] = [];
  let inList: 'ul' | 'ol' | null = null;

  const closeList = () => {
    if (inList) {
      out.push(inList === 'ul' ? '</ul>' : '</ol>');
      inList = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      closeList();
      continue;
    }

    // Unordered list item: starts with *, -, or •
    const ulMatch = /^[*-•]\s+(.*)$/.exec(trimmed);
    if (ulMatch) {
      if (inList !== 'ul') {
        closeList();
        out.push('<ul>');
        inList = 'ul';
      }
      out.push(`<li>${inlineFormat(ulMatch[1])}</li>`);
      continue;
    }

    // Ordered list item: starts with 1., 2., 1), 2)
    const olMatch = /^\d+[\.\)]\s+(.*)$/.exec(trimmed);
    if (olMatch) {
      if (inList !== 'ol') {
        closeList();
        out.push('<ol>');
        inList = 'ol';
      }
      out.push(`<li>${inlineFormat(olMatch[1])}</li>`);
      continue;
    }

    closeList();

    // Headings: starts with #, ##, ###, or ####
    const hMatch = /^(#{1,4})\s+(.*)$/.exec(trimmed);
    if (hMatch) {
      const level = hMatch[1].length;
      out.push(`<h${level}>${inlineFormat(hMatch[2])}</h${level}>`);
      continue;
    }

    // Paragraph
    out.push(`<p>${inlineFormat(trimmed)}</p>`);
  }

  closeList();
  return out.join('\n');
}

