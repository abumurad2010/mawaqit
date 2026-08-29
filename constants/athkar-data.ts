/*
 * BANNED ICONS — never use these in this app:
 * Any icon whose name contains: 'cross', 'christian',
 * 'church', 'hospital', 'medical-bag', 'hospital-box',
 * 'ambulance' (has cross), 'pharmacy' (has cross),
 * 'star-david', 'star-of-david', 'star-outline' (hexagram risk),
 * 'sun-compass' (hexagram risk), 'asterisk' (cross risk),
 * 'plus' standalone icons (cross appearance),
 * 'shield-cross', 'shield-cross-outline'
 */

/*
 * SOURCE / ATTRIBUTION
 * Repetition counts and takhrij (source citations) are drawn from the Hisn
 * al-Muslim dataset `asellam/HisnElMuslim` (hisn.json), MIT-licensed
 * © 2021 Abdellah SELLAM — https://github.com/asellam/HisnElMuslim
 * cross-checked against `rn0x/hisnmuslim_app` (MIT; hisnmuslim.com data).
 * The two sources agree on counts for 172/174 shared adhkar.
 * NOTE: the original provenance of the Arabic/transliteration/meaning text in
 * this file is unknown; a subset (notably parents, laylatul_qadr, quran_khatm,
 * amazement, eclipse) is not present in Hisn al-Muslim and its source is
 * unverified. `takhrij` is populated only where a value is confirmed from a source.
 */

export interface Thikr {
  arabic: string;
  transliteration: string;
  translationKey: string;
  count: number;
  /** Source citation (takhrij), verbatim from the MIT Hisn al-Muslim dataset.
   *  Present only on entries whose count/text is confirmed against a source. */
  takhrij?: string;
}

export interface AthkarCategory {
  id: string;
  icon: string;
  nameKey: string;
  adhkar: Thikr[];
}

const MORNING_ADHKAR: Thikr[] = [
  {
    arabic: "اللَّهُ لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَنْ ذَا الَّذِي يَشْفَعُ عِنْدَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ",
    transliteration: "Allāhu lā ilāha illā huwal-ḥayyul-qayyūm. Lā taʾkhudhuhu sinatun wa lā nawm. Lahu mā fis-samāwāti wa mā fil-arḍ. Man dhalladhī yashfaʿu ʿindahu illā biʾidhnih. Yaʿlamu mā bayna aydīhim wa mā khalfahum wa lā yuḥīṭūna bishayʾin min ʿilmihi illā bimā shāʾ. Wasiʿa kursiyyuhus-samāwāti wal-arḍ, wa lā yaʾūduhu ḥifẓuhumā wa huwal-ʿaliyyul-ʿaẓīm.",
    translationKey: "athkar_morn_eve_ayatul_kursi",
    count: 1, takhrij: "من قرأها دبر كل صلاة لم يمنعه من دخول الجنة إلا أن يموت . والنسائي في عمل اليوم والليلة برقم 100، وابن السني برقم 121 وصححه الجامع 5/ 339 وسلسلة الأحاديث الصحيحة 2/ 697 برقم 972" },
  {
    arabic: "قُلْ هُوَ اللَّهُ أَحَدٌ ۝ اللَّهُ الصَّمَدُ ۝ لَمْ يَلِدْ وَلَمْ يُولَدْ ۝ وَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ",
    transliteration: "Qul huwallāhu aḥad. Allāhuṣ-ṣamad. Lam yalid wa lam yūlad. Wa lam yakun lahu kufuwan aḥad.",
    translationKey: "athkar_morn_eve_ikhlas",
    count: 3, takhrij: "أبو داود 2/ 86 والنسائي 3/ 68 وانظر صحيح التّرمذي 2/ 8 والسور الثلاث يقال لها المعوذات وانظر فتح الباري 9/ 62" },
  {
    arabic: "قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ ۝ مِنْ شَرِّ مَا خَلَقَ ۝ وَمِنْ شَرِّ غَاسِقٍ إِذَا وَقَبَ ۝ وَمِنْ شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ ۝ وَمِنْ شَرِّ حَاسِدٍ إِذَا حَسَدَ",
    transliteration: "Qul aʿūdhu birabbil-falaq. Min sharri mā khalaq. Wa min sharri ghāsiqin idhā waqab. Wa min sharrin-naffāthāti fil-ʿuqad. Wa min sharri ḥāsidin idhā ḥasad.",
    translationKey: "athkar_morn_eve_falaq",
    count: 3, takhrij: "أبو داود 2/ 86 والنسائي 3/ 68 وانظر صحيح التّرمذي 2/ 8 والسور الثلاث يقال لها المعوذات وانظر فتح الباري 9/ 62" },
  {
    arabic: "قُلْ أَعُوذُ بِرَبِّ النَّاسِ ۝ مَلِكِ النَّاسِ ۝ إِلَهِ النَّاسِ ۝ مِنْ شَرِّ الْوَسْوَاسِ الْخَنَّاسِ ۝ الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ ۝ مِنَ الْجِنَّةِ وَالنَّاسِ",
    transliteration: "Qul aʿūdhu birabbin-nās. Malikin-nās. Ilāhin-nās. Min sharril-waswāsil-khannās. Alladhī yuwaswisu fī ṣudūrin-nās. Minal-jinnati wan-nās.",
    translationKey: "athkar_morn_eve_nas",
    count: 3, takhrij: "أبو داود 2/ 86 والنسائي 3/ 68 وانظر صحيح التّرمذي 2/ 8 والسور الثلاث يقال لها المعوذات وانظر فتح الباري 9/ 62" },
  {
    arabic: "أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، رَبِّ أَسْأَلُكَ خَيْرَ مَا فِي هَذَا الْيَوْمِ وَخَيْرَ مَا بَعْدَهُ، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِي هَذَا الْيَوْمِ وَشَرِّ مَا بَعْدَهُ، رَبِّ أَعُوذُ بِكَ مِنَ الْكَسَلِ وَسُوءِ الْكِبَرِ، رَبِّ أَعُوذُ بِكَ مِنْ عَذَابٍ فِي النَّارِ وَعَذَابٍ فِي الْقَبْرِ",
    transliteration: "Aṣbaḥnā wa aṣbaḥal-mulku lillāh, wal-ḥamdu lillāh, lā ilāha illallāhu waḥdahu lā sharīka lah, lahul-mulku wa lahul-ḥamd, wa huwa ʿalā kulli shayʾin qadīr. Rabbi asʾaluka khayra mā fī hādhal-yawm wa khayra mā baʿdah, wa aʿūdhu bika min sharri mā fī hādhal-yawm wa sharri mā baʿdah. Rabbi aʿūdhu bika minal-kasali wa sūʾil-kibar. Rabbi aʿūdhu bika min ʿadhābin fin-nār wa ʿadhābin fil-qabr.",
    translationKey: "athkar_morning_5",
    count: 1, takhrij: "مسلم 4/ 2088" },
  {
    arabic: "اللَّهُمَّ بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ النُّشُورُ",
    transliteration: "Allāhumma bika aṣbaḥnā, wa bika amsaynā, wa bika naḥyā, wa bika namūt, wa ilayka an-nushūr.",
    translationKey: "athkar_morning_6",
    count: 1, takhrij: "التّرمذي 5/ 466 وانظر صحيح التّرمذي 3/ 142" },
  {
    arabic: "اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ لَكَ بِذَنْبِي فَاغْفِرْ لِي، فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ",
    transliteration: "Allāhumma anta rabbī, lā ilāha illā ant, khalaqtanī wa anā ʿabduk, wa anā ʿalā ʿahdika wa waʿdika mastaṭaʿt, aʿūdhu bika min sharri mā ṣanaʿt, abūʾu laka biniʿmatika ʿalayy, wa abūʾu laka bidhanbī faghfir lī, fa innahu lā yaghfirudh-dhunūba illā ant.",
    translationKey: "athkar_morning_7",
    count: 1, takhrij: "من قالها موقنًا بها حين يمسي فمات من ليلته دخل الجنة، وكذلك إذا أصبح أخرجه البخاري 7/ 150" },
  {
    arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ",
    transliteration: "Allāhumma innī asʾalukal-ʿafwa wal-ʿāfiyata fid-dunyā wal-ākhirah.",
    translationKey: "athkar_morning_8",
    count: 1, takhrij: "أبو داود وابن ماجه وانظر صحيح ابن ماجه 2/ 332" },
  {
    arabic: "اللَّهُمَّ عَافِنِي فِي بَدَنِي، اللَّهُمَّ عَافِنِي فِي سَمْعِي، اللَّهُمَّ عَافِنِي فِي بَصَرِي، لَا إِلَهَ إِلَّا أَنْتَ",
    transliteration: "Allāhumma ʿāfinī fī badanī, Allāhumma ʿāfinī fī samʿī, Allāhumma ʿāfinī fī baṣarī, lā ilāha illā ant.",
    translationKey: "athkar_morning_9",
    count: 3, takhrij: "أبو داود 4/ 324، وأحمد 5/ 42 والنسائي في عمل اليوم والليلة برقم 22 وابن السني برقم 69 والبخاري في الأدب المفرد، وحسن العلامة ابن باز إسناده في تحفة الأخيار ص 26" },
  {
    arabic: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْكُفْرِ وَالْفَقْرِ، وَأَعُوذُ بِكَ مِنْ عَذَابِ الْقَبْرِ، لَا إِلَهَ إِلَّا أَنْتَ",
    transliteration: "Allāhumma innī aʿūdhu bika minal-kufri wal-faqr, wa aʿūdhu bika min ʿadhābil-qabr, lā ilāha illā ant.",
    translationKey: "athkar_morning_10",
    count: 3, takhrij: "أبو داود 4/ 324، وأحمد 5/ 42 والنسائي في عمل اليوم والليلة برقم 22 وابن السني برقم 69 والبخاري في الأدب المفرد، وحسن العلامة ابن باز إسناده في تحفة الأخيار ص 26" },
  {
    arabic: "بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ",
    transliteration: "Bismillāhil-ladhī lā yaḍurru maʿasmihi shayʾun fil-arḍi wa lā fis-samāʾ, wa huwas-samīʿul-ʿalīm.",
    translationKey: "athkar_morning_11",
    count: 3, takhrij: "من قالها ثلاثًا إذا أصبح وثلاثًا إذا أمسى لم يضره شيء أخرجه أبو داود 4/ 323 والتّرمذي 5/ 465 وابن ماجه وأحمد. انظر: صحيح ابن ماجه 2/ 332 وحسن إسناده العلامة ابن باز في تحفة الأخيار ص 39" },
  {
    arabic: "رَضِيتُ بِاللَّهِ رَبًّا، وَبِالْإِسْلَامِ دِينًا، وَبِمُحَمَّدٍ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ نَبِيًّا",
    transliteration: "Raḍītu billāhi rabbā, wa bil-islāmi dīnā, wa bi-Muḥammadin ṣallallāhu ʿalayhi wa sallam nabiyyā.",
    translationKey: "athkar_morning_12",
    count: 3, takhrij: "من قالها ثلاثًا حين يصبح وحين يمسي كان حقًا على الله أن يرضيه يوم القيامة. أحمد 4/ 337 والنسائي في عمل اليوم والليلة برقم 4 وابن السني برقم 68 وأبو داود 4/ 418 والتّرمذي 5/ 465 وحسنه ابن باز في تحفة الأخيار ص 39" },
  {
    arabic: "يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ، أَصْلِحْ لِي شَأْنِي كُلَّهُ، وَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ",
    transliteration: "Yā ḥayyu yā qayyūmu biraḥmatika astaghīth, aṣliḥ lī shaʾnī kullahu wa lā takilnī ilā nafsī ṭarfata ʿayn.",
    translationKey: "athkar_morning_13",
    count: 1, takhrij: "الحاكم وصححه ووافقه الذهبي 1/ 545 وانظر صحيح الترغيب والترهيب 1/ 273" },
  {
    arabic: "أَصْبَحْنَا عَلَى فِطْرَةِ الْإِسْلَامِ، وَعَلَى كَلِمَةِ الْإِخْلَاصِ، وَعَلَى دِينِ نَبِيِّنَا مُحَمَّدٍ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ، وَعَلَى مِلَّةِ أَبِينَا إِبْرَاهِيمَ حَنِيفًا مُسْلِمًا وَمَا كَانَ مِنَ الْمُشْرِكِينَ",
    transliteration: "Aṣbaḥnā ʿalā fiṭratil-islām, wa ʿalā kalimatal-ikhlāṣ, wa ʿalā dīni nabiyyinā Muḥammadin ṣallallāhu ʿalayhi wa sallam, wa ʿalā millati abīnā Ibrāhīma ḥanīfan muslimā wa mā kāna minal-mushrikīn.",
    translationKey: "athkar_morning_14",
    count: 1, takhrij: "أحمد 3/ 406 و 407 وابن السني في عمل اليوم والليلة برقم 34 وانظر: صحيح الجامع 4/ 209" },
  {
    arabic: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ",
    transliteration: "Subḥānallāhi wa biḥamdih.",
    translationKey: "athkar_morning_15",
    count: 100, takhrij: "من قالها مائة مرة حين يصبح وحين يمسي لم يأت أحد يوم القيامة بأفضل مما جاء به إلا أحد قال مثل ما قال أو زاد رواه مسلم 4/ 2071" },
  {
    arabic: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ",
    transliteration: "Lā ilāha illallāhu waḥdahu lā sharīka lah, lahul-mulku wa lahul-ḥamd, wa huwa ʿalā kulli shayʾin qadīr.",
    translationKey: "athkar_morning_16",
    count: 10, takhrij: "عَشرَ مَرَّاتٍ: النسائي في عمل اليوم والليلة برقم 24 وانظر :صحيح الترغيب والترهيب 1/ 272، وتحفة الأخيار لابن باز ص 44 وانظر فضلها في ص 146، حديث رقم 255 أو مرة واحدة عند الكسل أبو داود 4/ 319 وابن ماجه وأحمد 4/ 60 وانظر :صحيح الترغيب والترهيب 1/ 270، صحيح أبو داود 3/ 957، وصحيح ابن ماجه 2/ 331 وزاد المعاد 2/ 377" },
  {
    arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا، وَرِزْقًا طَيِّبًا، وَعَمَلًا مُتَقَبَّلًا",
    transliteration: "Allāhumma innī asʾaluka ʿilman nāfiʿā, wa rizqan ṭayyibā, wa ʿamalan mutaqabbalā.",
    translationKey: "athkar_morning_17",
    count: 1, takhrij: "أخرجه ابن السني في عمل اليوم والليلة برقم 54 وابن ماجه برقم 925 وحسن إسناده عبد القادر وشعيب الأرناؤوط في تحقيق زاد المعاد 2/ 375" },
  {
    arabic: "أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ",
    transliteration: "Aʿūdhu bikalimātillāhit-tāmmāti min sharri mā khalaq.",
    translationKey: "athkar_morning_18",
    count: 3, takhrij: "من قالها حين يمسي ثلاث مرات لم تضره حمة تلك الليلة أخرجه أحمد 2/ 290 والنسائي في عمل اليوم والليلة برقم 590 وابن السني برقم 68 وانظر: صحيح التّرمذي 3/ 187، وصحيح ابن ماجه 2/ 266 وتحفة الأخيار ص 45" },
  {
    arabic: "حَسْبِيَ اللَّهُ لَا إِلَهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ",
    transliteration: "Ḥasbiyallāhu lā ilāha illā huwa, ʿalayhi tawakkaltu wa huwa rabbul-ʿarshil-ʿaẓīm.",
    translationKey: "athkar_morning_20",
    count: 7, takhrij: "من قالها حين يصبح ويمسي سبع مرات كفاه الله ما أهمه من أمر الدنيا والآخرة. أخرجه ابن السني برقم 71 مرفوعًا وأبو موقوف 4/ 321، وصحح إسناده شعيب وعبد القادر الأرناؤوط. انظر زاد المعاد 2/ 376" },
  {
    arabic: "اللَّهُمَّ صَلِّ وَسَلِّمْ وَبَارِكْ عَلَى نَبِيِّنَا مُحَمَّدٍ",
    transliteration: "Allāhumma ṣalli wa sallim wa bārik ʿalā nabiyyinā Muḥammad.",
    translationKey: "athkar_morning_19",
    count: 10, takhrij: "من صلى علي حين يُصبح عشرًا، وحين يُمسي عشرًا أدركتهُ شفاعتي يوم القيامة أخرجه الطبراني بإسنادين أحدهما جيد، انظر: الزوائد 10/ 120 وصحيح الترغيب والترهيب 1/ 273" },
];

function makeEveningAdhkar(): Thikr[] {
  const evening: Thikr[] = [];

  MORNING_ADHKAR.forEach((d, i) => {
    // i === 4 (morning_5) is the evening duplicate of athkar_evening_1.
    // Skip it and insert athkar_evening_1 in its place (after the 4 shared surahs).
    if (i === 4) {
      evening.push({
        arabic: "أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ وَالْحَمْدُ لِلَّهِ وَلَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، رَبِّ أَسْأَلُكَ خَيْرَ مَا فِي هَذِهِ اللَّيْلَةِ وَخَيْرَ مَا بَعْدَهَا، وَأَعُوذُ بِكَ مِنْ شَرِّ هَذِهِ اللَّيْلَةِ وَشَرِّ مَا بَعْدَهَا، رَبِّ أَعُوذُ بِكَ مِنَ الْكَسَلِ وَسُوءِ الْكِبَرِ، رَبِّ أَعُوذُ بِكَ مِنْ عَذَابٍ فِي النَّارِ وَعَذَابٍ فِي الْقَبْرِ",
        transliteration: "Amsaynā wa amsal-mulku lillāh, wal-ḥamdu lillāh, wa lā ilāha illallāhu waḥdahu lā sharīka lah, lahul-mulku wa lahul-ḥamd, wa huwa ʿalā kulli shayʾin qadīr. Rabbi asʾaluka khayra mā fī hādhihil-laylati wa khayra mā baʿdahā, wa aʿūdhu bika min sharri hādhihil-laylati wa sharri mā baʿdahā. Rabbi aʿūdhu bika minal-kasali wa sūʾil-kibar. Rabbi aʿūdhu bika min ʿadhābin fin-nār wa ʿadhābin fil-qabr.",
        translationKey: "athkar_evening_1",
        count: 1, takhrij: "عَشرَ مَرَّاتٍ: النسائي في عمل اليوم والليلة برقم 24 وانظر :صحيح الترغيب والترهيب 1/ 272، وتحفة الأخيار لابن باز ص 44 وانظر فضلها في ص 146، حديث رقم 255 أو مرة واحدة عند الكسل أبو داود 4/ 319 وابن ماجه وأحمد 4/ 60 وانظر :صحيح الترغيب والترهيب 1/ 270، صحيح أبو داود 3/ 957، وصحيح ابن ماجه 2/ 331 وزاد المعاد 2/ 377" });
      return;
    }

    let arabic = d.arabic;
    let translit = d.transliteration;
    let tKey = d.translationKey;

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
    icon: 'alarm',
    nameKey: 'athkar_cat_waking',
    adhkar: [
      {
        arabic: "الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ",
        transliteration: "Al-ḥamdu lillāhil-ladhī aḥyānā baʿda mā amātanā wa ilayhin-nushūr.",
        translationKey: "athkar_waking_1",
        count: 1, takhrij: "البخاري مع الفتح 11/ 113 ومسلم 4/ 2083" },
      {
        arabic: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، سُبْحَانَ اللَّهِ، وَالْحَمْدُ لِلَّهِ، وَلَا إِلَهَ إِلَّا اللَّهُ، وَاللَّهُ أَكْبَرُ، وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ الْعَلِيِّ الْعَظِيمِ",
        transliteration: "Lā ilāha illallāhu waḥdahu lā sharīka lah, lahul-mulku wa lahul-ḥamd, wa huwa ʿalā kulli shayʾin qadīr. Subḥānallāh, wal-ḥamdu lillāh, wa lā ilāha illallāh, wallāhu akbar, wa lā ḥawla wa lā quwwata illā billāhil-ʿaliyyil-ʿaẓīm.",
        translationKey: "athkar_waking_2",
        count: 1, takhrij: "البخاري مع الفتح 3/ 144 وغيرها واللفظ لابن ماجه انظر صحيح ابن ماجه 2/ 335" },
      {
        arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَ هَذَا الْيَوْمِ فَتْحَهُ وَنَصْرَهُ وَنُورَهُ وَبَرَكَتَهُ وَهُدَاهُ، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِيهِ وَشَرِّ مَا بَعْدَهُ",
        transliteration: "Allāhumma innī asʾaluka khayra hādhal-yawmi fatḥahu wa naṣrahu wa nūrahu wa barakatahu wa hudāh, wa aʿūdhu bika min sharri mā fīhi wa sharri mā baʿdah.",
        translationKey: "athkar_waking_3",
        count: 1, takhrij: "أبو داود 4/ 322 وحسن إسناده شعيب وعبد القادر الأرناؤوط في تحقيق زاد المعاد 2/ 273" },
    ],
  },
  {
    id: 'sleep',
    icon: 'sleep',
    nameKey: 'athkar_cat_sleep',
    adhkar: [
      {
        arabic: "قُلْ هُوَ اللَّهُ أَحَدٌ ۝ اللَّهُ الصَّمَدُ ۝ لَمْ يَلِدْ وَلَمْ يُولَدْ ۝ وَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ",
        transliteration: "Qul huwallāhu aḥad. Allāhuṣ-ṣamad. Lam yalid wa lam yūlad. Wa lam yakun lahu kufuwan aḥad.",
        translationKey: "athkar_sleep_ikhlas",
        count: 3, takhrij: "أبو داود 2/ 86 والنسائي 3/ 68 وانظر صحيح التّرمذي 2/ 8 والسور الثلاث يقال لها المعوذات وانظر فتح الباري 9/ 62" },
      {
        arabic: "قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ ۝ مِنْ شَرِّ مَا خَلَقَ ۝ وَمِنْ شَرِّ غَاسِقٍ إِذَا وَقَبَ ۝ وَمِنْ شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ ۝ وَمِنْ شَرِّ حَاسِدٍ إِذَا حَسَدَ",
        transliteration: "Qul aʿūdhu birabbil-falaq. Min sharri mā khalaq. Wa min sharri ghāsiqin idhā waqab. Wa min sharrin-naffāthāti fil-ʿuqad. Wa min sharri ḥāsidin idhā ḥasad.",
        translationKey: "athkar_sleep_falaq",
        count: 3, takhrij: "أبو داود 2/ 86 والنسائي 3/ 68 وانظر صحيح التّرمذي 2/ 8 والسور الثلاث يقال لها المعوذات وانظر فتح الباري 9/ 62" },
      {
        arabic: "قُلْ أَعُوذُ بِرَبِّ النَّاسِ ۝ مَلِكِ النَّاسِ ۝ إِلَهِ النَّاسِ ۝ مِنْ شَرِّ الْوَسْوَاسِ الْخَنَّاسِ ۝ الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ ۝ مِنَ الْجِنَّةِ وَالنَّاسِ",
        transliteration: "Qul aʿūdhu birabbin-nās. Malikin-nās. Ilāhin-nās. Min sharril-waswāsil-khannās. Alladhī yuwaswisu fī ṣudūrin-nās. Minal-jinnati wan-nās.",
        translationKey: "athkar_sleep_nas",
        count: 3, takhrij: "أبو داود 2/ 86 والنسائي 3/ 68 وانظر صحيح التّرمذي 2/ 8 والسور الثلاث يقال لها المعوذات وانظر فتح الباري 9/ 62" },
      {
        arabic: "اللَّهُ لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَنْ ذَا الَّذِي يَشْفَعُ عِنْدَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ",
        transliteration: "Allāhu lā ilāha illā huwal-ḥayyul-qayyūm. Lā taʾkhudhuhu sinatun wa lā nawm. Lahu mā fis-samāwāti wa mā fil-arḍ. Man dhalladhī yashfaʿu ʿindahu illā biʾidhnih. Yaʿlamu mā bayna aydīhim wa mā khalfahum wa lā yuḥīṭūna bishayʾin min ʿilmihi illā bimā shāʾ. Wasiʿa kursiyyuhus-samāwāti wal-arḍ, wa lā yaʾūduhu ḥifẓuhumā wa huwal-ʿaliyyul-ʿaẓīm.",
        translationKey: "athkar_sleep_kursi",
        count: 1, takhrij: "من قرأها دبر كل صلاة لم يمنعه من دخول الجنة إلا أن يموت . والنسائي في عمل اليوم والليلة برقم 100، وابن السني برقم 121 وصححه الجامع 5/ 339 وسلسلة الأحاديث الصحيحة 2/ 697 برقم 972" },
      {
        arabic: "آمَنَ الرَّسُولُ بِمَا أُنْزِلَ إِلَيْهِ مِنْ رَبِّهِ وَالْمُؤْمِنُونَ ۚ كُلٌّ آمَنَ بِاللَّهِ وَمَلَائِكَتِهِ وَكُتُبِهِ وَرُسُلِهِ لَا نُفَرِّقُ بَيْنَ أَحَدٍ مِنْ رُسُلِهِ ۚ وَقَالُوا سَمِعْنَا وَأَطَعْنَا ۖ غُفْرَانَكَ رَبَّنَا وَإِلَيْكَ الْمَصِيرُ ۝ لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا ۚ لَهَا مَا كَسَبَتْ وَعَلَيْهَا مَا اكْتَسَبَتْ ۗ رَبَّنَا لَا تُؤَاخِذْنَا إِنْ نَسِينَا أَوْ أَخْطَأْنَا ۚ رَبَّنَا وَلَا تَحْمِلْ عَلَيْنَا إِصْرًا كَمَا حَمَلْتَهُ عَلَى الَّذِينَ مِنْ قَبْلِنَا ۚ رَبَّنَا وَلَا تُحَمِّلْنَا مَا لَا طَاقَةَ لَنَا بِهِ ۖ وَاعْفُ عَنَّا وَاغْفِرْ لَنَا وَارْحَمْنَا ۚ أَنْتَ مَوْلَانَا فَانْصُرْنَا عَلَى الْقَوْمِ الْكَافِرِينَ",
        transliteration: "Āmanar-rasūlu bimā unzila ilayhi min rabbihi wal-muʾminūn. Kullun āmana billāhi wa malāʾikatihi wa kutubihi wa rusulihi lā nufarriqu bayna aḥadin min rusulih. Wa qālū samiʿnā wa aṭaʿnā, ghufrānaka rabbanā wa ilaykal-maṣīr. Lā yukallifullāhu nafsan illā wusʿahā, lahā mā kasabat wa ʿalayhā mak-tasabat. Rabbanā lā tuʾākhidhnā in nasīnā aw akhṭaʾnā. Rabbanā wa lā taḥmil ʿalaynā iṣran kamā ḥamaltahu ʿalal-ladhīna min qablinā. Rabbanā wa lā tuḥammilnā mā lā ṭāqata lanā bih. Waʿfu ʿannā, waghfir lanā, warḥamnā. Anta mawlānā fanṣurnā ʿalal-qawmil-kāfirīn.",
        translationKey: "athkar_sleep_baqarah",
        count: 1, takhrij: "من قرأهما في ليلة كفتاه، البخاري مع الفتح 9/ 94 ومسلم 1/ 554، والآيتان من سورة البقرة، 285 – 286" },
      {
        arabic: "سُبْحَانَ اللَّهِ",
        transliteration: "Subḥānallāh.",
        translationKey: "athkar_sleep_subhan",
        count: 33, takhrij: "من قال ذلك عندما يأوي إلى فراشه كان خيرًا له من خادم. البخاري مع الفتح 7/ 71 ومسلم 4/ 2091" },
      {
        arabic: "الْحَمْدُ لِلَّهِ",
        transliteration: "Al-ḥamdu lillāh.",
        translationKey: "athkar_sleep_hamd",
        count: 33, takhrij: "من قال ذلك عندما يأوي إلى فراشه كان خيرًا له من خادم. البخاري مع الفتح 7/ 71 ومسلم 4/ 2091" },
      {
        arabic: "اللَّهُ أَكْبَرُ",
        transliteration: "Allāhu akbar.",
        translationKey: "athkar_sleep_akbar",
        count: 34, takhrij: "من قال ذلك عندما يأوي إلى فراشه كان خيرًا له من خادم. البخاري مع الفتح 7/ 71 ومسلم 4/ 2091" },
      {
        arabic: "بِاسْمِكَ رَبِّي وَضَعْتُ جَنْبِي، وَبِكَ أَرْفَعُهُ، فَإِنْ أَمْسَكْتَ نَفْسِي فَارْحَمْهَا، وَإِنْ أَرْسَلْتَهَا فَاحْفَظْهَا بِمَا تَحْفَظُ بِهِ عِبَادَكَ الصَّالِحِينَ",
        transliteration: "Bismika rabbī waḍaʿtu janbī, wa bika arfaʿuh. Fa in amsakta nafsī farḥamhā, wa in arsaltahā faḥfaẓhā bimā taḥfaẓu bihi ʿibādakas-ṣāliḥīn.",
        translationKey: "athkar_sleep_janb",
        count: 1, takhrij: "إذا قام أحدكم من فراشه ثم رجع إليه فلينفض بصنفة إزاره ثلاث مرات وليسم الله فإنه لا يدري ماذا خلفه عليه بعده وإذا اضطجع فليقل ... (الحديث) البخاري 11/ 126. ومسلم 4/ 2084" },
      {
        arabic: "اللَّهُمَّ أَسْلَمْتُ نَفْسِي إِلَيْكَ، وَفَوَّضْتُ أَمْرِي إِلَيْكَ، وَوَجَّهْتُ وَجْهِي إِلَيْكَ، وَأَلْجَأْتُ ظَهْرِي إِلَيْكَ، رَغْبَةً وَرَهْبَةً إِلَيْكَ، لَا مَلْجَأَ وَلَا مَنْجَا مِنْكَ إِلَّا إِلَيْكَ، آمَنْتُ بِكِتَابِكَ الَّذِي أَنْزَلْتَ، وَبِنَبِيِّكَ الَّذِي أَرْسَلْتَ",
        transliteration: "Allāhumma aslamtu nafsī ilayk, wa fawwaḍtu amrī ilayk, wa wajjahtu wajhī ilayk, wa aljaʾtu ẓahrī ilayk, raghbatan wa rahbatan ilayk. Lā maljaʾa wa lā manjā minka illā ilayk. Āmantu bikitābikalladhī anzalt, wa binabiyyikalladhī arsalt.",
        translationKey: "athkar_sleep_aslamt",
        count: 1, takhrij: "إذا أخذت مضجعك فتوضأ وضوءك للصلاة ثم اضطجع على شقك الأيمن، وقل: ... (الحديث) قال صلى الله عليه وسلم لمن قال ذلك: فإن متَّ، متَّ على الفطرة البخاري مع الفتح 11/ 113 ومسلم 4/ 2081" },
      {
        arabic: "بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا",
        transliteration: "Bismika Allāhumma amūtu wa aḥyā.",
        translationKey: "athkar_sleep_bismika",
        count: 1, takhrij: "البخاري مع الفتح 11/ 113 ومسلم 4/ 2083" },
      {
        arabic: "اللَّهُمَّ قِنِي عَذَابَكَ يَوْمَ تَبْعَثُ عِبَادَكَ",
        transliteration: "Allāhumma qinī ʿadhābaka yawma tabʿathu ʿibādak.",
        translationKey: "athkar_sleep_qini",
        count: 3, takhrij: "كان رسول الله صلى الله عليه وسلم إذا أراد أن يرقد وضع يده اليمنى تحت خده ثم يقول ... (الحديث) أبو داود بلفظه 4/ 311 وانظر صحيح التّرمذي 3/ 143" },
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
        count: 1, takhrij: "مسلم 1/ 414" },
      {
        arabic: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، اللَّهُمَّ لَا مَانِعَ لِمَا أَعْطَيْتَ، وَلَا مُعْطِيَ لِمَا مَنَعْتَ، وَلَا يَنْفَعُ ذَا الْجَدِّ مِنْكَ الْجَدُّ",
        transliteration: "Lā ilāha illallāhu waḥdahu lā sharīka lah, lahul-mulku wa lahul-ḥamd, wa huwa ʿalā kulli shayʾin qadīr. Allāhumma lā māniʿa limā aʿṭayt, wa lā muʿṭiya limā manaʿt, wa lā yanfaʿu dhal-jaddi minkal-jadd.",
        translationKey: "athkar_afterprayer_3",
        count: 1, takhrij: "البخاري 1/ 255 ومسلم 1/ 414" },
      {
        arabic: "سُبْحَانَ اللَّهِ",
        transliteration: "Subḥānallāh.",
        translationKey: "athkar_afterprayer_4",
        count: 33, takhrij: "من قال ذلك عندما يأوي إلى فراشه كان خيرًا له من خادم. البخاري مع الفتح 7/ 71 ومسلم 4/ 2091" },
      {
        arabic: "الْحَمْدُ لِلَّهِ",
        transliteration: "Al-ḥamdu lillāh.",
        translationKey: "athkar_afterprayer_5",
        count: 33, takhrij: "من قال ذلك عندما يأوي إلى فراشه كان خيرًا له من خادم. البخاري مع الفتح 7/ 71 ومسلم 4/ 2091" },
      {
        arabic: "اللَّهُ أَكْبَرُ",
        transliteration: "Allāhu akbar.",
        translationKey: "athkar_afterprayer_6",
        count: 33, takhrij: "من قال ذلك عندما يأوي إلى فراشه كان خيرًا له من خادم. البخاري مع الفتح 7/ 71 ومسلم 4/ 2091" },
      {
        arabic: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ",
        transliteration: "Lā ilāha illallāhu waḥdahu lā sharīka lah, lahul-mulku wa lahul-ḥamd, wa huwa ʿalā kulli shayʾin qadīr.",
        translationKey: "athkar_afterprayer_7",
        count: 100,
        takhrij: "من قالها مائة مرة في يوم كانت له عدل عشر رقاب، وكتب له مائة حسنة، ومحيت عنه مائة سيئة، وكانت حرزًا من الشيطان يومه ذلك حتى يمسي، ولم يأت أحد بأفضل مما جاء به إلا أحد عمل أكثر من ذلك. البخاري 4/ 95، ومسلم 4/ 2071",
      },
      {
        arabic: "اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ",
        transliteration: "Allāhumma aʿinnī ʿalā dhikrika wa shukrika wa ḥusni ʿibādatik.",
        translationKey: "athkar_afterprayer_8",
        count: 1, takhrij: "أبو داود 2/ 86 والنسائي 3/ 53 وصححه الألباني في صحيح أبو داود 1/ 284" },
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
        count: 1, takhrij: "أبو داود وابن ماجه وأحمد وانظر إرواء الغليل 1/ 122" },
      {
        arabic: "أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ، اللَّهُمَّ اجْعَلْنِي مِنَ التَّوَّابِينَ وَاجْعَلْنِي مِنَ الْمُتَطَهِّرِينَ",
        transliteration: "Ashhadu an lā ilāha illallāhu waḥdahu lā sharīka lah, wa ashhadu anna Muḥammadan ʿabduhu wa rasūluh. Allāhummaj-ʿalnī minat-tawwābīna waj-ʿalnī minal-mutaṭahhirīn.",
        translationKey: "athkar_wudu_2",
        count: 1, takhrij: "رواه مسلم 1/ 209" },
      {
        arabic: "سُبْحَانَكَ اللَّهُمَّ وَبِحَمْدِكَ، أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا أَنْتَ، أَسْتَغْفِرُكَ وَأَتُوبُ إِلَيْكَ",
        transliteration: "Subḥānaka Allāhumma wa biḥamdik, ashhadu an lā ilāha illā ant, astaghfiruka wa atūbu ilayk.",
        translationKey: "athkar_wudu_3",
        count: 1, takhrij: "النسائي في عمل اليوم والليلة ص 173 وانظر إرواء الغليل 1/ 135 و 2/ 94" },
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
        count: 1, takhrij: "* رواه ابن السني برقم 88 وحسنه الألباني ** أبو داود 1/ 126 وانظر صحيح الجامع 1/ 528 *** رواه مسلم 1/ 494. وفي سنن ابن ماجه من حديث فاطمة رضي الله عنها (اللهم اغفر لي ذنوبي وافتح لي أبواب رحمتك) وصححه الألباني لشواهده، انظر صحيح ابن ماجه 1/ 128 - 129" },
      {
        arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ",
        transliteration: "Allāhumma innī asʾaluka min faḍlik.",
        translationKey: "athkar_mosque_2",
        count: 1, takhrij: "انظر تخريج روايات الحديث السابق رقم 20 وزيادة (اللهم اعصمني من الشيطان الرجيم) لابن ماجه. انظر صحيح ابن ماجه 1/ 129" },
      {
        arabic: "أَعُوذُ بِاللَّهِ الْعَظِيمِ، وَبِوَجْهِهِ الْكَرِيمِ، وَسُلْطَانِهِ الْقَدِيمِ، مِنَ الشَّيْطَانِ الرَّجِيمِ",
        transliteration: "Aʿūdhu billāhil-ʿaẓīm, wa biwajhihil-karīm, wa sulṭānihil-qadīm, minash-shayṭānir-rajīm.",
        translationKey: "athkar_mosque_3",
        count: 1, takhrij: "أبو داود وانظر صحيح الجامع برقم 4591" },
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
        count: 1, takhrij: "من قالها موقنًا بها حين يمسي فمات من ليلته دخل الجنة، وكذلك إذا أصبح أخرجه البخاري 7/ 150" },
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
        count: 100, takhrij: "البخاري مع الفتح 11/ 101، ومسلم 4/ 2075" },
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
        count: 1, takhrij: "أحمد 1/ 391 وصحّحه الألبانيّ" },
      {
        arabic: "اللَّهُمَّ رَحْمَتَكَ أَرْجُو، فَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ، وَأَصْلِحْ لِي شَأْنِي كُلَّهُ، لَا إِلَهَ إِلَّا أَنْتَ",
        transliteration: "Allāhumma raḥmataka arjū, fa lā takilnī ilā nafsī ṭarfata ʿayn, wa aṣliḥ lī shaʾnī kullahu, lā ilāha illā ant.",
        translationKey: "athkar_anxiety_2",
        count: 1, takhrij: "أبو داود 4/ 324 وأحمد 5/ 42 وحسّنه الألبانيّ في صحيح أبي داود 3/ 959" },
      {
        arabic: "لَا إِلَهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ",
        transliteration: "Lā ilāha illā anta subḥānaka innī kuntu minaẓ-ẓālimīn.",
        translationKey: "athkar_anxiety_3",
        count: 1, takhrij: "التّرمذي 5/ 529، والحاكم، وصحّحه ووافقه الذّهبيّ 1/ 505، وانظر صحيح التّرمذي 3/ 168" },
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
        count: 1, takhrij: "البخاري 7/ 154 ومسلم 4/ 2092" },
      {
        arabic: "اللَّهُ اللَّهُ رَبِّي لَا أُشْرِكُ بِهِ شَيْئًا",
        transliteration: "Allāhu Allāhu rabbī lā ushriku bihi shayʾā.",
        translationKey: "athkar_distress_2",
        count: 1,
        takhrij: "أخرجه أبو داود 2/ 87 وانظر صحيح ابن ماجة 2/ 335",
      },
      {
        arabic: "حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ",
        transliteration: "Ḥasbunallāhu wa niʿmal-wakīl.",
        translationKey: "athkar_distress_3",
        count: 1, takhrij: "البخاري 5/ 172" },
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
        count: 1, takhrij: "مسلم 2/ 998" },
      {
        arabic: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ وَعْثَاءِ السَّفَرِ، وَكَآبَةِ الْمَنْظَرِ، وَسُوءِ الْمُنْقَلَبِ فِي الْمَالِ وَالْأَهْلِ",
        transliteration: "Allāhumma innī aʿūdhu bika min waʿthāʾis-safar, wa kaʾābatil-manẓar, wa sūʾil-munqalabi fil-māli wal-ahl.",
        translationKey: "athkar_travel_2",
        count: 1, takhrij: "مسلم 2/ 998" },
    ],
  },
  {
    id: 'visiting_sick',
    icon: 'hand-heart-outline',
    nameKey: 'athkar_cat_visiting_sick',
    adhkar: [
      {
        arabic: "لَا بَأْسَ طَهُورٌ إِنْ شَاءَ اللَّهُ",
        transliteration: "Lā baʾsa ṭahūrun in shāʾallāh.",
        translationKey: "athkar_sick_1",
        count: 1, takhrij: "البخاري مع الفتح 10/ 118" },
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
        count: 7, takhrij: "ما من عبد مسلم يعود مريضا لم يحضر أجله فيقول سبع مرّات الحيدث إلّا عوفيَ. أخرجه التّرمذي وأبو داود وانظر صحيح التّرمذي 2/ 210 وصحيح الجامع 5/ 180" },
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
        count: 1, takhrij: "أبو داود 2/ 179، وأحمد 3/ 411 والبغوي في شرح السّنّة 7/ 128، وحسّنه الألباني في صحيح أبي داود 1/ 354، والآية من سورة البقرة: 201" },
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
        count: 1, takhrij: "أخرجه ابن السني في عمل اليوم والليلة برقم 54 وابن ماجه برقم 925 وحسن إسناده عبد القادر وشعيب الأرناؤوط في تحقيق زاد المعاد 2/ 375" },
      {
        arabic: "اللَّهُمَّ اكْفِنِي بِحَلَالِكَ عَنْ حَرَامِكَ، وَأَغْنِنِي بِفَضْلِكَ عَمَّنْ سِوَاكَ",
        transliteration: "Allāhummak-finī biḥalālika ʿan ḥarāmik, wa aghnini bifaḍlika ʿamman siwāk.",
        translationKey: "athkar_rizq_2",
        count: 1, takhrij: "التّرمذي 5/ 560 وانظر صحيح التّرمذي 3/ 180" },
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
        count: 1, takhrij: "البخاري 7/ 158، كان رسول اللّه صلّى اللّه عليه وسلّم يُكثِر من هذا الدّعاء. انظر البخاري مع الفتح 11/ 173" },
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
        count: 1, takhrij: "التّرمذي 5/ 560 وانظر صحيح التّرمذي 3/ 180" },
      {
        arabic: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْمَأْثَمِ وَالْمَغْرَمِ",
        transliteration: "Allāhumma innī aʿūdhu bika minal-maʾthami wal-maghram.",
        translationKey: "athkar_debt_2",
        count: 1, takhrij: "البخاري 1/ 202 ومسلم 1/ 412" },
      {
        arabic: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَالْعَجْزِ وَالْكَسَلِ، وَالْبُخْلِ وَالْجُبْنِ، وَضَلَعِ الدَّيْنِ وَغَلَبَةِ الرِّجَالِ",
        transliteration: "Allāhumma innī aʿūdhu bika minal-hammi wal-ḥazan, wal-ʿajzi wal-kasal, wal-bukhli wal-jubn, wa ḍalaʿid-dayni wa ghalabatir-rijāl.",
        translationKey: "athkar_debt_3",
        count: 1, takhrij: "البخاري 7/ 158، كان رسول اللّه صلّى اللّه عليه وسلّم يُكثِر من هذا الدّعاء. انظر البخاري مع الفتح 11/ 173" },
    ],
  },
  {
    id: 'ruqyah',
    icon: 'eye-off-outline',
    nameKey: 'athkar_cat_ruqyah',
    adhkar: [
      {
        arabic: "بِسْمِ اللَّهِ أَرْقِيكَ، مِنْ كُلِّ شَيْءٍ يُؤْذِيكَ، مِنْ شَرِّ كُلِّ نَفْسٍ أَوْ عَيْنِ حَاسِدٍ، اللَّهُ يَشْفِيكَ، بِسْمِ اللَّهِ أَرْقِيكَ",
        transliteration: "Bismillāhi arqīk, min kulli shayʾin yuʾdhīk, min sharri kulli nafsin aw ʿayni ḥāsid, Allāhu yashfīk, bismillāhi arqīk.",
        translationKey: "athkar_ruqyah_1",
        count: 3,
      },
      {
        arabic: "أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّةِ مِنْ كُلِّ شَيْطَانٍ وَهَامَّةٍ، وَمِنْ كُلِّ عَيْنٍ لَامَّةٍ",
        transliteration: "Aʿūdhu bikalimātillāhit-tāmmati min kulli shayṭānin wa hāmmah, wa min kulli ʿaynin lāmmah.",
        translationKey: "athkar_ruqyah_2",
        count: 3,
      },
      {
        arabic: "بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ",
        transliteration: "Bismillāhil-ladhī lā yaḍurru maʿasmihi shayʾun fil-arḍi wa lā fis-samāʾ, wa huwas-samīʿul-ʿalīm.",
        translationKey: "athkar_ruqyah_3",
        count: 3, takhrij: "من قالها ثلاثًا إذا أصبح وثلاثًا إذا أمسى لم يضره شيء أخرجه أبو داود 4/ 323 والتّرمذي 5/ 465 وابن ماجه وأحمد. انظر: صحيح ابن ماجه 2/ 332 وحسن إسناده العلامة ابن باز في تحفة الأخيار ص 39" },
      {
        arabic: "اللَّهُ لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ... (آية الكرسي كاملة)",
        transliteration: "Āyat al-Kursī — Al-Baqarah 2:255 (full verse)",
        translationKey: "athkar_ruqyah_4",
        count: 1,
      },
      {
        arabic: "قُلْ هُوَ اللَّهُ أَحَدٌ (سورة الإخلاص كاملة)",
        transliteration: "Sūrat al-Ikhlāṣ (complete)",
        translationKey: "athkar_ruqyah_5",
        count: 3,
      },
      {
        arabic: "قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ (سورة الفلق كاملة)",
        transliteration: "Sūrat al-Falaq (complete)",
        translationKey: "athkar_ruqyah_6",
        count: 3,
      },
      {
        arabic: "قُلْ أَعُوذُ بِرَبِّ النَّاسِ (سورة الناس كاملة)",
        transliteration: "Sūrat an-Nās (complete)",
        translationKey: "athkar_ruqyah_7",
        count: 3,
      },
    ],
  },
  {
    id: 'home',
    icon: 'home-outline',
    nameKey: 'athkar_cat_home',
    adhkar: [
      {
        arabic: "بِسْمِ اللَّهِ، تَوَكَّلْتُ عَلَى اللَّهِ، وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ",
        transliteration: "Bismillāh, tawakkaltu ʿalallāh, wa lā ḥawla wa lā quwwata illā billāh.",
        translationKey: "athkar_home_1",
        count: 1, takhrij: "أبو داود 4/ 325 والتّرمذي 5/ 490 وانظر صحيح التّرمذي 3/ 151" },
      {
        arabic: "بِسْمِ اللَّهِ وَلَجْنَا، وَبِسْمِ اللَّهِ خَرَجْنَا، وَعَلَى اللَّهِ رَبِّنَا تَوَكَّلْنَا",
        transliteration: "Bismillāhi walajanā, wa bismillāhi kharajnā, wa ʿalallāhi rabbanā tawakkalnā.",
        translationKey: "athkar_home_2",
        count: 1, takhrij: "أخرجه أبو داود 4/ 325، وحسن إسناده العلامة ابن باز في تحفة الأخيار ص 28، وفي الصحيح (إذا دخل الرجل بيته فذكر بيته فذكر الله عند دخوله وعند طعامه قال الشيطان لا مبيت لكم ولا عشاء) مسلم برقم 2018" },
      {
        arabic: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ أَنْ أَضِلَّ أَوْ أُضَلَّ، أَوْ أَزِلَّ أَوْ أُزَلَّ، أَوْ أَظْلِمَ أَوْ أُظْلَمَ، أَوْ أَجْهَلَ أَوْ يُجْهَلَ عَلَيَّ",
        transliteration: "Allāhumma innī aʿūdhu bika an aḍilla aw uḍall, aw azilla aw uzall, aw aẓlima aw uẓlam, aw ajhala aw yujhala ʿalayy.",
        translationKey: "athkar_home_3",
        count: 1, takhrij: "أهل السنن وانظر صحيح التّرمذي 3/ 152 وصحيح ابن ماجه 2/ 336" },
    ],
  },
  {
    id: 'friday',
    icon: 'calendar-star',
    nameKey: 'athkar_cat_friday',
    adhkar: [
      {
        arabic: "اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ، كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ، اللَّهُمَّ بَارِكْ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ، كَمَا بَارَكْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ",
        transliteration: "Allāhumma ṣalli ʿalā Muḥammadin wa ʿalā āli Muḥammad, kamā ṣallayta ʿalā Ibrāhīma wa ʿalā āli Ibrāhīm, innaka ḥamīdun majīd. Allāhumma bārik ʿalā Muḥammadin wa ʿalā āli Muḥammad, kamā bārakta ʿalā Ibrāhīma wa ʿalā āli Ibrāhīm, innaka ḥamīdun majīd.",
        translationKey: "athkar_friday_1",
        count: 1,
        takhrij: "البخاري مع الفتح 6/ 408",
      },
      {
        arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ بِأَنَّ لَكَ الْحَمْدَ، لَا إِلَهَ إِلَّا أَنْتَ، الْمَنَّانُ، بَدِيعُ السَّمَاوَاتِ وَالْأَرْضِ، يَا ذَا الْجَلَالِ وَالْإِكْرَامِ، يَا حَيُّ يَا قَيُّومُ، إِنِّي أَسْأَلُكَ الْجَنَّةَ وَأَعُوذُ بِكَ مِنَ النَّارِ",
        transliteration: "Allāhumma innī asʾaluka bi anna lakal-ḥamd, lā ilāha illā ant, al-mannān, badīʿas-samāwāti wal-arḍ, yā dhal-jalāli wal-ikrām, yā ḥayyu yā qayyūm, innī asʾalukal-jannata wa aʿūdhu bika minan-nār.",
        translationKey: "athkar_friday_2",
        count: 1, takhrij: "رواه أهل السنن وانظر صحيح ابن ماجه 2/ 329" },
      {
        arabic: "سُورَةُ الْكَهْفِ — يُستحب قراءتها كاملةً يوم الجمعة",
        transliteration: "Sūrat al-Kahf — Recommended to recite in full on Fridays",
        translationKey: "athkar_friday_3",
        count: 1,
      },
    ],
  },
  {
    id: 'parents',
    icon: 'account-heart-outline',
    nameKey: 'athkar_cat_parents',
    adhkar: [
      {
        arabic: "رَبِّ اغْفِرْ لِي وَلِوَالِدَيَّ وَلِمَنْ دَخَلَ بَيْتِيَ مُؤْمِنًا وَلِلْمُؤْمِنِينَ وَالْمُؤْمِنَاتِ",
        transliteration: "Rabbighfir lī wa liwālidayya wa liman dakhala baytiya muʾminan wa lil-muʾminīna wal-muʾmināt.",
        translationKey: "athkar_parents_1",
        count: 1,
      },
      {
        arabic: "رَبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا",
        transliteration: "Rabbir-ḥamhumā kamā rabbayānī ṣaghīrā.",
        translationKey: "athkar_parents_2",
        count: 1,
      },
      {
        arabic: "رَبَّنَا اغْفِرْ لِي وَلِوَالِدَيَّ وَلِلْمُؤْمِنِينَ يَوْمَ يَقُومُ الْحِسَابُ",
        transliteration: "Rabbanāghfir lī wa liwālidayya wa lil-muʾminīna yawma yaqūmul-ḥisāb.",
        translationKey: "athkar_parents_3",
        count: 1,
      },
      {
        arabic: "اللَّهُمَّ اغْفِرْ لِحَيِّنَا وَمَيِّتِنَا وَشَاهِدِنَا وَغَائِبِنَا وَصَغِيرِنَا وَكَبِيرِنَا وَذَكَرِنَا وَأُنْثَانَا",
        transliteration: "Allāhummagh-fir liḥayyinā wa mayyitinā wa shāhidinā wa ghāʾibinā wa ṣaghīrinā wa kabīrinā wa dhakarinā wa unthānā.",
        translationKey: "athkar_parents_4",
        count: 1, takhrij: "ابن ماجة 1/ 480 وأحمد 2/ 368 وانظر صحيح ابن ماجة 1/ 251" },
    ],
  },
  {
    id: 'faraj',
    icon: 'weather-sunny-alert',
    nameKey: 'athkar_cat_faraj',
    adhkar: [
      {
        arabic: "لَا إِلَهَ إِلَّا اللَّهُ الْعَظِيمُ الْحَلِيمُ، لَا إِلَهَ إِلَّا اللَّهُ رَبُّ الْعَرْشِ الْعَظِيمِ، لَا إِلَهَ إِلَّا اللَّهُ رَبُّ السَّمَاوَاتِ وَرَبُّ الْأَرْضِ وَرَبُّ الْعَرْشِ الْكَرِيمِ",
        transliteration: "Lā ilāha illallāhul-ʿaẓīmul-ḥalīm. Lā ilāha illallāhu rabbul-ʿarshil-ʿaẓīm. Lā ilāha illallāhu rabus-samāwāti wa rabbul-arḍi wa rabbul-ʿarshil-karīm.",
        translationKey: "athkar_faraj_1",
        count: 1, takhrij: "البخاري 7/ 154 ومسلم 4/ 2092" },
      {
        arabic: "لَا إِلَهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ",
        transliteration: "Lā ilāha illā anta subḥānaka innī kuntu minaẓ-ẓālimīn.",
        translationKey: "athkar_faraj_2",
        count: 1,
        takhrij: "التّرمذي 5/ 529، والحاكم، وصحّحه ووافقه الذّهبيّ 1/ 505، وانظر صحيح التّرمذي 3/ 168",
      },
      {
        arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ يَا اللَّهُ بِأَنَّكَ الْوَاحِدُ الْأَحَدُ الصَّمَدُ الَّذِي لَمْ يَلِدْ وَلَمْ يُولَدْ وَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ، أَنْ تَغْفِرَ لِي ذُنُوبِي إِنَّكَ أَنْتَ الْغَفُورُ الرَّحِيمُ",
        transliteration: "Allāhumma innī asʾaluka yā Allāhu bi annaka al-wāḥidul-aḥaduṣ-ṣamadulladhī lam yalid wa lam yūlad wa lam yakun lahu kufuwan aḥad, an taghfira lī dhunūbī innaka antal-ghafūrur-raḥīm.",
        translationKey: "athkar_faraj_3",
        count: 1, takhrij: "أخرجه النسائي بلفظه 3/ 52 وأحمد 4/ 338 وصححه الألباني في صحيح النسائي 1/ 280" },
      {
        arabic: "اللَّهُمَّ فَارِجَ الْهَمِّ، كَاشِفَ الْغَمِّ، مُجِيبَ دَعْوَةِ الْمُضْطَرِّينَ، رَحْمَانَ الدُّنْيَا وَالْآخِرَةِ وَرَحِيمَهُمَا، أَنْتَ تَرْحَمُنِي فَارْحَمْنِي رَحْمَةً تُغْنِينِي بِهَا عَنْ رَحْمَةِ مَنْ سِوَاكَ",
        transliteration: "Allāhumma fārijal-hamm, kāshifal-ghamm, mujība daʿwatil-muḍṭarrīn, raḥmānad-dunyā wal-ākhirati wa raḥīmahumā, anta tarḥamunī farḥamnī raḥmatan tughninī bihā ʿan raḥmati man siwāk.",
        translationKey: "athkar_faraj_4",
        count: 1,
      },
    ],
  },
  {
    id: 'calamity',
    icon: 'candle',
    nameKey: 'athkar_cat_calamity',
    adhkar: [
      {
        arabic: "إِنَّا لِلَّهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ، اللَّهُمَّ أْجُرْنِي فِي مُصِيبَتِي، وَأَخْلِفْ لِي خَيْرًا مِنْهَا",
        transliteration: "Innā lillāhi wa innā ilayhi rājiʿūn. Allāhumma ʾjurnī fī muṣībatī wa akhlif lī khayran minhā.",
        translationKey: "athkar_calamity_1",
        count: 1, takhrij: "مسلم 2/ 632" },
      {
        arabic: "إِنَّا لِلَّهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ",
        transliteration: "Innā lillāhi wa innā ilayhi rājiʿūn.",
        translationKey: "athkar_calamity_2",
        count: 1, takhrij: "مسلم 2/ 632" },
      {
        arabic: "اللَّهُمَّ اغْفِرْ لَهُ وَارْفَعْ دَرَجَتَهُ فِي الْمَهْدِيِّينَ، وَاخْلُفْهُ فِي عَقِبِهِ فِي الْغَابِرِينَ، وَاغْفِرْ لَنَا وَلَهُ يَا رَبَّ الْعَالَمِينَ، وَافْسَحْ لَهُ فِي قَبْرِهِ وَنَوِّرْ لَهُ فِيهِ",
        transliteration: "Allāhummagh-fir lahu warfaʿ darajatahu fil-mahdiyyīn, wakhlufhu fī ʿaqibihi fil-ghābirīn, waghfir lanā wa lahu yā rabbal-ʿālamīn, wafsaḥ lahu fī qabrihi wa nawwir lahu fīh.",
        translationKey: "athkar_calamity_3",
        count: 1, takhrij: "مسلم 2/ 634" },
      {
        arabic: "اللَّهُمَّ اغْفِرْ لِحَيِّنَا وَمَيِّتِنَا وَشَاهِدِنَا وَغَائِبِنَا وَصَغِيرِنَا وَكَبِيرِنَا وَذَكَرِنَا وَأُنْثَانَا، اللَّهُمَّ مَنْ أَحْيَيْتَهُ مِنَّا فَأَحْيِهِ عَلَى الْإِسْلَامِ، وَمَنْ تَوَفَّيْتَهُ مِنَّا فَتَوَفَّهُ عَلَى الْإِيمَانِ",
        transliteration: "Allāhummagh-fir liḥayyinā wa mayyitinā wa shāhidinā wa ghāʾibinā wa ṣaghīrinā wa kabīrinā wa dhakarinā wa unthānā. Allāhumma man aḥyaytahu minnā fa aḥyihi ʿalal-islām, wa man tawaffaytahu minnā fa tawaffahu ʿalal-īmān.",
        translationKey: "athkar_calamity_4",
        count: 1, takhrij: "ابن ماجة 1/ 480 وأحمد 2/ 368 وانظر صحيح ابن ماجة 1/ 251" },
    ],
  },
  {
    id: 'bathroom',
    icon: 'door-closed-outline',
    nameKey: 'athkar_cat_bathroom',
    adhkar: [
      {
        arabic: "بِسْمِ اللَّهِ، اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْخُبُثِ وَالْخَبَائِثِ",
        transliteration: "Bismillāh. Allāhumma innī aʿūdhu bika minal-khubuthi wal-khabāʾith.",
        translationKey: "athkar_bathroom_1",
        count: 1, takhrij: "أخرجه البخاري 1/ 45 ومسلم 1/ 283 وزيادة (بسم الله) في أوله، أخرجها سعيد بن منصور، أنظر فتح الباري 1/ 244" },
      {
        arabic: "غُفْرَانَكَ",
        transliteration: "Ghufrānak.",
        translationKey: "athkar_bathroom_2",
        count: 1, takhrij: "أخرجه أصحاب السنن إلا النسائي، أخرجه في عمل اليوم والليلة انظر تخريج زاد المعاد 2/ 387" },
    ],
  },
  {
    id: 'fear',
    icon: 'shield-sun-outline',
    nameKey: 'athkar_cat_fear',
    adhkar: [
      {
        arabic: "أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ غَضَبِهِ وَعِقَابِهِ، وَشَرِّ عِبَادِهِ، وَمِنْ هَمَزَاتِ الشَّيَاطِينِ وَأَنْ يَحْضُرُونِ",
        transliteration: "Aʿūdhu bikalimātillāhit-tāmmāti min ghaḍabihi wa ʿiqābih, wa sharri ʿibādih, wa min hamazātish-shayāṭīni wa an yaḥḍurūn.",
        translationKey: "athkar_fear_1",
        count: 1, takhrij: "أبو داود 4/ 12 وانظر صحيح التّرمذي 3/ 171" },
      {
        arabic: "لَا إِلَهَ إِلَّا اللَّهُ",
        transliteration: "Lā ilāha illallāh.",
        translationKey: "athkar_fear_2",
        count: 1, takhrij: "البخاري مع الفتح 6/ 181، ومسلم 4/ 2208" },
      {
        arabic: "أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ",
        transliteration: "Aʿūdhu billāhi minash-shayṭānir-rajīm.",
        translationKey: "athkar_fear_3",
        count: 1, takhrij: "البخاري 7/ 99 ومسلم 4/ 2015" },
    ],
  },
  {
    id: 'hajah',
    icon: 'hand-extended-outline',
    nameKey: 'athkar_cat_hajah',
    adhkar: [
      {
        arabic: "لَا إِلَهَ إِلَّا اللَّهُ الْحَلِيمُ الْكَرِيمُ، سُبْحَانَ اللَّهِ رَبِّ الْعَرْشِ الْعَظِيمِ، الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ، أَسْأَلُكَ مُوجِبَاتِ رَحْمَتِكَ، وَعَزَائِمَ مَغْفِرَتِكَ، وَالْغَنِيمَةَ مِنْ كُلِّ بِرٍّ، وَالسَّلَامَةَ مِنْ كُلِّ إِثْمٍ، لَا تَدَعْ لِي ذَنْبًا إِلَّا غَفَرْتَهُ، وَلَا هَمًّا إِلَّا فَرَّجْتَهُ، وَلَا حَاجَةً هِيَ لَكَ رِضًا إِلَّا قَضَيْتَهَا يَا أَرْحَمَ الرَّاحِمِينَ",
        transliteration: "Lā ilāha illallāhul-ḥalīmul-karīm. Subḥānallāhi rabbil-ʿarshil-ʿaẓīm. Al-ḥamdu lillāhi rabbil-ʿālamīn. Asʾaluka mūjibāti raḥmatik, wa ʿazāʾima maghfiratik, wal-ghanīmata min kulli birr, was-salāmata min kulli ithm. Lā tadaʿ lī dhanban illā ghafartah, wa lā hamman illā farrajtah, wa lā ḥājatan hiya laka riḍan illā qaḍaytahā yā arḥamar-rāḥimīn.",
        translationKey: "athkar_hajah_1",
        count: 1,
      },
      {
        arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ وَأَتَوَجَّهُ إِلَيْكَ بِنَبِيِّكَ مُحَمَّدٍ نَبِيِّ الرَّحْمَةِ، يَا مُحَمَّدُ إِنِّي تَوَجَّهْتُ بِكَ إِلَى رَبِّي فِي حَاجَتِي هَذِهِ لِتُقْضَى، اللَّهُمَّ فَشَفِّعْهُ فِيَّ",
        transliteration: "Allāhumma innī asʾaluka wa atawajjahu ilayka binabiyyika Muḥammadin nabiyyir-raḥmah. Yā Muḥammadu innī tawajjahtu bika ilā rabbī fī ḥājatī hādhihi litūqḍā. Allāhumma fashaffiʿhu fiyy.",
        translationKey: "athkar_hajah_2",
        count: 1,
      },
    ],
  },
  {
    id: 'clothing',
    icon: 'tshirt-crew-outline',
    nameKey: 'athkar_cat_clothing',
    adhkar: [
      {
        arabic: "الْحَمْدُ لِلَّهِ الَّذِي كَسَانِي هَذَا وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ",
        transliteration: "Al-ḥamdu lillāhil-ladhī kasānī hādhā wa razaqanīhi min ghayri ḥawlin minnī wa lā quwwah.",
        translationKey: "athkar_clothing_1",
        count: 1, takhrij: "أخرجه أهل السنن إلا النسائي انظر إرواء الغليل 7/ 47" },
      {
        arabic: "اللَّهُمَّ لَكَ الْحَمْدُ أَنْتَ كَسَوْتَنِيهِ، أَسْأَلُكَ مِنْ خَيْرِهِ وَخَيْرِ مَا صُنِعَ لَهُ، وَأَعُوذُ بِكَ مِنْ شَرِّهِ وَشَرِّ مَا صُنِعَ لَهُ",
        transliteration: "Allāhumma lakal-ḥamdu anta kasawtanīhi, asʾaluka min khayrihi wa khayri mā ṣuniʿa lah, wa aʿūdhu bika min sharrihi wa sharri mā ṣuniʿa lah.",
        translationKey: "athkar_clothing_2",
        count: 1, takhrij: "أبو داود والتّرمذي والبغوي وانظر مختصر شمائل التّرمذي للألباني ص 47" },
    ],
  },
  {
    id: 'market',
    icon: 'store-outline',
    nameKey: 'athkar_cat_market',
    adhkar: [
      {
        arabic: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ يُحْيِي وَيُمِيتُ وَهُوَ حَيٌّ لَا يَمُوتُ، بِيَدِهِ الْخَيْرُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ",
        transliteration: "Lā ilāha illallāhu waḥdahu lā sharīka lah, lahul-mulku wa lahul-ḥamdu yuḥyī wa yumītu wa huwa ḥayyun lā yamūt, biyadihil-khayru wa huwa ʿalā kulli shayʾin qadīr.",
        translationKey: "athkar_market_1",
        count: 1, takhrij: "التّرمذي 5/ 491 والحاكم 1/ 538 وحسّنه الألباني في صحيح ابن ماجة 2/ 21 وفي صحيح التّرمذي 3/ 152" },
    ],
  },
  {
    id: 'anger',
    icon: 'emoticon-angry-outline',
    nameKey: 'athkar_cat_anger',
    adhkar: [
      {
        arabic: "أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ",
        transliteration: "Aʿūdhu billāhi minash-shayṭānir-rajīm.",
        translationKey: "athkar_anger_1",
        count: 1, takhrij: "البخاري 7/ 99 ومسلم 4/ 2015" },
    ],
  },
  {
    id: 'kaffarah',
    icon: 'refresh-circle-outline',
    nameKey: 'athkar_cat_kaffarah',
    adhkar: [
      {
        arabic: "سُبْحَانَكَ اللَّهُمَّ وَبِحَمْدِكَ، أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا أَنْتَ، أَسْتَغْفِرُكَ وَأَتُوبُ إِلَيْكَ",
        transliteration: "Subḥānaka Allāhumma wa biḥamdik, ashhadu an lā ilāha illā ant, astaghfiruka wa atūbu ilayk.",
        translationKey: "athkar_kaffarah_1",
        count: 1, takhrij: "النسائي في عمل اليوم والليلة ص 173 وانظر إرواء الغليل 1/ 135 و 2/ 94" },
    ],
  },
  {
    id: 'leaving_home',
    icon: 'home-export-outline',
    nameKey: 'athkar_cat_leaving_home',
    adhkar: [
      {
        arabic: "بِسْمِ اللَّهِ، تَوَكَّلْتُ عَلَى اللَّهِ، وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ",
        transliteration: "Bismillāh, tawakkaltu ʿalallāh, wa lā ḥawla wa lā quwwata illā billāh.",
        translationKey: "athkar_leaving_home_1",
        count: 1, takhrij: "أبو داود 4/ 325 والتّرمذي 5/ 490 وانظر صحيح التّرمذي 3/ 151" },
      {
        arabic: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ أَنْ أَضِلَّ أَوْ أُضَلَّ، أَوْ أَزِلَّ أَوْ أُزَلَّ، أَوْ أَظْلِمَ أَوْ أُظْلَمَ، أَوْ أَجْهَلَ أَوْ يُجْهَلَ عَلَيَّ",
        transliteration: "Allāhumma innī aʿūdhu bika an aḍilla aw uḍall, aw azilla aw uzall, aw aẓlima aw uẓlam, aw ajhala aw yujhala ʿalayy.",
        translationKey: "athkar_leaving_home_2",
        count: 1, takhrij: "أهل السنن وانظر صحيح التّرمذي 3/ 152 وصحيح ابن ماجه 2/ 336" },
    ],
  },
  {
    id: 'entering_home',
    icon: 'home-import-outline',
    nameKey: 'athkar_cat_entering_home',
    adhkar: [
      {
        arabic: "بِسْمِ اللَّهِ وَلَجْنَا، وَبِسْمِ اللَّهِ خَرَجْنَا، وَعَلَى اللَّهِ رَبِّنَا تَوَكَّلْنَا",
        transliteration: "Bismillāhi walajanā, wa bismillāhi kharajnā, wa ʿalallāhi rabbanā tawakkalnā.",
        translationKey: "athkar_entering_home_1",
        count: 1, takhrij: "أخرجه أبو داود 4/ 325، وحسن إسناده العلامة ابن باز في تحفة الأخيار ص 28، وفي الصحيح (إذا دخل الرجل بيته فذكر بيته فذكر الله عند دخوله وعند طعامه قال الشيطان لا مبيت لكم ولا عشاء) مسلم برقم 2018" },
    ],
  },
  {
    id: 'mosque',
    icon: 'door-open',
    nameKey: 'athkar_cat_mosque',
    adhkar: [
      {
        arabic: "أَعُوذُ بِاللَّهِ الْعَظِيمِ، وَبِوَجْهِهِ الْكَرِيمِ، وَسُلْطَانِهِ الْقَدِيمِ، مِنَ الشَّيْطَانِ الرَّجِيمِ",
        transliteration: "Aʿūdhu billāhil-ʿaẓīm, wa biwajhihil-karīm, wa sulṭānihil-qadīm, minash-shayṭānir-rajīm.",
        translationKey: "athkar_mosque_1",
        count: 1, takhrij: "أبو داود وانظر صحيح الجامع برقم 4591" },
      {
        arabic: "بِسْمِ اللَّهِ، وَالصَّلَاةُ وَالسَّلَامُ عَلَى رَسُولِ اللَّهِ، اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ",
        transliteration: "Bismillāh, waṣ-ṣalātu was-salāmu ʿalā rasūlillāh. Allāhummaf-taḥ lī abwāba raḥmatik.",
        translationKey: "athkar_mosque_2",
        count: 1, takhrij: "* رواه ابن السني برقم 88 وحسنه الألباني ** أبو داود 1/ 126 وانظر صحيح الجامع 1/ 528 *** رواه مسلم 1/ 494. وفي سنن ابن ماجه من حديث فاطمة رضي الله عنها (اللهم اغفر لي ذنوبي وافتح لي أبواب رحمتك) وصححه الألباني لشواهده، انظر صحيح ابن ماجه 1/ 128 - 129" },
      {
        arabic: "بِسْمِ اللَّهِ، وَالصَّلَاةُ وَالسَّلَامُ عَلَى رَسُولِ اللَّهِ، اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ",
        transliteration: "Bismillāh, waṣ-ṣalātu was-salāmu ʿalā rasūlillāh. Allāhumma innī asʾaluka min faḍlik.",
        translationKey: "athkar_mosque_3",
        count: 1, takhrij: "انظر تخريج روايات الحديث السابق رقم 20 وزيادة (اللهم اعصمني من الشيطان الرجيم) لابن ماجه. انظر صحيح ابن ماجه 1/ 129" },
    ],
  },
  {
    id: 'adhan_response',
    icon: 'bullhorn-outline',
    nameKey: 'athkar_cat_adhan_response',
    adhkar: [
      {
        arabic: "لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ",
        transliteration: "Lā ḥawla wa lā quwwata illā billāh.",
        translationKey: "athkar_adhan_1",
        count: 1, takhrij: "البخاري 1/ 152 ومسلم 1/ 288" },
      {
        arabic: "اللَّهُمَّ رَبَّ هَذِهِ الدَّعْوَةِ التَّامَّةِ، وَالصَّلَاةِ الْقَائِمَةِ، آتِ مُحَمَّدًا الْوَسِيلَةَ وَالْفَضِيلَةَ، وَابْعَثْهُ مَقَامًا مَحْمُودًا الَّذِي وَعَدْتَهُ",
        transliteration: "Allāhumma rabba hādhihid-daʿwatit-tāmmah, waṣ-ṣalātil-qāʾimah, āti Muḥammadanil-wasīlata wal-faḍīlah, wabʿath-hu maqāman maḥmūdanil-ladhī waʿadtah.",
        translationKey: "athkar_adhan_2",
        count: 1, takhrij: "البخاري 1/ 152 وما بين المعكوفين للبيهقي 1/ 410 وحسن إسناده العلامة عبد العزيز بن باز في تحفة الأخيار ص 38" },
      {
        arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ بِحَقِّ هَذِهِ الدَّعْوَةِ التَّامَّةِ... [اذكر حاجتك]",
        transliteration: "Allāhumma innī asʾaluka biḥaqqi hādhihid-daʿwatit-tāmmah... [mention your need]",
        translationKey: "athkar_adhan_3",
        count: 1,
      },
    ],
  },
  {
    id: 'food',
    icon: 'food-outline',
    nameKey: 'athkar_cat_food',
    adhkar: [
      {
        arabic: "بِسْمِ اللَّهِ",
        transliteration: "Bismillāh.",
        translationKey: "athkar_food_1",
        count: 1, takhrij: "التّرمذي 2/ 505 وغيره وانظر الإرواء برقم 49 صحيح الجامع 3/ 203" },
      {
        arabic: "بِسْمِ اللَّهِ فِي أَوَّلِهِ وَآخِرِهِ",
        transliteration: "Bismillāhi fī awwalihi wa ākhirih.",
        translationKey: "athkar_food_2",
        count: 1, takhrij: "أخرجه أبو داود 3/ 347 والتّرمذي 4/ 288 وانظر صحيح التّرمذي 2/ 167" },
      {
        arabic: "الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنِي هَذَا وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ",
        transliteration: "Al-ḥamdu lillāhil-ladhī aṭʿamanī hādhā wa razaqanīhi min ghayri ḥawlin minnī wa lā quwwah.",
        translationKey: "athkar_food_3",
        count: 1, takhrij: "أخرجه أصحاب السّنن إلّا النّسائي، وانظر صحيح التّرمذي 3/ 159" },
      {
        arabic: "اللَّهُمَّ أَطْعِمْ مَنْ أَطْعَمَنِي، وَاسْقِ مَنْ سَقَانِي",
        transliteration: "Allāhumma aṭʿim man aṭʿamanī, wasqi man saqānī.",
        translationKey: "athkar_food_4",
        count: 1, takhrij: "مسلم 3/ 126" },
    ],
  },
  {
    id: 'iftar',
    icon: 'weather-sunset',
    nameKey: 'athkar_cat_iftar',
    adhkar: [
      {
        arabic: "ذَهَبَ الظَّمَأُ وَابْتَلَّتِ الْعُرُوقُ وَثَبَتَ الأَجْرُ إِنْ شَاءَ اللَّهُ",
        transliteration: "Dhahabath-ẓamaʾu wabtallatil-ʿurūqu wa thabatal-ajru in shāʾallāh.",
        translationKey: "athkar_iftar_1",
        count: 1, takhrij: "أخرجه أبو داود 2/ 306 وغيره، وانظر صحيح الجامع 4/ 209" },
      {
        arabic: "اللَّهُمَّ لَكَ صُمْتُ وَعَلَى رِزْقِكَ أَفْطَرْتُ",
        transliteration: "Allāhumma laka ṣumtu wa ʿalā rizqika afṭart.",
        translationKey: "athkar_iftar_2",
        count: 1,
      },
    ],
  },
  {
    id: 'qunut',
    icon: 'hands-pray',
    nameKey: 'athkar_cat_qunut',
    adhkar: [
      {
        arabic: "اللَّهُمَّ اهْدِنِي فِيمَنْ هَدَيْتَ، وَعَافِنِي فِيمَنْ عَافَيْتَ، وَتَوَلَّنِي فِيمَنْ تَوَلَّيْتَ، وَبَارِكْ لِي فِيمَا أَعْطَيْتَ، وَقِنِي شَرَّ مَا قَضَيْتَ، فَإِنَّكَ تَقْضِي وَلَا يُقْضَى عَلَيْكَ، وَإِنَّهُ لَا يَذِلُّ مَنْ وَالَيْتَ، وَلَا يَعِزُّ مَنْ عَادَيْتَ، تَبَارَكْتَ رَبَّنَا وَتَعَالَيْتَ",
        transliteration: "Allāhummah-dinī fīman hadayt, wa ʿāfinī fīman ʿāfayt, wa tawallanī fīman tawallayt, wa bārik lī fīmā aʿṭayt, wa qinī sharra mā qaḍayt, fa innaka taqḍī wa lā yuqḍā ʿalayk, wa innahu lā yadhillu man wālayt, wa lā yaʿizzu man ʿādayt, tabārakta rabbanā wa taʿālayt.",
        translationKey: "athkar_qunut_1",
        count: 1, takhrij: "أخرجه أصحاب السّنن الأربعة، وأحمد والدّارمي والحاكم والبيهقيّ، ومابين المعكوفين للبيهقي، وانظر صحيح التّرمذي 1/ 144 وصحيح ابن ماجة 1/ 194 وإرواء الغليل للألباني 2/ 172" },
    ],
  },
  {
    id: 'death',
    icon: 'grave-stone',
    nameKey: 'athkar_cat_death',
    adhkar: [
      {
        arabic: "اللَّهُمَّ اغْفِرْ لِـ[فلان] وَارْفَعْ دَرَجَتَهُ فِي الْمَهْدِيِّينَ، وَاخْلُفْهُ فِي عَقِبِهِ فِي الْغَابِرِينَ، وَاغْفِرْ لَنَا وَلَهُ يَا رَبَّ الْعَالَمِينَ، وَافْسَحْ لَهُ فِي قَبْرِهِ وَنَوِّرْ لَهُ فِيهِ",
        transliteration: "Allāhummagh-fir li-[name] warfaʿ darajatahu fil-mahdiyyīn, wakhlufhu fī ʿaqibihi fil-ghābirīn, waghfir lanā wa lahu yā rabbal-ʿālamīn, wafsaḥ lahu fī qabrihi wa nawwir lahu fīh.",
        translationKey: "athkar_death_1",
        count: 1, takhrij: "مسلم 2/ 634" },
      {
        arabic: "إِنَّا لِلَّهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ، اللَّهُمَّ أْجُرْنِي فِي مُصِيبَتِي وَأَخْلِفْ لِي خَيْرًا مِنْهَا",
        transliteration: "Innā lillāhi wa innā ilayhi rājiʿūn. Allāhumma ʾjurnī fī muṣībatī wa akhlif lī khayran minhā.",
        translationKey: "athkar_death_2",
        count: 1, takhrij: "مسلم 2/ 632" },
    ],
  },
  {
    id: 'janazah',
    icon: 'candle',
    nameKey: 'athkar_cat_janazah',
    adhkar: [
      {
        arabic: "اللَّهُمَّ اغْفِرْ لَهُ وَارْحَمْهُ وَعَافِهِ وَاعْفُ عَنْهُ، وَأَكْرِمْ نُزُلَهُ، وَوَسِّعْ مُدْخَلَهُ، وَاغْسِلْهُ بِالْمَاءِ وَالثَّلْجِ وَالْبَرَدِ، وَنَقِّهِ مِنَ الْخَطَايَا كَمَا نَقَّيْتَ الثَّوْبَ الْأَبْيَضَ مِنَ الدَّنَسِ، وَأَبْدِلْهُ دَارًا خَيْرًا مِنْ دَارِهِ، وَأَهْلًا خَيْرًا مِنْ أَهْلِهِ، وَزَوْجًا خَيْرًا مِنْ زَوْجِهِ، وَأَدْخِلْهُ الْجَنَّةَ وَأَعِذْهُ مِنْ عَذَابِ الْقَبْرِ وَعَذَابِ النَّارِ",
        transliteration: "Allāhummagh-fir lahu warḥamhu wa ʿāfihi waʿfu ʿanh, wa akrim nuzulah, wa wassiʿ mudkhalah, waghsilhu bil-māʾi with-thalji wal-barad, wa naqqihi minal-khaṭāyā kamā naqqayta ath-thawbal-abyaḍa minad-danas, wa abdilhu dāran khayran min dārih, wa ahlan khayran min ahlih, wa zawjan khayran min zawjih, wa adkhilhul-jannata wa aʿidh-hu min ʿadhābil-qabri wa ʿadhābin-nār.",
        translationKey: "athkar_janazah_1",
        count: 1, takhrij: "مسلم 2/ 663" },
    ],
  },
  {
    id: 'graves',
    icon: 'flower-outline',
    nameKey: 'athkar_cat_graves',
    adhkar: [
      {
        arabic: "السَّلَامُ عَلَيْكُمْ أَهْلَ الدِّيَارِ مِنَ الْمُؤْمِنِينَ وَالْمُسْلِمِينَ، وَإِنَّا إِنْ شَاءَ اللَّهُ بِكُمْ لَاحِقُونَ، نَسْأَلُ اللَّهَ لَنَا وَلَكُمُ الْعَافِيَةَ",
        transliteration: "As-salāmu ʿalaykum ahlad-diyāri minal-muʾminīna wal-muslimīn, wa innā in shāʾallāhu bikum lāḥiqūn, nasʾalullāha lanā wa lakumul-ʿāfiyah.",
        translationKey: "athkar_graves_1",
        count: 1, takhrij: "مسلم 2/ 671، وابن ماجة، واللفظ له 1/ 494 عن بريدة رضي اللّه عنه، وما بين المعكوفين من حديث عائشة رضي اللّه عنها عند مسلم 2/ 671" },
    ],
  },
  {
    id: 'wedding',
    icon: 'ring',
    nameKey: 'athkar_cat_wedding',
    adhkar: [
      {
        arabic: "بَارَكَ اللَّهُ لَكَ، وَبَارَكَ عَلَيْكَ، وَجَمَعَ بَيْنَكُمَا فِي خَيْرٍ",
        transliteration: "Bārakallāhu lak, wa bāraka ʿalayk, wa jamaʿa baynakumā fī khayr.",
        translationKey: "athkar_wedding_1",
        count: 1, takhrij: "أخرجه أصحاب السّنن إلّا النّسائي وانظر صحيح التّرمذي 1/ 316" },
      {
        arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَهَا وَخَيْرَ مَا جَبَلْتَهَا عَلَيْهِ، وَأَعُوذُ بِكَ مِنْ شَرِّهَا وَمِنْ شَرِّ مَا جَبَلْتَهَا عَلَيْهِ",
        transliteration: "Allāhumma innī asʾaluka khayrahā wa khayra mā jabaltahā ʿalayh, wa aʿūdhu bika min sharrihā wa min sharri mā jabaltahā ʿalayh.",
        translationKey: "athkar_wedding_2",
        count: 1,
      },
    ],
  },
  {
    id: 'return_travel',
    icon: 'airplane-landing',
    nameKey: 'athkar_cat_return_travel',
    adhkar: [
      {
        arabic: "آيِبُونَ تَائِبُونَ عَابِدُونَ لِرَبِّنَا حَامِدُونَ",
        transliteration: "Āʾibūna tāʾibūna ʿābidūna lirabbanā ḥāmidūn.",
        translationKey: "athkar_return_travel_1",
        count: 1, takhrij: "كان النّبيّ صلّى اللّه عليه وسلّم يقوله إذا قفل من غزو أو حجّ، البخاري 7/ 163 ومسلم 2/ 980" },
      {
        arabic: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، آيِبُونَ تَائِبُونَ عَابِدُونَ لِرَبِّنَا حَامِدُونَ، صَدَقَ اللَّهُ وَعْدَهُ وَنَصَرَ عَبْدَهُ وَهَزَمَ الْأَحْزَابَ وَحْدَهُ",
        transliteration: "Lā ilāha illallāhu waḥdahu lā sharīka lah, lahul-mulku wa lahul-ḥamd, wa huwa ʿalā kulli shayʾin qadīr. Āʾibūna tāʾibūna ʿābidūna lirabbanā ḥāmidūn. Ṣadaqallāhu waʿdahu wa naṣara ʿabdahu wa hazamal-aḥzāba waḥdah.",
        translationKey: "athkar_return_travel_2",
        count: 3, takhrij: "كان النّبيّ صلّى اللّه عليه وسلّم يقوله إذا قفل من غزو أو حجّ، البخاري 7/ 163 ومسلم 2/ 980" },
    ],
  },
  {
    id: 'waswas',
    icon: 'brain',
    nameKey: 'athkar_cat_waswas',
    adhkar: [
      {
        arabic: "آمَنْتُ بِاللَّهِ وَرُسُلِهِ",
        transliteration: "Āmantu billāhi wa rusulih.",
        translationKey: "athkar_waswas_1",
        count: 1,
      },
      {
        arabic: "أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ",
        transliteration: "Aʿūdhu billāhi minash-shayṭānir-rajīm.",
        translationKey: "athkar_waswas_2",
        count: 1, takhrij: "البخاري 7/ 99 ومسلم 4/ 2015" },
      {
        arabic: "هُوَ الْأَوَّلُ وَالْآخِرُ وَالظَّاهِرُ وَالْبَاطِنُ وَهُوَ بِكُلِّ شَيْءٍ عَلِيمٌ",
        transliteration: "Huwal-awwalu wal-ākhiru waẓ-ẓāhiru wal-bāṭinu wa huwa bikulli shayʾin ʿalīm.",
        translationKey: "athkar_waswas_3",
        count: 1, takhrij: "سورة الحديد، الآية: 3. أبو داود 4/ 329 وحسّنه الألبانيّ في صحيح أبي داود 3/ 962" },
    ],
  },
  {
    id: 'salawat',
    icon: 'star-crescent',
    nameKey: 'athkar_cat_salawat',
    adhkar: [
      {
        arabic: "اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ، كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ، اللَّهُمَّ بَارِكْ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ، كَمَا بَارَكْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ",
        transliteration: "Allāhumma ṣalli ʿalā Muḥammadin wa ʿalā āli Muḥammad, kamā ṣallayta ʿalā Ibrāhīma wa ʿalā āli Ibrāhīm, innaka ḥamīdun majīd. Allāhumma bārik ʿalā Muḥammadin wa ʿalā āli Muḥammad, kamā bārakta ʿalā Ibrāhīma wa ʿalā āli Ibrāhīm, innaka ḥamīdun majīd.",
        translationKey: "athkar_salawat_1",
        count: 1,
        takhrij: "البخاري مع الفتح 6/ 408",
      },
      {
        arabic: "اللَّهُمَّ صَلِّ وَسَلِّمْ وَبَارِكْ عَلَى نَبِيِّنَا مُحَمَّدٍ",
        transliteration: "Allāhumma ṣalli wa sallim wa bārik ʿalā nabiyyinā Muḥammad.",
        translationKey: "athkar_salawat_2",
        count: 100, takhrij: "من صلى علي حين يُصبح عشرًا، وحين يُمسي عشرًا أدركتهُ شفاعتي يوم القيامة أخرجه الطبراني بإسنادين أحدهما جيد، انظر: الزوائد 10/ 120 وصحيح الترغيب والترهيب 1/ 273" },
    ],
  },
  {
    id: 'fitnah',
    icon: 'alert-circle-outline',
    nameKey: 'athkar_cat_fitnah',
    adhkar: [
      {
        arabic: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْفِتَنِ مَا ظَهَرَ مِنْهَا وَمَا بَطَنَ",
        transliteration: "Allāhumma innī aʿūdhu bika minal-fitani mā ẓahara minhā wa mā baṭan.",
        translationKey: "athkar_fitnah_1",
        count: 1,
      },
      {
        arabic: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ شَرِّ فِتْنَةِ الْغِنَى وَأَعُوذُ بِكَ مِنْ شَرِّ فِتْنَةِ الْفَقْرِ",
        transliteration: "Allāhumma innī aʿūdhu bika min sharri fitnatil-ghinā wa aʿūdhu bika min sharri fitnatil-faqr.",
        translationKey: "athkar_fitnah_2",
        count: 1,
      },
      {
        arabic: "اللَّهُمَّ احْفَظْنِي مِنْ بَيْنِ يَدَيَّ، وَمِنْ خَلْفِي، وَعَنْ يَمِينِي، وَعَنْ شِمَالِي، وَمِنْ فَوْقِي، وَأَعُوذُ بِعَظَمَتِكَ أَنْ أُغْتَالَ مِنْ تَحْتِي",
        transliteration: "Allāhummah-ẓurnī min bayni yadayya, wa min khalfī, wa ʿan yamīnī, wa ʿan shimālī, wa min fawqī, wa aʿūdhu biʿaẓamatika an ughṭāla min taḥtī.",
        translationKey: "athkar_fitnah_3",
        count: 1, takhrij: "أبو داود وابن ماجه وانظر صحيح ابن ماجه 2/ 332" },
    ],
  },
  {
    id: 'oppressed',
    icon: 'scale-balance',
    nameKey: 'athkar_cat_oppressed',
    adhkar: [
      {
        arabic: "اللَّهُمَّ إِنِّي أَشْكُو إِلَيْكَ ضَعْفَ قُوَّتِي، وَقِلَّةَ حِيلَتِي، وَهَوَانِي عَلَى النَّاسِ، أَنْتَ رَبُّ الْمُسْتَضْعَفِينَ وَأَنْتَ رَبِّي",
        transliteration: "Allāhumma innī ashkū ilayka ḍaʿfa quwwatī, wa qillata ḥīlatī, wa hawānī ʿalan-nās. Anta rabbul-mustaḍʿafīna wa anta rabbī.",
        translationKey: "athkar_oppressed_1",
        count: 1,
      },
      {
        arabic: "حَسْبِيَ اللَّهُ لَا إِلَهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ",
        transliteration: "Ḥasbiyallāhu lā ilāha illā huwa, ʿalayhi tawakkaltu wa huwa rabbul-ʿarshil-ʿaẓīm.",
        translationKey: "athkar_oppressed_2",
        count: 7, takhrij: "من قالها حين يصبح ويمسي سبع مرات كفاه الله ما أهمه من أمر الدنيا والآخرة. أخرجه ابن السني برقم 71 مرفوعًا وأبو موقوف 4/ 321، وصحح إسناده شعيب وعبد القادر الأرناؤوط. انظر زاد المعاد 2/ 376" },
    ],
  },
  {
    id: 'new_moon',
    icon: 'moon-waning-crescent',
    nameKey: 'athkar_cat_new_moon',
    adhkar: [
      {
        arabic: "اللَّهُ أَكْبَرُ، اللَّهُمَّ أَهِلَّهُ عَلَيْنَا بِالْأَمْنِ وَالْإِيمَانِ، وَالسَّلَامَةِ وَالْإِسْلَامِ، وَالتَّوْفِيقِ لِمَا تُحِبُّ وَتَرْضَى، رَبُّنَا وَرَبُّكَ اللَّهُ",
        transliteration: "Allāhu akbar. Allāhumma ahillahu ʿalaynā bil-amni wal-īmān, was-salāmati wal-islām, wat-tawfīqi limā tuḥibbu wa tarḍā, rabbunā wa rabbukallāh.",
        translationKey: "athkar_new_moon_1",
        count: 1, takhrij: "التّرمذي 5/ 504 والدّارمي بلفظه 1/ 336 وانظر صحيح التّرمذي 3/ 157" },
    ],
  },
  {
    id: 'gathering',
    icon: 'account-group-outline',
    nameKey: 'athkar_cat_gathering',
    adhkar: [
      {
        arabic: "سُبْحَانَكَ اللَّهُمَّ وَبِحَمْدِكَ، أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا أَنْتَ، أَسْتَغْفِرُكَ وَأَتُوبُ إِلَيْكَ",
        transliteration: "Subḥānaka Allāhumma wa biḥamdik, ashhadu an lā ilāha illā ant, astaghfiruka wa atūbu ilayk.",
        translationKey: "athkar_gathering_1",
        count: 1, takhrij: "أخرجه أصحاب السّنن وانظر صحيح التّرمذي 3/ 153، وقد ثبت أنّ عائشة رضي اللّه عنها قالت: ما جلس رسول اللّه صلّى اللّه عليه وسلّم مجلسا، ولا تلى قرآنا، ولا صلّى صلاة إلّا ختم ذلك بكلمات: '...'، أخرجه النّسائي في عمل اليوم واللّيلة برقم 308، وأحمد 6/ 77 وصحّحه الدّكتور فاروق حمادة في تحقيقه لعمل اليوم واللّيلة للنّسائي ص 273" },
    ],
  },
  {
    id: 'rain',
    icon: 'weather-rainy',
    nameKey: 'athkar_cat_rain',
    adhkar: [
      {
        arabic: "سُبْحَانَ الَّذِي يُسَبِّحُ الرَّعْدُ بِحَمْدِهِ وَالْمَلَائِكَةُ مِنْ خِيفَتِهِ",
        transliteration: "Subḥānal-ladhī yusabbiḥur-raʿdu biḥamdihī wal-malāʾikatu min khīfatih.",
        translationKey: "athkar_rain_1",
        count: 1, takhrij: "كان عبداللّه بن الزّبير رضي اللّه عنهما إذا سَمِعَ الرّعد ترك الحديث وقال: '...'، الموطّأ 2/ 992 وقال الألبانيّ: صحيح الإسناد موقوفا" },
      {
        arabic: "اللَّهُمَّ صَيِّبًا نَافِعًا",
        transliteration: "Allāhumma ṣayyiban nāfiʿā.",
        translationKey: "athkar_rain_2",
        count: 1, takhrij: "البخاري مع الفتح 2/ 518" },
      {
        arabic: "مُطِرْنَا بِفَضْلِ اللَّهِ وَرَحْمَتِهِ",
        transliteration: "Muṭirnā bifaḍlillāhi wa raḥmatih.",
        translationKey: "athkar_rain_3",
        count: 1, takhrij: "البخاري 1/ 205 ومسلم 1/ 83" },
      {
        arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَهَا وَخَيْرَ مَا فِيهَا وَخَيْرَ مَا أُرْسِلَتْ بِهِ، وَأَعُوذُ بِكَ مِنْ شَرِّهَا وَشَرِّ مَا فِيهَا وَشَرِّ مَا أُرْسِلَتْ بِهِ",
        transliteration: "Allāhumma innī asʾaluka khayrahā wa khayra mā fīhā wa khayra mā ursilat bih, wa aʿūdhu bika min sharrihā wa sharri mā fīhā wa sharri mā ursilat bih.",
        translationKey: "athkar_rain_4",
        count: 1, takhrij: "مسلم 2/ 616 والبخاري 4/ 76" },
    ],
  },
  {
    id: 'quran_khatm',
    icon: 'book-check-outline',
    nameKey: 'athkar_cat_quran_khatm',
    adhkar: [
      {
        arabic: "سُبْحَانَكَ اللَّهُمَّ وَبِحَمْدِكَ، لَا إِلَهَ إِلَّا أَنْتَ، أَسْتَغْفِرُكَ وَأَتُوبُ إِلَيْكَ",
        transliteration: "Subḥānaka Allāhumma wa biḥamdik, lā ilāha illā ant, astaghfiruka wa atūbu ilayk.",
        translationKey: "athkar_quran_khatm_1",
        count: 1, takhrij: "النسائي في عمل اليوم والليلة ص 173 وانظر إرواء الغليل 1/ 135 و 2/ 94" },
      {
        arabic: "اللَّهُمَّ ارْحَمْنِي بِالْقُرْآنِ، وَاجْعَلْهُ لِي إِمَامًا وَنُورًا وَهُدًى وَرَحْمَةً، اللَّهُمَّ ذَكِّرْنِي مِنْهُ مَا نَسِيتُ، وَعَلِّمْنِي مِنْهُ مَا جَهِلْتُ، وَارْزُقْنِي تِلَاوَتَهُ آنَاءَ اللَّيْلِ وَأَطْرَافَ النَّهَارِ، وَاجْعَلْهُ لِي حُجَّةً يَا رَبَّ الْعَالَمِينَ",
        transliteration: "Allāhummār-ḥamnī bil-Qurʾān, wajʿalhu lī imāman wa nūran wa hudan wa raḥmah. Allāhumma dhakkirnī minhu mā nasīt, wa ʿallimnī minhu mā jahilt, warzuqnī tilāwatahu ānāʾal-layli wa aṭrāfan-nahār, wajʿalhu lī ḥujjatan yā rabbal-ʿālamīn.",
        translationKey: "athkar_quran_khatm_2",
        count: 1,
      },
      {
        arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ بِكُلِّ اسْمٍ هُوَ لَكَ سَمَّيْتَ بِهِ نَفْسَكَ، أَوْ عَلَّمْتَهُ أَحَدًا مِنْ خَلْقِكَ، أَوْ أَنْزَلْتَهُ فِي كِتَابِكَ، أَوِ اسْتَأْثَرْتَ بِهِ فِي عِلْمِ الْغَيْبِ عِنْدَكَ، أَنْ تَجْعَلَ الْقُرْآنَ رَبِيعَ قَلْبِي، وَنُورَ صَدْرِي، وَجَلَاءَ حُزْنِي، وَذَهَابَ هَمِّي",
        transliteration: "Allāhumma innī asʾaluka bikulli ismin huwa lak, sammayta bihi nafsak, aw ʿallamtahu aḥadan min khalqik, aw anzaltahu fī kitābik, aw istaʾtharta bihi fī ʿilmil-ghaybi ʿindak, an tajʿalal-Qurʾāna rabīʿa qalbī, wa nūra ṣadrī, wa jalāʾa ḥuznī, wa dhahāba hammī.",
        translationKey: "athkar_quran_khatm_3",
        count: 1, takhrij: "أحمد 1/ 391 وصحّحه الألبانيّ" },
      {
        arabic: "اللَّهُمَّ اجْعَلْنَا مِنْ أَهْلِ الْقُرْآنِ الَّذِينَ هُمْ أَهْلُ اللَّهِ وَخَاصَّتُهُ",
        transliteration: "Allāhummaj-ʿalnā min ahlil-Qurʾānil-ladhīna hum ahlullāhi wa khāṣṣatuh.",
        translationKey: "athkar_quran_khatm_4",
        count: 1,
      },
      {
        arabic: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ",
        transliteration: "Rabbanā ātinā fid-dunyā ḥasanatan wa fil-ākhirati ḥasanatan wa qinā ʿadhāban-nār.",
        translationKey: "athkar_quran_khatm_5",
        count: 1, takhrij: "أبو داود 2/ 179، وأحمد 3/ 411 والبغوي في شرح السّنّة 7/ 128، وحسّنه الألباني في صحيح أبي داود 1/ 354، والآية من سورة البقرة: 201" },
    ],
  },
  {
    id: 'laylatul_qadr',
    icon: 'star-shooting-outline',
    nameKey: 'athkar_cat_laylatul_qadr',
    adhkar: [
      {
        arabic: "اللَّهُمَّ إِنَّكَ عَفُوٌّ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي",
        transliteration: "Allāhumma innaka ʿafuwwun tuḥibbul-ʿafwa faʿfu ʿannī.",
        translationKey: "athkar_laylatul_qadr_1",
        count: 1,
      },
      {
        arabic: "اللَّهُمَّ إِنَّكَ عَفُوٌّ كَرِيمٌ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي",
        transliteration: "Allāhumma innaka ʿafuwwun karīmun tuḥibbul-ʿafwa faʿfu ʿannī.",
        translationKey: "athkar_laylatul_qadr_2",
        count: 1,
      },
      {
        arabic: "إِنَّا أَنْزَلْنَاهُ فِي لَيْلَةِ الْقَدْرِ ۝ وَمَا أَدْرَاكَ مَا لَيْلَةُ الْقَدْرِ ۝ لَيْلَةُ الْقَدْرِ خَيْرٌ مِنْ أَلْفِ شَهْرٍ ۝ تَنَزَّلُ الْمَلَائِكَةُ وَالرُّوحُ فِيهَا بِإِذْنِ رَبِّهِمْ مِنْ كُلِّ أَمْرٍ ۝ سَلَامٌ هِيَ حَتَّى مَطْلَعِ الْفَجْرِ",
        transliteration: "Innā anzalnāhu fī laylatal-qadr. Wa mā adrāka mā laylatul-qadr. Laylatul-qadri khayrun min alfi shahr. Tanazzalul-malāʾikatu war-rūḥu fīhā biʾidhni rabbihim min kulli amr. Salāmun hiya ḥattā maṭlaʿil-fajr.",
        translationKey: "athkar_laylatul_qadr_3",
        count: 1,
      },
      {
        arabic: "يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ، أَصْلِحْ لِي شَأْنِي كُلَّهُ، وَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ",
        transliteration: "Yā ḥayyu yā qayyūmu biraḥmatika astaghīth, aṣliḥ lī shaʾnī kullahu wa lā takilnī ilā nafsī ṭarfata ʿayn.",
        translationKey: "athkar_laylatul_qadr_4",
        count: 1, takhrij: "الحاكم وصححه ووافقه الذهبي 1/ 545 وانظر صحيح الترغيب والترهيب 1/ 273" },
      {
        arabic: "أَسْتَغْفِرُ اللَّهَ الَّذِي لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ وَأَتُوبُ إِلَيْهِ",
        transliteration: "Astaghfirullāhal-ladhī lā ilāha illā huwal-ḥayyul-qayyūmu wa atūbu ilayh.",
        translationKey: "athkar_laylatul_qadr_5",
        count: 100,
      },
      {
        arabic: "اللَّهُمَّ إِنَّكَ قُلْتَ فِي كِتَابِكَ الْمُنَزَّلِ لَيْلَةُ الْقَدْرِ خَيْرٌ مِنْ أَلْفِ شَهْرٍ، وَقَدْ مَضَتِ الْآلَافُ مِنَ الشُّهُورِ وَلَمْ أَغْتَنِمْ مِنْهَا لَيْلَةَ الْقَدْرِ، فَاللَّهُمَّ إِنَّكَ عَفُوٌّ كَرِيمٌ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي، وَاجْعَلِ الْقُرْآنَ رَبِيعَ قَلْبِي وَنُورَ صَدْرِي وَجِلَاءَ حُزْنِي وَذَهَابَ هَمِّي",
        transliteration: "Allāhumma innaka qulta fī kitābikal-munazzali laylatul-qadri khayrun min alfi shahr, wa qad maḍatil-ālāfu minash-shuhūri wa lam aghtanim minhā laylatal-qadr. Fallāhumma innaka ʿafuwwun karīmun tuḥibbul-ʿafwa faʿfu ʿannī, wajʿalil-Qurʾāna rabīʿa qalbī wa nūra ṣadrī wa jalāʾa ḥuznī wa dhahāba hammī.",
        translationKey: "athkar_laylatul_qadr_6",
        count: 1,
      },
      {
        arabic: "اللَّهُمَّ اجْعَلْنِي مِمَّنْ يُحْيِي هَذِهِ اللَّيْلَةَ وَيَغْتَنِمُهَا، وَاقْبَلْ تَوْبَتِي وَاغْفِرْ ذُنُوبِي، وَأَعِنِّي عَلَى طَاعَتِكَ وَعِبَادَتِكَ، وَلَا تَحْرِمْنِي خَيْرَهَا وَبَرَكَتَهَا يَا أَرْحَمَ الرَّاحِمِينَ",
        transliteration: "Allāhummaj-ʿalnī mimman yuḥyī hādhihil-laylata wa yaghtanimuhā, waqbal tawbatī waghfir dhunūbī, wa aʿinnī ʿalā ṭāʿatika wa ʿibādatik, wa lā taḥrimnī khayrahā wa barakatahā yā arḥamar-rāḥimīn.",
        translationKey: "athkar_laylatul_qadr_7",
        count: 1,
      },
    ],
  },
  {
    id: 'arafah',
    icon: 'white-balance-sunny',
    nameKey: 'athkar_cat_arafah',
    adhkar: [
      {
        arabic: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ",
        transliteration: "Lā ilāha illallāhu waḥdahu lā sharīka lah, lahul-mulku wa lahul-ḥamd, wa huwa ʿalā kulli shayʾin qadīr.",
        translationKey: "athkar_arafah_1",
        count: 100,
        takhrij: "من قالها مائة مرة في يوم كانت له عدل عشر رقاب، وكتب له مائة حسنة، ومحيت عنه مائة سيئة، وكانت حرزًا من الشيطان يومه ذلك حتى يمسي، ولم يأت أحد بأفضل مما جاء به إلا أحد عمل أكثر من ذلك. البخاري 4/ 95، ومسلم 4/ 2071",
      },
      {
        arabic: "اللَّهُمَّ لَكَ الْحَمْدُ كَالَّذِي تَقُولُ وَخَيْرًا مِمَّا نَقُولُ، اللَّهُمَّ لَكَ صَلَاتِي وَنُسُكِي وَمَحْيَايَ وَمَمَاتِي وَإِلَيْكَ مَآبِي، وَلَكَ رَبِّ تُرَاثِي، اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ عَذَابِ الْقَبْرِ وَوَسْوَسَةِ الصَّدْرِ وَشَتَاتِ الْأَمْرِ",
        transliteration: "Allāhumma lakal-ḥamdu kalladhī taqūlu wa khayran mimmā naqūl. Allāhumma laka ṣalātī wa nusukī wa maḥyāya wa mamātī wa ilayka maʾābī wa laka rabbī turāthī. Allāhumma innī aʿūdhu bika min ʿadhābil-qabri wa waswasatiṣ-ṣadri wa shatātil-amr.",
        translationKey: "athkar_arafah_2",
        count: 1,
      },
    ],
  },
  {
    id: 'fasting',
    icon: 'moon-waning-crescent',
    nameKey: 'athkar_cat_fasting',
    adhkar: [
      {
        arabic: "إِنِّي صَائِمٌ، إِنِّي صَائِمٌ",
        transliteration: "Innī ṣāʾim, innī ṣāʾim.",
        translationKey: "athkar_fasting_1",
        count: 1, takhrij: "البخاري مع الفتح 4/ 103، ومسلم 2/ 806" },
      {
        arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ بِرَحْمَتِكَ الَّتِي وَسِعَتْ كُلَّ شَيْءٍ أَنْ تَغْفِرَ لِي",
        transliteration: "Allāhumma innī asʾaluka biraḥmatikallatī wasiʿat kulla shayʾin an taghfira lī.",
        translationKey: "athkar_fasting_2",
        count: 1, takhrij: "أخرجه ابن ماجة 1/ 557 من دعاء عبد اللّه بن عمرو رضي اللّه عنهما، وحسّنه الحافظ في تخريج الأذكار انظر شرح الأذكار 4/ 342" },
    ],
  },
  {
    id: 'newborn',
    icon: 'baby-outline',
    nameKey: 'athkar_cat_newborn',
    adhkar: [
      {
        arabic: "أَذَانُ الصَّلَاةِ فِي أُذُنِ الْمَوْلُودِ الْيُمْنَى",
        transliteration: "Adhānus-ṣalāti fī udhunilmawlūdil-yumnā.",
        translationKey: "athkar_newborn_1",
        count: 1,
      },
      {
        arabic: "أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّةِ مِنْ كُلِّ شَيْطَانٍ وَهَامَّةٍ، وَمِنْ كُلِّ عَيْنٍ لَامَّةٍ",
        transliteration: "Aʿūdhu bikalimātillāhit-tāmmati min kulli shayṭānin wa hāmmah, wa min kulli ʿaynin lāmmah.",
        translationKey: "athkar_newborn_2",
        count: 1,
      },
      {
        arabic: "بَارَكَ اللَّهُ لَكَ فِي الْمَوْهُوبِ لَكَ، وَشَكَرْتَ الْوَاهِبَ، وَبَلَغَ أَشُدَّهُ، وَرُزِقْتَ بِرَّهُ",
        transliteration: "Bārakallāhu laka fil-mawhūbi lak, wa shakarta al-wāhib, wa balagha ashuddah, wa ruziqta birrah.",
        translationKey: "athkar_newborn_3",
        count: 1, takhrij: "انظر الأذكار للنّووي ص 349 وصحيح الأذكار للنّووي لسليم الهلالي 2/ 713" },
    ],
  },
  {
    id: 'children_protection',
    icon: 'shield-account-outline',
    nameKey: 'athkar_cat_children_protection',
    adhkar: [
      {
        arabic: "أُعِيذُكُمَا بِكَلِمَاتِ اللَّهِ التَّامَّةِ، مِنْ كُلِّ شَيْطَانٍ وَهَامَّةٍ، وَمِنْ كُلِّ عَيْنٍ لَامَّةٍ",
        transliteration: "Uʿīdhukumā bikalimātillāhit-tāmmah, min kulli shayṭānin wa hāmmah, wa min kulli ʿaynin lāmmah.",
        translationKey: "athkar_children_1",
        count: 1, takhrij: "البخاري 4/ 119 من حديث ابن عبّاس رضي اللّه عنهما" },
    ],
  },
  {
    id: 'condolences',
    icon: 'hand-heart-outline',
    nameKey: 'athkar_cat_condolences',
    adhkar: [
      {
        arabic: "إِنَّ لِلَّهِ مَا أَخَذَ، وَلَهُ مَا أَعْطَى، وَكُلُّ شَيْءٍ عِنْدَهُ بِأَجَلٍ مُسَمًّى، فَلْتَصْبِرْ وَلْتَحْتَسِبْ",
        transliteration: "Inna lillāhi mā akhadha, wa lahu mā aʿṭā, wa kullu shayʾin ʿindahu biajalin musammā, faltaṣbir waltaḥtasib.",
        translationKey: "athkar_condolences_1",
        count: 1, takhrij: "البخاري 2/ 80 ومسلم 2/ 636" },
      {
        arabic: "أَعْظَمَ اللَّهُ أَجْرَكَ، وَأَحْسَنَ عَزَاءَكَ، وَغَفَرَ لِمَيِّتِكَ",
        transliteration: "Aʿẓamallāhu ajrak, wa aḥsana ʿazāʾak, wa ghafara limayyitak.",
        translationKey: "athkar_condolences_2",
        count: 1, takhrij: "الأذكار للنّووي ص 126" },
    ],
  },
  {
    id: 'going_prayer',
    icon: 'walk',
    nameKey: 'athkar_cat_going_prayer',
    adhkar: [
      {
        arabic: "اللَّهُمَّ اجْعَلْ فِي قَلْبِي نُورًا، وَفِي لِسَانِي نُورًا، وَاجْعَلْ فِي سَمْعِي نُورًا، وَاجْعَلْ فِي بَصَرِي نُورًا، وَاجْعَلْ مِنْ خَلْفِي نُورًا، وَمِنْ أَمَامِي نُورًا، وَاجْعَلْ مِنْ فَوْقِي نُورًا، وَمِنْ تَحْتِي نُورًا، اللَّهُمَّ أَعْطِنِي نُورًا",
        transliteration: "Allāhummaj-ʿal fī qalbī nūrā, wa fī lisānī nūrā, waj-ʿal fī samʿī nūrā, waj-ʿal fī baṣarī nūrā, waj-ʿal min khalfī nūrā, wa min amāmī nūrā, waj-ʿal min fawqī nūrā, wa min taḥtī nūrā, Allāhumma aʿṭinī nūrā.",
        translationKey: "athkar_going_prayer_1",
        count: 1,
      },
    ],
  },
  {
    id: 'after_tashahhud',
    icon: 'hands-pray',
    nameKey: 'athkar_cat_after_tashahhud',
    adhkar: [
      {
        arabic: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ عَذَابِ جَهَنَّمَ، وَمِنْ عَذَابِ الْقَبْرِ، وَمِنْ فِتْنَةِ الْمَحْيَا وَالْمَمَاتِ، وَمِنْ شَرِّ فِتْنَةِ الْمَسِيحِ الدَّجَّالِ",
        transliteration: "Allāhumma innī aʿūdhu bika min ʿadhābi jahannam, wa min ʿadhābil-qabr, wa min fitnatil-maḥyā wal-mamāt, wa min sharri fitnatil-masīḥid-dajjāl.",
        translationKey: "athkar_after_tashahhud_1",
        count: 1, takhrij: "البخاري 2/ 102 ومسلم 1/ 412 واللفظ لمسلم" },
      {
        arabic: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْمَأْثَمِ وَالْمَغْرَمِ",
        transliteration: "Allāhumma innī aʿūdhu bika minal-maʾthami wal-maghram.",
        translationKey: "athkar_after_tashahhud_2",
        count: 1, takhrij: "البخاري 1/ 202 ومسلم 1/ 412" },
      {
        arabic: "اللَّهُمَّ إِنِّي ظَلَمْتُ نَفْسِي ظُلْمًا كَثِيرًا، وَلَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ، فَاغْفِرْ لِي مَغْفِرَةً مِنْ عِنْدِكَ، وَارْحَمْنِي، إِنَّكَ أَنْتَ الْغَفُورُ الرَّحِيمُ",
        transliteration: "Allāhumma innī ẓalamtu nafsī ẓulman kathīrā, wa lā yaghfirudh-dhunūba illā ant, faghfir lī maghfiratan min ʿindik, warḥamnī, innaka antal-ghafūrur-raḥīm.",
        translationKey: "athkar_after_tashahhud_3",
        count: 1, takhrij: "البخاري 8/ 168 ومسلم 4/ 2078" },
    ],
  },
  {
    id: 'entering_town',
    icon: 'city-variant-outline',
    nameKey: 'athkar_cat_entering_town',
    adhkar: [
      {
        arabic: "اللَّهُمَّ رَبَّ السَّمَاوَاتِ السَّبْعِ وَمَا أَظْلَلْنَ، وَرَبَّ الْأَرَضِينَ السَّبْعِ وَمَا أَقْلَلْنَ، وَرَبَّ الشَّيَاطِينِ وَمَا أَضْلَلْنَ، وَرَبَّ الرِّيَاحِ وَمَا ذَرَيْنَ، أَسْأَلُكَ خَيْرَ هَذِهِ الْقَرْيَةِ وَخَيْرَ أَهْلِهَا وَخَيْرَ مَا فِيهَا، وَأَعُوذُ بِكَ مِنْ شَرِّهَا وَشَرِّ أَهْلِهَا وَشَرِّ مَا فِيهَا",
        transliteration: "Allāhumma rabbas-samāwātis-sabʿi wa mā aẓlalna, wa rabbal-araḍīnas-sabʿi wa mā aqllna, wa rabbash-shayāṭīni wa mā aḍllna, wa rabbar-riyāḥi wa mā dharayn. Asʾaluka khayra hādhihil-qaryati wa khayra ahlihā wa khayra mā fīhā, wa aʿūdhu bika min sharrihā wa sharri ahlihā wa sharri mā fīhā.",
        translationKey: "athkar_entering_town_1",
        count: 1, takhrij: "الحاكم وصحّحه ووافقه الذّهبي 2/ 100 وابن السّني برقم 524 وحسّنه الحافظ في تخريج الأذكار 5/ 154، قال ابن باز: ورواه النّسائي بإسناد حسن. انظر تحفة الأخيار ص 37" },
    ],
  },
  {
    id: 'fear_people',
    icon: 'account-alert-outline',
    nameKey: 'athkar_cat_fear_people',
    adhkar: [
      {
        arabic: "اللَّهُمَّ إِنَّا نَجْعَلُكَ فِي نُحُورِهِمْ، وَنَعُوذُ بِكَ مِنْ شُرُورِهِمْ",
        transliteration: "Allāhumma innā najʿaluka fī nuḥūrihim, wa naʿūdhu bika min shurūrihim.",
        translationKey: "athkar_fear_people_1",
        count: 1, takhrij: "أبو داود 2/ 89، وصحّحه الحاكم ووافقه الذّهبيّ 2/ 142" },
      {
        arabic: "حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ",
        transliteration: "Ḥasbunallāhu wa niʿmal-wakīl.",
        translationKey: "athkar_fear_people_2",
        count: 1, takhrij: "البخاري 5/ 172" },
    ],
  },
  {
    id: 'dying',
    icon: 'candle',
    nameKey: 'athkar_cat_dying',
    adhkar: [
      {
        arabic: "لَا إِلَهَ إِلَّا اللَّهُ",
        transliteration: "Lā ilāha illallāh.",
        translationKey: "athkar_dying_1",
        count: 1, takhrij: "البخاري مع الفتح 6/ 181، ومسلم 4/ 2208" },
      {
        arabic: "اللَّهُمَّ اغْفِرْ لِي وَارْحَمْنِي وَأَلْحِقْنِي بِالرَّفِيقِ الْأَعْلَى",
        transliteration: "Allāhummagh-fir lī warḥamnī wa alḥiqnī bir-rafīqil-aʿlā.",
        translationKey: "athkar_dying_2",
        count: 1, takhrij: "البخاري 7/ 10 ومسلم 4/ 1893" },
      {
        arabic: "بِسْمِ اللَّهِ وَعَلَى مِلَّةِ رَسُولِ اللَّهِ",
        transliteration: "Bismillāhi wa ʿalā millati rasūlillāh.",
        translationKey: "athkar_dying_3",
        count: 1, takhrij: "أبو داود 3/ 314 بسند صحيح وأحمد بلفظ: بسم اللّه وعلى ملّة رسول اللّه. وسنده صحيح" },
    ],
  },
  {
    id: 'rooster',
    icon: 'weather-sunset-up',
    nameKey: 'athkar_cat_rooster',
    adhkar: [
      {
        arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ",
        transliteration: "Allāhumma innī asʾaluka min faḍlik.",
        translationKey: "athkar_rooster_1",
        count: 1, takhrij: "انظر تخريج روايات الحديث السابق رقم 20 وزيادة (اللهم اعصمني من الشيطان الرجيم) لابن ماجه. انظر صحيح ابن ماجه 1/ 129" },
      {
        arabic: "أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ",
        transliteration: "Aʿūdhu billāhi minash-shayṭānir-rajīm.",
        translationKey: "athkar_rooster_2",
        count: 1, takhrij: "البخاري 7/ 99 ومسلم 4/ 2015" },
    ],
  },
  {
    id: 'amazement',
    icon: 'emoticon-excited-outline',
    nameKey: 'athkar_cat_amazement',
    adhkar: [
      {
        arabic: "سُبْحَانَ اللَّهِ",
        transliteration: "Subḥānallāh.",
        translationKey: "athkar_amazement_1",
        count: 1, takhrij: "من قال ذلك عندما يأوي إلى فراشه كان خيرًا له من خادم. البخاري مع الفتح 7/ 71 ومسلم 4/ 2091" },
      {
        arabic: "اللَّهُ أَكْبَرُ",
        transliteration: "Allāhu akbar.",
        translationKey: "athkar_amazement_2",
        count: 1, takhrij: "من قال ذلك عندما يأوي إلى فراشه كان خيرًا له من خادم. البخاري مع الفتح 7/ 71 ومسلم 4/ 2091" },
      {
        arabic: "الْحَمْدُ لِلَّهِ الَّذِي بِنِعْمَتِهِ تَتِمُّ الصَّالِحَاتُ",
        transliteration: "Al-ḥamdu lillāhil-ladhī biniʿmatihi tatimmuṣ-ṣāliḥāt.",
        translationKey: "athkar_amazement_3",
        count: 1, takhrij: "أخرجه ابن السّني في عمل اليوم واللّيلة، والحاكم وصحّحه 1/ 499 وصحّحه الألباني رحمه اللّه في صحيح الجامع 4/ 201" },
      {
        arabic: "الْحَمْدُ لِلَّهِ عَلَى كُلِّ حَالٍ",
        transliteration: "Al-ḥamdu lillāhi ʿalā kulli ḥāl.",
        translationKey: "athkar_amazement_4",
        count: 1, takhrij: "أخرجه ابن السّني في عمل اليوم واللّيلة، والحاكم وصحّحه 1/ 499 وصحّحه الألباني رحمه اللّه في صحيح الجامع 4/ 201" },
    ],
  },
  {
    id: 'blessing_joy',
    icon: 'heart-outline',
    nameKey: 'athkar_cat_blessing_joy',
    adhkar: [
      {
        arabic: "الْحَمْدُ لِلَّهِ الَّذِي بِنِعْمَتِهِ تَتِمُّ الصَّالِحَاتُ",
        transliteration: "Al-ḥamdu lillāhil-ladhī biniʿmatihi tatimmuṣ-ṣāliḥāt.",
        translationKey: "athkar_joy_1",
        count: 1, takhrij: "أخرجه ابن السّني في عمل اليوم واللّيلة، والحاكم وصحّحه 1/ 499 وصحّحه الألباني رحمه اللّه في صحيح الجامع 4/ 201" },
      {
        arabic: "اللَّهُمَّ كَمَا حَسَّنْتَ خَلْقِي فَحَسِّنْ خُلُقِي",
        transliteration: "Allāhumma kamā ḥassanta khalqī faḥassin khuluqī.",
        translationKey: "athkar_joy_2",
        count: 1,
      },
      {
        arabic: "اللَّهُمَّ بَارِكْ فِيهِ",
        transliteration: "Allāhumma bārik fīh.",
        translationKey: "athkar_joy_3",
        count: 1,
      },
    ],
  },
  {
    id: 'eclipse',
    icon: 'eclipse-outline',
    nameKey: 'athkar_cat_eclipse',
    adhkar: [
      {
        arabic: "اللَّهُ أَكْبَرُ، لَا إِلَهَ إِلَّا اللَّهُ، أَسْتَغْفِرُ اللَّهَ",
        transliteration: "Allāhu akbar. Lā ilāha illallāh. Astaghfirullāh.",
        translationKey: "athkar_eclipse_1",
        count: 1,
      },
      {
        arabic: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ فِتْنَةِ هَذَا الزَّمَانِ",
        transliteration: "Allāhumma innī aʿūdhu bika min fitnat hādha az-zamān.",
        translationKey: "athkar_eclipse_2",
        count: 1,
      },
    ],
  },
  {
    id: 'istisqa',
    icon: 'weather-pouring',
    nameKey: 'athkar_cat_istisqa',
    adhkar: [
      {
        arabic: "اللَّهُمَّ اسْقِنَا، اللَّهُمَّ اسْقِنَا، اللَّهُمَّ اسْقِنَا",
        transliteration: "Allāhumas-qinā, Allāhumas-qinā, Allāhumas-qinā.",
        translationKey: "athkar_istisqa_1",
        count: 1,
      },
      {
        arabic: "اللَّهُمَّ اسْقِ عِبَادَكَ وَبَهَائِمَكَ، وَانْشُرْ رَحْمَتَكَ، وَأَحْيِ بَلَدَكَ الْمَيِّتَ",
        transliteration: "Allāhumas-qi ʿibādaka wa bahāʾimak, wanshur raḥmatak, wa aḥyi baladakal-mayyit.",
        translationKey: "athkar_istisqa_2",
        count: 1, takhrij: "أبو داود 1/ 305 وحسّنه الألباني في صحيح أبي داود 1/ 218" },
      {
        arabic: "اللَّهُمَّ أَغِثْنَا، اللَّهُمَّ أَغِثْنَا، اللَّهُمَّ أَغِثْنَا",
        transliteration: "Allāhumma aghithnā, Allāhumma aghithnā, Allāhumma aghithnā.",
        translationKey: "athkar_istisqa_3",
        count: 1, takhrij: "البخاري 1/ 224 ومسلم 2/ 613" },
    ],
  },
  {
    id: 'in_prayer',
    icon: 'human-handsup',
    nameKey: 'athkar_cat_in_prayer',
    adhkar: [], // filled from IMPORTED_ADHKAR below
  },
];

// ── Imported from Hisn al-Muslim (asellam/HisnElMuslim, MIT) — verbatim Arabic +
// count + takhrij. New entries carry no transliteration/meaning yet (pending an
// external translation/transliteration pass); the reader omits those lines cleanly.
const IMPORTED_ADHKAR: Record<string, Thikr[]> = {
  waking: [
    { arabic: "الحَمْدُ لِلَّهِ الذِي أَحْيَانَا بَعْدَمَا أَمَاتَنَا، وَإِلَيْهِ النُّشُّورُ", transliteration: "Al-ḥamdu lillāhil-ladhī aḥyānā baʿda mā amātanā, wa ilayhin-nushūr.", translationKey: "athkar_waking_i1", count: 1, takhrij: "البخاري مع الفتح 11/ 113 ومسلم 4/ 2083", },
    { arabic: "الحَمْدُ لِلَّهِ الذِي عَافَانِي فِي جَسَدِي، وَرَدَّ عَلَيَّ رُوحِي، وَأَذِنَ لِي بِذِكْرِهِ", transliteration: "Al-ḥamdu lillāhil-ladhī ʿāfānī fī jasadī, wa radda ʿalayya rūḥī, wa adhina lī bidhikrih.", translationKey: "athkar_waking_i2", count: 1, takhrij: "التّرمذي 5/ 473 وانظر صحيح التّرمذي 3/ 144", },
  ],
  clothing: [
    { arabic: "إِلْبَسْ جَدِيدًا وَعِشْ حَمِيدًا وَمُتْ شَهِيدًا", transliteration: "Ilbas jadīdan wa ʿish ḥamīdan wa mut shahīdā.", translationKey: "athkar_clothing_i1", count: 1, takhrij: "ابن ماجه 2/ 1178 والبغوي 12/ 41 وانظر صحيح ابن ماجة 2/ 275", },
    { arabic: "تُبْلِي وَيُخْلِفُ اللَّهُ تَعَالَى", transliteration: "Tublī wa yukhlifullāhu taʿālā.", translationKey: "athkar_clothing_i2", count: 1, takhrij: "أخرجه أبو داود 4/ 41، وانظر صحيح أبي داود 2/ 760", },
  ],
  wudu: [
    { arabic: "أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ", transliteration: "Ashhadu an lā ilāha illallāhu waḥdahu lā sharīka lah, wa ashhadu anna Muḥammadan ʿabduhu wa rasūluh.", translationKey: "athkar_wudu_i1", count: 1, takhrij: "رواه مسلم 1/ 209", },
    { arabic: "اللَّهُمَّ اجْعَلْنِي مِنَ التَّوَّابِينَ وَاجْعَلْنِي مِنَ المُتَطَهِّرِينَ", transliteration: "Allāhummajʿalnī minat-tawwābīna wajʿalnī minal-mutaṭahhirīn.", translationKey: "athkar_wudu_i2", count: 1, takhrij: "التّرمذي 1/ 78 وانظر صحيح التّرمذي 1/ 18", },
  ],
  entering_home: [
  ],
  going_prayer: [
    { arabic: "اللَّهُمَّ اجْعَلْ فِي قَلْبِي نُورًا، وَفِي لِسَانِي نُورًا، وَفِي سَمْعِي نُورًا، وَفِي بَصَرِي نُورًا، وَمِنْ فَوْقِي نُورًا، وَمِنْ تَحْتِي نُورًا، وَعَنْ يَمِينِي نُورًا، وَعَنْ شِمَالِي نُورا، وَمِنْ أَمَامِي نُورًا، وَمِنْ خَلْفِي نُورًا، وَاجْعَلْ فِي نَفْسِي نُورًا، وَأَعْظِمْ لِي نُورًا، وَعَظِّمْ لِي نُورًا، وَاجْعَلْ لِي نُورًا، وَاجْعَلْنِي نُورًا. اللَّهُمَّ أَعْطِنِي نُورًا، وَاجْعَلْ فِي عَصَبِي نُورًا، وَفِي لَحْمِي نُورًا، وَفِي دَمِي نُورًا، وَفِي شَعْرِي نُورًا، وَفِي بَشَرِي نُورًا", transliteration: "Allāhummajʿal fī qalbī nūrā, wa fī lisānī nūrā, wa fī samʿī nūrā, wa fī baṣarī nūrā, wa min fawqī nūrā, wa min taḥtī nūrā, wa ʿan yamīnī nūrā, wa ʿan shimālī nūrā, wa min amāmī nūrā, wa min khalfī nūrā, wajʿal fī nafsī nūrā, wa aʿẓim lī nūrā, wa ʿaẓẓim lī nūrā, wajʿal lī nūrā, wajʿalnī nūrā. Allāhumma aʿṭinī nūrā, wajʿal fī ʿaṣabī nūrā, wa fī laḥmī nūrā, wa fī damī nūrā, wa fī shaʿrī nūrā, wa fī basharī nūrā.", translationKey: "athkar_going_prayer_i1", count: 1, takhrij: "جميع هذه الخصال في البخاري 11/ 116 برقم 6316 ومسلم 1/ 526، 529، 530 برقم 763", },
    { arabic: "وَزِدْنِي نُورًا، وَزِدْنِي نُورًا، وَزِدْنِي نُورًا", transliteration: "Wa zidnī nūrā, wa zidnī nūrā, wa zidnī nūrā.", translationKey: "athkar_going_prayer_i3", count: 1, takhrij: "أخرجه البخاري في الأدب المفرد برقم 695، ص 258 وصحح إسناده الألباني في صحيح الأدب المفرد برقم 536", },
    { arabic: "وَهَبْ لِي نُورًا عَلَى نُورٍ", transliteration: "Wa hab lī nūran ʿalā nūr.", translationKey: "athkar_going_prayer_i4", count: 1, takhrij: "ذكره ابن حجر في فتح الباري وعزاه إلى ابن أبي عاصم في كتاب الدعاء، انظر الفتح 11/ 118 وقال: فاجتمع من اختلاف الروايات خمس وعشرون خصلة", },
  ],
  mosque: [
    { arabic: "بِسْمِ اللَّهِ وَالصَّلَاةُ وَالسَّلَامُ عَلَى رَسُولِ اللَّهِ، اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ، اللَّهُمَّ اعْصِمْنِي مِنَ الشَّيْطَانِ الرَّجِيمِ", transliteration: "Bismillāhi waṣ-ṣalātu was-salāmu ʿalā rasūlillāh, Allāhumma innī asʾaluka min faḍlik, Allāhummaʿṣimnī minash-shayṭānir-rajīm.", translationKey: "athkar_mosque_i2", count: 1, takhrij: "انظر تخريج روايات الحديث السابق رقم 20 وزيادة (اللهم اعصمني من الشيطان الرجيم) لابن ماجه. انظر صحيح ابن ماجه 1/ 129", },
  ],
  adhan_response: [
    { arabic: "وَأَنَا أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ، وَحْدَهُ لَا شَرِيكَ لَهُ، وَأَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ، رَضِيتُ بِاللَّهِ رَبًّا، وَبِمُحَمَّدٍ رَسُولًا وَبِالإِسْلَامِ دِينًا", transliteration: "Wa anā ashhadu an lā ilāha illallāh, waḥdahu lā sharīka lah, wa anna Muḥammadan ʿabduhu wa rasūluh, raḍītu billāhi rabbā, wa bi-Muḥammadin rasūlā, wa bil-islāmi dīnā.", translationKey: "athkar_adhan_response_i1", count: 1, takhrij: "مسلم 1/ 290. يقول ذلك عقب تشهد المؤذن (ابن خزيمة 1/ 220)", },
  ],
  in_prayer: [
    { arabic: "اللَّهُمَّ بَاعِدْ بَيْنِي وَبَيْنَ خَطَايَايَ كَمَا بَاعَدْتَ بَيْنَ المَشْرِقِ وَالمَغْرِبِ، اللَّهُمَّ نَقِّنِي مِنْ خَطَايَايَ كَمَا يُنَقَّى الثَّوْبُ الأَبْيَضُ مِنَ الدَّنَسِ اللَّهُمَّ اغْسِلْنِي مِنْ خَطَايَايَ بِالمَاءِ وَالثَّلْجِ وَالبَرَدِ", transliteration: "Allāhumma bāʿid baynī wa bayna khaṭāyāya kamā bāʿadta baynal-mashriqi wal-maghrib, Allāhumma naqqinī min khaṭāyāya kamā yunaqqath-thawbul-abyaḍu minad-danas, Allāhummaghsilnī min khaṭāyāya bil-māʾi wath-thalji wal-barad.", translationKey: "athkar_in_prayer_i1", count: 1, takhrij: "البخاري 1/ 181 ومسلم 1/ 419", },
    { arabic: "سُبْحَانَكَ اللَّهُمَّ وَبِحَمْدِكَ، وَتَبَارَكَ اسْمُكَ، وَتَعَالَى جَدُّكْ، وَلَا إِلَهَ غَيْرُكَ", transliteration: "Subḥānakallāhumma wa biḥamdik, wa tabārakasmuk, wa taʿālā jadduk, wa lā ilāha ghayruk.", translationKey: "athkar_in_prayer_i2", count: 1, takhrij: "أخرجه أصحاب السنن الأربعة وانظر صحيح التّرمذي 1/ 77 وصحيح ابن ماجه 1/ 135", },
    { arabic: "وَجَّهْتُ وَجْهِيَ لِلَّذِي فَطَرَ السَّمَوَاتِ وَالأَرْضَ حَنِيفًا وَمَا أَنَا مِنَ المُشْرِكِينَ، إِنَّ صَلَاتِي وَنُسُكِي وَمَحْيَايَ وَمَمَاتِي لِلَّهِ رَبِّ العَالَمِينْ، لَا شَرِيكَ لَهُ وَبِذَلِكَ أُمِرْتُ وَأَنَا مِنَ المُسْلِمِينَ، اللَّهُمَّ أَنْتَ المَلِكُ لَا إِلَهَ إِلَّا أَنْتَ، أَنْتَ رَبِّي وَأَنَا عَبْدُكَ، ظَلَمْتُ نَفْسِي، وَاعْتَرَفْتُ بِذَنْبِي، فَاغْفِرْ لِي ذُنُوبِي جَمِيعًا، إِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ، وَاهْدِنِي لِأَحْسَنِ الأَخْلَاقِ، لَا يَهْدِي لِأَحْسَنِهَا إِلَّا أَنْتَ، وَاصْرِفْ عَنِّي سَيِّئَهَا، لَا يَصْرِفُ عَنِّي سَيِّئَهَا إِلَّا أَنْتَ، لَبَّيْكَ وَسَعْدَيْكَ، وَالخَيْرُ كُلُّهُ بِيَدَيْكَ، وَالشَّرُّ لَيْسَ إِلَيْكَ، أَنَا بِكَ وَإِلَيْكَ، تَبَارَكْتَ وَتَعَالَيْتَ، أَسْتَغْفِرُكَ وَأَتُوبُ إِلَيْكَ", transliteration: "Wajjahtu wajhiya lilladhī faṭaras-samāwāti wal-arḍa ḥanīfan wa mā anā minal-mushrikīn, inna ṣalātī wa nusukī wa maḥyāya wa mamātī lillāhi rabbil-ʿālamīn, lā sharīka lahu wa bidhālika umirtu wa anā minal-muslimīn. Allāhumma antal-maliku lā ilāha illā ant, anta rabbī wa anā ʿabduk, ẓalamtu nafsī, waʿtaraftu bidhanbī, faghfir lī dhunūbī jamīʿā, innahu lā yaghfirudh-dhunūba illā ant, wahdinī li-aḥsanil-akhlāq, lā yahdī li-aḥsanihā illā ant, waṣrif ʿannī sayyiʾahā, lā yaṣrifu ʿannī sayyiʾahā illā ant, labbayka wa saʿdayk, wal-khayru kulluhu bi-yadayk, wash-sharru laysa ilayk, anā bika wa ilayk, tabārakta wa taʿālayt, astaghfiruka wa atūbu ilayk.", translationKey: "athkar_in_prayer_i3", count: 1, takhrij: "رواه مسلم 1/ 534", },
    { arabic: "اللَّهُمَّ رَبَّ جِبْرَائِيلَ وَمِيكَائِيلَ وَإِسْرَافِيلَ، فَاطِرَ السَّمَوَاتِ وَالأَرْضِ، عَالِمَ الغَيْبِ وَالشَّهَادَةِ، أَنْتَ تَحْكُمُ بَيْنَ عِبَادِكَ فِيمَا كَانُوا فِيهِ يَخْتَلِفُونَ. اهْدِنِي لِمَا اخْتُلِفَ فِيهِ مِنَ الحَّقِّ بِإِذْنِكَ إِنَّكَ تَهْدِي مَنْ تَشَاءُ إِلَى صِرَاطٍ مُسْتَقِيمٍ", transliteration: "Allāhumma rabba Jibrāʾīla wa Mīkāʾīla wa Isrāfīl, fāṭiras-samāwāti wal-arḍ, ʿālimal-ghaybi wash-shahādah, anta taḥkumu bayna ʿibādika fīmā kānū fīhi yakhtalifūn. Ihdinī limakhtulifa fīhi minal-ḥaqqi biʾidhnik, innaka tahdī man tashāʾu ilā ṣirāṭin mustaqīm.", translationKey: "athkar_in_prayer_i4", count: 1, takhrij: "رواه مسلم 1/ 534", },
    { arabic: "اللَّهُمَّ لَكَ الحَمْدُ أَنْتَ نُورُ السَّمَوَاتِ وَالأَرْضِ وَمَنْ فِيهِنَّ، وَلَكَ الحَمْدُ أَنْتَ قَيِّمُ السَّمَوَاتِ وَالأَرْضِ وَمَنْ فِيهِنَّ، وَلَكَ الحَمْدُ أَنْتَ رَبُّ السَّمَوَاتِ وَالأَرْضِ وَمَنْ فِيهِنَّ، وَلَكَ الحَمْدُ لَكَ مُلْكُ السَّمَوَاتِ وَالأَرْضِ وَمَنْ فِيهِنَّ، وَلَكَ الحَمْدُ أَنْتَ مَلِكُ السَّمَوَاتِ وَالأَرْضِ، وَلَكَ الحَمْدُ أَنْتَ الحَقُّ، وَوَعْدُكَ الحَقُّ، وَقَوْلُكَ الحَقُّ، وَلِقَاؤُكَ الحَقُّ، وَالجَنَّةُ حَقٌّ، وَالنَّارُ حَقٌّ، وَالنَّبِيُّونَ حَقٌّ، وَمُحَمَّدٌ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ حَقٌّ وَالسَّاعَةُ حَقٌّ اللَّهُمَّ لَكَ أَسْلَمْتُ، وَعَلَيْكَ تَوَكَّلْتُ، وَبِكَ آمَنْتُ، وَإِلَيْكَ أَنَبْتُ، وَبِكَ خَاصَمْتُ، وَإِلَيْكَ حَاكَمْتُ، فَاغْفِرْ لِي مَا قَدَّمْتُ وَمَا أَخَّرْتُ، وَمَا أَسْرَرْتُ، وَمَا أَعْلَنْتُ أَنْتَ المُقَدِّمُ، وَأَنْتَ المُؤَخِّرُ لَا إِلَهَ إِلَّا أَنْتَ، أَنْتَ إِلَهِي لَا إِلَهَ إِلَّا أَنْتَ", transliteration: "Allāhumma lakal-ḥamdu anta nūrus-samāwāti wal-arḍi wa man fīhinn, wa lakal-ḥamdu anta qayyimus-samāwāti wal-arḍi wa man fīhinn, wa lakal-ḥamdu anta rabbus-samāwāti wal-arḍi wa man fīhinn, wa lakal-ḥamdu laka mulkus-samāwāti wal-arḍi wa man fīhinn, wa lakal-ḥamdu anta malikus-samāwāti wal-arḍ, wa lakal-ḥamdu antal-ḥaqq, wa waʿdukal-ḥaqq, wa qawlukal-ḥaqq, wa liqāʾukal-ḥaqq, wal-jannatu ḥaqq, wan-nāru ḥaqq, wan-nabiyyūna ḥaqq, wa Muḥammadun ṣallallāhu ʿalayhi wa sallama ḥaqq, was-sāʿatu ḥaqq. Allāhumma laka aslamt, wa ʿalayka tawakkalt, wa bika āmant, wa ilayka anabt, wa bika khāṣamt, wa ilayka ḥākamt, faghfir lī mā qaddamtu wa mā akhkhart, wa mā asrartu wa mā aʿlant, antal-muqaddim, wa antal-muʾakhkhir, lā ilāha illā ant, anta ilāhī lā ilāha illā ant.", translationKey: "athkar_in_prayer_i5", count: 1, takhrij: "البخاري مع الفتح 3/ 3 و 11/ 116 و 13/ 371، 423، 465 ومسلم مختصرًا بنحوه 1/ 532", },
    { arabic: "سُبْحَانَ رَبِّيَ العَظِيمِ", transliteration: "Subḥāna rabbiyal-ʿaẓīm.", translationKey: "athkar_in_prayer_i6", count: 3, takhrij: "أخرجه أهل السنن وأحمد وانظر صحيح التّرمذي 1/ 83", },
    { arabic: "سُبْحَانَكَ اللَّهُمَّ رَبَّنَا وَبِحَمْدِكَ، اللَّهُمَّ اغْفِرْ لِي", transliteration: "Subḥānakallāhumma rabbanā wa biḥamdik, Allāhummaghfir lī.", translationKey: "athkar_in_prayer_i7", count: 1, takhrij: "البخاري 1/ 199 ومسلم 1/ 350", },
    { arabic: "سُبُّوحٌ، قُدُّوسٌ، رَبُّ المَلَائِكَةِ وَالرُّوحِ", transliteration: "Subbūḥun, quddūsun, rabbul-malāʾikati war-rūḥ.", translationKey: "athkar_in_prayer_i8", count: 1, takhrij: "مسلم 1/ 353 وأبو داود 1/ 230", },
    { arabic: "اللَّهُمَّ لَكَ رَكَعْتُ، وَبِكَ آمَنْتُ، وَلَكَ أَسْلَمْتُ، خَشَعَ لَكَ سَمْعِي وَبَصَرِي وَمُخِّي وَعَظْمِي وَعَصَبِي، وَمَا اسْتَقَلَّ بِهِ قَدَمِي", transliteration: "Allāhumma laka rakaʿt, wa bika āmant, wa laka aslamt, khashaʿa laka samʿī wa baṣarī wa mukhkhī wa ʿaẓmī wa ʿaṣabī, wa mastaqalla bihi qadamī.", translationKey: "athkar_in_prayer_i9", count: 1, takhrij: "مسلم 1/ 534 والأربعة إلا ابن ماجه", },
    { arabic: "سُبْحَانَ ذِي الجَبَرُوتِ وَالمَلَكُوتِ وَالكِبْرِيَاءِ وَالعَظَمَةِ", transliteration: "Subḥāna dhil-jabarūti wal-malakūti wal-kibriyāʾi wal-ʿaẓamah.", translationKey: "athkar_in_prayer_i10", count: 1, takhrij: "أبو داود 1/ 230 والنسائي وأحمد وإسناده حسن", },
    { arabic: "سَمِعَ اللَّهُ لِمَنْ حَمِدَهُ", transliteration: "Samiʿallāhu liman ḥamidah.", translationKey: "athkar_in_prayer_i11", count: 1, takhrij: "البخاري مع الفتح 2/ 282", },
    { arabic: "رَبَّنَا وَلَكَ الحَمْدُ، حَمْدًا كَثِيرًا طَيِّبًا مُبَارَكًا فِيهِ", transliteration: "Rabbanā wa lakal-ḥamd, ḥamdan kathīran ṭayyiban mubārakan fīh.", translationKey: "athkar_in_prayer_i12", count: 1, takhrij: "البخاري مع الفتح 2/ 284", },
    { arabic: "مِلْءَ السَّمَوَاتِ وَمِلْءَ الأَرْضِ وَمَا بَيْنَهُمَا، وَمِلْءَ مَا شِئْتَ مِنْ شَيْءٍ بَعْدُ. أَهْلَ الثَّنَاءِ وَالمَجْدِ، أَحَقُّ مَا قَالَ العَبْدُ، وَكُلُّنَا لَكَ عَبْدٌ، اللَّهُمَّ لَا مَانِعَ لِمَا أَعْطَيْتَ وَلَا مُعْطِيَ لِمَا مَنَعْتَ وَلَا يَنْفَعُ ذَا الجَدِّ مِنْكَ الجَدُّ", transliteration: "Milʾas-samāwāti wa milʾal-arḍi wa mā baynahumā, wa milʾa mā shiʾta min shayʾin baʿd. Ahlath-thanāʾi wal-majd, aḥaqqu mā qālal-ʿabd, wa kullunā laka ʿabd, Allāhumma lā māniʿa limā aʿṭayta wa lā muʿṭiya limā manaʿt, wa lā yanfaʿu dhal-jaddi minkal-jadd.", translationKey: "athkar_in_prayer_i13", count: 1, takhrij: "مسلم 1/ 346", },
    { arabic: "سُبْحَانَ رَبِّيَ الأَعْلَى", transliteration: "Subḥāna rabbiyal-aʿlā.", translationKey: "athkar_in_prayer_i14", count: 3, takhrij: "أخرجه أهل السنن وأحمد وانظر صحيح التّرمذي 1/ 83", },
    { arabic: "اللَّهُمَّ لَكَ سَجَدْتُ وَبِكَ آمَنْتُ، وَلَكَ أَسْلَمْتُ، سَجَدَ وَجْهِيَ لِلَّذِي خَلَقَهُ، وَصَوَّرَهُ، وَشَقَّ سَمْعَهُ، وَبَصَرَهُ، تَبَارَكَ اللَّهُ أَحْسَنُ الخَالِقِينَ", transliteration: "Allāhumma laka sajadt, wa bika āmant, wa laka aslamt, sajada wajhiya lilladhī khalaqah, wa ṣawwarah, wa shaqqa samʿahu wa baṣarah, tabārakallāhu aḥsanul-khāliqīn.", translationKey: "athkar_in_prayer_i15", count: 1, takhrij: "مسلم 1/ 534 وغيره", },
    { arabic: "اللَّهُمَّ اغْفِرْ لِي ذَنْبِي كُلَّهُ، دِقَّهُ وَجِلَّهُ، وَأَوَّلَهُ وَآخِرَهُ، وَعَلَانِيَّتَهُ وَسِرَّهُ", transliteration: "Allāhummaghfir lī dhanbī kullah, diqqahu wa jillah, wa awwalahu wa ākhirah, wa ʿalāniyyatahu wa sirrah.", translationKey: "athkar_in_prayer_i16", count: 1, takhrij: "مسلم 1/ 350", },
    { arabic: "اللَّهُمَّ إِنِّي أَعُوذُ بِرِضَاكَ مِنْ سَخَطِكَ، وَبِمُعَافَاتِكَ مِنْ عُقُوبَتِكَ، وَأَعُوذُ بِكَ مِنْكَ، لَا أُحْصِي ثَنَاءً عَلَيْكَ أَنْتَ كَمَا أَثْنَيْتَ عَلَى نَفْسِكَ", transliteration: "Allāhumma innī aʿūdhu biriḍāka min sakhaṭik, wa bimuʿāfātika min ʿuqūbatik, wa aʿūdhu bika mink, lā uḥṣī thanāʾan ʿalayk, anta kamā athnayta ʿalā nafsik.", translationKey: "athkar_in_prayer_i17", count: 1, takhrij: "مسلم 1/ 352", },
    { arabic: "رَبِّ اغْفِرْ لِي، رَبِّ اغْفِرْ لِي", transliteration: "Rabbighfir lī, rabbighfir lī.", translationKey: "athkar_in_prayer_i18", count: 1, takhrij: "أبو داود 1/ 231 وانظر  صحيح ابن ماجة 1/ 148", },
    { arabic: "اللَّهُمَّ اغْفِرْ لِي، وَارْحَمْنِي، وَاهْدِنِي، وَاجْبُرْنِي، وَعَافِنِي، وَارْزُقْنِي، وَارْفَعْنِي", transliteration: "Allāhummaghfir lī, warḥamnī, wahdinī, wajburnī, wa ʿāfinī, warzuqnī, warfaʿnī.", translationKey: "athkar_in_prayer_i19", count: 1, takhrij: "أخرجه أصحاب السنن إلا النسائي وانظر صحيح التّرمذي 1/ 90 وصحيح ابن ماجه 1/ 148", },
    { arabic: "اللَّهُمَّ أُكْتُبْ لِي بِهَا عِنْدَكَ أَجْرًا، وَضَعْ عَنِّي بِهَا وِزْرًا، وَاجْعَلْهَا لِي عِنْدَكَ ذُخْرًا، وَتَقَبَّلْهَا مِنِّي كَمَا تَقَبَّلْتَهَا مِنْ عَبْدِكَ دَاوُدْ", transliteration: "Allāhummaktub lī bihā ʿindaka ajrā, wa ḍaʿ ʿannī bihā wizrā, wajʿalhā lī ʿindaka dhukhrā, wa taqabbalhā minnī kamā taqabbaltahā min ʿabdika Dāwūd.", translationKey: "athkar_in_prayer_i20", count: 1, takhrij: "التّرمذي 2/ 473 والحاكم وصححه ووافقه الذهبي 1/ 219", },
    { arabic: "التَّحِيَّاتُ لِلَّهِ، وَالصَّلَوَاتُ، وَالطَّيِّبَاتُ، السَّلَامُ عَلَيْكَ أَيُّهَا النَّبِيُّ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ، السَّلَامُ عَلَيْنَا وَعَلَى عِبَادِ اللَّهِ الصَّالِحِينَ، أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ، وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ", transliteration: "At-taḥiyyātu lillāhi, waṣ-ṣalawātu, waṭ-ṭayyibāt, as-salāmu ʿalayka ayyuhan-nabiyyu wa raḥmatullāhi wa barakātuh, as-salāmu ʿalaynā wa ʿalā ʿibādillāhiṣ-ṣāliḥīn, ashhadu an lā ilāha illallāh, wa ashhadu anna Muḥammadan ʿabduhu wa rasūluh.", translationKey: "athkar_in_prayer_i21", count: 1, takhrij: "البخاري مع الفتح 1/ 13 ومسلم 1/ 301", },
  ],
  after_tashahhud: [
    { arabic: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ عَذَابِ القَبْرِ، وَأَعُوذُ بِكَ مِنْ فِتْنَةِ المَسِيحِ الدَّجَّالِ، وَأَعُوذُ بِكَ مِنْ فِتْنَةِ المَحْيَا وَالمَمَاتِ، اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ المَأْثَمِ وَالمَغْرَمِ", transliteration: "Allāhumma innī aʿūdhu bika min ʿadhābil-qabr, wa aʿūdhu bika min fitnatil-masīḥid-dajjāl, wa aʿūdhu bika min fitnatil-maḥyā wal-mamāt, Allāhumma innī aʿūdhu bika minal-maʾthami wal-maghram.", translationKey: "athkar_after_tashahhud_i1", count: 1, takhrij: "البخاري 1/ 202 ومسلم 1/ 412", },
    { arabic: "اللَّهُمَّ اغْفِرْ لِي مَا قَدَّمْتُ، وَمَا أَخَّرْتُ، وَمَا أَسْرَرْتُ، وَمَا أَعْلَنْتُ، وَمَا أَسْرَفْتُ، وَمَا أَنْتَ أَعْلَمُ بِهِ مِنِّي. أَنْتَ المُقَدِّمُ، وَأَنْتَ المُؤَخِّرُ لَا إِلَهَ إِلَّا أَنْتَ", transliteration: "Allāhummaghfir lī mā qaddamtu, wa mā akhkhartu, wa mā asrartu, wa mā aʿlantu, wa mā asraftu, wa mā anta aʿlamu bihi minnī, antal-muqaddim, wa antal-muʾakhkhir, lā ilāha illā ant.", translationKey: "athkar_after_tashahhud_i2", count: 1, takhrij: "مسلم 1/ 534", },
    { arabic: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ البُخْلِ وَأَعُوذُ بِكَ مِنَ الجُبْنِ، وَأَعُوذُ بِكَ مِنْ أَنْ أُرَدَّ إِلَى أَرْذَلِ العُمُرِ، وَأَعُوذُ بِكَ مِنْ فِتْنَةِ الدُّنْيَا وَعَذَابِ القَبْرِ", transliteration: "Allāhumma innī aʿūdhu bika minal-bukhl, wa aʿūdhu bika minal-jubn, wa aʿūdhu bika min an uradda ilā ardhalil-ʿumur, wa aʿūdhu bika min fitnatid-dunyā wa ʿadhābil-qabr.", translationKey: "athkar_after_tashahhud_i3", count: 1, takhrij: "البخاري مع الفتح 6/ 35", },
    { arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ الجَنَّةَ وَأَعُوذُ بِكَ مِنَ النَّارِ", transliteration: "Allāhumma innī asʾalukal-jannata wa aʿūdhu bika minan-nār.", translationKey: "athkar_after_tashahhud_i4", count: 1, takhrij: "أبو داود وانظر صحيح ابن ماجه 2/ 328", },
    { arabic: "اللَّهُمَّ بِعِلْمِكَ الغَيْبَ وَقُدْرَتِكَ عَلَى الخَلْقِ أَحْيِنِي مَا عَلِمْتَ الحَيَاةَ خَيْرًا لِي وَتَوَفَّنِي إِذَا عَلِمْتَ الوَفَاةَ خَيْرًا لِي، اللَّهُمَّ إِنِّي أَسْأَلُكَ خَشْيَتَكَ فِي الغَيْبِ وَالشَّهَادَةِ، وَأَسْأَلُكَ كَلِمَةَ الحَقِّ فِي الرِّضَا وَالغَضَبِ، وَأَسْأَلُكَ القَصْدَ فِي الغِنَى وَالفَقْرِ، وَأَسْأَلُكَ نَعِيمًا لَا يَنْفَدُ، وَأْسْأَلُكَ قُرَّةَ عَيْنٍ لَا تَنْقَطِعُ، وَأَسْأَلُكَ الرِّضَا بَعْدَ القَضَاءِ، وَأَسْأَلُكَ بَرْدَ العَيْشِ بَعْدَ المَوْتِ، وَأَسْأَلُكَ لَذَّةَ النَّظَرِ إِلَى وَجْهِكَ وَالشَّوْقَ إِلَى لِقَائِكَ فِي غَيْرِ ضَرَّاءَ مُضِرَّةٍ وَلَا فِتْنَةٍ مُضِلَّةٍ، اللَّهُمَّ زَيِّنَا بِزِينَةِ الإِيمَانِ، وَاجْعَلْنَا هُدَاةً مُهْتَدِينَ", transliteration: "Allāhumma biʿilmikal-ghayba wa qudratika ʿalal-khalqi aḥyinī mā ʿalimtal-ḥayāta khayran lī, wa tawaffanī idhā ʿalimtal-wafāta khayran lī, Allāhumma innī asʾaluka khashyataka fil-ghaybi wash-shahādah, wa asʾaluka kalimatal-ḥaqqi fir-riḍā wal-ghaḍab, wa asʾalukal-qaṣda fil-ghinā wal-faqr, wa asʾaluka naʿīman lā yanfad, wa asʾaluka qurrata ʿaynin lā tanqaṭiʿ, wa asʾalukar-riḍā baʿdal-qaḍāʾ, wa asʾaluka bardal-ʿayshi baʿdal-mawt, wa asʾaluka ladhdhatan-naẓari ilā wajhika wash-shawqa ilā liqāʾika fī ghayri ḍarrāʾa muḍirratin wa lā fitnatin muḍillah, Allāhumma zayyinnā bizīnatil-īmān, wajʿalnā hudātan muhtadīn.", translationKey: "athkar_after_tashahhud_i5", count: 1, takhrij: "النسائي 4/ 54، 55 وأحمد 4/ 364 وصححه الألباني في صحيح النسائي 1/ 281", },
    { arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ بِأَنِّي أَشْهَدُ أَنَّكَ أَنْتَ اللَّهُ لَا إِلَهَ إِلَّا أَنْتَ، الأَحَدُ الصَّمَدُ الذِي لَمْ يَلِدْ وَلَمْ يُولَدْ وَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدْ", transliteration: "Allāhumma innī asʾaluka biʾannī ashhadu annaka antallāhu lā ilāha illā ant, al-aḥaduṣ-ṣamadul-ladhī lam yalid wa lam yūlad wa lam yakun lahu kufuwan aḥad.", translationKey: "athkar_after_tashahhud_i6", count: 1, takhrij: "أبو داود 2/ 62 والتّرمذي 5/ 515 وابن ماجه 2/ 1267 وأحمد 5/ 360 وانظر صحيح ابن ماجه 2/ 329 وصحيح التّرمذي 3/ 163", },
  ],
  morning: [
    { arabic: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ المُلْكُ وَلَهُ الحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ، لَا إِلَهَ إِلَّا اللَّهُ، وَلَا نَعْبُدُ إِلَّا إِيَّاهُ، لَهُ النِّعْمَةُ وَلَهُ الفَضْلُ، وَلَهُ الثَّنَاءُ الحَسَنُ، لَا إِلَهَ إِلَّا اللَّهُ مُخْلِصِينَ لَهُ الدِّينَ وَلَوْ كَرِهَ الكَافِرُونَ", transliteration: "Lā ilāha illallāhu waḥdahu lā sharīka lah, lahul-mulku wa lahul-ḥamdu wa huwa ʿalā kulli shayʾin qadīr, lā ḥawla wa lā quwwata illā billāh, lā ilāha illallāh, wa lā naʿbudu illā iyyāh, lahun-niʿmatu wa lahul-faḍl, wa lahuth-thanāʾul-ḥasan, lā ilāha illallāhu mukhliṣīna lahud-dīna wa law karihal-kāfirūn.", translationKey: "athkar_morning_i1", count: 1, takhrij: "مسلم 1/ 415", },
    { arabic: "الحَمْدُ لِلَّهِ وَحْدَهُ، وَالصَّلَاةُ وَالسَّلَامُ عَلَى مَنْ لَا نَبِيَّ بَعْدَهُ", transliteration: "Al-ḥamdu lillāhi waḥdah, waṣ-ṣalātu was-salāmu ʿalā man lā nabiyya baʿdah.", translationKey: "athkar_morning_i2", count: 1, takhrij: "عن أنس يرفعه \"لأن أقعد مع قوم يذكرون الله تعالى من صلاة الغداة حتى تطلع الشمس أحب إلي من أن أعتق أربعة من ولد إسماعيل، ولأن أقعد مع قوم يذكرون الله من صلاة العصر إلى أن تغرب الشمس أحب إلي من أن أعتق أربعة\"أبو داود برقم 3667، وحسنه الألباني، صحيح أبو داود 2/ 698", },
    { arabic: "اللَّهُمَّ إِنِّي أَصْبَحْتُ أُشْهِدُكَ وَأُشْهِدُ حَمَلَةَ عَرْشِكَ، وَمَلَائِكَتَكَ وَجَمِيعَ خَلْقِكَ، أَنَّكَ أَنْتَ اللَّهُ لَا إِلَهَ إِلَّا أَنْتَ وَحْدَكَ لَا شَرِيكَ لَكَ، وَأَنَّ مُحَمَّدًا عَبْدُكَ وَرَسُولُكَ", transliteration: "Allāhumma innī aṣbaḥtu ushhiduka wa ushhidu ḥamalata ʿarshik, wa malāʾikataka wa jamīʿa khalqik, annaka antallāhu lā ilāha illā anta waḥdaka lā sharīka lak, wa anna Muḥammadan ʿabduka wa rasūluk.", translationKey: "athkar_morning_i3", count: 4, takhrij: "من قالها حين يصبح وحين يمسي أربع مرات أعتقه الله من النار . أخرجه أبو داود 4/ 317 والبخاري في الأدب المفرد برقم 1201 والنسائي في عمل اليوم والليلة برقم 9، وابن السني برقم 70 وحسن سماحة الشيخ ابن باز إسناد النسائي وأبي داود في تحفة الأخيار ص 23", },
    { arabic: "اللَّهُمَّ مَا أَصْبَحَ بِي مِنْ نِعْمَةٍ أَوْ بِأَحَدٍ مِنْ خَلْقِكَ فَمِنْكَ وَحْدَكَ لَا شَرِيكَ لَكَ، فَلَكَ الحَمْدُ وَلَكَ الشُّكْرُ", transliteration: "Allāhumma mā aṣbaḥa bī min niʿmatin aw biʾaḥadin min khalqik, faminka waḥdaka lā sharīka lak, falakal-ḥamdu wa lakash-shukr.", translationKey: "athkar_morning_i4", count: 1, takhrij: "من قالها حين يصبح فقد أدي شكر يومه، ومن قالها حين يمسى فقد أدى شكر ليلته. أخرجه أبو داود 4/ 318، والنسائي في عمل اليوم والليلة برقم 7 وابن السني برقم 41 وابن حبان \"موارد\"رقم 2361 وحسن ابن باز إسناده في تحفة الأخيار ص 24", },
    { arabic: "اللَّهُمَّ عَافِنِي فِي بَدَنِي، اللَّهُمَّ عَافِنِي فِي سَمْعِي، اللَّهُمَّ عَافِنِي فِي بَصَرِي، لَا إِلَه إِلَّا أَنْتَ. اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الكُفْرِ، وَالفَقْرِ، وَأَعُوذُ بِكَ مِنْ عَذَابِ القَبْرِ، لَا إِلَهَ إِلَّا أَنْتَ", transliteration: "Allāhumma ʿāfinī fī badanī, Allāhumma ʿāfinī fī samʿī, Allāhumma ʿāfinī fī baṣarī, lā ilāha illā ant. Allāhumma innī aʿūdhu bika minal-kufri wal-faqr, wa aʿūdhu bika min ʿadhābil-qabr, lā ilāha illā ant.", translationKey: "athkar_morning_i5", count: 3, takhrij: "أبو داود 4/ 324، وأحمد 5/ 42 والنسائي في عمل اليوم والليلة برقم 22 وابن السني برقم 69 والبخاري في الأدب المفرد، وحسن العلامة ابن باز إسناده في تحفة الأخيار ص 26", },
    { arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ العَفْوَ وَالعَافِيَةَ فِي الدُّنْيَا وَالآخِرَةِ، اللَّهُمَّ إِنِّي أَسْأَلُكَ العَفْوَ وَالعَافِيَةَ فِي دِينِي وَدُنْيَايَ وَأَهْلِي وَمَالِي، اللَّهُمَّ اسْتُرْ عَوْرَاتِي وَآمِنْ رَوْعَاتِي، اللَّهُمَّ احْفَظْنِي مِنْ بَيْنِ يَدَيَّ وَمِنْ خَلْفِي وَعَنْ يَمِينِي وَعَنْ شِمَالِي وَمِنْ فَوْقِي وَأَعُوذُ بِعَظَمَتِكَ أَنْ أُغْتَالَ مِنْ تَحْتِي", transliteration: "Allāhumma innī asʾalukal-ʿafwa wal-ʿāfiyata fid-dunyā wal-ākhirah, Allāhumma innī asʾalukal-ʿafwa wal-ʿāfiyata fī dīnī wa dunyāya wa ahlī wa mālī, Allāhummastur ʿawrātī wa āmin rawʿātī, Allāhummaḥfaẓnī min bayni yadayya wa min khalfī wa ʿan yamīnī wa ʿan shimālī wa min fawqī, wa aʿūdhu biʿaẓamatika an ughtāla min taḥtī.", translationKey: "athkar_morning_i6", count: 1, takhrij: "أبو داود وابن ماجه وانظر صحيح ابن ماجه 2/ 332", },
    { arabic: "اللَّهُمَّ عَالِمَ الغَيْبِ وَالشَّهَادَةِ، فَاطِرَ السَّمَوَاتِ وَالأَرْضِ، رَبَّ كُلِّ شَيْءٍ وَمَلِيكَهُ، أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا أَنْتَ أَعُوذُ بِكَ مِنْ شَرِّ نَفْسِي وَمِنْ شَرِّ الشَّيْطَانِ وَشِرْكِهِ وَأَنْ أَقْتَرِفَ عَلَى نَفْسِي سُوءًا أَوْ أَجُرَّهُ إِلَى مُسْلِمٍ", transliteration: "Allāhumma ʿālimal-ghaybi wash-shahādah, fāṭiras-samāwāti wal-arḍ, rabba kulli shayʾin wa malīkah, ashhadu an lā ilāha illā ant, aʿūdhu bika min sharri nafsī wa min sharrish-shayṭāni wa shirkih, wa an aqtarifa ʿalā nafsī sūʾan aw ajurrahu ilā muslim.", translationKey: "athkar_morning_i7", count: 1, takhrij: "التّرمذي وأبو داود .انظر :صحيح التّرمذي 3/ 142", },
    { arabic: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ عَدَدَ خَلْقِهِ وَرِضَا نَفْسِهِ وَزِنَةَ عَرْشِهِ وَمِدَادَ كَلِمَاتِهِ", transliteration: "Subḥānallāhi wa biḥamdih, ʿadada khalqih, wa riḍā nafsih, wa zinata ʿarshih, wa midāda kalimātih.", translationKey: "athkar_morning_i8", count: 3, takhrij: "مسلم 4/ 2090", },
    { arabic: "اللَّهُمَّ إِنِّي أَصْبَحْتُ أُشْهِدُكَ وَأُشْهِدُ حَمَلَةَ عَرْشِكَ، وَمَلَائِكَتَكَ وَجَمِيعَ خَلْقِكَ، أَنَّكَ أَنْتَ اللَّهُ لَا إِلَهَ إِلَّا أَنْتَ وَحْدَكَ لَا شَرِيكَ لَكَ، وَأَنَّ مُحَمَّدًا عَبْدُكَ وَرَسُولُكَ", transliteration: "Allāhumma innī aṣbaḥtu ushhiduka wa ushhidu ḥamalata ʿarshik, wa malāʾikataka wa jamīʿa khalqik, annaka antallāhu lā ilāha illā anta waḥdaka lā sharīka lak, wa anna Muḥammadan ʿabduka wa rasūluk.", translationKey: "athkar_morning_i9", count: 4, takhrij: "من قالها حين يصبح وحين يمسي أربع مرات أعتقه الله من النار . أخرجه أبو داود 4/ 317 والبخاري في الأدب المفرد برقم 1201 والنسائي في عمل اليوم والليلة برقم 9، وابن السني برقم 70 وحسن سماحة الشيخ ابن باز إسناد النسائي وأبي داود في تحفة الأخيار ص 23", },
    { arabic: "اللَّهُمَّ مَا أَصْبَحَ بِي مِنْ نِعْمَةٍ أَوْ بِأَحَدٍ مِنْ خَلْقِكَ فَمِنْكَ وَحْدَكَ لَا شَرِيكَ لَكَ، فَلَكَ الحَمْدُ وَلَكَ الشُّكْرُ", transliteration: "Allāhumma mā aṣbaḥa bī min niʿmatin aw biʾaḥadin min khalqik, faminka waḥdaka lā sharīka lak, falakal-ḥamdu wa lakash-shukr.", translationKey: "athkar_morning_i10", count: 1, takhrij: "من قالها حين يصبح فقد أدي شكر يومه، ومن قالها حين يمسى فقد أدى شكر ليلته. أخرجه أبو داود 4/ 318، والنسائي في عمل اليوم والليلة برقم 7 وابن السني برقم 41 وابن حبان \"موارد\"رقم 2361 وحسن ابن باز إسناده في تحفة الأخيار ص 24", },
    { arabic: "أَصْبَحْنَا وَأَصْبَحَ المُلْكُ لِلَّهِ رَبِّ العَالَمِينَ، اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَ هَذَا اليَوْمِ: فَتْحَهُ، وَنَصْرَهُ، وَنُورَهُ، وَبَرَكَتَهُ، وَهُدَاهُ، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِيهِ وَشَرِّ مَا بَعْدَهُ", transliteration: "Aṣbaḥnā wa aṣbaḥal-mulku lillāhi rabbil-ʿālamīn, Allāhumma innī asʾaluka khayra hādhal-yawm, fatḥah, wa naṣrah, wa nūrah, wa barakatah, wa hudāh, wa aʿūdhu bika min sharri mā fīh wa sharri mā baʿdah.", translationKey: "athkar_morning_i11", count: 1, takhrij: "أبو داود 4/ 322 وحسن إسناده شعيب وعبد القادر الأرناؤوط في تحقيق زاد المعاد 2/ 273", },
  ],
  evening: [
    { arabic: "اللَّهُمَّ إِنِّي أَمْسَيْتُ أُشْهِدُكَ وَأُشْهِدُ حَمَلَةَ عَرْشِكَ، وَمَلَائِكَتَكَ وَجَمِيعَ خَلْقِكَ، أَنَّكَ أَنْتَ اللَّهُ لَا إِلَهَ إِلَّا أَنْتَ وَحْدَكَ لَا شَرِيكَ لَكَ، وَأَنَّ مُحَمَّدًا عَبْدُكَ وَرَسُولُكَ", transliteration: "Allāhumma innī amsaytu ushhiduka wa ushhidu ḥamalata ʿarshik, wa malāʾikataka wa jamīʿa khalqik, annaka antallāhu lā ilāha illā anta waḥdaka lā sharīka lak, wa anna Muḥammadan ʿabduka wa rasūluk.", translationKey: "athkar_evening_i9", count: 4, takhrij: "من قالها حين يصبح وحين يمسي أربع مرات أعتقه الله من النار . أخرجه أبو داود 4/ 317 والبخاري في الأدب المفرد برقم 1201 والنسائي في عمل اليوم والليلة برقم 9، وابن السني برقم 70 وحسن سماحة الشيخ ابن باز إسناد النسائي وأبي داود في تحفة الأخيار ص 23", },
    { arabic: "اللَّهُمَّ مَا أَمْسَى بِي مِنْ نِعْمَةٍ أَوْ بِأَحَدٍ مِنْ خَلْقِكَ فَمِنْكَ وَحْدَكَ لَا شَرِيكَ لَكَ، فَلَكَ الحَمْدُ وَلَكَ الشُّكْرُ", transliteration: "Allāhumma mā amsā bī min niʿmatin aw biʾaḥadin min khalqik, faminka waḥdaka lā sharīka lak, falakal-ḥamdu wa lakash-shukr.", translationKey: "athkar_evening_i10", count: 1, takhrij: "من قالها حين يصبح فقد أدي شكر يومه، ومن قالها حين يمسى فقد أدى شكر ليلته. أخرجه أبو داود 4/ 318، والنسائي في عمل اليوم والليلة برقم 7 وابن السني برقم 41 وابن حبان \"موارد\"رقم 2361 وحسن ابن باز إسناده في تحفة الأخيار ص 24", },
    { arabic: "أَمْسَيْنَا وَأَمْسَى المُلْكُ لِلَّهِ رَبِّ العَالَمِينَ، اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَ هَذِهِ اللَّيْلَةِ: فَتْحَهَا، وَنَصْرَهَا، وَنُورَهَا، وَبَرَكَتَهَا، وَهُدَاهَا، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِيهَا وَشَرِّ مَا بَعْدَهَا", transliteration: "Amsaynā wa amsal-mulku lillāhi rabbil-ʿālamīn, Allāhumma innī asʾaluka khayra hādhihil-laylah, fatḥahā, wa naṣrahā, wa nūrahā, wa barakatahā, wa hudāhā, wa aʿūdhu bika min sharri mā fīhā wa sharri mā baʿdahā.", translationKey: "athkar_evening_i11", count: 1, takhrij: "أبو داود 4/ 322 وحسن إسناده شعيب وعبد القادر الأرناؤوط في تحقيق زاد المعاد 2/ 273", },
  ],
  sleep: [
    { arabic: "اللَّهُمَّ إِنَّكَ خَلَقْتَ نَفْسِي وَأَنْتَ تَوَفَّاهَا، لَكَ مَمَاتُهَا وَمَحْيَاهَا، إِنْ أَحْيَيْتَهَا فَاحْفَظْهَا، وَإِنْ أَمَتَّهَا فَاغْفِرْ لَهَا، اللَّهُمَّ إِنِّي أَسْأَلُكَ العَافِيَةَ", transliteration: "Allāhumma innaka khalaqta nafsī wa anta tawaffāhā, laka mamātuhā wa maḥyāhā, in aḥyaytahā faḥfaẓhā, wa in amattahā faghfir lahā, Allāhumma innī asʾalukal-ʿāfiyah.", translationKey: "athkar_sleep_i1", count: 1, takhrij: "أخرجه مسلم 4/ 2083 وأحمد بلفظه 2/ 79", },
    { arabic: "اللَّهُمَّ رَبَّ السَّمَوَاتِ السَّبْعِ وَرَبَّ الأَرْضِ، وَرَبَّ العَرْشِ العَظِيمِ، رَبَّنَا وَرَبَّ كُلَّ شَيْءٍ، فَالِقَ الحَبِّ وَالنَّوَى، وَمُنْزِلَ التَّوْرَاةِ وَالِإنْجِيلِ، وَالفُرْقَانِ، أَعُوذُ بِكَ مِنْ شَرِّ كُلِّ شَيْءٍ أَنْتَ آخِذٌ بِنَاصِيَتِهِ، اللَّهُمَّ أَنْتَ الأَوَّلُ فَلَيْسَ قَبْلَكَ شَيْءٌ، وَأَنْتَ الآخِرُ فَلَيْسَ بَعْدَكَ شَيْءٌ، وَأَنْتَ الظَّاهِرُ فَلَيْسَ فَوْقَكَ شَيْءٌ، وَأَنْتَ البَاطِنُ فَلَيْسَ دُونَكَ شَيْءٌ، اقْضِ عَنَّا الدَّيْنَ وَاغْنِنَا مِنَ الفَقْرِ", transliteration: "Allāhumma rabbas-samāwātis-sabʿi wa rabbal-arḍ, wa rabbal-ʿarshil-ʿaẓīm, rabbanā wa rabba kulli shayʾin, fāliqal-ḥabbi wan-nawā, wa munzilat-tawrāti wal-injīli wal-furqān, aʿūdhu bika min sharri kulli shayʾin anta ākhidhun bināṣiyatih, Allāhumma antal-awwalu falaysa qablaka shayʾun, wa antal-ākhiru falaysa baʿdaka shayʾun, wa antaẓ-ẓāhiru falaysa fawqaka shayʾun, wa antal-bāṭinu falaysa dūnaka shayʾun, iqḍi ʿannad-dayna wa aghninā minal-faqr.", translationKey: "athkar_sleep_i2", count: 1, takhrij: "مسلم 4/ 2084", },
    { arabic: "الحَمْدُ لِلَّهِ الذِي أَطْعَمَنَا وَسَقَانَا وَكَفَانَا وَآوَانَا فَكَمْ مِمَّنْ لَا كَافِيَ لَهُ وَلَا مُؤْوِي", transliteration: "Al-ḥamdu lillāhil-ladhī aṭʿamanā wa saqānā wa kafānā wa āwānā, fakam mimman lā kāfiya lahu wa lā muʾwī.", translationKey: "athkar_sleep_i3", count: 1, takhrij: "مسلم 4/ 2085", },
    { arabic: "لَا إِلَهِ إِلَّا اللَّهُ الوَاحِدُ القَهَّارُ، رَبُّ السَّمَوَاتِ وَالأَرْضِ وَمَا بَيْنَهُمَا العَزِيزُ الغَفَّارُ", transliteration: "Lā ilāha illallāhul-wāḥidul-qahhār, rabbus-samāwāti wal-arḍi wa mā baynahumal-ʿazīzul-ghaffār.", translationKey: "athkar_sleep_i4", count: 1, takhrij: "يقول ذلك إذا تقلّب من جنب إلى جنب. أخرجه الحاكم وصححه ووافقه الذّهبي 1/ 540 والنّسائي في عمل اليوم والّيلة، وابن السّني، وانظر صحيح الجامع 4/ 213", },
  ],
  qunut: [
    { arabic: "اللَّهُمَّ إِيَّاكَ نَعْبُدُ، وَلَكَ نُصَلِّي وَنَسْجُدُ، وَإِلَيْكَ نَسْعَى وَنَحْفِدُ، نَرْجُو رَحْمَتَكَ وَنَخْشَى عَذَابَكَ، إِنَّ عَذَابَكَ بِالكَافِرِينَ مُلْحَقٌ. اللَّهُمَّ إِنَّا نَسْتَعِينُكَ، وَنَسْتَغْفِرُكَ، وَنُثْنِي عَلَيْكَ الخَيْرَ، وَلَا نَكْفُرُكَ، وَنُؤْمِنُ بِكَ، وَنَخْضَعُ لَكَ، وَنَخْلَعُ مَنْ يَكْفُرُكَ", transliteration: "Allāhumma iyyāka naʿbud, wa laka nuṣallī wa nasjud, wa ilayka nasʿā wa naḥfid, narjū raḥmataka wa nakhshā ʿadhābak, inna ʿadhābaka bil-kāfirīna mulḥaq. Allāhumma innā nastaʿīnuka, wa nastaghfiruka, wa nuthnī ʿalaykal-khayr, wa lā nakfuruk, wa nuʾminu bik, wa nakhḍaʿu lak, wa nakhlaʿu man yakfuruk.", translationKey: "athkar_qunut_i1", count: 1, takhrij: "أخرجه البيهقيّ في السّنن الكبرى وصحح إسناده 2/ 211، وقال الشّيخ الألباني في إرواء الغليل: وهذا إسناده صحيح 2/ 170. وهو موقوف على عمر", },
  ],
  fear_people: [
    { arabic: "اللَّهُمَّ أَنْتَ عَضُدِي، وَأَنْتَ نَصِيرِي، بِكَ أَجُولُ، وَبِكَ أَصُولُ، وَبِكَ أُقَاتِلُ", transliteration: "Allāhumma anta ʿaḍudī, wa anta naṣīrī, bika ajūl, wa bika aṣūl, wa bika uqātil.", translationKey: "athkar_fear_people_i1", count: 1, takhrij: "أبو داود 3/ 42 والتّرمذي 5/ 572، وانظر صحيح التّرمذي 3/ 183", },
    { arabic: "اللَّهُمَّ مُنْزِلَ الكِتَابِ، سَرِيعَ الحِسَابِ، اِهْزِمْ الأَحْزَابَ، اللَّهُمَّ اِهْزِمْهُمْ وَزَلْزِلْهُمْ", transliteration: "Allāhumma munzilal-kitāb, sarīʿal-ḥisāb, ihzimil-aḥzāb, Allāhummahzimhum wa zalzilhum.", translationKey: "athkar_fear_people_i2", count: 1, takhrij: "مسلم 3/ 1362", },
    { arabic: "اللَّهُمَّ اِكْفِنِيهُمْ بِمَا شِئْتَ", transliteration: "Allāhummakfinīhim bimā shiʾt.", translationKey: "athkar_fear_people_i3", count: 1, takhrij: "مسلم 4/ 2300", },
  ],
  waswas: [
    { arabic: "أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ التِي لَا يُجَاوِزُهُنَّ بَرٌّ وَلَا فَاجِرٌ مِنْ شَرِّ مَا خَلَقَ، وَبَرَأَ وَذَرَأَ، وَمِنْ شَرِّ مَا يَنْزِلُ مِنَ السَّمَاءِ، وَمِنْ شَرِّ مَا يَعْرُجُ فِيهَا، وَمِنْ شَرِّ مَا ذَرَأَ فِي الأَرْضِ، وَمِنْ شَرِّ مَا يَخْرُجُ مِنْهَا، وَمِنْ شَرِّ فِتَنِ اللَّيْلِ وَالنَّهَارِ، وَمِنْ شَرِّ كُلِّ طَارِقٍ إِلَّا طَارِقًا يَطْرُقُ بِخَيْرً يَا رَحْمَانُ", transliteration: "Aʿūdhu bikalimātillāhit-tāmmātil-latī lā yujāwizuhunna barrun wa lā fājirun min sharri mā khalaq, wa baraʾa wa dharaʾ, wa min sharri mā yanzilu minas-samāʾ, wa min sharri mā yaʿruju fīhā, wa min sharri mā dharaʾa fil-arḍ, wa min sharri mā yakhruju minhā, wa min sharri fitanil-layli wan-nahār, wa min sharri kulli ṭāriqin illā ṭāriqan yaṭruqu bikhayrin yā raḥmān.", translationKey: "athkar_waswas_i6", count: 1, takhrij: "أحمد 3/ 419 بإسناد صحيح وابن السّني برقم 637 وصحّح إسناده الأرناؤوط في تخريجه للطّحاوية ص 133 وانظر مجمع الزوائد 10/ 127", },
  ],
  faraj: [
    { arabic: "اللَّهُمَّ لَا سَهْلَ إِلَّا مَا جَعَلْتَهُ سَهْلًا وَأَنْتَ تَجْعَلُ الحَزْنَ إِذَا شِئْتَ سَهْلًا", transliteration: "Allāhumma lā sahla illā mā jaʿaltahu sahlā, wa anta tajʿalul-ḥazna idhā shiʾta sahlā.", translationKey: "athkar_faraj_i1", count: 1, takhrij: "رواه ابن حبان في صحيحه برقم 2427 (موارد) وابن السّنّي برقم 351 وقال الحافظ: هذا حديث صحيح، وصحّحه عبدالقادر الأرناؤوط في تخريج الأذكار للنّووي ص 106", },
    { arabic: "قَدَرُ اللَّهِ. وَمَا شَاءَ فَعَلْ", transliteration: "Qadarullāh, wa mā shāʾa faʿal.", translationKey: "athkar_faraj_i2", count: 1, takhrij: "{المؤمن القويّ خير وأحبّ إلى اللّه من المؤمن الضعيف وفي كلّ خير، احرص على ما ينفعك واستعن باللّه ولا تعجز، وإن أصابك شيء فلا تقل لو أنّي فعلت كذا وكذا، ولكن قل: قَدَرُ اللّه. وما شاء فعل، فإنّ لو تفتح عمل الشّيطان} مسلم 4/ 2052", },
  ],
  istighfar: [
    { arabic: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ أَنْ أُشْرِكَ بِكَ وَأَنَا أَعْلَمُ، وَأَسْتَغْفِرُكَ لِمَا لَا أَعْلَمُ", transliteration: "Allāhumma innī aʿūdhu bika an ushrika bika wa anā aʿlam, wa astaghfiruka limā lā aʿlam.", translationKey: "athkar_istighfar_i2", count: 1, takhrij: "أحمد 4/ 403 وغيره وانظر صحيح الجامع 3/ 233 وصحيح التّرغيب والتّرهيب للألباني 1/ 19", },
  ],
  dying: [
    { arabic: "لَا إِلَهَ إِلَّا اللَّهُ وَاللَّهُ أَكْبَرُ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ، لَاإِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَا إِلَهَ إِلَّا اللَّهُ لَهُ المُلْكُ وَلَهُ الحَمْدُ، لَا إِلَهَ إِلَّا اللَّهُ وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ", transliteration: "Lā ilāha illallāhu wallāhu akbar, lā ilāha illallāhu waḥdah, lā ilāha illallāhu waḥdahu lā sharīka lah, lā ilāha illallāhu lahul-mulku wa lahul-ḥamd, lā ilāha illallāhu wa lā ḥawla wa lā quwwata illā billāh.", translationKey: "athkar_dying_i2", count: 1, takhrij: "أخرجه التّرمذي وابن ماجة وصحّحه الألبانيّ، انظر صحيح التّرمذي 3/ 152 وصحيح ابن ماجة 2/ 317", },
    { arabic: "بِسْمِ اللَّهِ وَعَلَى سُنَّةِ رَسُولِ اللَّهِ", transliteration: "Bismillāhi wa ʿalā sunnati rasūlillāh.", translationKey: "athkar_dying_i3", count: 1, takhrij: "أبو داود 3/ 314 بسند صحيح وأحمد بلفظ: بسم اللّه وعلى ملّة رسول اللّه. وسنده صحيح", },
  ],
  janazah: [
    { arabic: "اللَّهُمَّ عَبْدُكَ وَاِبْنُ أَمَتِكَ اِحْتَاجَ إِلَى رَحْمَتِكَ، وَأَنْتَ غَنِيٌّ عَنْ عَذَابِهِ، إِنْ كَانَ مُحْسِنًا فَزِدْ فِي حَسَنَاتِهِ، وَإِنْ كَانَ مُسِيئًا فَتَجَاوَزْ عَنْهُ", transliteration: "Allāhumma ʿabduka wabnu amatika iḥtāja ilā raḥmatik, wa anta ghaniyyun ʿan ʿadhābih, in kāna muḥsinan fazid fī ḥasanātih, wa in kāna musīʾan fatajāwaz ʿanh.", translationKey: "athkar_janazah_i1", count: 1, takhrij: "أخرجه الحاكم وصحّحه ووافقه الذّهبيّ 1/ 359 وانظر أحكام الجنائز للألبانيّ ص 125", },
    { arabic: "اللَّهُمَّ أَعِذْهُ مِنْ عَذَابِ القَبْرِ", transliteration: "Allāhumma aʿidhhu min ʿadhābil-qabr.", translationKey: "athkar_janazah_i2", count: 1, takhrij: "قال سعيد بن المسيّب صلّيت وراء أبي هريرة على صبيّ لم يعمل خطيئة قطّ فسمعته يقول: 'الحديث'. أخرجه مالك في الموطّأ 1/ 288 وابن أبي شيبة في المصنّف 3/ 217 والبيهقي 4/ 9، وصحّح إسناده شعيب الأرناؤوط في تحقيقه لشرح السّنّة للبغوي 5/ 357", },
    { arabic: "اللَّهُمَّ اِجْعَلْهُ لَنَا فَرَطًا، وَسَلَفًا، وَأَجْرًا", transliteration: "Allāhummajʿalhu lanā faraṭā, wa salafā, wa ajrā.", translationKey: "athkar_janazah_i3", count: 1, takhrij: "كان الحَسَن يقرأ على الطّفل بفاتحة الكتاب ويقول: 'الحديث'. أخرجه البغوي في شرح السّنّة 5/ 357، وعبد الرزّاق برقم 6588، وعلّقه البخاري في كتاب الجنائز 65 باب قراءة فاتحة الكتاب على الجنازة 2/ 113", },
  ],
  graves: [
    { arabic: "اللَّهُمَّ اِغْفِرْ لَهُ، اللَّهُمَّ ثَبِّتْهُ", transliteration: "Allāhummaghfir lah, Allāhumma thabbith.", translationKey: "athkar_graves_i1", count: 1, takhrij: "كان النّبيّ صلّى اللّه عليه وسلّم إذا فرغ من دفن الميّت وقف عليه وقال: (استغفروا لأخيكم وسلوا له التّثبيت، فإنّه الآن يُسأل). أبو داود 3/ 315، والحاكم وصحّحه ووافقه الذّهبيّ 1/ 370", },
  ],
  rain: [
    { arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَهَا، وَأَعُوذُ بِكَ مِنْ شَرِّهَا", transliteration: "Allāhumma innī asʾaluka khayrahā, wa aʿūdhu bika min sharrihā.", translationKey: "athkar_rain_i1", count: 1, takhrij: "أخرجه أبو داود 4/ 326 وابن ماجة 2/ 1228 وانظر صحيح ابن ماجة 2/ 305", },
  ],
  istisqa: [
    { arabic: "اللَّهُمَّ اَسْقِنَا غَيْثًا مُغِيثًا مَرِيئًا مَرِيعًا، نَافِعًا غَيْرَ ضَارٍّ، عَاجِلًا غَيْرَ آجِلٍ", transliteration: "Allāhummasqinā ghaythan mughīthan marīʾan marīʿā, nāfiʿan ghayra ḍārr, ʿājilan ghayra ājil.", translationKey: "athkar_istisqa_i1", count: 1, takhrij: "أبو داود 1/ 303 وصحّحه الألباني في صحيح أبي داود 1/ 216", },
    { arabic: "اللَّهُمَّ حَوَالَيْنَا وَلَا عَلَيْنَا، اللَّهُمَّ عَلَى الآكَامِ وَالظِّرَابِ، وَبُطُونِ الأَوْدِيَةِ، وَمَنَابِتِ الشَّجَرِ", transliteration: "Allāhumma ḥawālaynā wa lā ʿalaynā, Allāhumma ʿalal-ākāmi waẓ-ẓirāb, wa buṭūnil-awdiyah, wa manābitish-shajar.", translationKey: "athkar_istisqa_i2", count: 1, takhrij: "البخاري 1/ 224 ومسلم 2/ 614", },
  ],
  food: [
    { arabic: "اللَّهُمَّ بَارِكْ لَهُمْ فِيمَا رَزَقْتَهُمْ، وَاغْفِرْ لَهُمْ وَارْحَمْهُمْ", transliteration: "Allāhumma bārik lahum fīmā razaqtahum, waghfir lahum warḥamhum.", translationKey: "athkar_food_i1", count: 1, takhrij: "مسلم 3/ 1615", },
  ],
  iftar: [
    { arabic: "أَفْطَرَ عِنْدَكُمُ الصَّائِمُونَ، وَأَكَلَ طَعَامَكُمُ الأَبْرَارُ، وَصَلَّتْ عَلَيْكُمُ المَلَائِكَةُ", transliteration: "Afṭara ʿindakumuṣ-ṣāʾimūn, wa akala ṭaʿāmakumul-abrār, wa ṣallat ʿalaykumul-malāʾikah.", translationKey: "athkar_iftar_i1", count: 1, takhrij: "سنن أبي داود 3/ 367، وابن ماجة 1/ 556، والنّسائي في عمل اليوم واللّيلة برقم: 296 - 298، ونصّ على أنّه صلّى اللّه عليه وسلّم يقوله إذا أفطر عند أهل بيت، وصحّحه الألباني في صحيح أبي داود 2/ 730", },
  ],
  wedding: [
    { arabic: "بِسْمِ اللَّهِ، اللَّهُمَّ جَنِّبْنَا الشَّيْطَانَ وَجَنِّبْ الشَّيْطَانَ مَا رَزَقْتَنَا", transliteration: "Bismillāh, Allāhumma jannibnash-shayṭāna wa jannibish-shayṭāna mā razaqtanā.", translationKey: "athkar_wedding_i1", count: 1, takhrij: "البخاري 6/ 141 ومسلم 2/ 1028", },
  ],
  fitnah: [
  ],
  debt: [
    { arabic: "بَارَكَ اللَّهُ لَكَ فِي أَهْلِكَ وَمَالِكَ، إِنَّمَا جَزَاءُ السَّلَفِ الحَمْدُ وَالأَدَاءُ", transliteration: "Bārakallāhu laka fī ahlika wa mālik, innamā jazāʾus-salafil-ḥamdu wal-adāʾ.", translationKey: "athkar_debt_i1", count: 1, takhrij: "أخرجه النّسائي في عمل اليوم واللّيلة ص 300 وابن ماجة 2/ 809 وانظر صحيح ابن ماجة 2/ 55", },
  ],
  travel: [
    { arabic: "أَسْتَوْدِعُكُمُ اللَّهَ الذِي لَا تَضِيعُ وَدَائِعُهُ", transliteration: "Astawdiʿukumullāhal-ladhī lā taḍīʿu wadāʾiʿuh.", translationKey: "athkar_travel_i1", count: 1, takhrij: "أحمد 2/ 403 وابن ماجة 2/ 943 وانظر صحيح ابن ماجة 2/ 133", },
    { arabic: "أَسْتَوْدِعُ اللَّهَ دِينَكَ، وَأَمَانَتَكَ، وَخَوَاتِيمَ عَمَلِكَ", transliteration: "Astawdiʿullāha dīnak, wa amānatak, wa khawātīma ʿamalik.", translationKey: "athkar_travel_i2", count: 1, takhrij: "أحمد 2/ 7 والتّرمذي 5/ 499 وانظر صحيح التّرمذي 2/ 155", },
    { arabic: "زَوَّدَكَ اللَّهُ التَّقْوَى، وَغَفَرَ ذَنْبَكَ، وَيَسَّرَ لَكَ الخَيْرَ حَيْثُ مَا كُنْتَ", transliteration: "Zawwadakallāhut-taqwā, wa ghafara dhanbak, wa yassara lakal-khayra ḥaythu mā kunt.", translationKey: "athkar_travel_i3", count: 1, takhrij: "التّرمذي وانظر صحيح التّرمذي 3/ 155", },
    { arabic: "سَمَّـِعَ سَامِعٌ بِحَمْدِ اللَّهِ، وَحُسْنِ بَلَائِهِ عَلَيْنَا. رَبَّنَا صَاحِبْنَا، وَأَفْضِلْ عَلَيْنَا عَائِذًا بِاللَّهِ مِنَ النَّارِ", transliteration: "Sammaʿa sāmiʿun biḥamdillāh, wa ḥusni balāʾihi ʿalaynā, rabbanā ṣāḥibnā, wa afḍil ʿalaynā ʿāʾidhan billāhi minan-nār.", translationKey: "athkar_travel_i4", count: 1, takhrij: "مسلم 4/ 2086 ومعنى سمِع سامع: أي شهد شاهد على حمدنا للّه تعالى على نعمه وحسن بلائه. ومعنى سمَّع سامع: بلّغ سامع قولي هذا لغيره وقال مثله تنبيها على الذِّكر في السّحر والدعاء. وقوله: ربّنا صاحبنا وأفضل علينا: أي احفظنا وحطنا واكلأنا وأفضل علينا بجزيل نعمك واصرف عنّا كلّ مكروه، شرح النّووي 17/ 39", },
  ],
  rooster: [
  ],
  arafah: [
  ],
  blessing_joy: [
  ],
  after_prayer: [
  ],
};
for (const _c of ATHKAR_CATEGORIES) if (IMPORTED_ADHKAR[_c.id]) _c.adhkar.push(...IMPORTED_ADHKAR[_c.id]);

const ORDER = [
  // PAGE 1 (1-16)
  'morning','evening','after_prayer','waking','wudu','sleep',
  'istighfar','ruqyah','bathroom','anxiety','distress','fear',
  'friday','quranic','parents','rizq',
  // PAGE 2 (17-32)
  'debt','faraj','calamity','hajah','istikhara','travel',
  'visiting_sick','quran_khatm','salawat','adhan_response',
  'food','iftar','clothing','market','leaving_home','entering_home',
  // PAGE 3 (33-47, slot 48 is empty placeholder)
  'mosque','qunut','janazah','death','graves','wedding',
  'return_travel','waswas','fitnah','oppressed','new_moon',
  'gathering','rain','anger','kaffarah',
  // PAGE 4 (49-64)
  'laylatul_qadr','arafah','fasting','newborn','children_protection','condolences',
  'going_prayer','after_tashahhud','in_prayer','entering_town','fear_people','dying','rooster',
  'amazement','blessing_joy','eclipse','istisqa',
];

const _ORDERED = ORDER.map(id => ATHKAR_CATEGORIES.find(c => c.id === id)!) as AthkarCategory[];

const _ruqyah = _ORDERED.find(c => c.id === 'ruqyah');
const _morning = _ORDERED.find(c => c.id === 'morning');
const _waking = _ORDERED.find(c => c.id === 'waking');
console.log('Ruqyah icon set to:', _ruqyah?.icon);
console.log('Morning icon set to:', _morning?.icon);
console.log('Waking icon set to:', _waking?.icon);

export default _ORDERED;
