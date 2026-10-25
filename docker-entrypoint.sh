#!/bin/sh
# Container startup for Labor Landmarks: migrate (only if needed) -> seed -> server.
#
# Why "only if needed": Coolify deploys this app as a ROLLING UPDATE - the old
# container keeps serving until the new one passes its health check. While the
# old server is running, `prisma migrate deploy` cannot take its lock on the
# SQLite file and fails with "database is locked" (reproduced locally 25 Oct
# 2026). Running it unconditionally made EVERY deploy crash-loop and roll back,
# even deploys with no schema change. `prisma migrate status` is read-only and
# works alongside the old server, so check first and only migrate when there is
# something to apply.

DB_FILE="${DATABASE_URL#file:}"
if [ ! -f "$DB_FILE" ]; then
    echo '========================================'
    echo "WARNING: No existing database found at $DB_FILE"
    echo 'If this is production, a persistent volume MUST be mounted at /app/data'
    echo 'Without it, ALL DATA IS LOST on every deploy!'
    echo '========================================'
else
    echo "Existing database found at $DB_FILE"
fi

echo "Checking for pending database migrations..."
if npx prisma migrate status > /tmp/migrate-status.txt 2>&1; then
    echo "Database schema is up to date - no migration needed."
else
    # Non-zero means pending migrations, or the check itself failed. Either way,
    # try to apply; a real error is reported by migrate deploy below.
    cat /tmp/migrate-status.txt
    echo "Applying pending migrations..."
    MIGRATION_ATTEMPTS=${MIGRATION_ATTEMPTS:-12}
    MIGRATION_DELAY=${MIGRATION_DELAY:-5}
    migration_ok=0
    attempt=1
    while [ "$attempt" -le "$MIGRATION_ATTEMPTS" ]; do
        if npx prisma migrate deploy; then
            migration_ok=1
            break
        fi
        if [ "$attempt" -lt "$MIGRATION_ATTEMPTS" ]; then
            echo "Migration attempt $attempt/$MIGRATION_ATTEMPTS failed. Retrying in ${MIGRATION_DELAY}s..."
            sleep "$MIGRATION_DELAY"
        fi
        attempt=$((attempt + 1))
    done

    # Refuse to start on failure: a server running against a schema it does not
    # match serves errors. A failed deploy rolls back cleanly; a broken one does not.
    if [ "$migration_ok" -ne 1 ]; then
        echo '========================================'
        echo "FATAL: migrations failed after $MIGRATION_ATTEMPTS attempts."
        echo "If the errors above say 'database is locked', the OLD container is"
        echo 'still running and holding the database (rolling update).'
        echo 'For a deploy that changes the schema: Stop the app in Coolify, then Deploy.'
        echo '========================================'
        exit 1
    fi
fi

# Seed default landmarks - only writes when the database is empty.
npx tsx prisma/seed.ts || exit 1

exec tsx server/index.ts
