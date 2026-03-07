import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';
import { getApiUrl } from '@/lib/query-client';

const BUNDLED = require('@/assets/sounds/athan.wav');

let sessionId = 0;
let activePlayer: AudioPlayer | null = null;
let stopTimer: ReturnType<typeof setTimeout> | null = null;
let loadTimer: ReturnType<typeof setTimeout> | null = null;
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
  if (loadTimer) { clearTimeout(loadTimer); loadTimer = null; }
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
    await setAudioModeAsync({ playsInSilentMode: true });
  } catch {}

  function isCurrentSession() {
    return sessionId === sid;
  }

  function finishCurrentSession() {
    if (!isCurrentSession()) return;
    clearTimers();
    activePlayer = null;
    const cb = onStopCb;
    onStopCb = null;
    cb?.();
  }

  function activatePlayer(player: AudioPlayer) {
    if (!isCurrentSession()) {
      killPlayer(player);
      return;
    }
    clearTimers();
    activePlayer = player;
    player.addListener('playbackStatusUpdate', (s: { didJustFinish: boolean }) => {
      if (!isCurrentSession()) { killPlayer(player); return; }
      if (s.didJustFinish) finishCurrentSession();
    });
    player.play();
    scheduleStop(type);
  }

  const adhanPath = type === 'abbreviated' ? '/api/adhan/abbreviated' : '/api/adhan';
  const backendUrl = new URL(adhanPath, getApiUrl()).toString();

  let backendPlayer: AudioPlayer | null = null;

  try {
    backendPlayer = createAudioPlayer(backendUrl);

    backendPlayer.addListener('playbackStatusUpdate', (s: {
      isLoaded: boolean; didJustFinish: boolean;
    }) => {
      if (!isCurrentSession()) {
        killPlayer(backendPlayer);
        return;
      }
      if (s.isLoaded) {
        clearTimers();
        activatePlayer(backendPlayer!);
        return;
      }
      if (s.didJustFinish) {
        killPlayer(backendPlayer);
        backendPlayer = null;
        useBundled();
      }
    });

    loadTimer = setTimeout(() => {
      loadTimer = null;
      if (!isCurrentSession()) { killPlayer(backendPlayer); return; }
      killPlayer(backendPlayer);
      backendPlayer = null;
      useBundled();
    }, 10000);

  } catch {
    useBundled();
  }

  function useBundled() {
    if (!isCurrentSession()) return;
    try {
      const p = createAudioPlayer(BUNDLED);
      activatePlayer(p);
    } catch {
      finishCurrentSession();
    }
  }
}
