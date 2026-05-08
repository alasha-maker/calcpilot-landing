#!/usr/bin/env bash
# setup-and-push.sh
# One-shot setup for pushing the CalcPilot landing page to GitHub.
# Handles: Homebrew, GitHub CLI, browser-based auth, Keychain cleanup,
# remote reset, and the push itself. Safe to re-run.

set -e

PROJECT_DIR="/Users/mahmoud/Library/CloudStorage/OneDrive-MuscoSportsLighting,LLC/SLD_Updater App/engineering-tool-platform/landing-page-original"
GITHUB_USER="alasha-maker"
REPO_NAME="calcpilot-landing"
REPO_URL="https://github.com/${GITHUB_USER}/${REPO_NAME}.git"

cd "$PROJECT_DIR"

step() { printf "\n==> %s\n" "$1"; }

# ---- Homebrew ----------------------------------------------------------------
step "Checking Homebrew"
if ! command -v brew >/dev/null 2>&1; then
  echo "Homebrew not found. Installing (you will be asked for your Mac password)..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

# Make sure brew is on PATH for this shell
if [ -x /opt/homebrew/bin/brew ]; then
  eval "$(/opt/homebrew/bin/brew shellenv)"
elif [ -x /usr/local/bin/brew ]; then
  eval "$(/usr/local/bin/brew shellenv)"
fi
echo "Homebrew: $(brew --version | head -n1)"

# ---- GitHub CLI --------------------------------------------------------------
step "Checking GitHub CLI"
if ! command -v gh >/dev/null 2>&1; then
  echo "Installing gh..."
  brew install gh
fi
echo "gh: $(gh --version | head -n1)"

# ---- Authenticate ------------------------------------------------------------
step "Checking GitHub authentication"
if ! gh auth status >/dev/null 2>&1; then
  echo "Not authenticated. Opening your browser for login..."
  echo "(Pick: GitHub.com, HTTPS, Yes to credential helper, Login with web browser)"
  gh auth login --hostname github.com --git-protocol https --web
else
  echo "Already authenticated as: $(gh api user -q .login)"
fi

step "Wiring gh as Git credential helper"
gh auth setup-git

# ---- Clean stale Keychain entry ---------------------------------------------
step "Clearing any stale github.com credentials in Keychain"
git credential-osxkeychain erase <<EOF || true
host=github.com
protocol=https
EOF

# ---- Reset remote ------------------------------------------------------------
step "Setting Git remote to ${REPO_URL}"
git remote remove origin >/dev/null 2>&1 || true
git remote add origin "$REPO_URL"
git remote -v

# ---- Ensure branch is 'main' ------------------------------------------------
step "Ensuring branch is 'main'"
git branch -M main

# ---- Make sure something is committed ---------------------------------------
if ! git rev-parse HEAD >/dev/null 2>&1; then
  step "No commits yet — creating initial commit"
  git add .
  git commit -m "Initial commit: CalcPilot landing page"
fi

# ---- Push --------------------------------------------------------------------
step "Pushing to GitHub"
git push -u origin main

echo ""
echo "============================================"
echo "  Done."
echo "  Repo:  https://github.com/${GITHUB_USER}/${REPO_NAME}"
echo "  Now go to Cloudflare Pages and click Retry build."
echo "============================================"
