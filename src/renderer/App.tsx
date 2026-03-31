import React, { useState, useEffect, useCallback, useRef } from 'react'
import { TranscriptLine, AIResponse, ContextDocument, AppSettings } from '@shared/types'
import Overlay from './components/Overlay'

declare global {
  interface Window {
    electronAPI: {
      sendAudioChunk: (data: ArrayBuffer) => Promise<TranscriptLine | null>
      triggerAI: (transcript: TranscriptLine[], question: string) => Promise<void>
      loadDocument: () => Promise<{ id: string; name: string; uploadedAt: number; chunkCount: number }[] | null>
      clearContext: () => Promise<boolean>
      getSettings: () => Promise<AppSettings>
      saveSettings: (settings: AppSettings) => Promise<boolean>
      checkWhisper: () => Promise<boolean>
      startWhisper: () => Promise<boolean>
      stopWhisper: () => Promise<void>
      toggleOverlay: () => Promise<void>
      onTranscriptUpdate: (cb: (line: TranscriptLine) => void) => () => void
      onAIResponseStart: (cb: () => void) => () => void
      onAIResponseChunk: (cb: (chunk: string) => void) => () => void
      onAIResponseEnd: (cb: () => void) => () => void
    }
  }
}

export interface AudioDevice {
  deviceId: string
  label: string
}

const DEFAULT_SETTINGS: AppSettings = {
  openRouterApiKey: '',
  preferredModel: 'anthropic/claude-sonnet-4.6',
  whisperModel: 'base',
  overlayPosition: { x: 0, y: 0, width: 420, height: 600 },
  overlayOpacity: 0.85,
  sessionMode: 'interview',
  language: 'en',
  autoDetectQuestions: true,
  questionSilenceThreshold: 1500,
}

// Merge gap: if a new chunk arrives within this time of the last, merge into same line
const MERGE_GAP_MS = 4000
const TRANSCRIPT_BUFFER_SIZE = 50

// Question detection keywords
const QUESTION_KEYWORDS = [
  'how', 'what', 'why', 'when', 'where', 'who', 'which',
  'tell me', 'explain', 'describe', 'walk me through',
  'can you', 'could you', 'would you', 'do you', 'have you',
  'is there', 'are there', 'what is', 'what are',
]

function detectQuestion(text: string): boolean {
  const trimmed = text.trim()
  if (trimmed.endsWith('?')) return true
  const lower = trimmed.toLowerCase()
  return QUESTION_KEYWORDS.some(kw => lower.startsWith(kw) || lower.includes(` ${kw} `))
}

export default function App() {
  const [transcript, setTranscript] = useState<TranscriptLine[]>([])
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [documents, setDocuments] = useState<{ id: string; name: string; chunkCount: number }[]>([])
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const settingsRef = useRef(settings)

  // Keep settingsRef in sync
  useEffect(() => { settingsRef.current = settings }, [settings])

  // Load settings on mount
  useEffect(() => {
    window.electronAPI.getSettings().then(setSettings)
  }, [])

  // Enumerate audio devices
  useEffect(() => {
    async function loadDevices() {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true }).then(s => {
          s.getTracks().forEach(t => t.stop())
        })
        const devices = await navigator.mediaDevices.enumerateDevices()
        const audioInputs = devices
          .filter(d => d.kind === 'audioinput')
          .map(d => ({ deviceId: d.deviceId, label: d.label || `Microphone ${d.deviceId.slice(0, 8)}` }))
        setAudioDevices(audioInputs)
        if (audioInputs.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(audioInputs[0].deviceId)
        }
      } catch (err) {
        console.error('Failed to enumerate audio devices:', err)
      }
    }
    loadDevices()
  }, [])

  // Listen for IPC events from main process
  useEffect(() => {
    const unsubs = [
      // Transcript: merge chunks into sentences
      window.electronAPI.onTranscriptUpdate((line) => {
        setTranscript(prev => {
          const now = Date.now()
          const lastLine = prev.length > 0 ? prev[prev.length - 1] : null

          // Merge if the last line exists and the gap is small
          if (lastLine && lastLine.lastUpdated && (now - lastLine.lastUpdated) < MERGE_GAP_MS) {
            const merged = { ...lastLine }
            merged.text = merged.text + ' ' + line.text.trim()
            merged.lastUpdated = now
            merged.isQuestion = detectQuestion(merged.text)
            const updated = [...prev.slice(0, -1), merged]
            return updated.slice(-TRANSCRIPT_BUFFER_SIZE)
          }

          // Otherwise start a new line
          const newLine: TranscriptLine = {
            ...line,
            lastUpdated: now,
            isQuestion: detectQuestion(line.text),
          }

          // The previous line is now "complete" — check for auto-trigger
          if (lastLine && lastLine.isQuestion && settingsRef.current.autoDetectQuestions) {
            // Auto-trigger AI on the completed question line
            setTimeout(() => {
              window.electronAPI.triggerAI(prev, lastLine.text)
            }, 100)
          }

          const updated = [...prev, newLine]
          return updated.slice(-TRANSCRIPT_BUFFER_SIZE)
        })
      }),

      window.electronAPI.onAIResponseStart(() => {
        setIsGenerating(true)
        setAiResponse({ id: `ai-${Date.now()}`, question: '', answer: '', timestamp: Date.now(), isStreaming: true })
      }),
      window.electronAPI.onAIResponseChunk((chunk) => {
        setAiResponse(prev => prev ? { ...prev, answer: prev.answer + chunk } : prev)
      }),
      window.electronAPI.onAIResponseEnd(() => {
        setIsGenerating(false)
        setAiResponse(prev => prev ? { ...prev, isStreaming: false } : prev)
      }),
    ]
    return () => unsubs.forEach(unsub => unsub())
  }, [])

  // Helper: create a fresh recorder on the existing stream
  const startNewRecording = useCallback((stream: MediaStream) => {
    const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
    mediaRecorderRef.current = recorder

    recorder.ondataavailable = async (e) => {
      if (e.data.size > 0) {
        const buffer = await e.data.arrayBuffer()
        await window.electronAPI.sendAudioChunk(buffer)
      }
    }

    recorder.start()
  }, [])

  // Start/stop audio capture
  const toggleListening = useCallback(async () => {
    if (isListening) {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
        recordingIntervalRef.current = null
      }
      mediaRecorderRef.current?.stop()
      streamRef.current?.getTracks().forEach(t => t.stop())
      mediaRecorderRef.current = null
      streamRef.current = null
      setIsListening(false)
      window.electronAPI.stopWhisper()
      return
    }

    try {
      console.log('Starting whisper server...')
      const whisperStarted = await window.electronAPI.startWhisper()
      if (!whisperStarted) {
        console.error('Failed to start whisper server')
      }

      const constraints: MediaStreamConstraints = {
        audio: selectedDeviceId
          ? { deviceId: { exact: selectedDeviceId } }
          : true,
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      startNewRecording(stream)
      setIsListening(true)

      recordingIntervalRef.current = setInterval(() => {
        const currentRecorder = mediaRecorderRef.current
        if (currentRecorder && currentRecorder.state === 'recording') {
          currentRecorder.stop()
        }
        if (streamRef.current && streamRef.current.active) {
          startNewRecording(streamRef.current)
        }
      }, 2000)
    } catch (err) {
      console.error('Audio capture failed:', err)
    }
  }, [isListening, selectedDeviceId, startNewRecording])

  // Trigger AI — use selected line or last line
  const triggerAI = useCallback(() => {
    if (transcript.length === 0) return
    let questionText: string
    if (selectedLineId) {
      const selected = transcript.find(t => t.id === selectedLineId)
      questionText = selected ? selected.text : transcript[transcript.length - 1].text
    } else {
      questionText = transcript[transcript.length - 1].text
    }
    window.electronAPI.triggerAI(transcript, questionText)
  }, [transcript, selectedLineId])

  // Load documents
  const loadDocument = useCallback(async () => {
    const result = await window.electronAPI.loadDocument()
    if (result) {
      setDocuments(prev => [...prev, ...result])
    }
  }, [])

  // Clear context
  const clearContext = useCallback(async () => {
    await window.electronAPI.clearContext()
    setDocuments([])
  }, [])

  // Save settings
  const handleSaveSettings = useCallback(async (newSettings: AppSettings) => {
    await window.electronAPI.saveSettings(newSettings)
    setSettings(newSettings)
  }, [])

  return (
    <Overlay
      transcript={transcript}
      aiResponse={aiResponse}
      isListening={isListening}
      isGenerating={isGenerating}
      documents={documents}
      settings={settings}
      selectedLineId={selectedLineId}
      showSettings={showSettings}
      audioDevices={audioDevices}
      selectedDeviceId={selectedDeviceId}
      onDeviceChange={setSelectedDeviceId}
      onSelectLine={setSelectedLineId}
      onToggleSettings={() => setShowSettings(s => !s)}
      onToggleListening={toggleListening}
      onTriggerAI={triggerAI}
      onLoadDocument={loadDocument}
      onClearContext={clearContext}
      onSaveSettings={handleSaveSettings}
    />
  )
}
