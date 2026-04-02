import React, { useState, useEffect, useCallback, useRef } from 'react'
import { TranscriptLine, AIResponse, ContextDocument, AppSettings } from '@shared/types'
import Overlay from './components/Overlay'

declare global {
  interface Window {
    electronAPI: {
      sendAudioChunk: (data: ArrayBuffer) => Promise<TranscriptLine | null>
      triggerAI: (transcript: TranscriptLine[], question: string) => Promise<void>
      loadDocument: () => Promise<{ id: string; name: string; uploadedAt: number; chunkCount: number }[] | null>
      removeDocument: (id: string) => Promise<boolean>
      clearContext: () => Promise<boolean>
      getSettings: () => Promise<AppSettings>
      saveSettings: (settings: AppSettings) => Promise<boolean>
      checkWhisper: () => Promise<boolean>
      startWhisper: () => Promise<boolean>
      stopWhisper: () => Promise<void>
      exportTranscript: (lines: TranscriptLine[], aiAnswer: string | null) => Promise<boolean>
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
  questionSilenceThreshold: 3000,
}

const MERGE_GAP_MS = 4000
const TRANSCRIPT_BUFFER_SIZE = 50
const AUTO_TRIGGER_COOLDOWN_MS = 15000

// Question detection — tighter than before, requires 5+ words
const QUESTION_STARTERS = [
  'how do', 'how would', 'how can', 'how did', 'how is', 'how are',
  'what do', 'what would', 'what can', 'what is', 'what are', 'what did',
  'why do', 'why would', 'why is', 'why are', 'why did',
  'when do', 'when did', 'when is', 'when will',
  'where do', 'where is', 'where did',
  'who is', 'who are', 'who did', 'who would',
  'which one', 'which is',
  'tell me about', 'explain to me', 'describe your', 'walk me through',
  'can you tell', 'can you explain', 'can you describe',
  'could you tell', 'could you explain',
  'would you say', 'do you have', 'have you ever',
]
const FALSE_POSITIVE_PHRASES = [
  'how are you', 'what time', 'i will tell', 'let me tell', 'i can tell',
  'how about we', 'what about we', 'thank you',
]

function detectQuestion(text: string): boolean {
  const trimmed = text.trim()
  if (trimmed.split(/\s+/).length < 5) return false
  if (trimmed.endsWith('?')) return true
  const lower = trimmed.toLowerCase()
  if (FALSE_POSITIVE_PHRASES.some(fp => lower.startsWith(fp))) return false
  return QUESTION_STARTERS.some(kw => lower.startsWith(kw))
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
  const [micLevel, setMicLevel] = useState(0)
  const [whisperLoading, setWhisperLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const settingsRef = useRef(settings)
  const lastAITriggerTime = useRef(0)
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastQuestionRef = useRef<string | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const animFrameRef = useRef<number | null>(null)

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

  // Mic level monitoring
  const startMicMonitoring = useCallback((stream: MediaStream) => {
    const audioCtx = new AudioContext()
    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 256
    const source = audioCtx.createMediaStreamSource(stream)
    source.connect(analyser)
    audioContextRef.current = audioCtx
    analyserRef.current = analyser

    const dataArray = new Uint8Array(analyser.frequencyBinCount)
    const updateLevel = () => {
      analyser.getByteFrequencyData(dataArray)
      const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
      setMicLevel(Math.min(100, Math.round((avg / 128) * 100)))
      animFrameRef.current = requestAnimationFrame(updateLevel)
    }
    updateLevel()
  }, [])

  const stopMicMonitoring = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    audioContextRef.current?.close()
    audioContextRef.current = null
    analyserRef.current = null
    setMicLevel(0)
  }, [])

  // Auto-trigger with silence detection and cooldown
  const handleAutoTrigger = useCallback((completedLine: TranscriptLine, transcriptSnapshot: TranscriptLine[]) => {
    if (!settingsRef.current.autoDetectQuestions) return
    if (!completedLine.isQuestion) return

    const now = Date.now()
    if (now - lastAITriggerTime.current < AUTO_TRIGGER_COOLDOWN_MS) return

    // Clear any existing silence timer
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)

    // Start silence timer — only trigger if no new speech arrives within threshold
    const threshold = settingsRef.current.questionSilenceThreshold || 3000
    silenceTimerRef.current = setTimeout(() => {
      const currentTime = Date.now()
      if (currentTime - lastAITriggerTime.current < AUTO_TRIGGER_COOLDOWN_MS) return
      lastAITriggerTime.current = currentTime
      window.electronAPI.triggerAI(transcriptSnapshot, completedLine.text)
    }, threshold)
  }, [])

  // Listen for IPC events from main process
  useEffect(() => {
    const unsubs = [
      window.electronAPI.onTranscriptUpdate((line) => {
        // Cancel silence timer since new speech arrived
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current)
          silenceTimerRef.current = null
        }

        setTranscript(prev => {
          const now = Date.now()
          const lastLine = prev.length > 0 ? prev[prev.length - 1] : null

          if (lastLine && lastLine.lastUpdated && (now - lastLine.lastUpdated) < MERGE_GAP_MS) {
            const merged = { ...lastLine }
            merged.text = merged.text + ' ' + line.text.trim()
            merged.lastUpdated = now
            merged.isQuestion = detectQuestion(merged.text)
            const updated = [...prev.slice(0, -1), merged]
            return updated.slice(-TRANSCRIPT_BUFFER_SIZE)
          }

          const newLine: TranscriptLine = {
            ...line,
            lastUpdated: now,
            isQuestion: detectQuestion(line.text),
          }

          // Previous line is now "complete" — use silence-based auto-trigger
          if (lastLine && lastLine.isQuestion) {
            handleAutoTrigger(lastLine, prev)
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
    return () => {
      unsubs.forEach(unsub => unsub())
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    }
  }, [handleAutoTrigger])

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
      // Stop interval FIRST so no new chunks are enqueued after we kill the server
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
        recordingIntervalRef.current = null
      }
      mediaRecorderRef.current?.stop()
      streamRef.current?.getTracks().forEach(t => t.stop())
      mediaRecorderRef.current = null
      streamRef.current = null
      setIsListening(false)
      stopMicMonitoring()
      // stopWhisper is called AFTER everything is shut down so the isAcceptingRequests
      // gate drops any chunk that was already in-flight before we killed the recorder
      window.electronAPI.stopWhisper()
      return
    }

    try {
      setWhisperLoading(true)
      const whisperStarted = await window.electronAPI.startWhisper()
      setWhisperLoading(false)
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

      // Start mic level monitoring
      startMicMonitoring(stream)

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
      setWhisperLoading(false)
      console.error('Audio capture failed:', err)
    }
  }, [isListening, selectedDeviceId, startNewRecording, startMicMonitoring, stopMicMonitoring])

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
    lastQuestionRef.current = questionText
    lastAITriggerTime.current = Date.now()
    window.electronAPI.triggerAI(transcript, questionText)
  }, [transcript, selectedLineId])

  // Regenerate — re-ask the last question
  const regenerateAI = useCallback(() => {
    if (!lastQuestionRef.current || transcript.length === 0) return
    lastAITriggerTime.current = Date.now()
    window.electronAPI.triggerAI(transcript, lastQuestionRef.current)
  }, [transcript])

  // Load documents
  const loadDocument = useCallback(async () => {
    setIsUploading(true)
    const result = await window.electronAPI.loadDocument()
    setIsUploading(false)
    if (result) {
      setDocuments(prev => [...prev, ...result])
    }
  }, [])

  // Remove individual document
  const removeDocument = useCallback(async (id: string) => {
    await window.electronAPI.removeDocument(id)
    setDocuments(prev => prev.filter(d => d.id !== id))
  }, [])

  // Clear context
  const clearContext = useCallback(async () => {
    await window.electronAPI.clearContext()
    setDocuments([])
  }, [])

  // Export transcript
  const exportTranscript = useCallback(async () => {
    await window.electronAPI.exportTranscript(transcript, aiResponse?.answer || null)
  }, [transcript, aiResponse])

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
      micLevel={micLevel}
      whisperLoading={whisperLoading}
      isUploading={isUploading}
      audioDevices={audioDevices}
      selectedDeviceId={selectedDeviceId}
      onDeviceChange={setSelectedDeviceId}
      onSelectLine={setSelectedLineId}
      onToggleSettings={() => setShowSettings(s => !s)}
      onToggleListening={toggleListening}
      onTriggerAI={triggerAI}
      onRegenerateAI={regenerateAI}
      onExportTranscript={exportTranscript}
      onLoadDocument={loadDocument}
      onRemoveDocument={removeDocument}
      onClearContext={clearContext}
      onSaveSettings={handleSaveSettings}
    />
  )
}
