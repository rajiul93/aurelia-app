import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  // React Native injects `__DEV__`; Node does not, so any module guarding a
  // dev-only branch with it throws a ReferenceError under Vitest. Defining it
  // as `true` means those branches are actually executed by the suite rather
  // than skipped, so a bug inside one still surfaces.
  define: {
    __DEV__: "true",
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
