import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';

const BUNDLED = require('@/assets/sounds/athan.mp3');

let sessionId = 0;
let activePlayer: AudioPlayer | null = null;
let stopTimer: ReturnType<typeof setTimeout> | null = null;
let onStopCb: (() => void) | null = null;

function killPlayer(p: AudioPlayer | null) {
  if (!p) return;
  try { p.pause(); } catch {}
  try { (p as any).muted = true; } catch {}
  try { p.volume = 0; } catch {}
  try { p.remove(); } catch {}
}

function clearTimers() {
  if (stopTimer) { clearTimeout(stopTimer); stopTimer = null; }
}

export async function stopAthan() {
  clearTimers();
  sessionId++;
  const player = activePlayer;
  activePlayer = null;
  killPlayer(player);
  const cb = onStopCb;
  onStopCb = null;
  cb?.();
}

function scheduleStop(type: 'full' | 'abbreviated') {
  if (stopTimer) clearTimeout(stopTimer);
  const secs = type === 'abbreviated' ? 28 : 300;
  stopTimer = setTimeout(() => stopAthan(), secs * 1000);
}

export async function playAthan(
  type: 'full' | 'abbreviated' = 'full',
  onStop?: () => void,
) {
  await stopAthan();

  const sid = ++sessionId;
  onStopCb = onStop ?? null;

  try {
    await setAudioModeAsync({
      allowsRecording: false,
      staysActiveInBackground: false,
      playsInSilentMode: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    } as any);
  } catch {}

  if (sessionId !== sid) return;

  try {
    const player = createAudioPlayer(BUNDLED);

    if (sessionId !== sid) {
      killPlayer(player);
      return;
    }

    activePlayer = player;

    player.addListener('playbackStatusUpdate', (s: { didJustFinish: boolean }) => {
      if (sessionId !== sid) { killPlayer(player); return; }
      if (s.didJustFinish) {
        clearTimers();
        activePlayer = null;
        const cb = onStopCb;
        onStopCb = null;
        cb?.();
      }
    });

    player.volume = 1.0;
    player.play();
    scheduleStop(type);
  } catch {
    const cb = onStopCb;
    onStopCb = null;
    cb?.();
  }
}
