import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/coverage/**",
      "**/out/**",
      "**/next-env.d.ts",
    ],
  },
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["packages/aim-core/src/**"],
    rules: {
      "no-restricted-globals": [
        "error",
        { name: "window", message: "DOM window is forbidden in aim-core." },
        { name: "document", message: "DOM document is forbidden in aim-core." },
        {
          name: "navigator",
          message: "Browser navigator is forbidden in aim-core.",
        },
        { name: "fetch", message: "Network fetch is forbidden in aim-core." },
        {
          name: "performance",
          message: "Browser clock performance is forbidden in aim-core.",
        },
        {
          name: "Date",
          message:
            "System clock Date is forbidden in aim-core; use deterministic Tick.",
        },
        {
          name: "setTimeout",
          message: "Timer setTimeout is forbidden in aim-core.",
        },
        {
          name: "setInterval",
          message: "Timer setInterval is forbidden in aim-core.",
        },
      ],
      "no-restricted-properties": [
        "error",
        {
          object: "Math",
          property: "random",
          message:
            "Use deterministic PrngV1 instead of Math.random in aim-core.",
        },
        {
          object: "Math",
          property: "sin",
          message:
            "Math.sin is non-deterministic across platforms; use fixed lookup or presentation conversions outside aim-core simulation.",
        },
        {
          object: "Math",
          property: "cos",
          message:
            "Math.cos is non-deterministic across platforms; use fixed lookup or presentation conversions outside aim-core simulation.",
        },
        {
          object: "Math",
          property: "atan2",
          message:
            "Math.atan2 is non-deterministic across platforms; use presentation conversions outside aim-core simulation.",
        },
      ],
    },
  },
);
