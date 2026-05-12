import * as Tone from "tone";
import { getMaster } from "@/lib/audio/master";
import { getSampleBuffer } from "@/lib/audio/sampleBank";

export type CompiledSound = {
  trigger: () => void;
  dispose: () => void;
  meta: { source: SourceKind; effects: string[] };
};

type SourceKind = "sine" | "noise" | "sample";

class SoundBuilder {
  source: SourceKind = "sine";
  freq = 440;
  sampleName = "";
  gain = 0.6;
  lowpassHz: number | null = null;
  bandpassHz: number | null = null;
  delayTime: number | null = null;
  pitchSemis = 0;
  smoothMs = 0;
  echoLevel: number | null = null;
  stepPattern: string | null = null;
  probability = 1;
  effectsLog: string[] = [];

  static sine(freq: number) {
    const b = new SoundBuilder();
    b.source = "sine";
    b.freq = freq;
    return b;
  }
  static noise() {
    const b = new SoundBuilder();
    b.source = "noise";
    return b;
  }
  static sample(name: string) {
    const b = new SoundBuilder();
    b.source = "sample";
    b.sampleName = name;
    return b;
  }

  게인(v: number) {
    this.gain = clamp(v, 0, 2);
    this.effectsLog.push(`게인(${v})`);
    return this;
  }
  로우패스(hz: number) {
    this.lowpassHz = clamp(hz, 20, 20000);
    this.effectsLog.push(`로우패스(${hz})`);
    return this;
  }
  밴드패스(hz: number) {
    this.bandpassHz = clamp(hz, 20, 20000);
    this.effectsLog.push(`밴드패스(${hz})`);
    return this;
  }
  딜레이(time: number) {
    this.delayTime = clamp(time, 0, 1);
    this.effectsLog.push(`딜레이(${time})`);
    return this;
  }
  피치다운(semis: number) {
    this.pitchSemis = -Math.abs(semis);
    this.effectsLog.push(`피치다운(${semis})`);
    return this;
  }
  스무딩(ms: number) {
    this.smoothMs = Math.max(0, ms);
    this.effectsLog.push(`스무딩(${ms})`);
    return this;
  }
  에코(level: number) {
    this.echoLevel = clamp(level / 100, 0, 0.95);
    this.effectsLog.push(`에코(${level})`);
    return this;
  }
  스텝(pat: string) {
    this.stepPattern = pat;
    this.effectsLog.push(`스텝("${pat}")`);
    return this;
  }
  확률(p: number) {
    this.probability = clamp(p, 0, 1);
    this.effectsLog.push(`확률(${p})`);
    return this;
  }

  build(): CompiledSound {
    const fxNodes: Tone.ToneAudioNode[] = [];
    const gainNode = new Tone.Gain(this.gain);
    fxNodes.push(gainNode);

    if (this.lowpassHz) fxNodes.push(new Tone.Filter(this.lowpassHz, "lowpass"));
    if (this.bandpassHz) fxNodes.push(new Tone.Filter(this.bandpassHz, "bandpass"));
    if (this.pitchSemis) fxNodes.push(new Tone.PitchShift({ pitch: this.pitchSemis }));
    if (this.delayTime !== null) fxNodes.push(new Tone.FeedbackDelay(this.delayTime, 0.4));
    if (this.echoLevel !== null) fxNodes.push(new Tone.FeedbackDelay(0.25, this.echoLevel));

    let chain: Tone.ToneAudioNode = gainNode;
    for (let i = 1; i < fxNodes.length; i++) {
      chain.connect(fxNodes[i]);
      chain = fxNodes[i];
    }
    chain.connect(getMaster());

    const attack = this.smoothMs / 1000;
    const release = 0.2 + attack;

    const trigger = () => {
      if (Math.random() > this.probability) return;
      if (this.source === "sine") {
        const env = new Tone.AmplitudeEnvelope({ attack, decay: 0.05, sustain: 0.5, release });
        const osc = new Tone.Oscillator(this.freq, "sine");
        osc.connect(env);
        env.connect(gainNode);
        osc.start();
        env.triggerAttackRelease(0.3);
        setTimeout(() => {
          osc.stop();
          osc.dispose();
          env.dispose();
        }, (0.3 + release) * 1000 + 100);
      } else if (this.source === "noise") {
        const env = new Tone.AmplitudeEnvelope({ attack, decay: 0.05, sustain: 0.3, release });
        const n = new Tone.Noise("white");
        n.connect(env);
        env.connect(gainNode);
        n.start();
        env.triggerAttackRelease(0.2);
        setTimeout(() => {
          n.stop();
          n.dispose();
          env.dispose();
        }, (0.2 + release) * 1000 + 100);
      } else if (this.source === "sample") {
        triggerDrumSynth(this.sampleName, gainNode, attack);
      }
    };

    const dispose = () => {
      fxNodes.forEach((n) => n.dispose());
    };

    return {
      trigger,
      dispose,
      meta: { source: this.source, effects: this.effectsLog },
    };
  }
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function triggerDrumSynth(
  name: string,
  out: Tone.ToneAudioNode,
  attack: number,
) {
  const userBuf = getSampleBuffer(name);
  if (userBuf && userBuf.loaded) {
    const player = new Tone.Player(userBuf);
    player.fadeIn = attack;
    player.connect(out);
    player.start();
    setTimeout(() => player.dispose(), (userBuf.duration + attack + 0.5) * 1000);
    return;
  }
  const lower = name.toLowerCase();
  if (lower === "kick") {
    const k = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 6,
      envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.4 },
    });
    k.connect(out);
    k.triggerAttackRelease("C1", "8n");
    setTimeout(() => k.dispose(), 1200);
  } else if (lower === "snare") {
    const env = new Tone.AmplitudeEnvelope({
      attack: 0.001,
      decay: 0.18,
      sustain: 0,
      release: 0.05,
    });
    const filter = new Tone.Filter(2200, "bandpass");
    const noise = new Tone.Noise("white");
    noise.chain(filter, env, out);
    noise.start();
    env.triggerAttackRelease(0.15);
    setTimeout(() => {
      noise.stop();
      noise.dispose();
      filter.dispose();
      env.dispose();
    }, 600);
  } else if (lower === "hat" || lower === "hihat") {
    const env = new Tone.AmplitudeEnvelope({
      attack: 0.001,
      decay: 0.05,
      sustain: 0,
      release: 0.02,
    });
    const filter = new Tone.Filter(7000, "highpass");
    const noise = new Tone.Noise("white");
    noise.chain(filter, env, out);
    noise.start();
    env.triggerAttackRelease(0.04);
    setTimeout(() => {
      noise.stop();
      noise.dispose();
      filter.dispose();
      env.dispose();
    }, 300);
  } else if (lower === "clap") {
    const env = new Tone.AmplitudeEnvelope({
      attack: 0.002,
      decay: 0.2,
      sustain: 0,
      release: 0.1,
    });
    const filter = new Tone.Filter(1500, "bandpass");
    const noise = new Tone.Noise("pink");
    noise.chain(filter, env, out);
    noise.start();
    [0, 0.012, 0.025, 0.04].forEach((d) =>
      setTimeout(() => env.triggerAttackRelease(0.05), d * 1000),
    );
    setTimeout(() => {
      noise.stop();
      noise.dispose();
      filter.dispose();
      env.dispose();
    }, 700);
  } else if (lower === "tom") {
    const t = new Tone.MembraneSynth({
      pitchDecay: 0.03,
      octaves: 4,
      envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.2 },
    });
    t.connect(out);
    t.triggerAttackRelease("G2", "8n");
    setTimeout(() => t.dispose(), 1000);
  } else if (lower === "cymbal") {
    const m = new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 0.5, release: 0.4 },
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 4000,
      octaves: 1.5,
    });
    m.connect(out);
    m.triggerAttackRelease("A4", "8n");
    setTimeout(() => m.dispose(), 1500);
  } else {
    // Unknown sample name: short tick fallback
    const env = new Tone.AmplitudeEnvelope({
      attack: 0.001,
      decay: 0.1,
      sustain: 0,
      release: 0.05,
    });
    const noise = new Tone.Noise("white");
    noise.chain(env, out);
    noise.start();
    env.triggerAttackRelease(0.08);
    setTimeout(() => {
      noise.stop();
      noise.dispose();
      env.dispose();
    }, 400);
  }
}

export const DSL_BINDINGS = {
  사인파: SoundBuilder.sine,
  sin: SoundBuilder.sine,
  노이즈: SoundBuilder.noise,
  noise: SoundBuilder.noise,
  샘플: SoundBuilder.sample,
  sample: SoundBuilder.sample,
} as const;

export const DSL_FUNCTION_NAMES = [
  "사인파",
  "노이즈",
  "샘플",
  "게인",
  "로우패스",
  "밴드패스",
  "딜레이",
  "피치다운",
  "스무딩",
  "에코",
  "스텝",
  "확률",
  "sin",
  "noise",
  "sample",
  "gain",
  "lowpass",
  "bandpass",
  "delay",
  "pitch",
  "smooth",
  "echo",
  "step",
  "prob",
];

const ENGLISH_TO_KOREAN_METHODS: Record<string, string> = {
  gain: "게인",
  lowpass: "로우패스",
  bandpass: "밴드패스",
  delay: "딜레이",
  pitch: "피치다운",
  smooth: "스무딩",
  echo: "에코",
  step: "스텝",
  prob: "확률",
};

(function attachEnglishAliases() {
  const proto = SoundBuilder.prototype as unknown as Record<string, unknown>;
  for (const [en, ko] of Object.entries(ENGLISH_TO_KOREAN_METHODS)) {
    if (typeof proto[ko] === "function") proto[en] = proto[ko];
  }
})();

export type CompileResult =
  | { ok: true; sound: CompiledSound }
  | { ok: false; error: string };

export function compile(code: string): CompileResult {
  if (!code.trim()) return { ok: false, error: "(빈 코드)" };
  const argNames = Object.keys(DSL_BINDINGS);
  const argValues = Object.values(DSL_BINDINGS);
  try {
    const fn = new Function(
      ...argNames,
      `"use strict"; return (${code}).build();`,
    );
    const sound = fn(...argValues) as CompiledSound;
    return { ok: true, sound };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
