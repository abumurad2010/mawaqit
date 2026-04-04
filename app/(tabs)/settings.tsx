import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform, Modal, Switch,
  Alert, Linking,
} from 'react-native';
import { gregorianToHijri } from '@/lib/hijri';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import Colors from '@/constants/colors';
import type { AccessibilityTheme } from '@/constants/colors';
import { useApp, getDefaultIqamaOffsets } from '@/contexts/AppContext';
import type { PrayerNotifConfig } from '@/contexts/AppContext';
import TimeRoller from '@/components/TimeRoller';
import { t, LANG_META, isRtlLang, detectSecondLang } from '@/constants/i18n';
import type { CalcMethod, AsrMethod } from '@/lib/prayer-times';
import { ALL_CALC_METHODS, getMethodForCountry } from '@/lib/method-by-country';
import { playAthan, stopAthan } from '@/lib/audio';
import { getPreviousTab } from '@/lib/prev-tab';
import AppLogo from '@/components/AppLogo';
import ThemeToggle from '@/components/ThemeToggle';
import LangToggle from '@/components/LangToggle';
import type { SecondLang } from '@/contexts/AppContext';
const SANS = 'Inter_400Regular';
const SANS_MD = 'Inter_500Medium';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const {
    isDark, lang, secondLang, resolvedSecondLang, calcMethod, asrMethod, maghribBase, countryCode,
    maghribAdjustment, hijriAdjustment, accessibilityTheme,
    firstAdhanOffset, prayerNotifications, colors,
    dhuhaTime, tahajjudTime, showDhuha, showQiyam, eidPrayerTime,
    iqamaOffsets, thikrRemindersEnabled, defaultTab, fontSize,
    selectedAdhan, prayerAdhan,
    updateSettings,
  } = useApp();
  const C = colors;
  const tr = t(lang);
  const isAr = lang === 'ar';
  const isRtl = isRtlLang(lang);

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 84 : insets.bottom + 49;

  // Font sizer — same logic as index.tsx
  const FONT_STEPS = ['small', 'medium', 'large', 'xlarge'] as const;
  const SIZE_LABELS: Record<typeof FONT_STEPS[number], string> = { small: 'S', medium: 'M', large: 'L', xlarge: 'XL' };
  const fsIdx = FONT_STEPS.indexOf(fontSize as typeof FONT_STEPS[number]);
  const canDecrease = fsIdx > 0;
  const canIncrease = fsIdx < FONT_STEPS.length - 1;
  const decreaseFont = () => { if (fsIdx > 0) { Haptics.selectionAsync(); updateSettings({ fontSize: FONT_STEPS[fsIdx - 1] }); } };
  const increaseFont = () => { if (fsIdx < FONT_STEPS.length - 1) { Haptics.selectionAsync(); updateSettings({ fontSize: FONT_STEPS[fsIdx + 1] }); } };

  // Local draft state — nothing is saved until the user taps Save
  const [draftCalcMethod, setDraftCalcMethod] = useState(calcMethod);
  const [draftAsrMethod, setDraftAsrMethod] = useState(asrMethod);
  const [draftAdjustment, setDraftAdjustment] = useState(maghribAdjustment ?? 0);
  const [draftHijri, setDraftHijri] = useState(hijriAdjustment ?? 0);
  const [draftNotifications, setDraftNotifications] = useState<Record<string, PrayerNotifConfig>>(
    prayerNotifications ?? {}
  );
  const [draftSecondLang, setDraftSecondLang] = useState<SecondLang>(secondLang ?? 'auto');
  const [draftAccessibilityTheme, setDraftAccessibilityTheme] = useState(accessibilityTheme ?? 'default');
  const [draftFirstAdhanOffset, setDraftFirstAdhanOffset] = useState<number>(firstAdhanOffset ?? 0);
  const [showFirstAdhanPicker, setShowFirstAdhanPicker] = useState(false);
  const [draftIqamaOffsets, setDraftIqamaOffsets] = useState<Record<string, number>>(
    () => ({ ...getDefaultIqamaOffsets(countryCode), ...(iqamaOffsets ?? {}) })
  );
  const [showIqamaPicker, setShowIqamaPicker] = useState<string | null>(null);
  const [draftDhuhaTime, setDraftDhuhaTime] = useState(dhuhaTime ?? '07:30');
  const [draftTahajjudTime, setDraftTahajjudTime] = useState(tahajjudTime ?? '03:00');
  const [draftShowDhuha, setDraftShowDhuha] = useState(showDhuha !== false);
  const [draftShowQiyam, setDraftShowQiyam] = useState(showQiyam !== false);
  const [draftEidPrayerTime, setDraftEidPrayerTime] = useState(eidPrayerTime ?? '07:30');
  const [tempDhuhaTime, setTempDhuhaTime] = useState(dhuhaTime ?? '07:30');
  const [tempTahajjudTime, setTempTahajjudTime] = useState(tahajjudTime ?? '03:00');
  const [tempEidPrayerTime, setTempEidPrayerTime] = useState(eidPrayerTime ?? '07:30');
  const [showDhuhaRoller, setShowDhuhaRoller] = useState(false);
  const [showTahajjudRoller, setShowTahajjudRoller] = useState(false);
  const [showEidRoller, setShowEidRoller] = useState(false);
  const [showMethodModal, setShowMethodModal] = useState(false);
  const [showDefaultTabModal, setShowDefaultTabModal] = useState(false);
  const [showAdhanModal, setShowAdhanModal] = useState(false);
  const [thikrToast, setThikrToast] = useState(false);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [draftAdhan, setDraftAdhan] = useState(selectedAdhan ?? 'makkah');
  const [draftPrayerAdhan, setDraftPrayerAdhan] = useState<Record<string, string>>(prayerAdhan ?? {});
  const [activePrayerAdhanKey, setActivePrayerAdhanKey] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopAthan();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      return () => {
        stopAthan();
      };
    }, [])
  );

  // ── Eid proximity — visibility window for the Eid Prayer row ────────────────
  //
  // WHY we add days to the Gregorian date before converting:
  //   `gregorianToHijri` is a pure astronomical calculation. The user's Hijri
  //   adjustment (±1–2 days) reflects the official moon-sighting declaration in
  //   their country. Adding `draftHijri` days to today's Gregorian date and then
  //   re-converting gives us the Hijri date that the user's local calendar shows —
  //   which is what we want for display and visibility decisions.
  //
  // WHY we use `draftHijri` (not the saved `hijriAdjustment`):
  //   Settings are edited before being saved. Using the live draft means the Eid
  //   row reacts immediately when the user changes their Hijri adjustment stepper,
  //   giving real-time feedback. Once saved, `hijriAdjustment === draftHijri` so
  //   there is no difference between the two on a fresh screen open.
  //
  // VISIBILITY WINDOW — dates that trigger the row:
  //
  //   Eid al-Fitr  (end of Ramadan)
  //     • 29 Ramadan (month 9, day 29) — row opens 2 days early for 30-day months
  //     • 30 Ramadan (month 9, day 30) — covers 30-day Ramadan; no-op in 29-day months
  //     • 1 Shawwal  (month 10, day 1) — Eid day itself
  //
  //   Eid al-Adha  (Dhul Hijjah)
  //     • 8 Dhul Hijjah (month 12, day 8)  — 2 days before, allows advance configuration
  //     • 9 Dhul Hijjah (month 12, day 9)  — Day of Arafah, Eid tomorrow
  //     • 10 Dhul Hijjah (month 12, day 10) — Eid day itself
  //
  // MONTH ROLLOVER: condition 1 (month 9, day >= 29) and condition 2 (month 10, day 1)
  //   overlap-free because `gregorianToHijri` always produces a valid month/day pair —
  //   when Ramadan ends on day 29 it jumps straight to month 10 day 1, which is caught
  //   by condition 2. No gap exists whether Ramadan is 29 or 30 days.
  //
  // ADJUSTMENT EDGE CASE (point 2):
  //   Raw Hijri = 28 Ramadan, draftHijri = +1
  //   → Gregorian date += 1 → converted Hijri = 29 Ramadan → row visible ✅
  //
  const todayHijri = (() => {
    const base = new Date();
    // Add the DRAFT adjustment (not the saved one) so the row reacts live in Settings
    base.setDate(base.getDate() + draftHijri);
    return gregorianToHijri(base.getFullYear(), base.getMonth() + 1, base.getDate());
  })();

  const isNearEid = (
    (todayHijri.month === 9  && todayHijri.day >= 29) ||           // 29–30 Ramadan
    (todayHijri.month === 10 && todayHijri.day === 1)  ||           // 1 Shawwal = Eid al-Fitr
    (todayHijri.month === 12 && todayHijri.day >= 8 && todayHijri.day <= 10) // 8–10 Dhul Hijjah
  );


  // ── Help texts (all 15 languages) ───────────────────────────────
  type HelpKey = 'language' | 'fontSize' | 'accessibility' | 'hijri' | 'calcMethod' | 'asrMethod' | 'maghrib' | 'firstAdhan' | 'notifications' | 'dhuha' | 'eid' | 'iqama';
  const HELP: Record<string, Record<HelpKey, string>> = {
    ar: {
      language: 'اللغة الأولى ثابتة على العربية.\n\nاللغة الثانية تظهر تحت كل اسم صلاة ومصطلح. "تلقائي" يختار اللغة حسب البلد الذي اكتُشف من موقعك.',
      fontSize: 'يتحكم في حجم الخط العربي في صفحة قراءة القرآن فقط. لا يؤثر على بقية التطبيق.\n\nصغير: آيات أكثر في الشاشة.\nكبير: مريح للقراءة المطولة.',
      accessibility: 'اختر نظام الألوان الأنسب لبصرك. كل نظام يغير اللون الرئيسي في التطبيق.\n\n• الافتراضي: الأخضر الإسلامي الكلاسيكي\n• تباين عالٍ: أسود وأبيض خالص\n• عمى الألوان: أزرق مناسب للـ deuteranopia\n• دافئ: عنبري يخفف الضوء الأزرق\n• الوردي / المحيط / البنفسجي: خيارات جمالية',
      hijri: 'يُعدّل التاريخ الهجري المعروض بمقدار يوم أو يومين.\n\nبعض الدول تعلن بداية الشهر الهجري يوماً قبل أو بعد الحساب الفلكي بسبب اعتماد رؤية الهلال فعلياً. اضبط هذا الرقم ليتطابق مع التقويم المعتمد في بلدك.',
      calcMethod: 'تحدد زاوية الشمس تحت الأفق لحساب وقتَي الفجر والعشاء.\n\n• رابطة العالم الإسلامي: الأوسع انتشاراً — فجر 18°، عشاء 17°\n• الأوقاف الأردنية: المعتمد في الأردن\n• أم القرى: المملكة والخليج — العشاء 90 دقيقة بعد المغرب\n• الهيئة المصرية: مصر وشمال أفريقيا — فجر 19.5°، عشاء 17.5°\n• ISNA: أمريكا الشمالية — فجر 15°، عشاء 15°\n• كراتشي: جنوب آسيا — فجر 18°، عشاء 18°\n• طهران / جعفري: للمذهب الشيعي',
      asrMethod: '• الجمهور (الشافعي، المالكي، الحنبلي): يبدأ العصر حين يساوي الظل طول الشيء — رأي الأغلبية.\n\n• الحنفي: يبدأ العصر حين يصبح الظل ضعفَي طول الشيء — يؤخر العصر نحو 30–60 دقيقة.',
      maghrib: 'الاحتياط الشرعي: يُضاف بعد الغروب الفلكي لضمان اكتمال الغروب المرئي فعلاً.\n\nالتطبيق يُوصي بالقيمة المعتمدة رسمياً في بلدك. يمكنك تعديلها يدوياً بالزيادة أو النقصان.',
      firstAdhan: 'أذان تنبيهي قبل الفجر — للتنبيه على وقت السحور في رمضان ووقت الاستعداد للصلاة.\n\nالمملكة العربية السعودية تعتمد أذاناً واحداً فقط عند الفجر. أما مصر والشام وكثير من الدول فتُشغّل أذاناً أول قبل 20–30 دقيقة.\n\nإذا كنت في بلدٍ لا يُشغّل أذاناً أول، اتركه على "إيقاف".',
      notifications: 'لكل صلاة خيارَان مستقلّان:\n\n🔔 الراية: إشعار نصي صامت يظهر على الشاشة.\n🔊 الأذان: صوت الأذان الكامل أو المختصر.\n\nيمكنك تفعيل الاثنين معاً أو أحدهما أو لا شيء.',
      dhuha: 'صلاة الضحى تُصلَّى بعد ارتفاع الشمس وقبل الزوال — ركعتان إلى ثماني ركعات.\n\nقيام الليل يُصلَّى في الثلث الأخير من الليل قبيل الفجر.\n\nفعّل كل منهما واضبط وقت التذكير ليُنبّهك التطبيق.',
      eid: 'تُصلَّى صباح يوم عيد الفطر (١ شوال) وعيد الأضحى (١٠ ذو الحجة).\n\nأدخل هنا الوقت الرسمي المعلَن في مسجدك أو مدينتك.\n\nيظهر هذا الخيار قبل العيد بيومين وفي يوم العيد فقط.',
      iqama: 'الإقامة هي النداء الثاني الذي يُعلَن مباشرةً قبل إقامة الصلاة في المسجد.\n\nاضبط هنا الفاصل الزمني (بالدقائق) بين وقت الأذان الرسمي وإقامة الصلاة لكل فريضة.\n\nبعد وقت الأذان بهذه المدة، يُعرض في الشاشة الرئيسية عداد "الإقامة خلال..." بدلاً من عداد الصلاة القادمة.',
    },
    en: {
      language: 'Arabic is the fixed primary language.\n\nThe second language appears beneath each prayer name and label. "Auto" detects your country from your GPS location and picks the most appropriate language.',
      fontSize: 'Controls Arabic font size in the Quran reader only — does not affect the rest of the app.\n\nSmall: more verses on screen at once.\nLarge: easier for extended reading sessions.',
      accessibility: 'Choose a colour theme that suits your visual needs. Each theme changes the app\'s accent colour.\n\n• Default: classic Islamic green\n• High Contrast: pure black & white\n• Color Blind: blue, deuteranopia-friendly\n• Warm: amber tones, reduces blue light\n• Blossom / Ocean / Violet: aesthetic options',
      hijri: 'Adjusts the displayed Hijri date by ±1 or ±2 days.\n\nSome countries declare the new Hijri month a day earlier or later than the astronomical calculation, based on actual moon sighting. Set this to match your country\'s official calendar.',
      calcMethod: 'Sets the sun angle for calculating Fajr and Isha times.\n\n• Muslim World League: most widely used — Fajr 18°, Isha 17°\n• Jordan Ministry of Awqaf: official in Jordan\n• Umm Al-Qura: Saudi Arabia & Gulf — Isha fixed at 90 min after Maghrib\n• Egyptian Authority: Egypt & North Africa — Fajr 19.5°, Isha 17.5°\n• ISNA: North America — Fajr 15°, Isha 15°\n• Karachi: South Asia — Fajr 18°, Isha 18°\n• Tehran / Jafari: Shia Ithna-Ashari practice',
      asrMethod: '• Standard (Shafi\'i, Maliki, Hanbali): Asr begins when an object\'s shadow equals its own height — the majority opinion.\n\n• Hanafi: Asr begins when the shadow is twice the height — delays Asr by roughly 30–60 minutes.',
      maghrib: 'Precautionary margin added after astronomical sunset to ensure the sun has visually set before the Athan is called.\n\nThe app recommends the official standard for your country. You can fine-tune it with the ±stepper.',
      firstAdhan: 'An early Athan before Fajr — typically used to signal Suhoor time during Ramadan and time to prepare for prayer.\n\nSaudi Arabia uses a single Athan at Fajr only. Egypt, the Levant, and many other countries call a first Athan 20–30 min earlier.\n\nIf you are in a country that doesn\'t have a first Athan, leave this Off.',
      notifications: 'Each prayer has two independent toggles:\n\n🔔 Banner: a silent visual notification on your screen.\n🔊 Athan: the full or abbreviated audio Athan.\n\nYou can enable both, either one, or neither.',
      dhuha: 'Dhuha is a voluntary prayer after sunrise and before Dhuhr — 2 to 8 rak\'ahs.\n\nQiyam (Tahajjud) is the night vigil prayer, best in the last third of the night before Fajr.\n\nToggle each on and set a reminder time.',
      eid: 'Eid prayer is performed on the morning of Eid al-Fitr (1 Shawwal) and Eid al-Adha (10 Dhul Hijjah).\n\nEnter the official prayer time announced by your mosque or city.\n\nThis option appears only in the two days before Eid and on the day itself.',
      iqama: 'Iqama is the second call that is announced just before the congregational prayer begins in the mosque.\n\nSet the delay (in minutes) between the official Athan time and the Iqama for each obligatory prayer.\n\nOnce that delay has elapsed after the Athan, the home screen switches from the "Next Prayer" countdown to an "Iqama in…" countdown.',
    },
    fr: {
      language: 'L\'arabe est la langue principale fixe.\n\nLa deuxième langue apparaît sous chaque nom de prière. "Auto" détecte votre pays via GPS.',
      fontSize: 'Contrôle la taille de police arabe dans le lecteur du Coran uniquement.\n\nPetit: plus de versets à l\'écran.\nGrand: plus confortable pour une lecture prolongée.',
      accessibility: 'Choisissez le thème de couleur adapté à vos besoins visuels.\n\n• Défaut: vert islamique classique\n• Contraste élevé: noir et blanc pur\n• Daltonien: bleu, adapté à la deutéranopie\n• Chaud: tons ambrés\n• Fleur / Océan / Violet: options esthétiques',
      hijri: 'Ajuste la date hégirien affichée de ±1 ou ±2 jours selon la déclaration officielle du croissant dans votre pays.',
      calcMethod: 'Définit l\'angle solaire pour Fajr et Isha.\n\n• LIM: Fajr 18°, Isha 17°\n• Awqaf Jordanie: officiel en Jordanie\n• Umm Al-Qura: Arabie Saoudite — Isha 90 min après Maghrib\n• Égypte: Fajr 19.5°, Isha 17.5°\n• ISNA: Amérique du Nord\n• Karachi: Asie du Sud',
      asrMethod: '• Standard (Chafi\'i, Maliki, Hanbali): Asr quand l\'ombre = hauteur de l\'objet.\n\n• Hanafi: Asr quand l\'ombre = 2× la hauteur — retarde Asr de 30–60 min.',
      maghrib: 'Marge de précaution ajoutée après le coucher astronomique. L\'app recommande le standard officiel de votre pays.',
      firstAdhan: 'Athan précoce avant Fajr pour le Suhoor pendant le Ramadan.\n\nArabie Saoudite: un seul Athan. Égypte/Levant: premier Athan 20–30 min avant.\n\nSi vous êtes dans un pays sans premier Athan, laissez sur Désactivé.',
      notifications: 'Chaque prière a deux options:\n\n🔔 Bannière: notification visuelle silencieuse.\n🔊 Athan: audio complet ou abrégé.',
      dhuha: 'Dhuha est une prière volontaire après le lever du soleil et avant Dhuhr — 2 à 8 rak\'a.\n\nQiyam (Tahajjud) est la prière nocturne, idéalement dans le dernier tiers de la nuit avant Fajr.\n\nActivez chacune et définissez l\'heure de rappel.',
      eid: 'La prière de l\'Aïd a lieu le matin de l\'Aïd al-Fitr (1 Chawwal) et de l\'Aïd al-Adha (10 Dhul Hijja).\n\nEntrez l\'heure officielle de votre mosquée ou ville.\n\nCette option n\'apparaît que deux jours avant l\'Aïd et le jour même.',
      iqama: 'L\'Iqama est le second appel annoncé juste avant le début de la prière collective à la mosquée.\n\nDéfinissez ici le délai (en minutes) entre l\'Athan officiel et l\'Iqama pour chaque prière obligatoire.\n\nUne fois ce délai écoulé, l\'écran principal affiche un compte à rebours "Iqama dans…" au lieu de "Prochaine prière".',
    },
    es: {
      language: 'El árabe es el idioma principal fijo.\n\nEl segundo idioma aparece bajo cada nombre de oración. "Auto" detecta tu país por GPS.',
      fontSize: 'Controla el tamaño de fuente árabe solo en el lector del Corán.\n\nPequeño: más versos en pantalla.\nGrande: más cómodo para lectura prolongada.',
      accessibility: 'Elige el tema de color que mejor se adapte a tus necesidades visuales.\n\n• Predeterminado: verde islámico clásico\n• Alto contraste: blanco y negro puro\n• Daltónico: azul, apto para deuteranopía\n• Cálido: tonos ámbar\n• Flor / Océano / Violeta: opciones estéticas',
      hijri: 'Ajusta la fecha hegira mostrada en ±1 o ±2 días según la declaración oficial del creciente lunar en tu país.',
      calcMethod: 'Define el ángulo solar para Fajr e Isha.\n\n• LMI: Fajr 18°, Isha 17°\n• Awqaf Jordania: oficial en Jordania\n• Umm Al-Qura: Arabia Saudita — Isha 90 min después del Maghrib\n• Egipto: Fajr 19.5°, Isha 17.5°\n• ISNA: América del Norte\n• Karachi: Asia del Sur',
      asrMethod: '• Estándar (Shafi\'i, Maliki, Hanbali): Asr cuando la sombra = altura del objeto.\n\n• Hanafi: Asr cuando la sombra = 2× la altura — retrasa Asr 30–60 min.',
      maghrib: 'Margen de precaución tras el ocaso astronómico. La app recomienda el estándar oficial de tu país.',
      firstAdhan: 'Athan temprano antes del Fajr para el Suhoor durante el Ramadán.\n\nArabia Saudita: un solo Athan. Egipto/Levante: primer Athan 20–30 min antes.\n\nSi estás en un país que no tiene primer Athan, déjalo en Desactivado.',
      notifications: 'Cada oración tiene dos opciones:\n\n🔔 Banner: notificación visual silenciosa.\n🔊 Athan: audio completo o abreviado.',
      dhuha: 'Dhuha es una oración voluntaria después del amanecer y antes del Dhuhr — 2 a 8 rak\'as.\n\nQiyam (Tahajjud) es la oración nocturna, mejor en el último tercio de la noche antes del Fajr.\n\nActiva cada una y establece el horario de recordatorio.',
      eid: 'La oración del Eid se realiza la mañana del Eid al-Fitr (1 Shawwal) y el Eid al-Adha (10 Dhul Hijjah).\n\nIngresa el horario oficial de tu mezquita o ciudad.\n\nEsta opción solo aparece dos días antes del Eid y el día mismo.',
      iqama: 'La Iqama es el segundo llamado que se anuncia justo antes de que comience la oración congregacional en la mezquita.\n\nEstablece aquí el retraso (en minutos) entre el horario oficial del Athan y la Iqama para cada oración obligatoria.\n\nUna vez transcurrido ese tiempo, la pantalla principal muestra una cuenta regresiva "Iqama en…" en lugar de "Próxima oración".',
    },
    ru: {
      language: 'Арабский язык — основной фиксированный.\n\nВторой язык отображается под каждым названием намаза. "Авто" определяет страну по GPS.',
      fontSize: 'Управляет размером шрифта только в читалке Корана.\n\nМаленький: больше аятов на экране.\nБольшой: удобнее для длительного чтения.',
      accessibility: 'Выберите цветовую тему по своим визуальным потребностям.\n\n• По умолчанию: классический исламский зелёный\n• Высокий контраст: чёрный и белый\n• Дальтоники: синий, подходит для дейтеранопии\n• Тёплый: янтарные тона\n• Цветок / Океан / Фиолетовый: эстетические варианты',
      hijri: 'Корректирует отображаемую дату Хиджры на ±1–2 дня в соответствии с официальным объявлением в вашей стране.',
      calcMethod: 'Угол солнца для расчёта Фаджр и Иша.\n\n• ВИЛ: Фаджр 18°, Иша 17°\n• Иордания: официальный стандарт\n• Умм аль-Кура: Саудовская Аравия — Иша 90 мин после Магриба\n• Египет: Фаджр 19.5°, Иша 17.5°\n• ISNA: Северная Америка\n• Карачи: Южная Азия',
      asrMethod: '• Стандарт (Шафии, Малики, Ханбали): Аср когда тень = высоте объекта.\n\n• Ханафи: Аср когда тень = 2× высоте — задержка 30–60 мин.',
      maghrib: 'Предохранительный запас после астрономического захода. Приложение рекомендует официальный стандарт вашей страны.',
      firstAdhan: 'Ранний азан перед Фаджром для Сухура в Рамадан.\n\nСаудовская Аравия: один азан. Египет/Левант: первый азан за 20–30 мин до Фаджра.\n\nЕсли в вашей стране нет первого азана, оставьте его выключенным.',
      notifications: 'Для каждого намаза два варианта:\n\n🔔 Баннер: тихое визуальное уведомление.\n🔊 Азан: полный или сокращённый звук.',
      dhuha: 'Духа — добровольная молитва после восхода солнца до Зухра — от 2 до 8 ракаатов.\n\nКийям (Тахаджжуд) — ночная молитва, лучше всего в последнюю треть ночи перед Фаджром.\n\nВключите каждую и задайте время напоминания.',
      eid: 'Намаз Ид совершается утром Ид аль-Фитр (1 Шаввала) и Ид аль-Адха (10 Зуль-Хиджа).\n\nВведите официальное время молитвы для вашей мечети или города.\n\nЭта опция отображается за два дня до праздника и в сам день.',
      iqama: 'Икама — второй призыв, объявляемый непосредственно перед началом коллективной молитвы в мечети.\n\nУстановите задержку (в минутах) между официальным азаном и икамой для каждого обязательного намаза.\n\nКак только этот промежуток истечёт, на главном экране появится обратный отсчёт «Икама через…» вместо «Следующий намаз».',
    },
    zh: {
      language: '阿拉伯语是固定的主要语言。\n\n第二语言显示在每个礼拜名称下方。"自动"通过GPS检测您的国家。',
      fontSize: '仅控制古兰经阅读器中的阿拉伯字体大小。\n\n小：屏幕显示更多节。\n大：长时间阅读更舒适。',
      accessibility: '选择适合您视觉需求的颜色主题。\n\n• 默认：经典伊斯兰绿\n• 高对比度：纯黑白\n• 色盲：蓝色，适合红绿色盲\n• 暖色：琥珀色调\n• 花朵/海洋/紫罗兰：美学选项',
      hijri: '将显示的伊斯兰历日期调整±1或±2天，以匹配您所在国家的官方月牙观测公告。',
      calcMethod: '设置计算晨礼和宵礼的太阳角度。\n\n• 世界伊斯兰联盟：晨礼18°，宵礼17°\n• 约旦宗教部：约旦官方标准\n• 乌姆古拉：沙特阿拉伯 — 宵礼在昏礼后90分钟\n• 埃及：晨礼19.5°，宵礼17.5°',
      asrMethod: '• 标准（沙菲仪、马利基、罕百里）：晡礼在阴影等于物体高度时开始。\n\n• 哈乃非：晡礼在阴影为两倍高度时开始，推迟30–60分钟。',
      maghrib: '天文日落后的预防性余量。应用程序推荐您所在国家的官方标准。',
      firstAdhan: '斋月期间封斋前的早期宣礼。\n\n沙特阿拉伯只有一次宣礼。埃及和黎凡特提前20–30分钟。\n\n如果您所在的国家没有第一遍宣礼，请将其关闭。',
      notifications: '每次礼拜有两个选项：\n\n🔔 横幅：静音视觉通知。\n🔊 宣礼：完整或简短音频。',
      dhuha: '杜哈祈祷是日出后至晌礼前的自愿礼拜，2至8拉卡特。\n\n夜间礼拜（塔哈朱德）最好在夜晚的最后三分之一，即晨礼前。\n\n开启每项并设置提醒时间。',
      eid: '开斋节礼拜在开斋节（1 Shawwal）和宰牲节（10 Dhul Hijjah）的早晨举行。\n\n输入您所在清真寺或城市的官方礼拜时间。\n\n此选项仅在节前两天和节日当天显示。',
      iqama: '伊卡玛是在清真寺会众礼拜开始前宣布的第二次呼唤。\n\n在此设置每个主命礼拜的宣礼（阿赞）时间与伊卡玛之间的延迟（分钟）。\n\n延迟时间过后，主屏幕将显示"伊卡玛倒计时"，而非"下次礼拜"。',
    },
    tr: {
      language: 'Arapça sabit birincil dildir.\n\nİkinci dil her namaz adının altında görünür. "Otomatik" GPS ile ülkenizi algılar.',
      fontSize: 'Yalnızca Kuran okuyucusundaki Arapça yazı tipi boyutunu kontrol eder.\n\nKüçük: daha fazla ayet görünür.\nBüyük: uzun okuma için daha rahat.',
      accessibility: 'Görsel ihtiyaçlarınıza uygun renk temasını seçin.\n\n• Varsayılan: klasik İslami yeşil\n• Yüksek Kontrast: saf siyah-beyaz\n• Renk Körü: mavi, deuteranopi dostu\n• Sıcak: kehribar tonları\n• Çiçek / Okyanus / Mor: estetik seçenekler',
      hijri: 'Gösterilen Hicri tarihi ülkenizdeki resmi hilal gözlemine göre ±1–2 gün ayarlar.',
      calcMethod: 'Fecir ve Yatsı için güneş açısını belirler.\n\n• Dünya İslam Birliği: Fecir 18°, Yatsı 17°\n• Ürdün Diyanet: resmi standart\n• Ümmü\'l-Kura: Suudi Arabistan — Yatsı Akşamdan 90 dk sonra\n• Mısır: Fecir 19.5°, Yatsı 17.5°',
      asrMethod: '• Standart (Şafii, Maliki, Hanbeli): gölge = nesne boyu olduğunda.\n\n• Hanefi: gölge = 2× boy olduğunda — 30–60 dk geç başlar.',
      maghrib: 'Astronomik günbatımından sonra eklenen ihtiyat süresi. Uygulama ülkenizin resmi standardını önerir.',
      firstAdhan: 'Fecirden önce erken ezan — Ramazan\'da Sahur için.\n\nSuudi Arabistan tek ezan okur. Mısır/Levant 20–30 dk önce okur.\n\nÜlkenizde ilk ezan yoksa, bunu Kapalı bırakın.',
      notifications: 'Her namaz için iki seçenek:\n\n🔔 Banner: sessiz görsel bildirim.\n🔊 Ezan: tam veya kısa ses.',
      dhuha: 'Duhâ namazı, gün doğumundan sonra ve öğleden önce kılınan nafile bir namazdır — 2 ila 8 rekât.\n\nKıyâmülleyl (Teheccüd), gecenin son üçte birinde kılınan gece namazıdır.\n\nHer birini etkinleştirin ve hatırlatma saatini ayarlayın.',
      eid: 'Bayram namazı, Ramazan Bayramı\'nın (1 Şevval) ve Kurban Bayramı\'nın (10 Zilhicce) sabahında kılınır.\n\nMescidinizdeki veya şehirinizdeki resmi namaz saatini girin.\n\nBu seçenek yalnızca bayramdan iki gün önce ve bayram günü görünür.',
      iqama: 'İkame, camide cemaatle namaza başlanmadan hemen önce okunan ikinci çağrıdır.\n\nBurada her farz namaz için ezanın okunmasından ikameye kadar olan süreyi (dakika olarak) ayarlayın.\n\nBu süre geçince ana ekranda "Sonraki namaz" yerine "İkameye … kaldı" geri sayımı görünür.',
    },
    ur: {
      language: 'عربی ہمیشہ پہلی زبان رہتی ہے۔\n\nدوسری زبان ہر نماز کے نام کے نیچے نظر آتی ہے۔ "خودکار" GPS سے آپ کا ملک معلوم کرتا ہے۔',
      fontSize: 'صرف قرآن ریڈر میں عربی فونٹ کا سائز کنٹرول کرتا ہے۔\n\nچھوٹا: زیادہ آیات دکھاتا ہے۔\nبڑا: طویل مطالعے کے لیے آرام دہ۔',
      accessibility: 'اپنی بصری ضروریات کے مطابق رنگ تھیم منتخب کریں۔\n\n• ڈیفالٹ: کلاسک اسلامی سبز\n• ہائی کنٹراسٹ: خالص سیاہ و سفید\n• کلر بلائنڈ: نیلا، deuteranopia کے لیے موزوں\n• گرم: کہربائی رنگ\n• پھول / سمندر / بنفشی: جمالیاتی انتخاب',
      hijri: 'ہلال کی سرکاری رویت کے مطابق ہجری تاریخ ±1–2 دن ایڈجسٹ کرتا ہے۔',
      calcMethod: 'فجر اور عشاء کے لیے سورج کا زاویہ متعین کرتا ہے۔\n\n• عالمی اسلامی لیگ: فجر 18°، عشاء 17°\n• اردن اوقاف: اردن کا سرکاری معیار\n• ام القریٰ: سعودی عرب — عشاء مغرب کے 90 منٹ بعد\n• مصری ادارہ: فجر 19.5°، عشاء 17.5°\n• کراچی: جنوبی ایشیا',
      asrMethod: '• جمہور (شافعی، مالکی، حنبلی): سایہ = اونچائی پر عصر شروع۔\n\n• حنفی: سایہ = دو گنا اونچائی — تقریباً 30–60 منٹ تاخیر۔',
      maghrib: 'فلکی غروب کے بعد احتیاطی وقفہ۔ ایپ آپ کے ملک کا سرکاری معیار تجویز کرتی ہے۔',
      firstAdhan: 'فجر سے پہلے ابتدائی اذان — رمضان میں سحری کے لیے۔\n\nسعودی عرب میں صرف ایک اذان ہوتی ہے۔ مصر اور شام میں 20–30 منٹ پہلے۔\n\nاگر آپ کے ملک میں پہلی اذان نہیں ہوتی، تو اسے بند رکھیں۔',
      notifications: 'ہر نماز کے لیے دو آپشن:\n\n🔔 بینر: خاموش بصری اطلاع۔\n🔊 اذان: مکمل یا مختصر آڈیو۔',
      dhuha: 'نماز چاشت سورج طلوع ہونے کے بعد اور ظہر سے پہلے ادا کی جاتی ہے — ۲ سے ۸ رکعات۔\n\nقیام اللیل (تہجد) رات کے آخری تہائی حصے میں ادا کی جاتی ہے۔\n\nہر ایک کو فعال کریں اور یاددہانی کا وقت مقرر کریں۔',
      eid: 'نماز عید الفطر (۱ شوال) اور عید الاضحیٰ (۱۰ ذو الحجہ) کی صبح ادا کی جاتی ہے۔\n\nاپنی مسجد یا شہر کے اعلان کردہ وقت درج کریں۔\n\nیہ آپشن صرف عید سے دو دن پہلے اور عید کے دن ظاہر ہوتا ہے۔',
      iqama: 'اقامت وہ دوسری پکار ہے جو مسجد میں باجماعت نماز شروع ہونے سے فوری پہلے دی جاتی ہے۔\n\nیہاں ہر فرض نماز کے لیے اذان اور اقامت کے درمیان وقفہ (منٹوں میں) مقرر کریں۔\n\nیہ وقفہ گزرنے کے بعد، مرکزی اسکرین پر "اگلی نماز" کی بجائے "اقامت میں…" کا الٹا گنتی نمایاں ہوگی۔',
    },
    id: {
      language: 'Arab adalah bahasa utama yang tetap.\n\nBahasa kedua muncul di bawah setiap nama shalat. "Otomatis" mendeteksi negara Anda via GPS.',
      fontSize: 'Mengontrol ukuran font Arab hanya di pembaca Al-Quran.\n\nKecil: lebih banyak ayat di layar.\nBesar: lebih nyaman untuk membaca lama.',
      accessibility: 'Pilih tema warna sesuai kebutuhan visual Anda.\n\n• Default: hijau Islam klasik\n• Kontras Tinggi: hitam putih murni\n• Buta Warna: biru, ramah deuteranopia\n• Hangat: nuansa amber\n• Bunga / Laut / Ungu: opsi estetika',
      hijri: 'Menyesuaikan tanggal Hijriah yang ditampilkan ±1–2 hari sesuai pengumuman resmi hilal di negara Anda.',
      calcMethod: 'Menetapkan sudut matahari untuk Subuh dan Isya.\n\n• Liga Muslim Dunia: Subuh 18°, Isya 17°\n• Yordania: standar resmi\n• Umm Al-Qura: Arab Saudi — Isya 90 menit setelah Maghrib\n• Mesir: Subuh 19.5°, Isya 17.5°',
      asrMethod: '• Standar (Syafi\'i, Maliki, Hambali): Asar saat bayangan = tinggi benda.\n\n• Hanafi: Asar saat bayangan = 2× tinggi — mundur 30–60 menit.',
      maghrib: 'Batas kehati-hatian setelah matahari terbenam secara astronomis. Aplikasi merekomendasikan standar resmi negara Anda.',
      firstAdhan: 'Azan awal sebelum Subuh untuk Sahur selama Ramadan.\n\nArab Saudi: satu azan. Mesir/Levant: azan pertama 20–30 menit lebih awal.\n\nJika negara Anda tidak memiliki azan pertama, biarkan Nonaktif.',
      notifications: 'Setiap shalat memiliki dua opsi:\n\n🔔 Banner: notifikasi visual senyap.\n🔊 Azan: audio penuh atau singkat.',
      dhuha: 'Dhuha adalah shalat sunnah setelah matahari terbit dan sebelum Zuhur — 2 hingga 8 rakaat.\n\nQiyam (Tahajud) adalah shalat malam, terbaik di sepertiga terakhir malam sebelum Subuh.\n\nAktifkan masing-masing dan atur waktu pengingat.',
      eid: 'Shalat Eid dilaksanakan pada pagi hari Eid al-Fitr (1 Syawal) dan Eid al-Adha (10 Dzulhijjah).\n\nMasukkan waktu shalat resmi yang diumumkan masjid atau kota Anda.\n\nOpsi ini hanya muncul dua hari sebelum dan pada hari Eid.',
      iqama: 'Iqamah adalah seruan kedua yang dikumandangkan tepat sebelum shalat berjamaah dimulai di masjid.\n\nTetapkan jeda (dalam menit) antara waktu Azan resmi dan Iqamah untuk setiap shalat wajib.\n\nSetelah jeda itu berlalu, layar utama beralih dari hitung mundur "Shalat Berikutnya" ke hitung mundur "Iqamah dalam…".',
    },
    bn: {
      language: 'আরবি সর্বদা প্রধান ভাষা।\n\nদ্বিতীয় ভাষা প্রতিটি নামাজের নামের নিচে দেখায়। "স্বয়ংক্রিয়" GPS দিয়ে আপনার দেশ শনাক্ত করে।',
      fontSize: 'শুধুমাত্র কুরআন রিডারে আরবি ফন্টের আকার নিয়ন্ত্রণ করে।\n\nছোট: বেশি আয়াত দেখায়।\nবড়: দীর্ঘ পাঠের জন্য আরামদায়ক।',
      accessibility: 'আপনার দৃষ্টি চাহিদা অনুযায়ী রঙের থিম বেছে নিন।',
      hijri: 'আপনার দেশের সরকারি হিলাল দেখার অনুযায়ী হিজরি তারিখ ±১–২ দিন সামঞ্জস্য করে।',
      calcMethod: 'ফজর ও ইশার জন্য সূর্যের কোণ নির্ধারণ করে।\n\n• মুসলিম বিশ্ব লীগ: ফজর 18°, ইশা 17°\n• উম্মুল কুরা: সৌদি আরব — ইশা মাগরিবের ৯০ মিনিট পরে\n• মিশর: ফজর 19.5°, ইশা 17.5°',
      asrMethod: '• আদর্শ (শাফেয়ি, মালেকি, হাম্বলি): ছায়া = উচ্চতা হলে আসর শুরু।\n\n• হানাফি: ছায়া = ২× উচ্চতা হলে — ৩০–৬০ মিনিট দেরি।',
      maghrib: 'জ্যোতির্বিদ্যাগত সূর্যাস্তের পর সতর্কতামূলক ব্যবধান। অ্যাপ আপনার দেশের সরকারি মান সুপারিশ করে।',
      firstAdhan: 'রমজানে সেহরির জন্য ফজরের আগে প্রাথমিক আজান।\n\nসৌদি আরব: শুধুমাত্র একটি আজান। মিশর/লেভান্ট: ফজরের ২০–৩০ মিনিট আগে।\n\nআপনার দেশে প্রথম আজান না থাকলে, এটি বন্ধ রাখুন।',
      notifications: 'প্রতিটি নামাজের জন্য দুটি বিকল্প:\n\n🔔 ব্যানার: নীরব ভিজ্যুয়াল বিজ্ঞপ্তি।\n🔊 আজান: সম্পূর্ণ বা সংক্ষিপ্ত অডিও।',
      dhuha: 'দুহা হল সূর্যোদয়ের পর ও জোহরের আগে স্বেচ্ছামূলক নামাজ — ২ থেকে ৮ রাকাত।\n\nকিয়ামুল লাইল (তাহাজ্জুদ) ফজরের আগে রাতের শেষ তৃতীয়াংশে পড়া হয়।\n\nপ্রতিটি সক্রিয় করুন এবং স্মরণের সময় সেট করুন।',
      eid: 'ঈদের নামাজ ঈদুল ফিতর (১ শাওয়াল) এবং ঈদুল আযহা (১০ জিলহজ্জ) এর সকালে পড়া হয়।\n\nআপনার মসজিদ বা শহরের ঘোষিত সময় লিখুন।\n\nএই বিকল্পটি শুধুমাত্র ঈদের দুই দিন আগে এবং ঈদের দিন দেখা যায়।',
      iqama: 'ইকামত হল দ্বিতীয় আহ্বান যা মসজিদে জামায়াত শুরু হওয়ার ঠিক আগে দেওয়া হয়।\n\nপ্রতিটি ফরজ নামাজের জন্য আযান ও ইকামতের মধ্যে বিরতি (মিনিটে) এখানে সেট করুন।\n\nসেই বিরতি পেরিয়ে গেলে প্রধান স্ক্রিনে "পরবর্তী নামাজ"-এর পরিবর্তে "ইকামত আসছে…" কাউন্টডাউন দেখাবে।',
    },
    fa: {
      language: 'عربی زبان اصلی ثابت است.\n\nزبان دوم زیر هر نام نماز نمایش داده می‌شود. "خودکار" کشور شما را از GPS تشخیص می‌دهد.',
      fontSize: 'فقط اندازه فونت عربی در قاری قرآن را کنترل می‌کند.\n\nکوچک: آیات بیشتری روی صفحه.\nبزرگ: مطالعه طولانی راحت‌تر.',
      accessibility: 'پوسته رنگی متناسب با نیازهای بینایی خود را انتخاب کنید.',
      hijri: 'تاریخ هجری نمایش داده شده را ±۱–۲ روز بر اساس اعلام رسمی رؤیت هلال در کشورتان تنظیم می‌کند.',
      calcMethod: 'زاویه خورشید برای فجر و عشا را تعیین می‌کند.\n\n• رابطه جهان اسلام: فجر 18°، عشا 17°\n• اردن: استاندارد رسمی\n• ام‌القری: عربستان — عشا 90 دقیقه پس از مغرب\n• مصر: فجر 19.5°، عشا 17.5°',
      asrMethod: '• استاندارد (شافعی، مالکی، حنبلی): عصر زمانی که سایه = ارتفاع شیء.\n\n• حنفی: عصر زمانی که سایه = 2× ارتفاع — تأخیر 30–60 دقیقه.',
      maghrib: 'حاشیه احتیاطی پس از غروب نجومی. برنامه استاندارد رسمی کشور شما را توصیه می‌کند.',
      firstAdhan: 'اذان اولیه قبل از فجر برای سحری در رمضان.\n\nعربستان سعودی: یک اذان. مصر/لوان: 20–30 دقیقه زودتر.\n\nاگر در کشوری هستید که اذان اول ندارد، آن را خاموش بگذارید.',
      notifications: 'برای هر نماز دو گزینه:\n\n🔔 بنر: اعلان بصری بی‌صدا.\n🔊 اذان: صدای کامل یا خلاصه.',
      dhuha: 'نماز ضحی پس از طلوع آفتاب و پیش از ظهر خوانده می‌شود — ۲ تا ۸ رکعت.\n\nقیام اللیل (تهجد) در آخرین سوم شب قبل از فجر بهترین وقت دارد.\n\nهر کدام را فعال کنید و زمان یادآوری را تنظیم نمایید.',
      eid: 'نماز عید در صبح روز عیدالفطر (۱ شوال) و عیدالأضحی (۱۰ ذی‌الحجه) ادا می‌شود.\n\nوقت رسمی اعلام‌شده توسط مسجد یا شهر خود را وارد کنید.\n\nاین گزینه فقط دو روز قبل از عید و روز عید نمایش داده می‌شود.',
      iqama: 'اقامه دومین ندایی است که دقیقاً پیش از شروع نماز جماعت در مسجد خوانده می‌شود.\n\nدر اینجا فاصله زمانی (بر حسب دقیقه) بین اذان رسمی و اقامه را برای هر نماز واجب تنظیم کنید.\n\nپس از گذشت این فاصله، صفحه اصلی به‌جای "نماز بعدی" شمارش معکوس "اقامه در …" را نمایش می‌دهد.',
    },
    ms: {
      language: 'Arab adalah bahasa utama yang tetap.\n\nBahasa kedua muncul di bawah setiap nama sembahyang. "Auto" mengesan negara anda melalui GPS.',
      fontSize: 'Mengawal saiz fon Arab dalam pembaca Al-Quran sahaja.\n\nKecil: lebih banyak ayat pada skrin.\nBesar: lebih selesa untuk membaca lama.',
      accessibility: 'Pilih tema warna mengikut keperluan visual anda.',
      hijri: 'Melaraskan tarikh Hijri yang dipaparkan ±1–2 hari mengikut pengumuman rasmi anak bulan di negara anda.',
      calcMethod: 'Menetapkan sudut matahari untuk Subuh dan Isyak.\n\n• Liga Muslim Dunia: Subuh 18°, Isyak 17°\n• Jordan: standard rasmi\n• Umm Al-Qura: Arab Saudi — Isyak 90 minit selepas Maghrib',
      asrMethod: '• Standard (Syafi\'i, Maliki, Hanbali): Asar bila bayangan = tinggi benda.\n\n• Hanafi: Asar bila bayangan = 2× tinggi — lewat 30–60 min.',
      maghrib: 'Margin berjaga-jaga selepas matahari terbenam secara astronomik. Aplikasi mengesyorkan standard rasmi negara anda.',
      firstAdhan: 'Azan awal sebelum Subuh untuk Sahur semasa Ramadan.\n\nArab Saudi: satu azan. Mesir/Levant: azan pertama 20–30 minit lebih awal.\n\nJika negara anda tidak mempunyai azan pertama, biarkan ia Mati.',
      notifications: 'Setiap sembahyang ada dua pilihan:\n\n🔔 Banner: pemberitahuan visual senyap.\n🔊 Azan: audio penuh atau ringkas.',
      dhuha: 'Dhuha ialah sembahyang sunat selepas matahari terbit dan sebelum Zohor — 2 hingga 8 rakaat.\n\nQiyam (Tahajud) adalah sembahyang malam, terbaik pada sepertiga akhir malam sebelum Subuh.\n\nAktifkan setiap satu dan tetapkan masa peringatan.',
      eid: 'Solat Hari Raya dilaksanakan pada pagi Hari Raya Aidilfitri (1 Syawal) dan Aidiladha (10 Zulhijjah).\n\nMasukkan waktu solat rasmi yang diumumkan oleh masjid atau bandar anda.\n\nPilihan ini hanya muncul dua hari sebelum dan pada Hari Raya.',
      iqama: 'Iqamah ialah seruan kedua yang dilaungkan sejurus sebelum solat berjemaah dimulakan di masjid.\n\nTetapkan di sini jeda masa (dalam minit) antara waktu Azan rasmi dan Iqamah bagi setiap solat fardu.\n\nSelepas jeda itu berlalu, skrin utama beralih daripada kiraan undur "Solat Seterusnya" kepada "Iqamah dalam…".',
    },
    pt: {
      language: 'O árabe é o idioma principal fixo.\n\nO segundo idioma aparece abaixo de cada nome de oração. "Auto" detecta seu país por GPS.',
      fontSize: 'Controla o tamanho da fonte árabe apenas no leitor do Alcorão.\n\nPequeno: mais versículos na tela.\nGrande: mais confortável para leitura prolongada.',
      accessibility: 'Escolha o tema de cor adequado às suas necessidades visuais.',
      hijri: 'Ajusta a data Hijri exibida em ±1–2 dias conforme o anúncio oficial do crescente no seu país.',
      calcMethod: 'Define o ângulo solar para Fajr e Isha.\n\n• Liga Mundial Islâmica: Fajr 18°, Isha 17°\n• Jordânia: padrão oficial\n• Umm Al-Qura: Arábia Saudita — Isha 90 min após Maghrib',
      asrMethod: '• Padrão (Shafi\'i, Maliki, Hanbali): Asr quando sombra = altura do objeto.\n\n• Hanafi: Asr quando sombra = 2× altura — atraso de 30–60 min.',
      maghrib: 'Margem de precaução após o pôr do sol astronômico. O app recomenda o padrão oficial do seu país.',
      firstAdhan: 'Athan antecipado antes do Fajr para o Suhoor durante o Ramadã.\n\nArábia Saudita: um único Athan. Egito/Levante: primeiro Athan 20–30 min antes.\n\nSe você estiver em um país que não tem o primeiro Athan, deixe-o Desativado.',
      notifications: 'Cada oração tem duas opções:\n\n🔔 Banner: notificação visual silenciosa.\n🔊 Athan: áudio completo ou abreviado.',
      dhuha: 'Dhuha é uma oração voluntária após o nascer do sol e antes do Dhuhr — 2 a 8 rak\'as.\n\nQiyam (Tahajud) é a oração noturna, melhor no último terço da noite antes do Fajr.\n\nAtive cada uma e defina o horário de lembrete.',
      eid: 'A oração do Eid é realizada na manhã do Eid al-Fitr (1 Shawwal) e do Eid al-Adha (10 Dhul Hijjah).\n\nInsira o horário oficial anunciado pela sua mesquita ou cidade.\n\nEsta opção aparece apenas dois dias antes do Eid e no próprio dia.',
      iqama: 'A Iqama é o segundo chamado anunciado imediatamente antes do início da oração em congregação na mesquita.\n\nDefina aqui o intervalo (em minutos) entre o horário oficial do Athan e a Iqama para cada oração obrigatória.\n\nApós esse intervalo, a tela inicial muda da contagem regressiva de "Próxima oração" para "Iqama em…".',
    },
    sw: {
      language: 'Kiarabu ni lugha kuu ya kudumu.\n\nLugha ya pili inaonekana chini ya kila jina la sala. "Otomatiki" hugundua nchi yako kupitia GPS.',
      fontSize: 'Inadhibiti ukubwa wa fonti ya Kiarabu katika msomaji wa Qur\'an tu.',
      accessibility: 'Chagua mandhari ya rangi inayofaa mahitaji yako ya kuona.',
      hijri: 'Hurekebisha tarehe ya Hijria iliyoonyeshwa kwa ±1–2 siku kulingana na matangazo rasmi ya mwezi katika nchi yako.',
      calcMethod: 'Inaweka pembe ya jua kwa Alfajiri na Isha.\n\n• Ligi ya Ulimwengu wa Kiislamu: Alfajiri 18°, Isha 17°\n• Umm Al-Qura: Saudi Arabia — Isha dakika 90 baada ya Magharibi',
      asrMethod: '• Kawaida: Asr wakati kivuli = urefu wa kitu.\n\n• Hanafi: Asr wakati kivuli = mara 2 — kuchelewa dakika 30–60.',
      maghrib: 'Kiwango cha tahadhari baada ya machweo ya kiangalizi. Programu inakupendekeza kiwango rasmi cha nchi yako.',
      firstAdhan: 'Adhana ya mapema kabla ya Alfajiri kwa Daku wakati wa Ramadhani.\n\nSaudia Arabia: adhana moja tu. Misri/Levant: adhana ya kwanza dakika 20–30 mapema.\n\nIkiwa nchi yako haina adhana ya kwanza, iacha kwenye Imezimwa.',
      notifications: 'Kila sala ina chaguo mbili:\n\n🔔 Tangazo: arifa ya macho ya kimya.\n🔊 Adhana: sauti kamili au fupi.',
      dhuha: 'Dhuha ni sala ya hiari baada ya machweo ya jua na kabla ya Dhuhr — rak\'a 2 hadi 8.\n\nQiyam (Tahajud) ni sala ya usiku, bora zaidi katika theluthi ya mwisho ya usiku kabla ya Fajr.\n\nWasha kila moja na uweke wakati wa ukumbusho.',
      eid: 'Sala ya Eid husaliwa asubuhi ya Eid al-Fitr (1 Shawwal) na Eid al-Adha (10 Dhul Hijjah).\n\nIngiza wakati rasmi uliotangazwa na msikiti au mji wako.\n\nChaguo hili linaonekana tu siku mbili kabla na siku ya Eid.',
      iqama: 'Iqama ni wito wa pili unaoitangazwa mara moja kabla ya sala ya jamaa kuanza msikitini.\n\nWeka hapa muda wa kupumzika (kwa dakika) kati ya wakati rasmi wa Adhana na Iqama kwa kila sala ya faradhi.\n\nBaada ya muda huo kupita, skrini kuu itabadilika kutoka kuhesabu nyuma "Sala Ijayo" hadi "Iqama katika…".',
    },
    ha: {
      language: 'Larabci shine harshen farko na dindindin.\n\nHarshe na biyu yana bayyana ƙarƙashin sunan kowace sallah. "Atomatik" yana gano ƙasarku ta GPS.',
      fontSize: 'Yana sarrafa girman rubutu na Larabci a mai karanta Alƙur\'ani kawai.',
      accessibility: 'Zaɓi jigo na launi da ya dace da buƙatun gani na ku.',
      hijri: 'Yana daidaita kwanan Hijira da aka nuna da ±1–2 kwana bisa ga sanarwar hukuma ta ganin wata a ƙasarku.',
      calcMethod: 'Yana saita kusurwar rana don Asuba da Isha.\n\n• Ligi ta Duniya ta Kiislamu: Asuba 18°, Isha 17°\n• Umm Al-Qura: Saudi Arabia — Isha minti 90 bayan Magariba',
      asrMethod: '• Ma\'auni: Azahar lokacin inuwa = tsayin abu.\n\n• Hanafi: Azahar lokacin inuwa = ninki biyu — jinkiri minti 30–60.',
      maghrib: 'Kiwon kariya bayan faɗuwar rana na tauraron dan adam. Aikace-aikacen yana ba da shawarar ma\'aunin hukuma na ƙasarku.',
      firstAdhan: 'Farkon azan kafin Asuba don Suhur a lokacin Azumi.\n\nSaudi Arabia: azan guda ɗaya. Masar/Levant: farkon azan mintuna 20–30 kafin lokaci.\n\nIdan ƙasarku ba ta da farkon azan, bar ta a kashe.',
      notifications: 'Kowane sallah yana da zaɓuɓɓuka biyu:\n\n🔔 Sanarwa: sanarwa mai shiru ta gani.\n🔊 Azan: cikakken sauti ko taƙaitaccen.',
      dhuha: 'Dhuha addu\'a ce ta son rai bayan fitowar rana da kafin Dhuhr — rak\'a 2 zuwa 8.\n\nQiyam addu\'a ce ta dare, mafi kyau a cikin kashi uku na ƙarshe na dare kafin Fajr.\n\nKunnawa kowane ɗaya ku saita lokacin tunatarwa.',
      eid: 'An yi sallar Eid safe na Eid al-Fitr (1 Shawwal) da Eid al-Adha (10 Dhul Hijjah).\n\nShiga lokacin addu\'a na hukuma da masallaci ko birnin ka ya sanar.\n\nZabin nan yana bayyana ne kwanaki biyu kafin Eid da ranar Eid.',
      iqama: 'Iqama wata kira ce ta biyu da ake yi nan take kafin sallah ta jama\'a ta fara a masallaci.\n\nKa saita a nan jinkirin (a cikin mintuna) tsakanin lokacin Azan na hukuma da Iqama don kowace sallah ta wajibi.\n\nBayan wannan jinkirin ya wuce, allo na farko yana sauya daga ƙididdiga ta "Sallah Mai Zuwa" zuwa "Iqama a cikin…".',
    },
  };

  const HELP_QIYAM: Record<string, string> = {
    ar: 'قيام الليل (التهجد) من أفضل النوافل وأعظمها أجراً. وقته من بعد العشاء حتى طلوع الفجر، وأفضله في الثلث الأخير من الليل.\n\nيُحسب وقته في التطبيق كالتالي:\n• وقت القيام = منتصف الليل الشرعي بين المغرب والفجر\n\nعند التفعيل يظهر في قائمة أوقات الصلاة ويدخل في تسلسل الصلاة التالية.',
    en: 'Qiyam al-Layl (Tahajjud) is among the best and most rewarded voluntary prayers. Its time extends from after Isha until Fajr, with the last third of the night being the most virtuous.\n\nIn the app its time is calculated as:\n• Qiyam time = midpoint of the Islamic night between Maghrib and Fajr\n\nWhen enabled it appears in the prayer times list and is included in the next prayer sequence.',
    fr: 'Le Qiyam al-Layl (Tahajjud) est parmi les meilleures prières surérogatoires. Son temps s\'étend de après Isha jusqu\'au Fajr, le dernier tiers de la nuit étant le plus vertueux.\n\nDans l\'application, son heure est calculée comme :\n• Heure du Qiyam = point médian de la nuit islamique entre le Maghrib et le Fajr\n\nLorsqu\'il est activé, il apparaît dans la liste des horaires de prière.',
    es: 'El Qiyam al-Layl (Tahajjud) es una de las mejores oraciones voluntarias. Su tiempo se extiende desde después de Isha hasta Fajr, siendo el último tercio de la noche el más virtuoso.\n\nEn la aplicación su tiempo se calcula como:\n• Tiempo de Qiyam = punto medio de la noche islámica entre Maghrib y Fajr\n\nCuando está activado aparece en la lista de horarios de oración.',
    ru: 'Кыям аль-Лайл (Тахаджуд) — одна из лучших добровольных молитв. Её время — от Иша до Фаджра, причём последняя треть ночи наиболее добродетельна.\n\nВ приложении время рассчитывается как:\n• Время Кыяма = середина исламской ночи между Магрибом и Фаджром\n\nПри включении отображается в списке времён молитв.',
    zh: '夜礼（塔哈居德）是最好和最有回报的自愿礼拜之一。其时间从宵礼后延伸到晨礼，夜晚的最后三分之一最为高尚。\n\n在应用中其时间计算为：\n• 夜礼时间 = 马格里布和晨礼之间伊斯兰夜晚的中点\n\n启用后出现在礼拜时间列表中。',
    tr: 'Kıyamu\'l-Leyl (Teheccüd), en iyi ve en çok sevap kazandıran nafile namazlardan biridir. Vakti Yatsıdan sonra Sabaha kadar uzanır, gecenin son üçte biri en faziletli zamandır.\n\nUygulamada vakti şöyle hesaplanır:\n• Kıyam vakti = Akşam ile Sabah arasındaki İslami gecenin orta noktası\n\nEtkinleştirildiğinde namaz vakitleri listesinde görünür.',
    ur: 'قیام اللیل (تہجد) بہترین نفل نمازوں میں سے ہے۔ اس کا وقت عشاء کے بعد سے فجر تک ہے، رات کا آخری تہائی حصہ سب سے افضل ہے۔\n\nایپ میں اس کا وقت اس طرح حساب کیا جاتا ہے:\n• قیام کا وقت = مغرب اور فجر کے درمیان اسلامی رات کا درمیانی نقطہ\n\nفعال ہونے پر اوقات نماز کی فہرست میں ظاہر ہوتا ہے۔',
    id: 'Qiyamul Lail (Tahajjud) adalah salah satu shalat sunnah terbaik dan paling berpahala. Waktunya dari setelah Isya hingga Fajr, dengan sepertiga malam terakhir paling utama.\n\nDalam aplikasi waktunya dihitung sebagai:\n• Waktu Qiyam = titik tengah malam Islam antara Maghrib dan Fajr\n\nSaat diaktifkan muncul dalam daftar waktu shalat.',
    bn: 'কিয়ামুল লাইল (তাহাজ্জুদ) সর্বোত্তম ও সবচেয়ে পুরস্কৃত নফল নামাজের মধ্যে অন্যতম। এর সময় এশার পরে থেকে ফজর পর্যন্ত, রাতের শেষ তৃতীয়াংশ সবচেয়ে পুণ্যময়।\n\nঅ্যাপে এর সময় গণনা করা হয়:\n• কিয়ামের সময় = মাগরিব এবং ফজরের মধ্যে ইসলামিক রাতের মধ্যবিন্দু\n\nসক্রিয় হলে নামাজের সময় তালিকায় দেখা যায়।',
    fa: 'قیام الیل (تهجد) از بهترین و پرثواب‌ترین نمازهای نافله است. وقت آن از بعد از عشاء تا فجر است و ثلث آخر شب برترین است.\n\nدر برنامه وقت آن به این صورت محاسبه می‌شود:\n• وقت قیام = نقطه میانی شب اسلامی بین مغرب و فجر\n\nهنگام فعال‌سازی در فهرست اوقات نماز نمایش داده می‌شود.',
    ms: 'Qiyamullail (Tahajjud) adalah antara solat sunat yang terbaik dan paling berpahala. Waktunya dari selepas Isyak hingga Fajr, dengan sepertiga malam terakhir paling utama.\n\nDalam aplikasi waktunya dikira sebagai:\n• Waktu Qiyam = titik tengah malam Islam antara Maghrib dan Fajr\n\nApabila diaktifkan ia muncul dalam senarai waktu solat.',
    pt: 'O Qiyam al-Layl (Tahajjud) é uma das melhores e mais recompensadas orações voluntárias. Seu tempo se estende de após Isha até Fajr, sendo o último terço da noite o mais virtuoso.\n\nNo aplicativo seu tempo é calculado como:\n• Tempo de Qiyam = ponto médio da noite islâmica entre Maghrib e Fajr\n\nQuando ativado aparece na lista de horários de oração.',
    sw: 'Qiyam al-Layl (Tahajjud) ni moja ya sala za hiari bora na zenye thawabu zaidi. Wakati wake unaendelea kutoka baada ya Isha hadi Fajr, na theluthi ya mwisho ya usiku ikiwa bora zaidi.\n\nKatika programu wakati wake unakokotolewa kama:\n• Wakati wa Qiyam = katikati ya usiku wa Kiislamu kati ya Maghrib na Fajr\n\nInapowashwa inaonekana katika orodha ya nyakati za sala.',
    ha: 'Qiyamul Lail (Tahajjud) yana cikin mafi kyawun sallolin nafila masu lada. Lokacinsa yana daga bayan Isha zuwa Fajr, da ɗaya bisa uku na ƙarshen dare mafi falala.\n\nA cikin app ana ƙididdiga lokacinsa kamar haka:\n• Lokacin Qiyam = tsakiyar dare na Musulunci tsakanin Magariba da Fajr\n\nAna nuna shi a jerin lokutan sallah idan an kunna shi.',
  };

  const showHelp = (title: string, body: string) => {
    Haptics.selectionAsync();
    Alert.alert(title, body);
  };

  const recommendedMethod = getMethodForCountry(countryCode);

  const handlePreview = async (key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (previewing === key) {
      await stopAthan();
      if (isMountedRef.current) setPreviewing(null);
    } else {
      await stopAthan();
      const type = draftNotifications[key]?.athan === 'abbreviated' ? 'abbreviated' : 'full';
      const voice = draftPrayerAdhan[key] ?? draftAdhan;
      if (isMountedRef.current) setPreviewing(key);
      playAthan(type, () => { if (isMountedRef.current) setPreviewing(null); }, voice);
    }
  };

  const normNotif = (r: Record<string, PrayerNotifConfig>) =>
    JSON.stringify(Object.fromEntries(Object.entries(r).sort()));

  const hasChanges =
    draftCalcMethod !== calcMethod ||
    draftAsrMethod !== asrMethod ||
    draftAdjustment !== (maghribAdjustment ?? 0) ||
    draftHijri !== (hijriAdjustment ?? 0) ||
    draftSecondLang !== (secondLang ?? 'auto') ||
    draftAccessibilityTheme !== (accessibilityTheme ?? 'default') ||
    draftFirstAdhanOffset !== (firstAdhanOffset ?? 0) ||
    JSON.stringify(draftIqamaOffsets) !== JSON.stringify({ ...getDefaultIqamaOffsets(countryCode), ...(iqamaOffsets ?? {}) }) ||
    normNotif(draftNotifications) !== normNotif(prayerNotifications ?? {}) ||
    draftAdhan !== (selectedAdhan ?? 'makkah') ||
    JSON.stringify(draftPrayerAdhan) !== JSON.stringify(prayerAdhan ?? {});

  const TAB_ROUTES: Record<string, string> = {
    index: '/',
    calendar: '/calendar',
    qibla: '/qibla',
    athkar: '/athkar',
    quran: '/quran',
  };

  const handleSave = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const resolvedDraft = draftSecondLang === 'auto' ? detectSecondLang(countryCode) : draftSecondLang;
    const newLang = lang !== 'ar' ? resolvedDraft : lang;
    updateSettings({
      calcMethod: draftCalcMethod,
      asrMethod: draftAsrMethod,
      maghribAdjustment: draftAdjustment,
      hijriAdjustment: draftHijri,
      prayerNotifications: draftNotifications,
      secondLang: draftSecondLang,
      lang: newLang,
      accessibilityTheme: draftAccessibilityTheme,
      firstAdhanOffset: draftFirstAdhanOffset,
      iqamaOffsets: draftIqamaOffsets,
      dhuhaTime: draftDhuhaTime,
      tahajjudTime: draftTahajjudTime,
      showDhuha: draftShowDhuha,
      showQiyam: draftShowQiyam,
      eidPrayerTime: draftEidPrayerTime,
      selectedAdhan: draftAdhan,
      prayerAdhan: draftPrayerAdhan,
    });
    const targetRoute = TAB_ROUTES[getPreviousTab()] ?? '/';
    router.replace(targetRoute as any);
  };

  const handleCancel = () => {
    Haptics.selectionAsync();
    // Reset all drafts back to committed settings (discard changes)
    setDraftCalcMethod(calcMethod);
    setDraftAsrMethod(asrMethod);
    setDraftAdjustment(maghribAdjustment ?? 0);
    setDraftHijri(hijriAdjustment ?? 0);
    setDraftNotifications(prayerNotifications ?? {});
    setDraftSecondLang(secondLang ?? 'auto');
    setDraftAccessibilityTheme(accessibilityTheme ?? 'default');
    setDraftFirstAdhanOffset(firstAdhanOffset ?? 0);
    setDraftIqamaOffsets({ ...getDefaultIqamaOffsets(countryCode), ...(iqamaOffsets ?? {}) });
    setDraftDhuhaTime(dhuhaTime ?? '07:30');
    setDraftTahajjudTime(tahajjudTime ?? '03:00');
    setDraftShowDhuha(showDhuha !== false);
    setDraftShowQiyam(showQiyam !== false);
    setDraftEidPrayerTime(eidPrayerTime ?? '07:30');
    setTempDhuhaTime(dhuhaTime ?? '07:30');
    setTempTahajjudTime(tahajjudTime ?? '03:00');
    setTempEidPrayerTime(eidPrayerTime ?? '07:30');
    setDraftAdhan(selectedAdhan ?? 'makkah');
    setDraftPrayerAdhan(prayerAdhan ?? {});
    const targetRoute = TAB_ROUTES[getPreviousTab()] ?? '/';
    router.replace(targetRoute as any);
  };

  const TAB_OPTIONS: { key: string; label: string }[] = [
    { key: 'index',    label: isAr ? 'أوقات الصلاة' : tr.prayers },
    { key: 'calendar', label: isAr ? 'اليوم' : tr.today },
    { key: 'qibla',   label: isAr ? 'القبلة' : tr.qibla },
    { key: 'athkar',  label: 'الأذكار' },
    { key: 'quran',   label: isAr ? 'القرآن الكريم' : tr.quran },
  ];

  const handleThikrToggle = async () => {
    Haptics.selectionAsync();
    const newVal = !thikrRemindersEnabled;
    if (newVal) {
      const granted = await requestNotifPermission();
      if (!granted) return;
    }
    await updateSettings({ thikrRemindersEnabled: newVal });
    if (newVal) {
      setThikrToast(true);
      setTimeout(() => setThikrToast(false), 2500);
    }
  };

  const NOTIF_PRAYERS: { key: string; ar: string; en: string }[] = [
    { key: 'fajr',    ar: 'الفجر',       en: 'Fajr' },
    { key: 'dhuha',   ar: 'الضحى',       en: 'Dhuha' },
    { key: 'dhuhr',   ar: 'الظهر',       en: 'Dhuhr' },

    { key: 'asr',     ar: 'العصر',       en: 'Asr' },
    { key: 'maghrib', ar: 'المغرب',      en: 'Maghrib' },
    { key: 'isha',    ar: 'العشاء',      en: 'Isha' },
    { key: 'qiyam',   ar: 'قيام الليل', en: 'Qiyam' },
  ];

  const EMPTY_CFG: PrayerNotifConfig = { banner: false, athan: 'none' };

  const ADHAN_OPTIONS = [
    { key: 'makkah',      label: 'Makkah',      labelAr: 'مكة' },
    { key: 'madinah',     label: 'Madinah',     labelAr: 'المدينة' },
    { key: 'egypt',       label: 'Egypt',       labelAr: 'مصر' },
    { key: 'halab',       label: 'Halab',       labelAr: 'حلب' },
    { key: 'aqsa',        label: 'Al-Aqsa',     labelAr: 'الأقصى' },
    { key: 'hussaini',    label: 'Al-Hussaini', labelAr: 'الحسيني' },
    { key: 'abdul-hakam', label: 'Abdul Hakam', labelAr: 'عبد الحكم' },
    { key: 'bakir',       label: 'Bakir Bash',  labelAr: 'باكر باش' },
  ];

  const requestNotifPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'web') return true;

    // FIX 2 + FIX 4 — proper iOS permission flow
    // Step 1: Check current status without prompting
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Step 2: Only request if not yet determined (first time)
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowCriticalAlerts: false,
          provideAppNotificationSettings: false,
        },
      });
      finalStatus = status;
    }

    // Step 3: If still not granted (user denied), guide them to Settings
    if (finalStatus !== 'granted') {
      Alert.alert(
        isAr ? 'الإشعارات معطلة' : 'Notifications Disabled',
        isAr
          ? 'يرجى تفعيل الإشعارات لتطبيق مواقيت من إعدادات جهازك.'
          : 'Please enable notifications for Mawaqit in your iPhone Settings.',
        [
          { text: isAr ? 'إلغاء' : 'Cancel', style: 'cancel' },
          {
            text: isAr ? 'فتح الإعدادات' : 'Open Settings',
            onPress: () => Linking.openURL('app-settings:'),
          },
        ],
      );
      return false;
    }

    return true;
  };

  const setPrayerBanner = async (key: string, on: boolean) => {
    if (on && !await requestNotifPermission()) return;
    Haptics.selectionAsync();
    setDraftNotifications(prev => ({
      ...prev,
      [key]: { ...(prev[key] ?? EMPTY_CFG), banner: on },
    }));
  };

  const setPrayerAthan = async (key: string, athan: PrayerNotifConfig['athan']) => {
    if (athan !== 'none' && !await requestNotifPermission()) return;
    Haptics.selectionAsync();
    setDraftNotifications(prev => ({
      ...prev,
      [key]: { ...(prev[key] ?? EMPTY_CFG), athan },
    }));

    // If this prayer is actively being previewed, restart with the new type
    // so the audio doesn't keep playing the old adhan while the UI shows the new selection.
    if (previewing === key) {
      await stopAthan();
      if (athan === 'none') {
        if (isMountedRef.current) setPreviewing(null);
      } else {
        const type = athan === 'abbreviated' ? 'abbreviated' : 'full';
        const voice = draftPrayerAdhan[key] ?? draftAdhan;
        if (isMountedRef.current) setPreviewing(key);
        playAthan(type, () => { if (isMountedRef.current) setPreviewing(null); }, voice);
      }
    }
  };


  const Row = ({
    label, right, noBorder, onHelp,
  }: { label: string; right: React.ReactNode; noBorder?: boolean; onHelp?: () => void }) => (
    <View style={[
      styles.settingRow,
      { borderBottomColor: C.separator, borderBottomWidth: noBorder ? 0 : 1, flexDirection: isRtl ? 'row-reverse' : 'row' }
    ]}>
      <View style={{ flexDirection: isRtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 4, flexShrink: 1 }}>
        <Text style={[styles.settingLabel, { color: C.text, fontFamily: isRtl ? 'Amiri_400Regular' : SANS, textAlign: isRtl ? 'right' : 'left' }]}>
          {label}
        </Text>
        {onHelp && (
          <Pressable onPress={onHelp} hitSlop={8}>
            <MaterialCommunityIcons name="help-circle-outline" size={18} color={C.textMuted} />
          </Pressable>
        )}
      </View>
      <View style={[styles.rightSide, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
        {right}
      </View>
    </View>
  );

  const Chip = ({ value, selected, onPress }: { value: string; selected: boolean; onPress: () => void }) => (
    <Pressable
      onPress={() => { Haptics.selectionAsync(); onPress(); }}
      style={[
        styles.chip,
        { backgroundColor: selected ? C.tint : C.backgroundSecond, borderColor: C.separator },
      ]}
    >
      <Text style={{ color: selected ? C.tintText : C.textSecond, fontSize: 11, fontWeight: '600' }}>
        {value}
      </Text>
    </Pressable>
  );

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>

      {/* ── Header (fixed, outside ScrollView) ── */}
      <View style={[styles.headerWrap, { paddingTop: topInset + 10, paddingHorizontal: 20 }]}>

        {/* ROW 1: ThemeToggle + LangToggle (left) | AppLogo (center) | empty balance (right) */}
        <View style={[styles.header, { marginBottom: 2 }]}>
          <View style={{ flex: 1, flexDirection: 'row', gap: 8 }}>
            <ThemeToggle />
            <LangToggle />
          </View>
          <AppLogo tintColor={C.tint} lang={lang} />
          <View style={[styles.headerActions, { flex: 1, justifyContent: 'flex-end' }]} />
        </View>

        {/* ROW 2: Cancel | "Settings" title centered | Save */}
        <View style={{ flexDirection: isRtl ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2, marginBottom: 2 }}>
          {/* Title absolutely centered over the full row */}
          <Text
            style={[styles.pageTitle, {
              position: 'absolute', left: 0, right: 0, textAlign: 'center',
              color: C.text, fontFamily: isRtl ? 'Amiri_700Bold' : 'Inter_700Bold',
            }]}
            pointerEvents="none"
          >
            {tr.settings}
          </Text>
          <Pressable
            onPress={handleCancel}
            style={({ pressed }) => [styles.cancelBtn, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={[styles.cancelBtnText, { color: C.textMuted }]}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Text>
          </Pressable>
          <Pressable
            onPress={handleSave}
            style={({ pressed }) => [
              styles.saveBtn,
              { backgroundColor: hasChanges ? C.tint : C.tintLight, opacity: pressed ? 0.8 : 1 }
            ]}
          >
            <Text style={[styles.saveBtnText, { color: hasChanges ? C.tintText : C.tint }]}>
              {isAr ? 'حفظ' : 'Save'}
            </Text>
          </Pressable>
        </View>

        {/* ROW 4: Font sizer — right-aligned, above first section */}
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 4, marginBottom: 4 }}>
          <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
            <Pressable
              onPress={decreaseFont}
              disabled={!canDecrease}
              style={[styles.fontPill, { backgroundColor: C.backgroundSecond, opacity: canDecrease ? 1 : 0.3 }]}
            >
              <Text style={[styles.fontPillLabel, { color: C.textMuted }]}>A−</Text>
            </Pressable>
            <Text style={{ fontSize: 11, color: C.textMuted, minWidth: 28, textAlign: 'center', fontFamily: 'Inter_600SemiBold' }}>
              {SIZE_LABELS[fontSize as typeof FONT_STEPS[number]] ?? 'M'}
            </Text>
            <Pressable
              onPress={increaseFont}
              disabled={!canIncrease}
              style={[styles.fontPill, { backgroundColor: C.backgroundSecond, opacity: canIncrease ? 1 : 0.3 }]}
            >
              <Text style={[styles.fontPillLabel, { color: C.textMuted, fontSize: 14 }]}>A+</Text>
            </Pressable>
          </View>
        </View>

      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomInset + 40 }}
        showsVerticalScrollIndicator={false}
      >

        {/* General */}
        <View style={{ flexDirection: isRtl ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 6, marginLeft: isRtl ? 0 : 4, marginRight: isRtl ? 4 : 0 }}>
          <Text style={[styles.sectionTitle, { color: C.tint, fontFamily: isRtl ? 'Amiri_700Bold' : SANS, textAlign: isRtl ? 'right' : 'left', marginTop: 0, marginBottom: 0 }]}>
            {isAr ? 'عام' : 'General'}
          </Text>
        </View>
        <View style={[styles.card, { backgroundColor: C.backgroundCard, borderColor: C.separator }]}>
          <Pressable
            onPress={() => { Haptics.selectionAsync(); setShowDefaultTabModal(true); }}
            style={[styles.settingRow, { borderBottomWidth: 0, flexDirection: isRtl ? 'row-reverse' : 'row' }]}
          >
            <View style={{ flexDirection: isRtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <Ionicons name="home-outline" size={18} color={C.tint} />
              <Text style={[styles.settingLabel, { color: C.text, fontFamily: isRtl ? 'Amiri_400Regular' : SANS }]}>
                {tr.default_tab_label}
              </Text>
              <Pressable onPress={(e) => { e.stopPropagation(); Haptics.selectionAsync(); Alert.alert(tr.default_tab_help_title, tr.default_tab_help_body); }} hitSlop={8}>
                <Ionicons name="help-circle-outline" size={18} color={C.textMuted} />
              </Pressable>
            </View>
            <View style={{ flexDirection: isRtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ color: C.textMuted, fontSize: 13, fontFamily: SANS }}>
                {TAB_OPTIONS.find(o => o.key === (defaultTab ?? 'index'))?.label ?? TAB_OPTIONS[0]!.label}
              </Text>
              <MaterialCommunityIcons name={isRtl ? 'chevron-left' : 'chevron-right'} size={18} color={C.textMuted} />
            </View>
          </Pressable>
        </View>

        {/* Accessibility */}
        <View style={{ flexDirection: isRtl ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 6, marginLeft: isRtl ? 0 : 4, marginRight: isRtl ? 4 : 0 }}>
          <Text style={[styles.sectionTitle, { color: C.tint, fontFamily: isRtl ? 'Amiri_700Bold' : SANS, textAlign: isRtl ? 'right' : 'left', marginTop: 0, marginBottom: 0 }]}>
            {isAr ? 'المساعدة البصرية' : 'Accessibility'}
          </Text>
        </View>
        <View style={[styles.card, { backgroundColor: C.backgroundCard, borderColor: C.separator }]}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', padding: 10, gap: 8 }}>
            {([
              { key: 'default' as AccessibilityTheme,       label: isAr ? 'الافتراضي'    : 'Default',       swatchLight: '#1a7a4a', swatchDark: '#34C759' },
              { key: 'high-contrast' as AccessibilityTheme, label: isAr ? 'تباين عالٍ'   : 'High Contrast',  swatchLight: '#000000', swatchDark: '#FFFFFF' },
              { key: 'colorblind' as AccessibilityTheme,    label: isAr ? 'عمى الألوان'  : 'Color Blind',    swatchLight: '#0055CC', swatchDark: '#409CFF' },
              { key: 'warm' as AccessibilityTheme,          label: isAr ? 'دافئ'          : 'Warm',           swatchLight: '#8C6400', swatchDark: '#E8A000' },
              { key: 'blossom' as AccessibilityTheme,       label: isAr ? 'الوردي'        : 'Blossom',        swatchLight: '#B83255', swatchDark: '#FF7AA0' },
              { key: 'ocean' as AccessibilityTheme,         label: isAr ? 'المحيط'        : 'Ocean',          swatchLight: '#0B6FAA', swatchDark: '#4FC3F7' },
              { key: 'violet' as AccessibilityTheme,        label: isAr ? 'البنفسجي'      : 'Violet',         swatchLight: '#6B3FA0', swatchDark: '#C084FC' },
              { key: 'gold' as AccessibilityTheme,          label: isAr ? 'الذهبي'        : 'Gold',           swatchLight: '#8B6800', swatchDark: '#FFD60A' },
            ] as const).map((theme) => {
              const isSelected = draftAccessibilityTheme === theme.key;
              const swatch = isDark ? theme.swatchDark : theme.swatchLight;
              const hex = swatch.replace('#', '');
              const r = parseInt(hex.slice(0, 2), 16) / 255;
              const g = parseInt(hex.slice(2, 4), 16) / 255;
              const b = parseInt(hex.slice(4, 6), 16) / 255;
              const linearize = (c: number) => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
              const L = 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
              const checkColor = L > 0.35 ? '#000000' : '#FFFFFF';
              return (
                <Pressable
                  key={theme.key}
                  onPress={() => { Haptics.selectionAsync(); setDraftAccessibilityTheme(theme.key); }}
                  style={[
                    styles.accessTile,
                    {
                      backgroundColor: isSelected ? C.tint + '18' : C.backgroundSecond,
                      borderColor: isSelected ? C.tint : C.separator,
                      flexDirection: isRtl ? 'row-reverse' : 'row',
                    },
                  ]}
                >
                  <View style={[styles.accessSwatch, { backgroundColor: swatch }]}>
                    {isSelected && <Ionicons name="checkmark" size={10} color={checkColor} />}
                  </View>
                  <Text style={[
                    styles.accessThemeLabel,
                    { color: isSelected ? C.tint : C.text, fontWeight: isSelected ? '700' : '500', fontFamily: isRtl ? 'Amiri_400Regular' : SANS, textAlign: isRtl ? 'right' : 'left', flex: 1 }
                  ]} numberOfLines={1}>
                    {theme.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Hijri date adjustment */}
        <View style={{ flexDirection: isRtl ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 6, marginLeft: isRtl ? 0 : 4, marginRight: isRtl ? 4 : 0 }}>
          <Text style={[styles.sectionTitle, { color: C.tint, fontFamily: isRtl ? 'Amiri_700Bold' : SANS, textAlign: isRtl ? 'right' : 'left', marginTop: 0, marginBottom: 0 }]}>
            {isAr ? 'التقويم الهجري' : 'Hijri Calendar'}
          </Text>
          <Pressable onPress={() => showHelp(isAr ? 'تعديل التاريخ الهجري' : 'Hijri Date Adjustment', HELP[lang]?.hijri ?? HELP['en'].hijri)} hitSlop={8}>
            <MaterialCommunityIcons name="help-circle-outline" size={18} color={C.textMuted} />
          </Pressable>
        </View>
        <View style={[styles.card, { backgroundColor: C.backgroundCard, borderColor: C.separator }]}>
          <View style={[styles.settingRow, { borderBottomWidth: 0, flexDirection: 'column', alignItems: isRtl ? 'flex-end' : 'flex-start', gap: 8 }]}>
            <Text style={[styles.settingLabel, { color: C.text, fontFamily: isRtl ? 'Amiri_400Regular' : SANS, textAlign: isRtl ? 'right' : 'left' }]}>
              {tr.hijriAdjustment}
            </Text>
            <View style={[styles.stepperRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
              <View style={[styles.stepperControls, { backgroundColor: C.backgroundSecond, borderColor: C.separator }]}>
                <Pressable
                  onPress={() => { Haptics.selectionAsync(); setDraftHijri(v => Math.max(v - 1, -2)); }}
                  style={({ pressed }) => [styles.stepperBtn, { opacity: pressed ? 0.6 : 1 }]}
                >
                  <Ionicons name="remove" size={18} color={C.tint} />
                </Pressable>
                <Text style={[styles.stepperValue, { color: C.text }]}>
                  {draftHijri > 0 ? `+${draftHijri}` : draftHijri}
                </Text>
                <Pressable
                  onPress={() => { Haptics.selectionAsync(); setDraftHijri(v => Math.min(v + 1, 2)); }}
                  style={({ pressed }) => [styles.stepperBtn, { opacity: pressed ? 0.6 : 1 }]}
                >
                  <Ionicons name="add" size={18} color={C.tint} />
                </Pressable>
              </View>
              <Text style={[styles.stepperLabel, { color: C.textSecond, fontFamily: isRtl ? 'Amiri_400Regular' : SANS }]}>
                {isAr ? 'يوم' : draftHijri === 0 ? 'no offset' : Math.abs(draftHijri) === 1 ? 'day' : 'days'}
              </Text>
              {draftHijri !== 0 && (
                <Pressable onPress={() => { Haptics.selectionAsync(); setDraftHijri(0); }}>
                  <Text style={{ color: C.tint, fontSize: 12, fontWeight: '600' }}>
                    {isAr ? 'إعادة ضبط' : 'Reset'}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>

        {/* Prayer Calculation */}
        <View style={{ flexDirection: isRtl ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 6, marginLeft: isRtl ? 0 : 4, marginRight: isRtl ? 4 : 0 }}>
          <Text style={[styles.sectionTitle, { color: C.tint, fontFamily: isRtl ? 'Amiri_700Bold' : SANS, textAlign: isRtl ? 'right' : 'left', marginTop: 0, marginBottom: 0 }]}>
            {isAr ? 'حساب أوقات الصلاة' : 'Prayer Calculation'}
          </Text>
          <Pressable onPress={() => showHelp(isAr ? 'طريقة الحساب' : 'Calculation Method', HELP[lang]?.calcMethod ?? HELP['en'].calcMethod)} hitSlop={8}>
            <MaterialCommunityIcons name="help-circle-outline" size={18} color={C.textMuted} />
          </Pressable>
        </View>
        <View style={[styles.card, { backgroundColor: C.backgroundCard, borderColor: C.separator }]}>
          {/* Calculation method — dropdown row */}
          <Pressable
            onPress={() => { Haptics.selectionAsync(); setShowMethodModal(true); }}
            style={[styles.settingRow, { borderBottomColor: C.separator, borderBottomWidth: 1, flexDirection: isRtl ? 'row-reverse' : 'row' }]}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.settingLabel, { color: C.text, fontFamily: isRtl ? 'Amiri_400Regular' : SANS, textAlign: isRtl ? 'right' : 'left' }]}>
                {tr.calculationMethod}
              </Text>
              <Text style={{ color: C.tint, fontSize: 12, fontFamily: isRtl ? 'Amiri_400Regular' : SANS, textAlign: isRtl ? 'right' : 'left' }} numberOfLines={1}>
                {tr.methods[draftCalcMethod] ?? draftCalcMethod}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name={isRtl ? 'chevron-back' : 'chevron-forward'} size={18} color={C.textMuted} />
            </View>
          </Pressable>

          {/* Method picker modal */}
          <Modal visible={showMethodModal} animationType="slide" transparent presentationStyle="pageSheet">
            <View style={[styles.modalContainer, { backgroundColor: C.background }]}>
              <View style={[styles.modalHeader, { borderBottomColor: C.separator, flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                <Text style={[styles.modalTitle, { color: C.text, fontFamily: isRtl ? 'Amiri_700Bold' : SANS }]}>
                  {tr.calculationMethod}
                </Text>
                <Pressable onPress={() => setShowMethodModal(false)}>
                  <Ionicons name="close" size={22} color={C.textSecond} />
                </Pressable>
              </View>
              <ScrollView>
                {ALL_CALC_METHODS.map((m, idx) => {
                  const label = tr.methods[m] ?? m;
                  const isSelected = draftCalcMethod === m;
                  const isRecommended = recommendedMethod === m;
                  const isLast = idx === ALL_CALC_METHODS.length - 1;
                  return (
                    <Pressable
                      key={m}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setDraftCalcMethod(m);
                        setShowMethodModal(false);
                      }}
                      style={[
                        styles.methodRow,
                        { borderBottomColor: C.separator, borderBottomWidth: isLast ? 0 : 1, flexDirection: isRtl ? 'row-reverse' : 'row' },
                        isSelected && { backgroundColor: C.tint + '18' },
                      ]}
                    >
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={{
                          fontSize: 13, fontWeight: isSelected ? '700' : '500',
                          color: isSelected ? C.tint : C.text,
                          fontFamily: isRtl ? 'Amiri_400Regular' : SANS,
                          textAlign: isRtl ? 'right' : 'left',
                        }}>
                          {label}
                        </Text>
                        {isRecommended && (
                          <View style={[styles.recommendedBadge, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                            <Ionicons name="location-outline" size={11} color={C.tint} />
                            <Text style={{ fontSize: 11, color: C.tint, fontFamily: isRtl ? 'Amiri_400Regular' : SANS }}>
                              {tr.recommendedForLocation}
                            </Text>
                          </View>
                        )}
                      </View>
                      {isSelected && <Ionicons name="checkmark" size={18} color={C.tint} />}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </Modal>

          {/* Adhan Voice Picker Modal */}
          <Modal visible={showAdhanModal} animationType="slide" transparent presentationStyle="pageSheet">
            <View style={[styles.modalContainer, { backgroundColor: C.background }]}>
              <View style={[styles.modalHeader, { borderBottomColor: C.separator, flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                <Text style={[styles.modalTitle, { color: C.text, fontFamily: isRtl ? 'Amiri_700Bold' : SANS }]}>
                  {isAr ? 'صوت الأذان' : 'Adhan Voice'}
                </Text>
                <Pressable onPress={() => setShowAdhanModal(false)}>
                  <Ionicons name="close" size={22} color={C.textSecond} />
                </Pressable>
              </View>
              <ScrollView>
                {ADHAN_OPTIONS.map((opt, idx) => {
                  const isSelected = draftAdhan === opt.key;
                  const isLast = idx === ADHAN_OPTIONS.length - 1;
                  return (
                    <Pressable
                      key={opt.key}
                      onPress={() => {
                        Haptics.selectionAsync();
                        stopAthan();
                        setPreviewing(null);
                        setDraftAdhan(opt.key);
                        setShowAdhanModal(false);
                      }}
                      style={[
                        styles.methodRow,
                        { borderBottomColor: C.separator, borderBottomWidth: isLast ? 0 : 1, flexDirection: isRtl ? 'row-reverse' : 'row' },
                        isSelected && { backgroundColor: C.tint + '18' },
                      ]}
                    >
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={{ fontSize: 13, fontWeight: isSelected ? '700' : '500', color: isSelected ? C.tint : C.text, fontFamily: isRtl ? 'Amiri_400Regular' : SANS, textAlign: isRtl ? 'right' : 'left' }}>
                          {isAr ? opt.labelAr : opt.label}
                        </Text>
                        {!isAr && (
                          <Text style={{ fontSize: 12, color: C.textSecond, fontFamily: 'Amiri_400Regular' }}>
                            {opt.labelAr}
                          </Text>
                        )}
                      </View>
                      {isSelected && <Ionicons name="checkmark" size={18} color={C.tint} />}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </Modal>

          {/* Per-Prayer Adhan Picker Modal */}
          <Modal visible={activePrayerAdhanKey !== null} animationType="slide" transparent presentationStyle="pageSheet">
            <View style={[styles.modalContainer, { backgroundColor: C.background }]}>
              <View style={[styles.modalHeader, { borderBottomColor: C.separator, flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                <Text style={[styles.modalTitle, { color: C.text, fontFamily: isRtl ? 'Amiri_700Bold' : SANS }]}>
                  {isAr ? 'صوت الأذان' : 'Adhan Voice'}
                </Text>
                <Pressable onPress={() => setActivePrayerAdhanKey(null)}>
                  <Ionicons name="close" size={22} color={C.textSecond} />
                </Pressable>
              </View>
              <ScrollView>
                {/* "Default" option — inherit from global */}
                {(() => {
                  const effectiveDefault = draftAdhan;
                  const defaultLabel = ADHAN_OPTIONS.find(o => o.key === effectiveDefault);
                  const isSelected = activePrayerAdhanKey !== null && !(activePrayerAdhanKey in draftPrayerAdhan);
                  return (
                    <Pressable
                      onPress={() => {
                        Haptics.selectionAsync();
                        if (activePrayerAdhanKey) {
                          setDraftPrayerAdhan(prev => {
                            const next = { ...prev };
                            delete next[activePrayerAdhanKey];
                            return next;
                          });
                        }
                        setActivePrayerAdhanKey(null);
                      }}
                      style={[
                        styles.methodRow,
                        { borderBottomColor: C.separator, borderBottomWidth: 1, flexDirection: isRtl ? 'row-reverse' : 'row' },
                        isSelected && { backgroundColor: C.tint + '18' },
                      ]}
                    >
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={{ fontSize: 13, fontWeight: isSelected ? '700' : '500', color: isSelected ? C.tint : C.text, fontFamily: isRtl ? 'Amiri_400Regular' : SANS, textAlign: isRtl ? 'right' : 'left' }}>
                          {isAr ? `افتراضي (${defaultLabel?.labelAr ?? 'مكة'})` : `Default (${defaultLabel?.label ?? 'Makkah'})`}
                        </Text>
                      </View>
                      {isSelected && <Ionicons name="checkmark" size={18} color={C.tint} />}
                    </Pressable>
                  );
                })()}
                {ADHAN_OPTIONS.map((opt, idx) => {
                  const isSelected = activePrayerAdhanKey !== null && draftPrayerAdhan[activePrayerAdhanKey] === opt.key;
                  const isLast = idx === ADHAN_OPTIONS.length - 1;
                  return (
                    <Pressable
                      key={opt.key}
                      onPress={() => {
                        Haptics.selectionAsync();
                        if (activePrayerAdhanKey) {
                          setDraftPrayerAdhan(prev => ({ ...prev, [activePrayerAdhanKey]: opt.key }));
                        }
                        setActivePrayerAdhanKey(null);
                      }}
                      style={[
                        styles.methodRow,
                        { borderBottomColor: C.separator, borderBottomWidth: isLast ? 0 : 1, flexDirection: isRtl ? 'row-reverse' : 'row' },
                        isSelected && { backgroundColor: C.tint + '18' },
                      ]}
                    >
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={{ fontSize: 13, fontWeight: isSelected ? '700' : '500', color: isSelected ? C.tint : C.text, fontFamily: isRtl ? 'Amiri_400Regular' : SANS, textAlign: isRtl ? 'right' : 'left' }}>
                          {isAr ? opt.labelAr : opt.label}
                        </Text>
                        {!isAr && (
                          <Text style={{ fontSize: 12, color: C.textSecond, fontFamily: 'Amiri_400Regular' }}>{opt.labelAr}</Text>
                        )}
                      </View>
                      {isSelected && <Ionicons name="checkmark" size={18} color={C.tint} />}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </Modal>

          {/* Default Tab Picker Modal */}
          <Modal visible={showDefaultTabModal} animationType="slide" transparent presentationStyle="pageSheet">
            <View style={[styles.modalContainer, { backgroundColor: C.background }]}>
              <View style={[styles.modalHeader, { borderBottomColor: C.separator, flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                <Text style={[styles.modalTitle, { color: C.text, fontFamily: isRtl ? 'Amiri_700Bold' : SANS }]}>
                  {tr.default_tab_label}
                </Text>
                <Pressable onPress={() => setShowDefaultTabModal(false)}>
                  <Ionicons name="close" size={22} color={C.textSecond} />
                </Pressable>
              </View>
              <ScrollView>
                {TAB_OPTIONS.map((tab, idx) => {
                  const isSelected = (defaultTab ?? 'index') === tab.key;
                  const isLast = idx === TAB_OPTIONS.length - 1;
                  return (
                    <Pressable
                      key={tab.key}
                      onPress={() => {
                        Haptics.selectionAsync();
                        updateSettings({ defaultTab: tab.key });
                        setShowDefaultTabModal(false);
                      }}
                      style={[
                        styles.methodRow,
                        { borderBottomColor: C.separator, borderBottomWidth: isLast ? 0 : 1, flexDirection: isRtl ? 'row-reverse' : 'row' },
                        isSelected && { backgroundColor: C.tint + '18' },
                      ]}
                    >
                      <Text style={{
                        fontSize: 13, fontWeight: isSelected ? '700' : '500',
                        color: isSelected ? C.tint : C.text,
                        fontFamily: isRtl ? 'Amiri_400Regular' : SANS,
                        flex: 1, textAlign: isRtl ? 'right' : 'left',
                      }}>
                        {tab.label}
                      </Text>
                      {isSelected && <Ionicons name="checkmark" size={18} color={C.tint} />}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </Modal>

          {/* Asr method */}
          <Row
            label={tr.asrMethod}
            onHelp={() => showHelp(isAr ? 'طريقة حساب العصر' : 'Asr Calculation Method', HELP[lang]?.asrMethod ?? HELP['en'].asrMethod)}
            right={
              <View style={styles.chips}>
                <Chip value={tr.standard} selected={draftAsrMethod === 'standard'} onPress={() => setDraftAsrMethod('standard')} />
                <Chip value={tr.hanafi}   selected={draftAsrMethod === 'hanafi'}   onPress={() => setDraftAsrMethod('hanafi')} />
              </View>
            }
          />

          {/* Maghrib offset — compact single section */}
          <View style={[styles.settingRow, { borderBottomWidth: 0, flexDirection: 'column', alignItems: 'stretch', gap: 6 }]}>
            <View style={{ flexDirection: isRtl ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: isRtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 4 }}>
                <Text style={[styles.settingLabel, { color: C.text, fontFamily: isRtl ? 'Amiri_400Regular' : SANS, textAlign: isRtl ? 'right' : 'left' }]}>
                  {isAr ? 'احتياط المغرب' : 'Maghrib Safety Margin'}
                </Text>
                <Pressable onPress={() => showHelp(isAr ? 'احتياط المغرب' : 'Maghrib Safety Margin', HELP[lang]?.maghrib ?? HELP['en'].maghrib)} hitSlop={8}>
                  <MaterialCommunityIcons name="help-circle-outline" size={18} color={C.textMuted} />
                </Pressable>
              </View>
            </View>
            <View style={{ flexDirection: isRtl ? 'row-reverse' : 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              {/* Recommended badge */}
              <View style={[styles.autoOffsetBadge, { backgroundColor: C.tint + '22', borderColor: C.tint + '55', flexDirection: isRtl ? 'row-reverse' : 'row', flex: 1 }]}>
                <Ionicons name="location-outline" size={12} color={C.tint} />
                <Text style={[styles.autoOffsetText, { color: C.tint, fontSize: 12 }]}>
                  {isAr
                    ? `${maghribBase} ${maghribBase === 1 ? 'دقيقة' : 'دقائق'}${countryCode ? ` (${countryCode})` : ''}`
                    : `${maghribBase} min${countryCode ? ` (${countryCode})` : ''}`}
                </Text>
              </View>
              {/* Stepper */}
              <View style={[styles.stepperControls, { backgroundColor: C.backgroundSecond, borderColor: C.separator }]}>
                <Pressable
                  onPress={() => { Haptics.selectionAsync(); setDraftAdjustment(v => Math.max(v - 1, -maghribBase)); }}
                  style={({ pressed }) => [styles.stepperBtn, { opacity: pressed ? 0.6 : 1 }]}
                >
                  <Ionicons name="remove" size={16} color={C.tint} />
                </Pressable>
                <Text style={[styles.stepperValue, { color: C.text, minWidth: 28 }]}>
                  {draftAdjustment > 0 ? `+${draftAdjustment}` : draftAdjustment}
                </Text>
                <Pressable
                  onPress={() => { Haptics.selectionAsync(); setDraftAdjustment(v => Math.min(v + 1, 30)); }}
                  style={({ pressed }) => [styles.stepperBtn, { opacity: pressed ? 0.6 : 1 }]}
                >
                  <Ionicons name="add" size={16} color={C.tint} />
                </Pressable>
              </View>
              {/* Total */}
              <View style={[styles.totalBadge, { backgroundColor: C.tint, paddingHorizontal: 8, paddingVertical: 4 }]}>
                <Text style={[styles.totalBadgeText, { color: C.tintText, fontSize: 12 }]}>
                  {isAr ? `= ${maghribBase + draftAdjustment} د` : `= ${maghribBase + draftAdjustment} min`}
                </Text>
              </View>
              {draftAdjustment !== 0 && (
                <Pressable onPress={() => { Haptics.selectionAsync(); setDraftAdjustment(0); }}>
                  <Text style={{ color: C.tint, fontSize: 11, fontWeight: '600' }}>
                    {isAr ? 'إعادة ضبط' : 'Reset'}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* First Adhan */}
          <View style={[styles.compactRow, { borderBottomWidth: 0, flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            <View style={{ flexDirection: isRtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 4, flex: 1 }}>
              <Text style={[styles.settingLabel, { color: C.text, fontFamily: isRtl ? 'Amiri_400Regular' : SANS, textAlign: isRtl ? 'right' : 'left' }]}>
                {tr.firstAdhanSetting}
              </Text>
              <Pressable onPress={() => showHelp(isAr ? 'الأذان الأول للفجر' : 'First Adhan (Early Fajr)', HELP[lang]?.firstAdhan ?? HELP['en'].firstAdhan)} hitSlop={8}>
                <MaterialCommunityIcons name="help-circle-outline" size={18} color={C.textMuted} />
              </Pressable>
            </View>
            <View style={{ flexDirection: isRtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
              <Pressable
                onPress={() => { Haptics.selectionAsync(); setShowFirstAdhanPicker(true); }}
                style={[styles.dropdownBtn, { backgroundColor: C.tint + '1A', borderColor: C.tint + '40' }]}
              >
                <Text style={[styles.dropdownBtnText, { color: C.tint, fontFamily: isRtl ? 'Amiri_400Regular' : SANS }]}>
                  {draftFirstAdhanOffset === 0
                    ? (isAr ? 'إيقاف' : 'Off')
                    : isAr ? `${draftFirstAdhanOffset} د قبل` : `${draftFirstAdhanOffset} min before`}
                </Text>
                <Ionicons name="chevron-down" size={13} color={C.tint} />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Iqama Settings */}
        <View style={{ flexDirection: isRtl ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 6, marginLeft: isRtl ? 0 : 4, marginRight: isRtl ? 4 : 0 }}>
          <Text style={[styles.sectionTitle, { color: C.tint, fontFamily: isRtl ? 'Amiri_700Bold' : SANS, textAlign: isRtl ? 'right' : 'left', marginTop: 0, marginBottom: 0 }]}>
            {tr.iqamaSettings}
          </Text>
          <Pressable onPress={() => showHelp(isAr ? 'وقت الإقامة' : 'Iqama Time', HELP[lang]?.iqama ?? HELP['en'].iqama)} hitSlop={8}>
            <MaterialCommunityIcons name="help-circle-outline" size={18} color={C.textMuted} />
          </Pressable>
        </View>
        <View style={[styles.card, { backgroundColor: C.backgroundCard, borderColor: C.separator }]}>
          {(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const).map((prayer, idx, arr) => (
            <View
              key={prayer}
              style={[styles.compactRow, {
                borderBottomWidth: idx < arr.length - 1 ? 1 : 0,
                borderBottomColor: C.separator,
                flexDirection: isRtl ? 'row-reverse' : 'row',
              }]}
            >
              <Text style={[styles.settingLabel, { color: C.text, fontFamily: isRtl ? 'Amiri_400Regular' : SANS, textAlign: isRtl ? 'right' : 'left', flex: 1 }]}>
                {isAr
                  ? { fajr: 'الفجر', dhuhr: 'الظهر', asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء' }[prayer]
                  : { fajr: 'Fajr', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha' }[prayer]}
              </Text>
              <Pressable
                onPress={() => { Haptics.selectionAsync(); setShowIqamaPicker(prayer); }}
                style={[styles.dropdownBtn, { backgroundColor: C.tint + '1A', borderColor: C.tint + '40' }]}
              >
                <Text style={[styles.dropdownBtnText, { color: C.tint, fontFamily: isRtl ? 'Amiri_400Regular' : SANS }]}>
                  {isAr ? `${draftIqamaOffsets[prayer] ?? 10} د` : `${draftIqamaOffsets[prayer] ?? 10} min`}
                </Text>
                <Ionicons name="chevron-down" size={13} color={C.tint} />
              </Pressable>
            </View>
          ))}
        </View>

        {/* Nafl Prayer Timings */}
        <View style={{ flexDirection: isRtl ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 6, marginLeft: isRtl ? 0 : 4, marginRight: isRtl ? 4 : 0 }}>
          <Text style={[styles.sectionTitle, { color: C.tint, fontFamily: isRtl ? 'Amiri_700Bold' : SANS, textAlign: isRtl ? 'right' : 'left', marginTop: 0, marginBottom: 0 }]}>
            {isAr ? 'الضحى وقيام الليل' : 'Dhuha & Qiyam'}
          </Text>
        </View>
        <View style={[styles.card, { backgroundColor: C.backgroundCard, borderColor: C.separator }]}>

            {/* ── Dhuha row (toggle + time inline) ── */}
          <View style={[styles.compactRow, { borderBottomWidth: 1, borderBottomColor: C.separator, flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            <View style={{ flexDirection: isRtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 4, flex: 1 }}>
              <Text style={[styles.settingLabel, { color: C.text, fontFamily: isRtl ? 'Amiri_400Regular' : SANS, textAlign: isRtl ? 'right' : 'left' }]}>
                {isAr ? 'الضحى' : 'Dhuha'}
              </Text>
              <Pressable onPress={() => showHelp(isAr ? 'صلاة الضحى' : 'Dhuha Prayer', HELP[lang]?.dhuha ?? HELP['en'].dhuha)} hitSlop={8}>
                <MaterialCommunityIcons name="help-circle-outline" size={18} color={C.textMuted} />
              </Pressable>
            </View>
            <View style={[{ flexDirection: isRtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }, !draftShowDhuha && { opacity: 0.38 }]} pointerEvents={draftShowDhuha ? 'auto' : 'none'}>
              <Pressable
                onPress={() => { Haptics.selectionAsync(); setTempDhuhaTime(draftDhuhaTime); setShowDhuhaRoller(true); }}
                style={[styles.timeBtn, { backgroundColor: C.tint + '1A', borderColor: C.tint + '40' }]}
              >
                <Text style={[styles.timeBtnText, { color: C.tint }]}>{draftDhuhaTime}</Text>
              </Pressable>
            </View>
            <Switch
              value={draftShowDhuha}
              onValueChange={v => { Haptics.selectionAsync(); setDraftShowDhuha(v); }}
              trackColor={{ false: C.separator, true: C.tint + '88' }}
              thumbColor={draftShowDhuha ? C.tint : C.textMuted}
            />
          </View>

          {/* ── Qiyam row (toggle + time inline) ── */}
          <View style={[styles.compactRow, { borderBottomWidth: 1, borderBottomColor: C.separator, flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            <View style={{ flexDirection: isRtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 4, flex: 1 }}>
              <Text style={[styles.settingLabel, { color: C.text, fontFamily: isRtl ? 'Amiri_400Regular' : SANS, textAlign: isRtl ? 'right' : 'left' }]}>
                {isAr ? 'قيام الليل' : 'Qiyam'}
              </Text>
              <Pressable onPress={() => showHelp(isAr ? 'قيام الليل' : 'Qiyam al-Layl', HELP_QIYAM[lang] ?? HELP_QIYAM['en'])} hitSlop={8}>
                <MaterialCommunityIcons name="help-circle-outline" size={18} color={C.textMuted} />
              </Pressable>
            </View>
            <View style={[{ flexDirection: isRtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }, !draftShowQiyam && { opacity: 0.38 }]} pointerEvents={draftShowQiyam ? 'auto' : 'none'}>
              <Pressable
                onPress={() => { Haptics.selectionAsync(); setTempTahajjudTime(draftTahajjudTime); setShowTahajjudRoller(true); }}
                style={[styles.timeBtn, { backgroundColor: C.tint + '1A', borderColor: C.tint + '40' }]}
              >
                <Text style={[styles.timeBtnText, { color: C.tint }]}>{draftTahajjudTime}</Text>
              </Pressable>
            </View>
            <Switch
              value={draftShowQiyam}
              onValueChange={v => { Haptics.selectionAsync(); setDraftShowQiyam(v); }}
              trackColor={{ false: C.separator, true: C.tint + '88' }}
              thumbColor={draftShowQiyam ? C.tint : C.textMuted}
            />
          </View>

          {/* ── Eid Prayer row — only visible near Eid ── */}
          {isNearEid && (
            <View style={[styles.compactRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.settingLabel, { color: C.text, fontFamily: isRtl ? 'Amiri_400Regular' : SANS, textAlign: isRtl ? 'right' : 'left', flex: 1 }]}>
                {isAr ? 'صلاة العيد' : 'Eid Prayer'}
              </Text>
              <Pressable
                onPress={() => { Haptics.selectionAsync(); setTempEidPrayerTime(draftEidPrayerTime); setShowEidRoller(true); }}
                style={[styles.timeBtn, { backgroundColor: C.tint + '1A', borderColor: C.tint + '40' }]}
              >
                <Text style={[styles.timeBtnText, { color: C.tint }]}>{draftEidPrayerTime}</Text>
              </Pressable>
            </View>
          )}

        </View>

        {/* Dhuha Time Roller Modal */}
        <Modal visible={showDhuhaRoller} transparent animationType="slide">
          <View style={styles.rollerOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowDhuhaRoller(false)} />
            <View style={[styles.rollerSheet, { backgroundColor: C.backgroundCard }]}>
              <Text style={[styles.rollerTitle, { color: C.text, fontFamily: isRtl ? 'Amiri_700Bold' : SANS_MD }]}>
                {isAr ? 'حدد وقت الضحى' : 'Set Dhuha Time'}
              </Text>
              <TimeRoller value={tempDhuhaTime} onChange={setTempDhuhaTime} tintColor={C.tint} textColor={C.text} bgColor={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'} />
              <Text style={[styles.rollerHint, { color: C.textMuted }]}>
                {isAr ? 'يُصلَّى الضحى بعد ارتفاع الشمس وقبل الظهر' : 'Prayed after sunrise and before Dhuhr'}
              </Text>
              <Pressable onPress={() => { setDraftDhuhaTime(tempDhuhaTime); setShowDhuhaRoller(false); }} style={[styles.rollerDone, { backgroundColor: C.tint }]}>
                <Text style={[styles.rollerDoneText, { color: C.tintText }]}>{(tr as any).btn_done ?? 'Done'}</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* Tahajjud Time Roller Modal */}
        <Modal visible={showTahajjudRoller} transparent animationType="slide">
          <View style={styles.rollerOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowTahajjudRoller(false)} />
            <View style={[styles.rollerSheet, { backgroundColor: C.backgroundCard }]}>
              <Text style={[styles.rollerTitle, { color: C.text, fontFamily: isRtl ? 'Amiri_700Bold' : SANS_MD }]}>
                {isAr ? 'حدد وقت قيام الليل' : 'Set Qiyam Time'}
              </Text>
              <TimeRoller value={tempTahajjudTime} onChange={setTempTahajjudTime} tintColor={C.tint} textColor={C.text} bgColor={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'} />
              <Text style={[styles.rollerHint, { color: C.textMuted }]}>
                {isAr ? 'الثلث الأخير من الليل: من نحو ٢ – ٤ صباحاً' : 'Last third of night: approx 2–4 AM'}
              </Text>
              <Pressable onPress={() => { setDraftTahajjudTime(tempTahajjudTime); setShowTahajjudRoller(false); }} style={[styles.rollerDone, { backgroundColor: C.tint }]}>
                <Text style={[styles.rollerDoneText, { color: C.tintText }]}>{(tr as any).btn_done ?? 'Done'}</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* Eid Prayer Time Roller Modal */}
        <Modal visible={showEidRoller} transparent animationType="slide">
          <View style={styles.rollerOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowEidRoller(false)} />
            <View style={[styles.rollerSheet, { backgroundColor: C.backgroundCard }]}>
              <Text style={[styles.rollerTitle, { color: C.text, fontFamily: isRtl ? 'Amiri_700Bold' : SANS_MD }]}>
                {isAr ? 'حدد وقت صلاة العيد' : 'Set Eid Prayer Time'}
              </Text>
              <TimeRoller value={tempEidPrayerTime} onChange={setTempEidPrayerTime} tintColor={C.tint} textColor={C.text} bgColor={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'} />
              <Text style={[styles.rollerHint, { color: C.textMuted }]}>
                {isAr ? 'أدخل الوقت الرسمي لصلاة العيد في مدينتك' : 'Enter the official Eid prayer time for your city or mosque'}
              </Text>
              <Pressable onPress={() => { setDraftEidPrayerTime(tempEidPrayerTime); setShowEidRoller(false); }} style={[styles.rollerDone, { backgroundColor: C.tint }]}>
                <Text style={[styles.rollerDoneText, { color: C.tintText }]}>{(tr as any).btn_done ?? 'Done'}</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* First Adhan Picker Modal */}
        <Modal visible={showFirstAdhanPicker} transparent animationType="fade">
          <Pressable style={styles.dropdownOverlay} onPress={() => setShowFirstAdhanPicker(false)}>
            <View style={[styles.dropdownSheet, { backgroundColor: C.backgroundCard, borderColor: C.separator }]}>
              <Text style={[styles.dropdownTitle, { color: C.text, fontFamily: isRtl ? 'Amiri_700Bold' : SANS }]}>
                {isAr ? 'الأذان الأول — التنبيه المبكر' : 'Early Adhan Reminder'}
              </Text>
              {([0, 5, 10, 15, 20, 25, 30] as const).map((mins, idx, arr) => {
                const isSelected = draftFirstAdhanOffset === mins;
                const isLast = idx === arr.length - 1;
                return (
                  <Pressable
                    key={mins}
                    onPress={() => { Haptics.selectionAsync(); setDraftFirstAdhanOffset(mins); setShowFirstAdhanPicker(false); }}
                    style={[
                      styles.dropdownOption,
                      {
                        borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
                        borderBottomColor: C.separator,
                        backgroundColor: isSelected ? C.tint + '14' : 'transparent',
                        flexDirection: isRtl ? 'row-reverse' : 'row',
                      },
                    ]}
                  >
                    <Text style={[styles.dropdownOptionText, { color: isSelected ? C.tint : C.text, fontWeight: isSelected ? '700' : '500', fontFamily: isRtl ? 'Amiri_400Regular' : SANS }]}>
                      {mins === 0
                        ? (isAr ? 'إيقاف' : 'Off')
                        : isAr ? `${mins} ${mins === 5 ? 'دقائق' : 'دقيقة'}` : `${mins} min`}
                    </Text>
                    {isSelected && <Ionicons name="checkmark" size={16} color={C.tint} />}
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Modal>

        {/* Iqama offset picker */}
        <Modal visible={showIqamaPicker !== null} transparent animationType="fade">
          <Pressable style={styles.dropdownOverlay} onPress={() => setShowIqamaPicker(null)}>
            <View style={[styles.dropdownSheet, { backgroundColor: C.backgroundCard, borderColor: C.separator }]}>
              <Text style={[styles.dropdownTitle, { color: C.text, fontFamily: isRtl ? 'Amiri_700Bold' : SANS }]}>
                {tr.iqamaSettings}
              </Text>
              {([5, 10, 15, 20, 25] as const).map((mins, idx, arr) => {
                const isSelected = (draftIqamaOffsets[showIqamaPicker ?? ''] ?? 10) === mins;
                const isLast = idx === arr.length - 1;
                return (
                  <Pressable
                    key={mins}
                    onPress={() => {
                      Haptics.selectionAsync();
                      if (showIqamaPicker) {
                        setDraftIqamaOffsets(prev => ({ ...prev, [showIqamaPicker]: mins }));
                      }
                      setShowIqamaPicker(null);
                    }}
                    style={[
                      styles.dropdownOption,
                      {
                        borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
                        borderBottomColor: C.separator,
                        backgroundColor: isSelected ? C.tint + '14' : 'transparent',
                        flexDirection: isRtl ? 'row-reverse' : 'row',
                      },
                    ]}
                  >
                    <Text style={[styles.dropdownOptionText, { color: isSelected ? C.tint : C.text, fontWeight: isSelected ? '700' : '500', fontFamily: isRtl ? 'Amiri_400Regular' : SANS }]}>
                      {isAr ? `${mins} دقيقة` : `${mins} min`}
                    </Text>
                    {isSelected && <Ionicons name="checkmark" size={16} color={C.tint} />}
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Modal>

        {/* Thikr Reminders */}
        <View style={{ flexDirection: isRtl ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 6, marginLeft: isRtl ? 0 : 4, marginRight: isRtl ? 4 : 0 }}>
          <Text style={[styles.sectionTitle, { color: C.tint, fontFamily: isRtl ? 'Amiri_700Bold' : SANS, textAlign: isRtl ? 'right' : 'left', marginTop: 0, marginBottom: 0 }]}>
            {tr.thikr_reminders_section}
          </Text>
        </View>
        <View style={[styles.card, { backgroundColor: C.backgroundCard, borderColor: C.separator }]}>
          <View style={[styles.settingRow, { borderBottomWidth: 0, flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            <View style={{ flexDirection: isRtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <Ionicons name="heart-outline" size={18} color={C.tint} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: isRtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.settingLabel, { color: C.text, fontFamily: isRtl ? 'Amiri_400Regular' : SANS, textAlign: isRtl ? 'right' : 'left' }]}>
                    {tr.thikr_reminders_label}
                  </Text>
                  <Pressable onPress={() => { Haptics.selectionAsync(); Alert.alert(tr.thikr_reminders_help_title, tr.thikr_reminders_help_body); }} hitSlop={8}>
                    <Ionicons name="help-circle-outline" size={18} color={C.textMuted} />
                  </Pressable>
                </View>
                <Text style={{ fontSize: 11, color: C.textMuted, fontFamily: SANS, textAlign: isRtl ? 'right' : 'left', marginTop: 2 }}>
                  {tr.thikr_reminders_subtitle}
                </Text>
              </View>
            </View>
            <Switch
              value={thikrRemindersEnabled}
              onValueChange={handleThikrToggle}
              trackColor={{ false: C.backgroundSecond, true: C.tint + '80' }}
              thumbColor={thikrRemindersEnabled ? C.tint : C.textMuted}
            />
          </View>
          {thikrToast && (
            <View style={{ paddingHorizontal: 14, paddingBottom: 10 }}>
              <Text style={{ fontSize: 11, color: C.tint, fontFamily: SANS, textAlign: isRtl ? 'right' : 'left' }}>
                {tr.thikr_reminders_activated}
              </Text>
            </View>
          )}
        </View>

        {/* Adhan Voice */}
        <View style={{ flexDirection: isRtl ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 6, marginLeft: isRtl ? 0 : 4, marginRight: isRtl ? 4 : 0 }}>
          <Text style={[styles.sectionTitle, { color: C.tint, fontFamily: isRtl ? 'Amiri_700Bold' : SANS, textAlign: isRtl ? 'right' : 'left', marginTop: 0, marginBottom: 0 }]}>
            {isAr ? 'صوت الأذان' : 'Adhan Voice'}
          </Text>
        </View>
        <View style={[styles.card, { backgroundColor: C.backgroundCard, borderColor: C.separator }]}>
          <View style={[styles.settingRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.settingLabel, { color: C.text, fontFamily: isRtl ? 'Amiri_400Regular' : SANS, textAlign: isRtl ? 'right' : 'left' }]}>
              {isAr ? 'صوت الأذان' : 'Adhan Voice'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {/* Dropdown */}
              <Pressable
                onPress={() => { Haptics.selectionAsync(); setShowAdhanModal(true); }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: C.separator, backgroundColor: C.backgroundSecond }}
              >
                <Text style={{ fontSize: 12, color: C.text, fontFamily: SANS_MD }}>
                  {isAr
                    ? (ADHAN_OPTIONS.find(o => o.key === draftAdhan)?.labelAr ?? 'مكة')
                    : (ADHAN_OPTIONS.find(o => o.key === draftAdhan)?.label ?? 'Makkah')}
                </Text>
                <Ionicons name="chevron-down" size={12} color={C.textSecond} />
              </Pressable>
              {/* Full preview */}
              <Pressable
                onPress={async () => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  if (previewing === 'adhan-full') {
                    await stopAthan();
                    if (isMountedRef.current) setPreviewing(null);
                  } else {
                    await stopAthan();
                    if (isMountedRef.current) setPreviewing('adhan-full');
                    playAthan('full', () => { if (isMountedRef.current) setPreviewing(null); }, draftAdhan);
                  }
                }}
                style={[styles.subChip, {
                  backgroundColor: previewing === 'adhan-full' ? C.tint + '20' : 'transparent',
                  borderColor: previewing === 'adhan-full' ? C.tint : C.separator,
                }]}
              >
                <Ionicons name={previewing === 'adhan-full' ? 'stop-circle-outline' : 'play-circle-outline'} size={12} color={previewing === 'adhan-full' ? C.tint : C.textSecond} />
                <Text style={{ fontSize: 11, fontWeight: '600', color: previewing === 'adhan-full' ? C.tint : C.textSecond }}>
                  {isAr ? 'كامل' : 'Full'}
                </Text>
              </Pressable>
              {/* Abbrev preview */}
              <Pressable
                onPress={async () => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  if (previewing === 'adhan-abbrev') {
                    await stopAthan();
                    if (isMountedRef.current) setPreviewing(null);
                  } else {
                    await stopAthan();
                    if (isMountedRef.current) setPreviewing('adhan-abbrev');
                    playAthan('abbreviated', () => { if (isMountedRef.current) setPreviewing(null); }, draftAdhan);
                  }
                }}
                style={[styles.subChip, {
                  backgroundColor: previewing === 'adhan-abbrev' ? C.tint + '20' : 'transparent',
                  borderColor: previewing === 'adhan-abbrev' ? C.tint : C.separator,
                }]}
              >
                <Ionicons name={previewing === 'adhan-abbrev' ? 'stop-circle-outline' : 'play-circle-outline'} size={12} color={previewing === 'adhan-abbrev' ? C.tint : C.textSecond} />
                <Text style={{ fontSize: 11, fontWeight: '600', color: previewing === 'adhan-abbrev' ? C.tint : C.textSecond }}>
                  {isAr ? 'مختصر' : 'Abbrev'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Notifications */}
        <View style={{ flexDirection: isRtl ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 6, marginLeft: isRtl ? 0 : 4, marginRight: isRtl ? 4 : 0 }}>
          <Text style={[styles.sectionTitle, { color: C.tint, fontFamily: isRtl ? 'Amiri_700Bold' : SANS, textAlign: isRtl ? 'right' : 'left', marginTop: 0, marginBottom: 0 }]}>
            {isAr ? 'الإشعارات' : 'Notifications'}
          </Text>
        </View>
        <View style={[styles.card, { backgroundColor: C.backgroundCard, borderColor: C.separator }]}>
          {NOTIF_PRAYERS.map((prayer, idx) => {
            const cfg: PrayerNotifConfig = draftNotifications[prayer.key] ?? EMPTY_CFG;
            const hasBanner = cfg.banner;
            const hasAthan = cfg.athan !== 'none';
            const isLast = idx === NOTIF_PRAYERS.length - 1;
            const isDisabled =
              (prayer.key === 'dhuha' && !draftShowDhuha) ||
              (prayer.key === 'qiyam' && !draftShowQiyam);

            return (
              <View
                key={prayer.key}
                style={[
                  styles.notifItem,
                  { borderBottomColor: C.separator, borderBottomWidth: isLast && !hasAthan ? 0 : 1 },
                  isDisabled && { opacity: 0.38 },
                ]}
                pointerEvents={isDisabled ? 'none' : 'auto'}
              >
                {/* Main row: prayer name + Banner toggle + Athan toggle */}
                <View style={[styles.notifRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                  <Text style={[
                    styles.notifLabel,
                    { color: C.text, fontFamily: isRtl ? 'Amiri_400Regular' : SANS, textAlign: isRtl ? 'right' : 'left' }
                  ]}>
                    {isAr ? prayer.ar : prayer.en}
                  </Text>
                  <View style={styles.notifChips}>

                    {/* Banner toggle — ring bell */}
                    <Pressable
                      onPress={() => setPrayerBanner(prayer.key, !hasBanner)}
                      style={[styles.iconChip, {
                        backgroundColor: hasBanner ? C.tint : C.backgroundSecond,
                        borderColor: hasBanner ? C.tint : C.separator,
                      }]}
                    >
                      <Ionicons
                        name={hasBanner ? 'notifications' : 'notifications-outline'}
                        size={16}
                        color={hasBanner ? C.tintText : C.textSecond}
                      />
                    </Pressable>

                    {/* Athan toggle — speaker */}
                    <Pressable
                      onPress={() => setPrayerAthan(prayer.key, hasAthan ? 'none' : 'full')}
                      style={[styles.iconChip, {
                        backgroundColor: hasAthan ? C.tint : C.backgroundSecond,
                        borderColor: hasAthan ? C.tint : C.separator,
                      }]}
                    >
                      <Ionicons
                        name={hasAthan ? 'volume-high' : 'volume-mute'}
                        size={16}
                        color={hasAthan ? C.tintText : C.textSecond}
                      />
                    </Pressable>

                    {/* Per-prayer adhan voice dropdown — always visible */}
                    <Pressable
                      onPress={() => { Haptics.selectionAsync(); setActivePrayerAdhanKey(prayer.key); }}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 5, borderRadius: 7, borderWidth: 1, borderColor: draftPrayerAdhan[prayer.key] ? C.tint : C.separator, backgroundColor: draftPrayerAdhan[prayer.key] ? C.tint + '15' : C.backgroundSecond }}
                    >
                      <Text style={{ fontSize: 11, fontFamily: 'Amiri_400Regular', color: draftPrayerAdhan[prayer.key] ? C.tint : C.textSecond }}>
                        {draftPrayerAdhan[prayer.key]
                          ? (ADHAN_OPTIONS.find(o => o.key === draftPrayerAdhan[prayer.key])?.labelAr ?? '—')
                          : '—'}
                      </Text>
                      <Ionicons name="chevron-down" size={10} color={draftPrayerAdhan[prayer.key] ? C.tint : C.textSecond} />
                    </Pressable>

                  </View>
                </View>

                {/* Sub-row: Full / Abbreviated + Preview — only when athan active */}
                {hasAthan && (
                  <View style={[styles.notifSubRow, {
                    borderTopColor: C.separator,
                    borderBottomColor: C.separator,
                    borderBottomWidth: isLast ? 0 : 0,
                    flexDirection: isRtl ? 'row-reverse' : 'row'
                  }]}>
                    <Pressable
                      onPress={() => setPrayerAthan(prayer.key, 'full')}
                      style={[styles.subChip, {
                        backgroundColor: cfg.athan === 'full' ? C.tint + '20' : 'transparent',
                        borderColor: cfg.athan === 'full' ? C.tint : C.separator,
                      }]}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '600', color: cfg.athan === 'full' ? C.tint : C.textSecond }}>
                        {isAr ? 'كامل' : 'Full'}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setPrayerAthan(prayer.key, 'abbreviated')}
                      style={[styles.subChip, {
                        backgroundColor: cfg.athan === 'abbreviated' ? C.tint + '20' : 'transparent',
                        borderColor: cfg.athan === 'abbreviated' ? C.tint : C.separator,
                      }]}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '600', color: cfg.athan === 'abbreviated' ? C.tint : C.textSecond }}>
                        {isAr ? 'مختصر' : 'Abbr.'}
                      </Text>
                    </Pressable>
                    <View style={{ flex: 1 }} />
                    <Pressable
                      onPress={() => handlePreview(prayer.key)}
                      style={[styles.previewBtn, { borderColor: C.separator }]}
                    >
                      <Ionicons
                        name={previewing === prayer.key ? 'stop-circle-outline' : 'play-circle-outline'}
                        size={14}
                        color={previewing === prayer.key ? C.tint : C.textSecond}
                      />
                      <Text style={{ fontSize: 11, color: previewing === prayer.key ? C.tint : C.textSecond, fontWeight: '500' }}>
                        {isAr ? 'معاينة' : 'Preview'}
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Dua */}
        <Text style={[styles.aboutText, { color: C.textMuted, fontFamily: 'Amiri_400Regular', marginTop: 20, textAlign: 'center' }]}>
          {tr.dua}
        </Text>

        {/* ─── About nav row ─── */}
        <Pressable
          onPress={() => router.push('/about')}
          style={[styles.aboutRow, { borderTopColor: C.separator, flexDirection: isRtl ? 'row-reverse' : 'row' }]}
        >
          <View style={{ flexDirection: isRtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            <MaterialCommunityIcons name="information-outline" size={20} color={C.tint} />
            <Text style={{ color: C.text, fontSize: 15, fontFamily: SANS }}>{tr.about_label}</Text>
          </View>
          <MaterialCommunityIcons name={isRtl ? 'chevron-left' : 'chevron-right'} size={20} color={C.textMuted} />
        </Pressable>

      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerWrap: { gap: 4, paddingBottom: 4 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerActions: { flexDirection: 'row', gap: 8 },
  pageTitle: { fontSize: 15, fontWeight: '700', textAlign: 'center', marginTop: 2, marginBottom: 0 },
  cancelBtn: { paddingVertical: 6, paddingHorizontal: 4 },
  cancelBtnText: { fontSize: 13, fontWeight: '400' },
  saveBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16 },
  saveBtnText: { fontSize: 13, fontWeight: '600' },
  fontPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignItems: 'center' },
  fontPillLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.2 },
  sectionTitle: {
    fontSize: 11, fontWeight: '700', letterSpacing: 0.6,
    textTransform: 'uppercase', marginTop: 18, marginBottom: 6,
  },
  card: {
    borderRadius: 14, borderWidth: 1, overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 11, flexWrap: 'wrap', gap: 8,
  },
  settingLabel: { fontSize: 13, fontWeight: '500', flexShrink: 1 },
  rightSide: { flexShrink: 0 },
  fontPreviewRow: {
    paddingHorizontal: 16, paddingVertical: 12,
    alignItems: 'center', gap: 6,
  },
  fontPreviewLabel: { fontSize: 12, opacity: 0.6 },
  fontPreviewArabic: { textAlign: 'center', lineHeight: 28 },
  fontSliderWrap: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  fontSliderA: { lineHeight: 22 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1,
  },
  methodRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    gap: 12,
  },
  recommendedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  modalContainer: {
    flex: 1, marginTop: Platform.OS === 'ios' ? 40 : 0,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 15, fontWeight: '700' },
  explain: { fontSize: 11, lineHeight: 17, paddingHorizontal: 16, paddingBottom: 12 },
  aboutText: { fontSize: 16, textAlign: 'center', width: '100%' },
  autoOffsetBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 10, borderWidth: 1,
  },
  autoOffsetText: { fontSize: 13, fontWeight: '600' },
  stepperRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap',
  },
  stepperLabel: { fontSize: 12, fontWeight: '500' },
  stepperControls: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, borderWidth: 1, overflow: 'hidden',
  },
  stepperBtn: {
    width: 32, height: 32, alignItems: 'center', justifyContent: 'center',
  },
  stepperValue: {
    minWidth: 34, textAlign: 'center', fontSize: 14, fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  totalBadge: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
  },
  totalBadgeText: { fontSize: 13, fontWeight: '700' },
  notifItem: {
    paddingHorizontal: 16, paddingVertical: 10,
  },
  notifRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8,
  },
  notifLabel: { fontSize: 13, fontWeight: '500', flex: 1 },
  notifChips: { flexDirection: 'row', gap: 6, flexShrink: 0 },
  iconChip: {
    width: 34, height: 34, borderRadius: 10, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  notifSubRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 8, borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
  },
  subChip: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1,
  },
  previewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1,
  },
  // ── Help modal ──────────────────────────────────────────────────
  helpBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20,
  },
  helpCard: {
    width: '100%', borderRadius: 18, borderWidth: 1, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 20, elevation: 12,
  },
  helpBar: { height: 4 },
  helpText: { fontSize: 14, lineHeight: 22, padding: 20, paddingBottom: 12 },
  helpDismiss: {
    margin: 16, marginTop: 4, paddingVertical: 10,
    borderRadius: 12, alignItems: 'center',
  },
  helpDismissText: { fontSize: 14, fontWeight: '700' },
  compactRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 9, gap: 8,
  },
  accessTile: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 7, paddingVertical: 5,
    borderRadius: 10, borderWidth: 1,
    width: '47%',
  },
  accessThemeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  accessSwatch: {
    width: 20, height: 20, borderRadius: 5,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  accessThemeLabel: { fontSize: 11, marginBottom: 0 },
  accessThemeDesc: { fontSize: 11, lineHeight: 15 },
  timeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 10, borderWidth: 1,
  },
  timeBtnText: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  dropdownBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 11, paddingVertical: 6,
    borderRadius: 10, borderWidth: 1,
  },
  dropdownBtnText: { fontSize: 13, fontWeight: '600' },
  dropdownOverlay: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 28,
  },
  dropdownSheet: {
    width: '100%', borderRadius: 16, borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25, shadowRadius: 16, elevation: 10,
  },
  dropdownTitle: {
    fontSize: 13, fontWeight: '700', textAlign: 'center',
    paddingVertical: 12, paddingHorizontal: 16,
    letterSpacing: 0.3,
  },
  dropdownOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 13,
  },
  dropdownOptionText: { fontSize: 14, flex: 1 },
  rollerOverlay: {
    flex: 1, justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  rollerSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 20, paddingHorizontal: 24, paddingBottom: 40,
    gap: 18,
  },
  rollerTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  rollerHint: { fontSize: 12, textAlign: 'center', opacity: 0.7 },
  rollerDone: {
    borderRadius: 16, paddingVertical: 14,
    alignItems: 'center',
  },
  rollerDoneText: { fontSize: 16, fontWeight: '700' },
  aboutRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth, marginTop: 8,
  },
});
