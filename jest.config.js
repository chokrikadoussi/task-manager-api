import { createDefaultPreset } from "ts-jest";

const tsJestTransformCfg = createDefaultPreset({
  tsconfig: "tsconfig.test.json",
}).transform;

/** @type {import("jest").Config} **/
export default {
  testEnvironment: "node",
  transform: {
    ...tsJestTransformCfg,
  },
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  testPathIgnorePatterns: ["/node_modules/", "/tests/e2e/"],
  collectCoverageFrom: ["src/**/*.ts", "!src/generated/**"],
  transformIgnorePatterns: ["node_modules/(?!bcrypt-ts)"],
};