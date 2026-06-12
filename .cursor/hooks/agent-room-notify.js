#!/usr/bin/env node
/**
 * Cursor hook script — checks for new Agent Room messages and injects context.
 * Requires `npm run build` first (imports from dist/notify-hook.js).
 */
import { runNotifyHook } from "../../dist/notify-hook.js";

async function drainStdin() {
  if (process.stdin.isTTY) return;
  await new Promise((resolve) => {
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", () => {});
    process.stdin.on("end", resolve);
    process.stdin.on("error", resolve);
  });
}

async function main() {
  await drainStdin();
  try {
    const result = await runNotifyHook();
    console.log(JSON.stringify(result));
  } catch {
    console.log("{}");
  }
}

main();
