#!/bin/sh
# Starts the app for the browser tests (`npm run test:browser` runs this).
#
# Uses a throwaway database at tests/browser/.tmp/test.db, rebuilt on every run
# with production's migrations, then known test landmarks (fixtures.ts). The
# default-landmarks seed is skipped on purpose: the tests need known data.
# Never touches prisma/dev.db: DATABASE_URL is set here, before .env is read
# (dotenv does not override it), and both this script and fixtures.ts refuse
# to run against any other database.
set -e
cd "$(dirname "$0")/../.."

TMP="$(pwd)/tests/browser/.tmp"
rm -rf "$TMP"
mkdir -p "$TMP"

export DATABASE_URL="file:$TMP/test.db"
export PORT="${PORT:-3102}"
export PUBLIC_BASE_URL="http://localhost:$PORT"
export NODE_ENV=test
# The tests load pages much faster than a visitor; the live limit (100 API
# requests a minute) would start refusing them part-way through a run.
export API_RATE_LIMIT_PER_MINUTE=5000
unset ADMIN_PASSWORD

case "$DATABASE_URL" in
  */tests/browser/.tmp/test.db) ;;
  *) echo "Refusing to start: DATABASE_URL is not the test database ($DATABASE_URL)"; exit 1 ;;
esac

npx prisma migrate deploy
npx tsx tests/browser/fixtures.ts

# Test the built app, as production serves it.
npm run build

exec npx tsx server/index.ts
