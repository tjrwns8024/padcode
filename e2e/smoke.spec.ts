import { test, expect } from "@playwright/test";

test.describe("앱 부팅 스모크", () => {
  test("헤더와 4×4 패드 그리드가 렌더된다", async ({ page }) => {
    await page.goto("/");

    // Header 의 타이틀 텍스트. exact:true 로 "REM PADCODE READY"(에디터 안내문)와
    // 구분한다 — getByText("PADCODE") 는 두 요소에 매칭되어 strict mode 위반이 난다.
    await expect(page.getByText("PADCODE", { exact: true })).toBeVisible();

    // 4×4 = 16개 패드가 렌더되는지 (data-testid 로 견고하게 선택)
    const pads = page.getByTestId("pad");
    await expect(pads).toHaveCount(16);
  });
});
