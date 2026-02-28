export type AccessibilityTheme = 'default' | 'high-contrast' | 'colorblind' | 'warm';

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
  tabIconDefault:   string;
  tabIconSelected:  string;
  separator:        string;
  gold:             string;
  goldLight:        string;
  danger:           string;
  surface:          string;
}

const palettes: Record<AccessibilityTheme, { light: ColorPalette; dark: ColorPalette }> = {

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
      tabIconDefault:   '#AEAEB2',
      tabIconSelected:  '#1a7a4a',
      separator:        'rgba(60,60,67,0.18)',
      gold:             '#B8860B',
      goldLight:        '#FFF8E0',
      danger:           '#FF3B30',
      surface:          'rgba(26,122,74,0.08)',
    },
    dark: {
      background:       '#000000',
      backgroundSecond: '#1C1C1E',
      backgroundCard:   '#2C2C2E',
      text:             '#FFFFFF',
      textSecond:       '#FFFFFF',
      textMuted:        '#FFFFFF',
      tint:             '#34C759',
      tintLight:        'rgba(52,199,89,0.14)',
      tintDark:         '#30D158',
      tabIconDefault:   'rgba(255,255,255,0.28)',
      tabIconSelected:  '#34C759',
      separator:        'rgba(255,255,255,0.10)',
      gold:             '#FFD60A',
      goldLight:        'rgba(255,214,10,0.14)',
      danger:           '#FF453A',
      surface:          'rgba(52,199,89,0.10)',
    },
  },

  'high-contrast': {
    light: {
      background:       '#FFFFFF',
      backgroundSecond: '#EBEBEB',
      backgroundCard:   '#FFFFFF',
      text:             '#000000',
      textSecond:       '#111111',
      textMuted:        '#333333',
      tint:             '#005C25',
      tintLight:        'rgba(0,92,37,0.10)',
      tintDark:         '#003D18',
      tabIconDefault:   '#666666',
      tabIconSelected:  '#005C25',
      separator:        'rgba(0,0,0,0.30)',
      gold:             '#7A5900',
      goldLight:        '#FFF3C0',
      danger:           '#CC0000',
      surface:          'rgba(0,92,37,0.10)',
    },
    dark: {
      background:       '#000000',
      backgroundSecond: '#0D0D0D',
      backgroundCard:   '#1A1A1A',
      text:             '#FFFFFF',
      textSecond:       '#F0F0F0',
      textMuted:        '#D0D0D0',
      tint:             '#00FF7F',
      tintLight:        'rgba(0,255,127,0.15)',
      tintDark:         '#00E570',
      tabIconDefault:   'rgba(255,255,255,0.40)',
      tabIconSelected:  '#00FF7F',
      separator:        'rgba(255,255,255,0.25)',
      gold:             '#FFE033',
      goldLight:        'rgba(255,224,51,0.18)',
      danger:           '#FF4444',
      surface:          'rgba(0,255,127,0.12)',
    },
  },

  colorblind: {
    light: {
      background:       '#F2F2F7',
      backgroundSecond: '#E5E5EA',
      backgroundCard:   '#FFFFFF',
      text:             '#001A33',
      textSecond:       '#002B52',
      textMuted:        '#1A4A7A',
      tint:             '#0066CC',
      tintLight:        'rgba(0,102,204,0.09)',
      tintDark:         '#004C99',
      tabIconDefault:   '#AEAEB2',
      tabIconSelected:  '#0066CC',
      separator:        'rgba(60,60,67,0.18)',
      gold:             '#CC7700',
      goldLight:        '#FFF0CC',
      danger:           '#CC0000',
      surface:          'rgba(0,102,204,0.08)',
    },
    dark: {
      background:       '#000000',
      backgroundSecond: '#1C1C1E',
      backgroundCard:   '#2C2C2E',
      text:             '#FFFFFF',
      textSecond:       '#EBEBF5',
      textMuted:        '#C8C8D0',
      tint:             '#409CFF',
      tintLight:        'rgba(64,156,255,0.15)',
      tintDark:         '#5AA5FF',
      tabIconDefault:   'rgba(255,255,255,0.28)',
      tabIconSelected:  '#409CFF',
      separator:        'rgba(255,255,255,0.10)',
      gold:             '#FF9F0A',
      goldLight:        'rgba(255,159,10,0.15)',
      danger:           '#FF6B6B',
      surface:          'rgba(64,156,255,0.10)',
    },
  },

  warm: {
    light: {
      background:       '#FDF6E3',
      backgroundSecond: '#F5E6C8',
      backgroundCard:   '#FFFBF0',
      text:             '#2C1810',
      textSecond:       '#3D2B20',
      textMuted:        '#6B4C3B',
      tint:             '#B8860B',
      tintLight:        'rgba(184,134,11,0.10)',
      tintDark:         '#8C6400',
      tabIconDefault:   '#A08060',
      tabIconSelected:  '#B8860B',
      separator:        'rgba(100,60,30,0.20)',
      gold:             '#B8860B',
      goldLight:        '#FFF3CC',
      danger:           '#CC3300',
      surface:          'rgba(184,134,11,0.09)',
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
      tabIconDefault:   'rgba(255,180,100,0.40)',
      tabIconSelected:  '#E8A000',
      separator:        'rgba(255,180,100,0.15)',
      gold:             '#FFD060',
      goldLight:        'rgba(255,208,96,0.15)',
      danger:           '#FF6633',
      surface:          'rgba(232,160,0,0.10)',
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
