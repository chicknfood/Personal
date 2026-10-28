#!/bin/bash
# One-Click Launcher for Multiplication Trainer (macOS)

cd "$(dirname "$0")" || exit 1

echo "==================================================="
echo "  ⚡ Math Champions - Multiplication Trainer"
echo "==================================================="

# Load Node.js from common macOS locations (NVM / Homebrew) if not in PATH
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  source "$HOME/.nvm/nvm.sh"
elif [ -d "$HOME/.nvm/versions/node" ]; then
  LATEST_NODE=$(ls -1 "$HOME/.nvm/versions/node" | tail -n 1)
  export PATH="$HOME/.nvm/versions/node/$LATEST_NODE/bin:$PATH"
fi

# If Node/npm is available, run the live development server
if command -v npm >/dev/null 2>&1; then
  if [ ! -d "node_modules" ]; then
    echo "📦 First-time setup: Installing packages (this takes ~30 seconds)..."
    npm install
  fi
  echo "🚀 Starting Multiplication Trainer and opening your browser..."
  echo "   (Press Ctrl + C in this window when you are done playing)"
  npm start
else
  # Fallback for machines without Node.js installed
  if [ -f "standalone.html" ]; then
    echo "🌐 Opening standalone version in your default web browser..."
    open "standalone.html"
  else
    echo "❌ Node.js was not found. Please install Node.js from https://nodejs.org/"
    read -r -p "Press Enter to exit..."
  fi
fi
