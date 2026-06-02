import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  testMatch: ["**/*.test.ts"],
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
    "^aws-sdk-client-mock-jest$":
      "<rootDir>/node_modules/aws-sdk-client-mock-jest/dist/cjs/jest.js",
  },
  transform: {
    "\\.ts$": ["ts-jest", { useESM: true }],
  },
  setupFilesAfterEnv: ["./tests/setup.ts"],
};

export default config;
