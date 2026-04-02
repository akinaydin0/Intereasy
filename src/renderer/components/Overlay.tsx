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
  screenShareVisible: boolean
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
  onToggleScreenShare: () => void
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
  screenShareVisible,
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
  onToggleScreenShare,
}: OverlayProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const selectedQuestion = selectedLineId
    ? transcript.find(t => t.id === selectedLineId)?.text || null
    : null

  const isCloud = settings.sttProvider === 'cloud-whisper'

  // Pill (collapsed) view
  if (!isExpanded) {
    return (
      <div className="fixed top-4 right-4 select-none overlay-transition">
        <div
          className="flex items-center gap-2.5 glass-pill rounded-full px-4 py-2.5 border border-gray-700/30 shadow-2xl cursor-pointer hover:border-gray-600/50 transition-all duration-200 group"
          onClick={() => setIsExpanded(true)}
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          {/* Status dot */}
          <div className="relative">
            <div className={`w-2.5 h-2.5 rounded-full transition-colors ${isListening ? 'bg-green-400' : 'bg-gray-500'}`} />
            {isListening && (
              <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-green-400 animate-ping" />
            )}
          </div>

          <MicLevel level={micLevel} isListening={isListening} />

          {/* Status text */}
          <span className="text-gray-300 text-xs font-medium">
            {whisperLoading ? 'Loading...' : isListening ? 'Listening' : 'Paused'}
          </span>

          {/* Provider badge */}
          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
            isCloud ? 'bg-violet-500/20 text-violet-400' : 'bg-emerald-500/20 text-emerald-400'
          }`}>
            {isCloud ? 'Cloud' : 'Local'}
          </span>

          {documents.length > 0 && (
            <span className="text-gray-500 text-xs">| {documents.length} doc{documents.length > 1 ? 's' : ''}</span>
          )}
          {isGenerating && (
            <span className="text-blue-400 text-xs animate-pulse">Thinking...</span>
          )}

          {/* Screen share visibility indicator */}
          {screenShareVisible && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium bg-amber-500/20 text-amber-400">
              Visible
            </span>
          )}
        </div>
      </div>
    )
  }

  // Expanded split-panel view
  return (
    <div
      className="fixed inset-0 flex flex-col glass overflow-hidden overlay-transition"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2.5 border-b border-gray-700/30 shrink-0"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className={`w-2.5 h-2.5 rounded-full transition-colors ${isListening ? 'bg-green-400' : 'bg-gray-500'}`} />
            {isListening && (
              <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-green-400 animate-ping" />
            )}
          </div>
          <MicLevel level={micLevel} isListening={isListening} />
          <span className="text-gray-200 text-sm font-semibold tracking-tight">
            {whisperLoading ? 'Loading model...' : 'Intereasy'}
          </span>
          {/* Provider badge in header */}
          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
            isCloud ? 'bg-violet-500/15 text-violet-400 border border-violet-500/20' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
          }`}>
            {isCloud ? '☁️ Cloud' : '🖥️ Local'}
          </span>
        </div>
        <div className="flex items-center gap-1.5" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <button
            onClick={onToggleListening}
            disabled={whisperLoading}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
              whisperLoading
                ? 'bg-amber-500/15 text-amber-400 animate-pulse border border-amber-500/20'
                : isListening
                  ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/20'
                  : 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/20'
            }`}
          >
            {whisperLoading ? 'Loading...' : isListening ? 'Stop' : 'Start'}
          </button>
          <button
            onClick={onTriggerAI}
            disabled={isGenerating || transcript.length === 0}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 border border-blue-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
          >
            Ask AI
          </button>
          {/* Export */}
          <button
            onClick={onExportTranscript}
            disabled={transcript.length === 0}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-700/40 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
            title="Export transcript"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
          {/* Screen share visibility toggle */}
          <button
            onClick={onToggleScreenShare}
            className={`p-1.5 rounded-lg transition-all ${
              screenShareVisible
                ? 'text-amber-400 bg-amber-500/15'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/40'
            }`}
            title={screenShareVisible ? 'Visible to screen share — click to hide' : 'Hidden from screen share — click to show'}
          >
            {screenShareVisible ? (
              /* Eye open = visible to share */
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            ) : (
              /* Eye with slash = hidden from share */
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            )}
          </button>
          {/* Settings gear */}
          <button
            onClick={onToggleSettings}
            className={`p-1.5 rounded-lg transition-all ${showSettings ? 'text-blue-400 bg-blue-500/15' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/40'}`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
          {/* Collapse */}
          <button
            onClick={() => setIsExpanded(false)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-700/40 transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M4 10L10 4M4 4L10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Screen share warning banner */}
      {screenShareVisible && (
        <div className="px-4 py-1.5 bg-amber-500/10 border-b border-amber-500/20 shrink-0 flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400 shrink-0">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span className="text-amber-400 text-[10px] font-medium">Visible to screen share</span>
          <button onClick={onToggleScreenShare} className="ml-auto text-[10px] text-amber-400/70 hover:text-amber-300 transition-colors">
            Hide
          </button>
        </div>
      )}

      {/* Audio Device Selector */}
      {audioDevices.length > 0 && (
        <div className="px-4 py-2 border-b border-gray-700/20 shrink-0" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <div className="flex items-center gap-2">
            <select
              value={selectedDeviceId}
              onChange={e => onDeviceChange(e.target.value)}
              disabled={isListening}
              className="flex-1 bg-gray-800/40 border border-gray-700/30 rounded-lg px-2.5 py-1.5 text-[11px] text-gray-300 focus:outline-none focus:border-blue-500/40 disabled:opacity-40 transition-all"
            >
              {audioDevices.map(d => (
                <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
              ))}
            </select>
            {/* System audio hint */}
            <div className="relative group">
              <button
                className="w-5 h-5 rounded-full bg-gray-700/40 text-gray-500 text-[10px] font-bold hover:bg-gray-600/50 hover:text-gray-300 transition-all flex items-center justify-center shrink-0"
                title="How to capture speaker/meeting audio"
              >
                ?
              </button>
              <div className="absolute right-0 top-7 w-64 p-3 bg-gray-800/95 backdrop-blur-xl border border-gray-600/30 rounded-xl shadow-2xl text-[10px] text-gray-300 leading-relaxed z-50 hidden group-hover:block">
                <p className="font-semibold text-gray-100 mb-1.5">🔊 Capturing Speaker Audio</p>
                <p className="mb-2">To hear what others say in a meeting, you need a <span className="text-violet-400">virtual audio cable</span>:</p>
                <p>• <span className="font-medium text-white">Windows:</span> Install <span className="text-violet-400">VB-Cable</span> (free) — vb-audio.com</p>
                <p>• <span className="font-medium text-white">macOS:</span> Install <span className="text-violet-400">BlackHole</span> (free) — existential.audio</p>
                <p className="mt-2 text-gray-500">After installing, the virtual device appears here. Select it to capture all speaker output.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings / Context drawer */}
      {showSettings && (
        <div className="border-b border-gray-700/20 max-h-[300px] overflow-y-auto shrink-0 settings-enter" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <div className="px-4 pt-3">
            <div className="flex gap-2 mb-3">
              <button
                onClick={onLoadDocument}
                disabled={isUploading}
                className="flex-1 px-3 py-2 rounded-xl text-xs font-semibold bg-purple-500/15 text-purple-400 hover:bg-purple-500/25 border border-purple-500/20 disabled:opacity-40 transition-all"
              >
                {isUploading ? 'Uploading...' : '+ Upload Doc'}
              </button>
              {documents.length > 0 && (
                <button
                  onClick={onClearContext}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/15 transition-all"
                >
                  Clear All
                </button>
              )}
            </div>
            {documents.length > 0 && (
              <div className="mb-3 space-y-1.5">
                {documents.map(d => (
                  <div key={d.id} className="flex items-center gap-2 text-[11px] text-gray-400 bg-gray-800/30 rounded-lg px-3 py-1.5 group border border-gray-700/10">
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
          <div className="px-4 py-2 flex items-center justify-between border-b border-gray-700/20 shrink-0">
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

        {/* Gradient Divider */}
        <div className="gradient-divider shrink-0" />

        {/* AI Response Panel */}
        <div className="flex-1 min-h-[100px] flex flex-col overflow-hidden">
          <div className="px-4 py-2 flex items-center justify-between border-b border-gray-700/20 shrink-0">
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
