# Interview AI — Claude Code Instructions

You are building a desktop application called **Interview AI** — an invisible real-time AI assistant for meetings and interviews.

## What This App Does

- Runs as a desktop overlay (Electron.js)
- **Invisible during screen share** — window is excluded from screen capture
- Captures microphone audio in real-time
- Transcribes speech using OpenAI Whisper API
- Sends transcript + context to Claude/GPT-4 API
- Displays AI responses in a floating overlay panel
- Supports pre-loading context documents (PDF, DOCX, TXT) before session

## Tech Stack

- **Framework:** Electron.js (Node.js desktop app)
- **Frontend:** React + TypeScript
- **Audio:** Web Audio API + MediaRecorder
- **Transcription:** OpenAI Whisper API (streaming)
- **AI:** Anthropic Claude API (claude-sonnet-4-5) or OpenAI GPT-4o
- **Document parsing:** pdf-parse, mammoth (for DOCX)
- **Vector store:** simple in-memory (no database needed for MVP)
- **Styling:** Tailwind CSS

## Critical Feature: Screen Share Invisibility

Use Electron's `setContentProtection(true)` on the overlay window.
This makes the window invisible to screen capture/share tools (OBS, Zoom, Teams, Google Meet).
The overlay is ONLY visible on the physical screen of the user.

## File Structure

```
interview-ai/
├── src/
│   ├── main/
│   │   ├── index.ts          ← Electron main process
│   │   ├── overlay.ts        ← Overlay window creation & protection
│   │   ├── audio.ts          ← Audio capture (main process)
│   │   └── ipc.ts            ← IPC handlers
│   ├── renderer/
│   │   ├── App.tsx           ← Main React app
│   │   ├── components/
│   │   │   ├── Overlay.tsx   ← Floating overlay UI
│   │   │   ├── Transcript.tsx ← Live transcript panel
│   │   │   ├── AIResponse.tsx ← AI answer panel
│   │   │   ├── ContextPanel.tsx ← Document upload/context
│   │   │   └── Settings.tsx  ← API keys, model settings
│   │   └── styles/
│   │       └── globals.css
│   └── shared/
│       ├── types.ts          ← Shared TypeScript types
│       └── prompts.ts        ← System prompts for AI
├── docs/
│   ├── ARCHITECTURE.md
│   ├── SETUP.md
│   └── FEATURES.md
├── scripts/
│   └── build.sh
├── assets/
│   └── icon.png
├── CLAUDE.md                 ← THIS FILE
├── package.json
├── tsconfig.json
├── electron-builder.json
└── .env.example
```

## Build Order

Follow this exact order:

1. **package.json** — dependencies first
2. **tsconfig.json** — TypeScript config
3. **src/shared/types.ts** — shared types
4. **src/shared/prompts.ts** — AI system prompts
5. **src/main/index.ts** — Electron main process
6. **src/main/overlay.ts** — Invisible overlay window (CRITICAL: setContentProtection)
7. **src/main/audio.ts** — Microphone capture
8. **src/main/ipc.ts** — IPC bridge
9. **src/renderer/App.tsx** — React root
10. **src/renderer/components/Overlay.tsx** — Main UI
11. **src/renderer/components/Transcript.tsx** — Transcript display
12. **src/renderer/components/AIResponse.tsx** — AI response display
13. **src/renderer/components/ContextPanel.tsx** — Document upload
14. **src/renderer/components/Settings.tsx** — Settings
15. **src/renderer/styles/globals.css** — Styling
16. **electron-builder.json** — Build config
17. **.env.example** — Environment variables

## Key Implementation Notes

### Overlay Window (MOST IMPORTANT)
```typescript
// In overlay.ts — this makes window invisible to screen share
overlayWindow.setContentProtection(true)  // macOS & Windows
overlayWindow.setAlwaysOnTop(true, 'screen-saver')
overlayWindow.setVisibleOnAllWorkspaces(true)
```

### Audio Pipeline
```
Microphone → MediaRecorder (chunks) → Buffer → Whisper API → Transcript
```

Use 3-second audio chunks for near-real-time transcription.
Buffer last 30 seconds for context continuity.

### AI Context Strategy
```
[System Prompt] + [Pre-loaded Documents] + [Last 10 transcript lines] + [Current question] → AI Response
```

### Smart Question Detection
Detect when a question is asked:
- Ends with "?"
- Keywords: "how would you", "can you explain", "what is your", "tell me about", "walk me through"
- Pause after question (>1.5 seconds silence)
Then trigger AI response generation.

### Document Processing
When user uploads documents:
1. Parse PDF/DOCX/TXT → plain text
2. Chunk into 500-token pieces
3. Store in memory with simple keyword index
4. On each AI call, retrieve top 3 relevant chunks

### UI Design
- Dark, minimal overlay (dark background, 80% opacity)
- Small "pill" in corner when idle
- Expands to show response when AI generates answer
- Keyboard shortcut: Cmd/Ctrl+Shift+Space → toggle visibility
- Font: monospace for transcript, readable for AI responses
- Max width: 400px overlay, positioned top-right by default
- User can drag to reposition

### API Keys
- Store in electron-store (encrypted local storage)
- Never in .env for distribution
- Settings panel to enter keys

## MVP Features (Build First)

1. ✅ Invisible overlay window
2. ✅ Microphone capture
3. ✅ Whisper transcription (3-second chunks)
4. ✅ AI response generation (Claude or GPT-4o)
5. ✅ Document upload (PDF, TXT)
6. ✅ Toggle visibility shortcut
7. ✅ Drag to reposition overlay

## Phase 2 Features (After MVP)

- Smart question detection (don't respond to everything)
- Multiple document support with better RAG
- Session history export
- Custom prompts per context (job interview, sales call, etc.)
- Hotkey to ask specific question manually
- Language support (Turkish, etc.)

## Running the App

```bash
npm install
npm run dev          # Development mode
npm run build        # Build for distribution
npm run dist         # Create installer
```

## Platform Notes

- **macOS:** setContentProtection works fully ✅
- **Windows:** setContentProtection works fully ✅
- **Linux:** Limited screen share capture exclusion ⚠️

## Do NOT

- ❌ Do not build any server/backend — fully local desktop app
- ❌ Do not store transcripts to cloud
- ❌ Do not require login/account
- ❌ Do not use heavy ML models locally (use APIs)
- ❌ Do not add unnecessary dependencies
