// ================================================
// Interview AI — Shared TypeScript Types
// ================================================

export interface TranscriptLine {
  id: string
  text: string
  timestamp: number
  lastUpdated?: number
  isQuestion?: boolean
  speaker?: 'user' | 'other' | 'unknown'
}

export interface AIResponse {
  id: string
  question: string
  answer: string
  timestamp: number
  isStreaming: boolean
}

export interface ContextDocument {
  id: string
  name: string
  content: string
  chunks: DocumentChunk[]
  uploadedAt: number
}

export interface DocumentChunk {
  text: string
  keywords: string[]
  chunkIndex: number
  documentId: string
}

export type SttProvider = 'local' | 'cloud-whisper'

export interface AppSettings {
  openRouterApiKey: string
  openaiApiKey: string
  sttProvider: SttProvider
  preferredModel: 'anthropic/claude-sonnet-4.6' | 'anthropic/claude-sonnet-4-5' | 'anthropic/claude-opus-4-6' | 'google/gemini-2.5-flash'
  whisperModel: 'tiny' | 'base' | 'small' | 'medium'
  overlayPosition: OverlayPosition
  overlayOpacity: number       // 0.6 - 1.0
  sessionMode: SessionMode
  language: 'en' | 'tr' | 'auto'
  autoDetectQuestions: boolean
  questionSilenceThreshold: number  // ms of silence before triggering AI
}

export type SessionMode = 'interview' | 'meeting' | 'sales' | 'custom'

export interface OverlayPosition {
  x: number
  y: number
  width: number
  height: number
}

export interface AudioChunk {
  data: ArrayBuffer
  timestamp: number
  duration: number
}

// IPC Channel names
export const IPC_CHANNELS = {
  // Main → Renderer
  TRANSCRIPT_UPDATE: 'transcript:update',
  AI_RESPONSE_START: 'ai:response:start',
  AI_RESPONSE_CHUNK: 'ai:response:chunk',
  AI_RESPONSE_END: 'ai:response:end',
  
  // Renderer → Main
  AUDIO_CHUNK: 'audio:chunk',
  TOGGLE_LISTENING: 'audio:toggle',
  TRIGGER_AI: 'ai:trigger',
  LOAD_DOCUMENT: 'document:load',
  CLEAR_CONTEXT: 'document:clear',
  SAVE_SETTINGS: 'settings:save',
  GET_SETTINGS: 'settings:get',
  TOGGLE_OVERLAY: 'overlay:toggle',
  TOGGLE_SCREEN_SHARE: 'overlay:screen-share',
} as const
