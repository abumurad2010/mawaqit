/**
 * On-demand loader for the QPC V2 per-page Mushaf fonts.
 *
 * The 604 page fonts are NOT registered at startup via _layout.tsx's
 * useFonts (that would push the 200 MB of TTFs into the cold-start
 * font pipeline). Instead the reader calls loadPageFont(page) as it
 * mounts a page, and prefetches page±1 in the background.
 *
 * Each font family is named `qcf-v2-p{page}` and corresponds to
 * QCF_V2_FONT_REQUIRES[page] from assets/fonts/qcf-v2-map.ts.
 */
import * as Font from 'expo-font';
import { QCF_V2_FONT_FAMILY, QCF_V2_FONT_REQUIRES } from '@/assets/fonts/qcf-v2-map';

/** Pages whose font has been loaded (or is currently loading) at least
 *  once. We never unload — once registered with expo-font, the family
 *  stays available for the rest of the session. */
const loaded = new Set<number>();
/** Per-page in-flight Promise so concurrent calls de-duplicate. */
const inflight = new Map<number, Promise<void>>();

/** Load the page-N font on demand. No-op if already loaded.
 *  Returns a Promise that resolves once the font is registered. */
export function loadPageFont(page: number): Promise<void> {
  if (page < 1 || page > 604) return Promise.resolve();
  if (loaded.has(page)) return Promise.resolve();
  const existing = inflight.get(page);
  if (existing) return existing;

  const source = QCF_V2_FONT_REQUIRES[page];
  if (!source) return Promise.resolve();

  const p = Font.loadAsync({ [QCF_V2_FONT_FAMILY(page)]: source })
    .then(() => {
      loaded.add(page);
      inflight.delete(page);
    })
    .catch((err) => {
      inflight.delete(page);
      // eslint-disable-next-line no-console
      console.warn('[qcf] failed to load page font', page, err);
    });

  inflight.set(page, p);
  return p;
}

/** Returns true if the page font is already registered. Used by the
 *  reader to decide whether to render glyphs or a placeholder. */
export function isPageFontLoaded(page: number): boolean {
  return loaded.has(page);
}

/** Prefetch the neighbours of `page` (page-1 and page+1) in the
 *  background. Safe to call repeatedly; loadPageFont de-dupes. */
export function prefetchAdjacentFonts(page: number): void {
  if (page > 1) void loadPageFont(page - 1);
  if (page < 604) void loadPageFont(page + 1);
}
