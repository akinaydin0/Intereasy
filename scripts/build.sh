#!/bin/bash
set -e

echo "Building Interview AI..."

# Install dependencies
npm install

# Build renderer (Vite)
npx vite build --config vite.config.ts

# Build main process (TypeScript)
npx tsc -p tsconfig.main.json

echo "Build complete! Run 'npm run dist' to create installer."
