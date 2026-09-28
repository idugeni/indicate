#!/bin/sh
# Contract test for scripts/ci/skip-build.sh.
#
# Runs the real script inside throwaway repositories and asserts the exit code
# for every way it can be sure and every way it can be unsure. The gate that
# decides whether a production build runs must be fail-closed: exit 0 skips the
# build, so any doubt has to exit 1.
#
# Usage: sh scripts/ci/skip-build.test.sh

set -u

# The script under test greps with `grep -vE`. A working GNU grep selects no
# lines and exits 1; a non-GNU grep rejects -E, prints usage, and exits 0, which
# every result below would then read as "build". On Windows `sh` resolves
# WindowsGrep, so refuse to report anything rather than report noise.
probe_status=0
printf 'a\n' | grep -vE 'a' >/dev/null 2>&1 || probe_status=$?
if [ "$probe_status" -ne 1 ]; then
  echo "skip-build.test.sh: no GNU-compatible grep -E on PATH; refusing to report." >&2
  echo "  sh resolved: $(command -v grep 2>/dev/null)" >&2
  exit 2
fi

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
SKIP_BUILD="$SCRIPT_DIR/skip-build.sh"
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

pass=0
fail=0

check() {
  label=$1
  expected=$2
  repo=$3
  previous=$4
  (
    cd "$repo" || exit 1
    VERCEL_GIT_PREVIOUS_SHA="$previous" sh "$SKIP_BUILD" >/dev/null 2>&1
  )
  actual=$?
  if [ "$expected" = "$actual" ]; then
    pass=$((pass + 1))
    printf 'ok   %-50s exit=%s\n' "$label" "$actual"
  else
    fail=$((fail + 1))
    printf 'FAIL %-50s expected=%s actual=%s\n' "$label" "$expected" "$actual"
  fi
}

sha() { git -C "$1" rev-parse "$2" 2>/dev/null; }

seed() {
  repo=$1
  mkdir -p "$repo"
  git -C "$repo" init --quiet -b main >/dev/null 2>&1
  git -C "$repo" config user.email test@example.com
  git -C "$repo" config user.name test
  git -C "$repo" config core.autocrlf false
  printf 'one\n' > "$repo/README.md"
  git -C "$repo" add README.md >/dev/null 2>&1
  git -C "$repo" commit --quiet -m base >/dev/null 2>&1
}

commit_file() {
  repo=$1
  path=$2
  mkdir -p "$repo/$(dirname "$path")"
  printf 'content\n' > "$repo/$path"
  git -C "$repo" add "$path" >/dev/null 2>&1
  git -C "$repo" commit --quiet -m "add $path" >/dev/null 2>&1
}

DOCS_REPO="$WORK/docs-only";     seed "$DOCS_REPO";     DOCS_BASE=$(sha "$DOCS_REPO" HEAD); commit_file "$DOCS_REPO" docs/note.md
CODE_REPO="$WORK/code";          seed "$CODE_REPO";      CODE_BASE=$(sha "$CODE_REPO" HEAD);  commit_file "$CODE_REPO" src/index.ts
MIXED_REPO="$WORK/mixed";        seed "$MIXED_REPO";     MIXED_BASE=$(sha "$MIXED_REPO" HEAD)
commit_file "$MIXED_REPO" docs/note.md
commit_file "$MIXED_REPO" src/index.ts
MIXED_HEAD=$(sha "$MIXED_REPO" HEAD)

# Certain cases: the diff since the previous deployment decides.
check "code change since previous deployment"       1 "$CODE_REPO"  "$CODE_BASE"
check "docs-only change since previous deployment"  0 "$DOCS_REPO"  "$DOCS_BASE"
check "code commit on top of a docs commit"         1 "$MIXED_REPO" "$MIXED_BASE"

# Uncertain cases. Every one of these must build.
check "previous SHA unset"                         1 "$CODE_REPO"  ""
check "previous SHA unset on a docs-only push"     1 "$DOCS_REPO"  ""
check "previous SHA unresolvable in this clone"    1 "$CODE_REPO"  "deadbeefdeadbeefdeadbeefdeadbeefdeadbeef"
check "previous SHA equals HEAD"                   1 "$CODE_REPO"  "$(sha "$CODE_REPO" HEAD)"

# The regression this file exists for: a docs-only tip must never be able to
# hide a code change sitting below it in the same push.
commit_file "$MIXED_REPO" docs/another.md
check "docs-only tip over an undeployed code change" 1 "$MIXED_REPO" "$MIXED_BASE"
check "docs-only tip, code already deployed"         0 "$MIXED_REPO" "$MIXED_HEAD"

printf '\n%d passed, %d failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
