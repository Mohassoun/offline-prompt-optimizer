import { CompressionMode, ProtectedRange } from '../../core/types';
import { applyWithProtection } from '../../preprocess/protectRanges';
import { canonicalize } from '../../intent/canonicalize';

export function compressProse(
  text: string,
  mode: CompressionMode,
  protectedRanges: ProtectedRange[]
): string {
  let result = text;

  result = applyWithProtection(result, protectedRanges, segment => {
    return canonicalize(segment);
  });

  result = applyWithProtection(result, protectedRanges, segment => {
    return segment.replace(/\)(?=[A-Za-z])/g, ') ');
  });

  if (mode === 'balanced' || mode === 'aggressive') {
    result = applyWithProtection(result, protectedRanges, segment => {
      return segment
        .replace(/\bIt should be noted that\b/gi, 'Note:')
        .replace(/\bAs mentioned (?:above|before|earlier)\b/gi, 'Previously,')
        .replace(/\bAs stated (?:above|before|earlier)\b/gi, 'As stated,')
        .replace(/\bThe reason (?:why\s+)?(?:is|for this) is (?:that\s+)?/gi, 'Because ')
        .replace(/\bIn (?:the\s+)?(?:above|following|given) (?:code|example|snippet)\b/gi, 'Here');
    });
  }

  if (mode === 'aggressive') {
    result = applyWithProtection(result, protectedRanges, segment => {
      return segment
        .replace(/\bCurrently,?\s*/gi, '')
        .replace(/\bBasically,?\s*/gi, '')
        .replace(/\bEssentially,?\s*/gi, '')
        .replace(/\bFundamentally,?\s*/gi, '')
        .replace(/\bObviously,?\s*/gi, '')
        .replace(/\bClearly,?\s*/gi, '')
        .replace(/\bSo,?\s*/gi, '')
        .replace(/\bWell,?\s*/gi, '')
        .replace(/\bYou know,?\s*/gi, '')
        .replace(/\bRight,?\s*/gi, '')
        .replace(/\bActually,?\s*/gi, '')
        .replace(/\bLiterally,?\s*/gi, '');
    });
  }

  return result.replace(/\s{2,}/g, ' ').trim();
}
