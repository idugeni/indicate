#!/bin/sh
# Ignored Build Step for Vercel: exit 0 to skip the production build, 1 to run it.
#
# Lives in a file because vercel.json caps ignoreCommand at 256 characters and
# the inline form had no room left for a readable allowlist.
#
# Only paths the production bundle never reads are ignorable. Migrations stay
# build-triggering on purpose: a migration-only push is a schema change, and the
# runtime migration gate reads it from the database rather than the bundle.

IGNORABLE='^(docs/|\.agents/|\.github/|\.claude/)|^(LICENSE|\.prettierrc|\.markdownlint\.json|skills-lock\.json)$|\.(md|test\.ts|test\.tsx)$'

base="${VERCEL_GIT_PREVIOUS_SHA:-HEAD^}"
if ! git rev-parse --verify --quiet "${base}^{commit}" >/dev/null 2>&1; then
  base="HEAD^"
fi
if ! git rev-parse --verify --quiet "${base}^{commit}" >/dev/null 2>&1; then
  exit 1
fi

if git diff --name-only "$base" HEAD | grep -vE "$IGNORABLE" >/dev/null 2>&1; then
  exit 1
fi

exit 0
