# Features Specification

## MVP Features

### 1. Invisible Overlay Window
- Window is excluded from all screen capture software
- Visible ONLY on physical monitor
- Works with: Zoom, Google Meet, Teams, OBS, any screen share tool
- Always-on-top: stays above all other windows
- Transparent background option
- Toggle visibility: Cmd/Ctrl+Shift+Space

### 2. Real-Time Audio Transcription
- Captures default microphone input
- Sends 3-second chunks to OpenAI Whisper
- Rolling 30-second transcript buffer displayed
- Shows speaker's words as they speak
- Low latency (~2-3 seconds delay)

### 3. AI Response Generation
- Triggered automatically when question detected
- Or manually triggered with keyboard shortcut
- Streams response token by token (fast display)
- Uses: Claude Sonnet / GPT-4o (configurable)
- Context-aware: uses loaded documents + transcript

### 4. Document Context Loading
- Upload before session starts
- Supported: PDF, DOCX, TXT, Markdown
- Multiple files supported
- Shows loaded document list
- Clear context option
- Smart retrieval: finds relevant parts per question

### 5. Settings Panel
- API key management (stored encrypted locally)
- Model selection (Claude / GPT-4o)
- Overlay position preference
- Overlay opacity setting
- Language preference

## UI States

### Idle State
- Small pill (120x40px) in corner
- Shows: microphone status + doc count
- Subtle pulse animation when listening

### Active Transcription
- Pill expands to show last 2-3 lines of transcript
- Fades older lines

### AI Generating
- Spinner / typing indicator
- "Thinking..." text

### AI Response Ready
- Panel expands (max 400x500px)
- Shows full AI response
- Scrollable if long
- Auto-fades after 30 seconds (or manual dismiss)

### Settings Open
- Full panel with all settings
- Overlay becomes non-interactive beneath

## Phase 2 Features (Future)

### Smart Question Detection v2
- ML-based question detection
- Multiple language support
- Detects implied questions (not just "?")
- Configurable sensitivity

### Session Templates
- "Software Engineer Interview"
- "Sales Call"
- "Product Demo"
- "General Meeting"
- Each has pre-loaded prompt adjustments

### Session History
- Export transcript + AI responses to PDF
- Markdown export
- Review past sessions

### Manual Question Input
- Type/paste a question manually
- Useful when audio doesn't capture well

### Response Formatting
- Code blocks for technical answers
- Bullet points for lists
- Auto-detect response type

### Turkish Language Support
- UI in Turkish
- Turkish transcription (Whisper supports it)
- Turkish AI responses

## Performance Targets

| Metric | Target |
|--------|--------|
| Transcription latency | < 3 seconds |
| AI response first token | < 1 second |
| Full response (short) | < 5 seconds |
| Memory usage | < 200 MB |
| CPU usage (idle) | < 2% |
| CPU usage (active) | < 15% |

## Privacy & Security

- All processing local (except API calls)
- No audio stored to disk
- No transcript sent to cloud (only Whisper API)
- API keys encrypted in local storage
- No analytics or telemetry
- No account required
