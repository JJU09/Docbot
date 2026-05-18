// .env.local에 LITELLM_MODEL 변수를 추가하여 사용할 모델을 설정하세요. (기본값: gemini/gemini-3.0-flash-preview)
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { streamText, tool, createUIMessageStreamResponse } from 'ai'
import { z } from 'zod'

export const maxDuration = 30

const litellm = createOpenAICompatible({
  name: 'litellm',
  baseURL: process.env.LITELLM_BASE_URL ?? 'https://litellm.must.codes',
  apiKey: process.env.LITELLM_API_KEY ?? undefined,
})

/**
 * useChat(AI SDK v6)이 보내는 UIMessage를 CoreMessage 형식으로 안전하게 변환합니다.
 * UIMessage는 content 필드 없이 parts 배열만 가집니다.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeMessages(messages: any[]) {
  return messages
    .filter((m) => m?.role && (m?.content != null || Array.isArray(m?.parts)))
    .map((m) => {
      let text = '';

      if (typeof m.content === 'string' && m.content) {
        // 구버전 형식: content가 문자열
        text = m.content;
      } else if (Array.isArray(m.parts)) {
        // AI SDK v6 UIMessage 형식: parts 배열에서 text 파트만 추출
        text = m.parts
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((p: any) => p.type === 'text')
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((p: any) => p.text ?? '')
          .join('');
      } else if (Array.isArray(m.content)) {
        // content가 배열인 경우
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        text = m.content.map((p: any) => p?.text ?? '').join('');
      }

      return {
        role: m.role as 'user' | 'assistant' | 'system',
        content: text,
      };
    })
    .filter((m) => m.content.trim() !== ''); // 빈 메시지 제거
}

export async function POST(req: Request) {
  const { messages, editorContext, selectedText, selectedHtml } = await req.json()

  // 컨텍스트 전송 전략 최적화
  const lastUserMessage = messages[messages.length - 1]?.content || '';
  const isRequestingFullContext = /전체|다시 분석|문서 전체/.test(lastUserMessage);
  
  let effectiveContext = editorContext;
  let contextInstruction = '';

  if (selectedText) {
    effectiveContext = '(선택 영역 분석을 위해 생략됨)';
    contextInstruction = '사용자가 텍스트를 선택했습니다. 전체 문서보다는 "선택된 텍스트"의 수정에 집중하세요.';
  } else if (messages.length > 1 && !isRequestingFullContext) {
    effectiveContext = '(비용 절감을 위해 생략됨)';
    contextInstruction = `문서 전체 내용은 대화 초반에 이미 분석되었습니다.
사용자가 명시적으로 문서 전체 재분석을 요청할 때만 'NEED_FULL_CONTEXT'라고 응답하세요.`;
  }

  const isDocumentEmpty = !editorContext || editorContext.trim().length < 50;

  const workflowPrompt = isDocumentEmpty
    ? `[🚨 문서 초안 작성 워크플로우 - 반드시 다음 순서로 진행하세요]
1. 자율적 맥락 파악: 사용자의 첫 요청이 너무 모호한 경우에만 **askClarification** 도구를 호출하여 핵심 맥락(목적, 타겟 등)을 파악하세요. (한 번에 최대 3개의 질문을 배열로 전달 가능)
2. 스마트 초안 작성 (즉시 반영): 충분한 정보가 수집되면, 목차 제안 단계를 생략하고 즉시 **updateEditor** 도구를 호출하여 문서 전체 초안을 작성하세요.
  * 기존 에디터에 파편화된 메모가 있다면 이를 모두 흡수하여 완성된 글로 덮어쓰세요.`
    : `[🚨 기존 문서 수정 워크플로우]
- 현재 문서는 이미 내용이 작성되어 있습니다.
- 일반 텍스트 수정 시 **updateEditor** 도구를, 표 수정 시 **updateTable** 도구를 사용하여 기존 문서를 바로 수정하거나 내용을 추가하세요.
- 정보가 부족하여 수정이 어려운 경우에만 **askClarification**을 호출하여 질문하세요.`;

  const systemPrompt = `[역할]
당신은 하버드 비즈니스 리뷰 수준의 통찰력을 가진 전문 비즈니스 작가이자 컨설턴트입니다. 
당신은 단순히 문서를 "정리"하는 것이 아니라, 사용자의 최소한의 입력만으로도 완벽한 비즈니스 문서를 "창작"합니다.

[현재 문서 컨텍스트]
- 전체 문서 내용: ${effectiveContext ? effectiveContext : '아직 내용이 없습니다.'}
- 선택된 텍스트: ${selectedText ? selectedText : '없음'}
- 선택된 HTML(원본 SFDT): ${selectedHtml ? selectedHtml : '없음'}
${contextInstruction ? `\n[컨텍스트 운용 지침]\n${contextInstruction}\n` : ''}
- 만약 사용자가 명시적으로 선택한 텍스트(선택된 텍스트)가 없다면, 현재까지 파악된 문서 내용을 바탕으로 수정해야 할 위치를 스스로 찾아야 합니다.

${workflowPrompt}

[🚨 강력 준수 규칙]
- 정보 수집(질문)이 필요할 땐 일반 텍스트 응답을 하지 말고 반드시 **askClarification** 도구를 호출하세요!
- **[단일 도구 호출 원칙]** 절대로 한 번에 여러 개의 도구를 동시에(병렬로) 호출하지 마세요. 질문할 것이 여러 개 있더라도 한 번에 하나씩만 물어보고 사용자의 답변을 기다리세요.
- 텍스트 응답은 최소화하고 도구(Tool) 호출을 최우선으로 실행하세요. (단, 도구 실행 결과에서 사용자에게 보고/브리핑을 요청하는 시스템 지시가 포함되어 있다면, 예외적으로 상세하고 친절하게 텍스트로 응답해야 합니다.)
- ✨ **[자유 입력 허용 로직]** 사용자가 askClarification이 제시한 옵션을 무시하고 직접 텍스트로 대답(도구 취소됨)한 경우, 그 직접 입력한 답변 내용을 문맥으로 삼아 다음 단계(초안 작성 등)를 진행하세요. 절대 다시 같은 질문을 하지 마세요.
- ✨ **[도구 건너뛰기 방어]** 사용자가 도구의 사용을 명시적으로 건너뛰거나 거절한 경우: 해당 도구가 필수 도구라 할지라도 절대 재호출하지 마세요.
- 🚨 **[표(Table) 수정 특명]** 사용자가 표의 수정을 요청했을 때, 절대로 **updateEditor** 도구를 사용하지 마세요. 표를 수정할 때는 반드시 **updateTable** 도구를 호출하여 2차원 배열(JSON) 형태로 순수 데이터만 반환해야 합니다. targetKeyword에는 표 내부에 있는 식별 가능한 짧은 고유 단어(예: 특정 헤더명) 1~2개만 입력하세요.`;

  const modelMessages = normalizeMessages(messages);

  try {
    const result = streamText({
      model: litellm(process.env.LITELLM_MODEL ?? 'gemini/gemini-3.0-flash-preview'),
      system: systemPrompt,
      messages: modelMessages,

      tools: {
        askClarification: tool({
          description: '🚨 정보가 부족할 때 사용자에게 선택지를 제시',
          inputSchema: z.object({
            questions: z.array(z.object({
              question: z.string().describe('사용자에게 보여줄 질문'),
              options: z.array(z.object({
                label: z.string().describe('버튼 텍스트'),
                value: z.string().describe('선택 시 전달될 값'),
              })).describe('3~5개 옵션 추천'),
              allowMultiple: z.boolean().optional().default(false).describe('다중 선택 허용 여부'),
            })).min(1).max(3).describe('사용자에게 물어볼 질문 목록 (최대 3개)'),
          }),
        }),

        updateEditor: tool({
          description: `🚨 문서의 일반 텍스트(단락) 수정 요청 시 반드시 호출.
      (주의: 표 수정 시에는 절대 사용 금지)`,
          inputSchema: z.object({
            modifiedHtml: z.string().describe('적용할 최종 HTML'),
            targetText: z.string().optional().describe('수정할 원본 텍스트'),
            targetKeyword: z.string().optional().describe('핵심 단어 1~2개'),
            textBefore: z.string().optional().describe('앞 문장'),
            textAfter: z.string().optional().describe('뒤 문장'),
          }),
        }),

        updateTable: tool({
          description: '🚨 표(Table)의 데이터를 재작성할 때 반드시 호출.',
          inputSchema: z.object({
            targetKeyword: z.string().describe('표 내부의 고유 단어'),
            tableData: z.array(z.array(z.string())).describe('표에 들어갈 새로운 데이터'),
          }),
        }),
      },
      // @ts-expect-error maxSteps is supported in newer ai sdk
      maxSteps: 3,
      maxRetries: 0,
    })

    return createUIMessageStreamResponse({
      stream: result.toUIMessageStream(),
    })
  } catch (error) {
    console.error('Chat API Error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}