import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/*.test.ts"],
  transform: { "\\.ts$": "ts-jest" },
  setupFilesAfterEnv: ["./tests/setup.ts"],
};

export default config;
