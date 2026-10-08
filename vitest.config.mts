import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // `server-only` throws outside the Next.js bundler; stub it for tests.
      "server-only": path.resolve(import.meta.dirname, "src/lib/claude-logs/__fixtures__/server-only-stub.ts"),
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
});
