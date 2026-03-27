import React from 'react'

interface ContextPanelProps {
  documents: { id: string; name: string; chunkCount: number }[]
  onLoadDocument: () => void
  onClearContext: () => void
}

export default function ContextPanel({ documents, onLoadDocument, onClearContext }: ContextPanelProps) {
  return (
    <div className="p-4 space-y-4">
      {/* Upload button */}
      <button
        onClick={onLoadDocument}
        className="w-full py-3 rounded-xl border-2 border-dashed border-gray-600 text-gray-400 text-sm hover:border-blue-500/50 hover:text-blue-400 transition-colors"
      >
        + Upload Document (PDF, DOCX, TXT)
      </button>

      {/* Document list */}
      {documents.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">
              Loaded Documents
            </span>
            <button
              onClick={onClearContext}
              className="text-red-400/70 text-xs hover:text-red-400 transition-colors"
            >
              Clear All
            </button>
          </div>
          {documents.map(doc => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700/30"
            >
              <div className="flex items-center gap-2 min-w-0">
                <svg className="w-4 h-4 text-blue-400 shrink-0" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M4 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V5.414a1 1 0 0 0-.293-.707L10.293 1.293A1 1 0 0 0 9.586 1H4zm5 1.5L12.5 6H10a1 1 0 0 1-1-1V2.5z" />
                </svg>
                <span className="text-gray-300 text-sm truncate">{doc.name}</span>
              </div>
              <span className="text-gray-500 text-xs shrink-0 ml-2">
                {doc.chunkCount} chunks
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-600 text-xs text-center">
          Upload documents to give the AI context about you, your resume, or the company.
        </p>
      )}
    </div>
  )
}
