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
  useWindowDimensions, Animated,
  type NativeSyntheticEvent, type TextLayoutEventData,
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

/* ─────────────────────────────────────────────────────────────────────────
 * Per-ayah layout. Each ayah becomes one direct flex child of the page
 * content container. Banners/bismillah are natural-sized children. Lines
 * use flex: 1 so they collectively absorb the remaining height after
 * banners/bismillah are subtracted, then distribute it equally — like
 * the printed Mushaf's 15 evenly-spaced lines.
 *
 * No measurement phase, no two-render dance, no race conditions. Long-
 * press is per-ayah (precise; the Pressable IS the ayah).
 *
 * Layout policy per page composition:
 *   single-banner (page 1, 2):
 *     Wrap banner + ayat in one centered group inside the flex parent.
 *     Parent uses justifyContent: 'center' so the block sits with equal
 *     breathing space above and below (the Fatiha aesthetic).
 *   everything else (multi-group + single-no-banner):
 *     Flat list of [banner?, bismillah?, ...ayahPressables(flex:1)] as
 *     direct flex children. Container has explicit height; default
 *     flex-start with each ayah's flex: 1 makes them share the
 *     leftover space equally, filling the container exactly.
 * ──────────────────────────────────────────────────────────────────────── */

type Group = { surahNum: number; isSurahStart: boolean; hasBismillah: boolean; ayat: HafsAyah[] };

function buildGroups(ayat: ReadonlyArray<HafsAyah>): Group[] {
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
  return groups;
}

/* ── One Mushaf page — direct per-ayah render ──────────────────── */
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

  const groups = useMemo(() => buildGroups(ayat), [ayat]);
  const { hasBanner, multiGroup } = useMemo(() => {
    let banner = false;
    let nGroups = 0;
    let lastSurah = -1;
    for (const a of ayat) {
      if (a.surahNum !== lastSurah) {
        nGroups++;
        lastSurah = a.surahNum;
        if (a.ayahNum === 1) banner = true;
      }
    }
    return { hasBanner: banner, multiGroup: nGroups > 1 };
  }, [ayat]);
  const singleBanner = hasBanner && !multiGroup;

  // Single-banner pages (Fatiha, Baqarah-start) use a smaller starting
  // font so the centered block doesn't overwhelm the page. Other pages
  // start larger and let flex distribute. The fit-loop is implicit:
  // ayat with flex: 1 will SHRINK their text rendering if it overflows
  // the slot height. We don't run an explicit measurement loop.
  const fontSize = singleBanner ? INITIAL_FONT_WITH_BANNER : INITIAL_FONT_NO_BANNER;
  const bannerHeight = Math.max(90, fontSize * 3.5);
  const bismillahHeight = Math.max(26, fontSize * 1.5);

  if (ayat.length === 0) {
    return <View style={{ width, height, backgroundColor: bgColor }} />;
  }

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

  // Render an ayah row (Pressable + Text). Lines collectively share the
  // remaining flex space. textAlign: 'justify' makes the ayah text fill
  // its row width edge to edge — the printed-Mushaf horizontal justify.
  const renderAyah = (a: HafsAyah, idx: number) => {
    const key = { surah: a.surahNum, ayah: a.ayahNum };
    const bookmarked = isBookmarkedFn(a.surahNum, a.ayahNum);
    const highlighted = highlightTarget?.surah === a.surahNum && highlightTarget?.ayah === a.ayahNum;
    return (
      <Pressable
        key={`a-${a.surahNum}-${a.ayahNum}`}
        onLongPress={() => onLongPressAyah(key)}
        style={{
          flex: 1,
          justifyContent: 'center',
          ...(DEBUG_BORDERS ? { borderWidth: 1, borderColor: 'blue' } : null),
        }}
      >
        <Text
          style={{
            color: highlighted ? ornamentColor : (bookmarked ? '#C8860A' : textColor),
            backgroundColor: highlighted ? ornamentColor + '22' : undefined,
            fontFamily: QURAN_FONT,
            fontSize,
            lineHeight: fontSize * LINE_HEIGHT_MULT,
            textAlign: 'justify',
            writingDirection: 'rtl',
          }}
        >
          {a.text}
        </Text>
      </Pressable>
    );
  };

  const renderBismillah = (key: string) => (
    <View
      key={key}
      style={{
        height: bismillahHeight,
        justifyContent: 'center',
        ...(DEBUG_BORDERS ? { borderWidth: 1, borderColor: 'green' } : null),
      }}
    >
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
  );

  // Single-banner pages get the centered-block treatment so Al-Fatiha and
  // Al-Baqarah-start keep their breathing aesthetic.
  if (singleBanner) {
    const g = groups[0];
    return (
      <GestureDetector gesture={tapGesture}>
        <View
          onLayout={(e) => {
            // eslint-disable-next-line no-console
            console.log(`[Mushaf] Page ${pageNum} wrapper: w=${Math.round(e.nativeEvent.layout.width)} h=${Math.round(e.nativeEvent.layout.height)} expected=${Math.round(height)}`);
          }}
          style={{
            width, height, backgroundColor: bgColor,
            paddingHorizontal: horizPad, paddingVertical: vertPad,
            overflow: 'hidden',
            ...(DEBUG_BORDERS ? { borderWidth: 1, borderColor: 'red' } : null),
          }}
        >
          <View
            onLayout={(e) => {
              // eslint-disable-next-line no-console
              console.log(`[Mushaf] Page ${pageNum} content: h=${Math.round(e.nativeEvent.layout.height)} layout=centered-block`);
            }}
            style={{
              height: available,
              justifyContent: 'center',
              alignItems: 'stretch',
              ...(DEBUG_BORDERS ? { borderWidth: 1, borderColor: 'yellow' } : null),
            }}
          >
            <View style={DEBUG_BORDERS ? { borderWidth: 1, borderColor: 'magenta' } : undefined}>
              <OrnateSurahBanner
                surahNum={g.surahNum}
                color={ornamentColor}
                textColor={textColor}
                width={innerWidth}
                height={bannerHeight}
              />
              {g.hasBismillah && renderBismillah(`bs-0`)}
              {g.ayat.map((a) => (
                <Text
                  key={`a-${a.ayahNum}`}
                  onLongPress={() => onLongPressAyah({ surah: a.surahNum, ayah: a.ayahNum })}
                  style={{
                    color: textColor,
                    fontFamily: QURAN_FONT,
                    fontSize,
                    lineHeight: fontSize * LINE_HEIGHT_MULT,
                    textAlign: 'center',
                    writingDirection: 'rtl',
                    paddingVertical: 2,
                  }}
                >
                  {a.text}
                </Text>
              ))}
            </View>
          </View>
        </View>
      </GestureDetector>
    );
  }

  // Multi-group OR single-no-banner: flat list. Each ayah is a flex: 1
  // child; banners/bismillah have natural sizes. All ayat share the
  // remaining height equally so the page fills top-to-bottom.
  return (
    <GestureDetector gesture={tapGesture}>
      <View
        onLayout={(e) => {
          // eslint-disable-next-line no-console
          console.log(`[Mushaf] Page ${pageNum} wrapper: w=${Math.round(e.nativeEvent.layout.width)} h=${Math.round(e.nativeEvent.layout.height)} expected=${Math.round(height)}`);
        }}
        style={{
          width, height, backgroundColor: bgColor,
          paddingHorizontal: horizPad, paddingVertical: vertPad,
          overflow: 'hidden',
          ...(DEBUG_BORDERS ? { borderWidth: 1, borderColor: 'red' } : null),
        }}
      >
        <View
          onLayout={(e) => {
            // eslint-disable-next-line no-console
            console.log(`[Mushaf] Page ${pageNum} content: h=${Math.round(e.nativeEvent.layout.height)} layout=flat-flex ayat=${ayat.length} groups=${groups.length}`);
          }}
          style={{
            height: available,
            ...(DEBUG_BORDERS ? { borderWidth: 1, borderColor: 'yellow' } : null),
          }}
        >
          {groups.map((g, gi) => (
            <React.Fragment key={`g-${gi}`}>
              {g.isSurahStart && (
                <View style={DEBUG_BORDERS ? { borderWidth: 1, borderColor: 'magenta' } : undefined}>
                  <OrnateSurahBanner
                    surahNum={g.surahNum}
                    color={ornamentColor}
                    textColor={textColor}
                    width={innerWidth}
                    height={bannerHeight}
                  />
                </View>
              )}
              {g.hasBismillah && renderBismillah(`bs-${gi}`)}
              {g.ayat.map((a, idx) => renderAyah(a, idx))}
            </React.Fragment>
          ))}
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
              // entered the reader from (Quran tab / search / bookmarks),
              // regardless of how many times they bounced via ToC.
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
