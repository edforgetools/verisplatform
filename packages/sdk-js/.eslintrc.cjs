module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
  },
  extends: ["eslint:recommended"],
  rules: {
    "no-unused-vars": "warn",
    "no-console": "warn",
  },
  env: {
    node: true,
    es6: true,
  },
  ignorePatterns: ["dist/**", "node_modules/**"],
};