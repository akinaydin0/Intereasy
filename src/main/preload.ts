const { contextBridge, ipcRenderer } = require('electron')

const IPC_CHANNELS = {
  TRANSCRIPT_UPDATE: 'transcript:update',
  AI_RESPONSE_START: 'ai:response:start',
  AI_RESPONSE_CHUNK: 'ai:response:chunk',
  AI_RESPONSE_END: 'ai:response:end',
  AUDIO_CHUNK: 'audio:chunk',
  TOGGLE_LISTENING: 'audio:toggle',
  TRIGGER_AI: 'ai:trigger',
  LOAD_DOCUMENT: 'document:load',
  CLEAR_CONTEXT: 'document:clear',
  SAVE_SETTINGS: 'settings:save',
  GET_SETTINGS: 'settings:get',
  TOGGLE_OVERLAY: 'overlay:toggle',
  STEALTH_MODE: 'overlay:stealth',
} as const

contextBridge.exposeInMainWorld('electronAPI', {
  // Audio
  sendAudioChunk: (audioData: ArrayBuffer) =>
    ipcRenderer.invoke(IPC_CHANNELS.AUDIO_CHUNK, audioData),

  // AI
  triggerAI: (transcript: any[], question: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.TRIGGER_AI, { transcript, question }),

  // Documents
  loadDocument: () =>
    ipcRenderer.invoke(IPC_CHANNELS.LOAD_DOCUMENT),
  removeDocument: (id: string) =>
    ipcRenderer.invoke('document:remove', id),
  clearContext: () =>
    ipcRenderer.invoke(IPC_CHANNELS.CLEAR_CONTEXT),

  // Settings
  getSettings: () =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_SETTINGS),
  saveSettings: (settings: any) =>
    ipcRenderer.invoke(IPC_CHANNELS.SAVE_SETTINGS, settings),

  // Whisper
  checkWhisper: () =>
    ipcRenderer.invoke('whisper:check'),
  startWhisper: () =>
    ipcRenderer.invoke('whisper:start'),
  stopWhisper: () =>
    ipcRenderer.invoke('whisper:stop'),

  // Export
  exportTranscript: (lines: any[], aiAnswer: string | null) =>
    ipcRenderer.invoke('transcript:export', { lines, aiAnswer }),

  // Overlay
  toggleOverlay: () =>
    ipcRenderer.invoke(IPC_CHANNELS.TOGGLE_OVERLAY),

  // Stealth mode
  toggleStealth: () =>
    ipcRenderer.invoke(IPC_CHANNELS.STEALTH_MODE),
  onStealthToggle: (callback: (stealth: boolean) => void) => {
    const handler = (_event: any, stealth: boolean) => callback(stealth)
    ipcRenderer.on(IPC_CHANNELS.STEALTH_MODE, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.STEALTH_MODE, handler)
  },

  // Listeners (Main → Renderer)
  onTranscriptUpdate: (callback: (line: any) => void) => {
    const handler = (_event: any, line: any) => callback(line)
    ipcRenderer.on(IPC_CHANNELS.TRANSCRIPT_UPDATE, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.TRANSCRIPT_UPDATE, handler)
  },
  onAIResponseStart: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on(IPC_CHANNELS.AI_RESPONSE_START, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.AI_RESPONSE_START, handler)
  },
  onAIResponseChunk: (callback: (chunk: string) => void) => {
    const handler = (_event: any, chunk: string) => callback(chunk)
    ipcRenderer.on(IPC_CHANNELS.AI_RESPONSE_CHUNK, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.AI_RESPONSE_CHUNK, handler)
  },
  onAIResponseEnd: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on(IPC_CHANNELS.AI_RESPONSE_END, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.AI_RESPONSE_END, handler)
  },
})
