import { createDefaultEsmPreset } from "ts-jest";

const tsJestTransformCfg = createDefaultEsmPreset({
  tsconfig: "tsconfig.test.json",
}).transform;

/** @type {import("jest").Config} **/
export default {
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {
    ...tsJestTransformCfg,
  },
  collectCoverageFrom: ["src/**/*.ts", "!src/generated/**"],
};