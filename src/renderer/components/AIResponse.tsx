import React, { useEffect, useRef } from 'react'
import { AIResponse } from '@shared/types'

interface AIResponsePanelProps {
  response: AIResponse | null
  isGenerating: boolean
}

export default function AIResponsePanel({ response, isGenerating }: AIResponsePanelProps) {
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [response?.answer])

  if (!response) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500 text-sm">No AI response yet.</p>
        <p className="text-gray-600 text-xs mt-1">
          Click "Ask AI" or wait for automatic question detection.
        </p>
      </div>
    )
  }

  return (
    <div ref={contentRef} className="p-4 overflow-y-auto">
      {isGenerating && (
        <div className="flex items-center gap-2 mb-3">
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-blue-400 text-xs">Generating...</span>
        </div>
      )}
      <div className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">
        {response.answer}
        {response.isStreaming && (
          <span className="inline-block w-1.5 h-4 bg-blue-400 ml-0.5 animate-pulse" />
        )}
      </div>
    </div>
  )
}
