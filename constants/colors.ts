export type AccessibilityTheme =
  | 'default'
  | 'high-contrast'
  | 'colorblind'
  | 'warm'
  | 'blossom'
  | 'ocean'
  | 'violet';

export interface ColorPalette {
  background:       string;
  backgroundSecond: string;
  backgroundCard:   string;
  text:             string;
  textSecond:       string;
  textMuted:        string;
  tint:             string;
  tintLight:        string;
  tintDark:         string;
  tintText:         string;
  tabIconDefault:   string;
  tabIconSelected:  string;
  separator:        string;
  gold:             string;
  goldLight:        string;
  danger:           string;
  surface:          string;
  heroCardBg:           string;
  heroCardText:         string;
  heroCardSubtext:      string;
  fontWeightNormal:     '400' | '700';
}

const palettes: Record<AccessibilityTheme, { light: ColorPalette; dark: ColorPalette }> = {

  // ── Default ─────────────────────────────────────────────────────────────────
  default: {
    light: {
      background:       '#F2F2F7',
      backgroundSecond: '#E5E5EA',
      backgroundCard:   '#FFFFFF',
      text:             '#0c2a1a',
      textSecond:       '#1e4832',
      textMuted:        '#3a6b4e',
      tint:             '#1a7a4a',
      tintLight:        'rgba(26,122,74,0.09)',
      tintDark:         '#155e3a',
      tintText:         '#FFFFFF',
      tabIconDefault:   '#AEAEB2',
      tabIconSelected:  '#1a7a4a',
      separator:        'rgba(60,60,67,0.18)',
      gold:             '#B8860B',
      goldLight:        '#FFF8E0',
      danger:           '#FF3B30',
      surface:          'rgba(26,122,74,0.08)',
      heroCardBg:       'rgba(26,122,74,0.82)',
      heroCardText:     '#FFFFFF',
      heroCardSubtext:  'rgba(255,255,255,0.72)',
      fontWeightNormal: '400',
    },
    dark: {
      background:       '#000000',
      backgroundSecond: '#1C1C1E',
      backgroundCard:   '#2C2C2E',
      text:             '#FFFFFF',
      textSecond:       '#EBEBF5',
      textMuted:        '#AEAEB2',
      tint:             '#34C759',
      tintLight:        'rgba(52,199,89,0.14)',
      tintDark:         '#30D158',
      tintText:         '#000000',
      tabIconDefault:   'rgba(255,255,255,0.28)',
      tabIconSelected:  '#34C759',
      separator:        'rgba(255,255,255,0.10)',
      gold:             '#FFD60A',
      goldLight:        'rgba(255,214,10,0.14)',
      danger:           '#FF453A',
      surface:          'rgba(52,199,89,0.10)',
      heroCardBg:       'rgba(28,94,53,0.84)',
      heroCardText:     '#FFFFFF',
      heroCardSubtext:  'rgba(255,255,255,0.68)',
      fontWeightNormal: '400',
    },
  },

  // ── High Contrast ───────────────────────────────────────────────────────────
  'high-contrast': {
    light: {
      background:       '#FFFFFF',
      backgroundSecond: '#F0F0F0',
      backgroundCard:   '#FFFFFF',
      text:             '#000000',
      textSecond:       '#000000',
      textMuted:        '#000000',
      tint:             '#000000',
      tintLight:        'rgba(0,0,0,0.06)',
      tintDark:         '#000000',
      tintText:         '#FFFFFF',
      tabIconDefault:   '#6C6C6C',
      tabIconSelected:  '#000000',
      separator:        'rgba(0,0,0,0.40)',
      gold:             '#6B4E00',
      goldLight:        '#FFF3C0',
      danger:           '#CC0000',
      surface:          'rgba(0,0,0,0.06)',
      heroCardBg:       'rgba(0,0,0,0.88)',
      heroCardText:     '#FFFFFF',
      heroCardSubtext:  'rgba(255,255,255,0.78)',
      fontWeightNormal: '700',
    },
    dark: {
      background:       '#000000',
      backgroundSecond: '#111111',
      backgroundCard:   '#1A1A1A',
      text:             '#FFFFFF',
      textSecond:       '#FFFFFF',
      textMuted:        '#CCCCCC',
      tint:             '#FFFFFF',
      tintLight:        'rgba(255,255,255,0.10)',
      tintDark:         '#FFFFFF',
      tintText:         '#000000',
      tabIconDefault:   'rgba(255,255,255,0.45)',
      tabIconSelected:  '#FFFFFF',
      separator:        'rgba(255,255,255,0.35)',
      gold:             '#FFE033',
      goldLight:        'rgba(255,224,51,0.18)',
      danger:           '#FF5555',
      surface:          'rgba(255,255,255,0.08)',
      heroCardBg:       'rgba(255,255,255,0.92)',
      heroCardText:     '#000000',
      heroCardSubtext:  'rgba(0,0,0,0.62)',
      fontWeightNormal: '700',
    },
  },

  // ── Color Blind (deuteranopia-friendly) ─────────────────────────────────────
  colorblind: {
    light: {
      background:       '#F2F2F7',
      backgroundSecond: '#E5E5EA',
      backgroundCard:   '#FFFFFF',
      text:             '#001A33',
      textSecond:       '#002952',
      textMuted:        '#3A5A80',
      tint:             '#0055CC',
      tintLight:        'rgba(0,85,204,0.09)',
      tintDark:         '#003D99',
      tintText:         '#FFFFFF',
      tabIconDefault:   '#AEAEB2',
      tabIconSelected:  '#0055CC',
      separator:        'rgba(60,60,67,0.18)',
      gold:             '#CC6600',
      goldLight:        '#FFF0D9',
      danger:           '#CC0000',
      surface:          'rgba(0,85,204,0.08)',
      heroCardBg:       'rgba(0,61,153,0.82)',
      heroCardText:     '#FFFFFF',
      heroCardSubtext:  'rgba(255,255,255,0.72)',
      fontWeightNormal: '400',
    },
    dark: {
      background:       '#000000',
      backgroundSecond: '#1C1C1E',
      backgroundCard:   '#2C2C2E',
      text:             '#FFFFFF',
      textSecond:       '#EBEBF5',
      textMuted:        '#AEAEB2',
      tint:             '#409CFF',
      tintLight:        'rgba(64,156,255,0.14)',
      tintDark:         '#5AACFF',
      tintText:         '#000000',
      tabIconDefault:   'rgba(255,255,255,0.28)',
      tabIconSelected:  '#409CFF',
      separator:        'rgba(255,255,255,0.10)',
      gold:             '#FF9F0A',
      goldLight:        'rgba(255,159,10,0.15)',
      danger:           '#FF6B6B',
      surface:          'rgba(64,156,255,0.10)',
      heroCardBg:       'rgba(0,50,130,0.84)',
      heroCardText:     '#FFFFFF',
      heroCardSubtext:  'rgba(255,255,255,0.68)',
      fontWeightNormal: '400',
    },
  },

  // ── Warm (amber / reduced blue-light) ───────────────────────────────────────
  warm: {
    light: {
      background:       '#FDF6E3',
      backgroundSecond: '#F5E6C8',
      backgroundCard:   '#FFFBF0',
      text:             '#2C1810',
      textSecond:       '#3D2B20',
      textMuted:        '#6B4C3B',
      tint:             '#8C6400',
      tintLight:        'rgba(140,100,0,0.10)',
      tintDark:         '#6B4C00',
      tintText:         '#FFFFFF',
      tabIconDefault:   '#A08060',
      tabIconSelected:  '#8C6400',
      separator:        'rgba(100,60,30,0.22)',
      gold:             '#8C6400',
      goldLight:        '#FFF3CC',
      danger:           '#CC3300',
      surface:          'rgba(140,100,0,0.09)',
      heroCardBg:       'rgba(107,76,0,0.82)',
      heroCardText:     '#FFFFFF',
      heroCardSubtext:  'rgba(255,255,255,0.72)',
      fontWeightNormal: '400',
    },
    dark: {
      background:       '#1A0F0A',
      backgroundSecond: '#2A1A10',
      backgroundCard:   '#3D2415',
      text:             '#FFE4B5',
      textSecond:       '#FFCC99',
      textMuted:        '#CC9966',
      tint:             '#E8A000',
      tintLight:        'rgba(232,160,0,0.15)',
      tintDark:         '#D49200',
      tintText:         '#000000',
      tabIconDefault:   'rgba(255,180,100,0.40)',
      tabIconSelected:  '#E8A000',
      separator:        'rgba(255,180,100,0.18)',
      gold:             '#FFD060',
      goldLight:        'rgba(255,208,96,0.15)',
      danger:           '#FF6633',
      surface:          'rgba(232,160,0,0.10)',
      heroCardBg:       'rgba(74,48,0,0.84)',
      heroCardText:     '#FFE4B5',
      heroCardSubtext:  'rgba(255,228,181,0.68)',
      fontWeightNormal: '400',
    },
  },

  // ── Blossom (rose / soft pink) ───────────────────────────────────────────────
  blossom: {
    light: {
      background:       '#FFF5F7',
      backgroundSecond: '#FFE8EC',
      backgroundCard:   '#FFFFFF',
      text:             '#2D0F17',
      textSecond:       '#4A1F2A',
      textMuted:        '#8B4A58',
      tint:             '#B83255',
      tintLight:        'rgba(184,50,85,0.09)',
      tintDark:         '#902840',
      tintText:         '#FFFFFF',
      tabIconDefault:   '#AEAEB2',
      tabIconSelected:  '#B83255',
      separator:        'rgba(180,60,90,0.18)',
      gold:             '#B87200',
      goldLight:        '#FFF0E0',
      danger:           '#CC2244',
      surface:          'rgba(184,50,85,0.08)',
      heroCardBg:       'rgba(184,50,85,0.80)',
      heroCardText:     '#FFFFFF',
      heroCardSubtext:  'rgba(255,255,255,0.74)',
      fontWeightNormal: '400',
    },
    dark: {
      background:       '#1A070C',
      backgroundSecond: '#2A1018',
      backgroundCard:   '#3D1825',
      text:             '#FFE8EC',
      textSecond:       '#FFCCDD',
      textMuted:        '#DD8899',
      tint:             '#FF7AA0',
      tintLight:        'rgba(255,122,160,0.14)',
      tintDark:         '#FF6090',
      tintText:         '#1A0009',
      tabIconDefault:   'rgba(255,150,180,0.40)',
      tabIconSelected:  '#FF7AA0',
      separator:        'rgba(255,120,155,0.18)',
      gold:             '#FFAD60',
      goldLight:        'rgba(255,173,96,0.15)',
      danger:           '#FF5577',
      surface:          'rgba(255,122,160,0.10)',
      heroCardBg:       'rgba(140,35,70,0.84)',
      heroCardText:     '#FFFFFF',
      heroCardSubtext:  'rgba(255,255,255,0.68)',
      fontWeightNormal: '400',
    },
  },

  // ── Ocean (sky blue / serene) ────────────────────────────────────────────────
  ocean: {
    light: {
      background:       '#F0F8FF',
      backgroundSecond: '#DFF0FA',
      backgroundCard:   '#FFFFFF',
      text:             '#001833',
      textSecond:       '#00264D',
      textMuted:        '#3A6080',
      tint:             '#0B6FAA',
      tintLight:        'rgba(11,111,170,0.09)',
      tintDark:         '#085585',
      tintText:         '#FFFFFF',
      tabIconDefault:   '#AEAEB2',
      tabIconSelected:  '#0B6FAA',
      separator:        'rgba(60,90,120,0.18)',
      gold:             '#CC8800',
      goldLight:        '#FFF4D6',
      danger:           '#CC2200',
      surface:          'rgba(11,111,170,0.08)',
      heroCardBg:       'rgba(11,111,170,0.80)',
      heroCardText:     '#FFFFFF',
      heroCardSubtext:  'rgba(255,255,255,0.74)',
      fontWeightNormal: '400',
    },
    dark: {
      background:       '#020E1A',
      backgroundSecond: '#061828',
      backgroundCard:   '#0D253F',
      text:             '#E0F0FF',
      textSecond:       '#C0DEFF',
      textMuted:        '#80AACC',
      tint:             '#4FC3F7',
      tintLight:        'rgba(79,195,247,0.14)',
      tintDark:         '#60CFFF',
      tintText:         '#000A14',
      tabIconDefault:   'rgba(100,180,240,0.40)',
      tabIconSelected:  '#4FC3F7',
      separator:        'rgba(100,180,240,0.18)',
      gold:             '#FFB830',
      goldLight:        'rgba(255,184,48,0.15)',
      danger:           '#FF4433',
      surface:          'rgba(79,195,247,0.10)',
      heroCardBg:       'rgba(8,60,110,0.84)',
      heroCardText:     '#E0F0FF',
      heroCardSubtext:  'rgba(224,240,255,0.68)',
      fontWeightNormal: '400',
    },
  },

  // ── Violet (lavender / dreamy) ───────────────────────────────────────────────
  violet: {
    light: {
      background:       '#F8F4FF',
      backgroundSecond: '#EEE5FF',
      backgroundCard:   '#FFFFFF',
      text:             '#1C0A33',
      textSecond:       '#2E1455',
      textMuted:        '#6B4A8A',
      tint:             '#6B3FA0',
      tintLight:        'rgba(107,63,160,0.09)',
      tintDark:         '#52307A',
      tintText:         '#FFFFFF',
      tabIconDefault:   '#AEAEB2',
      tabIconSelected:  '#6B3FA0',
      separator:        'rgba(100,60,150,0.18)',
      gold:             '#B8860B',
      goldLight:        '#FFF8E0',
      danger:           '#CC2255',
      surface:          'rgba(107,63,160,0.08)',
      heroCardBg:       'rgba(107,63,160,0.80)',
      heroCardText:     '#FFFFFF',
      heroCardSubtext:  'rgba(255,255,255,0.74)',
      fontWeightNormal: '400',
    },
    dark: {
      background:       '#0D0418',
      backgroundSecond: '#180828',
      backgroundCard:   '#28103F',
      text:             '#F0E8FF',
      textSecond:       '#E0D0FF',
      textMuted:        '#B090DD',
      tint:             '#C084FC',
      tintLight:        'rgba(192,132,252,0.14)',
      tintDark:         '#D09AFF',
      tintText:         '#1A0033',
      tabIconDefault:   'rgba(180,130,250,0.40)',
      tabIconSelected:  '#C084FC',
      separator:        'rgba(180,130,250,0.18)',
      gold:             '#FFD060',
      goldLight:        'rgba(255,208,96,0.15)',
      danger:           '#FF5588',
      surface:          'rgba(192,132,252,0.10)',
      heroCardBg:       'rgba(60,20,100,0.84)',
      heroCardText:     '#F0E8FF',
      heroCardSubtext:  'rgba(240,232,255,0.68)',
      fontWeightNormal: '400',
    },
  },
};

export function getColors(isDark: boolean, theme: AccessibilityTheme = 'default'): ColorPalette {
  return isDark ? palettes[theme].dark : palettes[theme].light;
}

const Colors = {
  light: palettes.default.light,
  dark:  palettes.default.dark,
};

export default Colors;
