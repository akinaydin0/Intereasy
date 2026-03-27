# Architecture Overview

## System Design

```
┌─────────────────────────────────────────────────────────┐
│                    ELECTRON MAIN PROCESS                 │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ overlay.ts   │  │ audio.ts     │  │ ipc.ts        │  │
│  │              │  │              │  │               │  │
│  │ Creates      │  │ Captures     │  │ Bridges main  │  │
│  │ invisible    │  │ microphone   │  │ ↔ renderer    │  │
│  │ window       │  │ audio        │  │               │  │
│  └──────────────┘  └──────────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────────┘
          ↑ IPC (inter-process communication) ↓
┌─────────────────────────────────────────────────────────┐
│                   RENDERER PROCESS (React)               │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │                   App.tsx                        │   │
│  │                                                  │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐ │   │
│  │  │ Transcript │  │ AIResponse │  │  Context   │ │   │
│  │  │   Panel    │  │   Panel    │  │   Panel    │ │   │
│  │  └────────────┘  └────────────┘  └────────────┘ │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
          ↑ API Calls ↓
┌────────────────┐    ┌────────────────────────────────────┐
│ OpenAI Whisper │    │   Anthropic Claude / OpenAI GPT-4o │
│ (transcription)│    │       (AI responses)               │
└────────────────┘    └────────────────────────────────────┘
```

## Audio Pipeline

```
Microphone Input
    ↓
MediaRecorder (browser API in renderer)
    ↓
3-second audio chunks (WAV format)
    ↓
Send via IPC to main process
    ↓
POST to OpenAI Whisper API
    ↓
Text transcript
    ↓
Add to rolling 30-second transcript buffer
    ↓
Detect question? → Trigger AI call
```

## AI Response Pipeline

```
New transcript chunk arrives
    ↓
Question detection logic
  - Ends with "?"
  - Question keywords present
  - >1.5s silence after statement
    ↓
Assemble prompt:
  [System prompt]
  + [Relevant context chunks from loaded docs]
  + [Last 10 transcript lines]
  + "The person just asked: [current question]"
    ↓
Claude API call (streaming)
    ↓
Stream response tokens to overlay UI
```

## Document Context Flow

```
User uploads file (PDF / DOCX / TXT)
    ↓
Parse to plain text (pdf-parse / mammoth)
    ↓
Split into 500-token chunks
    ↓
Store in memory array: [{text, keywords}]
    ↓
On each AI call:
  - Extract keywords from current question
  - Find top 3 matching chunks
  - Inject into AI prompt as context
```

## Screen Share Invisibility

```
Electron BrowserWindow with:
  - setContentProtection(true) → excluded from screen capture
  - setAlwaysOnTop(true, 'screen-saver') → stays above all windows
  - frame: false → no title bar
  - transparent: true → transparent background
  - hasShadow: false
  - focusable: false (in stealth mode)
```

## State Management

Simple React state (no Redux needed for MVP):

```typescript
interface AppState {
  transcript: TranscriptLine[]      // rolling 30s buffer
  aiResponse: string                // current AI response
  isListening: boolean              // mic active?
  isVisible: boolean                // overlay visible?
  contextDocuments: Document[]      // loaded context files
  isGenerating: boolean             // AI call in progress?
  settings: Settings                // API keys, model choice
}
```
