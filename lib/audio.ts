import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';

let playerRef: AudioPlayer | null = null;

export async function playAthan() {
  try {
    await stopAthan();
    await setAudioModeAsync({ playsInSilentModeIOS: true });
    const player = createAudioPlayer(require('@/assets/sounds/athan.wav'));
    playerRef = player;
    player.play();
  } catch {}
}

export async function stopAthan() {
  if (playerRef) {
    try { playerRef.remove(); } catch {}
    playerRef = null;
  }
}
