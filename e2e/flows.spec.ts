import { test, expect } from "@playwright/test";

// 핵심 사용자 흐름 e2e. 실제 오디오 출력이 아니라 UI/DOM/상태 변화를 검증한다.
// 헤드리스 브라우저에는 사용자 제스처 기반 오디오 검증 수단이 없으므로 소리는 확인하지 않는다.
// 각 테스트는 page.goto("/") 로 새 로드를 받아 서로 격리된다.

test.describe("패드 선택과 에디터", () => {
  test("패드를 선택하면 에디터가 마운트된다", async ({ page }) => {
    await page.goto("/");

    // 선택 전: 안내문이 보이고 CodeMirror 는 없다
    await expect(page.getByText("(NO PAD SELECTED)")).toBeVisible();
    await expect(page.locator(".cm-editor")).toHaveCount(0);

    // 첫 패드 선택 → CodeMirror 마운트
    await page.getByTestId("pad").first().click();
    await expect(page.locator(".cm-editor")).toBeVisible();
  });
});

test.describe("프리셋 삽입", () => {
  test("선택된 패드가 없으면 프리셋 버튼이 비활성이다", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "KICK", exact: true })).toBeDisabled();
  });

  test("패드 선택 후 프리셋을 클릭하면 에디터에 DSL 이 삽입된다", async ({ page }) => {
    await page.goto("/");

    await page.getByTestId("pad").first().click();
    await expect(page.locator(".cm-editor")).toBeVisible();

    await page.getByRole("button", { name: "KICK", exact: true }).click();

    // KICK 프리셋 코드: 샘플("kick").게인(1)
    await expect(page.locator(".cm-content")).toContainText('샘플("kick")');
  });
});

test.describe("DSL 린터", () => {
  test("잘못된 DSL 을 입력하면 린터 진단이 나타난다", async ({ page }) => {
    await page.goto("/");

    await page.getByTestId("pad").first().click();
    const content = page.locator(".cm-content");
    await expect(content).toBeVisible();

    await content.click();
    await page.keyboard.type("없는함수(");

    // dslLinter 가 compile() 실패를 에러 진단으로 표시한다(.cm-lintRange-error).
    // 린터는 디바운스되므로 toBeAttached 의 자동 대기를 활용한다(고정 sleep 금지).
    await expect(page.locator(".cm-lintRange-error").first()).toBeAttached({ timeout: 5000 });
  });
});

test.describe("키보드 트리거 가드 (CLAUDE.md CRITICAL)", () => {
  test("에디터 포커스 중에는 패드 키가 트리거되지 않고 에디터에 입력된다", async ({ page }) => {
    await page.goto("/");

    await page.getByTestId("pad").first().click();
    const content = page.locator(".cm-content");
    await expect(content).toBeVisible();

    // 에디터에 포커스를 준 상태에서 패드 매핑 키(q/a/z/1)를 입력한다.
    // 가드가 동작하면 전역 핸들러가 이 키를 소비하지 않으므로 그대로 에디터 텍스트가 된다.
    await content.click();
    await page.keyboard.type("qaz1");
    await expect(content).toContainText("qaz1");
  });

  test("에디터에 포커스가 없으면 패드 키가 에디터에 입력되지 않는다", async ({ page }) => {
    await page.goto("/");

    await page.getByTestId("pad").first().click();
    const content = page.locator(".cm-content");
    await expect(content).toBeVisible();

    // 에디터 밖(헤더)으로 포커스를 옮긴다.
    await page.getByText("PADCODE", { exact: true }).click();
    const before = (await content.textContent()) ?? "";

    await page.keyboard.press("KeyW");

    // 포커스가 에디터에 없으므로 키가 에디터 텍스트로 들어가면 안 된다(내용 불변).
    await expect(content).toHaveText(before);
  });
});

test.describe("녹음 UI", () => {
  // 주의: REC→STOP 의 실제 상태 전이는 Tone.Recorder(MediaRecorder)와 오디오 컨텍스트가
  // running 으로 전이해야 일어난다. 헤드리스 Chromium 에는 실제 오디오 출력 장치가 없어
  // ensureAudioContext()/recorder.start() 가 (에러 없이) 멈추므로 e2e 로는 검증할 수 없다.
  // 상태 전이(setIsRecording/saveBlob/clearRecording 등)는 stores/recording.test.ts 에서
  // 유닛으로 검증한다. 여기서는 오디오 백엔드에 의존하지 않는 사실만 확인한다.
  test("RECORDER 패널과 REC 버튼이 렌더되고 클릭해도 앱이 죽지 않는다", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("▶ RECORDER")).toBeVisible();
    const rec = page.getByRole("button", { name: "REC", exact: true });
    await expect(rec).toBeVisible();
    await expect(rec).toBeEnabled();

    await rec.click();

    // 클릭 후에도 앱이 응답 가능한 상태로 유지된다(패드 그리드 16개가 그대로 렌더).
    await expect(page.getByTestId("pad")).toHaveCount(16);
  });
});
