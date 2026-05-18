'use client'

import { useChat } from '@ai-sdk/react'
import { type UIMessage } from 'ai'
import { useEffect, useRef, useState, useMemo, forwardRef, useImperativeHandle } from 'react'
import { Send, User, Bot, Check, X, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useEditor } from '@/contexts/EditorContext'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ==================== UpdateEditorTool ====================
function UpdateEditorTool({ 
  args, 
  toolCallId, 
  toolName,
  addToolOutput
}: { 
  args: { 
    modifiedHtml?: string; 
    textBefore?: string; 
    targetText?: string; 
    textAfter?: string;
    targetKeyword?: string;
  }
  toolCallId: string
  toolName: string
  addToolOutput: (options: { tool: string; toolCallId: string; output: string }) => void
}) {
  const { editorRef } = useEditor()
  const [status, setStatus] = useState<'pending' | 'applied' | 'rejected'>('pending')
  const hasPreviewed = useRef(false)

  useEffect(() => {
    if (!args?.modifiedHtml) return
    if (status === 'pending' && !hasPreviewed.current && editorRef?.current) {
      hasPreviewed.current = true
      
      const currentText = editorRef.current.getText() || '';
      const isDocumentEmpty = currentText.trim().length === 0;

      // 새 문서(또는 완전 빈 문서)이면서 대상 텍스트가 명확하지 않을 때는 전체 덮어쓰기 로직으로 폴백
      if (isDocumentEmpty || (!args.targetText && !args.targetKeyword)) {
        console.log('[DEBUG-CHAT] 문서가 비어있거나 targetText가 없어 전체 내용을 삽입합니다.');
        editorRef.current.replaceSelection(args.modifiedHtml)
          .then(() => {
            setStatus('applied');
            addToolOutput({ tool: toolName, toolCallId, output: '시스템 알림: 새 문서에 초안이 성공적으로 삽입되었습니다.' });
          });
      } else {
        editorRef.current.previewSelection(
          args.modifiedHtml, 
          args.textBefore, 
          args.targetText, 
          args.textAfter,
          'text',
          args.targetKeyword
        )
          .then((success: boolean | void) => {
            if (success === false) {
              setStatus('rejected')
            }
          })
      }
    }
  }, [args, editorRef, status, toolCallId, toolName, addToolOutput])

  if (!args?.modifiedHtml) {
    return <div className="max-w-[85%] w-full p-4 bg-blue-50 border border-blue-100 rounded-lg animate-in slide-in-from-bottom-2 mt-2">
      <p className="text-sm font-medium text-blue-600 animate-pulse">수정 내용을 생성하는 중입니다...</p>
    </div>
  }

  if (status === 'applied') {
    return (
      <div className="max-w-[85%] w-full p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700 mt-2">
        <Check size={16} />
        <span className="text-sm font-medium">수정 내용이 적용되었습니다.</span>
      </div>
    )
  }

  if (status === 'rejected') {
    return (
      <div className="max-w-[85%] w-full p-4 bg-yellow-50 border border-yellow-200 rounded-lg mt-2">
        <div className="flex items-center gap-2 text-yellow-800 mb-2">
          <AlertCircle size={16} />
          <p className="text-sm font-bold">수정할 위치를 찾지 못했습니다.</p>
        </div>
        <p className="text-xs text-yellow-700 mb-4 leading-relaxed">
          수정할 텍스트를 드래그로 선택 후 아래 버튼을 클릭하거나, 수정을 포기할 수 있습니다.
        </p>
        <div className="flex gap-2">
          <button 
            onClick={() => {
              hasPreviewed.current = false
              setStatus('pending')
            }}
            className="flex-1 bg-yellow-600 text-white py-2 rounded-md text-xs font-medium hover:bg-yellow-700 transition-colors"
          >
            다시 시도
          </button>
          <button 
            onClick={() => {
              addToolOutput({
                tool: toolName,
                toolCallId,
                output: '시스템 알림: 텍스트를 찾지 못해 사용자가 수정을 포기했습니다.'
              })
            }}
            className="flex-1 bg-white border border-yellow-200 text-yellow-700 py-2 rounded-md text-xs font-medium hover:bg-yellow-50 transition-colors"
          >
            포기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[85%] w-full p-4 bg-blue-50 border border-blue-100 rounded-lg animate-in slide-in-from-bottom-2 mt-2">
      <p className="text-sm font-bold text-blue-700 mb-3">AI가 수정한 내용을 적용할까요?</p>
      <div className="flex gap-2">
        <button 
          onClick={() => {
            if (editorRef?.current) editorRef.current.acceptPreview()
            setStatus('applied')
            addToolOutput({ tool: toolName, toolCallId, output: '사용자가 수정 사항을 수락했습니다.' })
          }}
          className="flex-1 flex items-center justify-center gap-1 bg-blue-600 text-white py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Check size={16} /> 수락
        </button>
        <button 
          onClick={() => {
            if (editorRef?.current) editorRef.current.rejectPreview()
            setStatus('rejected')
          }}
          className="flex-1 flex items-center justify-center gap-1 bg-white border border-gray-200 text-gray-600 py-2 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          <X size={16} /> 거절
        </button>
      </div>
    </div>
  )
}

// ==================== AskClarificationTool (다중 질문 & 다중 선택 위저드) ====================
function AskClarificationWizard({
  args,
  toolCallId,
  append,
  addToolOutput,
  editorContext,
  selectedHtml,
  selectedText
}: {
  args: {
    questions?: {
      question: string;
      options: { label: string; value: string }[];
      allowMultiple?: boolean;
    }[];
    // 하위 호환성 (단일 질문)
    question?: string;
    options?: { label: string; value: string }[];
    allowMultiple?: boolean;
  };
  toolCallId: string;
  append: any;
  addToolOutput: any;
  editorContext: string;
  selectedHtml: string | null;
  selectedText: string;
}) {
  const questions = useMemo(() => {
    if (args.questions && args.questions.length > 0) return args.questions;
    if (args.question && args.options) {
      return [{ question: args.question, options: args.options, allowMultiple: args.allowMultiple }];
    }
    return [];
  }, [args]);

  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string[]>>({});
  const [customInput, setCustomInput] = useState('');

  if (questions.length === 0) return null;

  const currentQ = questions[currentStep];
  const isMultiple = currentQ.allowMultiple;
  const currentAnswers = answers[currentStep] || [];
  const isLastStep = currentStep === questions.length - 1;

  const handleToggleOption = (value: string) => {
    if (isMultiple) {
      setAnswers(prev => {
        const selected = prev[currentStep] || [];
        if (selected.includes(value)) {
          return { ...prev, [currentStep]: selected.filter(v => v !== value) };
        } else {
          return { ...prev, [currentStep]: [...selected, value] };
        }
      });
    } else {
      setAnswers(prev => ({ ...prev, [currentStep]: [value] }));
    }
  };

  const handleNextOrSubmit = (immediateValue?: string) => {
    const finalSelection = immediateValue 
      ? [immediateValue] 
      : customInput.trim() 
        ? [...currentAnswers, customInput.trim()] 
        : currentAnswers;

    const newAnswers = { ...answers, [currentStep]: finalSelection };
    setAnswers(newAnswers);
    setCustomInput('');

    if (isLastStep) {
      // 위저드 완료 -> 제출
      let formattedText = '';
      let toolOutputText = '사용자가 다음의 응답을 완료했습니다:\n';
      
      questions.forEach((q, idx) => {
        const ans = newAnswers[idx] || [];
        formattedText += `[질문] ${q.question}\n답변 : ${ans.join(', ')}\n\n`;
        toolOutputText += `- ${q.question}: ${ans.join(', ')}\n`;
      });

      addToolOutput({
        tool: 'askClarification',
        toolCallId,
        output: toolOutputText.trim()
      });

      append(
        { role: 'user', content: formattedText.trim() }, 
        { body: { selectedHtml, selectedText, editorContext } }
      );
    } else {
      // 다음 스텝
      setCurrentStep(prev => prev + 1);
    }
  };

  return (
    <div className="px-4 pb-4 flex flex-col gap-3 animate-in slide-in-from-bottom-2 fade-in">
      <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 shadow-sm w-full relative">
        {questions.length > 1 && (
          <div className="absolute top-4 right-4 flex items-center gap-0.5 bg-white border border-blue-100 rounded-full px-1 py-0.5 shadow-sm">
            <button 
              onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
              disabled={currentStep === 0}
              className="p-1 rounded-full text-blue-500 hover:bg-blue-50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs font-bold text-blue-700 px-1">
              {currentStep + 1} / {questions.length}
            </span>
            <button 
              onClick={() => handleNextOrSubmit()}
              disabled={currentAnswers.length === 0 && !customInput.trim()}
              className="p-1 rounded-full text-blue-500 hover:bg-blue-50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
        
        <div className="flex items-center gap-2 mb-3 pr-24">
          <div className="bg-blue-100 p-1.5 rounded-full text-blue-700">
            <Bot size={16} />
          </div>
          <span className="text-sm font-semibold text-blue-900">
            {isMultiple ? '복수 선택 가능' : '추가 정보가 필요합니다'}
          </span>
        </div>
        
        <p className="text-sm text-blue-800 font-medium mb-4 ml-1">
          {currentQ.question}
        </p>
        
        <div className="flex flex-col gap-2">
          {currentQ.options?.map((opt, i) => {
            const isSelected = currentAnswers.includes(opt.value);
            return (
              <button
                key={i}
                onClick={() => {
                  if (isMultiple) {
                    handleToggleOption(opt.value);
                  } else {
                    handleNextOrSubmit(opt.value);
                  }
                }}
                className={cn(
                  "w-full text-left px-4 py-3 bg-white text-sm font-medium rounded-lg border transition-all shadow-sm active:scale-[0.99]",
                  isSelected 
                    ? "border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-200" 
                    : "border-blue-100 text-blue-700 hover:border-blue-300 hover:shadow"
                )}
              >
                <div className="flex items-center justify-between">
                  <span>{opt.label}</span>
                  {isMultiple && (
                    <div className={cn("w-4 h-4 rounded border flex items-center justify-center", isSelected ? "bg-blue-500 border-blue-500 text-white" : "border-gray-300")}>
                      {isSelected && <Check size={12} strokeWidth={3} />}
                    </div>
                  )}
                  {!isMultiple && <span className="text-blue-300">→</span>}
                </div>
              </button>
            );
          })}
          
          {/* 직접 입력란 */}
          <div className="relative mt-1">
            <input 
              type="text"
              placeholder="기타 (직접 입력)"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && customInput.trim()) {
                  e.preventDefault();
                  handleNextOrSubmit();
                }
              }}
              className="w-full pl-4 pr-12 py-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all shadow-sm"
            />
            {!isMultiple && (
              <button 
                onClick={() => handleNextOrSubmit()}
                disabled={!customInput.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md font-bold transition-colors disabled:text-gray-300 text-blue-600 hover:bg-blue-50 disabled:hover:bg-transparent"
              >
                →
              </button>
            )}
          </div>
        </div>

        {/* 다중 선택 시에만 하단 완료 버튼 제공 */}
        {isMultiple && (
          <div className="mt-4 pt-3 border-t border-blue-100/50 flex justify-end">
            <button
              onClick={() => handleNextOrSubmit()}
              disabled={currentAnswers.length === 0 && !customInput.trim()}
              className="flex items-center gap-1.5 text-sm font-bold px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors shadow-sm"
            >
              {isLastStep ? <><Check size={16}/> 선택 완료</> : '다음 단계 →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== ✨ UpdateTableTool (새로 추가) ====================
function UpdateTableTool({ 
  args, 
  toolCallId, 
  toolName,
  addToolOutput
}: { 
  args: { targetKeyword?: string; tableData?: string[][] }
  toolCallId: string
  toolName: string
  addToolOutput: (options: { tool: string; toolCallId: string; output: string }) => void
}) {
  const { editorRef } = useEditor()
  const [status, setStatus] = useState<'pending' | 'previewing' | 'applied' | 'rejected'>('pending')
  const hasPreviewed = useRef(false)

  useEffect(() => {
    if (!args?.tableData || !args?.targetKeyword) return
    if (status === 'pending' && !hasPreviewed.current && editorRef?.current) {
      hasPreviewed.current = true
      
      // SyncfusionDocEditor의 표 전용 함수 호출
      editorRef.current.updateTableData(args.targetKeyword, args.tableData)
        .then((success: boolean | void) => {
          if (success === false) {
            setStatus('rejected')
            addToolOutput({
              tool: toolName,
              toolCallId,
              output: '시스템 알림: 표를 찾지 못했습니다. 사용자에게 "수정하실 표를 직접 드래그한 후 다시 요청해주세요."라고 안내하세요.'
            })
          } else {
            setStatus('previewing')
          }
        })
    }
  }, [args, editorRef, status, toolCallId, toolName, addToolOutput])

  if (!args?.tableData || !args?.targetKeyword) {
    return <div className="max-w-[85%] w-full p-4 bg-blue-50 border border-blue-100 rounded-lg animate-in slide-in-from-bottom-2 mt-2">
      <p className="text-sm font-medium text-blue-600 animate-pulse">표 데이터를 구성하는 중입니다...</p>
    </div>
  }

  if (status === 'applied') {
    return (
      <div className="max-w-[85%] w-full p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700 mt-2">
        <Check size={16} />
        <span className="text-sm font-medium">표 데이터가 적용되었습니다.</span>
      </div>
    )
  }

  if (status === 'rejected') {
    return (
      <div className="max-w-[85%] w-full p-3 bg-yellow-50 border border-yellow-200 rounded-lg mt-2">
        <p className="text-xs font-medium text-yellow-800">
          표를 찾지 못했습니다.
        </p>
        <p className="text-xs text-yellow-700 mt-1">
          수정하실 표를 직접 드래그로 선택한 후 
          같은 요청을 다시 해주세요.
        </p>
      </div>
    )
  }

  if (status === 'previewing') {
    return (
      <div className="max-w-[85%] w-full p-4 bg-blue-50 border border-blue-100 rounded-lg animate-in slide-in-from-bottom-2 mt-2">
        <p className="text-sm font-bold text-blue-700 mb-1">AI가 생성한 표 데이터를 적용할까요?</p>
        <p className="text-xs text-blue-600 mb-3">
          {args.tableData.length}행 × {args.tableData[0]?.length || 0}열 표가 에디터에 반영되었습니다. 변경 내용을 확인 후 수락하세요.
        </p>
        
        <div className="flex gap-2">
          <button 
            onClick={() => {
              if (editorRef?.current) editorRef.current.acceptPreview()
              setStatus('applied')
              addToolOutput({ tool: toolName, toolCallId, output: '사용자가 표 수정 사항을 수락했습니다.' })
            }}
          className="flex-1 flex items-center justify-center gap-1 bg-blue-600 text-white py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Check size={16} /> 수락
        </button>
        <button 
          onClick={() => {
            if (editorRef?.current) editorRef.current.rejectPreview()
            setStatus('rejected')
            addToolOutput({ tool: toolName, toolCallId, output: '사용자가 표 수정 사항을 거절했습니다.' })
          }}
          className="flex-1 flex items-center justify-center gap-1 bg-white border border-gray-200 text-gray-600 py-2 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          <X size={16} /> 거절
        </button>
      </div>
    </div>
    )
  }

  return null
}

// ==================== Main ChatPanel ====================
// ✨ 누락되었던 인터페이스 선언 추가
interface ChatPanelProps {
  documentId: string;
  editorContext: string;
  isNewDocument?: boolean;
  initialPrompt?: string;
  isUploaded?: boolean;
  isReady?: boolean;
}

const HIDDEN_ANALYZE_PROMPT = "[SYSTEM: 현재 에디터에 로드된 문서의 구조를 분석하고 요약 리포트를 작성해줘]";

const ChatPanel = forwardRef<{ sendMessage: (msg: { text: string }) => void }, ChatPanelProps>(({ 
  documentId,
  editorContext,
  isNewDocument = false,
  initialPrompt,
  isUploaded = false,
  isReady = false
}, ref) => {
  const { selectedHtml, selectedText, editorRef } = useEditor()
  const [showHistoryError, setShowHistoryError] = useState(false)

  const hasInitializedAnalyizeRef = useRef(false)
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false)

  const [width, setWidth] = useState(600)
  const [isResizing, setIsResizing] = useState(false)
  const [input, setInput] = useState('')

  const truncatedContext = useMemo(() => {
    if (!editorContext) return '';
    const MAX_LENGTH = 15000;
    
    if (editorContext.length <= MAX_LENGTH) return editorContext;

    // 15,000자에서 자르되, 가장 가까운 이전 문단 끝(\n)을 찾음
    const slice = editorContext.slice(0, MAX_LENGTH);
    const lastNewline = slice.lastIndexOf('\n');
    
    // 적절한 줄바꿈 위치를 찾으면 거기서 자르고, 아니면 그냥 slice
    const finalTrim = lastNewline > MAX_LENGTH * 0.8 ? slice.slice(0, lastNewline) : slice;
    
    return finalTrim + '\n...(이하 생략)';
  }, [editorContext])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return
      const newWidth = window.innerWidth - e.clientX
      setWidth(Math.min(Math.max(300, newWidth), 800))
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing])

  const chatHelpers = useChat({
    api: '/api/chat',
    id: documentId,
    sendAutomaticallyWhen: ({ messages }) => {
      if (messages.length === 0) return false;
      
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role !== 'assistant') return false;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hasToolCalls = lastMessage.parts?.some((part: any) => part.type.startsWith('tool-'));
      if (!hasToolCalls) return false;
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hasPending = lastMessage.parts?.some((part: any) => 
        part.type.startsWith('tool-') && 
        (part.state === 'input-streaming' || part.state === 'input-available' || !('output' in part) || !part.output)
      );
      
      return !hasPending;
    },
    onError: (err) => {
      alert('챗 서버와의 통신 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      console.error('Chat error:', err);
    },
    onFinish: async (message) => {
      if (!documentId) return;
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();

        // 직전 user 메시지 저장 (먼저 저장하여 순서 보장)
        const lastUserMsg = [...chatHelpers.messages].reverse().find(m => m.role === 'user');
        if (lastUserMsg) {
          const userText = lastUserMsg.parts
            ?.filter((p: any) => p.type === 'text')
            .map((p: any) => p.text)
            .join('') || '';
            
          if (userText) {
            // 이미 저장된 동일한 사용자 메시지가 최근에 있는지 확인 (중복 저장 방지)
            const { data: existingUserMsg } = await supabase
              .from('chat_messages')
              .select('id, created_at')
              .eq('document_id', documentId)
              .eq('role', 'user')
              .eq('content', userText)
              .order('created_at', { ascending: false })
              .limit(1);
              
            // 5초 이내에 동일한 메시지가 저장되었다면 중복으로 간주
            const isDuplicate = existingUserMsg && existingUserMsg.length > 0 && 
              (new Date().getTime() - new Date(existingUserMsg[0].created_at).getTime() < 5000);
              
            if (!isDuplicate) {
              await supabase.from('chat_messages').insert({
                document_id: documentId,
                role: 'user',
                content: userText,
              });
            }
          }
        }

        // assistant 메시지 저장
        const assistantMsg = (message as any).message || message;
        let textContent = '';
        
        if (assistantMsg.parts) {
          textContent = assistantMsg.parts
            .filter((p: any) => p.type === 'text')
            .map((p: any) => p.text)
            .join('');
        } else if (assistantMsg.content) {
          textContent = assistantMsg.content;
        }

        if (textContent) {
          await supabase.from('chat_messages').insert({
            document_id: documentId,
            role: 'assistant',
            content: textContent,
          });
        }
      } catch (err) {
        console.error('채팅 메시지 저장 실패:', err);
      }
    },
  })

  const {
    messages,
    status,
    addToolOutput,
    setMessages,
  } = chatHelpers

  // @ts-expect-error append is available in newer ai versions or fallback to sendMessage
  const append = (chatHelpers.append || chatHelpers.sendMessage) as any

  const isStreaming = status === 'submitted' || status === 'streaming'

  const pendingClarificationCall = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pendingPart = m.parts?.find((part: any) => 
        (part.type === 'tool-askClarification' || 
        (part.type === 'tool-invocation' && part.toolInvocation?.toolName === 'askClarification')) &&
        (part.state === 'call' || part.state === 'input-available' || part.toolInvocation?.state === 'call' || part.toolInvocation?.state === 'partial-call') &&
        (!('output' in part) || !part.output)
      );

      if (pendingPart) {
        return pendingPart.toolInvocation || pendingPart;
      }
    }
    return null;
  }, [messages]);

  const hasPendingTool = messages.some((m: UIMessage) => 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    m.parts?.some((part: any) => 
      (part.type === 'tool-invocation' && (part.state === 'call' || part.state === 'input-available')) ||
      (part.type === 'tool-call' && (!('output' in part) || !part.output))
    )
  )

  useImperativeHandle(ref, () => ({
    sendMessage: (msg: { text: string }) => {
      append(
        { role: 'user', content: msg.text }, 
        {
          body: {
            selectedHtml,
            selectedText,
            editorContext: truncatedContext,
          }
        }
      );
    }
  }));

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isStreaming) return

    if (hasPendingTool) {
      messages.forEach((m: UIMessage) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        m.parts?.forEach((part: any) => {
          if (part.type.startsWith('tool-') && (part.state === 'input-streaming' || part.state === 'input-available')) {
            addToolOutput({
              tool: part.type.replace('tool-', ''),
              toolCallId: part.toolCallId,
              output: '사용자가 도구 사용을 무시하고 새로운 채팅을 입력하여 실행이 취소되었습니다.'
            })
          }
        })
      })
    }

    append(
      { role: 'user', content: input }, 
      {
        body: {
          selectedHtml,
          selectedText,
          editorContext: truncatedContext,
        }
      }
    )
    setInput('')
  }

  // 채팅 히스토리 불러오기
  useEffect(() => {
    const fetchHistory = async () => {
      if (!documentId) {
        setIsHistoryLoaded(true);
        return;
      }
      
      // 새 문서이고 파일 업로드도 아니면 기존 채팅 기록 없음
      if (isNewDocument && !isUploaded) {
        setIsHistoryLoaded(true);
        return;
      }
      
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('document_id', documentId)
          .order('created_at', { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          const uiMessages: UIMessage[] = data.map(m => ({
            id: m.id,
            role: m.role as 'user' | 'assistant',
            content: m.content,
            parts: [{ type: 'text', text: m.content }]
          }));
          setMessages(uiMessages);
          hasInitializedAnalyizeRef.current = true;
        }
      } catch (err) {
        console.error('Failed to fetch chat history:', err);
        setShowHistoryError(true);
        setTimeout(() => setShowHistoryError(false), 3000);
      } finally {
        setIsHistoryLoaded(true);
      }
    };

    fetchHistory();
  }, [documentId, isNewDocument, isUploaded, setMessages]);

  useEffect(() => {
    if (!isHistoryLoaded || !isReady) return;
    if (messages.length > 0 || hasInitializedAnalyizeRef.current) return;

    hasInitializedAnalyizeRef.current = true

    if (initialPrompt) {
      // initialPrompt가 있으면 바로 해당 프롬프트로 전송
      setTimeout(() => {
        append({ role: 'user', content: initialPrompt }, { body: { selectedHtml, selectedText, editorContext: truncatedContext } });
      }, 500)
    } else if (isUploaded) {
      // 파일 업로드의 경우 숨김 메시지로 문서 자동 분석 실행
      console.log('[DEBUG-CHAT] HIDDEN_ANALYZE_PROMPT 전송 시도. 현재 editorContext 길이:', truncatedContext?.length || 0);
      setTimeout(() => {
        console.log('[DEBUG-CHAT] setTimeout 내부에서 전송 호출됨. 전달되는 context 길이:', truncatedContext?.length || 0);
        append({ role: 'user', content: HIDDEN_ANALYZE_PROMPT }, { body: { selectedHtml, selectedText, editorContext: truncatedContext } });
      }, 800)
    } else {
      // 기존 채팅 기록이 없을 때만 인사말을 출력합니다.
      // (만약 위에서 채팅 기록을 로드했다면 messages.length > 0이 되어 이 로직으로 진입하지 않음)
      if (!isNewDocument) {
        // 기존 문서 로드 시 (파일 업로드 아님) 일반 인사말만 출력
        setMessages([
          {
            id: 'initial-greeting',
            role: 'assistant',
            parts: [{ 
              type: 'text', 
              text: '안녕하세요! 문서를 수정하거나 궁금한 점이 있으시면 언제든 말씀해주세요. 👋'
            }],
          } as UIMessage
        ])
      } else {
        // 빈 문서로 시작하는 경우 초기 인삿말
        setMessages([
          {
            id: 'initial-greeting',
            role: 'assistant',
            parts: [{ 
              type: 'text', 
              text: '새로운 문서를 시작하시네요! 👋\n\n어떤 종류의 문서를 작성하실 계획인가요?\n(예: IT 서비스 사업계획서, 주간 운영 보고서, 제안서, 기획안 등)'
            }],
          } as UIMessage
        ])
      }
    }
  }, [isHistoryLoaded, isReady, messages.length, isNewDocument, isUploaded, setMessages, initialPrompt, append, selectedHtml, selectedText, truncatedContext])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 디버깅: 현재 messages 배열의 상태를 콘솔에 출력
  useEffect(() => {
    if (messages.length > 0) {
      console.log('[DEBUG-MESSAGES]', JSON.stringify(messages, null, 2));
    }
  }, [messages])

  return (
    <div 
      className="relative flex-shrink-0 flex flex-col h-full border-l bg-gray-50"
      style={{ width: `${width}px` }}
    >
      <div
        className={cn(
          "absolute left-0 top-0 bottom-0 w-1 cursor-col-resize z-10 transition-colors",
          isResizing ? "bg-blue-500" : "hover:bg-blue-300"
        )}
        onMouseDown={(e) => {
          e.preventDefault()
          setIsResizing(true)
        }}
      />
      
      <div className="p-4 border-b bg-white font-bold text-gray-700 relative">
        AI 문서 도우미
        {selectedHtml && (
          <div className="text-xs font-normal text-blue-600 mt-1 truncate">
            선택 영역 수정 중...
          </div>
        )}
        
        {/* 히스토리 로드 실패 배너 */}
        {showHistoryError && (
          <div className="absolute top-full left-0 right-0 bg-yellow-50 border-b border-yellow-100 p-2 flex items-center gap-2 text-[11px] text-yellow-800 z-10 animate-in slide-in-from-top duration-300">
            <AlertCircle size={14} className="text-yellow-600 shrink-0" />
            <span>대화 기록을 불러오지 못했습니다. 새 대화로 시작합니다.</span>
          </div>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages
                .map((m: UIMessage) => {
                  const textContent = m.parts 
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    ? m.parts.filter(p => p.type === 'text').map((p: any) => p.text).join('')
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    : (m as any).content || (m as any).text || '';

                  // 시스템 숨김 명령어 렌더링 필터링
                  if (m.role === 'user' && textContent.trim() === HIDDEN_ANALYZE_PROMPT) {
                    return null;
                  }

                  return (
                    <div key={m.id} className={cn("flex flex-col gap-2", m.role === 'user' ? "items-end" : "items-start")}>
                      
                      {textContent && (
                        <div className={cn(
                          "max-w-[85%] p-3 rounded-lg text-sm shadow-sm",
                          m.role === 'user' ? "bg-blue-600 text-white" : "bg-white text-gray-800 border"
                        )}>
                          <div className="flex items-center gap-2 mb-1 opacity-70">
                            {m.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                            <span className="font-bold">{m.role === 'user' ? '나' : '문서봇'}</span>
                          </div>
                          <div className={cn("text-sm leading-relaxed", m.role === 'user' ? "whitespace-pre-wrap" : "prose prose-sm max-w-none")}>
                            {m.role === 'user' ? (
                              textContent
                            ) : (
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {textContent}
                              </ReactMarkdown>
                            )}
                          </div>
                        </div>
                      )}

                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {m.parts?.map((part: any, index: number) => {
                        if (!part.type.startsWith('tool-')) return null;
                        
                        // AI SDK 구버전 및 최신 버전 호환 파싱
                        const toolInvocation = part.toolInvocation || part;
                        const toolName = toolInvocation.toolName || (part.type.startsWith('tool-') ? part.type.replace('tool-', '') : '');
                        const toolCallId = toolInvocation.toolCallId;
                        const args = toolInvocation.args || toolInvocation.input || part.args || part.input;

                        // ✨ 표 업데이트 도구 렌더링 연결
                        if (toolName === 'updateTable') {
                          if (!args) return null;
                          return (
                            <UpdateTableTool
                              key={`${toolCallId}-${index}`}
                              args={args}
                              toolCallId={toolCallId}
                              toolName={toolName}
                              addToolOutput={addToolOutput}
                            />
                          );
                        }

                        if (toolName === 'updateEditor') {
                          if (!args) return null;
                          return (
                            <UpdateEditorTool
                              key={`${toolCallId}-${index}`}
                              args={args}
                              toolCallId={toolCallId}
                              toolName={toolName}
                              addToolOutput={addToolOutput}
                            />
                          );
                        }

                        // askClarification은 이제 메시지 루프 내부가 아닌 하단 Quick Reply 영역에서 렌더링되므로 여기서 무시
                        if (toolName === 'askClarification') {
                          return null;
                        }
                        
                        return null;
                      })}
                    </div>
                  );
                })}

              {(status === 'submitted' || status === 'streaming') && messages.length > 0 && (
                <div className={cn(
                  "max-w-[85%] p-3 rounded-lg bg-white border self-start shadow-sm animate-in fade-in duration-300",
                  status === 'streaming' && "border-blue-100 bg-blue-50/30"
                )}>
                  <div className="flex items-center gap-3 text-gray-500">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce"></span>
                    </div>
                    <span className="text-xs font-medium text-blue-700">
                      {messages.length === 1 ? '문서의 구조와 내용을 정밀 분석하고 있습니다...' : 'AI가 답변을 작성 중입니다...'}
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

      {/* ✨ Quick Reply Wizard (askClarification 연동) */}
      {pendingClarificationCall && ((pendingClarificationCall as any).args || (pendingClarificationCall as any).input) && (
        <AskClarificationWizard
          args={(pendingClarificationCall as any).args || (pendingClarificationCall as any).input}
          toolCallId={(pendingClarificationCall as any).toolCallId || 'unknown'}
          append={append}
          addToolOutput={addToolOutput}
          editorContext={truncatedContext}
          selectedHtml={selectedHtml}
          selectedText={selectedText}
        />
      )}

      <form onSubmit={handleSubmit} className="p-4 bg-white border-t">
        <div className="relative">
          <input
            value={input}
            onChange={handleInputChange}
            placeholder={hasPendingTool ? "도구를 무시하고 다른 요청하기..." : (selectedText ? "선택 영역을 어떻게 수정할까요?" : "무엇을 도와드릴까요?")}
            className="w-full pl-3 pr-10 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            disabled={isStreaming}
          />
          <button
            type="submit"
            disabled={isStreaming || !input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-600 disabled:text-gray-300 transition-colors"
          >
            <Send size={20} />
          </button>
        </div>
      </form>
    </div>
  )
})

export default ChatPanel;
