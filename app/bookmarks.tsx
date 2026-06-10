import React from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, Platform,
} from 'react-native';
import { SERIF_EN } from '@/constants/typography';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAyahPage, SURAH_META } from '@/lib/quran-api';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { t } from '@/constants/i18n';
import type { Bookmark } from '@/contexts/AppContext';

/** Convert Western digits in a string to Arabic-Indic, in-place. */
function toArabicIndic(s: string | number): string {
  return String(s).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[parseInt(d, 10)]);
}

/** Localized Gregorian date+time for a bookmark timestamp.
 *  TEST-27: numeric-only DD/MM/YYYY HH:MM. Gregorian everywhere — bypasses
 *  Intl date formatter entirely (some locales return Hijri or insert month
 *  names) and builds the string from raw Date getters so the format is fixed.
 *  Arabic UI: transliterate Latin digits to Arabic-Indic in-place. */
function formatBookmarkDate(ts: number, isAr: boolean): string {
  const d = new Date(ts);
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const dd = pad(d.getDate());
  const mm = pad(d.getMonth() + 1);
  const yyyy = String(d.getFullYear());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  const out = `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
  return isAr ? toArabicIndic(out) : out;
}

export default function BookmarksScreen() {
  const insets = useSafeAreaInsets();
  const { isDark, lang, colors, bookmarks, removeBookmark } = useApp();
  const C = colors;
  const fw = C.fontWeightNormal;
  const tr = t(lang);
  const isAr = lang === 'ar';
  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  // TEST-27 helpers
  const num = (n: number | string | undefined) => {
    if (n === undefined || n === null || n === '') return '?';
    return isAr ? toArabicIndic(n) : String(n);
  };
  const surahDisplay = (i: Bookmark) => {
    const meta = SURAH_META[i.surahNumber - 1];
    if (!meta) return i.surahName;
    return isAr ? meta.arabic : (meta.transliteration ?? i.surahName);
  };
  const rubTitleAr = (hizb: number, quarter?: number) => {
    const fraction = ['', '١/٤ ', '١/٢ ', '٣/٤ '][(quarter ?? 1) - 1];
    return `${fraction}الحزب ${num(hizb)}`;
  };
  const rubTitleEn = (hizb: number, quarter?: number) => {
    const fraction = ['', '1/4 ', '1/2 ', '3/4 '][(quarter ?? 1) - 1];
    return `${fraction}${tr.hizb ?? 'Hizb'} ${hizb}`;
  };

  const renderItem = ({ item }: { item: Bookmark }) => {
    const scope = item.scope ?? 'ayah';
    const isTranslit = item.type === 'transliteration';
    const navigate = () => {
      Haptics.selectionAsync();
      if (isTranslit) {
        router.push({
          pathname: '/surah-transliteration/[number]',
          params: { number: String(item.surahNumber) },
        });
        return;
      }
      const page = item.page ?? getAyahPage(item.surahNumber, item.ayahNumber);
      const params: Record<string, string> = { page: String(page) };
      if (scope === 'ayah') {
        params.highlightSurah = String(item.surahNumber);
        params.highlightAyah = String(item.ayahNumber);
      }
      router.push({ pathname: '/quran-reader', params });
    };

    // Per-scope dot colour and badge label.
    const dotColor =
      isTranslit ? C.tint
      : scope === 'rub' ? C.tint
      : scope === 'hizb' ? C.tint
      : scope === 'juz' ? '#8B7E48'
      : C.gold;
    const scopeBadge =
      scope === 'rub' ? { label: tr.bookmark_scope_rub ?? 'Hizb quarter', icon: 'bookmark' as const }
      : scope === 'hizb' ? { label: tr.bookmark_scope_hizb ?? 'Hizb', icon: 'bookmark' as const }
      : scope === 'juz' ? { label: tr.bookmark_scope_juz ?? 'Juz', icon: 'bookmarks' as const }
      : null;

    // Main title line.
    // - ayah: localized surah name.
    // - rub:  e.g. "٣/٤ الحزب ٥" (Arabic) / "3/4 Hizb 5" (English).
    // - hizb (legacy): "حزب N" / "Hizb N".
    // - juz  (legacy): "جزء N" / "Juz N".
    const titleText =
      scope === 'rub'  ? (isAr ? rubTitleAr(item.hizb ?? 0, item.quarter) : rubTitleEn(item.hizb ?? 0, item.quarter))
      : scope === 'hizb' ? `${tr.hizb ?? 'Hizb'} ${num(item.hizb)}`
      : scope === 'juz' ? `${tr.juz ?? 'Juz'} ${num(item.juz)}`
      : surahDisplay(item);

    // Meta line — all digits locale-consistent.
    const metaText =
      scope === 'rub' ? `${tr.page ?? 'Page'} ${num(item.page)}`
      : scope === 'hizb' ? `${tr.page ?? 'Page'} ${num(item.page)}`
      : scope === 'juz' ? `${tr.page ?? 'Page'} ${num(item.page)}`
      : `${tr.ayah} ${num(item.ayahNumber)}`;

    return (
    <View style={[styles.row, { backgroundColor: C.backgroundCard, borderColor: C.separator }]}>
        <Pressable onPress={navigate} style={styles.rowBody}>
          <View style={[styles.goldDot, { backgroundColor: dotColor }]} />
          <View style={styles.info}>
            <View style={styles.surahNameRow}>
              <Text style={[styles.surahName, { color: C.text, fontFamily: 'Amiri_700Bold', flex: 1 }]}>
                {titleText}
              </Text>
              {isTranslit ? (
                <View style={[styles.typeBadge, { backgroundColor: C.tintLight, borderColor: C.tint }]}>
                  <Ionicons name="language" size={10} color={C.tint} />
                  <Text style={[styles.typeBadgeText, { color: C.tint }]}>
                    {tr.translit}
                  </Text>
                </View>
              ) : scopeBadge ? (
                <View style={[styles.typeBadge, { backgroundColor: C.tintLight, borderColor: C.tint }]}>
                  <Ionicons name={scopeBadge.icon} size={10} color={C.tint} />
                  <Text style={[styles.typeBadgeText, { color: C.tint }]}>
                    {scopeBadge.label}
                  </Text>
                </View>
              ) : null}
            </View>
            <View style={styles.metaRow}>
              <Text style={[styles.ayahNum, { color: C.textSecond, fontWeight: fw }]}>
                {metaText}
              </Text>
              {!!item.timestamp && (
                <Text style={[styles.timestamp, { color: C.textMuted, fontWeight: fw }]}>
                  {formatBookmarkDate(item.timestamp, isAr)}
                </Text>
              )}
            </View>
            {scope === 'ayah' && !!item.ayahText && (
              <Text style={[styles.preview, { color: C.textMuted, fontWeight: fw, fontFamily: 'Amiri_400Regular' }]} numberOfLines={2}>
                {item.ayahText}…
              </Text>
            )}
          </View>
        </Pressable>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            if (scope === 'ayah') removeBookmark(item.surahNumber, item.ayahNumber);
            else if (scope === 'rub') removeBookmark({ scope: 'rub', hizb: item.hizb ?? 0, quarter: (item.quarter ?? 1) as 1 | 2 | 3 | 4 });
            else if (scope === 'hizb') removeBookmark({ scope: 'hizb', hizb: item.hizb ?? 0 });
            else removeBookmark({ scope: 'juz', juz: item.juz ?? 0 });
          }}
          style={({ pressed }) => [styles.deleteBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Text style={{ color: C.danger, fontSize: 13, fontWeight: '600' }}>{(tr as any).delete_label ?? 'Delete'}</Text>
        </Pressable>
    </View>
  );
  };

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <LinearGradient
        colors={isDark ? ['#0a2416', '#070f0a'] : ['#e8f5ec', '#f8fdf9']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      />
      <View style={[styles.header, { paddingTop: topInset + 4, paddingHorizontal: 16 }]}>
        <Pressable
          onPress={() => { Haptics.selectionAsync(); router.back(); }}
          style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.surface, opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="arrow-back" size={20} color={C.tint} />
        </Pressable>
        <Text style={[styles.title, { color: C.text, fontFamily: isAr ? 'Amiri_700Bold' : SERIF_EN }]}>
          {tr.bookmarks}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {bookmarks.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="bookmark-outline" size={56} color={C.textMuted} />
          <Text style={[styles.emptyText, { color: C.textMuted, fontWeight: fw, fontFamily: isAr ? 'Amiri_400Regular' : SERIF_EN }]}>
            {tr.noBookmarks}
          </Text>
        </View>
      ) : (
        <FlatList
          data={bookmarks}
          keyExtractor={item => {
            const s = item.scope ?? 'ayah';
            if (s === 'ayah') return `ayah-${item.surahNumber}-${item.ayahNumber}-${item.type ?? 'mushaf'}`;
            if (s === 'rub')  return `rub-${item.hizb}-${item.quarter}`;
            if (s === 'hizb') return `hizb-${item.hizb}`;
            return `juz-${item.juz}`;
          }}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomInset + 40 }}
          scrollEnabled={!!bookmarks.length}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingBottom: 12,
  },
  title: { fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 15 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, borderWidth: 1, marginBottom: 8, overflow: 'hidden',
  },
  rowBody: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
  },
  goldDot: { width: 8, height: 8, borderRadius: 4 },
  info: { flex: 1 },
  surahNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  surahName: { fontSize: 18 },
  typeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 6, borderWidth: 1,
  },
  typeBadgeText: { fontSize: 10, fontWeight: '600' },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  ayahNum: { fontSize: 12 },
  timestamp: { fontSize: 11 },
  preview: { fontSize: 14, lineHeight: 22 },
  deleteBtn: { padding: 14, paddingLeft: 8 },
});
