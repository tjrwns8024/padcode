import { test, expect } from "@playwright/test";

// SET LIST(그리드 프리셋) + 자동 저장 e2e.
// localStorage 영속이 핵심이므로 page.reload() 전후 상태를 검증한다.
// 각 test 는 새 브라우저 컨텍스트라 localStorage 가 격리된다.

test.describe("그리드 자동 저장", () => {
  test("패드에 코드를 넣고 새로고침해도 유지된다", async ({ page }) => {
    await page.goto("/");

    const firstPad = page.getByTestId("pad").first();
    await firstPad.click();
    await page.getByRole("button", { name: "KICK", exact: true }).click();
    await expect(firstPad).toContainText("KICK");

    await page.reload();

    // 새로고침 후 선택을 다시 하지 않아도 패드 라벨이 유지된다.
    await expect(page.getByTestId("pad").first()).toContainText("KICK");
  });
});

test.describe("SET LIST 저장/로드/삭제", () => {
  test("세트를 저장하면 새로고침 후에도 불러올 수 있다", async ({ page }) => {
    await page.goto("/");

    const firstPad = page.getByTestId("pad").first();
    await firstPad.click();
    await page.getByRole("button", { name: "KICK", exact: true }).click();
    await expect(firstPad).toContainText("KICK");

    // 세트 저장 → 저장 직후 그리드가 비워진다
    await page.getByPlaceholder("세트 이름...").fill("demo set");
    await page.getByRole("button", { name: "+ SAVE" }).click();
    await expect(page.getByText("SET LIST (1)")).toBeVisible();
    await expect(page.getByText("demo set")).toBeVisible();
    await expect(page.getByTestId("pad").first()).toContainText("— — —");

    // 새로고침 후에도 세트가 남아있다(그리드는 빈 상태)
    await page.reload();
    await expect(page.getByText("SET LIST (1)")).toBeVisible();
    await expect(page.getByText("demo set")).toBeVisible();
    await expect(page.getByTestId("pad").first()).toContainText("— — —");

    // LOAD 로 복원 (클릭은 220ms 지연 후 로드된다)
    await page.getByTitle(/^demo set —/).click();
    await expect(page.getByTestId("pad").first()).toContainText("KICK");

    // 삭제하면 목록에서 사라진다
    await page.getByRole("button", { name: "delete demo set" }).click();
    await expect(page.getByText("SET LIST (0)")).toBeVisible();
    await expect(page.getByText("demo set")).toHaveCount(0);
  });

  test("목록을 더블클릭하면 이름을 수정할 수 있다", async ({ page }) => {
    await page.goto("/");

    // 세트 하나 저장
    await page.getByTestId("pad").first().click();
    await page.getByRole("button", { name: "KICK", exact: true }).click();
    await page.getByPlaceholder("세트 이름...").fill("old name");
    await page.getByRole("button", { name: "+ SAVE" }).click();
    await expect(page.getByText("old name")).toBeVisible();

    // 더블클릭 → 인라인 입력 → 이름 변경 (LOAD 는 실행되지 않아야 한다)
    await page.getByTitle(/^old name —/).dblclick();
    const editInput = page.getByLabel("rename old name");
    await expect(editInput).toBeVisible();
    await editInput.fill("new name");
    await editInput.press("Enter");

    await expect(page.getByText("new name")).toBeVisible();
    await expect(page.getByText("old name")).toHaveCount(0);
    // 더블클릭으로 LOAD 가 트리거되지 않아 그리드는 빈 상태 유지
    await expect(page.getByTestId("pad").first()).toContainText("— — —");

    // 새로고침 후에도 바뀐 이름이 유지된다
    await page.reload();
    await expect(page.getByText("new name")).toBeVisible();
  });

  test("프리셋을 본 뒤 NEW 로 빈 패드로 돌아온다", async ({ page }) => {
    await page.goto("/");

    // 세트 저장(저장 후 그리드는 비워짐)
    await page.getByTestId("pad").first().click();
    await page.getByRole("button", { name: "KICK", exact: true }).click();
    await page.getByPlaceholder("세트 이름...").fill("setA");
    await page.getByRole("button", { name: "+ SAVE" }).click();
    await expect(page.getByTestId("pad").first()).toContainText("— — —");

    // 프리셋 클릭 → 그리드가 그 내용으로 채워짐
    await page.getByTitle(/^setA —/).click();
    await expect(page.getByTestId("pad").first()).toContainText("KICK");

    // NEW → 빈 패드로 복귀
    await page.getByRole("button", { name: /NEW/ }).click();
    await expect(page.getByTestId("pad").first()).toContainText("— — —");
  });
});
