<div align="center">

# 🎙️ Interview AI (Invisible Assistant)

**An invisible real-time AI assistant for interviews and meetings.**

[![Electron](https://img.shields.io/badge/Electron-191970?style=for-the-badge&logo=electron&logoColor=white)](#)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](#)
[![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)](#)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](#)

</div>

<br />

## 🌟 Overview

**Interview AI** is a stealthy, highly responsive desktop application built to assist you during live interviews, meetings, and calls. Living as a discreet overlay on your screen, it captures system audio, processes meeting context (like resumes, job descriptions, or notes), and provides real-time intelligent responses using AI. 

Never lose your train of thought or miss an important question again. Be fully present in your meetings while having the power of AI right beside you, completely invisible to others.

## ✨ Features

- **👻 Invisible Overlay**: Runs silently as a transparent, click-through overlay on your screen.
- **🎤 Real-Time Audio Capture**: Captures and processes system and microphone audio seamlessly.
- **📄 Document Processing**: Upload and parse context documents like PDFs, Word files, and Markdown to give the AI context about the meeting.
- **⚡ Blazing Fast**: Built with React, Vite, and Electron for a snappy, lightweight experience.
- **💬 Markdown Rendering**: Responses are beautifully formatted in Markdown for quick reading at a glance.

## 🛠️ Tech Stack

- **Framework**: [Electron](https://www.electronjs.org/) (Desktop runtime)
- **Frontend**: [React 18](https://reactjs.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Document Parsing**: `pdf-parse`, `mammoth` (for `.docx`), `react-markdown`

## 📂 Project Structure

```text
├── src/
│   ├── main/             # Electron Main Process (System interactions, IPC, Audio, Overlay)
│   ├── renderer/         # React Frontend (UI, State Management, App views)
│   └── shared/           # Types and utilities shared between main and renderer
├── assets/               # Static assets & icons
├── docs/                 # Documentation
├── package.json          # Dependencies & Scripts
├── tsconfig.json         # TypeScript configuration
└── vite.config.ts        # Vite configuration
```

## 🚀 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) (v18+ recommended) and `npm` installed.

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/interview-ai.git
   cd "interview ai"
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

### Development

Run the app in development mode with Hot Module Replacement (HMR):
```bash
npm run dev
```

### Building for Production

To package the application into a standalone executable for your operating system:
```bash
npm run dist
```
This will output the packaged binaries into the `dist` folder.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](#) if you want to contribute.

## 📝 License

This project is licensed under the [MIT License](LICENSE).
