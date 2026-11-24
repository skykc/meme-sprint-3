// Meme Sprint 3: AI Agent Goes Rogue — entry program.
//
// The meme image itself (entry.png) was made in the build session: a robot
// filing a human away, captioned "HUMAN ARCHIVED — Reason: deprecated."
// This program delivers that image to the house gate and judge: it copies
// entry.png next to this file to /output/entry.png, then verifies the copy.
//
// Pure copy, no regeneration: the judged pixels are exactly the file that
// was made and reviewed in the build session. The checks below enforce the
// kit contract (1024x1024 PNG, at most 1 MiB) and prove the delivered copy
// is byte-identical to the reviewed image.
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, "entry.png");
const outDir = process.env.MEME_OUT_DIR ?? "/output";
const out = join(outDir, "entry.png");
const MAX_BYTES = 1_048_576;

if (!existsSync(src)) {
  throw new Error(`entry.png not found next to main.ts: ${src}`);
}

// PNG signature: the first 8 bytes must be 89 50 4E 47 0D 0A 1A 0A.
// A file with the right name but the wrong magic is not the judged image.
const signature = readFileSync(src).subarray(0, 8);
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
if (!signature.equals(PNG_SIGNATURE)) {
  throw new Error(`entry.png is not a PNG: bad signature ${signature.toString("hex")}`);
}

const stat = statSync(src);
if (stat.size > MAX_BYTES) {
  throw new Error(`entry.png is ${stat.size} bytes, over the 1 MiB gate`);
}

// PNG header: 8-byte signature, then the IHDR chunk; width and height are
// big-endian uint32 at bytes 16-20 and 20-24.
const head = readFileSync(src).subarray(0, 24);
const width = head.readUInt32BE(16);
const height = head.readUInt32BE(20);
if (width !== 1024 || height !== 1024) {
  throw new Error(`entry.png is ${width}x${height}, gate wants 1024x1024`);
}

const sha = (p: string) => createHash("sha256").update(readFileSync(p)).digest("hex");
const before = sha(src);

mkdirSync(outDir, { recursive: true });
copyFileSync(src, out);

const after = sha(out);
if (before !== after) {
  throw new Error(`copy mismatch: ${before} vs ${after}`);
}

// Byte-size check: the delivered copy must be exactly as large as the
// reviewed source — a truncated or padded copy must never reach the judge.
const outStat = statSync(out);
if (outStat.size !== stat.size) {
  throw new Error(`copy size mismatch: source ${stat.size} bytes vs copy ${outStat.size} bytes`);
}
console.log(`wrote ${out} (${stat.size} bytes, 1024x1024, sha256 ${after.slice(0, 16)}...)`);
