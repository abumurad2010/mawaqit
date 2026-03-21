export interface Dhikr {
  arabic: string;
  transliteration: string;
  translationKey: string;
  count: number;
}

export interface AthkarCategory {
  id: string;
  icon: string;
  nameKey: string;
  adhkar: Dhikr[];
}

const MORNING_ADHKAR: Dhikr[] = [
  {
    arabic: "أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ — اللَّهُ لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ مَنْ ذَا الَّذِي يَشْفَعُ عِنْدَهُ إِلَّا بِإِذْنِهِ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ وَلَا يُحِيطُونَ بِشَيْءٍ مِنْ عِلْمِهِ إِلَّا بِمَا شَاءَ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ وَلَا يَئُودُهُ حِفْظُهُمَا وَهُوَ الْعَلِيُّ الْعَظِيمُ",
    transliteration: "Aʿūdhu billāhi minash-shayṭānir-rajīm — Allāhu lā ilāha illā huwal-ḥayyul-qayyūm. Lā taʾkhudhuhu sinatun wa lā nawm. Lahu mā fis-samāwāti wa mā fil-arḍ. Man dhalladhī yashfaʿu ʿindahu illā biʾidhnih. Yaʿlamu mā bayna aydīhim wa mā khalfahum wa lā yuḥīṭūna bishayʾin min ʿilmihi illā bimā shāʾ. Wasiʿa kursiyyuhus-samāwāti wal-arḍ, wa lā yaʾūduhu ḥifẓuhumā wa huwal-ʿaliyyul-ʿaẓīm.",
    translationKey: "athkar_morning_1",
    count: 1,
  },
  {
    arabic: "قُلْ هُوَ اللَّهُ أَحَدٌ، اللَّهُ الصَّمَدُ، لَمْ يَلِدْ وَلَمْ يُولَدْ، وَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ",
    transliteration: "Qul huwallāhu aḥad. Allāhuṣ-ṣamad. Lam yalid wa lam yūlad. Wa lam yakun lahu kufuwan aḥad.",
    translationKey: "athkar_morning_2",
    count: 3,
  },
  {
    arabic: "قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ، مِنْ شَرِّ مَا خَلَقَ، وَمِنْ شَرِّ غَاسِقٍ إِذَا وَقَبَ، وَمِنْ شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ، وَمِنْ شَرِّ حَاسِدٍ إِذَا حَسَدَ",
    transliteration: "Qul aʿūdhu birabbil-falaq. Min sharri mā khalaq. Wa min sharri ghāsiqin idhā waqab. Wa min sharrin-naffāthāti fil-ʿuqad. Wa min sharri ḥāsidin idhā ḥasad.",
    translationKey: "athkar_morning_3",
    count: 3,
  },
  {
    arabic: "قُلْ أَعُوذُ بِرَبِّ النَّاسِ، مَلِكِ النَّاسِ، إِلَهِ النَّاسِ، مِنْ شَرِّ الْوَسْوَاسِ الْخَنَّاسِ، الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ، مِنَ الْجِنَّةِ وَالنَّاسِ",
    transliteration: "Qul aʿūdhu birabbin-nās. Malikin-nās. Ilāhin-nās. Min sharril-waswāsil-khannās. Alladhī yuwaswisu fī ṣudūrin-nās. Minal-jinnati wan-nās.",
    translationKey: "athkar_morning_4",
    count: 3,
  },
  {
    arabic: "أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، رَبِّ أَسْأَلُكَ خَيْرَ مَا فِي هَذَا الْيَوْمِ وَخَيْرَ مَا بَعْدَهُ، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِي هَذَا الْيَوْمِ وَشَرِّ مَا بَعْدَهُ، رَبِّ أَعُوذُ بِكَ مِنَ الْكَسَلِ وَسُوءِ الْكِبَرِ، رَبِّ أَعُوذُ بِكَ مِنْ عَذَابٍ فِي النَّارِ وَعَذَابٍ فِي الْقَبْرِ",
    transliteration: "Aṣbaḥnā wa aṣbaḥal-mulku lillāh, wal-ḥamdu lillāh, lā ilāha illallāhu waḥdahu lā sharīka lah, lahul-mulku wa lahul-ḥamd, wa huwa ʿalā kulli shayʾin qadīr. Rabbi asʾaluka khayra mā fī hādhal-yawm wa khayra mā baʿdah, wa aʿūdhu bika min sharri mā fī hādhal-yawm wa sharri mā baʿdah. Rabbi aʿūdhu bika minal-kasali wa sūʾil-kibar. Rabbi aʿūdhu bika min ʿadhābin fin-nār wa ʿadhābin fil-qabr.",
    translationKey: "athkar_morning_5",
    count: 1,
  },
  {
    arabic: "اللَّهُمَّ بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ النُّشُورُ",
    transliteration: "Allāhumma bika aṣbaḥnā, wa bika amsaynā, wa bika naḥyā, wa bika namūt, wa ilayka an-nushūr.",
    translationKey: "athkar_morning_6",
    count: 1,
  },
  {
    arabic: "اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ لَكَ بِذَنْبِي فَاغْفِرْ لِي، فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ",
    transliteration: "Allāhumma anta rabbī, lā ilāha illā ant, khalaqtanī wa anā ʿabduk, wa anā ʿalā ʿahdika wa waʿdika mastaṭaʿt, aʿūdhu bika min sharri mā ṣanaʿt, abūʾu laka biniʿmatika ʿalayy, wa abūʾu laka bidhanbī faghfir lī, fa innahu lā yaghfirudh-dhunūba illā ant.",
    translationKey: "athkar_morning_7",
    count: 1,
  },
  {
    arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ",
    transliteration: "Allāhumma innī asʾalukal-ʿafwa wal-ʿāfiyata fid-dunyā wal-ākhirah.",
    translationKey: "athkar_morning_8",
    count: 1,
  },
  {
    arabic: "اللَّهُمَّ عَافِنِي فِي بَدَنِي، اللَّهُمَّ عَافِنِي فِي سَمْعِي، اللَّهُمَّ عَافِنِي فِي بَصَرِي، لَا إِلَهَ إِلَّا أَنْتَ",
    transliteration: "Allāhumma ʿāfinī fī badanī, Allāhumma ʿāfinī fī samʿī, Allāhumma ʿāfinī fī baṣarī, lā ilāha illā ant.",
    translationKey: "athkar_morning_9",
    count: 3,
  },
  {
    arabic: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْكُفْرِ وَالْفَقْرِ، وَأَعُوذُ بِكَ مِنْ عَذَابِ الْقَبْرِ، لَا إِلَهَ إِلَّا أَنْتَ",
    transliteration: "Allāhumma innī aʿūdhu bika minal-kufri wal-faqr, wa aʿūdhu bika min ʿadhābil-qabr, lā ilāha illā ant.",
    translationKey: "athkar_morning_10",
    count: 3,
  },
  {
    arabic: "بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ",
    transliteration: "Bismillāhil-ladhī lā yaḍurru maʿasmihi shayʾun fil-arḍi wa lā fis-samāʾ, wa huwas-samīʿul-ʿalīm.",
    translationKey: "athkar_morning_11",
    count: 3,
  },
  {
    arabic: "رَضِيتُ بِاللَّهِ رَبًّا، وَبِالْإِسْلَامِ دِينًا، وَبِمُحَمَّدٍ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ نَبِيًّا",
    transliteration: "Raḍītu billāhi rabbā, wa bil-islāmi dīnā, wa bi-Muḥammadin ṣallallāhu ʿalayhi wa sallam nabiyyā.",
    translationKey: "athkar_morning_12",
    count: 3,
  },
  {
    arabic: "يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ، أَصْلِحْ لِي شَأْنِي كُلَّهُ، وَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ",
    transliteration: "Yā ḥayyu yā qayyūmu biraḥmatika astaghīth, aṣliḥ lī shaʾnī kullahu wa lā takilnī ilā nafsī ṭarfata ʿayn.",
    translationKey: "athkar_morning_13",
    count: 1,
  },
  {
    arabic: "أَصْبَحْنَا عَلَى فِطْرَةِ الْإِسْلَامِ، وَعَلَى كَلِمَةِ الْإِخْلَاصِ، وَعَلَى دِينِ نَبِيِّنَا مُحَمَّدٍ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ، وَعَلَى مِلَّةِ أَبِينَا إِبْرَاهِيمَ حَنِيفًا مُسْلِمًا وَمَا كَانَ مِنَ الْمُشْرِكِينَ",
    transliteration: "Aṣbaḥnā ʿalā fiṭratil-islām, wa ʿalā kalimatal-ikhlāṣ, wa ʿalā dīni nabiyyinā Muḥammadin ṣallallāhu ʿalayhi wa sallam, wa ʿalā millati abīnā Ibrāhīma ḥanīfan muslimā wa mā kāna minal-mushrikīn.",
    translationKey: "athkar_morning_14",
    count: 1,
  },
  {
    arabic: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ",
    transliteration: "Subḥānallāhi wa biḥamdih.",
    translationKey: "athkar_morning_15",
    count: 100,
  },
  {
    arabic: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ",
    transliteration: "Lā ilāha illallāhu waḥdahu lā sharīka lah, lahul-mulku wa lahul-ḥamd, wa huwa ʿalā kulli shayʾin qadīr.",
    translationKey: "athkar_morning_16",
    count: 10,
  },
  {
    arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا، وَرِزْقًا طَيِّبًا، وَعَمَلًا مُتَقَبَّلًا",
    transliteration: "Allāhumma innī asʾaluka ʿilman nāfiʿā, wa rizqan ṭayyibā, wa ʿamalan mutaqabbalā.",
    translationKey: "athkar_morning_17",
    count: 1,
  },
  {
    arabic: "أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ",
    transliteration: "Aʿūdhu bikalimātillāhit-tāmmāti min sharri mā khalaq.",
    translationKey: "athkar_morning_18",
    count: 3,
  },
  {
    arabic: "اللَّهُمَّ صَلِّ وَسَلِّمْ وَبَارِكْ عَلَى نَبِيِّنَا مُحَمَّدٍ",
    transliteration: "Allāhumma ṣalli wa sallim wa bārik ʿalā nabiyyinā Muḥammad.",
    translationKey: "athkar_morning_19",
    count: 10,
  },
  {
    arabic: "حَسْبِيَ اللَّهُ لَا إِلَهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ",
    transliteration: "Ḥasbiyallāhu lā ilāha illā huwa, ʿalayhi tawakkaltu wa huwa rabbul-ʿarshil-ʿaẓīm.",
    translationKey: "athkar_morning_20",
    count: 7,
  },
];

function makeEveningAdhkar(): Dhikr[] {
  const evening: Dhikr[] = [];

  evening.push({
    arabic: "أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ وَالْحَمْدُ لِلَّهِ وَلَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، رَبِّ أَسْأَلُكَ خَيْرَ مَا فِي هَذِهِ اللَّيْلَةِ وَخَيْرَ مَا بَعْدَهَا، وَأَعُوذُ بِكَ مِنْ شَرِّ هَذِهِ اللَّيْلَةِ وَشَرِّ مَا بَعْدَهَا، رَبِّ أَعُوذُ بِكَ مِنَ الْكَسَلِ وَسُوءِ الْكِبَرِ، رَبِّ أَعُوذُ بِكَ مِنْ عَذَابٍ فِي النَّارِ وَعَذَابٍ فِي الْقَبْرِ",
    transliteration: "Amsaynā wa amsal-mulku lillāh, wal-ḥamdu lillāh, wa lā ilāha illallāhu waḥdahu lā sharīka lah, lahul-mulku wa lahul-ḥamd, wa huwa ʿalā kulli shayʾin qadīr. Rabbi asʾaluka khayra mā fī hādhihil-laylati wa khayra mā baʿdahā, wa aʿūdhu bika min sharri hādhihil-laylati wa sharri mā baʿdahā. Rabbi aʿūdhu bika minal-kasali wa sūʾil-kibar. Rabbi aʿūdhu bika min ʿadhābin fin-nār wa ʿadhābin fil-qabr.",
    translationKey: "athkar_evening_1",
    count: 1,
  });

  MORNING_ADHKAR.forEach((d, i) => {
    let arabic = d.arabic;
    let translit = d.transliteration;
    let tKey = d.translationKey;

    if (i === 4) {
      arabic = arabic
        .replace("أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ", "أَمْسَيْنَا وَأَمْسَى الْمُلْكُ")
        .replace(/هَذَا الْيَوْمِ/g, "هَذِهِ اللَّيْلَةِ");
      translit = translit
        .replace("Aṣbaḥnā wa aṣbaḥal-mulku", "Amsaynā wa amsal-mulku")
        .replace(/hādhal-yawm/g, "hādhihil-layla");
    }

    if (i === 5) {
      arabic = arabic
        .replace("بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا", "بِكَ أَمْسَيْنَا، وَبِكَ أَصْبَحْنَا")
        .replace("وَإِلَيْكَ النُّشُورُ", "وَإِلَيْكَ الْمَصِيرُ");
      translit = translit
        .replace("bika aṣbaḥnā, wa bika amsaynā", "bika amsaynā, wa bika aṣbaḥnā")
        .replace("wa ilayka an-nushūr", "wa ilayka al-maṣīr");
    }

    if (i === 13) {
      arabic = arabic.replace("أَصْبَحْنَا عَلَى فِطْرَةِ", "أَمْسَيْنَا عَلَى فِطْرَةِ");
      translit = translit.replace("Aṣbaḥnā ʿalā fiṭrati", "Amsaynā ʿalā fiṭrati");
    }

    evening.push({ arabic, transliteration: translit, translationKey: tKey, count: d.count });
  });

  return evening;
}

const ATHKAR_CATEGORIES: AthkarCategory[] = [
  {
    id: 'morning',
    icon: 'weather-sunset-up',
    nameKey: 'athkar_cat_morning',
    adhkar: MORNING_ADHKAR,
  },
  {
    id: 'evening',
    icon: 'weather-night',
    nameKey: 'athkar_cat_evening',
    adhkar: makeEveningAdhkar(),
  },
  {
    id: 'waking',
    icon: 'weather-sunny',
    nameKey: 'athkar_cat_waking',
    adhkar: [
      {
        arabic: "الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ",
        transliteration: "Al-ḥamdu lillāhil-ladhī aḥyānā baʿda mā amātanā wa ilayhin-nushūr.",
        translationKey: "athkar_waking_1",
        count: 1,
      },
      {
        arabic: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، سُبْحَانَ اللَّهِ، وَالْحَمْدُ لِلَّهِ، وَلَا إِلَهَ إِلَّا اللَّهُ، وَاللَّهُ أَكْبَرُ، وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ الْعَلِيِّ الْعَظِيمِ",
        transliteration: "Lā ilāha illallāhu waḥdahu lā sharīka lah, lahul-mulku wa lahul-ḥamd, wa huwa ʿalā kulli shayʾin qadīr. Subḥānallāh, wal-ḥamdu lillāh, wa lā ilāha illallāh, wallāhu akbar, wa lā ḥawla wa lā quwwata illā billāhil-ʿaliyyil-ʿaẓīm.",
        translationKey: "athkar_waking_2",
        count: 1,
      },
      {
        arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَ هَذَا الْيَوْمِ فَتْحَهُ وَنَصْرَهُ وَنُورَهُ وَبَرَكَتَهُ وَهُدَاهُ، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِيهِ وَشَرِّ مَا بَعْدَهُ",
        transliteration: "Allāhumma innī asʾaluka khayra hādhal-yawmi fatḥahu wa naṣrahu wa nūrahu wa barakatahu wa hudāh, wa aʿūdhu bika min sharri mā fīhi wa sharri mā baʿdah.",
        translationKey: "athkar_waking_3",
        count: 1,
      },
    ],
  },
  {
    id: 'sleep',
    icon: 'sleep',
    nameKey: 'athkar_cat_sleep',
    adhkar: [
      {
        arabic: "بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا",
        transliteration: "Bismika Allāhumma amūtu wa aḥyā.",
        translationKey: "athkar_sleep_1",
        count: 1,
      },
      {
        arabic: "اللَّهُمَّ قِنِي عَذَابَكَ يَوْمَ تَبْعَثُ عِبَادَكَ",
        transliteration: "Allāhumma qinī ʿadhābaka yawma tabʿathu ʿibādak.",
        translationKey: "athkar_sleep_2",
        count: 3,
      },
      {
        arabic: "سُبْحَانَ اللَّهِ",
        transliteration: "Subḥānallāh.",
        translationKey: "athkar_sleep_3",
        count: 33,
      },
      {
        arabic: "الْحَمْدُ لِلَّهِ",
        transliteration: "Al-ḥamdu lillāh.",
        translationKey: "athkar_sleep_4",
        count: 33,
      },
      {
        arabic: "اللَّهُ أَكْبَرُ",
        transliteration: "Allāhu akbar.",
        translationKey: "athkar_sleep_5",
        count: 34,
      },
      {
        arabic: "اللَّهُمَّ أَسْلَمْتُ نَفْسِي إِلَيْكَ، وَفَوَّضْتُ أَمْرِي إِلَيْكَ، وَوَجَّهْتُ وَجْهِي إِلَيْكَ، وَأَلْجَأْتُ ظَهْرِي إِلَيْكَ، رَغْبَةً وَرَهْبَةً إِلَيْكَ، لَا مَلْجَأَ وَلَا مَنْجَا مِنْكَ إِلَّا إِلَيْكَ، آمَنْتُ بِكِتَابِكَ الَّذِي أَنْزَلْتَ، وَبِنَبِيِّكَ الَّذِي أَرْسَلْتَ",
        transliteration: "Allāhumma aslamtu nafsī ilayk, wa fawwaḍtu amrī ilayk, wa wajjahtu wajhī ilayk, wa aljaʾtu ẓahrī ilayk, raghbatan wa rahbatan ilayk. Lā maljaʾa wa lā manjā minka illā ilayk. Āmantu bikitābikalladhī anzalt, wa binabiyyikalladhī arsalt.",
        translationKey: "athkar_sleep_6",
        count: 1,
      },
      {
        arabic: "اللَّهُمَّ بِاسْمِكَ أَحْيَا وَأَمُوتُ",
        transliteration: "Allāhumma bismika aḥyā wa amūt.",
        translationKey: "athkar_sleep_7",
        count: 1,
      },
    ],
  },
  {
    id: 'after_prayer',
    icon: 'mosque',
    nameKey: 'athkar_cat_after_prayer',
    adhkar: [
      {
        arabic: "أَسْتَغْفِرُ اللَّهَ",
        transliteration: "Astaghfirullāh.",
        translationKey: "athkar_afterprayer_1",
        count: 3,
      },
      {
        arabic: "اللَّهُمَّ أَنْتَ السَّلَامُ، وَمِنْكَ السَّلَامُ، تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ",
        transliteration: "Allāhumma antas-salām, wa minkas-salām, tabārakta yā dhal-jalāli wal-ikrām.",
        translationKey: "athkar_afterprayer_2",
        count: 1,
      },
      {
        arabic: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، اللَّهُمَّ لَا مَانِعَ لِمَا أَعْطَيْتَ، وَلَا مُعْطِيَ لِمَا مَنَعْتَ، وَلَا يَنْفَعُ ذَا الْجَدِّ مِنْكَ الْجَدُّ",
        transliteration: "Lā ilāha illallāhu waḥdahu lā sharīka lah, lahul-mulku wa lahul-ḥamd, wa huwa ʿalā kulli shayʾin qadīr. Allāhumma lā māniʿa limā aʿṭayt, wa lā muʿṭiya limā manaʿt, wa lā yanfaʿu dhal-jaddi minkal-jadd.",
        translationKey: "athkar_afterprayer_3",
        count: 1,
      },
      {
        arabic: "سُبْحَانَ اللَّهِ",
        transliteration: "Subḥānallāh.",
        translationKey: "athkar_afterprayer_4",
        count: 33,
      },
      {
        arabic: "الْحَمْدُ لِلَّهِ",
        transliteration: "Al-ḥamdu lillāh.",
        translationKey: "athkar_afterprayer_5",
        count: 33,
      },
      {
        arabic: "اللَّهُ أَكْبَرُ",
        transliteration: "Allāhu akbar.",
        translationKey: "athkar_afterprayer_6",
        count: 33,
      },
      {
        arabic: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ",
        transliteration: "Lā ilāha illallāhu waḥdahu lā sharīka lah, lahul-mulku wa lahul-ḥamd, wa huwa ʿalā kulli shayʾin qadīr.",
        translationKey: "athkar_afterprayer_7",
        count: 1,
      },
      {
        arabic: "اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ",
        transliteration: "Allāhumma aʿinnī ʿalā dhikrika wa shukrika wa ḥusni ʿibādatik.",
        translationKey: "athkar_afterprayer_8",
        count: 1,
      },
      {
        arabic: "آيَةُ الْكُرْسِيِّ — اللَّهُ لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ...",
        transliteration: "Āyat al-Kursī — recite Al-Baqarah 2:255",
        translationKey: "athkar_afterprayer_9",
        count: 1,
      },
    ],
  },
  {
    id: 'wudu',
    icon: 'water-outline',
    nameKey: 'athkar_cat_wudu',
    adhkar: [
      {
        arabic: "بِسْمِ اللَّهِ",
        transliteration: "Bismillāh.",
        translationKey: "athkar_wudu_1",
        count: 1,
      },
      {
        arabic: "أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ، اللَّهُمَّ اجْعَلْنِي مِنَ التَّوَّابِينَ وَاجْعَلْنِي مِنَ الْمُتَطَهِّرِينَ",
        transliteration: "Ashhadu an lā ilāha illallāhu waḥdahu lā sharīka lah, wa ashhadu anna Muḥammadan ʿabduhu wa rasūluh. Allāhummaj-ʿalnī minat-tawwābīna waj-ʿalnī minal-mutaṭahhirīn.",
        translationKey: "athkar_wudu_2",
        count: 1,
      },
      {
        arabic: "سُبْحَانَكَ اللَّهُمَّ وَبِحَمْدِكَ، أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا أَنْتَ، أَسْتَغْفِرُكَ وَأَتُوبُ إِلَيْكَ",
        transliteration: "Subḥānaka Allāhumma wa biḥamdik, ashhadu an lā ilāha illā ant, astaghfiruka wa atūbu ilayk.",
        translationKey: "athkar_wudu_3",
        count: 1,
      },
    ],
  },
  {
    id: 'mosque',
    icon: 'door-open',
    nameKey: 'athkar_cat_mosque',
    adhkar: [
      {
        arabic: "اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ",
        transliteration: "Allāhummaf-taḥ lī abwāba raḥmatik.",
        translationKey: "athkar_mosque_1",
        count: 1,
      },
      {
        arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ",
        transliteration: "Allāhumma innī asʾaluka min faḍlik.",
        translationKey: "athkar_mosque_2",
        count: 1,
      },
      {
        arabic: "أَعُوذُ بِاللَّهِ الْعَظِيمِ، وَبِوَجْهِهِ الْكَرِيمِ، وَسُلْطَانِهِ الْقَدِيمِ، مِنَ الشَّيْطَانِ الرَّجِيمِ",
        transliteration: "Aʿūdhu billāhil-ʿaẓīm, wa biwajhihil-karīm, wa sulṭānihil-qadīm, minash-shayṭānir-rajīm.",
        translationKey: "athkar_mosque_3",
        count: 1,
      },
    ],
  },
  {
    id: 'istighfar',
    icon: 'hands-pray',
    nameKey: 'athkar_cat_istighfar',
    adhkar: [
      {
        arabic: "اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ",
        transliteration: "Allāhumma anta rabbī lā ilāha illā ant, khalaqtanī wa anā ʿabduk, wa anā ʿalā ʿahdika wa waʿdika mastaṭaʿt. Aʿūdhu bika min sharri mā ṣanaʿt. Abūʾu laka biniʿmatika ʿalayy, wa abūʾu bidhanbī faghfir lī fa innahu lā yaghfirudh-dhunūba illā ant.",
        translationKey: "athkar_istighfar_1",
        count: 1,
      },
      {
        arabic: "أَسْتَغْفِرُ اللَّهَ الَّذِي لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ وَأَتُوبُ إِلَيْهِ",
        transliteration: "Astaghfirullāhal-ladhī lā ilāha illā huwal-ḥayyul-qayyūmu wa atūbu ilayh.",
        translationKey: "athkar_istighfar_2",
        count: 3,
      },
      {
        arabic: "أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ",
        transliteration: "Astaghfirullāha wa atūbu ilayh.",
        translationKey: "athkar_istighfar_3",
        count: 100,
      },
      {
        arabic: "رَبِّ اغْفِرْ لِي وَتُبْ عَلَيَّ إِنَّكَ أَنْتَ التَّوَّابُ الرَّحِيمُ",
        transliteration: "Rabbighfir lī wa tub ʿalayya innaka anta at-tawwābur-raḥīm.",
        translationKey: "athkar_istighfar_4",
        count: 100,
      },
      {
        arabic: "رَبَّنَا ظَلَمْنَا أَنْفُسَنَا وَإِنْ لَمْ تَغْفِرْ لَنَا وَتَرْحَمْنَا لَنَكُونَنَّ مِنَ الْخَاسِرِينَ",
        transliteration: "Rabbanā ẓalamnā anfusanā wa in lam taghfir lanā wa tarḥamnā lanakūnanna minal-khāsirīn.",
        translationKey: "athkar_istighfar_5",
        count: 1,
      },
    ],
  },
  {
    id: 'anxiety',
    icon: 'cloud-outline',
    nameKey: 'athkar_cat_anxiety',
    adhkar: [
      {
        arabic: "اللَّهُمَّ إِنِّي عَبْدُكَ، ابْنُ عَبْدِكَ، ابْنُ أَمَتِكَ، نَاصِيَتِي بِيَدِكَ، مَاضٍ فِيَّ حُكْمُكَ، عَدْلٌ فِيَّ قَضَاؤُكَ، أَسْأَلُكَ بِكُلِّ اسْمٍ هُوَ لَكَ سَمَّيْتَ بِهِ نَفْسَكَ، أَوْ أَنْزَلْتَهُ فِي كِتَابِكَ، أَوْ عَلَّمْتَهُ أَحَدًا مِنْ خَلْقِكَ، أَوِ اسْتَأْثَرْتَ بِهِ فِي عِلْمِ الْغَيْبِ عِنْدَكَ، أَنْ تَجْعَلَ الْقُرْآنَ رَبِيعَ قَلْبِي، وَنُورَ صَدْرِي، وَجِلَاءَ حُزْنِي، وَذَهَابَ هَمِّي",
        transliteration: "Allāhumma innī ʿabduk, ibnu ʿabdik, ibnu amatik, nāṣiyatī biyadik, māḍin fiyya ḥukmuk, ʿadlun fiyya qaḍāʾuk. Asʾaluka bikulli ismin huwa lak, sammayta bihi nafsak, aw anzaltahu fī kitābik, aw ʿallamtahu aḥadan min khalqik, aw istaʾtharta bihi fī ʿilmil-ghaybi ʿindak, an tajʿalal-Qurʾāna rabīʿa qalbī, wa nūra ṣadrī, wa jalāʾa ḥuznī, wa dhahāba hammī.",
        translationKey: "athkar_anxiety_1",
        count: 1,
      },
      {
        arabic: "اللَّهُمَّ رَحْمَتَكَ أَرْجُو، فَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ، وَأَصْلِحْ لِي شَأْنِي كُلَّهُ، لَا إِلَهَ إِلَّا أَنْتَ",
        transliteration: "Allāhumma raḥmataka arjū, fa lā takilnī ilā nafsī ṭarfata ʿayn, wa aṣliḥ lī shaʾnī kullahu, lā ilāha illā ant.",
        translationKey: "athkar_anxiety_2",
        count: 1,
      },
      {
        arabic: "لَا إِلَهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ",
        transliteration: "Lā ilāha illā anta subḥānaka innī kuntu minaẓ-ẓālimīn.",
        translationKey: "athkar_anxiety_3",
        count: 1,
      },
    ],
  },
  {
    id: 'distress',
    icon: 'heart-pulse',
    nameKey: 'athkar_cat_distress',
    adhkar: [
      {
        arabic: "لَا إِلَهَ إِلَّا اللَّهُ الْعَظِيمُ الْحَلِيمُ، لَا إِلَهَ إِلَّا اللَّهُ رَبُّ الْعَرْشِ الْعَظِيمِ، لَا إِلَهَ إِلَّا اللَّهُ رَبُّ السَّمَاوَاتِ وَرَبُّ الْأَرْضِ وَرَبُّ الْعَرْشِ الْكَرِيمِ",
        transliteration: "Lā ilāha illallāhul-ʿaẓīmul-ḥalīm. Lā ilāha illallāhu rabbul-ʿarshil-ʿaẓīm. Lā ilāha illallāhu rabus-samāwāti wa rabbul-arḍi wa rabbul-ʿarshil-karīm.",
        translationKey: "athkar_distress_1",
        count: 1,
      },
      {
        arabic: "اللَّهُ اللَّهُ رَبِّي لَا أُشْرِكُ بِهِ شَيْئًا",
        transliteration: "Allāhu Allāhu rabbī lā ushriku bihi shayʾā.",
        translationKey: "athkar_distress_2",
        count: 7,
      },
      {
        arabic: "حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ",
        transliteration: "Ḥasbunallāhu wa niʿmal-wakīl.",
        translationKey: "athkar_distress_3",
        count: 1,
      },
    ],
  },
  {
    id: 'istikhara',
    icon: 'help-circle-outline',
    nameKey: 'athkar_cat_istikhara',
    adhkar: [
      {
        arabic: "اللَّهُمَّ إِنِّي أَسْتَخِيرُكَ بِعِلْمِكَ، وَأَسْتَقْدِرُكَ بِقُدْرَتِكَ، وَأَسْأَلُكَ مِنْ فَضْلِكَ الْعَظِيمِ، فَإِنَّكَ تَقْدِرُ وَلَا أَقْدِرُ، وَتَعْلَمُ وَلَا أَعْلَمُ، وَأَنْتَ عَلَّامُ الْغُيُوبِ، اللَّهُمَّ إِنْ كُنْتَ تَعْلَمُ أَنَّ هَذَا الْأَمْرَ خَيْرٌ لِي فِي دِينِي وَمَعَاشِي وَعَاقِبَةِ أَمْرِي فَاقْدُرْهُ لِي وَيَسِّرْهُ لِي ثُمَّ بَارِكْ لِي فِيهِ، وَإِنْ كُنْتَ تَعْلَمُ أَنَّ هَذَا الْأَمْرَ شَرٌّ لِي فِي دِينِي وَمَعَاشِي وَعَاقِبَةِ أَمْرِي فَاصْرِفْهُ عَنِّي وَاصْرِفْنِي عَنْهُ وَاقْدُرْ لِيَ الْخَيْرَ حَيْثُ كَانَ ثُمَّ أَرْضِنِي بِهِ",
        transliteration: "Allāhumma innī astakhīruka biʿilmik, wa astaqdiruka biqudratik, wa asʾaluka min faḍlikal-ʿaẓīm. Fa innaka taqdiru wa lā aqdiru, wa taʿlamu wa lā aʿlam, wa anta ʿallāmul-ghuyūb. Allāhumma in kunta taʿlamu anna hādhal-amra khayrun lī fī dīnī wa maʿāshī wa ʿāqibati amrī faqdur-hu lī wa yassir-hu lī thumma bārik lī fīh. Wa in kunta taʿlamu anna hādhal-amra sharrun lī fī dīnī wa maʿāshī wa ʿāqibati amrī faṣrif-hu ʿannī waṣrif-nī ʿanhu waqdur liyal-khayra ḥaythu kāna thumma arḍinī bih.",
        translationKey: "athkar_istikhara_1",
        count: 1,
      },
    ],
  },
  {
    id: 'travel',
    icon: 'airplane',
    nameKey: 'athkar_cat_travel',
    adhkar: [
      {
        arabic: "اللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ، سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ، وَإِنَّا إِلَى رَبِّنَا لَمُنْقَلِبُونَ، اللَّهُمَّ إِنَّا نَسْأَلُكَ فِي سَفَرِنَا هَذَا الْبِرَّ وَالتَّقْوَى، وَمِنَ الْعَمَلِ مَا تَرْضَى، اللَّهُمَّ هَوِّنْ عَلَيْنَا سَفَرَنَا هَذَا وَاطْوِ عَنَّا بُعْدَهُ، اللَّهُمَّ أَنْتَ الصَّاحِبُ فِي السَّفَرِ وَالْخَلِيفَةُ فِي الْأَهْلِ",
        transliteration: "Allāhu akbar, Allāhu akbar, Allāhu akbar. Subḥānal-ladhī sakhkhara lanā hādhā wa mā kunnā lahu muqrinīn, wa innā ilā rabbinā lamunqalibūn. Allāhumma innā nasʾaluka fī safarinā hādhal-birra wat-taqwā, wa minal-ʿamali mā tarḍā. Allāhumma hawwin ʿalaynā safaranā hādhā waṭwi ʿannā buʿdah. Allāhumma antas-ṣāḥibu fis-safar wal-khalīfatu fil-ahl.",
        translationKey: "athkar_travel_1",
        count: 1,
      },
      {
        arabic: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ وَعْثَاءِ السَّفَرِ، وَكَآبَةِ الْمَنْظَرِ، وَسُوءِ الْمُنْقَلَبِ فِي الْمَالِ وَالْأَهْلِ",
        transliteration: "Allāhumma innī aʿūdhu bika min waʿthāʾis-safar, wa kaʾābatil-manẓar, wa sūʾil-munqalabi fil-māli wal-ahl.",
        translationKey: "athkar_travel_2",
        count: 1,
      },
    ],
  },
  {
    id: 'visiting_sick',
    icon: 'medical-bag',
    nameKey: 'athkar_cat_visiting_sick',
    adhkar: [
      {
        arabic: "لَا بَأْسَ طَهُورٌ إِنْ شَاءَ اللَّهُ",
        transliteration: "Lā baʾsa ṭahūrun in shāʾallāh.",
        translationKey: "athkar_sick_1",
        count: 1,
      },
      {
        arabic: "اللَّهُمَّ رَبَّ النَّاسِ، أَذْهِبِ الْبَأْسَ، اشْفِ أَنْتَ الشَّافِي، لَا شِفَاءَ إِلَّا شِفَاؤُكَ، شِفَاءً لَا يُغَادِرُ سَقَمًا",
        transliteration: "Allāhumma rabban-nās, adh-hibil-baʾs, ishfi antash-shāfī, lā shifāʾa illā shifāʾuk, shifāʾan lā yughādiru saqamā.",
        translationKey: "athkar_sick_2",
        count: 1,
      },
      {
        arabic: "بِسْمِ اللَّهِ — أَعُوذُ بِاللَّهِ وَقُدْرَتِهِ مِنْ شَرِّ مَا أَجِدُ وَأُحَاذِرُ",
        transliteration: "Bismillāh — Aʿūdhu billāhi wa qudratihī min sharri mā ajidu wa uḥādhir.",
        translationKey: "athkar_sick_3",
        count: 7,
      },
      {
        arabic: "أَسْأَلُ اللَّهَ الْعَظِيمَ رَبَّ الْعَرْشِ الْعَظِيمِ أَنْ يَشْفِيَكَ",
        transliteration: "Asʾalullāhal-ʿaẓīma rabbal-ʿarshil-ʿaẓīmi an yashfiyak.",
        translationKey: "athkar_sick_4",
        count: 7,
      },
    ],
  },
  {
    id: 'quranic',
    icon: 'book-open-variant',
    nameKey: 'athkar_cat_quranic',
    adhkar: [
      {
        arabic: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ",
        transliteration: "Rabbanā ātinā fid-dunyā ḥasanatan wa fil-ākhirati ḥasanatan wa qinā ʿadhāban-nār.",
        translationKey: "athkar_quranic_1",
        count: 1,
      },
      {
        arabic: "رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا وَهَبْ لَنَا مِنْ لَدُنْكَ رَحْمَةً إِنَّكَ أَنْتَ الْوَهَّابُ",
        transliteration: "Rabbanā lā tuzigh qulūbanā baʿda idh hadaytanā wa hab lanā min ladunka raḥmah, innaka antal-wahhāb.",
        translationKey: "athkar_quranic_2",
        count: 1,
      },
      {
        arabic: "رَبَّنَا ظَلَمْنَا أَنْفُسَنَا وَإِنْ لَمْ تَغْفِرْ لَنَا وَتَرْحَمْنَا لَنَكُونَنَّ مِنَ الْخَاسِرِينَ",
        transliteration: "Rabbanā ẓalamnā anfusanā wa in lam taghfir lanā wa tarḥamnā lanakūnanna minal-khāsirīn.",
        translationKey: "athkar_quranic_3",
        count: 1,
      },
      {
        arabic: "رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي وَاحْلُلْ عُقْدَةً مِنْ لِسَانِي يَفْقَهُوا قَوْلِي",
        transliteration: "Rabbish-raḥ lī ṣadrī wa yassir lī amrī waḥlul ʿuqdatan min lisānī yafqahū qawlī.",
        translationKey: "athkar_quranic_4",
        count: 1,
      },
      {
        arabic: "رَبِّ إِنِّي لِمَا أَنْزَلْتَ إِلَيَّ مِنْ خَيْرٍ فَقِيرٌ",
        transliteration: "Rabbi innī limā anzalta ilayya min khayrin faqīr.",
        translationKey: "athkar_quranic_5",
        count: 1,
      },
      {
        arabic: "رَبَّنَا هَبْ لَنَا مِنْ أَزْوَاجِنَا وَذُرِّيَّاتِنَا قُرَّةَ أَعْيُنٍ وَاجْعَلْنَا لِلْمُتَّقِينَ إِمَامًا",
        transliteration: "Rabbanā hab lanā min azwājinā wa dhurriyyātinā qurrata aʿyunin wajʿalnā lil-muttaqīna imāmā.",
        translationKey: "athkar_quranic_6",
        count: 1,
      },
    ],
  },
  {
    id: 'rizq',
    icon: 'sprout-outline',
    nameKey: 'athkar_cat_rizq',
    adhkar: [
      {
        arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا، وَرِزْقًا طَيِّبًا، وَعَمَلًا مُتَقَبَّلًا",
        transliteration: "Allāhumma innī asʾaluka ʿilman nāfiʿā, wa rizqan ṭayyibā, wa ʿamalan mutaqabbalā.",
        translationKey: "athkar_rizq_1",
        count: 1,
      },
      {
        arabic: "اللَّهُمَّ اكْفِنِي بِحَلَالِكَ عَنْ حَرَامِكَ، وَأَغْنِنِي بِفَضْلِكَ عَمَّنْ سِوَاكَ",
        transliteration: "Allāhummak-finī biḥalālika ʿan ḥarāmik, wa aghnini bifaḍlika ʿamman siwāk.",
        translationKey: "athkar_rizq_2",
        count: 1,
      },
      {
        arabic: "رَبِّ إِنِّي لِمَا أَنْزَلْتَ إِلَيَّ مِنْ خَيْرٍ فَقِيرٌ",
        transliteration: "Rabbi innī limā anzalta ilayya min khayrin faqīr.",
        translationKey: "athkar_rizq_3",
        count: 1,
      },
      {
        arabic: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَالْعَجْزِ وَالْكَسَلِ، وَالْبُخْلِ وَالْجُبْنِ، وَضَلَعِ الدَّيْنِ وَغَلَبَةِ الرِّجَالِ",
        transliteration: "Allāhumma innī aʿūdhu bika minal-hammi wal-ḥazan, wal-ʿajzi wal-kasal, wal-bukhli wal-jubn, wa ḍalaʿid-dayni wa ghalabatir-rijāl.",
        translationKey: "athkar_rizq_4",
        count: 1,
      },
    ],
  },
  {
    id: 'debt',
    icon: 'hand-coin-outline',
    nameKey: 'athkar_cat_debt',
    adhkar: [
      {
        arabic: "اللَّهُمَّ اكْفِنِي بِحَلَالِكَ عَنْ حَرَامِكَ، وَأَغْنِنِي بِفَضْلِكَ عَمَّنْ سِوَاكَ",
        transliteration: "Allāhummak-finī biḥalālika ʿan ḥarāmik, wa aghnini bifaḍlika ʿamman siwāk.",
        translationKey: "athkar_debt_1",
        count: 1,
      },
      {
        arabic: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْمَأْثَمِ وَالْمَغْرَمِ",
        transliteration: "Allāhumma innī aʿūdhu bika minal-maʾthami wal-maghram.",
        translationKey: "athkar_debt_2",
        count: 1,
      },
      {
        arabic: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَالْعَجْزِ وَالْكَسَلِ، وَالْبُخْلِ وَالْجُبْنِ، وَضَلَعِ الدَّيْنِ وَغَلَبَةِ الرِّجَالِ",
        transliteration: "Allāhumma innī aʿūdhu bika minal-hammi wal-ḥazan, wal-ʿajzi wal-kasal, wal-bukhli wal-jubn, wa ḍalaʿid-dayni wa ghalabatir-rijāl.",
        translationKey: "athkar_debt_3",
        count: 1,
      },
    ],
  },
];

export default ATHKAR_CATEGORIES;
