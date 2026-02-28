import { Platform } from 'react-native';

export const SERIF_EN: string = Platform.select({
  ios:     'Georgia',
  android: 'serif',
  default: 'Georgia, "Times New Roman", serif',
}) as string;
