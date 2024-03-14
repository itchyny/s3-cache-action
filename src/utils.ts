import * as fs from "fs";
import * as tmp from "tmp";

export function split(str: string): string[] {
  return str
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s !== "" && !s.startsWith("#"));
}

export function mktemp(postfix: string): string {
  const tmpdir = process.env.RUNNER_TEMP || "";
  return tmp.tmpNameSync({ tmpdir, postfix });
}

export function size(file: string): number {
  return fs.statSync(file).size;
}
