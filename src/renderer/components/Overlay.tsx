import React, { useState } from 'react'
import { TranscriptLine, AIResponse, AppSettings } from '@shared/types'
import { AudioDevice } from '../App'
import Transcript from './Transcript'
import AIResponsePanel from './AIResponse'
import ContextPanel from './ContextPanel'
import Settings from './Settings'

interface OverlayProps {
  transcript: TranscriptLine[]
  aiResponse: AIResponse | null
  isListening: boolean
  isGenerating: boolean
  documents: { id: string; name: string; chunkCount: number }[]
  settings: AppSettings
  activeTab: 'response' | 'transcript' | 'context' | 'settings'
  audioDevices: AudioDevice[]
  selectedDeviceId: string
  onDeviceChange: (deviceId: string) => void
  onTabChange: (tab: 'response' | 'transcript' | 'context' | 'settings') => void
  onToggleListening: () => void
  onTriggerAI: () => void
  onLoadDocument: () => void
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
  activeTab,
  audioDevices,
  selectedDeviceId,
  onDeviceChange,
  onTabChange,
  onToggleListening,
  onTriggerAI,
  onLoadDocument,
  onClearContext,
  onSaveSettings,
}: OverlayProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Pill (collapsed) view
  if (!isExpanded) {
    return (
      <div
        className="fixed top-4 right-4 select-none"
      >
        <div
          className="flex items-center gap-2 bg-gray-900/90 backdrop-blur-md rounded-full px-4 py-2 border border-gray-700/50 shadow-2xl cursor-pointer hover:bg-gray-800/90 transition-colors"
          onClick={() => setIsExpanded(true)}
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          {/* Mic indicator */}
          <div className="relative">
            <div className={`w-2.5 h-2.5 rounded-full ${isListening ? 'bg-green-400' : 'bg-gray-500'}`} />
            {isListening && (
              <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-green-400 animate-ping" />
            )}
          </div>
          <span className="text-gray-300 text-xs font-medium">
            {isListening ? 'Listening' : 'Paused'}
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

  // Expanded view
  return (
    <div
      className="fixed top-4 right-4 w-[400px] max-h-[580px] flex flex-col bg-gray-900/90 backdrop-blur-md rounded-2xl border border-gray-700/50 shadow-2xl overflow-hidden"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2.5 border-b border-gray-700/50"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className={`w-2.5 h-2.5 rounded-full ${isListening ? 'bg-green-400' : 'bg-gray-500'}`} />
            {isListening && (
              <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-green-400 animate-ping" />
            )}
          </div>
          <span className="text-gray-200 text-sm font-semibold">Interview AI</span>
        </div>
        <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <button
            onClick={onToggleListening}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              isListening
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
            }`}
          >
            {isListening ? 'Stop' : 'Start'}
          </button>
          <button
            onClick={onTriggerAI}
            disabled={isGenerating || transcript.length === 0}
            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Ask AI
          </button>
          <button
            onClick={() => setIsExpanded(false)}
            className="ml-1 p-1 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M4 10L10 4M4 4L10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Audio Device Selector */}
      {audioDevices.length > 0 && (
        <div className="px-3 py-1.5 border-b border-gray-700/50" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
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

      {/* Tabs */}
      <div className="flex border-b border-gray-700/50" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        {(['response', 'transcript', 'context', 'settings'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`flex-1 py-2 text-xs font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        {activeTab === 'response' && (
          <AIResponsePanel response={aiResponse} isGenerating={isGenerating} />
        )}
        {activeTab === 'transcript' && (
          <Transcript lines={transcript} />
        )}
        {activeTab === 'context' && (
          <ContextPanel
            documents={documents}
            onLoadDocument={onLoadDocument}
            onClearContext={onClearContext}
          />
        )}
        {activeTab === 'settings' && (
          <Settings settings={settings} onSave={onSaveSettings} />
        )}
      </div>
    </div>
  )
}
