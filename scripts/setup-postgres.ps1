# PostgreSQL(Docker) 기동 + Prisma 마이그레이션 — 프로젝트 루트에서:
#   powershell -ExecutionPolicy Bypass -File .\scripts\setup-postgres.ps1
# 필요: Docker Desktop 설치 후 터미널에서 `docker version` 이 동작해야 함.
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$docker = Get-Command docker -ErrorAction SilentlyContinue
if (-not $docker) {
  Write-Host "docker 명령을 찾을 수 없습니다. 다음 중 하나를 진행하세요." -ForegroundColor Yellow
  Write-Host "  1) Docker Desktop 설치 후 다시 이 스크립트 실행"
  Write-Host "  2) Windows용 PostgreSQL 설치 후 사용자/DB 생성, diary-app/.env 에 DATABASE_URL 설정"
  Write-Host "     예: postgresql://USER:PASSWORD@localhost:5432/diary"
  Write-Host "  3) 루트에서만: npm run db:deploy --prefix backend (DB가 이미 떠 있을 때)"
  exit 1
}

Write-Host ">> docker compose up -d (PostgreSQL 5432, user/db: diary/diary)" -ForegroundColor Cyan
docker compose up -d

$databaseUrl = "postgresql://diary:diary@localhost:5432/diary"
$envFile = Join-Path $root ".env"
$backendEnv = Join-Path $root "backend\.env"

if (-not (Test-Path $envFile) -and -not (Test-Path $backendEnv)) {
  Add-Content -Path $envFile -Value "DATABASE_URL=`"$databaseUrl`"`n" -Encoding UTF8
  Write-Host ">> 생성함: .env (DATABASE_URL)" -ForegroundColor Green
} else {
  Write-Host ">> .env 또는 backend\.env 가 이미 있습니다. Docker compose 기본값과 맞는지 확인하세요:" -ForegroundColor Yellow
  Write-Host "   $databaseUrl"
}

$env:DATABASE_URL = $databaseUrl
Write-Host ">> prisma migrate deploy (backend)" -ForegroundColor Cyan
Push-Location (Join-Path $root "backend")
try {
  npm run db:deploy
} finally {
  Pop-Location
}
Write-Host ">> 완료. API: cd backend; npm run start:dev  /  전체: npm run dev:all" -ForegroundColor Green
