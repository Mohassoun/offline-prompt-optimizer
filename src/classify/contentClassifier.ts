import { ContentType } from '../core/types';

export function classifyContent(text: string): ContentType {
  const lower = text.toLowerCase();

  const hasFencedCode = /```[\s\S]*?```/.test(text);
  const hasInlineCode = /`[^`]+`/.test(text);
  const codeKeywordCount = countCodeKeywords(text);

  if (isJson(text)) {
    return 'json';
  }

  if (isGitDiff(text)) {
    return 'diff';
  }

  if (isLogs(text)) {
    return 'logs';
  }

  if (hasFencedCode) {
    const proseChars = text.replace(/```[\s\S]*?```/g, '').trim();
    if (proseChars.length > 100) {
      return 'mixed';
    }
    return 'code';
  }

  if (!hasFencedCode && (hasInlineCode || codeKeywordCount > 0) && looksLikeCode(text)) {
    const wordCount = text.split(/\s+/).length;
    const strongIndicators = (text.match(/[{};=><\[\]]/g) || []).length;
    const hasAssignmentPattern = /\b(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*=/.test(text);
    const hasControlFlowPattern = /\b(?:if|for|while|switch|catch)\s*\(/.test(text);

    if (
      hasInlineCode ||
      hasAssignmentPattern ||
      hasControlFlowPattern ||
      (codeKeywordCount >= 2 && strongIndicators > 0) ||
      strongIndicators > wordCount * 0.12
    ) {
      return 'code';
    }
    return 'mixed';
  }

  if (lower.includes('error:') || lower.includes('warning:') || lower.includes('stack trace')) {
    return 'logs';
  }

  return 'prose';
}

function isJson(text: string): boolean {
  const trimmed = text.trim();
  if (!(trimmed.startsWith('{') || trimmed.startsWith('['))) {
    return false;
  }
  try {
    JSON.parse(trimmed);
    return true;
  } catch {
    return false;
  }
}

function isGitDiff(text: string): boolean {
  return /^(?:diff --git|---|\+\+\+|@@)/m.test(text);
}

function isLogs(text: string): boolean {
  const logPatterns = [
    /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/m,
    /\[(?:ERROR|WARN|INFO|DEBUG|TRACE)\]/,
    /^\s+at \w+\.\w+\s*\(/m,
    /Exception in thread/,
  ];
  return logPatterns.some(p => p.test(text));
}

function looksLikeCode(text: string): boolean {
  return /[{};=><\[\]()]/.test(text);
}

function countCodeKeywords(text: string): number {
  const matches = text.match(
    /\b(function|const|let|var|class|import|export|return|if|else|for|while|async|await)\b/gi
  );
  return matches?.length ?? 0;
}
