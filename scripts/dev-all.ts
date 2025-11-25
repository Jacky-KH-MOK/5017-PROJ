import { spawn, ChildProcess, SpawnOptions } from "child_process";
import waitOn from "wait-on";
import fs from "fs";
import path from "path";

const isWin = process.platform === "win32";
const npmCmd = isWin ? "cmd.exe" : "npm";
const npmPrefixArgs = isWin ? ["/c", "npm"] : [];
const rootDir = process.cwd();
const tracked: ChildProcess[] = [];

type SpawnConfig = SpawnOptions & { track?: boolean };

function log(message: string) {
  console.log(`[dev] ${message}`);
}

function pipeOutput(child: ChildProcess, label: string) {
  const forward = (data: any) => {
    const text = data.toString();
    text.split(/\r?\n/).forEach((line: string) => {
      if (line.length === 0) return;
      console.log(`[${label}] ${line}`);
    });
  };
  child.stdout?.on("data", forward);
  child.stderr?.on("data", forward);
}

function spawnNpm(label: string, args: string[], options: SpawnConfig = {}) {
  const finalArgs = [...npmPrefixArgs, ...args];
  const child = spawn(npmCmd, finalArgs, {
    cwd: rootDir,
    env: { ...process.env, ...options.env },
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });
  pipeOutput(child, label);
  if (options.track !== false) {
    tracked.push(child);
  }
  child.on("exit", (code) => {
    if (code !== null && code !== 0) {
      console.warn(`[${label}] exited with code ${code}`);
    }
  });
  return child;
}

function spawnWorkspace(label: string, script: string, workspace: string, options?: SpawnConfig) {
  return spawnNpm(label, ["run", script, "--workspace", workspace], options);
}

function runWorkspace(label: string, script: string, workspace: string) {
  return new Promise<void>((resolve, reject) => {
    const child = spawnWorkspace(label, script, workspace, { track: false });
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${label} exited with code ${code}`));
      }
    });
  });
}

function ensureEnvFile() {
  const envPath = path.join(rootDir, ".env");
  const envSamplePath = path.join(rootDir, "env.sample");
  
  if (!fs.existsSync(envPath)) {
    if (fs.existsSync(envSamplePath)) {
      log("Creating .env file from env.sample...");
      fs.copyFileSync(envSamplePath, envPath);
      log(".env file created successfully.");
    } else {
      log("Warning: env.sample not found. .env file may be missing required variables.");
    }
  }
}

async function main() {
  ensureEnvFile();
  log("Starting Hardhat node...");
  spawnWorkspace("hardhat", "node", "contracts");
  await new Promise<void>((resolve, reject) => {
    waitOn({ resources: ["tcp:127.0.0.1:8545"], timeout: 30000 }, (err: any) => {
      if (err) reject(err);
      else resolve();
    });
  });
  log("Hardhat node ready. Deploying CexAmlAuditTrail...");
  await runWorkspace("deploy", "deploy:local", "contracts");
  log("Deployment complete. Launching oracle, compliance engine, dashboard, and wallet...");
  spawnNpm("stack", ["run", "dev:stack"]);
  log("All services running. Press Ctrl+C to stop.");
}

function shutdown() {
  log("Shutting down...");
  tracked.forEach((child) => {
    try {
      child.kill();
    } catch {
      // ignore
    }
  });
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

main().catch((error) => {
  console.error("[dev] Failed to start dev environment:", error);
  shutdown();
});

