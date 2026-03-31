import React, { useState } from 'react'
import { TranscriptLine, AIResponse, AppSettings } from '@shared/types'
import { AudioDevice } from '../App'
import Transcript from './Transcript'
import AIResponsePanel from './AIResponse'
import Settings from './Settings'
import MicLevel from './MicLevel'

interface OverlayProps {
  transcript: TranscriptLine[]
  aiResponse: AIResponse | null
  isListening: boolean
  isGenerating: boolean
  documents: { id: string; name: string; chunkCount: number }[]
  settings: AppSettings
  selectedLineId: string | null
  showSettings: boolean
  micLevel: number
  whisperLoading: boolean
  isUploading: boolean
  audioDevices: AudioDevice[]
  selectedDeviceId: string
  onDeviceChange: (deviceId: string) => void
  onSelectLine: (id: string) => void
  onToggleSettings: () => void
  onToggleListening: () => void
  onTriggerAI: () => void
  onRegenerateAI: () => void
  onExportTranscript: () => void
  onLoadDocument: () => void
  onRemoveDocument: (id: string) => void
  onClearContext: () => void
  onSaveSettings: (settings: AppSettings) => void
}

export default function Overlay({
  transcript,
  aiResponse,
  isListening,
  isGenerating,
  documents,
  settings,
  selectedLineId,
  showSettings,
  micLevel,
  whisperLoading,
  isUploading,
  audioDevices,
  selectedDeviceId,
  onDeviceChange,
  onSelectLine,
  onToggleSettings,
  onToggleListening,
  onTriggerAI,
  onRegenerateAI,
  onExportTranscript,
  onLoadDocument,
  onRemoveDocument,
  onClearContext,
  onSaveSettings,
}: OverlayProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const selectedQuestion = selectedLineId
    ? transcript.find(t => t.id === selectedLineId)?.text || null
    : null

  // Pill (collapsed) view
  if (!isExpanded) {
    return (
      <div className="fixed top-4 right-4 select-none">
        <div
          className="flex items-center gap-2 bg-gray-900/90 backdrop-blur-md rounded-full px-4 py-2 border border-gray-700/50 shadow-2xl cursor-pointer hover:bg-gray-800/90 transition-colors"
          onClick={() => setIsExpanded(true)}
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <div className="relative">
            <div className={`w-2.5 h-2.5 rounded-full ${isListening ? 'bg-green-400' : 'bg-gray-500'}`} />
            {isListening && (
              <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-green-400 animate-ping" />
            )}
          </div>
          <MicLevel level={micLevel} isListening={isListening} />
          <span className="text-gray-300 text-xs font-medium">
            {whisperLoading ? 'Loading...' : isListening ? 'Listening' : 'Paused'}
          </span>
          {documents.length > 0 && (
            <span className="text-gray-500 text-xs">| {documents.length} doc{documents.length > 1 ? 's' : ''}</span>
          )}
          {isGenerating && (
            <span className="text-blue-400 text-xs animate-pulse">Thinking...</span>
          )}
        </div>
      </div>
    )
  }

  // Expanded split-panel view
  return (
    <div
      className="fixed inset-0 flex flex-col bg-gray-900/95 backdrop-blur-md overflow-hidden"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b border-gray-700/50 shrink-0"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className={`w-2.5 h-2.5 rounded-full ${isListening ? 'bg-green-400' : 'bg-gray-500'}`} />
            {isListening && (
              <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-green-400 animate-ping" />
            )}
          </div>
          <MicLevel level={micLevel} isListening={isListening} />
          <span className="text-gray-200 text-sm font-semibold">
            {whisperLoading ? 'Loading model...' : 'Interview AI'}
          </span>
        </div>
        <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <button
            onClick={onToggleListening}
            disabled={whisperLoading}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              whisperLoading
                ? 'bg-yellow-500/20 text-yellow-400 animate-pulse'
                : isListening
                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                  : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
            }`}
          >
            {whisperLoading ? 'Loading...' : isListening ? 'Stop' : 'Start'}
          </button>
          <button
            onClick={onTriggerAI}
            disabled={isGenerating || transcript.length === 0}
            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Ask AI
          </button>
          {/* Export */}
          <button
            onClick={onExportTranscript}
            disabled={transcript.length === 0}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Export transcript"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
          {/* Settings gear */}
          <button
            onClick={onToggleSettings}
            className={`p-1.5 rounded-lg transition-colors ${showSettings ? 'text-blue-400 bg-blue-500/20' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'}`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
          {/* Collapse */}
          <button
            onClick={() => setIsExpanded(false)}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M4 10L10 4M4 4L10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Audio Device Selector */}
      {audioDevices.length > 0 && (
        <div className="px-3 py-1.5 border-b border-gray-700/50 shrink-0" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <select
            value={selectedDeviceId}
            onChange={e => onDeviceChange(e.target.value)}
            disabled={isListening}
            className="w-full bg-gray-800/50 border border-gray-700/50 rounded px-2 py-1 text-[11px] text-gray-300 focus:outline-none focus:border-blue-500/50 disabled:opacity-50"
          >
            {audioDevices.map(d => (
              <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Settings / Context drawer */}
      {showSettings && (
        <div className="border-b border-gray-700/50 max-h-[300px] overflow-y-auto shrink-0" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <div className="px-3 pt-2">
            <div className="flex gap-2 mb-2">
              <button
                onClick={onLoadDocument}
                disabled={isUploading}
                className="flex-1 px-2 py-1.5 rounded-lg text-xs font-medium bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 disabled:opacity-50 transition-colors"
              >
                {isUploading ? 'Uploading...' : '+ Upload Doc'}
              </button>
              {documents.length > 0 && (
                <button
                  onClick={onClearContext}
                  className="px-2 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>
            {documents.length > 0 && (
              <div className="mb-2 space-y-1">
                {documents.map(d => (
                  <div key={d.id} className="flex items-center gap-2 text-[11px] text-gray-400 bg-gray-800/30 rounded px-2 py-1 group">
                    <span className="text-purple-400">&#128196;</span>
                    <span className="truncate flex-1">{d.name}</span>
                    <span className="text-gray-600">{d.chunkCount} chunks</span>
                    <button
                      onClick={() => onRemoveDocument(d.id)}
                      className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity p-0.5"
                      title="Remove document"
                    >
                      <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                        <path d="M4 10L10 4M4 4L10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Settings settings={settings} onSave={onSaveSettings} />
        </div>
      )}

      {/* SPLIT PANEL: Transcript (top) + AI Response (bottom) */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>

        {/* Transcript Panel */}
        <div className="flex-1 min-h-[100px] flex flex-col overflow-hidden">
          <div className="px-3 py-1.5 flex items-center justify-between border-b border-gray-700/30 shrink-0">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Transcript</span>
            <span className="text-[10px] text-gray-600">{transcript.length} line{transcript.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <Transcript
              lines={transcript}
              selectedLineId={selectedLineId}
              onSelectLine={onSelectLine}
            />
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-600/50 shrink-0" />

        {/* AI Response Panel */}
        <div className="flex-1 min-h-[100px] flex flex-col overflow-hidden">
          <div className="px-3 py-1.5 flex items-center justify-between border-b border-gray-700/30 shrink-0">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">AI Response</span>
            {isGenerating && (
              <div className="flex items-center gap-1.5">
                <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse" />
                <span className="text-[10px] text-blue-400 animate-pulse">generating...</span>
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            <AIResponsePanel
              response={aiResponse}
              isGenerating={isGenerating}
              selectedQuestion={selectedQuestion}
              onRegenerate={onRegenerateAI}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
