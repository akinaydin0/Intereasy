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
  preferredModel: 'anthropic/claude-sonnet-4-6',
  whisperModel: 'base',
  overlayPosition: { x: 0, y: 0, width: 420, height: 600 },
  overlayOpacity: 0.85,
  sessionMode: 'interview',
  language: 'en',
  autoDetectQuestions: true,
  questionSilenceThreshold: 1500,
}

export default function App() {
  const [transcript, setTranscript] = useState<TranscriptLine[]>([])
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [documents, setDocuments] = useState<{ id: string; name: string; chunkCount: number }[]>([])
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [activeTab, setActiveTab] = useState<'response' | 'transcript' | 'context' | 'settings'>('response')
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Load settings on mount
  useEffect(() => {
    window.electronAPI.getSettings().then(setSettings)
  }, [])

  // Enumerate audio devices
  useEffect(() => {
    async function loadDevices() {
      try {
        // Request permission first to get device labels
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
      window.electronAPI.onTranscriptUpdate((line) => {
        setTranscript(prev => {
          const updated = [...prev, line]
          return updated.slice(-10)
        })
      }),
      window.electronAPI.onAIResponseStart(() => {
        setIsGenerating(true)
        setAiResponse({ id: `ai-${Date.now()}`, question: '', answer: '', timestamp: Date.now(), isStreaming: true })
        setActiveTab('response')
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

  // Start/stop audio capture
  const toggleListening = useCallback(async () => {
    if (isListening) {
      mediaRecorderRef.current?.stop()
      streamRef.current?.getTracks().forEach(t => t.stop())
      mediaRecorderRef.current = null
      streamRef.current = null
      setIsListening(false)
      return
    }

    try {
      const constraints: MediaStreamConstraints = {
        audio: selectedDeviceId
          ? { deviceId: { exact: selectedDeviceId } }
          : true,
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = async (e) => {
        if (e.data.size > 0) {
          const buffer = await e.data.arrayBuffer()
          await window.electronAPI.sendAudioChunk(buffer)
        }
      }

      recorder.start(3000)
      setIsListening(true)
    } catch (err) {
      console.error('Audio capture failed:', err)
    }
  }, [isListening, selectedDeviceId])

  // Trigger AI manually
  const triggerAI = useCallback(() => {
    if (transcript.length === 0) return
    const lastLine = transcript[transcript.length - 1].text
    window.electronAPI.triggerAI(transcript, lastLine)
  }, [transcript])

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
      activeTab={activeTab}
      audioDevices={audioDevices}
      selectedDeviceId={selectedDeviceId}
      onDeviceChange={setSelectedDeviceId}
      onTabChange={setActiveTab}
      onToggleListening={toggleListening}
      onTriggerAI={triggerAI}
      onLoadDocument={loadDocument}
      onClearContext={clearContext}
      onSaveSettings={handleSaveSettings}
    />
  )
}
