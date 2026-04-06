import AppLogo from '@/components/AppLogo';
import ThemeToggle from '@/components/ThemeToggle';
import LangToggle from '@/components/LangToggle';
import PageBackground from '@/components/PageBackground';
import { SERIF_EN } from '@/constants/typography';
import React, { useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View, Text, StyleSheet, Pressable, ScrollView, Platform, Modal, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { t } from '@/constants/i18n';
import {
  calculatePrayerTimes, formatTimeAtOffset,
  type PrayerTimes as PrayerTimesType,
} from '@/lib/prayer-times';
import {
  gregorianToHijri, hijriMonthName,
  getDaysInGregorianMonth, getFirstDayOfMonth,
} from '@/lib/hijri';
import {
  getMoonPhase, getNewMoonsForMonth, moonEmojiForDay,
  formatNewMoonDate, formatNewMoonLocal, getExpectedCrescentDate,
  type MoonPhaseInfo,
} from '@/lib/moon-phases';


const PRAYER_ICONS: Record<string, string> = {
  fajr: 'weather-night',
  sunrise: 'weather-sunset-up',
  dhuhr: 'brightness-7',
  asr: 'weather-partly-cloudy',
  maghrib: 'weather-sunset-down',
  isha: 'weather-night-partly-cloudy',
};

const GREGORIAN_MONTHS_EN = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const GREGORIAN_MONTHS_AR = [
  'يناير','فبراير','مارس','أبريل','مايو','يونيو',
  'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر',
];

const DAYS_EN = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const DAYS_AR = ['أح','إث','ثل','أر','خم','جم','سب'];

function toArabicIndic(n: number): string {
  return n.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)]);
}

type CalFontSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
const CAL_STEP_ORDER: CalFontSize[] = ['xs', 'sm', 'md', 'lg', 'xl'];
const CAL_SIZE_LABELS: Record<CalFontSize, string> = { xs: 'XS', sm: 'S', md: 'M', lg: 'L', xl: 'XL' };
const CAL_FONT_STEPS: Record<CalFontSize, { cell: number; hijri: number; month: number; prayer: number }> = {
  xs: { cell: 11, hijri: 7,  month: 14, prayer: 12 },
  sm: { cell: 14, hijri: 9,  month: 18, prayer: 14 },
  md: { cell: 16, hijri: 10, month: 21, prayer: 16 },
  lg: { cell: 18, hijri: 11, month: 24, prayer: 18 },
  xl: { cell: 20, hijri: 12, month: 27, prayer: 20 },
};
const CAL_FS_KEY = 'calendar_font_size';

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const { isDark, lang, location, calcMethod, asrMethod, maghribOffset, locationUtcOffset, hijriAdjustment, colors } = useApp();
  const C = colors;
  const fw = C.fontWeightNormal;
  const tr = t(lang);
  const isAr = lang === 'ar';

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1); // 1-indexed
  const [selectedDate, setSelectedDate] = useState<{ y: number; m: number; d: number }>({
    y: today.getFullYear(),
    m: today.getMonth() + 1,
    d: today.getDate(),
  });
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimesType | null>(null);
  const [showMoonDetail, setShowMoonDetail] = useState(false);
  const [showNewMoonLookup, setShowNewMoonLookup] = useState(false);
  const [lookupYear, setLookupYear] = useState(today.getFullYear());
  const [lookupMonth, setLookupMonth] = useState(today.getMonth() + 1);
  const [calFontSize, setCalFontSizeState] = useState<CalFontSize>('sm');

  useEffect(() => {
    AsyncStorage.getItem(CAL_FS_KEY).then(val => {
      if (val && CAL_STEP_ORDER.includes(val as CalFontSize)) setCalFontSizeState(val as CalFontSize);
    }).catch(() => {});
  }, []);

  const setCalFontSize = (fs: CalFontSize) => {
    setCalFontSizeState(fs);
    AsyncStorage.setItem(CAL_FS_KEY, fs).catch(() => {});
  };

  const calFsIdx = CAL_STEP_ORDER.indexOf(calFontSize);
  const calCanDecrease = calFsIdx > 0;
  const calCanIncrease = calFsIdx < CAL_STEP_ORDER.length - 1;
  const cFS = CAL_FONT_STEPS[calFontSize];

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  // Compute prayer times for selected date
  useEffect(() => {
    if (!location) return;
    const d = new Date(selectedDate.y, selectedDate.m - 1, selectedDate.d);
    const times = calculatePrayerTimes({
      lat: location.lat,
      lng: location.lng,
      date: d,
      method: calcMethod,
      asrMethod,
      maghribOffset,
    });
    setPrayerTimes(times);
  }, [selectedDate, location, calcMethod, asrMethod, maghribOffset]);

  // Moon phase for the selected date
  const selectedMoon = useMemo<MoonPhaseInfo>(() => {
    const date = new Date(Date.UTC(selectedDate.y, selectedDate.m - 1, selectedDate.d, 12, 0, 0));
    return getMoonPhase(date);
  }, [selectedDate]);

  // Hijri date for the selected day (respects hijriAdjustment) — used as lunar day in moon popup
  const selectedHijri = useMemo(() => {
    const shifted = new Date(selectedDate.y, selectedDate.m - 1, selectedDate.d + (hijriAdjustment ?? 0));
    return gregorianToHijri(shifted.getFullYear(), shifted.getMonth() + 1, shifted.getDate());
  }, [selectedDate, hijriAdjustment]);

  // New moons for the lookup modal (independent from view month)
  const lookupNewMoons = useMemo(() => getNewMoonsForMonth(lookupYear, lookupMonth), [lookupYear, lookupMonth]);

  // For each conjunction in the lookup month, compute:
  //  • the expected crescent sighting date (next local evening after conjunction)
  //  • the observability window (sunset → estimated moonset) for that evening
  const lookupCrescentInfos = useMemo(() => {
    const offset = locationUtcOffset ?? 0;
    return lookupNewMoons.map(nm => {
      const crescentDate = getExpectedCrescentDate(nm, offset);
      // Compute sunset for the crescent evening (need location for prayer times)
      let sunset: Date | null = null;
      let moonset: Date | null = null;
      if (location) {
        const times = calculatePrayerTimes({
          lat: location.lat,
          lng: location.lng,
          date: crescentDate,
          method: calcMethod,
          asrMethod,
          maghribOffset,
        });
        const sunsetMs = (times.maghrib as Date).getTime();
        // At crescent sighting, moon is ~1–2 days old; each day adds ~50 min of visibility
        const moonsetMs = sunsetMs + 1.5 * 50 * 60 * 1000; // ≈ 75 min window
        sunset = new Date(sunsetMs);
        moonset = new Date(moonsetMs);
      }
      return { conjunction: nm, crescentDate, sunset, moonset };
    });
  }, [lookupNewMoons, location, locationUtcOffset, calcMethod, asrMethod, maghribOffset]);

  // ── Crescent help text (all 15 languages) ──────────────────────────────────
  const CRESCENT_HELP: Record<string, string> = {
    ar: 'هذه الأداة مخصصة لرصد هلال أول الشهر الهجري (رؤية الهلال)، وليست للأغراض الفلكية.\n\nيختلف وقت "القمر الجديد" الفلكي (المحاق) عن وقت رؤية الهلال؛ إذ يظل القمر غير مرئي أثناء الاقتران، ثم يظهر الهلال عادةً في مساء اليوم التالي.\n\nتُبيّن "نافذة الرصد" المدة الزمنية التي يمكن فيها رؤية الهلال بعد الغروب.',
    en: 'This tool is for Islamic crescent moon sighting (ruʾyat al-hilāl), not for astronomical purposes.\n\nThe "astronomical new moon" (conjunction) occurs when the moon is invisible. The crescent typically becomes visible the following evening.\n\nThe observability window shows the time after sunset during which the crescent may be seen.',
    fr: 'Cet outil est destiné à l\'observation islamique du croissant (ruʾyat al-hilāl), et non à des fins astronomiques.\n\nLa "nouvelle lune astronomique" (conjonction) se produit quand la lune est invisible. Le croissant devient généralement visible le soir suivant.\n\nLa fenêtre d\'observation indique la durée après le coucher du soleil pendant laquelle le croissant peut être aperçu.',
    es: 'Esta herramienta es para el avistamiento islámico de la luna creciente (ruʾyat al-hilāl), no para fines astronómicos.\n\nLa "luna nueva astronómica" (conjunción) ocurre cuando la luna es invisible. El creciente suele hacerse visible la tarde siguiente.\n\nLa ventana de observación indica el tiempo después del atardecer durante el cual se puede ver el creciente.',
    ru: 'Этот инструмент предназначен для исламского наблюдения серпа луны (руʾйат аль-хиляль), а не для астрономических целей.\n\n«Астрономическое новолуние» (соединение) происходит, когда луна невидима. Серп обычно становится виден следующим вечером.\n\nОкно наблюдаемости показывает время после захода солнца, в течение которого можно увидеть серп.',
    zh: '此工具用于伊斯兰新月目视（ruʾyat al-hilāl），而非天文用途。\n\n"天文新月"（合朔）发生时月亮不可见，新月通常在次日傍晚出现。\n\n可见窗口显示日落后可观察到新月的时间段。',
    tr: 'Bu araç, astronomi amaçlı değil, İslami hilal gözlemi (ruʾyet el-hilâl) için tasarlanmıştır.\n\n"Astronomik yeni ay" (kavuşum), ay görünmezken gerçekleşir. Hilal genellikle ertesi akşam görünür hale gelir.\n\nGözlemlenebilirlik penceresi, hilâlin günbatımından sonra görülebileceği süreyi gösterir.',
    ur: 'یہ ٹول اسلامی چاند کی رویت (رؤیت الہلال) کے لیے ہے، فلکیاتی مقاصد کے لیے نہیں۔\n\n"فلکیاتی نیا چاند" (اجتماع) اس وقت ہوتا ہے جب چاند نظر نہیں آتا۔ ہلال عموماً اگلی شام نظر آتا ہے۔\n\nمشاہدے کی کھڑکی غروبِ آفتاب کے بعد اس وقت کو ظاہر کرتی ہے جب ہلال نظر آ سکتا ہے۔',
    id: 'Alat ini digunakan untuk pengamatan hilal Islam (ruʾyat al-hilāl), bukan untuk tujuan astronomi.\n\n"Bulan baru astronomis" (konjungsi) terjadi saat bulan tidak terlihat. Hilal biasanya terlihat pada malam berikutnya.\n\nJendela keterlihatan menunjukkan waktu setelah matahari terbenam saat hilal dapat diamati.',
    bn: 'এই টুলটি ইসলামিক নতুন চাঁদ দেখার জন্য (রু\'ইয়াত আল-হিলাল), জ্যোতির্বিজ্ঞানগত উদ্দেশ্যে নয়।\n\n"জ্যোতির্বিজ্ঞানগত নতুন চাঁদ" (সংযোগ) তখন ঘটে যখন চাঁদ অদৃশ্য থাকে। হিলাল সাধারণত পরের সন্ধ্যায় দৃশ্যমান হয়।\n\nদৃশ্যমানতার জানালা সূর্যাস্তের পরে সেই সময় দেখায় যখন হিলাল দেখা যায়।',
    fa: 'این ابزار برای رویت هلال ماه اسلامی (رؤیت الهلال) طراحی شده، نه برای اهداف نجومی.\n\n«هلال نجومی» (اجتماع) زمانی رخ می‌دهد که ماه نامرئی است. هلال معمولاً شب بعد قابل رویت می‌شود.\n\nپنجره مشاهده‌پذیری زمانی پس از غروب آفتاب را نشان می‌دهد که در آن هلال قابل رویت است.',
    ms: 'Alat ini adalah untuk pemerhatian anak bulan Islam (ruʾyat al-hilāl), bukan untuk tujuan astronomi.\n\n"Bulan baru astronomi" (konjungsi) berlaku apabila bulan tidak kelihatan. Anak bulan biasanya kelihatan pada petang berikutnya.\n\nTingkap kebolehperhatiaan menunjukkan masa selepas matahari terbenam di mana anak bulan boleh dilihat.',
    pt: 'Esta ferramenta é para a observação islâmica da lua crescente (ruʾyat al-hilāl), não para fins astronômicos.\n\nA "lua nova astronômica" (conjunção) ocorre quando a lua está invisível. O crescente geralmente se torna visível na noite seguinte.\n\nA janela de observabilidade mostra o tempo após o pôr do sol durante o qual o crescente pode ser visto.',
    sw: 'Zana hii ni kwa ajili ya kutazama hilali ya Kiislamu (ruʾyat al-hilāl), si kwa madhumuni ya astronomia.\n\n"Mwezi mpya wa kimaumbile" (muunganiko) hutokea mwezi unapokuwa haionekani. Hilali kwa kawaida huonekana jioni inayofuata.\n\nDirisha la kuonekana linaonyesha muda baada ya jua kutua ambapo hilali inaweza kuonekana.',
    ha: 'Wannan kayan aiki ne don ganin watan Islama (ruʾyat al-hilāl), ba don dalilan ilimin taurari ba.\n\n"Sabon wata na taurari" (haɗuwa) yana faruwa lokacin da wata bai bayyane ba. Hilal yawanci yana bayyana yammacin ranar da ta biyo baya.\n\nTaga kallo tana nuna lokacin bayan faɗuwar rana da za a iya ganin hilal.',
  };

  const MOON_PHASE_HELP: Record<string, string> = {
    ar: 'يُظهر طور القمر مقدار إضاءة القمر وشكله في التاريخ المحدد.\n\nتستغرق الدورة القمرية نحو 29.5 يومًا، وهي أساس التقويم الهجري الإسلامي. يبدأ كل شهر هجري بالمحاق (🌑) ويكون القمر بدرًا (🌕) حول اليوم الخامس عشر.\n\nتُشير نسبة الإضاءة إلى المقدار المضاء من وجه القمر.',
    en: 'Shows the moon\'s illumination and phase for any selected date.\n\nThe 29.5-day lunar cycle is the basis of the Islamic Hijri calendar — each month begins at the New Moon (🌑) and the Full Moon (🌕) falls around the 15th of the Hijri month.\n\nThe illumination percentage shows how much of the moon\'s face is lit.',
    fr: 'Affiche l\'illumination et la phase de la lune pour toute date sélectionnée.\n\nLe cycle lunaire de 29,5 jours est la base du calendrier hijri islamique — chaque mois commence à la Nouvelle Lune (🌑) et la Pleine Lune (🌕) tombe vers le 15 du mois hijri.\n\nLe pourcentage d\'illumination indique quelle fraction du visage de la lune est éclairée.',
    es: 'Muestra la iluminación y fase de la luna para cualquier fecha seleccionada.\n\nEl ciclo lunar de 29,5 días es la base del calendario Hijri islámico — cada mes comienza en la Luna Nueva (🌑) y la Luna Llena (🌕) cae alrededor del día 15 del mes Hijri.\n\nEl porcentaje de iluminación indica qué fracción de la cara de la luna está iluminada.',
    ru: 'Показывает освещённость и фазу луны для выбранной даты.\n\n29,5-дневный лунный цикл лежит в основе исламского лунного календаря — каждый месяц начинается с новолуния (🌑), а полнолуние (🌕) приходится примерно на 15-й день месяца по хиджре.\n\nПроцент освещённости показывает, какая часть лунного диска освещена.',
    zh: '显示所选日期的月相和月面照明比例。\n\n29.5天的月球周期是伊斯兰历（回历）的基础——每月从新月（🌑）开始，满月（🌕）约在回历每月第15天。\n\n照明百分比显示月面被照亮的比例。',
    tr: 'Seçilen tarih için ayın aydınlanmasını ve evresini gösterir.\n\n29,5 günlük ay döngüsü, İslam Hicri takviminin temelidir — her ay Yeni Ay\'da (🌑) başlar ve Dolunay (🌕) Hicri ayın yaklaşık 15. gününe denk gelir.\n\nAydınlanma yüzdesi, ay yüzeyinin ne kadarının aydınlatıldığını gösterir.',
    ur: 'کسی بھی منتخب تاریخ کے لیے چاند کی روشنی اور مرحلہ دکھاتا ہے۔\n\n29.5 دن کا چاند کا چکر اسلامی ہجری کیلنڈر کی بنیاد ہے — ہر مہینہ نئے چاند (🌑) سے شروع ہوتا ہے اور پورا چاند (🌕) ہجری مہینے کی تقریباً 15 تاریخ کو ہوتا ہے۔\n\nروشنی کا فیصد ظاہر کرتا ہے کہ چاند کا کتنا حصہ روشن ہے۔',
    id: 'Menampilkan iluminasi dan fase bulan untuk tanggal yang dipilih.\n\nSiklus bulan 29,5 hari merupakan dasar kalender Hijriyah Islam — setiap bulan dimulai saat Bulan Baru (🌑) dan Bulan Purnama (🌕) jatuh sekitar tanggal 15 bulan Hijriyah.\n\nPersentase iluminasi menunjukkan seberapa besar bagian wajah bulan yang bersinar.',
    bn: 'যেকোনো নির্বাচিত তারিখের জন্য চাঁদের আলো এবং পর্যায় দেখায়।\n\n২৯.৫ দিনের চন্দ্র চক্র ইসলামিক হিজরি ক্যালেন্ডারের ভিত্তি — প্রতি মাস নতুন চাঁদে (🌑) শুরু হয় এবং পূর্ণিমা (🌕) হিজরি মাসের প্রায় ১৫ তারিখে পড়ে।\n\nআলোক শতাংশ দেখায় চাঁদের মুখের কত অংশ আলোকিত।',
    fa: 'روشنایی و فاز ماه را برای هر تاریخ انتخاب‌شده نشان می‌دهد.\n\nچرخه ۲۹.۵ روزه ماه، پایه تقویم هجری اسلامی است — هر ماه با ماه نو (🌑) آغاز می‌شود و ماه کامل (🌕) حدود روز پانزدهم ماه هجری قمع می‌افتد.\n\nدرصد روشنایی نشان می‌دهد چه مقدار از صورت ماه روشن است.',
    ms: 'Menunjukkan pencahayaan dan fasa bulan untuk sebarang tarikh yang dipilih.\n\nKitar bulan 29.5 hari adalah asas kalendar Hijri Islam — setiap bulan bermula pada Bulan Baru (🌑) dan Bulan Purnama (🌕) jatuh sekitar hari ke-15 bulan Hijri.\n\nPeratus pencahayaan menunjukkan berapa banyak wajah bulan yang diterangi.',
    pt: 'Mostra a iluminação e a fase da lua para qualquer data selecionada.\n\nO ciclo lunar de 29,5 dias é a base do calendário islâmico Hijri — cada mês começa na Lua Nova (🌑) e a Lua Cheia (🌕) cai por volta do dia 15 do mês Hijri.\n\nA porcentagem de iluminação mostra quanto do rosto da lua está iluminado.',
    sw: 'Inaonyesha mwanga na awamu ya mwezi kwa tarehe yoyote iliyochaguliwa.\n\nMzunguko wa siku 29.5 wa mwezi ndio msingi wa kalenda ya Kiislamu ya Hijri — kila mwezi huanza wakati wa Mwezi Mpya (🌑) na Mwezi Kamili (🌕) huangukia karibu na siku ya 15 ya mwezi wa Hijri.\n\nAsilimia ya mwanga inaonyesha kiasi gani cha uso wa mwezi kinachong\'aa.',
    ha: 'Yana nuna haske da matakin wata ga kowace kwanan da aka zaɓa.\n\nDawowar yini 29.5 na wata ita ce tushen kalandar Hijri ta Musulunci — kowane wata yana farawa da Sabon Wata (🌑) kuma Cikakken Wata (🌕) yana faɗuwa kusan ranar 15 ta wata na Hijri.\n\nKashi na haske yana nuna yawan fuskar wata da ke haskakawa.',
  };
  // If the selected date is a conjunction day, find the exact UTC moment (for showing time in popup)
  const selectedDateNewMoon = useMemo(() => {
    const nms = getNewMoonsForMonth(selectedDate.y, selectedDate.m);
    const offset = locationUtcOffset ?? 0;
    return nms.find(nm => {
      const local = new Date(nm.getTime() + offset * 3600 * 1000);
      return local.getUTCDate() === selectedDate.d;
    }) ?? null;
  }, [selectedDate, locationUtcOffset]);

  // For the first visible crescent (New Crescent phase), compute the observability window:
  // visible from sunset (Maghrib) to approximate moonset (sunset + ageInDays × 50 min)
  const crescentWindow = useMemo(() => {
    const isNewCrescent = selectedMoon.phase >= 0.033 && selectedMoon.phase < 0.10;
    if (!isNewCrescent || !prayerTimes) return null;
    const sunsetMs = (prayerTimes.maghrib as Date).getTime();
    const moonsetMs = sunsetMs + selectedMoon.ageInDays * 50 * 60 * 1000;
    return { sunset: new Date(sunsetMs), moonset: new Date(moonsetMs) };
  }, [selectedMoon, prayerTimes]);

  // Calendar grid computation
  const calendarDays = useMemo(() => {
    const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
    const daysInMonth = getDaysInGregorianMonth(viewYear, viewMonth);
    const cells: Array<{ day: number | null; hijri: { d: number; m: number } | null; moonEmoji: string }> = [];

    for (let i = 0; i < firstDay; i++) {
      cells.push({ day: null, hijri: null, moonEmoji: '' });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const shifted = new Date(viewYear, viewMonth - 1, d + (hijriAdjustment ?? 0));
      const h = gregorianToHijri(shifted.getFullYear(), shifted.getMonth() + 1, shifted.getDate());
      cells.push({ day: d, hijri: { d: h.day, m: h.month }, moonEmoji: moonEmojiForDay(viewYear, viewMonth, d) });
    }
    return cells;
  }, [viewYear, viewMonth, hijriAdjustment]);

  const goToPrevMonth = () => {
    Haptics.selectionAsync();
    if (viewMonth === 1) { setViewYear(y => y - 1); setViewMonth(12); }
    else setViewMonth(m => m - 1);
  };
  const goToNextMonth = () => {
    Haptics.selectionAsync();
    if (viewMonth === 12) { setViewYear(y => y + 1); setViewMonth(1); }
    else setViewMonth(m => m + 1);
  };
  const goToToday = () => {
    Haptics.selectionAsync();
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth() + 1);
    setSelectedDate({ y: today.getFullYear(), m: today.getMonth() + 1, d: today.getDate() });
  };

  const isToday = (d: number) =>
    d === today.getDate() && viewMonth === today.getMonth() + 1 && viewYear === today.getFullYear();

  const isSelected = (d: number) =>
    d === selectedDate.d && viewMonth === selectedDate.m && viewYear === selectedDate.y;

  const monthName = isAr ? GREGORIAN_MONTHS_AR[viewMonth - 1] : GREGORIAN_MONTHS_EN[viewMonth - 1];
  const dayNames = isAr ? DAYS_AR : DAYS_EN;

  const PRAYER_ORDER: (keyof PrayerTimesType)[] = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
  const prayerLabels: Record<string, string> = {
    fajr: tr.fajr, sunrise: tr.sunrise, dhuhr: tr.dhuhr,
    asr: tr.asr, maghrib: tr.maghrib, isha: tr.isha,
  };

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <PageBackground />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { paddingTop: topInset + 10, paddingBottom: 12 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <View style={[styles.header, { marginBottom: 2 }]}>
            <View style={{ flex: 1, flexDirection: 'row', gap: 8 }}>
              <ThemeToggle />
              <LangToggle />
            </View>
            <AppLogo tintColor={C.tint} lang={lang} />
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
              <Pressable
                onPress={goToToday}
                style={[styles.todayBtn, { backgroundColor: C.backgroundCard }]}
              >
                <Text style={[styles.todayBtnText, { color: C.tint }]}>
                  {tr.today}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Font sizer row */}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 2 }}>
            <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
              <Pressable
                onPress={() => { if (calCanDecrease) { Haptics.selectionAsync(); setCalFontSize(CAL_STEP_ORDER[calFsIdx - 1]); } }}
                disabled={!calCanDecrease}
                style={[styles.fontPill, { backgroundColor: C.backgroundSecond, opacity: calCanDecrease ? 1 : 0.3 }]}
              >
                <Text style={[styles.fontPillLabel, { color: C.textMuted }]}>A−</Text>
              </Pressable>
              <Text style={{ fontSize: 11, color: C.textMuted, minWidth: 28, textAlign: 'center', fontFamily: 'Inter_600SemiBold' }}>
                {CAL_SIZE_LABELS[calFontSize]}
              </Text>
              <Pressable
                onPress={() => { if (calCanIncrease) { Haptics.selectionAsync(); setCalFontSize(CAL_STEP_ORDER[calFsIdx + 1]); } }}
                disabled={!calCanIncrease}
                style={[styles.fontPill, { backgroundColor: C.backgroundSecond, opacity: calCanIncrease ? 1 : 0.3 }]}
              >
                <Text style={[styles.fontPillLabel, { color: C.textMuted, fontSize: 14 }]}>A+</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Month navigation */}
        <View style={[styles.monthNav, { paddingHorizontal: 16, flexDirection: isAr ? 'row-reverse' : 'row' }]}>
          <Pressable onPress={goToPrevMonth} style={[styles.arrowBtn, { backgroundColor: C.backgroundCard }]}>
            <Ionicons name={isAr ? 'chevron-forward' : 'chevron-back'} size={20} color={C.tint} />
          </Pressable>
          <View style={styles.monthCenter}>
            <Text style={[styles.monthName, { color: C.text, fontFamily: isAr ? 'Amiri_700Bold' : SERIF_EN, fontSize: cFS.month }]}>
              {monthName} {isAr ? toArabicIndic(viewYear) : viewYear}
            </Text>
            <Text style={[styles.hijriMonthLabel, { color: C.tint }]}>
              {(() => {
                const s1 = new Date(viewYear, viewMonth - 1, 1 + (hijriAdjustment ?? 0));
                const s2 = new Date(viewYear, viewMonth - 1, getDaysInGregorianMonth(viewYear, viewMonth) + (hijriAdjustment ?? 0));
                const h1 = gregorianToHijri(s1.getFullYear(), s1.getMonth() + 1, s1.getDate());
                const h2 = gregorianToHijri(s2.getFullYear(), s2.getMonth() + 1, s2.getDate());
                const m1 = hijriMonthName(h1.month, lang);
                const m2 = hijriMonthName(h2.month, lang);
                const yr = h1.month !== h2.month
                  ? `${m1} – ${m2} ${isAr ? toArabicIndic(h2.year) : h2.year} هـ`
                  : `${m1} ${isAr ? toArabicIndic(h1.year) : h1.year} ${isAr ? 'هـ' : 'AH'}`;
                return yr;
              })()}
            </Text>
          </View>
          <Pressable onPress={goToNextMonth} style={[styles.arrowBtn, { backgroundColor: C.backgroundCard }]}>
            <Ionicons name={isAr ? 'chevron-back' : 'chevron-forward'} size={20} color={C.tint} />
          </Pressable>
        </View>

        {/* Day headers */}
        <View style={[styles.dayHeaderRow, { paddingHorizontal: 16, flexDirection: isAr ? 'row-reverse' : 'row' }]}>
          {dayNames.map((d, i) => {
            const isFri = isAr ? i === 5 : i === 5;
            return (
              <View key={i} style={styles.dayHeaderCell}>
                <Text style={[styles.dayHeaderText, {
                  color: isFri ? C.tint : C.textMuted,
                  fontFamily: isAr ? 'Amiri_400Regular' : SERIF_EN,
                }]}>
                  {d}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Calendar grid */}
        <View style={[styles.grid, { paddingHorizontal: 16, flexDirection: isAr ? 'row-reverse' : 'row' }]}>
          {calendarDays.map((cell, idx) => {
            if (!cell.day) {
              return <View key={`empty-${idx}`} style={styles.cell} />;
            }
            const tod = isToday(cell.day);
            const sel = isSelected(cell.day);
            const isFriday = (getFirstDayOfMonth(viewYear, viewMonth) + cell.day - 1) % 7 === 5;
            return (
              <Pressable
                key={cell.day}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedDate({ y: viewYear, m: viewMonth, d: cell.day! });
                }}
                style={[
                  styles.cell,
                  sel && { backgroundColor: C.tint, borderRadius: 12 },
                  tod && !sel && { borderWidth: 1.5, borderColor: C.tint, borderRadius: 12 },
                ]}
              >
                <Text style={[styles.cellDay, {
                  color: sel ? C.tintText : tod ? C.tint : isFriday ? C.tint : C.text,
                  fontWeight: sel || tod ? '700' : fw,
                  fontSize: cFS.cell,
                }]}>
                  {isAr ? toArabicIndic(cell.day) : cell.day}
                </Text>
                {cell.hijri && (
                  <Text style={[styles.cellHijri, {
                    color: sel ? 'rgba(255,255,255,0.8)' : C.textMuted,
                    fontWeight: fw,
                    fontSize: cFS.hijri,
                  }]}>
                    {isAr ? toArabicIndic(cell.hijri.d) : cell.hijri.d}
                  </Text>
                )}
                <Text style={styles.cellMoon}>{cell.moonEmoji}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Moon tools — two rows, each with its own ? button */}
        <View style={{ paddingHorizontal: 16, marginBottom: 10, gap: 6 }}>
          {/* Row 1: Moon Phase */}
          <View style={{ flexDirection: isAr ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
            <Pressable
              onPress={() => { Haptics.selectionAsync(); setShowMoonDetail(true); }}
              style={({ pressed }) => [styles.newMoonBtn, { flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)', opacity: pressed ? 0.7 : 1 }]}
            >
              <Text style={{ fontSize: 14 }}>{selectedMoon.emoji}</Text>
              <Text style={[styles.newMoonBtnText, { color: C.textSecond, fontFamily: isAr ? 'Amiri_400Regular' : SERIF_EN }]}>
                {isAr ? 'طور القمر' : 'Moon Phase'}
              </Text>
              <Ionicons name={isAr ? 'chevron-back' : 'chevron-forward'} size={14} color={C.textMuted} />
            </Pressable>
          </View>

          {/* Row 2: Crescent Sighting */}
          <View style={{ flexDirection: isAr ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
            <Pressable
              onPress={() => { Haptics.selectionAsync(); setShowNewMoonLookup(true); }}
              style={({ pressed }) => [styles.newMoonBtn, { flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)', opacity: pressed ? 0.7 : 1 }]}
            >
              <Text style={{ fontSize: 14 }}>🌒</Text>
              <Text style={[styles.newMoonBtnText, { color: C.textSecond, fontFamily: isAr ? 'Amiri_400Regular' : SERIF_EN }]}>
                {isAr ? 'رصد الهلال' : 'Crescent Sighting'}
              </Text>
              <Ionicons name={isAr ? 'chevron-back' : 'chevron-forward'} size={14} color={C.textMuted} />
            </Pressable>
          </View>
        </View>

        {/* Prayer times for selected date */}
        {location ? (
          <View style={[styles.prayerSection, { paddingHorizontal: 16 }]}>
            <Text style={[styles.sectionTitle, {
              color: C.textSecond,
              fontFamily: isAr ? 'Amiri_400Regular' : SERIF_EN,
              textAlign: isAr ? 'right' : 'left',
            }]}>
              {isAr ? 'أوقات الصلاة' : 'Prayer Times'}
            </Text>
            <View style={[styles.prayerCard, { backgroundColor: isDark ? 'rgba(44,44,46,0.15)' : 'rgba(255,255,255,0.15)' }]}>
              {PRAYER_ORDER.map((key) => (
                <React.Fragment key={key}>
                  <View>
                    <View style={[styles.prayerRow, { flexDirection: isAr ? 'row-reverse' : 'row' }]}>
                      <View style={[styles.prayerLeft, { flexDirection: isAr ? 'row-reverse' : 'row' }]}>
                        <MaterialCommunityIcons
                          name={PRAYER_ICONS[key] as any}
                          size={17} color={C.tint}
                        />
                        <Text style={[styles.prayerName, {
                          color: C.text,
                          fontWeight: fw,
                          fontFamily: isAr ? 'Amiri_400Regular' : SERIF_EN,
                          fontSize: isAr ? cFS.prayer + 2 : cFS.prayer,
                        }]}>
                          {prayerLabels[key]}
                        </Text>
                      </View>
                      <Text style={[styles.prayerTime, { color: C.textSecond, fontWeight: fw, fontSize: cFS.prayer }]}>
                        {prayerTimes ? formatTimeAtOffset(prayerTimes[key], locationUtcOffset) : '—'}
                      </Text>
                    </View>
                    <View style={[styles.rowDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)' }]} />
                  </View>
                </React.Fragment>
              ))}
            </View>
          </View>
        ) : (
          <View style={[styles.noLocation, { paddingHorizontal: 16 }]}>
            <Ionicons name="location-outline" size={32} color={C.textMuted} />
            <Text style={[styles.noLocationText, { color: C.textMuted, fontWeight: fw, fontFamily: isAr ? 'Amiri_400Regular' : SERIF_EN }]}>
              {isAr ? 'يرجى تحديد الموقع لعرض أوقات الصلاة' : 'Set your location to see prayer times'}
            </Text>
          </View>
        )}


      </ScrollView>

      {/* Moon Detail Modal */}
      <Modal visible={showMoonDetail} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShowMoonDetail(false)}>
          <Pressable style={[styles.modalSheet, { backgroundColor: C.backgroundCard }]} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            <View style={{ flexDirection: isAr ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
              <Text style={[styles.modalTitle, { color: C.text, fontFamily: isAr ? 'Amiri_700Bold' : SERIF_EN, marginBottom: 0 }]}>
                {isAr ? 'تفاصيل طور القمر' : 'Moon Phase Details'}
              </Text>
              <Pressable onPress={() => { Haptics.selectionAsync(); Alert.alert(isAr ? 'مراحل القمر' : 'Moon Phase', MOON_PHASE_HELP[lang] ?? MOON_PHASE_HELP['en']); }} hitSlop={8}>
                <MaterialCommunityIcons name="help-circle-outline" size={18} color={C.textMuted} />
              </Pressable>
            </View>
            <Text style={styles.modalEmoji}>{selectedMoon.emoji}</Text>
            <Text style={[styles.modalPhaseName, { color: C.text }]}>
              {isAr ? selectedMoon.nameAr : selectedMoon.name}
            </Text>
            <View style={[styles.modalDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.1)' }]} />

            {/* Stats */}
            {[
              {
                label: isAr ? 'الإضاءة' : 'Illumination',
                value: `${selectedMoon.illumination}%`,
                icon: 'sunny-outline',
              },
              {
                label: isAr ? 'يوم الشهر الهجري' : 'Hijri Day',
                value: isAr ? `اليوم ${selectedHijri.day}` : `Day ${selectedHijri.day}`,
                icon: 'calendar-outline',
              },
              ...(location ? [{
                label: isAr ? 'المنطقة' : 'Territory',
                value: location.city && location.country
                  ? `${location.city}, ${location.country}`
                  : location.city ?? location.country
                    ?? `${location.lat.toFixed(2)}°, ${location.lng.toFixed(2)}°`,
                icon: 'location-outline',
              }] : []),
              ...(selectedDateNewMoon ? [{
                label: isAr ? 'وقت الاقتران (محلي)' : 'Conjunction Time (local)',
                value: formatNewMoonLocal(selectedDateNewMoon, locationUtcOffset),
                icon: 'time-outline',
              }] : []),
              ...(crescentWindow ? [{
                label: isAr ? 'نافذة رؤية الهلال' : 'Crescent Visibility',
                value: `${formatTimeAtOffset(crescentWindow.sunset, locationUtcOffset)} – ${formatTimeAtOffset(crescentWindow.moonset, locationUtcOffset)}`,
                icon: 'eye-outline',
              }] : []),
              {
                label: isAr ? 'المرحلة' : 'Phase Value',
                value: `${(selectedMoon.phase * 100).toFixed(1)}%`,
                icon: 'analytics-outline',
              },
              {
                label: isAr ? 'التاريخ المختار' : 'Selected Date',
                value: `${selectedDate.d}/${selectedDate.m}/${selectedDate.y}`,
                icon: 'today-outline',
              },
            ].map((item, i, arr) => (
              <View key={i} style={[styles.modalStatRow, { borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', borderBottomWidth: i < arr.length - 1 ? StyleSheet.hairlineWidth : 0, flexDirection: isAr ? 'row-reverse' : 'row' }]}>
                <Ionicons name={item.icon as any} size={18} color={C.tint} />
                <Text style={[styles.modalStatLabel, { color: C.textMuted }]}>{item.label}</Text>
                <Text style={[styles.modalStatValue, { color: C.text }]}>{item.value}</Text>
              </View>
            ))}

            {/* Lunar significance */}
            <View style={[styles.significanceBox, { backgroundColor: C.tint + '14' }]}>
              <Text style={[styles.significanceText, { color: C.textSecond, fontFamily: isAr ? 'Amiri_400Regular' : SERIF_EN }]}>
                {selectedMoon.phase < 0.033 || selectedMoon.phase > 0.967
                  ? (isAr ? '🌑 المحاق — القمر في الاقتران، غير مرئي، يبدأ الشهر الهجري' : '🌑 Conjunction — moon invisible (Astronomical New Moon), Hijri month begins')
                  : selectedMoon.phase < 0.10
                  ? (isAr ? '🌒 هلال جديد — أول ظهور للقمر بعد المحاق، يُرى عند الغروب' : '🌒 New Crescent — first visible after conjunction, seen just after sunset')
                  : selectedMoon.phase < 0.275
                  ? (isAr ? '🌒 الهلال — القمر في طور التزايد المبكر' : '🌒 Waxing Crescent — moon growing in early phase')
                  : selectedMoon.phase < 0.475
                  ? (isAr ? '🌔 الأحدب المتزايد — القمر يكتمل تدريجيًا' : '🌔 Waxing Gibbous — moon filling up toward full')
                  : selectedMoon.phase < 0.525
                  ? (isAr ? '🌕 البدر — ليالي البيض (١٣–١٤–١٥)' : '🌕 Full Moon — the White Nights (13–14–15)')
                  : selectedMoon.phase < 0.725
                  ? (isAr ? '🌖 الأحدب المتناقص — القمر يتناقص تدريجيًا' : '🌖 Waning Gibbous — moon decreasing after full')
                  : selectedMoon.phase < 0.775
                  ? (isAr ? '🌗 التربيع الثاني — نصف القمر مضيء في المرحلة الأخيرة' : '🌗 Last Quarter — half moon in final phase')
                  : (isAr ? '🌘 هلال آخر الشهر — اقتراب المحاق' : '🌘 Waning Crescent — approaching conjunction')}
              </Text>
            </View>

            <Pressable onPress={() => setShowMoonDetail(false)} style={[styles.modalClose, { backgroundColor: C.tint }]}>
              <Text style={[styles.modalCloseText, { color: C.tintText }]}>{isAr ? 'إغلاق' : 'Close'}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Crescent Sighting Lookup Modal */}
      <Modal visible={showNewMoonLookup} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShowNewMoonLookup(false)}>
          <Pressable style={[styles.modalSheet, { backgroundColor: C.backgroundCard }]} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            <View style={{ flexDirection: isAr ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
              <Text style={[styles.modalTitle, { color: C.text, fontFamily: isAr ? 'Amiri_700Bold' : SERIF_EN, marginBottom: 0 }]}>
                {isAr ? '🌒 رصد الهلال' : '🌒 Crescent Sighting Lookup'}
              </Text>
              <Pressable onPress={() => { Haptics.selectionAsync(); Alert.alert(isAr ? 'الهلال الجديد' : 'New Crescent Moon', CRESCENT_HELP[lang] ?? CRESCENT_HELP['en']); }} hitSlop={8}>
                <MaterialCommunityIcons name="help-circle-outline" size={18} color={C.textMuted} />
              </Pressable>
            </View>

            {/* Month / year navigation */}
            <View style={[styles.nmMonthNav, { flexDirection: 'row' }]}>
              <Pressable
                onPress={() => { Haptics.selectionAsync(); if (lookupMonth === 1) { setLookupYear(y => y - 1); setLookupMonth(12); } else setLookupMonth(m => m - 1); }}
                style={styles.nmNavBtn}
              >
                <Ionicons name="chevron-back" size={22} color={C.tint} />
              </Pressable>
              <Text style={[styles.nmMonthLabel, { color: C.text }]}>
                {(isAr ? GREGORIAN_MONTHS_AR : GREGORIAN_MONTHS_EN)[lookupMonth - 1]} {lookupYear}
              </Text>
              <Pressable
                onPress={() => { Haptics.selectionAsync(); if (lookupMonth === 12) { setLookupYear(y => y + 1); setLookupMonth(1); } else setLookupMonth(m => m + 1); }}
                style={styles.nmNavBtn}
              >
                <Ionicons name="chevron-forward" size={22} color={C.tint} />
              </Pressable>
            </View>

            {/* Crescent results */}
            <View style={[styles.nmResultBox, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
              {lookupCrescentInfos.length === 0 ? (
                <Text style={[styles.moonSub, { color: C.textMuted, textAlign: 'center', padding: 16 }]}>
                  {isAr ? 'لا يوجد هلال هذا الشهر' : 'No crescent sighting expected this month'}
                </Text>
              ) : (
                lookupCrescentInfos.map((info, i) => {
                  const months = isAr ? GREGORIAN_MONTHS_AR : GREGORIAN_MONTHS_EN;
                  const cDate = new Date(info.crescentDate.getTime() + (locationUtcOffset ?? 0) * 3600 * 1000);
                  const crescentLabel = `${months[cDate.getUTCMonth()]} ${cDate.getUTCDate()}, ${cDate.getUTCFullYear()}`;
                  return (
                    <View key={i} style={[styles.nmRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)', marginTop: 14, paddingTop: 14 }]}>

                      {/* Primary: expected crescent date */}
                      <Text style={{ fontSize: 36, marginBottom: 6 }}>🌒</Text>
                      <Text style={[styles.nmCrescentLabel, { color: C.textMuted, fontFamily: isAr ? 'Amiri_400Regular' : SERIF_EN }]}>
                        {isAr ? 'موعد رؤية الهلال المتوقع' : 'Expected Crescent Sighting'}
                      </Text>
                      <Text style={[styles.nmDateTime, { color: C.text, marginBottom: 8 }]}>
                        {crescentLabel}
                      </Text>

                      {/* Observability window (sunset → moonset) */}
                      {info.sunset && info.moonset ? (
                        <View style={[styles.nmTimeChip, { backgroundColor: C.tint + '22', marginBottom: 12 }]}>
                          <Ionicons name="eye-outline" size={13} color={C.tint} />
                          <Text style={[styles.nmTimeText, { color: C.tint }]}>
                            {isAr
                              ? `نافذة الرصد: ${formatTimeAtOffset(info.sunset, locationUtcOffset)} – ${formatTimeAtOffset(info.moonset, locationUtcOffset)}`
                              : `Look: ${formatTimeAtOffset(info.sunset, locationUtcOffset)} – ${formatTimeAtOffset(info.moonset, locationUtcOffset)}`}
                          </Text>
                        </View>
                      ) : null}

                      {/* Secondary: astronomical conjunction (reference) */}
                      <View style={[styles.nmConjRow, { borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                        <Text style={{ fontSize: 13 }}>🌑</Text>
                        <Text style={[styles.nmConjLabel, { color: C.textMuted }]}>
                          {isAr
                            ? `الاقتران الفلكي: ${formatNewMoonDate(info.conjunction, locationUtcOffset)} — ${formatNewMoonLocal(info.conjunction, locationUtcOffset)}`
                            : `Conjunction (ref): ${formatNewMoonDate(info.conjunction, locationUtcOffset)}, ${formatNewMoonLocal(info.conjunction, locationUtcOffset)}`}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>

            <Pressable onPress={() => setShowNewMoonLookup(false)} style={[styles.modalClose, { backgroundColor: C.tint }]}>
              <Text style={[styles.modalCloseText, { color: C.tintText }]}>{isAr ? 'إغلاق' : 'Close'}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Dua — fixed footer */}
      <View style={[styles.duaRow, { paddingBottom: bottomInset + 62 }]}>
        <Text style={[styles.dua, { color: C.textMuted, fontWeight: fw, fontFamily: 'Amiri_400Regular' }]}>
          {tr.dua}
        </Text>
        <Text style={[styles.freeApp, { color: C.textMuted, fontWeight: fw }]}>
          {tr.freeApp}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { gap: 0 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 16,
  },
  fontPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignItems: 'center' },
  fontPillLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.2 },
  appNameSmall: { fontSize: 11, fontWeight: '700', letterSpacing: 2.5, marginBottom: 3 },
  screenTitle: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  todayBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, marginTop: 4,
  },
  todayBtnText: { fontSize: 13, fontWeight: '600' },
  iconBtn: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 4,
  },
  monthNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 12,
  },
  arrowBtn: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  monthCenter: { alignItems: 'center', flex: 1 },
  monthName: { fontSize: 18, fontWeight: '700' },
  hijriMonthLabel: { fontSize: 12, marginTop: 2 },
  dayHeaderRow: { flexDirection: 'row', marginBottom: 4 },
  dayHeaderCell: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  dayHeaderText: { fontSize: 11, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  cell: { width: `${100 / 7}%`, paddingVertical: 6, alignItems: 'center' },
  cellDay: { fontSize: 14 },
  cellHijri: { fontSize: 9, marginTop: 1 },
  prayerSection: { gap: 6, marginBottom: 16 },
  sectionTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  prayerCard: { borderRadius: 16, overflow: 'hidden' },
  prayerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 11,
  },
  rowDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
  prayerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  prayerName: { fontSize: 14 },
  prayerTime: { fontSize: 14, fontVariant: ['tabular-nums'] },
  noLocation: { alignItems: 'center', gap: 8, paddingVertical: 20, marginBottom: 16 },
  noLocationText: { fontSize: 14, textAlign: 'center' },
  duaRow: { alignItems: 'center', paddingHorizontal: 24, gap: 4 },
  dua: { fontSize: 13, textAlign: 'center' },
  freeApp: { fontSize: 10, textAlign: 'center', opacity: 0.6, letterSpacing: 0.2 },
  cellMoon: { fontSize: 7, marginTop: 1, lineHeight: 9 },

  // Moon phase section
  moonSection: { gap: 6, marginBottom: 16 },
  moonCard: { borderRadius: 16, overflow: 'hidden', paddingHorizontal: 16, paddingVertical: 12 },
  moonCardMain: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  moonEmojiBig: { fontSize: 32 },
  moonName: { fontSize: 15 },
  moonSub: { fontSize: 12, marginTop: 2 },
  newMoonRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  newMoonDate: { fontSize: 15 },

  // Moon detail modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  modalSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 12, paddingHorizontal: 24, paddingBottom: 40,
    gap: 0,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(120,120,128,0.3)',
    alignSelf: 'center', marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  modalEmoji: { fontSize: 56, textAlign: 'center', marginBottom: 8 },
  modalPhaseName: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 16 },
  modalDivider: { height: StyleSheet.hairlineWidth, marginBottom: 8 },
  modalStatRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12,
  },
  modalStatLabel: { flex: 1, fontSize: 14 },
  modalStatValue: { fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] },
  significanceBox: { borderRadius: 12, padding: 14, marginTop: 12, marginBottom: 4 },
  significanceText: { fontSize: 14, lineHeight: 21, textAlign: 'center' },
  modalClose: {
    borderRadius: 16, paddingVertical: 14,
    alignItems: 'center', marginTop: 12,
  },
  modalCloseText: { fontSize: 16, fontWeight: '700' },

  // Moon phase chip (inline with prayer section header)
  moonChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20,
  },
  moonChipLabel: { fontSize: 12, fontWeight: '600' },

  // New Moon Lookup button (compact)
  newMoonBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
  },
  newMoonBtnText: { flex: 1, fontSize: 12 },

  // New Moon Lookup modal elements
  nmMonthNav: {
    alignItems: 'center', justifyContent: 'space-between',
    marginVertical: 12,
  },
  nmNavBtn: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  nmMonthLabel: { fontSize: 17, fontWeight: '700', flex: 1, textAlign: 'center' },
  nmResultBox: {
    borderRadius: 14, borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16, paddingVertical: 12, marginBottom: 8,
    alignItems: 'center',
  },
  nmRow: { alignItems: 'center', width: '100%' },
  nmDateTime: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  nmTimeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: 2,
  },
  nmTimeText: { fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] },

  // Crescent sighting lookup extras
  nmCrescentLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  nmConjRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, marginTop: 4, width: '100%',
  },
  nmConjLabel: { fontSize: 12, flex: 1, fontVariant: ['tabular-nums'] },

});
