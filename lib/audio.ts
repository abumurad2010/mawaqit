import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';

const ADHAN_CDN = 'https://cdn.islamic.network/adhan/adhan-haramain-gapless.mp3';
const BUNDLED = require('@/assets/sounds/athan.wav');
const CDN_TIMEOUT_MS = 5000;

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

function startBundled(type: 'full' | 'abbreviated') {
  const player = createAudioPlayer(BUNDLED);
  playerRef = player;
  attachFinishListener(player);
  player.play();
  if (type === 'abbreviated') {
    stopTimer = setTimeout(() => stopAthan(), 8000);
  }
}

function cleanupCdnTimer() {
  if (cdnTimer) { clearTimeout(cdnTimer); cdnTimer = null; }
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

    try {
      cdnPlayer = createAudioPlayer(ADHAN_CDN);

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
          if (type === 'abbreviated') {
            stopTimer = setTimeout(() => stopAthan(), 8000);
          }
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
        if (!playerRef) {
          startBundled(type);
        }
      }
    }, CDN_TIMEOUT_MS);

    startBundled(type);

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
