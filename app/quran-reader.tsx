/**
 * Quran reader — Madani Mushaf, rendered with the QPC V2 per-page fonts
 * (TEST-10 — Stage 1 of the QCF V2 migration).
 *
 * Layout source: QUL's QPC V2 release. 604 page fonts (p1.ttf..p604.ttf)
 *   each carry only the glyphs for one page; per-word data lives in
 *   assets/mushaf-v2/{001..604}.json — line-grouped, with line_type
 *   (`ayah` | `basmallah` | `surah_name`) and an `is_centered` flag that
 *   tells us whether the line should be centered or justified.
 *
 * Render model:
 *   - Each page = N rows (8 on pages 1-2, 15 on pages 3-604), one row
 *     per layout line.
 *   - Ayah lines: a single <Text> with the page-N font, glyphs joined,
 *     textAlign driven by is_centered (centered on Al-Fatiha and surah
 *     ends; justified everywhere else).
 *   - basmallah lines: centered Bismillah in KFGQPC Hafs (we don't
 *     have a basmallah glyph in the words stream).
 *   - surah_name lines: existing OrnateSurahBanner sized to fill the
 *     line slot. Stage-3 will replace this with the V2 header glyphs.
 *
 * Font loading:
 *   - Page fonts are NOT in startup useFonts. The reader calls
 *     loadPageFont(page) on mount + prefetches page±1.
 *   - While the font is loading the row is rendered transparently so
 *     glyphs don't appear in a fallback typeface, then fade in once
 *     the family is registered.
 *
 * Removed (stage 1 only — stage 2/3 work):
 *   - free-flow justified <Text> / centered-tail hack from TEST-9
 *   - inline JuzSeparator SVG
 *   - per-page fit-to-content loop, off-screen measurement, FIT_CACHE
 *
 * Retained:
 *   - FlatList paging + initialScrollIndex (instant navigation)
 *   - Tap-to-reveal chrome bar
 *   - Decorative oval page-number frame
 *
 * Stage 1 caveat: long-press ayah bookmarking is currently a NO-OP — the
 * QCF render path doesn't yet wire onLongPress through per-word elements.
 * Stage 2 will rebuild bookmarks at the word/ayah level.
 */
import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, Platform, FlatList,
  useWindowDimensions, Animated, ActionSheetIOS, Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import Svg, { Rect, Circle, Ellipse, Path, G } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/contexts/AppContext';
import { t } from '@/constants/i18n';
import {
  SURAH_META,
  getAyahPage,
  getHafsPage,
  getJuzForPage,
  getRubForPage,
  TOTAL_PAGES,
} from '@/lib/quran-api';
import { getQcfPage, type QcfPage, type QcfLine } from '@/assets/mushaf-v2';
import { QCF_V2_FONT_FAMILY } from '@/assets/fonts/qcf-v2-map';
import { loadPageFont, isPageFontLoaded, prefetchAdjacentFonts } from '@/lib/qcf-font-loader';

const FALLBACK_FONT = 'KFGQPCHafs';

const MINI_LABEL_HEIGHT = 26;
const PAGE_OVAL_HEIGHT = 38;
const ICON_BAR_HEIGHT = 44;
const CHROME_FADE_MS = 240;
/** Muted ornament gold, harmonises with both dark and light backgrounds. */
const GOLD_LIGHT = '#A88B5C';
const GOLD_DARK  = '#C9A875';

function toArabicIndic(n: number): string {
  return n.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)]);
}

/* ─────────────────────────────────────────────────────────────────────────
 * OrnateSurahBanner — Madani-style bordered frame with end medallions
 * drawn in react-native-svg, surah title overlaid in calligraphic Arabic.
 * The frame is intentionally muted gold/grey so it reads as decoration
 * rather than chrome.
 * ──────────────────────────────────────────────────────────────────────── */
/** Build an 8-pointed star ("rub el hizb"-style rosette) SVG path centered at (cx, cy)
 *  with outer radius R and inner radius r. Renders as a Path. */
function eightPointStar(cx: number, cy: number, R: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 16; i++) {
    const angle = (Math.PI / 8) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? R : r;
    const x = cx + rad * Math.cos(angle);
    const y = cy + rad * Math.sin(angle);
    pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return `M ${pts[0]} L ${pts.slice(1).join(' L ')} Z`;
}

/** 8-petaled flower outline as a sequence of triangle petals.
 *  Slightly denser visual than the star — works well as the outer ring. */
function petalRing(cx: number, cy: number, R: number, innerR: number): string {
  const out: string[] = [];
  const n = 8;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const a2 = ((i + 0.5) / n) * Math.PI * 2 - Math.PI / 2;
    const a3 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2;
    const p0 = [cx + innerR * Math.cos(a), cy + innerR * Math.sin(a)];
    const tip = [cx + R * Math.cos(a2), cy + R * Math.sin(a2)];
    const p2 = [cx + innerR * Math.cos(a3), cy + innerR * Math.sin(a3)];
    out.push(`M ${p0[0].toFixed(2)},${p0[1].toFixed(2)} L ${tip[0].toFixed(2)},${tip[1].toFixed(2)} L ${p2[0].toFixed(2)},${p2[1].toFixed(2)} Z`);
  }
  return out.join(' ');
}

/** Decorative arabesque rosette: outer 8-petal ring, mid 8-point star, inner ring, centre dot. */
function Rosette({ cx, cy, R, color }: { cx: number; cy: number; R: number; color: string }) {
  const innerR = R * 0.62;
  const starR = R * 0.5;
  const starInner = R * 0.28;
  return (
    <G>
      <Path d={petalRing(cx, cy, R, innerR)} fill={color} fillOpacity={0.18} stroke={color} strokeWidth={0.5} />
      <Circle cx={cx} cy={cy} r={innerR} stroke={color} strokeWidth={0.6} fill="none" />
      <Path d={eightPointStar(cx, cy, starR, starInner)} stroke={color} strokeWidth={0.7} fill={color} fillOpacity={0.35} />
      <Circle cx={cx} cy={cy} r={R * 0.14} fill={color} />
    </G>
  );
}

function OrnateSurahBanner({
  surahNum, color, textColor, width, height,
}: {
  surahNum: number; color: string; textColor: string; width: number; height: number;
}) {
  const meta = SURAH_META[surahNum - 1];
  if (!meta) return null;
  const innerW = width;
  const innerH = height;
  const titleSize = Math.max(16, Math.min(24, innerH * 0.32));
  // Generous medallion: 35% of banner height, but capped so it sits neatly inside.
  const medR = Math.min(innerH * 0.32, 22);
  const medCX = Math.max(medR + 14, innerW * 0.1);
  const cy = innerH / 2;
  // Flourish curve endpoints: from inner edge of each medallion toward the title.
  const flourishStart = medCX + medR + 2;
  const flourishEnd = innerW / 2 - innerW * 0.18;
  const flourishStartR = innerW - flourishStart;
  const flourishEndR = innerW - flourishEnd;
  return (
    <View style={{ width, height, alignItems: 'center', justifyContent: 'center', marginVertical: 6 }}>
      <Svg width={innerW} height={innerH} viewBox={`0 0 ${innerW} ${innerH}`}>
        {/* Outer frame — substantial border with rounded corners */}
        <Rect
          x={6} y={6}
          width={innerW - 12} height={innerH - 12}
          rx={6} ry={6}
          stroke={color} strokeWidth={1.6} fill="none"
        />
        {/* Inner frame — dotted, gives the doubled-edge ornament look */}
        <Rect
          x={13} y={13}
          width={innerW - 26} height={innerH - 26}
          rx={3} ry={3}
          stroke={color} strokeWidth={0.7} fill="none"
          strokeDasharray="2 2"
        />
        {/* Small diamond dots along the inner edge — top + bottom rows */}
        {Array.from({ length: 5 }).map((_, i) => {
          const x = innerW / 2 - 40 + i * 20;
          return (
            <G key={`top-${i}`}>
              <Path d={`M ${x},${20} l 1.6,1.6 l -1.6,1.6 l -1.6,-1.6 Z`} fill={color} />
              <Path d={`M ${x},${innerH - 20} l 1.6,1.6 l -1.6,1.6 l -1.6,-1.6 Z`} fill={color} />
            </G>
          );
        })}
        {/* Left rosette */}
        <Rosette cx={medCX} cy={cy} R={medR} color={color} />
        {/* Right rosette */}
        <Rosette cx={innerW - medCX} cy={cy} R={medR} color={color} />
        {/* Flourishes — gentle s-curves from each rosette toward the title */}
        <Path
          d={`M ${flourishStart},${cy} Q ${(flourishStart + flourishEnd) / 2},${cy - 8} ${flourishEnd},${cy}`}
          stroke={color} strokeWidth={0.7} fill="none"
        />
        <Path
          d={`M ${flourishStart},${cy} Q ${(flourishStart + flourishEnd) / 2},${cy + 8} ${flourishEnd},${cy}`}
          stroke={color} strokeWidth={0.7} fill="none"
        />
        <Path
          d={`M ${flourishStartR},${cy} Q ${(flourishStartR + flourishEndR) / 2},${cy - 8} ${flourishEndR},${cy}`}
          stroke={color} strokeWidth={0.7} fill="none"
        />
        <Path
          d={`M ${flourishStartR},${cy} Q ${(flourishStartR + flourishEndR) / 2},${cy + 8} ${flourishEndR},${cy}`}
          stroke={color} strokeWidth={0.7} fill="none"
        />
      </Svg>
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
        <Text
          style={{
            color: textColor,
            fontFamily: 'Amiri_700Bold',
            fontSize: titleSize,
            textAlign: 'center',
            paddingHorizontal: 4,
          }}
          numberOfLines={1}
          ellipsizeMode="clip"
        >
          {`سُورَة ${meta.arabic}`}
        </Text>
      </View>
    </View>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * PageNumberFrame — bottom-center decorative oval containing Arabic-Indic
 * page number. Renders in muted gold; the digits sit in the middle of the
 * shape.
 * ──────────────────────────────────────────────────────────────────────── */
function PageNumberFrame({
  pageNum, color, width = 90, height = 32,
}: { pageNum: number; color: string; width?: number; height?: number }) {
  const cx = width / 2;
  const cy = height / 2;
  const ovalLeft = 14;
  const ovalRight = width - 14;
  // Almond / vesica-style outer shape — two arcs meeting at sharp points.
  const almond = `M ${ovalLeft},${cy} Q ${cx},${1} ${ovalRight},${cy} Q ${cx},${height - 1} ${ovalLeft},${cy} Z`;
  return (
    <View style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Outer almond */}
        <Path d={almond} stroke={color} strokeWidth={0.9} fill="none" />
        {/* Inner dotted ellipse — sits inside the almond, narrower */}
        <Ellipse cx={cx} cy={cy} rx={(ovalRight - ovalLeft) / 2 - 3} ry={cy - 5}
          stroke={color} strokeWidth={0.5} fill="none" strokeDasharray="1.5 1.5" />
        {/* Left tassel — bead cluster */}
        <Circle cx={ovalLeft - 2} cy={cy} r={1.6} fill={color} />
        <Circle cx={ovalLeft - 6} cy={cy} r={1.1} fill={color} />
        <Circle cx={ovalLeft - 10} cy={cy} r={0.7} fill={color} />
        {/* Right tassel — bead cluster */}
        <Circle cx={ovalRight + 2} cy={cy} r={1.6} fill={color} />
        <Circle cx={ovalRight + 6} cy={cy} r={1.1} fill={color} />
        <Circle cx={ovalRight + 10} cy={cy} r={0.7} fill={color} />
      </Svg>
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color, fontFamily: 'Amiri_700Bold', fontSize: 14, letterSpacing: 0.5 }}>
          {toArabicIndic(pageNum)}
        </Text>
      </View>
    </View>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * MushafPageBody — pure render from a QcfPage. Each line is one row whose
 * height equals `lineSlot`. Ayah lines use the p{N} font; the row anchors
 * the line's natural-width text at the right margin via flex-direction
 * row-reverse + justify-content flex-start. surah_name lines render the
 * existing ornate banner; basmallah lines render a centered KFGQPC Hafs
 * string (Stage 3 will replace both with V2 glyphs).
 * ──────────────────────────────────────────────────────────────────────── */
function MushafPageBody({
  pageNum, pageData, fontReady,
  width, lineSlot, fontSize,
  textColor, ornamentColor,
  onLongPressWord,
  isAyahBookmarked,
  bookmarkColor,
  onLineMeasured,
  isMeasuring,
}: {
  pageNum: number;
  pageData: QcfPage;
  fontReady: boolean;
  width: number;
  lineSlot: number;
  fontSize: number;
  textColor: string;
  ornamentColor: string;
  onLongPressWord: (verseKey: string) => void;
  isAyahBookmarked: (verseKey: string) => boolean;
  bookmarkColor: string;
  onLineMeasured: (idx: number, width: number) => void;
  isMeasuring: boolean;
}) {
  const family = fontReady ? QCF_V2_FONT_FAMILY(pageNum) : FALLBACK_FONT;

  return (
    <>
      {pageData.lines.map((line, idx) => (
        <MushafLineRow
          key={idx}
          lineIdx={idx}
          line={line}
          width={width}
          lineSlot={lineSlot}
          fontSize={fontSize}
          family={family}
          fontReady={fontReady}
          textColor={textColor}
          ornamentColor={ornamentColor}
          onLongPressWord={onLongPressWord}
          isAyahBookmarked={isAyahBookmarked}
          bookmarkColor={bookmarkColor}
          onLineMeasured={onLineMeasured}
          isMeasuring={isMeasuring}
        />
      ))}
    </>
  );
}

function MushafLineRow({
  line, lineIdx, width, lineSlot, fontSize, family, fontReady, textColor, ornamentColor,
  onLongPressWord, isAyahBookmarked, bookmarkColor,
  onLineMeasured, isMeasuring,
}: {
  line: QcfLine;
  lineIdx: number;
  width: number;
  lineSlot: number;
  fontSize: number;
  family: string;
  fontReady: boolean;
  textColor: string;
  ornamentColor: string;
  onLongPressWord: (verseKey: string) => void;
  isAyahBookmarked: (verseKey: string) => boolean;
  bookmarkColor: string;
  onLineMeasured: (idx: number, width: number) => void;
  isMeasuring: boolean;
}) {
  if (line.line_type === 'surah_name') {
    return (
      <View style={{ width: '100%', height: lineSlot }}>
        <OrnateSurahBanner
          surahNum={line.surah_number}
          color={ornamentColor}
          textColor={textColor}
          width={width}
          height={lineSlot}
        />
      </View>
    );
  }

  if (line.line_type === 'basmallah') {
    return (
      <View style={{ width: '100%', height: lineSlot, justifyContent: 'center' }}>
        <Text
          style={{
            color: textColor,
            fontFamily: FALLBACK_FONT,
            fontSize: fontSize * 0.85,
            lineHeight: lineSlot,
            textAlign: 'center',
            writingDirection: 'rtl',
          }}
        >
          بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ
        </Text>
      </View>
    );
  }

  // ayah row — TEST-25R:
  //
  // ANCHORING: The line row is `flexDirection: 'row-reverse'` +
  // `justifyContent: flex-start` (centered for is_centered=1). The Text has
  // NO width:'100%' and NO textAlign — it sizes to its content's natural
  // width and is positioned by the flex parent. With row-reverse, flex-start
  // is the VISUAL RIGHT EDGE, so the Text frame's right edge sits at the row's
  // right edge — meaning the first word's first (rightmost) letter is pinned
  // to the right margin. If naturalWidth > innerWidth the OVERSHOOT extends
  // LEFTWARD past the row's left edge (off the tail side, which is the
  // intended overflow direction); page padding 14px absorbs minor overshoot.
  // The prior `textAlign: 'right'` + `width:'100%'` chain was getting
  // re-interpreted under iOS RTL semantics so that excess spilled off the
  // *right* (clipping the first letters). The flex approach is direction-
  // agnostic: row-reverse's start IS the visual right regardless of
  // I18nManager.isRTL.
  //
  // SINGLE-RUN SHAPING: still a single parent <Text> with nested per-word
  // <Text> children. iOS treats nested Text children as attributed-string
  // sub-ranges of the same CoreText run, so glyph advances are computed
  // for the whole line as one shaped run — no per-word frame rounding,
  // no kasra/diacritic clip on the leftmost ink of any word.
  //
  // MEASUREMENT: onTextLayout fires once with the line's measured natural
  // width; the page reports the max line width back via onLineMeasured to
  // compute a per-page fit-to-content fontSize (cached per page).
  return (
    <View
      style={{
        width: '100%',
        height: lineSlot,
        flexDirection: 'row-reverse',
        justifyContent: line.is_centered ? 'center' : 'flex-start',
        alignItems: 'center',
        overflow: 'visible',
      }}
    >
      <Text
        allowFontScaling={false}
        // TEST-26: per-line auto-shrink safety net. The per-page fit calibration
        // (TEST-25) targets the WIDEST measured line at 98.5% of innerWidth, so
        // most lines render at the calibrated size unchanged. A handful of lines
        // measured at the reference fontSize don't scale linearly to the fitted
        // fontSize (glyph hinting / sub-pixel positioning isn't proportional),
        // and slip past the safety margin — the user saw إِذْ / إِنَّكَ losing
        // the leading إ.
        //
        // maxWidth: width constrains the Text frame so the per-line auto-shrink
        // actually triggers (without a width cap, adjustsFontSizeToFit is a
        // no-op against intrinsic sizing). numberOfLines={1} forbids wrapping.
        // minimumFontScale={0.92} caps the shrink at -8% so an outlier line is
        // visually almost-identical to its neighbours, no jarring small line.
        // Nested <Text> children inherit the scaled fontSize.
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.92}
        onTextLayout={(isMeasuring && fontReady) ? (e) => {
          // Only measure once the page font is actually applied — fallback font
          // widths would skew the fit calibration.
          const w = e.nativeEvent.lines?.[0]?.width;
          if (typeof w === 'number' && w > 0) onLineMeasured(lineIdx, w);
        } : undefined}
        style={{
          maxWidth: width,
          color: textColor,
          fontFamily: family,
          fontSize,
          lineHeight: lineSlot,
          writingDirection: 'rtl',
          opacity: (fontReady && !isMeasuring) ? 1 : 0,
        }}
      >
        {line.words.map((w, idx) => {
          const marked = isAyahBookmarked(w.verse_key);
          return (
            <Text
              key={idx}
              onLongPress={() => onLongPressWord(w.verse_key)}
              style={marked ? { color: bookmarkColor } : undefined}
            >
              {w.text}
            </Text>
          );
        })}
      </Text>
    </View>
  );
}

/* ── One Mushaf page — line-grid render from QPC V2 layout data ──── */
function MushafPageView({
  pageNum, width, height, textColor, ornamentColor, bgColor,
  onTap, onLongPressWord, isAyahBookmarked, bookmarkColor,
}: {
  pageNum: number;
  width: number;
  height: number;
  textColor: string;
  ornamentColor: string;
  bgColor: string;
  onTap: () => void;
  onLongPressWord: (verseKey: string) => void;
  isAyahBookmarked: (verseKey: string) => boolean;
  bookmarkColor: string;
}) {
  const pageData = useMemo(() => getQcfPage(pageNum), [pageNum]);
  // TEST-23: was 10. At the TEST-22 design-ratio fontSize the rightmost glyph
  // of each RTL line is anchored at the content right edge (x = W - horizPad);
  // its ink overshoots its advance box on the right by a few px and got
  // clipped by the page-level overflow:'hidden' (kept for vertical row
  // boundaries). Widening horizontal padding gives both margins symmetric
  // breathing room without changing the divisor — fontSize tracks the new
  // (slightly smaller) innerWidth so the line still fills both margins.
  const horizPad = 14;
  const vertPad = 6;
  const innerWidth = width - horizPad * 2;
  const innerHeight = height - vertPad * 2;

  // Track per-page font readiness. Page font loads on demand; until it
  // resolves the ayah rows render transparently so glyphs never flash
  // in the wrong typeface.
  const [fontReady, setFontReady] = useState(() => isPageFontLoaded(pageNum));
  useEffect(() => {
    let cancelled = false;
    if (!isPageFontLoaded(pageNum)) setFontReady(false);
    loadPageFont(pageNum).then(() => { if (!cancelled) setFontReady(true); });
    prefetchAdjacentFonts(pageNum);
    return () => { cancelled = true; };
  }, [pageNum]);

  const tapGesture = useMemo(
    () => Gesture.Tap()
      .maxDuration(250)
      .onEnd((_, success) => {
        'worklet';
        if (success) runOnJS(onTap)();
      }),
    [onTap]
  );

  // TEST-25R: per-page fit-to-content fontSize, calibrated by measuring the
  // page's widest ayah line at a REFERENCE fontSize and scaling down so the
  // worst line lands at TARGET_FILL_RATIO of innerWidth. The reference uses
  // the QPC V2 design ratio (1:15.4) as a starting probe; the measured fit
  // is cached per (page, innerWidth) so subsequent visits skip measurement.
  //
  // Why per-page: glyph advances vary enough across pages that a single
  // global divisor either clips the densest pages (49/207/254 with 10-11
  // words/line) or leaves the lightest pages short. Measuring the page's
  // own widest line eliminates the guess.
  //
  // Why TARGET_FILL_RATIO = 0.985: leaves a ~1.5% safety margin against
  // sub-pixel glyph-ink overshoot past the advance box (the TEST-23/25
  // right-edge clip cause), without giving back so much that a visible
  // left band returns.
  const REFERENCE_DIVISOR = 15.4;
  const TARGET_FILL_RATIO = 0.985;
  const referenceFontSize = innerWidth / REFERENCE_DIVISOR;

  const fitCacheKey = `${pageNum}-${Math.round(innerWidth)}`;
  const [fitFontSize, setFitFontSize] = useState<number | null>(
    () => PAGE_FONT_SIZE_CACHE.get(fitCacheKey) ?? null
  );
  const measuredWidthsRef = useRef<Record<number, number>>({});
  useEffect(() => {
    // Reset cache lookup when key changes (orientation, page swap)
    measuredWidthsRef.current = {};
    setFitFontSize(PAGE_FONT_SIZE_CACHE.get(fitCacheKey) ?? null);
  }, [fitCacheKey]);

  const handleLineMeasured = useCallback((idx: number, w: number) => {
    if (fitFontSize !== null) return;
    if (!pageData) return;
    measuredWidthsRef.current[idx] = w;
    const ayahIdxs: number[] = [];
    pageData.lines.forEach((l, i) => {
      if (l.line_type === 'ayah' && !l.is_centered) ayahIdxs.push(i);
    });
    if (ayahIdxs.length === 0) {
      // No ayah lines on this page (e.g. an early surah-name-only page) —
      // skip fit and use reference.
      PAGE_FONT_SIZE_CACHE.set(fitCacheKey, referenceFontSize);
      setFitFontSize(referenceFontSize);
      return;
    }
    const allMeasured = ayahIdxs.every(i => typeof measuredWidthsRef.current[i] === 'number');
    if (!allMeasured) return;
    const maxW = Math.max(...ayahIdxs.map(i => measuredWidthsRef.current[i]));
    const target = innerWidth * TARGET_FILL_RATIO;
    const newSize = maxW > 0 && maxW > target
      ? referenceFontSize * (target / maxW)
      : referenceFontSize;
    PAGE_FONT_SIZE_CACHE.set(fitCacheKey, newSize);
    setFitFontSize(newSize);
  }, [fitFontSize, pageData, innerWidth, referenceFontSize, fitCacheKey]);

  if (!pageData) {
    return <View style={{ width, height, backgroundColor: bgColor }} />;
  }

  const lineCount = pageData.lines.length;
  const lineSlot = innerHeight / lineCount;
  const isMeasuring = fitFontSize === null;
  const fontSize = fitFontSize ?? referenceFontSize;

  return (
    <GestureDetector gesture={tapGesture}>
      <View
        style={{
          width, height, backgroundColor: bgColor,
          paddingHorizontal: horizPad, paddingVertical: vertPad,
          overflow: 'hidden',
        }}
      >
        <View style={{ flex: 1 }}>
          <MushafPageBody
            pageNum={pageNum}
            pageData={pageData}
            fontReady={fontReady}
            width={innerWidth}
            lineSlot={lineSlot}
            fontSize={fontSize}
            textColor={textColor}
            ornamentColor={ornamentColor}
            onLongPressWord={onLongPressWord}
            isAyahBookmarked={isAyahBookmarked}
            bookmarkColor={bookmarkColor}
            onLineMeasured={handleLineMeasured}
            isMeasuring={isMeasuring}
          />
        </View>
      </View>
    </GestureDetector>
  );
}

/** Cache of measured fit-to-content fontSize per (pageNum, innerWidth). Avoids
 *  re-measuring on revisit. */
const PAGE_FONT_SIZE_CACHE = new Map<string, number>();

/* ── Reader screen ───────────────────────────────────────────────── */
export default function QuranReaderScreen() {
  const params = useLocalSearchParams<{ page?: string; highlightSurah?: string; highlightAyah?: string; timestamp?: string }>();
  const initialPage = Math.max(1, Math.min(TOTAL_PAGES, parseInt(params.page ?? '1', 10)));

  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const {
    isDark, lang, setLastReadPage, setLastReadSurah, colors,
    bookmarks, addBookmark, isBookmarked,
  } = useApp();
  const C = colors;
  const tr = t(lang);
  const isAr = lang === 'ar';
  const ornamentColor = isDark ? GOLD_DARK : GOLD_LIGHT;

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  const [pageNum, setPageNum] = useState(initialPage);
  const [chromeVisible, setChromeVisible] = useState(false);
  const chromeAnim = useRef(new Animated.Value(0)).current;

  const listRef = useRef<FlatList>(null);
  const userScrolling = useRef(false);

  useEffect(() => {
    Animated.timing(chromeAnim, {
      toValue: chromeVisible ? 1 : 0,
      duration: CHROME_FADE_MS,
      useNativeDriver: true,
    }).start();
  }, [chromeVisible, chromeAnim]);

  // Arabic: reverse the data so a finger-left drag decreases the index = next page.
  const pageFromIdx = useCallback(
    (idx: number) => (isAr ? (TOTAL_PAGES - idx) : (idx + 1)),
    [isAr]
  );
  const idxFromPage = useCallback(
    (page: number) => (isAr ? (TOTAL_PAGES - page) : (page - 1)),
    [isAr]
  );

  useEffect(() => {
    // STAGE 1: highlight-ayah pin removed (per-line render doesn't yet
    // support per-ayah colorization). Page-jump on navigation still
    // honored so search / bookmark links land on the correct page.
    if (!params.highlightSurah || !params.highlightAyah) return;
    const surah = parseInt(params.highlightSurah, 10);
    const ayah = parseInt(params.highlightAyah, 10);
    const newPage = getAyahPage(surah, ayah);
    if (newPage !== pageNum) {
      setPageNum(newPage);
      listRef.current?.scrollToIndex({ index: idxFromPage(newPage), animated: false });
    }
  }, [params.highlightSurah, params.highlightAyah, params.timestamp, idxFromPage]);

  useEffect(() => {
    setLastReadPage(pageNum);
    const ayat = getHafsPage(pageNum);
    if (ayat[0]) setLastReadSurah(ayat[0].surahNum);
  }, [pageNum]);

  // Layout: top safe + MINI_LABEL row + page + PAGE_OVAL row + bottom safe.
  // Chrome icon bar overlays the MINI_LABEL row when revealed (no layout shift).
  const pageHeight = Math.max(360, H - topInset - bottomInset - MINI_LABEL_HEIGHT - PAGE_OVAL_HEIGHT);
  const pageWidth = W;

  // Current-page metadata
  const currentAyat = getHafsPage(pageNum);
  const displaySurah = currentAyat[0]?.surahNum ?? 1;
  const displayMeta = SURAH_META[displaySurah - 1];
  const surahLabel = displayMeta ? (isAr ? displayMeta.arabic : displayMeta.transliteration) : '';
  // Juz from the page's first ayah; rub-el-hizb (1/4 granularity) from the
  // derived 240-entry table — count is 60 hizb × 4 quarters. Header shows the
  // rub active at the TOP of the page, with the quarter as a FRACTION
  // (١/٤ / ١/٢ / ٣/٤) rather than a spelled-out Arabic word. Q1 (hizb start)
  // renders without a fraction prefix.
  const juzNum = currentAyat[0]?.juz ?? getJuzForPage(pageNum);
  const rub = getRubForPage(pageNum);
  const fractionAr = ['', '١/٤ ', '١/٢ ', '٣/٤ '][rub.quarter - 1];
  const fractionEn = ['', '1/4 ', '1/2 ', '3/4 '][rub.quarter - 1];
  const juzLabel = isAr
    ? `جزء ${toArabicIndic(juzNum)} · ${fractionAr}الحزب ${toArabicIndic(rub.hizb)}`
    : `${tr.juz} ${juzNum} · ${fractionEn}${tr.hizb} ${rub.hizb}`;

  const handleTap = useCallback(() => {
    setChromeVisible(v => !v);
  }, []);

  // TEST-27: long-press → two-option bookmark sheet (ayah + rub-el-hizb).
  // - The 'hizb' option is replaced by 'rub' (1/4 granularity from the
  //   240-quarter table used by the header). Always saves at the rub the
  //   pressed ayah falls in; jump target is the rub's start page.
  // - The juz option is removed entirely; existing juz bookmarks remain
  //   functional from the bookmarks list (legacy data preserved).
  // - No checkmark prefixes, no toggle UX. Selecting always saves (the
  //   AppContext addBookmark de-duplicates by key, so re-selecting an
  //   identical bookmark is a no-op).
  const saveBookmark = useCallback((surah: number, ayah: number, scope: 'ayah' | 'rub') => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const meta = SURAH_META[surah - 1];
    const ayahPage = getAyahPage(surah, ayah);
    if (scope === 'ayah') {
      addBookmark({
        scope: 'ayah',
        surahNumber: surah,
        surahName: meta?.transliteration ?? '',
        ayahNumber: ayah,
        ayahText: '',
        page: ayahPage,
        timestamp: Date.now(),
        type: 'mushaf',
      });
      return;
    }
    // 'rub' — derive the (hizb, quarter, start page) from the same 240-quarter
    // table as the header. getRubForPage takes a PAGE and returns the rub
    // active at that page's top; for an arbitrary ayah we want the rub the
    // ayah itself sits in, so pass the ayah's page.
    const rub = getRubForPage(ayahPage);
    addBookmark({
      scope: 'rub',
      surahNumber: surah,
      surahName: meta?.transliteration ?? '',
      ayahNumber: ayah,
      ayahText: '',
      hizb: rub.hizb,
      quarter: rub.quarter,
      page: rub.page,
      timestamp: Date.now(),
      type: 'mushaf',
    });
  }, [addBookmark]);

  const handleLongPressWord = useCallback((verseKey: string) => {
    const [s, a] = verseKey.split(':').map(n => parseInt(n, 10));
    if (!s || !a) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const meta = SURAH_META[s - 1];
    const ayahPage = getAyahPage(s, a);
    const rub = getRubForPage(ayahPage);
    const fractionAr2 = ['', '١/٤ ', '١/٢ ', '٣/٤ '][rub.quarter - 1];
    const fractionEn2 = ['', '1/4 ', '1/2 ', '3/4 '][rub.quarter - 1];
    const headerLabel = isAr
      ? `${meta?.arabic ?? ''} — آية ${toArabicIndic(a)} · ${fractionAr2}الحزب ${toArabicIndic(rub.hizb)}`
      : `${meta?.transliteration ?? ''} — ${tr.ayah ?? 'Ayah'} ${a} · ${fractionEn2}${tr.hizb} ${rub.hizb}`;
    const ayahLabel = tr.bookmark_save_ayah ?? 'Bookmark this ayah';
    const rubLabel  = tr.bookmark_save_rub  ?? 'Bookmark this hizb quarter';
    const cancelLabel = tr.btn_cancel ?? 'Cancel';
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: tr.bookmark_choose_scope ?? 'Choose what to bookmark',
          message: headerLabel,
          options: [ayahLabel, rubLabel, cancelLabel],
          cancelButtonIndex: 2,
        },
        (idx) => {
          if (idx === 0) saveBookmark(s, a, 'ayah');
          else if (idx === 1) saveBookmark(s, a, 'rub');
        }
      );
      return;
    }
    Alert.alert(
      tr.bookmark_choose_scope ?? 'Choose what to bookmark',
      headerLabel,
      [
        { text: ayahLabel, onPress: () => saveBookmark(s, a, 'ayah') },
        { text: rubLabel,  onPress: () => saveBookmark(s, a, 'rub') },
        { text: cancelLabel, style: 'cancel' },
      ]
    );
  }, [tr, isAr, saveBookmark]);

  // Bookmarked-ayah tint: subtle. Resolves verseKey → bool via the existing
  // AppContext key API; the per-word render below colors marked words.
  const isAyahBookmarked = useCallback((verseKey: string) => {
    const [s, a] = verseKey.split(':').map(n => parseInt(n, 10));
    if (!s || !a) return false;
    return isBookmarked({ scope: 'ayah', surah: s, ayah: a });
  }, [isBookmarked, bookmarks]);
  const bookmarkColor = C.gold ?? '#E0A22A';

  const renderItem = useCallback(({ item }: { item: number }) => (
    // key={item} forces a fresh MushafPageView per page identity, so a
    // recycled FlatList child never restores with the previous page's
    // font-ready state.
    <MushafPageView
      key={item}
      pageNum={item}
      width={pageWidth}
      height={pageHeight}
      textColor={C.text}
      ornamentColor={ornamentColor}
      bgColor={isDark ? '#0D0D0D' : '#FAF6EE'}
      onTap={handleTap}
      onLongPressWord={handleLongPressWord}
      isAyahBookmarked={isAyahBookmarked}
      bookmarkColor={bookmarkColor}
    />
  ), [pageWidth, pageHeight, C, isDark, ornamentColor, handleTap, handleLongPressWord, isAyahBookmarked, bookmarkColor]);

  const data = useMemo(() => {
    const arr = Array.from({ length: TOTAL_PAGES }, (_, i) => i + 1);
    return isAr ? arr.reverse() : arr;
  }, [isAr]);

  const onMomentumEnd = useCallback((e: any) => {
    if (!userScrolling.current) return;
    const idx = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
    const newPage = pageFromIdx(idx);
    if (newPage !== pageNum && newPage >= 1 && newPage <= TOTAL_PAGES) {
      setPageNum(newPage);
    }
    userScrolling.current = false;
  }, [pageNum, pageWidth, pageFromIdx]);

  const bgColor = isDark ? '#0D0D0D' : '#FAF6EE';
  const iconBarTranslate = chromeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-(ICON_BAR_HEIGHT + 8), 0],
  });

  return (
    <View style={[styles.root, { backgroundColor: bgColor }]}>
      {/* Mini-label strip — always visible */}
      <View style={{
        height: topInset + MINI_LABEL_HEIGHT,
        paddingTop: topInset + 2,
        paddingHorizontal: 16,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Text style={{ color: C.textMuted, fontFamily: isAr ? 'Amiri_400Regular' : 'Inter_400Regular', fontSize: 11, letterSpacing: 0.3 }} numberOfLines={1}>
          {surahLabel}
        </Text>
        <Text style={{ color: C.textMuted, fontFamily: isAr ? 'Amiri_400Regular' : 'Inter_400Regular', fontSize: 11, letterSpacing: 0.3 }} numberOfLines={1}>
          {juzLabel}
        </Text>
      </View>

      {/* Pages */}
      <FlatList
        ref={listRef}
        data={data}
        keyExtractor={(p) => String(p)}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        initialScrollIndex={idxFromPage(initialPage)}
        getItemLayout={(_, i) => ({ length: pageWidth, offset: pageWidth * i, index: i })}
        onScrollToIndexFailed={() => {}}
        onScrollBeginDrag={() => { userScrolling.current = true; }}
        onMomentumScrollEnd={onMomentumEnd}
        showsHorizontalScrollIndicator={false}
        windowSize={3}
        maxToRenderPerBatch={2}
        removeClippedSubviews
      />

      {/* Decorative page-number oval — bottom centre, always visible */}
      <View style={{
        height: PAGE_OVAL_HEIGHT + bottomInset,
        paddingBottom: bottomInset + 2,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <PageNumberFrame pageNum={pageNum} color={ornamentColor} />
      </View>

      {/* Full chrome icon bar — slides down from above on tap */}
      <Animated.View
        pointerEvents={chromeVisible ? 'auto' : 'none'}
        style={[styles.iconBar, {
          paddingTop: topInset + 2,
          height: topInset + ICON_BAR_HEIGHT,
          backgroundColor: bgColor,
          borderBottomColor: C.separator,
          opacity: chromeAnim,
          transform: [{ translateY: iconBarTranslate }],
        }]}
      >
        <View style={styles.iconBarRow}>
          <View style={styles.iconGroup}>
            <Pressable
              // TEST-28: back ALWAYS goes to the Table of Contents, never
              // history-back. Uses router.replace so the reader is swapped
              // for the ToC in the stack (no reader↔ToC depth buildup if
              // the user toggles between them). The ToC's own back action
              // exits to the Quran tab.
              onPress={() => router.replace('/quran-toc')}
              style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.backgroundCard, opacity: pressed ? 0.7 : 1 }]}
            >
              <Ionicons name="chevron-back" size={18} color={C.tint} />
            </Pressable>
            <Pressable
              onPress={() => router.replace('/quran-toc')}
              style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.backgroundCard, opacity: pressed ? 0.7 : 1 }]}
            >
              <Ionicons name="list" size={18} color={C.textSecond} />
            </Pressable>
            <Pressable
              onPress={() => router.push({ pathname: '/search', params: { mode: 'mushaf' } })}
              style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.backgroundCard, opacity: pressed ? 0.7 : 1 }]}
            >
              <Ionicons name="search" size={16} color={C.textSecond} />
            </Pressable>
          </View>
          <View style={styles.iconGroup}>
            <Pressable
              onPress={() => router.push('/bookmarks')}
              style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.backgroundCard, opacity: pressed ? 0.7 : 1 }]}
            >
              <Ionicons name="bookmark-outline" size={16} color={C.textSecond} />
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  iconBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
  },
  iconBarRow: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  iconGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
