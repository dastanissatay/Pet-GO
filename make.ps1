# Windows stand-in for the Makefile, for machines without make. Same tasks.
# Usage: .\make.ps1 <task> [-m "message"]      Example: .\make.ps1 migration -m "add pets"
# Add -BackendOnly to run test/lint for the backend only.
param(
  [Parameter(Mandatory = $true)][string]$Task,
  [string]$m = "",
  [switch]$BackendOnly
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
$dev = @("compose", "-f", "docker-compose.yml", "-f", "docker-compose.dev.yml")
$prod = @("compose", "-f", "docker-compose.yml", "-f", "docker-compose.prod.yml")

function Invoke-Docker([string[]]$argv) {
  & docker @argv
  if ($LASTEXITCODE -ne 0) { throw "docker $($argv -join ' ') failed" }
}
function Backend([string[]]$argv) { Invoke-Docker ($dev + @("exec", "-T", "backend") + $argv) }
function Frontend([string[]]$argv) { Invoke-Docker ($dev + @("exec", "-T", "frontend") + $argv) }

switch ($Task) {
  "up"      { Invoke-Docker ($dev + @("up", "-d", "--build")) }
  "down"    { Invoke-Docker ($dev + @("down")) }
  "logs"    { Invoke-Docker ($dev + @("logs", "-f")) }
  "prod-up" { Invoke-Docker ($prod + @("up", "-d", "--build")) }
  "migrate" { Backend @("alembic", "upgrade", "head") }
  "migration" {
    if (-not $m) { throw 'Give a message: .\make.ps1 migration -m "add pets"' }
    Backend @("alembic", "revision", "--autogenerate", "-m", $m)
  }
  "test" {
    Backend @("pytest", "-q")
    if (-not $BackendOnly) { Frontend @("pnpm", "test") }
  }
  "lint" {
    Backend @("ruff", "check", ".")
    Backend @("ruff", "format", "--check", ".")
    Backend @("mypy")
    if (-not $BackendOnly) {
      Frontend @("pnpm", "lint")
    }
  }
  "gen-api" {
    Invoke-Docker ($dev + @("exec", "-T", "-e", "OPENAPI_URL=http://backend:8000/openapi.json",
      "frontend", "pnpm", "gen-api"))
  }
  default {
    throw "Unknown task '$Task'. Tasks: up, down, logs, migrate, migration, test, lint, gen-api, prod-up"
  }
}
