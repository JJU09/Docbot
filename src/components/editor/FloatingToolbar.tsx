import { useEditor } from '@/contexts/EditorContext'
import { Wand2, Sparkles, Languages, Check } from 'lucide-react'
import { useState, useEffect } from 'react'

interface FloatingToolbarProps {
  onAction: (prompt: string) => void;
}

export function FloatingToolbar({ onAction }: FloatingToolbarProps) {
  const { selectedText, isSelectionActive } = useEditor()
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Syncfusion 에디터 특성상 selection이 바뀌었을 때
    // 마우스의 가장 마지막 위치나 선택 영역의 중심 등을 가져와야 하나,
    // 일단 화면 중앙 하단 쯤 플로팅 되게 하거나 마우스 이벤트 추적이 필요함.
    // 여기서는 간단히 선택 영역이 있으면 화면 중앙 하단에 고정 플로팅으로 띄우겠습니다.
    if (isSelectionActive && selectedText) {
      setIsVisible(true)
    } else {
      setIsVisible(false)
    }
  }, [selectedText, isSelectionActive])

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 fade-in duration-200">
      <div className="bg-white border shadow-xl rounded-full px-4 py-2 flex items-center gap-1.5 text-sm font-medium">
        <span className="text-blue-600 mr-2 flex items-center gap-1">
          <Wand2 size={16} /> <span className="font-bold text-xs">AI 툴바</span>
        </span>
        
        <div className="w-px h-4 bg-gray-200 mx-1"></div>

        <button 
          onClick={() => onAction('선택한 텍스트를 더 전문적인 비즈니스 톤으로 수정해줘')}
          className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-700"
        >
          <Sparkles size={14} /> 전문적으로
        </button>
        <button 
          onClick={() => onAction('선택한 텍스트를 더 길고 상세하게 작성해줘')}
          className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-700"
        >
          길게
        </button>
        <button 
          onClick={() => onAction('선택한 텍스트를 핵심만 짧게 요약해줘')}
          className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-700"
        >
          짧게
        </button>
        
        <div className="w-px h-4 bg-gray-200 mx-1"></div>
        
        <button 
          onClick={() => onAction('선택한 텍스트를 깔끔한 표(Table) 형태로 변환해줘')}
          className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-700"
        >
          표 변환
        </button>
        
        <button 
          onClick={() => setIsVisible(false)}
          className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 ml-1 transition-colors"
        >
          <Check size={16} />
        </button>
      </div>
    </div>
  )
}