import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform, Modal,
} from 'react-native';
import { SERIF_EN } from '@/constants/typography';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import Colors from '@/constants/colors';
import type { AccessibilityTheme } from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import type { PrayerNotifConfig } from '@/contexts/AppContext';
import TimeRoller from '@/components/TimeRoller';
import { t, LANG_META, isRtlLang, detectSecondLang } from '@/constants/i18n';
import type { CalcMethod, AsrMethod } from '@/lib/prayer-times';
import { ALL_CALC_METHODS, getMethodForCountry } from '@/lib/method-by-country';

import { playAthan, stopAthan } from '@/lib/audio';
import ThemeToggle from '@/components/ThemeToggle';
import LangToggle from '@/components/LangToggle';
import type { SecondLang } from '@/contexts/AppContext';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const {
    isDark, lang, secondLang, resolvedSecondLang, calcMethod, asrMethod, maghribBase, countryCode,
    maghribAdjustment, hijriAdjustment, accessibilityTheme,
    firstAdhanOffset, prayerNotifications, colors,
    dhuhaTime, tahajjudTime,
    updateSettings,
  } = useApp();
  const C = colors;
  const tr = t(lang);
  const isAr = lang === 'ar';
  const isRtl = isRtlLang(lang);

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

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
  const [draftFirstAdhanOffset, setDraftFirstAdhanOffset] = useState<0 | 10 | 20 | 30>(firstAdhanOffset ?? 0);
  const [draftDhuhaTime, setDraftDhuhaTime] = useState(dhuhaTime ?? '07:30');
  const [draftTahajjudTime, setDraftTahajjudTime] = useState(tahajjudTime ?? '03:00');
  const [showDhuhaRoller, setShowDhuhaRoller] = useState(false);
  const [showTahajjudRoller, setShowTahajjudRoller] = useState(false);
  const [showMethodModal, setShowMethodModal] = useState(false);
  const [showLangModal, setShowLangModal] = useState(false);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [helpContent, setHelpContent] = useState<string | null>(null);

  // ── Help texts (all 15 languages) ───────────────────────────────
  type HelpKey = 'language' | 'fontSize' | 'accessibility' | 'hijri' | 'calcMethod' | 'asrMethod' | 'maghrib' | 'firstAdhan' | 'notifications';
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
    },
  };

  const getHelp = (key: HelpKey): string => {
    const langHelp = HELP[lang] ?? HELP.en;
    return langHelp[key] ?? HELP.en[key];
  };

  const showHelp = (key: HelpKey) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setHelpContent(getHelp(key));
  };

  const HelpBtn = ({ helpKey }: { helpKey: HelpKey }) => (
    <Pressable
      onPress={() => showHelp(helpKey)}
      hitSlop={12}
      style={({ pressed }) => ({
        width: 18, height: 18, borderRadius: 9,
        borderWidth: 1.5, borderColor: C.tint,
        alignItems: 'center', justifyContent: 'center',
        opacity: pressed ? 0.4 : 1,
      })}
    >
      <Text style={{ fontSize: 10, fontWeight: '800', color: C.tint, lineHeight: 13 }}>?</Text>
    </Pressable>
  );

  const recommendedMethod = getMethodForCountry(countryCode);

  const handlePreview = async (key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (previewing === key) {
      await stopAthan();
      setPreviewing(null);
    } else {
      if (previewing) await stopAthan();
      setPreviewing(key);
      const athanType = (draftNotifications[key]?.athan === 'abbreviated') ? 'abbreviated' : 'full';
      playAthan(athanType, () => setPreviewing(null));
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
    normNotif(draftNotifications) !== normNotif(prayerNotifications ?? {});

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
      dhuhaTime: draftDhuhaTime,
      tahajjudTime: draftTahajjudTime,
    });
    router.back();
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

  const requestNotifPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'web') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
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
  };


  const Row = ({
    label, right, noBorder, helpKey,
  }: { label: string; right: React.ReactNode; noBorder?: boolean; helpKey?: HelpKey }) => (
    <View style={[
      styles.settingRow,
      { borderBottomColor: C.separator, borderBottomWidth: noBorder ? 0 : 1, flexDirection: isRtl ? 'row-reverse' : 'row' }
    ]}>
      <Text style={[styles.settingLabel, { color: C.text, fontFamily: isRtl ? 'Amiri_400Regular' : SERIF_EN, textAlign: isRtl ? 'right' : 'left', flexShrink: 1 }]}>
        {label}
      </Text>
      <View style={[styles.rightSide, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
        {right}
        {helpKey && <HelpBtn helpKey={helpKey} />}
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

      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 4, paddingHorizontal: 16, flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
        <Pressable
          onPress={() => { Haptics.selectionAsync(); router.back(); }}
          style={({ pressed }) => [styles.closeBtn, { backgroundColor: C.surface, opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="close" size={20} color={C.textSecond} />
        </Pressable>
        <Text style={[styles.title, { color: C.text, fontFamily: isRtl ? 'Amiri_700Bold' : SERIF_EN }]}>
          {tr.settings}
        </Text>
        <View style={styles.headerActions}>
          <LangToggle />
          <ThemeToggle />
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
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomInset + 40 }}
        showsVerticalScrollIndicator={false}
      >

        {/* Language */}
        <View style={{ flexDirection: isRtl ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 6, marginLeft: isRtl ? 0 : 4, marginRight: isRtl ? 4 : 0 }}>
          <Text style={[styles.sectionTitle, { color: C.tint, fontFamily: isRtl ? 'Amiri_700Bold' : SERIF_EN, textAlign: isRtl ? 'right' : 'left', marginTop: 0, marginBottom: 0 }]}>
            {tr.language}
          </Text>
          <HelpBtn helpKey="language" />
        </View>
        <View style={[styles.card, { backgroundColor: C.backgroundCard, borderColor: C.separator }]}>
          <Pressable
            onPress={() => setShowLangModal(true)}
            style={({ pressed }) => [
              styles.settingRow,
              { borderBottomColor: C.separator, borderBottomWidth: 0, flexDirection: isRtl ? 'row-reverse' : 'row', opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: C.text, fontFamily: isRtl ? 'Amiri_400Regular' : SERIF_EN, textAlign: isRtl ? 'right' : 'left' }]}>
                {isAr ? 'العربية' : tr.arabic} ↔ {draftSecondLang === 'auto'
                  ? `${tr.auto} · ${LANG_META[resolvedSecondLang].native}`
                  : LANG_META[draftSecondLang].native}
              </Text>
            </View>
            <Ionicons name={isRtl ? 'chevron-back' : 'chevron-forward'} size={18} color={C.textMuted} />
          </Pressable>
        </View>

        {/* Language picker modal */}
        <Modal
          visible={showLangModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowLangModal(false)}
        >
          <View style={{ flex: 1, backgroundColor: C.background }}>
            <View style={[styles.modalHeader, { borderBottomColor: C.separator, flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.modalTitle, { color: C.text, fontFamily: isRtl ? 'Amiri_700Bold' : SERIF_EN }]}>
                {tr.language}
              </Text>
              <Pressable
                onPress={() => setShowLangModal(false)}
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
              >
                <Ionicons name="close" size={24} color={C.textMuted} />
              </Pressable>
            </View>
            <ScrollView>
              {/* Auto option */}
              {[{ value: 'auto' as SecondLang, native: tr.auto, label: `${LANG_META[resolvedSecondLang].native} (${tr.auto.toLowerCase()})` },
                ...(['en','fr','es','ru','zh','tr','ur','id','bn','fa','ms','pt','sw','ha'] as const).map(l => ({
                  value: l as SecondLang,
                  native: LANG_META[l].native,
                  label: LANG_META[l].label,
                }))
              ].map((item, idx, arr) => {
                const isLast = idx === arr.length - 1;
                const isSelected = draftSecondLang === item.value;
                return (
                  <Pressable
                    key={item.value}
                    onPress={() => { Haptics.selectionAsync(); setDraftSecondLang(item.value); setShowLangModal(false); }}
                    style={({ pressed }) => [
                      styles.settingRow,
                      { borderBottomColor: C.separator, borderBottomWidth: isLast ? 0 : 1, flexDirection: isRtl ? 'row-reverse' : 'row', paddingHorizontal: 20, opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={{ fontSize: 16, color: C.text, fontWeight: '500', textAlign: isRtl ? 'right' : 'left' }}>
                        {item.native}
                      </Text>
                      <Text style={{ fontSize: 13, color: C.textSecond, textAlign: isRtl ? 'right' : 'left' }}>
                        {item.label}
                      </Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark" size={20} color={C.tint} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Modal>

        {/* Accessibility */}
        <View style={{ flexDirection: isRtl ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 6, marginLeft: isRtl ? 0 : 4, marginRight: isRtl ? 4 : 0 }}>
          <Text style={[styles.sectionTitle, { color: C.tint, fontFamily: isRtl ? 'Amiri_700Bold' : SERIF_EN, textAlign: isRtl ? 'right' : 'left', marginTop: 0, marginBottom: 0 }]}>
            {isAr ? 'إمكانية الوصول' : 'Accessibility'}
          </Text>
          <HelpBtn helpKey="accessibility" />
        </View>
        <View style={[styles.card, { backgroundColor: C.backgroundCard, borderColor: C.separator }]}>
          <Text style={[styles.explain, { color: C.textMuted, paddingTop: 12, fontFamily: isRtl ? 'Amiri_400Regular' : SERIF_EN, textAlign: isRtl ? 'right' : 'left' }]}>
            {isAr
              ? 'اختر نظام ألوان مناسب لاحتياجاتك البصرية'
              : 'Choose a colour theme suited to your visual needs'}
          </Text>
          {([
            {
              key: 'default' as AccessibilityTheme,
              label: isAr ? 'الافتراضي' : 'Default',
              desc: isAr ? 'النظام الأخضر القياسي' : 'Classic green, crisp and familiar',
              swatchLight: '#1a7a4a', swatchDark: '#34C759',
            },
            {
              key: 'high-contrast' as AccessibilityTheme,
              label: isAr ? 'تباين عالٍ' : 'High Contrast',
              desc: isAr ? 'أسود وأبيض خالص — أقصى وضوح' : 'Pure black & white, maximum clarity',
              swatchLight: '#000000', swatchDark: '#FFFFFF',
            },
            {
              key: 'colorblind' as AccessibilityTheme,
              label: isAr ? 'عمى الألوان' : 'Color Blind',
              desc: isAr ? 'لون أزرق مناسب لعمى الألوان' : 'Blue accent, deuteranopia-friendly',
              swatchLight: '#0055CC', swatchDark: '#409CFF',
            },
            {
              key: 'warm' as AccessibilityTheme,
              label: isAr ? 'دافئ' : 'Warm',
              desc: isAr ? 'درجات العنبر — يُخفف الضوء الأزرق' : 'Amber tones, easy on the eyes',
              swatchLight: '#8C6400', swatchDark: '#E8A000',
            },
            {
              key: 'blossom' as AccessibilityTheme,
              label: isAr ? 'الوردي' : 'Blossom',
              desc: isAr ? 'درجات وردية ناعمة ودافئة' : 'Soft rose tones, warm and inviting',
              swatchLight: '#B83255', swatchDark: '#FF7AA0',
            },
            {
              key: 'ocean' as AccessibilityTheme,
              label: isAr ? 'المحيط' : 'Ocean',
              desc: isAr ? 'أزرق سماوي هادئ وصافٍ' : 'Sky blue, calm and serene',
              swatchLight: '#0B6FAA', swatchDark: '#4FC3F7',
            },
            {
              key: 'violet' as AccessibilityTheme,
              label: isAr ? 'البنفسجي' : 'Violet',
              desc: isAr ? 'لافندر حالم وناعم' : 'Lavender tones, gentle and dreamy',
              swatchLight: '#6B3FA0', swatchDark: '#C084FC',
            },
          ] as const).map((theme, idx, arr) => {
            const isSelected = draftAccessibilityTheme === theme.key;
            const isLast = idx === arr.length - 1;
            const swatch = isDark ? theme.swatchDark : theme.swatchLight;
            const swatchCheckmark = ((): string => {
              const hex = swatch.replace('#', '');
              const r = parseInt(hex.slice(0, 2), 16) / 255;
              const g = parseInt(hex.slice(2, 4), 16) / 255;
              const b = parseInt(hex.slice(4, 6), 16) / 255;
              const linearize = (c: number) => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
              const L = 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
              return L > 0.35 ? '#000000' : '#FFFFFF';
            })();
            return (
              <Pressable
                key={theme.key}
                onPress={() => { Haptics.selectionAsync(); setDraftAccessibilityTheme(theme.key); }}
                style={[
                  styles.accessThemeRow,
                  {
                    borderBottomColor: C.separator,
                    borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
                    backgroundColor: isSelected ? C.tint + '12' : 'transparent',
                    flexDirection: isRtl ? 'row-reverse' : 'row',
                  },
                ]}
              >
                {/* Colour swatch */}
                <View style={[styles.accessSwatch, { backgroundColor: swatch }]}>
                  {isSelected && <Ionicons name="checkmark" size={14} color={swatchCheckmark} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[
                    styles.accessThemeLabel,
                    { color: isSelected ? C.tint : C.text, fontWeight: isSelected ? '700' : '500', fontFamily: isRtl ? 'Amiri_400Regular' : SERIF_EN, textAlign: isRtl ? 'right' : 'left' }
                  ]}>
                    {theme.label}
                  </Text>
                  <Text style={[
                    styles.accessThemeDesc,
                    { color: C.textMuted, fontFamily: isRtl ? 'Amiri_400Regular' : SERIF_EN, textAlign: isRtl ? 'right' : 'left' }
                  ]}>
                    {theme.desc}
                  </Text>
                </View>
                {isSelected && <Ionicons name="checkmark-circle" size={20} color={C.tint} />}
              </Pressable>
            );
          })}
        </View>

        {/* Hijri date adjustment */}
        <View style={{ flexDirection: isRtl ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 6, marginLeft: isRtl ? 0 : 4, marginRight: isRtl ? 4 : 0 }}>
          <Text style={[styles.sectionTitle, { color: C.tint, fontFamily: isRtl ? 'Amiri_700Bold' : SERIF_EN, textAlign: isRtl ? 'right' : 'left', marginTop: 0, marginBottom: 0 }]}>
            {isAr ? 'التقويم الهجري' : 'Hijri Calendar'}
          </Text>
          <HelpBtn helpKey="hijri" />
        </View>
        <View style={[styles.card, { backgroundColor: C.backgroundCard, borderColor: C.separator }]}>
          <View style={[styles.settingRow, { borderBottomWidth: 0, flexDirection: 'column', alignItems: isRtl ? 'flex-end' : 'flex-start', gap: 8 }]}>
            <Text style={[styles.settingLabel, { color: C.text, fontFamily: isRtl ? 'Amiri_400Regular' : SERIF_EN, textAlign: isRtl ? 'right' : 'left' }]}>
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
              <Text style={[styles.stepperLabel, { color: C.textSecond, fontFamily: isRtl ? 'Amiri_400Regular' : SERIF_EN }]}>
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
          <Text style={[styles.sectionTitle, { color: C.tint, fontFamily: isRtl ? 'Amiri_700Bold' : SERIF_EN, textAlign: isRtl ? 'right' : 'left', marginTop: 0, marginBottom: 0 }]}>
            {isAr ? 'حساب أوقات الصلاة' : 'Prayer Calculation'}
          </Text>
        </View>
        <View style={[styles.card, { backgroundColor: C.backgroundCard, borderColor: C.separator }]}>
          {/* Calculation method — dropdown row */}
          <Pressable
            onPress={() => { Haptics.selectionAsync(); setShowMethodModal(true); }}
            style={[styles.settingRow, { borderBottomColor: C.separator, borderBottomWidth: 1, flexDirection: isRtl ? 'row-reverse' : 'row' }]}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.settingLabel, { color: C.text, fontFamily: isRtl ? 'Amiri_400Regular' : SERIF_EN, textAlign: isRtl ? 'right' : 'left' }]}>
                {tr.calculationMethod}
              </Text>
              <Text style={{ color: C.tint, fontSize: 12, fontFamily: isRtl ? 'Amiri_400Regular' : SERIF_EN, textAlign: isRtl ? 'right' : 'left' }} numberOfLines={1}>
                {tr.methods[draftCalcMethod] ?? draftCalcMethod}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <HelpBtn helpKey="calcMethod" />
              <Ionicons name={isRtl ? 'chevron-back' : 'chevron-forward'} size={18} color={C.textMuted} />
            </View>
          </Pressable>

          {/* Method picker modal */}
          <Modal visible={showMethodModal} animationType="slide" transparent presentationStyle="pageSheet">
            <View style={[styles.modalContainer, { backgroundColor: C.background }]}>
              <View style={[styles.modalHeader, { borderBottomColor: C.separator, flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                <Text style={[styles.modalTitle, { color: C.text, fontFamily: isRtl ? 'Amiri_700Bold' : SERIF_EN }]}>
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
                          fontFamily: isRtl ? 'Amiri_400Regular' : SERIF_EN,
                          textAlign: isRtl ? 'right' : 'left',
                        }}>
                          {label}
                        </Text>
                        {isRecommended && (
                          <View style={[styles.recommendedBadge, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                            <Ionicons name="location-outline" size={11} color={C.tint} />
                            <Text style={{ fontSize: 11, color: C.tint, fontFamily: isRtl ? 'Amiri_400Regular' : SERIF_EN }}>
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

          {/* Asr method */}
          <Row
            label={tr.asrMethod}
            helpKey="asrMethod"
            right={
              <View style={styles.chips}>
                <Chip value={tr.standard} selected={draftAsrMethod === 'standard'} onPress={() => setDraftAsrMethod('standard')} />
                <Chip value={tr.hanafi}   selected={draftAsrMethod === 'hanafi'}   onPress={() => setDraftAsrMethod('hanafi')} />
              </View>
            }
          />

          {/* Maghrib offset — base + stepper */}
          <View style={[styles.settingRow, { borderBottomWidth: 0, flexDirection: 'column', alignItems: isRtl ? 'flex-end' : 'flex-start', gap: 8 }]}>
            <View style={{ flexDirection: isRtl ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <Text style={[styles.settingLabel, { color: C.text, fontFamily: isRtl ? 'Amiri_400Regular' : SERIF_EN, textAlign: isRtl ? 'right' : 'left' }]}>
                {isAr ? 'احتياط المغرب' : 'Maghrib Safety Margin'}
              </Text>
              <HelpBtn helpKey="maghrib" />
            </View>

            {/* Recommended base */}
            <View style={[styles.autoOffsetBadge, { backgroundColor: C.tint + '22', borderColor: C.tint + '55', flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
              <Ionicons name="location-outline" size={13} color={C.tint} />
              <Text style={[styles.autoOffsetText, { color: C.tint }]}>
                {isAr
                  ? `موصى به: ${maghribBase} ${maghribBase === 1 ? 'دقيقة' : 'دقائق'}${countryCode ? ` (${countryCode})` : ''}`
                  : `Recommended: ${maghribBase} min${countryCode ? ` (${countryCode})` : ''}`}
              </Text>
            </View>

            {/* Stepper row */}
            <View style={[styles.stepperRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.stepperLabel, { color: C.textSecond, fontFamily: isRtl ? 'Amiri_400Regular' : SERIF_EN }]}>
                {isAr ? 'تعديل:' : 'Adjustment:'}
              </Text>
              <View style={[styles.stepperControls, { backgroundColor: C.backgroundSecond, borderColor: C.separator }]}>
                <Pressable
                  onPress={() => { Haptics.selectionAsync(); setDraftAdjustment(v => Math.max(v - 1, -maghribBase)); }}
                  style={({ pressed }) => [styles.stepperBtn, { opacity: pressed ? 0.6 : 1 }]}
                >
                  <Ionicons name="remove" size={18} color={C.tint} />
                </Pressable>
                <Text style={[styles.stepperValue, { color: C.text }]}>
                  {draftAdjustment > 0 ? `+${draftAdjustment}` : draftAdjustment}
                </Text>
                <Pressable
                  onPress={() => { Haptics.selectionAsync(); setDraftAdjustment(v => Math.min(v + 1, 30)); }}
                  style={({ pressed }) => [styles.stepperBtn, { opacity: pressed ? 0.6 : 1 }]}
                >
                  <Ionicons name="add" size={18} color={C.tint} />
                </Pressable>
              </View>
              <View style={[styles.totalBadge, { backgroundColor: C.tint }]}>
                <Text style={[styles.totalBadgeText, { color: C.tintText }]}>
                  {isAr
                    ? `= ${maghribBase + draftAdjustment} د`
                    : `= ${maghribBase + draftAdjustment} min`}
                </Text>
              </View>
            </View>

            {draftAdjustment !== 0 && (
              <Pressable onPress={() => { Haptics.selectionAsync(); setDraftAdjustment(0); }}>
                <Text style={{ color: C.tint, fontSize: 12, fontWeight: '600' }}>
                  {isAr ? 'إعادة ضبط' : 'Reset to recommended'}
                </Text>
              </Pressable>
            )}

            <Text style={[styles.explain, { color: C.textMuted, paddingHorizontal: 0, paddingBottom: 0, fontFamily: isRtl ? 'Amiri_400Regular' : SERIF_EN, textAlign: isRtl ? 'right' : 'left' }]}>
              {isAr
                ? 'يُضاف هذا الوقت بعد الغروب الفلكي وفق معايير دار الإفتاء في بلدك'
                : "Minutes added after astronomical sunset per your country's Islamic authority standard"}
            </Text>
          </View>

          {/* First Adhan */}
          <View style={[styles.settingRow, { borderBottomWidth: 0, flexDirection: 'column', alignItems: isRtl ? 'flex-end' : 'flex-start', gap: 8 }]}>
            <View style={{ flexDirection: isRtl ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <Text style={[styles.settingLabel, { color: C.text, fontFamily: isRtl ? 'Amiri_400Regular' : SERIF_EN, textAlign: isRtl ? 'right' : 'left' }]}>
                {tr.firstAdhanSetting}
              </Text>
              <HelpBtn helpKey="firstAdhan" />
            </View>
            <View style={styles.chips}>
              {([0, 10, 20, 30]).map((mins: 0 | 10 | 20 | 30) => (
                <Chip
                  key={mins}
                  value={
                    mins === 0
                      ? (isAr ? 'إيقاف' : 'Off')
                      : isAr
                        ? `${mins} د قبل`
                        : `${mins} min`
                  }
                  selected={draftFirstAdhanOffset === mins}
                  onPress={() => setDraftFirstAdhanOffset(mins)}
                />
              ))}
            </View>
          </View>
        </View>

        {/* Nafl Prayer Timings */}
        <Text style={[styles.sectionTitle, { color: C.tint, fontFamily: isRtl ? 'Amiri_700Bold' : SERIF_EN, textAlign: isRtl ? 'right' : 'left', marginTop: 18 }]}>
          {isAr ? 'صلاة الضحى والتهجد' : 'Dhuha & Tahajjud Times'}
        </Text>
        <View style={[styles.card, { backgroundColor: C.backgroundCard, borderColor: C.separator }]}>
          {/* Dhuha */}
          <View style={[styles.settingRow, { borderBottomWidth: 1, borderBottomColor: C.separator, flexDirection: isRtl ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: C.text, fontFamily: isRtl ? 'Amiri_400Regular' : SERIF_EN, textAlign: isRtl ? 'right' : 'left' }]}>
                {isAr ? 'وقت الضحى' : 'Dhuha Time'}
              </Text>
              <Text style={[styles.explain, { color: C.textMuted, paddingHorizontal: 0, paddingBottom: 0, fontFamily: isRtl ? 'Amiri_400Regular' : SERIF_EN, textAlign: isRtl ? 'right' : 'left', marginTop: 2 }]}>
                {isAr ? 'الضحى بعد الشروق' : 'After sunrise'}
              </Text>
            </View>
            <Pressable
              onPress={() => { Haptics.selectionAsync(); setShowDhuhaRoller(true); }}
              style={[styles.timeBtn, { backgroundColor: C.tint + '1A', borderColor: C.tint + '40' }]}
            >
              <Text style={[styles.timeBtnText, { color: C.tint }]}>{draftDhuhaTime}</Text>
              <Ionicons name="time-outline" size={14} color={C.tint} />
            </Pressable>
          </View>

          {/* Tahajjud */}
          <View style={[styles.settingRow, { borderBottomWidth: 0, flexDirection: isRtl ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: C.text, fontFamily: isRtl ? 'Amiri_400Regular' : SERIF_EN, textAlign: isRtl ? 'right' : 'left' }]}>
                {isAr ? 'وقت التهجد' : 'Tahajjud Time'}
              </Text>
              <Text style={[styles.explain, { color: C.textMuted, paddingHorizontal: 0, paddingBottom: 0, fontFamily: isRtl ? 'Amiri_400Regular' : SERIF_EN, textAlign: isRtl ? 'right' : 'left', marginTop: 2 }]}>
                {isAr ? 'الثلث الأخير من الليل' : 'Last third of night'}
              </Text>
            </View>
            <Pressable
              onPress={() => { Haptics.selectionAsync(); setShowTahajjudRoller(true); }}
              style={[styles.timeBtn, { backgroundColor: C.tint + '1A', borderColor: C.tint + '40' }]}
            >
              <Text style={[styles.timeBtnText, { color: C.tint }]}>{draftTahajjudTime}</Text>
              <Ionicons name="time-outline" size={14} color={C.tint} />
            </Pressable>
          </View>
        </View>

        {/* Dhuha Time Roller Modal */}
        <Modal visible={showDhuhaRoller} transparent animationType="slide">
          <View style={styles.rollerOverlay}>
            <View style={[styles.rollerSheet, { backgroundColor: C.backgroundCard }]}>
              <Text style={[styles.rollerTitle, { color: C.text, fontFamily: isRtl ? 'Amiri_700Bold' : SERIF_EN }]}>
                {isAr ? 'حدد وقت الضحى' : 'Set Dhuha Time'}
              </Text>
              <TimeRoller
                value={draftDhuhaTime}
                onChange={setDraftDhuhaTime}
                tintColor={C.tint}
                textColor={C.text}
                bgColor={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}
              />
              <Text style={[styles.rollerHint, { color: C.textMuted }]}>
                {isAr ? 'يُصلَّى الضحى بعد ارتفاع الشمس وقبل الظهر' : 'Prayed after sunrise and before Dhuhr'}
              </Text>
              <Pressable onPress={() => setShowDhuhaRoller(false)} style={[styles.rollerDone, { backgroundColor: C.tint }]}>
                <Text style={[styles.rollerDoneText, { color: C.tintText }]}>{isAr ? 'تأكيد' : 'Done'}</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* Tahajjud Time Roller Modal */}
        <Modal visible={showTahajjudRoller} transparent animationType="slide">
          <View style={styles.rollerOverlay}>
            <View style={[styles.rollerSheet, { backgroundColor: C.backgroundCard }]}>
              <Text style={[styles.rollerTitle, { color: C.text, fontFamily: isRtl ? 'Amiri_700Bold' : SERIF_EN }]}>
                {isAr ? 'حدد وقت التهجد' : 'Set Tahajjud Time'}
              </Text>
              <TimeRoller
                value={draftTahajjudTime}
                onChange={setDraftTahajjudTime}
                tintColor={C.tint}
                textColor={C.text}
                bgColor={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}
              />
              <Text style={[styles.rollerHint, { color: C.textMuted }]}>
                {isAr ? 'الثلث الأخير من الليل: من نحو ٢ – ٤ صباحاً' : 'Last third of night: approx 2–4 AM'}
              </Text>
              <Pressable onPress={() => setShowTahajjudRoller(false)} style={[styles.rollerDone, { backgroundColor: C.tint }]}>
                <Text style={[styles.rollerDoneText, { color: C.tintText }]}>{isAr ? 'تأكيد' : 'Done'}</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* Notifications */}
        <View style={{ flexDirection: isRtl ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 6, marginLeft: isRtl ? 0 : 4, marginRight: isRtl ? 4 : 0 }}>
          <Text style={[styles.sectionTitle, { color: C.tint, fontFamily: isRtl ? 'Amiri_700Bold' : SERIF_EN, textAlign: isRtl ? 'right' : 'left', marginTop: 0, marginBottom: 0 }]}>
            {isAr ? 'الإشعارات' : 'Notifications'}
          </Text>
          <HelpBtn helpKey="notifications" />
        </View>
        <View style={[styles.card, { backgroundColor: C.backgroundCard, borderColor: C.separator }]}>
          {NOTIF_PRAYERS.map((prayer, idx) => {
            const cfg: PrayerNotifConfig = draftNotifications[prayer.key] ?? EMPTY_CFG;
            const hasBanner = cfg.banner;
            const hasAthan = cfg.athan !== 'none';
            const isLast = idx === NOTIF_PRAYERS.length - 1;

            return (
              <View key={prayer.key} style={[
                styles.notifItem,
                { borderBottomColor: C.separator, borderBottomWidth: isLast && !hasAthan ? 0 : 1 }
              ]}>
                {/* Main row: prayer name + Banner toggle + Athan toggle */}
                <View style={[styles.notifRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                  <Text style={[
                    styles.notifLabel,
                    { color: C.text, fontFamily: isRtl ? 'Amiri_400Regular' : SERIF_EN, textAlign: isRtl ? 'right' : 'left' }
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

      </ScrollView>

      {/* ── Help overlay ───────────────────────────────────────── */}
      <Modal
        visible={!!helpContent}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setHelpContent(null)}
      >
        <Pressable style={styles.helpBackdrop} onPress={() => setHelpContent(null)}>
          <Pressable style={[styles.helpCard, { backgroundColor: isDark ? '#0e2b1a' : '#ffffff', borderColor: C.tint }]} onPress={() => {}}>
            <View style={[styles.helpBar, { backgroundColor: C.tint }]} />
            <Text style={[styles.helpText, { color: C.text, fontFamily: isRtl ? 'Amiri_400Regular' : SERIF_EN, textAlign: isRtl ? 'right' : 'left' }]}>
              {helpContent ?? ''}
            </Text>
            <Pressable
              onPress={() => setHelpContent(null)}
              style={({ pressed }) => [styles.helpDismiss, { backgroundColor: C.tint, opacity: pressed ? 0.7 : 1 }]}
            >
              <Text style={[styles.helpDismissText, { color: C.tintText }]}>
                {isAr ? 'حسناً' : lang === 'ur' || lang === 'fa' ? 'ٹھیک ہے' : 'Got it'}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingBottom: 12,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 16, fontWeight: '700' },
  saveBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 16,
  },
  saveBtnText: { fontSize: 13, fontWeight: '600' },
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
    width: 38, height: 38, alignItems: 'center', justifyContent: 'center',
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
  accessThemeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  accessSwatch: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  accessThemeLabel: { fontSize: 13, marginBottom: 2 },
  accessThemeDesc: { fontSize: 11, lineHeight: 15 },
  timeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 12, borderWidth: 1,
  },
  timeBtnText: { fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
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
});
