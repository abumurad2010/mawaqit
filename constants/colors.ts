const green = {
  50:  '#f0faf4',
  100: '#d6f0e2',
  200: '#a8dfc3',
  300: '#6bc9a0',
  400: '#3aad7a',
  500: '#1e8f60',
  600: '#1a7a4a',   // brand primary
  700: '#155e3a',
  800: '#0f4429',
  900: '#082b1a',
};

const Colors = {
  light: {
    background:       '#f8fdf9',
    backgroundSecond: '#edf7f0',
    backgroundCard:   '#ffffff',
    text:             '#0a2416',
    textSecond:       '#3a6649',
    textMuted:        '#7a9e87',
    tint:             green[600],
    tintLight:        green[200],
    tintDark:         green[700],
    tabIconDefault:   '#9dbfaa',
    tabIconSelected:  green[600],
    separator:        '#d6ecde',
    gold:             '#c9933a',
    goldLight:        '#f5e6c8',
    danger:           '#c0392b',
    surface:          'rgba(26,122,74,0.08)',
  },
  dark: {
    background:       '#070f0a',
    backgroundSecond: '#0d1f13',
    backgroundCard:   '#111d15',
    text:             '#e8f5ec',
    textSecond:       '#8fc4a0',
    textMuted:        '#4d7a5e',
    tint:             green[400],
    tintLight:        green[800],
    tintDark:         green[300],
    tabIconDefault:   '#3d6b4f',
    tabIconSelected:  green[400],
    separator:        '#1a3323',
    gold:             '#d4a843',
    goldLight:        '#2d2010',
    danger:           '#e74c3c',
    surface:          'rgba(58,173,122,0.10)',
  },
};

export default Colors;
