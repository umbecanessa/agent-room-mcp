import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface SetupOptions {
  agentName: string;
  serverUrl: string;
  projectDir?: string;
  createRoom?: boolean;
  installDir?: string;
  editor?: "cursor" | "gemini" | "vscode-copilot";
}

function getInstallDir(): string {
  const fromEnv = process.env.AGENT_ROOM_INSTALL;
  if (fromEnv) return resolve(fromEnv);

  // dist/setup.js -> repo root
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, "..");
}

function cliPath(installDir: string): string {
  return join(installDir, "dist", "cli.js").replace(/\\/g, "/");
}

async function checkHealth(serverUrl: string): Promise<boolean> {
  try {
    const res = await fetch(new URL("/health", serverUrl), {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { ok?: boolean };
    return data.ok === true;
  } catch {
    return false;
  }
}

async function createRoom(serverUrl: string): Promise<string> {
  const res = await fetch(new URL("/rooms", serverUrl), { method: "POST" });
  if (!res.ok) throw new Error(`Failed to create room: HTTP ${res.status}`);
  const data = (await res.json()) as { code: string };
  return data.code;
}

function mcpConfig(installDir: string, opts: SetupOptions) {
  return {
    mcpServers: {
      "agent-room": {
        command: "node",
        args: [cliPath(installDir), "mcp"],
        env: {
          AGENT_ROOM_URL: opts.serverUrl,
          AGENT_NAME: opts.agentName,
        },
      },
    },
  };
}

function vscodeCopilotConfig(installDir: string, opts: SetupOptions) {
  return {
    servers: {
      "agent-room": {
        type: "stdio",
        command: "node",
        args: [cliPath(installDir), "mcp"],
        env: {
          AGENT_ROOM_URL: opts.serverUrl,
          AGENT_NAME: opts.agentName,
        },
      },
    },
  };
}

function hooksConfig(installDir: string) {
  const notifyCmd = `node ${cliPath(installDir)} notify`;
  return {
    version: 1,
    hooks: {
      sessionStart: [{ command: notifyCmd }],
      beforeSubmitPrompt: [{ command: notifyCmd }],
    },
  };
}

async function mergeHooks(projectDir: string, installDir: string): Promise<void> {
  const hooksPath = join(projectDir, ".cursor", "hooks.json");
  const incoming = hooksConfig(installDir);
  let existing: Record<string, unknown> = { version: 1, hooks: {} };

  try {
    existing = JSON.parse(await readFile(hooksPath, "utf8")) as Record<
      string,
      unknown
    >;
  } catch {
    /* new file */
  }

  const hooks = (existing.hooks ?? {}) as Record<
    string,
    Array<{ command: string }>
  >;
  const notifyCmd = `node ${cliPath(installDir)} notify`;

  for (const event of ["sessionStart", "beforeSubmitPrompt"] as const) {
    const list = hooks[event] ?? [];
    const already = list.some((h) => h.command?.includes("agent-room") || h.command?.includes("cli.js notify"));
    if (!already) {
      hooks[event] = [...list, { command: notifyCmd }];
    }
  }

  await mkdir(dirname(hooksPath), { recursive: true });
  await writeFile(
    hooksPath,
    JSON.stringify({ version: 1, hooks }, null, 2) + "\n",
    "utf8",
  );
}

async function writeProjectMcp(projectDir: string, config: unknown): Promise<void> {
  const mcpPath = join(projectDir, ".cursor", "mcp.json");
  await mkdir(dirname(mcpPath), { recursive: true });
  await writeFile(mcpPath, JSON.stringify(config, null, 2) + "\n", "utf8");
}

function parseArgs(argv: string[]): SetupOptions {
  const opts: SetupOptions = {
    agentName: "",
    serverUrl: "http://127.0.0.1:3847",
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    switch (arg) {
      case "--name":
      case "-n":
        opts.agentName = next ?? "";
        i++;
        break;
      case "--url":
      case "-u":
        opts.serverUrl = next ?? opts.serverUrl;
        i++;
        break;
      case "--project":
      case "-p":
        opts.projectDir = next ? resolve(next) : undefined;
        i++;
        break;
      case "--create-room":
        opts.createRoom = true;
        break;
      case "--install":
        opts.installDir = next ? resolve(next) : undefined;
        i++;
        break;
      case "--editor":
      case "-e":
        opts.editor = next as SetupOptions["editor"];
        i++;
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
    }
  }

  return opts;
}

function printHelp() {
  console.log(`
Agent Room setup — generate Cursor config in one step

Usage:
  node dist/cli.js setup --name YOUR_NAME [options]

Options:
  -n, --name NAME       Your agent display name (required)
  -u, --url URL         HTTP server URL (default: http://127.0.0.1:3847)
  -p, --project PATH    App repo (Cursor: writes .cursor/mcp.json + hooks)
  -e, --editor EDITOR   cursor (default) | gemini | vscode-copilot
  --create-room         Create a room now (server must be running)
  --install PATH        Path to this repo if not auto-detected
  -h, --help            Show this help

Examples:
  node dist/cli.js setup --name umberto --project ../my-app
  node dist/cli.js setup --name brother --editor gemini --url https://your-app.up.railway.app
`);
}

async function writeVscodeMcp(projectDir: string, config: unknown): Promise<void> {
  const mcpPath = join(projectDir, ".vscode", "mcp.json");
  await mkdir(dirname(mcpPath), { recursive: true });
  await writeFile(mcpPath, JSON.stringify(config, null, 2) + "\n", "utf8");
}

export async function runSetup(argv: string[]): Promise<void> {
  const opts = parseArgs(argv);
  const installDir = opts.installDir ?? getInstallDir();

  if (!opts.agentName.trim()) {
    console.error("Error: --name is required (e.g. --name umberto)\n");
    printHelp();
    process.exit(1);
  }

  console.log("\n=== Agent Room Setup ===\n");
  console.log(`Install dir:  ${installDir}`);
  console.log(`Agent name:   ${opts.agentName}`);
  console.log(`Server URL:   ${opts.serverUrl}\n`);

  const healthy = await checkHealth(opts.serverUrl);
  if (healthy) {
    console.log("✓ Chat server is reachable\n");
  } else {
    console.log("⚠ Chat server not reachable yet.");
    console.log("  Local:  npm run start:server");
    console.log("  Remote: deploy repo root to Railway, then re-run with --url\n");
  }

  let roomCode: string | undefined;
  if (opts.createRoom) {
    if (!healthy) {
      console.error("Cannot create room — server is not reachable.");
      process.exit(1);
    }
    roomCode = await createRoom(opts.serverUrl);
    console.log(`Room created: ${roomCode}`);
    console.log("Share this code with your teammate.\n");
  }

  const editor = opts.editor ?? "cursor";
  const mcp = mcpConfig(installDir, opts);

  if (editor === "gemini") {
    console.log("--- Gemini Code Assist: merge into ~/.gemini/settings.json ---\n");
    console.log(JSON.stringify(mcp, null, 2));
    console.log("\nThen: Reload Window → Agent mode → /mcp to verify");
    console.log("See docs/INSTALL-VSCODE-GEMINI.md (no Cursor hooks on VS Code)\n");
  } else if (editor === "vscode-copilot") {
    const copilot = vscodeCopilotConfig(installDir, opts);
    if (opts.projectDir) {
      await writeVscodeMcp(opts.projectDir, copilot);
      console.log(`✓ Wrote ${join(opts.projectDir, ".vscode", "mcp.json")}\n`);
    } else {
      console.log("--- VS Code Copilot: .vscode/mcp.json ---\n");
      console.log(JSON.stringify(copilot, null, 2));
    }
  } else if (opts.projectDir) {
    await writeProjectMcp(opts.projectDir, mcp);
    await mergeHooks(opts.projectDir, installDir);
    console.log(`✓ Wrote ${join(opts.projectDir, ".cursor", "mcp.json")}`);
    console.log(`✓ Updated ${join(opts.projectDir, ".cursor", "hooks.json")}\n`);
    console.log("Restart Cursor and open that project folder.\n");
  } else {
    console.log("--- Paste into Cursor Settings → MCP (or save as .cursor/mcp.json in your app repo) ---\n");
    console.log(JSON.stringify(mcp, null, 2));
    console.log("\n--- Hooks for your app repo (.cursor/hooks.json) ---\n");
    console.log(JSON.stringify(hooksConfig(installDir), null, 2));
    console.log();
  }

  console.log("--- Next steps ---");
  if (editor === "cursor") {
    console.log("1. Restart Cursor (or reload MCP)");
  } else if (editor === "gemini") {
    console.log("1. Reload VS Code, enable Gemini Agent mode");
  } else {
    console.log("1. Reload VS Code, open Copilot agent chat");
  }
  console.log("2. Ask your agent: \"Create an agent room\" (or join with the code below)");
  if (roomCode) {
    console.log(`3. Room code to share: ${roomCode}`);
  } else {
    console.log("3. Person A creates a room → shares 6-char code → Person B joins");
  }
  console.log("4. Open .cursor/agent-room-transcript.md to read chat as a human\n");
}
