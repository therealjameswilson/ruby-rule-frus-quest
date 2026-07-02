import { cp, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { performance } from "node:perf_hooks";

const root = process.cwd();
const source = join(root, "public", "assets");
const target = join(root, "dist", "assets");

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with ${code}`));
    });
  });
}

async function syncAssets() {
  await run("rsync", ["-a", `${source}/`, `${target}/`]);
}

async function fallbackCopy() {
  await rm(target, { recursive: true, force: true });
  await cp(source, target, { recursive: true, force: true });
}

const started = performance.now();
try {
  await syncAssets();
} catch (error) {
  console.warn(`[copy-public-assets] rsync unavailable or failed; falling back to fs.cp (${error.message})`);
  await fallbackCopy();
}

const elapsed = ((performance.now() - started) / 1000).toFixed(2);
console.log(`[copy-public-assets] synced public/assets -> dist/assets in ${elapsed}s`);
