import { defineConfig, devices } from "@playwright/test";

// e2e 는 Playwright(*.spec.ts), 유닛은 Vitest(*.test.ts)로 글롭이 분리되어 있다.
// webServer 는 사용자 확정대로 프로덕션 빌드 후 start 로 띄운다(HMR/컴파일 플레이키 회피).
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // 헤드리스에서 오디오 컨텍스트/녹음(MediaRecorder)이 제스처 없이도 시작되도록.
        launchOptions: {
          args: ["--autoplay-policy=no-user-gesture-required"],
        },
      },
    },
  ],
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
