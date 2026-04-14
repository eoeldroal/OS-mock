import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "packages/core/src/__tests__/**/*.test.ts",
      "packages/core/test/**/*.test.ts",
      "packages/mcp-server/test/**/*.test.ts"
    ],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      ".claude/**",
      "logs/**",
      "output/**",
      "scripts/**",
      "tmp/**"
    ]
  }
});
