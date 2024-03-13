import * as fs from "fs";
import * as tmp from "tmp";

export function split(str: string): string[] {
  return str
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s !== "");
}

export function mktemp(suffix: string): string {
  tmp.setGracefulCleanup();
  return tmp.tmpNameSync({ postfix: suffix });
}

export function size(file: string): number {
  return fs.statSync(file).size;
}
