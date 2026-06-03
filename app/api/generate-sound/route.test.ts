// @vitest-environment node
//
// app/api/generate-sound/route.ts 의 POST 핸들러 단위 테스트.
// 실제 Gemini API를 호출하지 않고 @google/generative-ai 를 전부 모킹한다(네트워크 0).
// route.ts 의 실제 동작(키 없으면 500, 빈 prompt 400, 코드블록 마커 제거,
// 503/429 에서만 모델 폴백, 그 외 에러 즉시 중단)을 그대로 단정한다.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// 모킹된 모델이 호출될 때의 모델 이름 순서를 기록하고,
// 테스트마다 generateContent 의 동작(성공 텍스트/에러 throw)을 주입한다.
const { genState } = vi.hoisted(() => ({
  genState: {
    calls: [] as string[],
    // (modelName) => 반환할 raw text. 에러를 던지려면 throw 한다.
    impl: (() => "") as (modelName: string, prompt: string) => string,
  },
}));

vi.mock("@google/generative-ai", () => {
  class GoogleGenerativeAI {
    constructor(_apiKey: string) {}
    getGenerativeModel({ model }: { model: string; systemInstruction?: string }) {
      return {
        async generateContent(prompt: string) {
          genState.calls.push(model);
          const text = genState.impl(model, prompt);
          return { response: { text: () => text } };
        },
      };
    }
  }
  return { GoogleGenerativeAI };
});

import { POST } from "@/app/api/generate-sound/route";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/generate-sound", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0];
}

const ORIGINAL_KEY = process.env.GEMINI_API_KEY;

beforeEach(() => {
  genState.calls = [];
  genState.impl = () => "";
  process.env.GEMINI_API_KEY = "test-key";
});

afterEach(() => {
  // 환경변수 복원으로 테스트 간 오염 방지.
  if (ORIGINAL_KEY === undefined) {
    delete process.env.GEMINI_API_KEY;
  } else {
    process.env.GEMINI_API_KEY = ORIGINAL_KEY;
  }
  vi.restoreAllMocks();
});

describe("generate-sound POST", () => {
  it("키가 없으면 500을 반환하고 모델을 호출하지 않는다", async () => {
    delete process.env.GEMINI_API_KEY;

    const res = await POST(makeRequest({ prompt: "킥 드럼" }));

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBeTruthy();
    expect(genState.calls).toEqual([]);
  });

  it("prompt 가 없으면 400을 반환한다", async () => {
    const res = await POST(makeRequest({}));

    expect(res.status).toBe(400);
    expect(genState.calls).toEqual([]);
  });

  it("prompt 가 빈 문자열/공백이면 400을 반환한다", async () => {
    const res = await POST(makeRequest({ prompt: "   " }));

    expect(res.status).toBe(400);
    expect(genState.calls).toEqual([]);
  });

  it("정상 응답에서 코드블록 마커를 제거한 { code } 를 반환한다", async () => {
    genState.impl = () => "```js\n사인파(440)\n```";

    const res = await POST(makeRequest({ prompt: "사인파 440" }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.code).toBe("사인파(440)");
    // 첫 모델만 호출되고 끝난다.
    expect(genState.calls).toEqual(["gemini-2.5-flash"]);
  });

  it("마커가 없는 응답은 trim 만 거쳐 그대로 반환한다", async () => {
    genState.impl = () => "  샘플(\"kick\").게인(1)  ";

    const res = await POST(makeRequest({ prompt: "킥" }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.code).toBe('샘플("kick").게인(1)');
  });

  it("첫 모델이 503 에러면 다음 모델로 폴백해 성공한다", async () => {
    genState.impl = (modelName) => {
      if (modelName === "gemini-2.5-flash") {
        throw new Error("503 Service Unavailable");
      }
      return "베이스(80)";
    };

    const res = await POST(makeRequest({ prompt: "베이스" }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.code).toBe("베이스(80)");
    expect(genState.calls).toEqual(["gemini-2.5-flash", "gemini-2.5-flash-lite"]);
  });

  it("429 에러도 폴백 대상이며 모델 순서대로 끝까지 시도한다", async () => {
    genState.impl = (modelName) => {
      if (modelName !== "gemini-2.0-flash") {
        throw new Error("429 Too Many Requests");
      }
      return "노이즈()";
    };

    const res = await POST(makeRequest({ prompt: "노이즈" }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.code).toBe("노이즈()");
    expect(genState.calls).toEqual([
      "gemini-2.5-flash",
      "gemini-2.5-flash-lite",
      "gemini-2.0-flash",
    ]);
  });

  it("모든 모델이 503이면 마지막 에러로 500을 반환한다", async () => {
    genState.impl = () => {
      throw new Error("503 down");
    };

    const res = await POST(makeRequest({ prompt: "x" }));

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain("503");
    expect(genState.calls).toEqual([
      "gemini-2.5-flash",
      "gemini-2.5-flash-lite",
      "gemini-2.0-flash",
    ]);
  });

  it("503/429 가 아닌 에러는 폴백하지 않고 즉시 500으로 중단한다", async () => {
    genState.impl = () => {
      throw new Error("400 Bad Request");
    };

    const res = await POST(makeRequest({ prompt: "x" }));

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain("400");
    // 첫 모델만 호출되고 다음 모델은 시도하지 않는다.
    expect(genState.calls).toEqual(["gemini-2.5-flash"]);
  });
});
