import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';
import { getApiUrl } from '@/lib/query-client';

const BUNDLED = require('@/assets/sounds/athan.wav');

let mainPlayer: AudioPlayer | null = null;
let pendingPlayer: AudioPlayer | null = null;
let stopTimer: ReturnType<typeof setTimeout> | null = null;
let loadTimer: ReturnType<typeof setTimeout> | null = null;
let onStopCb: (() => void) | null = null;

function clearTimers() {
  if (stopTimer) { clearTimeout(stopTimer); stopTimer = null; }
  if (loadTimer) { clearTimeout(loadTimer); loadTimer = null; }
}

function killPlayer(p: AudioPlayer | null) {
  if (!p) return;
  try { p.remove(); } catch {}
}

export async function stopAthan() {
  clearTimers();
  killPlayer(pendingPlayer); pendingPlayer = null;
  killPlayer(mainPlayer); mainPlayer = null;
  const cb = onStopCb; onStopCb = null;
  cb?.();
}

function onFinished(player: AudioPlayer) {
  if (mainPlayer !== player) return;
  clearTimers();
  mainPlayer = null;
  const cb = onStopCb; onStopCb = null;
  cb?.();
}

function startPlaying(player: AudioPlayer, type: 'full' | 'abbreviated') {
  mainPlayer = player;
  player.play();
  const secs = type === 'abbreviated' ? 25 : 300;
  stopTimer = setTimeout(() => stopAthan(), secs * 1000);
}

function playBundled(type: 'full' | 'abbreviated') {
  const player = createAudioPlayer(BUNDLED);
  pendingPlayer = null;
  mainPlayer = player;
  player.addListener('playbackStatusUpdate', (s: { didJustFinish: boolean }) => {
    if (s.didJustFinish) onFinished(player);
  });
  player.play();
  const secs = type === 'abbreviated' ? 8 : 300;
  stopTimer = setTimeout(() => stopAthan(), secs * 1000);
}

export async function playAthan(
  type: 'full' | 'abbreviated' = 'full',
  onStop?: () => void,
) {
  await stopAthan();
  onStopCb = onStop ?? null;

  try {
    await setAudioModeAsync({ playsInSilentMode: true });
  } catch {}

  const backendUrl = new URL('/api/adhan', getApiUrl()).toString();

  try {
    const player = createAudioPlayer(backendUrl);
    pendingPlayer = player;

    player.addListener('playbackStatusUpdate', (s: {
      isLoaded: boolean; didJustFinish: boolean;
    }) => {
      if (s.isLoaded && pendingPlayer === player) {
        clearTimers();
        pendingPlayer = null;
        player.addListener('playbackStatusUpdate', (s2: { didJustFinish: boolean }) => {
          if (s2.didJustFinish) onFinished(player);
        });
        startPlaying(player, type);
        return;
      }
      if (s.didJustFinish && pendingPlayer === player) {
        pendingPlayer = null;
        playBundled(type);
      }
    });

    loadTimer = setTimeout(() => {
      loadTimer = null;
      if (pendingPlayer === player) {
        killPlayer(player);
        pendingPlayer = null;
        playBundled(type);
      }
    }, 10000);

  } catch {
    playBundled(type);
  }
}
