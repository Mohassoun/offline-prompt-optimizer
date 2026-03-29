import { IntentStructure } from '../core/types';

const ACTION_PATTERNS: { pattern: RegExp; action: string }[] = [
  { pattern: /\b(?:please\s+)?refactor\b/i, action: 'refactor' },
  { pattern: /\b(?:please\s+)?fix\b/i, action: 'fix' },
  { pattern: /\b(?:please\s+)?add\b/i, action: 'add' },
  { pattern: /\b(?:please\s+)?create\b/i, action: 'create' },
  { pattern: /\b(?:please\s+)?update\b/i, action: 'update' },
  { pattern: /\b(?:please\s+)?implement\b/i, action: 'implement' },
  { pattern: /\b(?:please\s+)?write\b/i, action: 'write' },
  { pattern: /\b(?:please\s+)?review\b/i, action: 'review' },
  { pattern: /\b(?:please\s+)?optimize\b/i, action: 'optimize' },
  { pattern: /\b(?:please\s+)?explain\b/i, action: 'explain' },
  { pattern: /\b(?:please\s+)?debug\b/i, action: 'debug' },
  { pattern: /\b(?:please\s+)?test\b/i, action: 'test' },
  { pattern: /\b(?:please\s+)?remove\b/i, action: 'remove' },
  { pattern: /\b(?:please\s+)?migrate\b/i, action: 'migrate' },
  { pattern: /\b(?:please\s+)?convert\b/i, action: 'convert' },
];

const CONSTRAINT_PATTERNS: RegExp[] = [
  /don'?t\s+(?:add|change|modify|remove|break|touch)\s+[^.,;]+/gi,
  /do\s+not\s+(?:add|change|modify|remove|break|touch)\s+[^.,;]+/gi,
  /(?:keep|preserve|maintain)\s+[^.,;]+/gi,
  /no\s+new\s+\w+/gi,
  /without\s+(?:changing|modifying|breaking|adding)\s+[^.,;]+/gi,
  /must\s+(?:not\s+)?[^.,;]+/gi,
  /should\s+(?:not\s+)?[^.,;]+/gi,
  /(?:backward[s]?[\s-]?compat\w*)/gi,
];

const RESPONSE_STYLE_PATTERNS: { pattern: RegExp; style: string }[] = [
  { pattern: /explain\s+(?:before|first|then)\s+(?:giving\s+)?(?:the\s+)?code/i, style: 'explain before code' },
  { pattern: /step[- ]by[- ]step/i, style: 'step-by-step' },
  { pattern: /(?:show|give|provide)\s+(?:only\s+)?(?:the\s+)?(?:final\s+)?code/i, style: 'code only' },
  { pattern: /(?:add|include)\s+(?:inline\s+)?comments/i, style: 'include comments' },
  { pattern: /(?:minimal|minimum)\s+(?:changes?|edits?|output)/i, style: 'minimal output' },
  { pattern: /(?:full|complete|entire)\s+(?:file|implementation|solution)/i, style: 'full output' },
];

export function extractIntent(text: string): IntentStructure {
  const action = extractAction(text);
  const target = extractTarget(text, action);
  const constraints = extractConstraints(text);
  const responseStyle = extractResponseStyle(text);

  return {
    action,
    target,
    constraints,
    responseStyle,
    rawText: text,
  };
}

function extractAction(text: string): string {
  for (const { pattern, action } of ACTION_PATTERNS) {
    if (pattern.test(text)) {
      return action;
    }
  }
  return 'process';
}

function extractTarget(text: string, action: string): string {
  const patterns = [
    new RegExp(`${action}\s+(?:this\s+)?([\w\s]+?)(?:\s+to\s+|\s+for\s+|\s+so\s+|[.,]|$)`, 'i'),
    /this\s+([\w\s]+?)(?:\s+to\s+|\s+for\s+|\s+so\s+|[.,]|$)/i,
    /the\s+([\w\s]+?)(?:\s+to\s+|\s+for\s+|\s+so\s+|[.,]|$)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1].trim().slice(0, 50);
    }
  }

  return 'code';
}

function extractConstraints(text: string): string[] {
  const found: string[] = [];
  for (const pattern of CONSTRAINT_PATTERNS) {
    const re = new RegExp(pattern.source, pattern.flags);
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      const c = match[0].trim();
      if (c.length > 5 && !found.includes(c)) {
        found.push(c);
      }
    }
  }
  return found;
}

function extractResponseStyle(text: string): string[] {
  const found: string[] = [];
  for (const { pattern, style } of RESPONSE_STYLE_PATTERNS) {
    if (pattern.test(text)) {
      found.push(style);
    }
  }
  return found;
}
