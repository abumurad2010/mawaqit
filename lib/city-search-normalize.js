// Search normalization for the offline cities DB.
//
// Used identically by (a) scripts/build-cities-db.js when building each city's `s`
// index and (b) components/LocationModal.tsx when normalizing the user's query.
// Both sides MUST call the SAME function so `الریاض` (Persian yeh) matches `الرياض`
// (Arabic yeh) in the index. Kept as plain CommonJS so both Node (build script) and
// Metro (bundler for the TS/RN LocationModal import) can consume it without transpile.
'use strict';

// Arabic harakat (tashkeel) — Uu064B..Uu065F and standalone dagger alef Uu0670,
// tatweel Uu0640, superscript alef, small waw. Removed before matching.
const HARAKAT_RE = /[ً-ٰٟـۖ-ۭࣣ-ࣿ]/g;
// Zero-width chars that make Persian/Urdu keyboards insert invisible junk into names.
const ZERO_WIDTH_RE = /[​-‏‪-‮⁠-⁤﻿]/g;

/**
 * Normalize a string for offline city-search matching. Lossy — do not use for display.
 *
 *   ‑ NFKC to collapse compatibility forms (Arabic Presentation Forms → base letters,
 *     halfwidth/fullwidth, ligatures)
 *   ‑ strip harakat and tatweel
 *   ‑ strip zero-width chars (ZWNJ, RLE/LRE marks, BOM)
 *   ‑ unify alef variants (أ إ آ ٱ → ا)
 *   ‑ unify ya  (ى ی ي → ي)  — Arabic yeh chosen; Persian yeh and alef maksura fold in
 *   ‑ unify kaf (ك ک → ك)    — Arabic kaf
 *   ‑ ta marbuta → heh (ة → ه)
 *   ‑ heh variants (ھ ہ ە → ه)
 *   ‑ hamza on waw/ya folded to plain waw/ya  (ؤ → و,  ئ → ي)
 *   ‑ Persian/Urdu digits → ASCII
 *   ‑ lowercase
 */
function normalizeSearchText(s) {
  if (!s) return '';
  s = s.normalize('NFKC');
  s = s.replace(HARAKAT_RE, '');
  s = s.replace(ZERO_WIDTH_RE, '');
  s = s
    .replace(/[أإآٱ]/g, 'ا')  // أ إ آ ٱ → ا
    .replace(/[ىی]/g, 'ي')              // ى ی → ي
    .replace(/ک/g, 'ك')                      // ک → ك
    .replace(/ة/g, 'ه')                      // ة → ه
    .replace(/[ھہۃةە]/g, 'ه') // heh variants → ه
    .replace(/ؤ/g, 'و')                      // ؤ → و
    .replace(/ئ/g, 'ي');                     // ئ → ي
  // Persian digits ۰-۹ (U+06F0..06F9) and Arabic-Indic digits ٠-٩ (U+0660..0669) → ASCII
  s = s.replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06F0));
  s = s.replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660));
  return s.toLowerCase();
}

module.exports = { normalizeSearchText };
