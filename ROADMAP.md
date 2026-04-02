# 🚀 Intereasy — Roadmap & Improvements

A living document tracking planned improvements, known issues, and the path to shipping this open-source project with 100% cross-platform compatibility.

---

## ✅ Phase 1: Foundation (COMPLETED)

- [x] Core Electron app with React + TypeScript + Vite
- [x] Local Whisper transcription (Python server)
- [x] OpenRouter AI integration (Claude, Gemini)
- [x] Overlay window hidden from screen capture (`setContentProtection`)
- [x] Document context (PDF, DOCX, TXT, Markdown)
- [x] Cross-platform Windows + macOS compatibility
- [x] System audio capture via virtual audio cable

---

## ✅ Phase 2: Cloud STT & Screen Share Toggle (COMPLETED)

- [x] OpenAI Whisper Cloud API as alternative STT provider
- [x] Request serialization queue to prevent concurrent cloud API calls
- [x] Longer chunk intervals for cloud mode (5s vs 2s) to avoid API flooding
- [x] Screen share visibility toggle (`setContentProtection` on/off)
- [x] Warning banner when overlay is visible to screen share
- [x] Provider badge in UI (Local/Cloud indicator)
- [x] Settings UI with visual STT provider cards
- [x] Premium UI with Inter font, glassmorphism, gradient dividers

---

## 🔨 Phase 3: Stability & Polish (NEXT)

### Speech Recognition Improvements
- [ ] Add VAD (Voice Activity Detection) to skip recording chunks that contain only silence
  - Prevents Whisper from hallucinating "Thank you" on empty audio
  - Use Web Audio API `AnalyserNode` to detect energy level before sending chunk
  - Threshold: skip chunks where average energy < 5% for >90% of duration
- [ ] Add minimum audio duration filter (skip chunks < 0.5s of actual speech)
- [ ] Improve cloud API error handling with automatic retry (1 retry with 2s backoff)
- [ ] Add transcription latency indicator in UI (shows ms per chunk)

### Error Handling & Resilience
- [ ] Graceful fallback: if cloud API fails 3x, show user a clear error message with "Switch to Local" button
- [ ] Handle network disconnection during cloud STT — buffer chunks and retry when connection returns
- [ ] Add timeout handling for local Whisper (if a chunk takes >30s, skip it and log warning)
- [ ] Validate API keys on save (make a test request to verify key works)

### UI/UX Refinements
- [ ] Add toast/notification system for errors (instead of silent console.error)
- [ ] Show real-time word count and estimated cost for cloud mode
- [ ] Keyboard shortcut help overlay (press `?` to see all shortcuts)
- [ ] Add "Clear transcript" button
- [ ] Persist window position across restarts

---

## 🚀 Phase 4: GitHub Release Readiness

### Cross-Platform Compatibility
- [ ] Test on macOS (Intel + Apple Silicon)
- [ ] Test on Windows 10 and 11
- [ ] Test on Ubuntu/Debian Linux
- [ ] Verify `setContentProtection` behavior on each platform
- [ ] Add Linux-specific `type` for overlay window
- [ ] Add `.env.example` file documenting all required environment variables
- [ ] Create `.github/ISSUE_TEMPLATE/` for bug reports and feature requests

### Build & Distribution
- [ ] Set up electron-builder configuration for:
  - macOS `.dmg` (signed and notarized if possible)
  - Windows `.exe` installer (NSIS)
  - Linux `.AppImage` and `.deb`
- [ ] Add GitHub Actions CI/CD pipeline: lint → typecheck → build → package
- [ ] Bundle `whisper_server.py` in production builds (`extraResources`)
- [ ] Auto-detect Python and show install instructions if missing
- [ ] Add auto-update support via `electron-updater`

### Documentation
- [ ] Add screenshots/GIF demos to README
- [ ] Write CONTRIBUTING.md with development setup guide
- [ ] Add CHANGELOG.md
- [ ] Add LICENSE file (MIT)
- [ ] Write "How it Works" section in README explaining the architecture

---

## 🌟 Phase 5: Advanced Features (Future)

### Speaker Diarization
- [ ] Detect and label different speakers in the transcript
- [ ] Use audio fingerprinting or simple turn-detection to separate speakers
- [ ] Display speaker labels (e.g., "Interviewer" vs "You") in transcript

### Real-Time Streaming STT
- [ ] Investigate WebSocket-based streaming for lower latency
- [ ] Option to use Deepgram or AssemblyAI for true real-time streaming
- [ ] Show partial transcription results as words arrive (not just chunk boundaries)

### Enhanced AI Features
- [ ] Add custom system prompts (editable in settings)
- [ ] "Suggest a question" feature — AI proposes follow-up questions based on transcript
- [ ] Answer history — browse previous AI responses
- [ ] Copy answer to clipboard with one click
- [ ] Pin important transcript lines

### Privacy & Security
- [ ] Add option to run AI locally (Ollama / LM Studio integration)
- [ ] End-to-end encryption for stored transcripts
- [ ] Auto-delete transcripts after session ends
- [ ] No telemetry, no analytics — document this clearly

### Multi-Language Support
- [ ] Add more languages (Spanish, French, German, Japanese, Korean, etc.)
- [ ] Auto-detect language from first 10 seconds of audio
- [ ] Translate transcript to user's preferred language in real-time

---

## 🐛 Known Issues

| Issue | Status | Notes |
|---|---|---|
| Cloud STT produced duplicate text | ✅ Fixed | Added request serialization queue |
| Stealth mode used CSS opacity instead of `setContentProtection` | ✅ Fixed | Now uses Electron's native content protection toggle |
| Double-click on Start/Stop caused race condition | ✅ Fixed | Added `isTogglingRef` guard |
| `window.type: 'panel'` only works on macOS | ✅ Fixed | Platform-conditional: `panel` on macOS, `toolbar` on Windows |
| `@tailwind` CSS lint warnings in VS Code | ⚠️ Cosmetic | PostCSS directives not recognized by CSS linter — does not affect build |
| Whisper hallucates "Thank you" on silence | 🔄 Planned | Phase 3: Add VAD filter before sending audio |
| No error feedback in UI | 🔄 Planned | Phase 3: Add toast notification system |

---

## 📊 Architecture

```
┌─────────────────────────────────────────────┐
│                  Renderer                    │
│  App.tsx → Overlay.tsx → Transcript / AI     │
│  MediaRecorder → 2-5s chunks → IPC          │
└──────────────────────┬──────────────────────┘
                       │ IPC (audio:chunk)
┌──────────────────────▼──────────────────────┐
│                Main Process                  │
│  audio.ts: transcribeAudioChunk()           │
│  ├── Local: POST → whisper_server.py:8787   │
│  └── Cloud: POST → api.openai.com (queued)  │
│                                              │
│  ipc.ts: AI response via OpenRouter (SSE)   │
│  overlay.ts: setContentProtection toggle    │
└─────────────────────────────────────────────┘
```

---

*Last updated: April 2, 2026*
