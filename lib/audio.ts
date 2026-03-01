import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';
import * as FileSystem from 'expo-file-system';

const ADHAN_CDN = 'https://cdn.islamic.network/adhan/adhan-haramain-gapless.mp3';
const CACHED_PATH = (FileSystem.documentDirectory ?? '') + 'athan_cached.mp3';
const BUNDLED_WAV = require('@/assets/sounds/athan.wav');

let playerRef: AudioPlayer | null = null;
let stopTimer: ReturnType<typeof setTimeout> | null = null;

async function getAthanSource(): Promise<string | number> {
  try {
    const info = await FileSystem.getInfoAsync(CACHED_PATH);
    if (info.exists && info.size && info.size > 10000) {
      return CACHED_PATH;
    }
    const result = await FileSystem.downloadAsync(ADHAN_CDN, CACHED_PATH);
    if (result.status === 200) {
      return CACHED_PATH;
    }
  } catch {}
  return BUNDLED_WAV;
}

export async function playAthan(type: 'full' | 'abbreviated' = 'full') {
  try {
    await stopAthan();
    await setAudioModeAsync({ playsInSilentMode: true });
    const source = await getAthanSource();
    const player = createAudioPlayer(source);
    playerRef = player;
    player.play();
    if (type === 'abbreviated') {
      stopTimer = setTimeout(() => stopAthan(), 8000);
    }
  } catch (e) {
    console.warn('[audio] playAthan failed:', e);
  }
}

export async function stopAthan() {
  if (stopTimer) {
    clearTimeout(stopTimer);
    stopTimer = null;
  }
  if (playerRef) {
    try { playerRef.remove(); } catch {}
    playerRef = null;
  }
}
