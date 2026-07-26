import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: "line",
  use: {
    baseURL: "http://127.0.0.1:4173",
    headless: true,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium-desktop",
      use: { browserName: "chromium", viewport: { width: 1280, height: 900 } },
    },
    {
      name: "webkit-mobile",
      testMatch: "**/books.e2e.ts",
      use: { browserName: "webkit", viewport: { width: 390, height: 844 } },
    },
    {
      name: "firefox-desktop",
      testMatch: "**/book-smoke.e2e.ts",
      use: { browserName: "firefox", viewport: { width: 1280, height: 900 } },
    },
    {
      name: "webkit-desktop",
      testMatch: "**/book-smoke.e2e.ts",
      use: { browserName: "webkit", viewport: { width: 1280, height: 900 } },
    },
  ],
  webServer: {
    command: "npm run build && npm run preview -- --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
  },
});
