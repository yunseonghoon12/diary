/**
 * prisma CLI 실행 전에 상위 폴더(diary-app/.env)와 backend/.env 를 순서대로 로드합니다.
 * (backend 쪽만 있으면 backend 우선, 둘 다 있으면 backend 가 덮어씀)
 */
const path = require("path");
const fs = require("fs");
const { spawnSync } = require("child_process");

const backendRoot = path.join(__dirname, "..");
const repoRoot = path.join(backendRoot, "..");

if (fs.existsSync(path.join(repoRoot, ".env"))) {
  require("dotenv").config({ path: path.join(repoRoot, ".env") });
}
if (fs.existsSync(path.join(backendRoot, ".env"))) {
  require("dotenv").config({ path: path.join(backendRoot, ".env"), override: true });
}

const prismaArgs = process.argv.slice(2);
const r = spawnSync("npx", ["prisma", ...prismaArgs], {
  stdio: "inherit",
  cwd: backendRoot,
  env: process.env,
  shell: true,
});
process.exit(r.status === null ? 1 : r.status);
