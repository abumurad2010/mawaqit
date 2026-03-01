import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';

const ADHAN_URLS = [
  'https://cdn.islamic.network/adhan/adhan-haramain-gapless.mp3',
  'https://islamicnetwork.b-cdn.net/adhan/adhan-haramain-gapless.mp3',
];
const BUNDLED_WAV = require('@/assets/sounds/athan.wav');

let playerRef: AudioPlayer | null = null;
let stopTimer: ReturnType<typeof setTimeout> | null = null;
let onStopCallback: (() => void) | null = null;

export async function playAthan(
  type: 'full' | 'abbreviated' = 'full',
  onStop?: () => void,
) {
  try {
    await stopAthan();
    onStopCallback = onStop ?? null;

    await setAudioModeAsync({ playsInSilentMode: true });

    const source = ADHAN_URLS[0];
    let player: AudioPlayer;
    try {
      player = createAudioPlayer(source);
    } catch {
      player = createAudioPlayer(BUNDLED_WAV);
    }

    playerRef = player;

    player.addListener('playbackStatusUpdate', (status: { didJustFinish: boolean }) => {
      if (status.didJustFinish) {
        playerRef = null;
        onStopCallback?.();
        onStopCallback = null;
      }
    });

    player.play();

    if (type === 'abbreviated') {
      stopTimer = setTimeout(() => stopAthan(), 8000);
    }
  } catch (e) {
    console.warn('[audio] playAthan failed:', e);
    onStopCallback?.();
    onStopCallback = null;
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
  onStopCallback?.();
  onStopCallback = null;
}
