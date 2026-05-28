import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const SYSTEM_PROMPT = `You are a DSL code generator for PadCode, an arcade-style music pad synthesizer.

Generate a single-line DSL expression for the requested sound.

DSL Reference:
Sources (pick exactly one):
  사인파(freq)      - sine wave oscillator (freq in Hz, e.g. 440)
  노이즈()          - white noise
  샘플("name")      - drum sample. Built-in names: "kick", "snare", "hat", "hihat", "clap", "tom", "cymbal"
  플럭(freq)        - plucked string / guitar-like sound
  베이스(freq)      - synth bass (sawtooth)
  피아노(freq)      - piano-like tone (triangle wave)
  오르간(freq)      - organ tone (AM synthesis)

Effect chain (optional, chainable in any order):
  .게인(0–2)        - volume (default 0.6)
  .로우패스(hz)     - low-pass filter cutoff in Hz
  .밴드패스(hz)     - band-pass filter center in Hz
  .딜레이(0–1)      - delay time in seconds
  .피치다운(semis)  - pitch shift down by semitones (positive number)
  .스무딩(ms)       - attack smoothing in milliseconds
  .에코(0–100)      - echo/feedback level
  .확률(0–1)        - trigger probability (1 = always)

Rules:
- Return ONLY the DSL expression on a single line
- No markdown, no explanation, no code blocks, no comments
- Chain effects after the source using dot notation

Examples:
  킥 드럼 → 샘플("kick").게인(1)
  스네어 → 샘플("snare").게인(0.8)
  부드러운 베이스 → 사인파(80).게인(0.7).로우패스(200).스무딩(30)
  딜레이 아르페지오 → 사인파(660).게인(0.3).딜레이(0.125).에코(20)
  퍼커션 노이즈 → 노이즈().게인(0.2).밴드패스(3000)
  기타 튕기는 소리 → 플럭(330).게인(0.6)
  신스 베이스 → 베이스(80).게인(0.8).로우패스(300)
  피아노 멜로디 → 피아노(440).게인(0.5).딜레이(0.25)
  오르간 코드 → 오르간(220).게인(0.6).에코(15)`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY가 설정되지 않았습니다" }, { status: 500 });
  }

  const body = await req.json().catch(() => null);
  const prompt = body?.prompt?.trim();
  if (!prompt) {
    return NextResponse.json({ error: "prompt가 필요합니다" }, { status: 400 });
  }

  const MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash"];
  const genAI = new GoogleGenerativeAI(apiKey);
  let lastError = "";

  for (const modelName of MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName, systemInstruction: SYSTEM_PROMPT });
      const result = await model.generateContent(prompt);
      const raw = result.response.text().trim();
      const code = raw.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim();
      return NextResponse.json({ code });
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      const isRetryable = lastError.includes("503") || lastError.includes("429");
      if (!isRetryable) break;
      console.warn(`[generate-sound] ${modelName} 실패, 다음 모델 시도:`, lastError.slice(0, 80));
    }
  }

  console.error("[generate-sound]", lastError);
  return NextResponse.json({ error: lastError }, { status: 500 });
}
