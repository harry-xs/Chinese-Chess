type SoundName = 'place' | 'capture' | 'check' | 'win' | 'lose' | 'undo' | 'click';

let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(value: boolean): void {
  enabled = value;
}

export function initAudio(): void {
  if (typeof window === 'undefined') return;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') void ctx.resume();
}

function tone(
  freq: number,
  start: number,
  dur: number,
  type: OscillatorType,
  gain: number,
  freqEnd?: number,
): void {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (freqEnd !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), start + dur);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + dur + 0.03);
}

function noise(start: number, dur: number, gain: number, freq: number, q = 1): void {
  if (!ctx) return;
  const length = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  filter.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(ctx.destination);
  src.start(start);
  src.stop(start + dur + 0.02);
}

function sweepNoise(
  start: number,
  dur: number,
  gain: number,
  freqStart: number,
  freqEnd: number,
  q = 1,
): void {
  if (!ctx) return;
  const length = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = q;
  filter.frequency.setValueAtTime(freqStart, start);
  filter.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), start + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + dur * 0.15);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(ctx.destination);
  src.start(start);
  src.stop(start + dur + 0.02);
}

export function playSound(name: SoundName): void {
  if (!enabled || !ctx) return;
  const t = ctx.currentTime;
  switch (name) {
    case 'place':
      // 行棋：清脆的木质"嗒"
      noise(t, 0.05, 0.55, 2000, 1.1);
      tone(1500, t, 0.045, 'sine', 0.22, 900);
      break;
    case 'capture':
      // 吃子：更重的木质撞击 + 低频下沉
      noise(t, 0.06, 0.7, 1100, 0.7);
      tone(180, t, 0.16, 'sine', 0.5, 70);
      tone(120, t + 0.03, 0.18, 'triangle', 0.35, 55);
      noise(t + 0.05, 0.1, 0.35, 500, 0.6);
      break;
    case 'check':
      // 将军：低音钟鸣，与行棋/吃子截然不同
      tone(523.25, t, 0.9, 'sine', 0.42, 500);
      tone(784.88, t, 0.75, 'sine', 0.24, 760);
      tone(261.63, t, 1.1, 'sine', 0.22, 240);
      break;
    case 'win':
      tone(523.25, t, 0.28, 'sine', 0.35);
      tone(659.25, t + 0.16, 0.28, 'sine', 0.35);
      tone(783.99, t + 0.32, 0.42, 'sine', 0.35);
      break;
    case 'lose':
      tone(392, t, 0.34, 'sine', 0.3);
      tone(311.13, t + 0.24, 0.46, 'sine', 0.3);
      break;
    case 'undo':
      sweepNoise(t, 0.16, 0.4, 3200, 600, 0.9);
      break;
    case 'click':
      tone(1200, t, 0.035, 'sine', 0.16, 900);
      break;
  }
}

export function vibrate(pattern: number | number[]): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* ignore */
    }
  }
}
