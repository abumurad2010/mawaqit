import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';
import { getApiUrl } from '@/lib/query-client';

const BUNDLED = require('@/assets/sounds/athan.wav');
const CDN_TIMEOUT_MS = 12000;

const ABBREVIATED_PREVIEW_SECS = 25;
const FULL_PREVIEW_SECS = 300;

let playerRef: AudioPlayer | null = null;
let stopTimer: ReturnType<typeof setTimeout> | null = null;
let cdnTimer: ReturnType<typeof setTimeout> | null = null;
let onStopCb: (() => void) | null = null;

function attachFinishListener(player: AudioPlayer) {
  player.addListener('playbackStatusUpdate', (status: {
    didJustFinish: boolean;
  }) => {
    if (playerRef !== player) return;
    if (status.didJustFinish) {
      playerRef = null;
      const cb = onStopCb;
      onStopCb = null;
      cb?.();
    }
  });
}

function startBundled() {
  const player = createAudioPlayer(BUNDLED);
  playerRef = player;
  attachFinishListener(player);
  player.play();
}

function cleanupCdnTimer() {
  if (cdnTimer) { clearTimeout(cdnTimer); cdnTimer = null; }
}

function setPreviewStopTimer(type: 'full' | 'abbreviated') {
  if (stopTimer) { clearTimeout(stopTimer); stopTimer = null; }
  const secs = type === 'abbreviated' ? ABBREVIATED_PREVIEW_SECS : FULL_PREVIEW_SECS;
  stopTimer = setTimeout(() => stopAthan(), secs * 1000);
}

export async function playAthan(
  type: 'full' | 'abbreviated' = 'full',
  onStop?: () => void,
) {
  try {
    await stopAthan();
    onStopCb = onStop ?? null;
    await setAudioModeAsync({ playsInSilentMode: true });

    let cdnLoaded = false;
    let cdnPlayer: AudioPlayer | null = null;

    const adhanUrl = new URL('/api/adhan', getApiUrl()).toString();

    try {
      cdnPlayer = createAudioPlayer(adhanUrl);

      cdnPlayer.addListener('playbackStatusUpdate', (status: {
        isLoaded: boolean; didJustFinish: boolean;
      }) => {
        if (cdnLoaded) return;
        if (status.isLoaded) {
          cdnLoaded = true;
          cleanupCdnTimer();
          if (playerRef) {
            try { playerRef.remove(); } catch {}
            playerRef = null;
          }
          playerRef = cdnPlayer!;
          attachFinishListener(cdnPlayer!);
          cdnPlayer!.play();
          setPreviewStopTimer(type);
        }
        if (status.didJustFinish && !cdnLoaded) {
          cleanupCdnTimer();
          try { cdnPlayer?.remove(); } catch {}
          cdnPlayer = null;
        }
      });
    } catch {
      cdnPlayer = null;
    }

    cdnTimer = setTimeout(() => {
      cleanupCdnTimer();
      if (!cdnLoaded) {
        if (cdnPlayer) { try { cdnPlayer.remove(); } catch {} }
        cdnPlayer = null;
      }
    }, CDN_TIMEOUT_MS);

    startBundled();
    setPreviewStopTimer(type);

  } catch (e) {
    console.warn('[audio] playAthan failed:', e);
    const cb = onStopCb;
    onStopCb = null;
    cb?.();
  }
}

export async function stopAthan() {
  cleanupCdnTimer();
  if (stopTimer) { clearTimeout(stopTimer); stopTimer = null; }
  if (playerRef) {
    try { playerRef.remove(); } catch {}
    playerRef = null;
  }
  const cb = onStopCb;
  onStopCb = null;
  cb?.();
}
