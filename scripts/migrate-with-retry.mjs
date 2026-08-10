import { spawn } from "node:child_process";
import { resolve } from "node:path";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is missing. In Railway, add a reference variable from the PostgreSQL service.");
  process.exit(1);
}

let hostname;
try {
  hostname = new URL(databaseUrl).hostname;
} catch {
  console.error("DATABASE_URL is not a valid PostgreSQL connection URL.");
  process.exit(1);
}

if (process.env.RAILWAY_ENVIRONMENT_ID && (hostname === "host" || hostname === "localhost" || hostname === "127.0.0.1")) {
  console.error(`DATABASE_URL points to ${hostname}, which is not reachable from Railway. Set DATABASE_URL to the PostgreSQL service reference: \${{Postgres.DATABASE_URL}}`);
  process.exit(1);
}

const prismaExecutable = resolve("node_modules", ".bin", process.platform === "win32" ? "prisma.cmd" : "prisma");
const maxAttempts = 5;

for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  const exitCode = await new Promise((complete) => {
    const child = spawn(prismaExecutable, ["migrate", "deploy"], { stdio: "inherit", env: process.env });
    child.on("error", (error) => { console.error("Could not start Prisma migration:", error.message); complete(1); });
    child.on("exit", (code) => complete(code ?? 1));
  });

  if (exitCode === 0) process.exit(0);
  if (attempt === maxAttempts) process.exit(exitCode);
  const delayMs = attempt * 3_000;
  console.warn(`Database migration attempt ${attempt} failed. Retrying in ${delayMs / 1_000}s…`);
  await new Promise((resolveDelay) => setTimeout(resolveDelay, delayMs));
}
