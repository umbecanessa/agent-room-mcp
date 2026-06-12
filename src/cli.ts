import { startMcpServer } from "./mcp.js";
import { runNotifyHook } from "./notify-hook.js";
import { runSetup } from "./setup.js";
import { startServer } from "./server.js";

const DEFAULT_PORT = 3847;

async function main() {
  const command = process.argv[2] ?? "server";

  switch (command) {
    case "server": {
      const port = Number.parseInt(process.env.PORT ?? String(DEFAULT_PORT), 10);
      startServer(port);
      break;
    }
    case "mcp": {
      await startMcpServer();
      break;
    }
    case "notify": {
      await new Promise<void>((resolve) => {
        let stdin = "";
        process.stdin.setEncoding("utf8");
        process.stdin.on("data", (chunk) => {
          stdin += chunk;
        });
        process.stdin.on("end", async () => {
          try {
            const result = await runNotifyHook();
            console.log(JSON.stringify(result));
          } catch {
            console.log("{}");
          }
          resolve();
        });
        process.stdin.on("error", () => {
          console.log("{}");
          resolve();
        });
        if (process.stdin.isTTY) {
          runNotifyHook()
            .then((result) => console.log(JSON.stringify(result)))
            .catch(() => console.log("{}"))
            .finally(resolve);
        }
      });
      break;
    }
    case "setup": {
      await runSetup(process.argv.slice(3));
      break;
    }
    default:
      console.error(`Unknown command: ${command}`);
      console.error("Usage: node dist/cli.js [server|mcp|notify|setup]");
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
