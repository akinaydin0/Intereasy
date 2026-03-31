import React, { useEffect, useRef } from 'react'
import { AIResponse } from '@shared/types'

interface AIResponsePanelProps {
  response: AIResponse | null
  isGenerating: boolean
  selectedQuestion?: string | null
}

export default function AIResponsePanel({ response, isGenerating, selectedQuestion }: AIResponsePanelProps) {
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [response?.answer])

  if (!response) {
    return (
      <div className="flex items-center justify-center h-full text-gray-600 text-xs p-4">
        <div className="text-center">
          <p className="mb-1">No AI response yet</p>
          <p className="text-[10px] text-gray-700">
            {selectedQuestion
              ? 'Click "Ask AI" to get a response for the selected line'
              : 'Select a transcript line and click "Ask AI"'
            }
          </p>
        </div>
      </div>
    )
  }

  return (
    <div ref={contentRef} className="p-3 overflow-y-auto h-full">
      {/* Show the question being answered */}
      {selectedQuestion && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <p className="text-[10px] text-amber-400/70 font-semibold uppercase tracking-wider mb-1">Question</p>
          <p className="text-[12px] text-amber-200/90 leading-relaxed">{selectedQuestion}</p>
        </div>
      )}

      {isGenerating && !response.answer && (
        <div className="flex items-center gap-2 mb-3">
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-blue-400 text-xs">Generating...</span>
        </div>
      )}

      <div className="text-gray-200 text-[13px] leading-relaxed whitespace-pre-wrap">
        {response.answer}
        {response.isStreaming && (
          <span className="inline-block w-1.5 h-4 bg-blue-400 ml-0.5 animate-pulse" />
        )}
      </div>
    </div>
  )
}
