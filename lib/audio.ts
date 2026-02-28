import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';

let playerRef: AudioPlayer | null = null;
let stopTimer: ReturnType<typeof setTimeout> | null = null;

export async function playAthan(type: 'full' | 'abbreviated' = 'full') {
  try {
    await stopAthan();
    await setAudioModeAsync({ playsInSilentModeIOS: true });
    const player = createAudioPlayer(require('@/assets/sounds/athan.wav'));
    playerRef = player;
    player.play();
    if (type === 'abbreviated') {
      stopTimer = setTimeout(() => stopAthan(), 8000);
    }
  } catch {}
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
