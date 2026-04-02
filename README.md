<div align="center">

# 🎙️ Intereasy — Invisible AI Meeting Assistant

**A real-time, invisible AI assistant for interviews, meetings, and online calls.**

[![Electron](https://img.shields.io/badge/Electron-191970?style=for-the-badge&logo=electron&logoColor=white)](#)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](#)
[![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)](#)
[![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](#)
[![Whisper](https://img.shields.io/badge/OpenAI_Whisper-412991?style=for-the-badge&logo=openai&logoColor=white)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](#)

</div>

<br />

## 🌟 Overview

**Intereasy** is a stealthy, highly responsive desktop application that assists you during live interviews, meetings, and calls. It lives as a discreet overlay on your screen, captures audio from your microphone **or your system speaker output** (meeting participants), transcribes it using [OpenAI Whisper](https://github.com/openai/whisper) — either **locally** or via the **OpenAI Cloud API** — and provides real-time AI-powered responses.

Never lose your train of thought again. Be fully present while having the power of AI right beside you, completely invisible to others.

---

## ✨ Features

| Feature | Description |
|---|---|
| 👻 **Invisible Overlay** | Transparent, click-through overlay — hidden from screen share |
| 👁️ **Screen Share Toggle** | Toggle visibility to screen capture — show/hide with one click |
| 🎤 **Microphone Capture** | Records your mic in real-time |
| 🔊 **System/Speaker Capture** | Hear meeting participants via a virtual audio cable (see setup below) |
| 🤫 **Silence Filtering** | Automatically drops hallucinated "Thank you" responses from silent audio |
| 📄 **Document Context** | Upload PDFs, Word docs, or Markdown to give the AI relevant context |
| ⚡ **Local Transcription** | Whisper runs fully offline — no audio leaves your machine |
| ☁️ **Cloud Transcription** | Optional OpenAI Whisper API — fast, no Python required |
| 🤖 **Multi-model AI** | Powered by OpenRouter — choose Claude, Gemini, and more |
| 💬 **Markdown Responses** | AI answers beautifully formatted and easy to read at a glance |
| 🌍 **Cross-Platform** | Works on Windows and macOS |

---

## 🛠️ Tech Stack

- **Framework**: [Electron](https://www.electronjs.org/) — desktop runtime
- **Frontend**: [React 18](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Transcription**: [OpenAI Whisper](https://github.com/openai/whisper) (local Python server **or** cloud API)
- **AI**: [OpenRouter](https://openrouter.ai/) — Claude, Gemini, etc.
- **Document Parsing**: `pdf-parse`, `mammoth`

---

## 📂 Project Structure

```text
├── src/
│   ├── main/             # Electron Main Process (IPC, Audio, Overlay)
│   ├── renderer/         # React Frontend (UI, State)
│   └── shared/           # Types shared between main and renderer
├── scripts/
│   └── whisper_server.py # Local Whisper HTTP server (keeps model in memory)
├── assets/               # Static assets & icons
├── package.json
├── tsconfig.main.json
└── vite.config.ts
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+ — [nodejs.org](https://nodejs.org/)
- **Python 3.8–3.14** — [python.org](https://www.python.org/downloads/)

  > [!WARNING]
  > **Windows**: During Python installation, check **"Add Python to PATH"**. After installing Python AND FFmpeg, you **must fully restart your terminal and IDE** (e.g. VS Code) before running the app. Otherwise environment variables won't be updated and you'll see "FFmpeg not found" errors.

- **FFmpeg**:
  - **Windows**: `winget install ffmpeg --accept-package-agreements --accept-source-agreements`
  - **macOS**: `brew install ffmpeg`

- **OpenAI Whisper** (only if using **Local** mode):
  ```bash
  pip install -U openai-whisper
  ```

> [!TIP]
> **Don't want to install Python?** Use the **OpenAI Cloud API** mode in Settings — just add your OpenAI API key and skip all Python/FFmpeg setup.

---

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/intereasy.git
cd intereasy

# 2. Install Node dependencies
npm install
```

---

### Development

```bash
npm run dev
```

This starts the Vite dev server and Electron simultaneously with Hot Module Replacement.

---

### Building for Production

```bash
npm run dist
```

Outputs packaged binaries for your OS into the `dist/` folder.

---

## 🔊 Capturing System/Speaker Audio (for Meetings)

By default, the app can only access microphone inputs. To also **capture what other participants say** in Zoom, Teams, Google Meet, etc., you need a **virtual audio cable**. Once installed, the virtual device automatically shows up in the audio source dropdown inside the app.

### Windows — VB-Cable (Free)

1. Download and install **VB-Cable** from [vb-audio.com](https://vb-audio.com/Cable/)
2. Open **Sound Settings** → set your **Playback** device to `CABLE Input (VB-Audio Virtual Cable)`
3. In Intereasy, select **CABLE Output (VB-Audio Virtual Cable)** as your audio source
4. Your meeting audio will now be heard by Whisper

> [!TIP]
> To hear the meeting *and* capture it, open Sound settings → "CABLE Input" → Properties → Listen tab → check "Listen to this device" and set playback to your speakers/headphones.

### macOS — BlackHole (Free)

1. Download and install **BlackHole 2ch** from [existential.audio](https://existential.audio/blackhole/)
2. Open **Audio MIDI Setup** (in Utilities) → click `+` → **Create Multi-Output Device**
3. Check both your **Built-in Output** (speakers/headphones) and **BlackHole 2ch**
4. Set this Multi-Output Device as your system output in System Settings → Sound
5. In Intereasy, select **BlackHole 2ch** as your audio source

---

## ⚙️ Settings Reference

| Setting | Description |
|---|---|
| **STT Provider** | `Local Whisper` (free, offline) or `OpenAI Cloud API` (fast, ~$0.006/min) |
| **OpenAI API Key** | For cloud transcription — get one at [platform.openai.com](https://platform.openai.com/) |
| **OpenRouter API Key** | For AI responses — get one at [openrouter.ai](https://openrouter.ai/) |
| **AI Model** | Claude Sonnet (recommended), Gemini Flash (fastest), Claude Opus (highest quality) |
| **Whisper Model** | `tiny` (fastest) → `base` → `small` → `medium` (best accuracy) — local mode only |
| **Session Mode** | Interview / Meeting / Sales Call / Custom — changes the AI's system prompt |
| **Language** | English, Turkish, or Auto-detect |
| **Overlay Opacity** | Adjust transparency of the overlay window |

> [!NOTE]
> Larger Whisper models (`small`, `medium`) take more time to transcribe each audio chunk on CPU. If you see delays, switch to `base` or use the Cloud API.

### ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+Shift+Space` | Show/hide overlay |
| `Ctrl+Shift+H` | Toggle screen share visibility |

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to open an issue or a pull request.

---

## 📝 License

This project is licensed under the [MIT License](LICENSE).
