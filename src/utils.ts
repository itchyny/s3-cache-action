import * as crypto from "crypto";
import * as fs from "fs";
import * as tmp from "tmp";

export function splitInput(str: string): string[] {
  return str
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s !== "" && !s.startsWith("#"));
}

export function fileName(path: string[]): string {
  const hash = crypto.createHash("md5").update(path.join("\n")).digest("hex");
  return `${hash}.tar.gz`;
}

export function archivePath(): string {
  const tmpdir = process.env.RUNNER_TEMP || "";
  return tmp.tmpNameSync({ tmpdir, postfix: ".tar.gz" });
}

export function fileSize(file: string): number {
  return fs.statSync(file).size;
}
