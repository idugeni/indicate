#!/bin/sh
# Ignored Build Step for Vercel: exit 0 to skip the production build, 1 to run it.
#
# Lives in a file because vercel.json caps ignoreCommand at 256 characters and
# the inline form had no room left for a readable allowlist.
#
# Only paths the production bundle never reads are ignorable. Migrations stay
# build-triggering on purpose: a migration-only push is a schema change, and the
# runtime migration gate reads it from the database rather than the bundle.
#
# Fails closed, and never compares against HEAD^. Exit 0 skips a production
# build, so an answer this script is not sure about has to build. The earlier
# version fell back to HEAD^ when VERCEL_GIT_PREVIOUS_SHA was missing, and Vercel
# clones shallow, so a push whose tip commit touched only docs collapsed to a
# one-commit diff and skipped - silently stranding every code commit underneath
# it in the same push. Requiring the real previous deployment SHA makes that
# unrepresentable: no SHA, or a SHA this clone cannot resolve, builds.
#
# scripts/ci/skip-build.test.sh pins this contract, including the case that
# shipped the stranding.

IGNORABLE='^(docs/|\.agents/|\.github/|\.claude/)|^(LICENSE|\.prettierrc|\.markdownlint\.json|skills-lock\.json)$|\.(md|test\.ts|test\.tsx)$'

previous="${VERCEL_GIT_PREVIOUS_SHA:-}"
if [ -z "$previous" ]; then
  echo "skip-build: VERCEL_GIT_PREVIOUS_SHA is unset; building."
  exit 1
fi

head=$(git rev-parse HEAD)
if [ "$previous" = "$head" ]; then
  echo "skip-build: previous deployment SHA is HEAD; nothing was compared; building."
  exit 1
fi

if ! git cat-file -e "${previous}^{commit}" 2>/dev/null; then
  echo "skip-build: previous deployment SHA $previous is not in this clone; building."
  exit 1
fi

if ! changed=$(git diff --name-only "$previous" HEAD); then
  echo "skip-build: diff against $previous failed; building."
  exit 1
fi

if [ -z "$changed" ]; then
  echo "skip-build: $previous..HEAD changed no files; building."
  exit 1
fi

if printf '%s\n' "$changed" | grep -vE "$IGNORABLE" >/dev/null 2>&1; then
  exit 1
fi

exit 0
