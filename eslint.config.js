import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";
import globals from "globals";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    rules: {
      "max-lines": [
        "error",
        { max: 200, skipBlankLines: true, skipComments: true },
      ],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["./*", "../*"],
              message:
                "Use path aliases (@/, @prompttrack/shared) instead of relative imports",
            },
          ],
        },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/coverage/**",
      "**/*.config.js",
      "**/*.config.ts",
      "**/*.config.d.ts",
      "**/postcss.config.js",
    ],
  },
  {
    files: ["packages/web/src/components/ui/**/*.tsx"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
  {
    // Allow relative imports in shared package (barrel exports)
    files: ["packages/shared/src/**/*.ts"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
  {
    // Test files: allow relative imports (can't use @/ which points to src/) and longer files
    files: ["**/tests/**/*.ts", "**/tests/**/*.tsx", "**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "no-restricted-imports": "off",
      "max-lines": "off",
    },
  },
  {
    // Page files are orchestrators — allow up to 220 lines
    files: ["packages/web/src/pages/**/*.tsx"],
    rules: {
      "max-lines": ["error", { max: 220, skipBlankLines: true, skipComments: true }],
    },
  }
);
