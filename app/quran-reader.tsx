/**
 * Quran reader — Madani Mushaf, text-rendered with the official KFGQPC Hafs
 * Uthmanic Script font (v18).
 *
 * Font: King Fahd Glorious Quran Printing Complex, https://qurancomplex.gov.sa/en/techquran/dev/
 *   Font files distributed via github.com/thetruetruth/quran-data-kfgqpc.
 *   License: KFGQPC permits free use for Quranic rendering.
 *
 * Page data: hafsData_v18.json from the same upstream repo (MIT-licensed).
 *
 * Polish goals (Ayah app visual quality):
 *   - vertically distributed page content (justifyContent: space-evenly)
 *   - ornate bordered surah banner with end medallions (drawn in SVG)
 *   - subtle minimal-chrome default: tiny surah label top-left, juz label
 *     top-right, decorative oval page number at the bottom
 *   - TAP page → reveal a full chrome bar (back / ToC / search / bookmark);
 *     TAP again hides it.
 *   - LONG-PRESS ayah → ayah-precise bookmark.
 *   - SWIPE → page navigation (RTL-aware via the reversed data array).
 *
 * Fit policy (NEVER drop content):
 *   The reader renders MushafPageBody twice — once invisibly off-screen for
 *   intrinsic-height measurement, once visibly inside a space-evenly flex
 *   container for distribution. If measured > available, shrink fontSize by
 *   FONT_STEP and re-render. Floor at MIN_FONT; if still overflowing, allow
 *   visual overflow rather than truncating — every ayah, banner, and
 *   bismillah stays mounted.
 */
import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, Platform, Alert, FlatList, ActionSheetIOS,
  useWindowDimensions, Animated, type LayoutChangeEvent,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import Svg, { Rect, Circle, Ellipse, Path, G } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/contexts/AppContext';
import { t } from '@/constants/i18n';
import {
  SURAH_META,
  getAyahPage,
  getHafsPage,
  getHizbForPage,
  getJuzForPage,
  HIZB_START_PAGES,
  TOTAL_PAGES,
  type HafsAyah,
} from '@/lib/quran-api';
import type { BookmarkScope } from '@/contexts/AppContext';

const QURAN_FONT = 'KFGQPCHafs';
/** Initial guess for pages with a surah banner (page 1 Al-Fatiha, page 2
 *  Al-Baqarah start, etc.). These pages render with a centered breathing
 *  layout (justifyContent: space-evenly) so the banner sits in the right
 *  vertical area regardless of how much surrounding text exists. We keep
 *  the start size modest so a single surah header + bismillah still
 *  reads gracefully on Al-Fatiha. */
const INITIAL_FONT_WITH_BANNER = 24;
/** Initial guess for pages that are ONE flowing ayah group with no banner
 *  (e.g. page 3 Al-Baqarah cont'd). These pages render top-aligned and
 *  the fit-loop shrinks ONLY on overflow, so a larger starting size
 *  ensures the text grows to fill the available area before shrinking. */
const INITIAL_FONT_NO_BANNER = 32;
const MAX_FONT = 32;
const MIN_FONT = 16;
const FONT_STEP = 0.5;
const SAFETY_BUFFER = 8;
const LINE_HEIGHT_MULT = 1.5;
const MINI_LABEL_HEIGHT = 26;
const PAGE_OVAL_HEIGHT = 38;
const ICON_BAR_HEIGHT = 44;
const CHROME_FADE_MS = 240;
/** Muted ornament gold, harmonises with both dark and light backgrounds. */
const GOLD_LIGHT = '#A88B5C';
const GOLD_DARK  = '#C9A875';

/** TEMP — flip to false before commit. Adds visible borders around each
 *  layout container so we can SEE which one is collapsing/leaking when
 *  the page renders. */
const DEBUG_BORDERS = false;

/** Per-(page,available-height) converged font size. */
const FIT_CACHE: Record<string, number> = {};
const fitKey = (page: number, available: number) => `${page}@${Math.floor(available)}`;

function toArabicIndic(n: number): string {
  return n.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)]);
}

interface AyahKey { surah: number; ayah: number }

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

/* ── Page content body — pure render at a given font size ──────── */
function MushafPageBody({
  ayat, width, fontSize, textColor, ornamentColor,
  highlightTarget, isBookmarkedFn, onLongPressAyah,
  lineHeightOverride, debugBorders,
}: {
  ayat: ReadonlyArray<HafsAyah>;
  width: number;
  fontSize: number;
  textColor: string;
  ornamentColor: string;
  highlightTarget: AyahKey | null;
  isBookmarkedFn: (s: number, a: number) => boolean;
  onLongPressAyah: (target: AyahKey) => void;
  /** If set, overrides the per-line spacing of the ayah Text. Used to
   *  stretch the rendered text to fill the page on single-no-banner pages. */
  lineHeightOverride?: number;
  debugBorders?: boolean;
}) {
  type Group = { surahNum: number; isSurahStart: boolean; hasBismillah: boolean; ayat: HafsAyah[] };
  const groups: Group[] = [];
  for (const a of ayat) {
    const last = groups[groups.length - 1];
    if (last && last.surahNum === a.surahNum) {
      last.ayat.push(a);
    } else {
      const meta = SURAH_META[a.surahNum - 1];
      const isSurahStart = a.ayahNum === 1;
      const hasBismillah = isSurahStart && !!meta?.hasBismillah && a.surahNum !== 1;
      groups.push({ surahNum: a.surahNum, isSurahStart, hasBismillah, ayat: [a] });
    }
  }

  const baseLineHeight = fontSize * LINE_HEIGHT_MULT;
  const lineHeight = lineHeightOverride ?? baseLineHeight;
  // Substantial banner — proper Madani Mushaf decorative panel, not a label.
  // The 90 pt floor guarantees room for the rosettes + dotted border +
  // calligraphic title with ~20 pt of breathing space above and below.
  const bannerHeight = Math.max(90, fontSize * 3.5);
  const bismillahHeight = Math.max(26, fontSize * 1.5);

  return (
    <>
      {groups.map((g, gi) => (
        <View key={gi} style={debugBorders ? { borderWidth: 1, borderColor: 'blue' } : undefined}>
          {g.isSurahStart && (
            <OrnateSurahBanner
              surahNum={g.surahNum}
              color={ornamentColor}
              textColor={textColor}
              width={width}
              height={bannerHeight}
            />
          )}
          {g.hasBismillah && (
            <View style={{ height: bismillahHeight, justifyContent: 'center' }}>
              <Text
                style={{
                  color: textColor,
                  fontFamily: QURAN_FONT,
                  fontSize: fontSize * 0.95,
                  lineHeight: bismillahHeight,
                  textAlign: 'center',
                  writingDirection: 'rtl',
                }}
              >
                بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ
              </Text>
            </View>
          )}
          {/* textAlign: 'justify' justifies every line of an ayah-group
              EXCEPT the last one — that's the CSS/React Native default and
              there is no `textAlignLast` prop on RN's TextStyle (the only
              accepted textAlign values are auto | left | right | center |
              justify; see node_modules/react-native/Libraries/StyleSheet/
              StyleSheetTypes.d.ts:537). The printed Madani Mushaf follows
              the same convention — the trailing line of a passage sits at
              its natural width — so this matches authentic Mushaf
              typography. Do not introduce per-visual-line Views again to
              "fix" this; the structural rewrite caused right-edge clipping
              regressions (see TEST-5 → TEST-6 rollback for context). */}
          <Text
            style={{
              color: textColor,
              fontFamily: QURAN_FONT,
              fontSize,
              lineHeight,
              textAlign: 'justify',
              writingDirection: 'rtl',
            }}
          >
            {g.ayat.map((a, ai) => {
              const bookmarked = isBookmarkedFn(a.surahNum, a.ayahNum);
              const highlighted = highlightTarget?.surah === a.surahNum && highlightTarget?.ayah === a.ayahNum;
              return (
                <Text
                  key={ai}
                  suppressHighlighting
                  onLongPress={() => onLongPressAyah({ surah: a.surahNum, ayah: a.ayahNum })}
                  style={{
                    color: highlighted ? ornamentColor : (bookmarked ? '#C8860A' : textColor),
                    backgroundColor: highlighted ? ornamentColor + '22' : undefined,
                  }}
                >
                  {a.text + ' '}
                </Text>
              );
            })}
          </Text>
        </View>
      ))}
    </>
  );
}

/* ── One Mushaf page — measure off-screen, render distributed ──── */
function MushafPageView({
  pageNum, width, height, textColor, ornamentColor, bgColor,
  highlightTarget, isBookmarkedFn, onLongPressAyah, onTap,
}: {
  pageNum: number;
  width: number;
  height: number;
  textColor: string;
  ornamentColor: string;
  bgColor: string;
  highlightTarget: AyahKey | null;
  isBookmarkedFn: (s: number, a: number) => boolean;
  onLongPressAyah: (target: AyahKey) => void;
  onTap: () => void;
}) {
  const ayat = getHafsPage(pageNum);
  const horizPad = 10;
  const vertPad = 6;
  const innerWidth = width - horizPad * 2;
  const available = height - vertPad * 2 - SAFETY_BUFFER;

  // Page composition — decides initial font + layout policy.
  //   hasBanner  : any group on this page starts a surah (banner + breathing
  //                space; Al-Fatiha / Al-Baqarah start aesthetic).
  //   multiGroup : two or more surahs share the page (mid-page transitions
  //                like 293 Al-Isra→Al-Kahf, 604 with three short surahs).
  //   Single dense group, no banner (most pages — 3, 4, 50, 292):
  //     start font HIGH (32) so the text naturally fills top-to-bottom;
  //     justifyContent: 'flex-start' so the first line sits at the top.
  //   Banner or multi-group:
  //     start font modest (24), use 'space-evenly' to distribute groups
  //     evenly — preserves the centered breathing-space layout users
  //     specifically asked us to keep on pages 1 and 2.
  const { hasBanner, multiGroup } = useMemo(() => {
    let banner = false;
    let lastSurah = -1;
    let nGroups = 0;
    for (const a of ayat) {
      if (a.surahNum !== lastSurah) {
        nGroups++;
        lastSurah = a.surahNum;
        if (a.ayahNum === 1) banner = true;
      }
    }
    return { hasBanner: banner, multiGroup: nGroups > 1 };
  }, [ayat]);
  // Three-mode layout policy:
  //   multi-group pages (293, 312, 604)         → 'space-between'
  //       Two or more surah groups: pin the first group to the page top and
  //       the last group to the page bottom; the gap between them grows to
  //       fill all remaining vertical space (per the user spec — Maryam
  //       content near top, Taha content near bottom, banner sits between).
  //   single-group banner pages (1, 2, 50, 187) → 'space-around'
  //       One surah with a banner — Al-Fatiha / Al-Baqarah start aesthetic.
  //       Banner + ayat sit as one unit, vertically centered with equal
  //       breathing space above and below.
  //   single-group no-banner pages (3, 4, …)    → 'flex-start'
  //       Dense continuation pages: top-align so the first line sits at
  //       the page top; the higher INITIAL_FONT_NO_BANNER lets the text
  //       run down to the bottom edge before the fit-loop shrinks it.
  const layoutPolicy: 'space-between' | 'space-around' | 'flex-start' =
    multiGroup ? 'space-between'
      : hasBanner ? 'space-around'
        : 'flex-start';
  const initialFont = (hasBanner || multiGroup) ? INITIAL_FONT_WITH_BANNER : INITIAL_FONT_NO_BANNER;

  const cachedFont = FIT_CACHE[fitKey(pageNum, available)];
  const [fontSize, setFontSize] = useState<number>(cachedFont ?? initialFont);
  const lastKey = useRef<string>('');
  useEffect(() => {
    const key = fitKey(pageNum, available);
    if (lastKey.current !== key) {
      lastKey.current = key;
      const cached = FIT_CACHE[key];
      setFontSize(cached ?? initialFont);
    }
  }, [pageNum, available, initialFont]);

  // ── Line-stretch fill for single-no-banner pages.
  // Earlier attempt used onTextLayout on the visible Text — but that fires
  // with a transient lineCount of 1 during initial layout (before the Text
  // has finished measuring), producing stretchedLH ≈ available ≈ 700pt and
  // a single giant line floating in the middle of an otherwise empty page.
  // New approach: derive the stretched lineHeight directly from the
  // off-screen measurement (`measured` height at baseLineHeight). Because
  // baseLineHeight is fixed per fontSize and lineHeight doesn't affect
  // line-wrap, lineCount ≈ measured / baseLineHeight is stable. Stretched
  // value is capped at MAX_STRETCH_MULT * baseLineHeight as a safety net.
  const stretchEnabled = !hasBanner && !multiGroup;
  const MAX_STRETCH_MULT = 2.4;
  const [stretchedLH, setStretchedLH] = useState<number | null>(null);
  // Reset stretch on page identity change so a recycled component instance
  // doesn't render the new page with the previous page's stretched lineHeight.
  useEffect(() => {
    setStretchedLH(null);
  }, [pageNum]);

  const onMeasure = useCallback((e: LayoutChangeEvent) => {
    const measured = e.nativeEvent.layout.height;
    const baseLH = fontSize * LINE_HEIGHT_MULT;
    if (measured > available && fontSize > MIN_FONT) {
      const next = Math.max(MIN_FONT, fontSize - FONT_STEP);
      FIT_CACHE[fitKey(pageNum, available)] = next;
      setFontSize(next);
      return;
    }
    FIT_CACHE[fitKey(pageNum, available)] = fontSize;
    if (measured > available) {
      // eslint-disable-next-line no-console
      console.warn(`[Mushaf] Page ${pageNum} overflows at MIN_FONT=${MIN_FONT}; measured=${measured}px available=${available}px`);
    } else {
      // eslint-disable-next-line no-console
      console.log(`[Mushaf] Page ${pageNum} fit: policy=${layoutPolicy} fontSize=${fontSize} measured=${Math.round(measured)} available=${Math.round(available)} page=${Math.round(height)}`);
    }
    // Compute stretchedLH from the converged measurement (single-no-banner
    // pages only). measured is the intrinsic height at baseLH; we want the
    // text to fill `available` instead. Cap defensively.
    if (stretchEnabled && measured > baseLH && measured <= available) {
      const desired = baseLH * (available / measured);
      const capped = Math.min(desired, baseLH * MAX_STRETCH_MULT);
      // Don't bother updating for tiny stretches (< 2pt) — avoids re-render thrash.
      if (capped > baseLH + 2 && Math.abs(capped - (stretchedLH ?? baseLH)) > 1) {
        // eslint-disable-next-line no-console
        console.log(`[Mushaf] Page ${pageNum} stretch: fontSize=${fontSize} baseLH=${Math.round(baseLH)} stretchedLH=${Math.round(capped)} (measured=${Math.round(measured)} available=${Math.round(available)})`);
        setStretchedLH(capped);
      }
    }
  }, [fontSize, available, pageNum, layoutPolicy, height, stretchEnabled, stretchedLH]);

  if (ayat.length === 0) {
    return <View style={{ width, height, backgroundColor: bgColor }} />;
  }

  // GestureDetector with a short Tap. gesture-handler's recognizer runs
  // parallel to RN's Text gesture system so it fires reliably regardless of
  // where on the page the user taps — including on top of an ayah Text.
  const tapGesture = useMemo(
    () =>
      Gesture.Tap()
        .maxDuration(250)
        .onEnd((_, success) => {
          'worklet';
          if (success) runOnJS(onTap)();
        }),
    [onTap]
  );

  return (
    <GestureDetector gesture={tapGesture}>
      <View
        onLayout={(e) => {
          // Log the actual rendered page wrapper height once per page.
          // eslint-disable-next-line no-console
          console.log(`[Mushaf] Page ${pageNum} wrapper layout: width=${Math.round(e.nativeEvent.layout.width)} height=${Math.round(e.nativeEvent.layout.height)} expected=${Math.round(height)}`);
        }}
        style={{
          width, height, backgroundColor: bgColor,
          paddingHorizontal: horizPad, paddingVertical: vertPad,
          overflow: 'hidden',
          ...(DEBUG_BORDERS ? { borderWidth: 1, borderColor: 'red' } : null),
        }}
      >
        {/* Off-screen measurement — intrinsic height at BASE lineHeight,
            drives the fit-loop. Stretching is applied only to the visible
            render so the measurement remains a stable upper bound. */}
        <View
          onLayout={onMeasure}
          style={{ position: 'absolute', top: 0, left: -10000, width: innerWidth, opacity: 0 }}
          pointerEvents="none"
        >
          <MushafPageBody
            ayat={ayat}
            width={innerWidth}
            fontSize={fontSize}
            textColor={textColor}
            ornamentColor={ornamentColor}
            highlightTarget={highlightTarget}
            isBookmarkedFn={isBookmarkedFn}
            onLongPressAyah={onLongPressAyah}
          />
        </View>
        {/* Visible render — three-mode policy (space-between / space-around
            / flex-start). For single-no-banner pages we ALSO pass a stretched
            lineHeight derived from onTextLayout so the text fills the page
            top-to-bottom instead of bunching at the top edge. */}
        <View
          onLayout={(e) => {
            // eslint-disable-next-line no-console
            console.log(`[Mushaf] Page ${pageNum} content container: height=${Math.round(e.nativeEvent.layout.height)} policy=${layoutPolicy} stretched=${stretchedLH ? Math.round(stretchedLH) : 'no'}`);
          }}
          style={{
            flex: 1,
            justifyContent: layoutPolicy,
            ...(DEBUG_BORDERS ? { borderWidth: 1, borderColor: 'yellow' } : null),
          }}
        >
          <MushafPageBody
            ayat={ayat}
            width={innerWidth}
            fontSize={fontSize}
            textColor={textColor}
            ornamentColor={ornamentColor}
            highlightTarget={highlightTarget}
            isBookmarkedFn={isBookmarkedFn}
            onLongPressAyah={onLongPressAyah}
            lineHeightOverride={stretchEnabled ? (stretchedLH ?? undefined) : undefined}
            debugBorders={DEBUG_BORDERS}
          />
        </View>
      </View>
    </GestureDetector>
  );
}

/* ── Reader screen ───────────────────────────────────────────────── */
export default function QuranReaderScreen() {
  const params = useLocalSearchParams<{ page?: string; highlightSurah?: string; highlightAyah?: string; timestamp?: string }>();
  const initialPage = Math.max(1, Math.min(TOTAL_PAGES, parseInt(params.page ?? '1', 10)));
  const highlightSurahParam = parseInt(params.highlightSurah ?? '0', 10);
  const highlightAyahParam  = parseInt(params.highlightAyah  ?? '0', 10);

  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { isDark, lang, setLastReadPage, setLastReadSurah,
          addBookmark, removeBookmark, isBookmarked, colors } = useApp();
  const C = colors;
  const tr = t(lang);
  const isAr = lang === 'ar';
  const ornamentColor = isDark ? GOLD_DARK : GOLD_LIGHT;

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  const [pageNum, setPageNum] = useState(initialPage);
  const [highlightTarget, setHighlightTarget] = useState<AyahKey | null>(
    highlightSurahParam && highlightAyahParam
      ? { surah: highlightSurahParam, ayah: highlightAyahParam }
      : null
  );
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

  useEffect(() => {
    if (!highlightTarget) return;
    const tid = setTimeout(() => setHighlightTarget(null), 3000);
    return () => clearTimeout(tid);
  }, [highlightTarget]);

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
    if (!params.highlightSurah || !params.highlightAyah) return;
    const surah = parseInt(params.highlightSurah, 10);
    const ayah = parseInt(params.highlightAyah, 10);
    setHighlightTarget({ surah, ayah });
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
  // Juz from the page's first ayah; hizb from the canonical HIZB_START_PAGES table.
  const juzNum = currentAyat[0]?.juz ?? getJuzForPage(pageNum);
  const hizbNum = getHizbForPage(pageNum);
  const juzLabel = isAr
    ? `جزء ${toArabicIndic(juzNum)} · حزب ${toArabicIndic(hizbNum)}`
    : `${tr.juz} ${juzNum} · ${tr.hizb} ${hizbNum}`;

  // Three-scope bookmark dispatcher: given a scope and the long-pressed ayah,
  // toggle the corresponding bookmark. Reuses the AppContext API which now
  // accepts a polymorphic BookmarkKey.
  const toggleBookmark = useCallback((target: AyahKey, scope: BookmarkScope) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const meta = SURAH_META[target.surah - 1];
    const ayahPage = getAyahPage(target.surah, target.ayah);
    if (scope === 'ayah') {
      const key = { scope: 'ayah' as const, surah: target.surah, ayah: target.ayah };
      if (isBookmarked(key)) {
        removeBookmark(key);
      } else {
        addBookmark({
          scope: 'ayah',
          surahNumber: target.surah,
          surahName: meta?.transliteration ?? '',
          ayahNumber: target.ayah,
          ayahText: '',
          page: ayahPage,
          timestamp: Date.now(),
        });
      }
      return;
    }
    if (scope === 'hizb') {
      const hizb = getHizbForPage(ayahPage);
      const key = { scope: 'hizb' as const, hizb };
      const hizbStartPage = HIZB_START_PAGES[hizb - 1] ?? ayahPage;
      if (isBookmarked(key)) {
        removeBookmark(key);
      } else {
        addBookmark({
          scope: 'hizb',
          surahNumber: target.surah,
          surahName: meta?.transliteration ?? '',
          ayahNumber: target.ayah,
          ayahText: '',
          hizb,
          page: hizbStartPage,
          timestamp: Date.now(),
        });
      }
      return;
    }
    // juz
    const juz = getJuzForPage(ayahPage);
    const key = { scope: 'juz' as const, juz };
    // First hizb in juz N is hizb 2N-1. That hizb's start page is the juz start.
    const juzStartPage = HIZB_START_PAGES[(juz - 1) * 2] ?? ayahPage;
    if (isBookmarked(key)) {
      removeBookmark(key);
    } else {
      addBookmark({
        scope: 'juz',
        surahNumber: target.surah,
        surahName: meta?.transliteration ?? '',
        ayahNumber: target.ayah,
        ayahText: '',
        juz,
        page: juzStartPage,
        timestamp: Date.now(),
      });
    }
  }, [isBookmarked, addBookmark, removeBookmark]);

  const handleLongPressAyah = useCallback((target: AyahKey) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const meta = SURAH_META[target.surah - 1];
    const ayahPage = getAyahPage(target.surah, target.ayah);
    const hizb = getHizbForPage(ayahPage);
    const juz = getJuzForPage(ayahPage);
    const headerLabel = isAr
      ? `${meta?.arabic ?? ''} — آية ${toArabicIndic(target.ayah)} · حزب ${toArabicIndic(hizb)} · جزء ${toArabicIndic(juz)}`
      : `${meta?.transliteration ?? ''} — ${tr.ayah} ${target.ayah} · ${tr.hizb} ${hizb} · ${tr.juz} ${juz}`;

    const ayahKey = { scope: 'ayah' as const, surah: target.surah, ayah: target.ayah };
    const hizbKey = { scope: 'hizb' as const, hizb };
    const juzKey = { scope: 'juz' as const, juz };
    const ayahMarked = isBookmarked(ayahKey);
    const hizbMarked = isBookmarked(hizbKey);
    const juzMarked = isBookmarked(juzKey);
    const mark = (on: boolean) => on ? '✓ ' : '';
    const ayahLabel = `${mark(ayahMarked)}${tr.bookmark_save_ayah ?? 'Bookmark this ayah'}`;
    const hizbLabel = `${mark(hizbMarked)}${tr.bookmark_save_hizb ?? 'Bookmark this hizb'}`;
    const juzLabel  = `${mark(juzMarked)}${tr.bookmark_save_juz ?? 'Bookmark this juz'}`;
    const cancelLabel = tr.btn_cancel ?? 'Cancel';

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: tr.bookmark_choose_scope ?? 'Choose what to bookmark',
          message: headerLabel,
          options: [ayahLabel, hizbLabel, juzLabel, cancelLabel],
          cancelButtonIndex: 3,
        },
        (idx) => {
          if (idx === 0) toggleBookmark(target, 'ayah');
          else if (idx === 1) toggleBookmark(target, 'hizb');
          else if (idx === 2) toggleBookmark(target, 'juz');
        }
      );
      return;
    }
    Alert.alert(
      tr.bookmark_choose_scope ?? 'Choose what to bookmark',
      headerLabel,
      [
        { text: ayahLabel, onPress: () => toggleBookmark(target, 'ayah') },
        { text: hizbLabel, onPress: () => toggleBookmark(target, 'hizb') },
        { text: juzLabel,  onPress: () => toggleBookmark(target, 'juz') },
        { text: cancelLabel, style: 'cancel' },
      ]
    );
  }, [isBookmarked, tr, isAr, toggleBookmark]);

  const handleTap = useCallback(() => {
    setChromeVisible(v => !v);
  }, []);

  const renderItem = useCallback(({ item }: { item: number }) => (
    // key={item} forces React to mount a fresh MushafPageView instance whenever
    // the page number changes — eliminates state leakage (cached fontSize,
    // stretchedLH) from a recycled FlatList child when virtualization
    // restores it for a different page than it last rendered.
    <MushafPageView
      key={item}
      pageNum={item}
      width={pageWidth}
      height={pageHeight}
      textColor={C.text}
      ornamentColor={ornamentColor}
      bgColor={isDark ? '#0D0D0D' : '#FAF6EE'}
      highlightTarget={highlightTarget}
      isBookmarkedFn={isBookmarked}
      onLongPressAyah={handleLongPressAyah}
      onTap={handleTap}
    />
  ), [pageWidth, pageHeight, C, isDark, ornamentColor, highlightTarget, isBookmarked, handleLongPressAyah, handleTap]);

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
              onPress={() => router.back()}
              style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.backgroundCard, opacity: pressed ? 0.7 : 1 }]}
            >
              <Ionicons name="chevron-back" size={18} color={C.tint} />
            </Pressable>
            <Pressable
              // replace, not push — opening ToC swaps the reader for the ToC
              // screen in the stack (rather than stacking on top). Combined
              // with the ToC's own router.replace back to the reader, the
              // stack stays flat: one back tap returns to wherever the user
              // entered the reader from (Quran tab / search / bookmarks).
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
