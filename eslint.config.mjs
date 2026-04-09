import importPlugin from "eslint-plugin-import";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

export default [
  {
    files: ["slidekit/src/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: "module",
    },
    plugins: {
      import: importPlugin,
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      "import/no-cycle": ["error", { maxDepth: 5 }],
      "import/no-self-import": "error",
      "import/no-useless-path-segments": "warn",
    },
    settings: {
      "import/resolver": {
        node: {
          extensions: [".ts", ".js"],
        },
      },
    },
  },
];
