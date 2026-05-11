'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Clock } from 'lucide-react'

interface Version {
  id: string
  document_id: string
  created_at: string
  snapshot_html: string | null
}

interface VersionHistoryPanelProps {
  isOpen: boolean
  onClose: () => void
  documentId: string
  onRestore: (snapshot: string) => Promise<void>
}

export default function VersionHistoryPanel({
  isOpen,
  onClose,
  documentId,
  onRestore
}: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<Version[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  const fetchVersions = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('versions')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setVersions(data || [])
    } catch (err) {
      console.error('버전 히스토리 로드 실패:', err)
    } finally {
      setIsLoading(false)
    }
  }, [supabase, documentId])

  useEffect(() => {
    if (isOpen && documentId) {
      fetchVersions()
    }
  }, [isOpen, documentId, fetchVersions])

  const handleRestoreClick = async (snapshot: string | null) => {
    if (!snapshot) return
    if (window.confirm("이 버전으로 문서를 복원할까요? 현재 내용은 사라집니다.")) {
      await onRestore(snapshot)
      onClose()
    }
  }

  return (
    <div
      className={`fixed inset-y-0 right-0 w-72 bg-white shadow-xl z-20 transform transition-transform duration-300 ease-in-out border-l ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="flex flex-col h-full">
        <header className="h-14 border-b flex items-center justify-between px-4 shrink-0 bg-gray-50">
          <h2 className="text-sm font-bold text-gray-800">버전 히스토리</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : versions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <Clock className="w-12 h-12 text-gray-200 mb-3" />
              <p className="text-sm font-semibold text-gray-900 mb-1">저장된 버전이 없습니다</p>
              <p className="text-xs text-gray-500 leading-relaxed">
                수동 저장(저장 버튼) 시<br />버전이 자동으로 생성됩니다.
              </p>
            </div>
          ) : (
            <ul className="space-y-4">
              {versions.map((version) => (
                <li key={version.id} className="border rounded-lg p-3 space-y-2 hover:border-blue-300 transition-colors">
                  <div className="text-xs font-medium text-gray-800">
                    {new Date(version.created_at).toLocaleString('ko-KR')}
                  </div>
                  <button
                    onClick={() => handleRestoreClick(version.snapshot_html)}
                    className="w-full py-1.5 text-[11px] font-semibold text-blue-600 border border-blue-200 rounded hover:bg-blue-50 transition-colors"
                  >
                    이 버전으로 복원
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}