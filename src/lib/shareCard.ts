export const SHARE_CARD_WIDTH = 1080;
export const SHARE_CARD_HEIGHT = 1920;
export const SHARE_CARD_PIXEL_RATIO = 2;

export const SHARE_CARD_BRAND_NAME = 'UYAN.chat';
export const SHARE_CARD_BRAND_TAGLINE = 'пространство тёплых мыслей';

export type ShareCardFontVariant = 'lg' | 'md' | 'sm' | 'xs';

const FONT_BREAKPOINTS: Array<{ limit: number; variant: ShareCardFontVariant }> = [
  { limit: 80, variant: 'lg' },
  { limit: 160, variant: 'md' },
  { limit: 220, variant: 'sm' },
];

/**
 * Picks an appropriate font variant for the share card based on the length of the text.
 * The thresholds are tuned for a 1080 × 1920 canvas so that the copy stays readable
 * and fits into the safe zone even after export.
 */
export function pickFontVariant(text: string): ShareCardFontVariant {
  const length = text.trim().length;
  for (const breakpoint of FONT_BREAKPOINTS) {
    if (length <= breakpoint.limit) {
      return breakpoint.variant;
    }
  }
  return 'xs';
}

export const RESPONSE_LENGTH_WARNING_THRESHOLD = 220;
