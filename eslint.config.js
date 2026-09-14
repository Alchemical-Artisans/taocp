// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook"

import prettier from "eslint-config-prettier"
import path from "node:path"
import js from "@eslint/js"
import svelte from "eslint-plugin-svelte"
import { defineConfig, includeIgnoreFile } from "eslint/config"
import globals from "globals"
import ts from "typescript-eslint"

const gitignorePath = path.resolve(import.meta.dirname, ".gitignore")

export default defineConfig(
  includeIgnoreFile(gitignorePath),
  {
    // svelte-eslint-parser parses .svelte files directly, without the tex()
    // preprocessor Vite applies at build time, so it trips on this page's raw
    // TeX braces (e.g. \frac{n}{2}) exactly as described in
    // src/lib/tex/README.md.
    ignores: ["src/routes/vol-1/ch-1/1-1/+page.svelte"],
  },
  js.configs.recommended,
  ts.configs.recommended,
  svelte.configs.recommended,
  storybook.configs["flat/recommended"],
  prettier,
  svelte.configs.prettier,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      // typescript-eslint strongly recommend that you do not use the no-undef lint rule on TypeScript projects.
      // see: https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
      "no-undef": "off",
    },
  },
  {
    files: ["**/*.svelte", "**/*.svelte.ts", "**/*.svelte.js"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        extraFileExtensions: [".svelte"],
        parser: ts.parser,
      },
    },
  },
  {
    // Override or add rule settings here, such as:
    // 'svelte/button-has-type': 'error'
    rules: {
      // Navigation here is built from content data (table of contents, cross-references)
      // rather than static literal routes, so typed `resolve()` doesn't fit — see src/lib/data/toc.ts.
      "svelte/no-navigation-without-resolve": "off",
    },
  },
)
