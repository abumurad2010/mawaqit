import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';

const ADHAN_FILES: Record<string, any> = {
  'abdul-hakam': require('@/assets/sounds/Abdul-Hakam.mp3'),
  'aqsa':        require('@/assets/sounds/Adhan-Alaqsa.mp3'),
  'egypt':       require('@/assets/sounds/Adhan-Egypt.mp3'),
  'halab':       require('@/assets/sounds/Adhan-Halab.mp3'),
  'madinah':     require('@/assets/sounds/Adhan-Madinah.mp3'),
  'makkah':      require('@/assets/sounds/Adhan-Makkah.mp3'),
  'hussaini':    require('@/assets/sounds/Al-Hussaini.mp3'),
  'bakir':       require('@/assets/sounds/Bakir-Bash.mp3'),
};

const ADHAN_FILES_ABB: Record<string, any> = {
  'abdul-hakam': require('@/assets/sounds/Abdul-Hakam-Abb.m4a'),
  'aqsa':        require('@/assets/sounds/Adhan-Alaqsa-Abb.m4a'),
  'egypt':       require('@/assets/sounds/Adhan-Egypt-Abb.m4a'),
  'halab':       require('@/assets/sounds/Adhan-Halab-Abb.m4a'),
  'madinah':     require('@/assets/sounds/Adhan-Madinah-Abb.m4a'),
  'makkah':      require('@/assets/sounds/Adhan-Makka-Abb.m4a'),
  'hussaini':    require('@/assets/sounds/Al-Hussaini-Abb.m4a'),
  'bakir':       require('@/assets/sounds/Bakir-Bash-Abb.m4a'),
};

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

export async function playAthan(
  type: 'full' | 'abbreviated' = 'full',
  onStop?: () => void,
  selectedAdhan: string = 'makkah',
) {
  await stopAthan();

  const sid = ++sessionId;
  onStopCb = onStop ?? null;

  try {
    await setAudioModeAsync({
      allowsRecording: false,
      shouldPlayInBackground: false,
      playsInSilentMode: true,
      interruptionMode: 'duckOthers',
      shouldRouteThroughEarpiece: false,
    });
  } catch {}

  if (sessionId !== sid) return;

  try {
    const map = type === 'abbreviated' ? ADHAN_FILES_ABB : ADHAN_FILES;
    const source = map[selectedAdhan] ?? map['makkah'];
    const player = createAudioPlayer(source);

    if (sessionId !== sid) {
      killPlayer(player);
      return;
    }

    activePlayer = player;
    player.volume = 1.0;
    player.play();

    player.addListener('playbackStatusUpdate', (s: any) => {
      if (sessionId !== sid) { killPlayer(player); return; }
      if (s.didJustFinish) {
        clearTimers();
        activePlayer = null;
        const cb = onStopCb;
        onStopCb = null;
        cb?.();
      }
    });

    // Safety timeout only for full adhan (abbreviated files end naturally)
    if (type === 'full') {
      stopTimer = setTimeout(() => stopAthan(), 300 * 1000);
    }
  } catch {
    const cb = onStopCb;
    onStopCb = null;
    cb?.();
  }
}
