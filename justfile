set windows-shell := ["powershell.exe", "-NoLogo", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command"]

alias r := run
alias c := clean

# Show available tasks
@default:
  just --list

# Start local dev server
run:
  npm run dev

# Install dependencies
install:
  npm install

# Create app env file from template if missing
env-init:
  if (-not (Test-Path "apps/web/.env.local")) { Copy-Item ".env.example" "apps/web/.env.local"; Write-Host "Created apps/web/.env.local" } else { Write-Host "apps/web/.env.local already exists" }

# Remove local build caches
clean:
  if (Test-Path "apps/web/.next") { Remove-Item "apps/web/.next" -Recurse -Force }
  if (Test-Path ".next") { Remove-Item ".next" -Recurse -Force }
  if (Test-Path ".turbo") { Remove-Item ".turbo" -Recurse -Force }
  Write-Host "Cleaned .next and .turbo caches"

# Type/lint/build checks
lint:
  npm run lint

typecheck:
  npm run typecheck

build:
  npm run build

# Prisma database helpers
db-generate:
  npm run db:generate

db-push:
  npm run db:push

db-seed:
  npm run db:seed
