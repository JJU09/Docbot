# Vercel AI SDK v6 — 에이전트 참조 문서

> **대상**: 코딩 에이전트 (Claude Code, Cursor 등)  
> **버전**: AI SDK v6 (최신, 2025년 12월 기준)  
> **공식 문서 전문**: https://ai-sdk.dev/llms.txt (LLM용 전체 문서)  
> **설치**: `npm install ai`  
> **v5 → v6 자동 마이그레이션**: `npx @ai-sdk/codemod v6`

---

## 목차

1. [패키지 구조 및 설치](#1-패키지-구조-및-설치)
2. [프로바이더 연결](#2-프로바이더-연결)
3. [핵심 함수 — generateText / streamText](#3-핵심-함수--generatetext--streamtext)
4. [구조화 출력 — generateObject / streamObject](#4-구조화-출력--generateobject--streamobject)
5. [Tool 정의 및 호출](#5-tool-정의-및-호출)
6. [Agent 추상화 (v6 신기능)](#6-agent-추상화-v6-신기능)
7. [Human-in-the-Loop Tool 승인](#7-human-in-the-loop-tool-승인)
8. [MCP (Model Context Protocol) 통합](#8-mcp-model-context-protocol-통합)
9. [Tool Calling + Structured Output 통합](#9-tool-calling--structured-output-통합)
10. [AI SDK UI — useChat / useCompletion](#10-ai-sdk-ui--usechat--usecompletion)
11. [메모리 및 대화 관리](#11-메모리-및-대화-관리)
12. [서브에이전트 패턴](#12-서브에이전트-패턴)
13. [임베딩 및 리랭킹](#13-임베딩-및-리랭킹)
14. [이미지 생성 및 편집](#14-이미지-생성-및-편집)
15. [텔레메트리 및 DevTools](#15-텔레메트리-및-devtools)
16. [에러 처리](#16-에러-처리)
17. [Next.js App Router 통합 패턴](#17-nextjs-app-router-통합-패턴)

---

## 1. 패키지 구조 및 설치

```bash
# 코어 패키지 (필수)
npm install ai

# 프로바이더 패키지 (필요한 것만)
npm install @ai-sdk/openai
npm install @ai-sdk/anthropic
npm install @ai-sdk/google

# UI 패키지 (프레임워크별)
npm install @ai-sdk/react    # React / Next.js
npm install @ai-sdk/svelte   # Svelte / SvelteKit
npm install @ai-sdk/vue      # Vue / Nuxt
```

**패키지 구분**

| 패키지 | 역할 |
|--------|------|
| `ai` | 코어 함수 (generateText, streamText, generateObject, ToolLoopAgent, …) |
| `@ai-sdk/openai` | OpenAI 프로바이더 |
| `@ai-sdk/anthropic` | Anthropic 프로바이더 |
| `@ai-sdk/google` | Google 프로바이더 |
| `@ai-sdk/react` | useChat, useCompletion 훅 |

---

## 2. 프로바이더 연결

### Vercel AI Gateway (권장 — 키 하나로 모든 모델)

```typescript
import { generateText } from 'ai';

// 프로바이더/모델 문자열만으로 전환 가능
const { text } = await generateText({
  model: 'anthropic/claude-sonnet-4-5',  // 또는 'openai/gpt-4o', 'google/gemini-2-flash'
  prompt: 'Hello!',
});
```

### 직접 프로바이더 연결

```typescript
import { generateText } from 'ai';
import { openai }     from '@ai-sdk/openai';
import { anthropic }  from '@ai-sdk/anthropic';
import { google }     from '@ai-sdk/google';

// OpenAI
await generateText({ model: openai('gpt-4o'), prompt: '...' });

// Anthropic
await generateText({ model: anthropic('claude-sonnet-4-5'), prompt: '...' });

// Google
await generateText({ model: google('gemini-2.0-flash'), prompt: '...' });
```

**환경 변수** (각 프로바이더 SDK가 자동으로 읽음)

```
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_GENERATIVE_AI_API_KEY=...
```

---

## 3. 핵심 함수 — generateText / streamText

### generateText — 비스트리밍

```typescript
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

const result = await generateText({
  model: openai('gpt-4o'),

  // 프롬프트 방식 3가지 중 하나 선택
  prompt: '단문 프롬프트',                // 방식 1: 단순 문자열
  // system: '시스템 프롬프트',           // 방식 2: system + prompt 조합
  // messages: [                          // 방식 3: 다중 메시지
  //   { role: 'user', content: '...' },
  // ],

  // 공통 설정
  maxTokens: 1000,
  temperature: 0.7,
  topP: 0.9,
  maxSteps: 10,       // 툴 루프 최대 스텝 수
});

// 결과 필드
result.text;           // 최종 텍스트
result.reasoning;      // 추론 텍스트 (지원 모델만)
result.toolCalls;      // 실행된 툴 호출 목록
result.toolResults;    // 툴 실행 결과 목록
result.steps;          // 각 스텝 상세 정보 배열
result.usage;          // { promptTokens, completionTokens, totalTokens }
result.finishReason;   // 'stop' | 'tool-calls' | 'length' | 'error'
```

### streamText — 스트리밍

```typescript
import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

const result = streamText({
  model: anthropic('claude-sonnet-4-5'),
  prompt: '긴 글을 써줘',
});

// 방법 1: 텍스트 스트림 소비
for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}

// 방법 2: 전체 결과 await
const { text, usage } = await result;

// 방법 3: Next.js Route Handler에서 Response 반환
return result.toDataStreamResponse();       // AI SDK UI 호환
return result.toTextStreamResponse();       // 순수 텍스트 스트림

// 이벤트 콜백
const result = streamText({
  model: anthropic('claude-sonnet-4-5'),
  prompt: '...',
  onChunk: ({ chunk }) => { /* 청크마다 */ },
  onStepFinish: ({ text, toolCalls }) => { /* 스텝 완료마다 */ },
  onFinish: ({ text, usage, finishReason }) => { /* 전체 완료 */ },
});
```

---

## 4. 구조화 출력 — generateObject / streamObject

```typescript
import { generateObject, streamObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

// --- generateObject ---
const { object } = await generateObject({
  model: openai('gpt-4o'),
  schema: z.object({
    name: z.string(),
    age:  z.number(),
    tags: z.array(z.string()),
  }),
  prompt: 'Alice는 30세 개발자야. 태그 3개 붙여줘.',
});

// object는 스키마 타입으로 추론됨
console.log(object.name); // string

// --- streamObject (부분 객체를 실시간으로) ---
const { partialObjectStream } = streamObject({
  model: openai('gpt-4o'),
  schema: z.object({ title: z.string(), body: z.string() }),
  prompt: '블로그 글 작성',
});

for await (const partial of partialObjectStream) {
  console.log(partial); // 점진적으로 채워지는 객체
}

// --- 배열 생성 ---
const { object: items } = await generateObject({
  model: openai('gpt-4o'),
  output: 'array',
  schema: z.object({ title: z.string(), url: z.string() }),
  prompt: '추천 기사 3개 나열',
});

// --- 분류/열거형 ---
const { object: category } = await generateObject({
  model: openai('gpt-4o'),
  output: 'enum',
  enum: ['positive', 'negative', 'neutral'],
  prompt: '이 리뷰의 감정: "정말 좋았어요!"',
});
```

---

## 5. Tool 정의 및 호출

### tool() 헬퍼로 정의

```typescript
import { tool, generateText } from 'ai';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';

// 툴 정의
const weatherTool = tool({
  description: '특정 도시의 날씨를 가져온다',
  // v6에서는 parameters 대신 inputSchema 사용 (parameters도 하위 호환)
  inputSchema: z.object({
    city: z.string().describe('날씨를 조회할 도시명'),
    unit: z.enum(['celsius', 'fahrenheit']).optional(),
  }),
  execute: async ({ city, unit = 'celsius' }) => {
    // 실제 API 호출 로직
    return { city, temperature: 22, unit, condition: 'sunny' };
  },
});

// 여러 툴과 함께 generateText
const { text, toolCalls, toolResults } = await generateText({
  model: openai('gpt-4o'),
  tools: { weather: weatherTool, /* 다른 툴 */ },
  maxSteps: 5,   // 툴 루프 반복 허용
  prompt: '서울 날씨 알려줘',
});
```

### 툴 선택 제어

```typescript
await generateText({
  model: openai('gpt-4o'),
  tools: { weather: weatherTool, search: searchTool },
  toolChoice: 'auto',              // 기본값: 모델이 판단
  // toolChoice: 'required',       // 반드시 툴 사용
  // toolChoice: 'none',           // 툴 사용 금지
  // toolChoice: { type: 'tool', toolName: 'weather' }, // 특정 툴 강제
  prompt: '...',
});
```

### 파라미터 없는 툴

```typescript
const getCurrentTimeTool = tool({
  description: '현재 시각을 반환한다',
  inputSchema: z.object({}),
  execute: async () => ({ time: new Date().toISOString() }),
});
```

---

## 6. Agent 추상화 (v6 신기능)

v6의 핵심 기능. 에이전트를 한 번 정의하고 앱 전체에서 재사용한다.

### ToolLoopAgent — 기본 구현체

```typescript
import { ToolLoopAgent } from 'ai';
import { weatherTool } from '@/tools/weather';
import { searchTool }  from '@/tools/search';

// 에이전트 정의 (한 번)
export const researchAgent = new ToolLoopAgent({
  model: 'anthropic/claude-sonnet-4-5',
  instructions: '당신은 정확한 정보를 제공하는 리서치 에이전트입니다.',
  tools: {
    weather: weatherTool,
    search:  searchTool,
  },
  // stopWhen: stepCountIs(20),  // 기본값 20 스텝
});

// 재사용 — 배경 작업
const result = await researchAgent.generate({
  prompt: '2025년 한국 AI 스타트업 현황 조사해줘',
});

// 재사용 — 스트리밍
const stream = researchAgent.stream({
  prompt: '최신 뉴스 요약해줘',
});
for await (const chunk of stream.textStream) {
  process.stdout.write(chunk);
}
```

### Call Options — 요청별 동적 설정 주입

```typescript
import { ToolLoopAgent } from 'ai';
import { z } from 'zod';

const supportAgent = new ToolLoopAgent({
  model: 'anthropic/claude-sonnet-4-5',

  // 요청 시 넘길 옵션 스키마 정의
  callOptionsSchema: z.object({
    userId:      z.string(),
    accountType: z.enum(['free', 'pro', 'enterprise']),
    locale:      z.string().optional(),
  }),

  // 옵션을 사용해 실제 호출 설정을 동적으로 조립
  prepareCall: ({ options, ...settings }) => ({
    ...settings,
    instructions: `
      당신은 고객 지원 에이전트입니다.
      - 사용자 ID: ${options.userId}
      - 계정 유형: ${options.accountType}
      - 언어: ${options.locale ?? 'ko'}
    `,
  }),
});

// 호출 시 options 전달
const result = await supportAgent.generate({
  prompt: '업그레이드 방법이 뭐야?',
  options: {
    userId:      'user_123',
    accountType: 'free',
    locale:      'ko',
  },
});
```

### Agent 인터페이스 직접 구현

```typescript
import { Agent } from 'ai';

// 커스텀 에이전트 (ToolLoopAgent 대신)
class MyCustomAgent implements Agent {
  async generate(input) { /* ... */ }
  async stream(input)   { /* ... */ }
}
```

### Agent + UI 통합 (Next.js 전체 예시)

```typescript
// agents/weather-agent.ts
import { ToolLoopAgent, InferAgentUIMessage } from 'ai';
import { weatherTool } from '@/tools/weather-tool';

export const weatherAgent = new ToolLoopAgent({
  model: 'anthropic/claude-sonnet-4-5',
  instructions: '날씨 전문 어시스턴트입니다.',
  tools: { weather: weatherTool },
});

// 에이전트에서 UI 메시지 타입 자동 추론
export type WeatherAgentUIMessage = InferAgentUIMessage<typeof weatherAgent>;
```

```typescript
// app/api/chat/route.ts
import { createAgentUIStreamResponse } from 'ai';
import { weatherAgent } from '@/agents/weather-agent';

export async function POST(request: Request) {
  const { messages } = await request.json();
  return createAgentUIStreamResponse({
    agent:      weatherAgent,
    uiMessages: messages,
  });
}
```

```tsx
// app/page.tsx
import { useChat } from '@ai-sdk/react';
import type { WeatherAgentUIMessage } from '@/agents/weather-agent';

export default function Chat() {
  const { messages, sendMessage } = useChat<WeatherAgentUIMessage>();

  return (
    <div>
      {messages.map((message) =>
        message.parts.map((part) => {
          switch (part.type) {
            case 'text':
              return <p key={part.id}>{part.text}</p>;
            case 'tool-invocation':
              if (part.toolName === 'weather') {
                return <WeatherCard key={part.id} result={part.result} />;
              }
          }
        })
      )}
      <input onKeyDown={(e) => e.key === 'Enter' && sendMessage(e.currentTarget.value)} />
    </div>
  );
}
```

---

## 7. Human-in-the-Loop Tool 승인

사람의 확인이 필요한 작업을 위한 승인 흐름.

```typescript
import { tool, ToolLoopAgent } from 'ai';
import { z } from 'zod';

const sendEmailTool = tool({
  description: '이메일을 발송한다',
  needsApproval: true,           // 실행 전 승인 요청
  inputSchema: z.object({
    to:      z.string().email(),
    subject: z.string(),
    body:    z.string(),
  }),
  execute: async ({ to, subject, body }) => {
    // 승인 후에만 실행됨
    await emailService.send({ to, subject, body });
    return { sent: true };
  },
});

const emailAgent = new ToolLoopAgent({
  model: 'anthropic/claude-sonnet-4-5',
  tools: { sendEmail: sendEmailTool },
});

// Next.js Route Handler에서의 스트리밍 승인 흐름
export async function POST(req: Request) {
  const { messages } = await req.json();
  return createAgentUIStreamResponse({
    agent:      emailAgent,
    uiMessages: messages,
    // 클라이언트에서 승인/거부 메시지를 받아 처리
  });
}
```

---

## 8. MCP (Model Context Protocol) 통합

외부 MCP 서버의 툴을 AI SDK와 연결한다.

### MCP 클라이언트 생성 및 툴 사용

```typescript
import { generateText, createMCPClient } from 'ai';
import { openai } from '@ai-sdk/openai';

// SSE 전송 방식
const mcpClient = await createMCPClient({
  transport: {
    type: 'sse',
    url:  'https://your-mcp-server.com/sse',
  },
});

// stdio 전송 방식 (로컬 프로세스)
const mcpClientStdio = await createMCPClient({
  transport: {
    type:    'stdio',
    command: 'node',
    args:    ['./mcp-server.js'],
  },
});

// 서버의 툴 목록 가져오기
const tools = await mcpClient.tools();

// 일반 툴처럼 사용
const { text } = await generateText({
  model: openai('gpt-4o'),
  tools,
  maxSteps: 5,
  prompt:   'TypeScript 파일 목록을 가져와서 크기를 알려줘',
});

// 사용 후 반드시 닫기
await mcpClient.close();
```

### 여러 MCP 서버 조합

```typescript
const filesystemClient = await createMCPClient({ transport: { type: 'sse', url: 'http://localhost:3001/sse' } });
const databaseClient   = await createMCPClient({ transport: { type: 'sse', url: 'http://localhost:3002/sse' } });

const [fsTools, dbTools] = await Promise.all([
  filesystemClient.tools(),
  databaseClient.tools(),
]);

const { text } = await generateText({
  model: openai('gpt-4o'),
  tools: { ...fsTools, ...dbTools },
  maxSteps: 10,
  prompt: '...',
});

await Promise.all([filesystemClient.close(), databaseClient.close()]);
```

---

## 9. Tool Calling + Structured Output 통합

v6에서 `generateObject`와 `generateText`가 통합되어 **툴 루프 후 구조화 출력**이 가능해졌다.

```typescript
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

// 웹 검색 툴 + 최종 구조화 출력
const { object: report } = await generateObject({
  model: anthropic('claude-sonnet-4-5'),
  tools: { search: searchTool, fetchPage: fetchPageTool },
  maxSteps: 10,  // 툴 루프 허용
  schema: z.object({
    summary:    z.string(),
    sources:    z.array(z.object({ url: z.string(), title: z.string() })),
    confidence: z.number().min(0).max(1),
  }),
  prompt: 'AI SDK v6의 주요 변경사항을 조사하고 정리해줘',
});

// report는 schema 타입으로 완전히 타입 안전
console.log(report.summary);
console.log(report.sources);

// Output 객체로 포맷 지정
import { Output } from 'ai';

const { object } = await generateObject({
  model: anthropic('claude-sonnet-4-5'),
  output: Output.object({
    title: z.string(),
    items: z.array(z.string()),
  }),
  prompt: '...',
});
```

---

## 10. AI SDK UI — useChat / useCompletion

### useChat (React)

```tsx
'use client';
import { useChat } from '@ai-sdk/react';

export default function ChatPage() {
  const {
    messages,      // UIMessage[]
    input,         // 현재 입력값
    handleInputChange,
    handleSubmit,
    isLoading,     // 응답 대기 중
    error,
    reload,        // 마지막 메시지 재생성
    stop,          // 스트리밍 중단
    append,        // 프로그래밍 방식으로 메시지 추가
    setMessages,
  } = useChat({
    api: '/api/chat',          // 기본값
    initialMessages: [],
    onFinish: (message) => { console.log('완료:', message); },
    onError:  (error)   => { console.error('오류:', error); },
  });

  return (
    <div>
      {messages.map((m) => (
        <div key={m.id}>
          <strong>{m.role}:</strong>
          {m.parts.map((part) =>
            part.type === 'text' ? <span key={part.id}>{part.text}</span> : null
          )}
        </div>
      ))}
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
        <button type="submit" disabled={isLoading}>전송</button>
      </form>
    </div>
  );
}
```

### useCompletion (단순 완성)

```tsx
import { useCompletion } from '@ai-sdk/react';

export default function CompletionPage() {
  const { completion, complete, isLoading } = useCompletion({ api: '/api/completion' });

  return (
    <div>
      <button onClick={() => complete('한국어로 시 한 편 써줘')}>생성</button>
      {isLoading ? <p>생성 중...</p> : <p>{completion}</p>}
    </div>
  );
}
```

### Route Handler (App Router)

```typescript
// app/api/chat/route.ts
import { streamText, convertToModelMessages } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai('gpt-4o'),
    system: '당신은 도움이 되는 어시스턴트입니다.',
    messages: convertToModelMessages(messages), // UIMessage → ModelMessage 변환
    maxSteps: 5,
  });

  return result.toDataStreamResponse();
}
```

---

## 11. 메모리 및 대화 관리

### 메시지 변환 함수

```typescript
import { convertToModelMessages, convertToUIMessages } from 'ai';

// UI 메시지 → 모델 메시지 (API 호출용)
const modelMessages = convertToModelMessages(uiMessages);

// 모델 메시지 → UI 메시지 (렌더링용)
const uiMessages = convertToUIMessages(modelMessages);
```

### 외부 저장소를 활용한 대화 이력 유지

```typescript
// app/api/chat/route.ts
import { streamText, convertToModelMessages } from 'ai';
import { openai } from '@ai-sdk/openai';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  const { messages, conversationId } = await req.json();

  // DB에서 이전 이력 로드
  const history = await db.messages.findMany({ where: { conversationId } });

  const result = streamText({
    model: openai('gpt-4o'),
    messages: convertToModelMessages([...history, ...messages]),
    onFinish: async ({ text }) => {
      // 완료 후 DB 저장
      await db.messages.create({ data: { conversationId, role: 'assistant', text } });
    },
  });

  return result.toDataStreamResponse();
}
```

---

## 12. 서브에이전트 패턴

에이전트가 다른 에이전트를 툴로 호출하는 계층 구조.

```typescript
import { tool, ToolLoopAgent } from 'ai';
import { z } from 'zod';

// 전문화된 서브에이전트들
const codeReviewAgent = new ToolLoopAgent({
  model: 'anthropic/claude-sonnet-4-5',
  instructions: '코드 품질, 보안, 성능을 검토한다.',
  tools: { /* 코드 분석 툴 */ },
});

const documentationAgent = new ToolLoopAgent({
  model: 'anthropic/claude-sonnet-4-5',
  instructions: '기술 문서를 작성한다.',
  tools: { /* 문서 관련 툴 */ },
});

// 서브에이전트를 툴로 래핑
const reviewCodeTool = tool({
  description: '코드를 리뷰하고 피드백을 반환한다',
  inputSchema: z.object({ code: z.string(), language: z.string() }),
  execute: async ({ code, language }) => {
    const result = await codeReviewAgent.generate({
      prompt: `${language} 코드를 리뷰해줘:\n\`\`\`${language}\n${code}\n\`\`\``,
    });
    return result.text;
  },
});

// 오케스트레이터 에이전트
const orchestratorAgent = new ToolLoopAgent({
  model: 'anthropic/claude-opus-4-5',  // 더 강력한 모델 사용
  instructions: '작업을 분석하고 적절한 서브에이전트에게 위임한다.',
  tools: {
    reviewCode:   reviewCodeTool,
    writeDocumentation: /* documentationAgent 래핑 툴 */,
  },
});
```

---

## 13. 임베딩 및 리랭킹

```typescript
import { embed, embedMany, rerank, cosineSimilarity } from 'ai';
import { openai } from '@ai-sdk/openai';
import { cohere } from '@ai-sdk/cohere';

// 단일 임베딩
const { embedding } = await embed({
  model: openai.embedding('text-embedding-3-small'),
  value: '임베딩할 텍스트',
});

// 다중 임베딩 (배치)
const { embeddings } = await embedMany({
  model: openai.embedding('text-embedding-3-small'),
  values: ['텍스트 1', '텍스트 2', '텍스트 3'],
});

// 코사인 유사도 계산
const similarity = cosineSimilarity(embedding, embeddings[0]);

// 리랭킹 (v6 신기능)
const { rerankedDocuments } = await rerank({
  model: cohere.rerank('rerank-english-v3.0'),
  query:  '검색 쿼리',
  documents: ['문서1', '문서2', '문서3'],
  topK: 2,
});
```

---

## 14. 이미지 생성 및 편집

```typescript
import { generateImage } from 'ai';
import { openai } from '@ai-sdk/openai';

// 이미지 생성
const { image } = await generateImage({
  model: openai.image('dall-e-3'),
  prompt: '서울 야경 수채화 스타일',
  size:    '1024x1024',
  quality: 'hd',
});

// base64로 저장
import { writeFile } from 'fs/promises';
await writeFile('output.png', Buffer.from(image.base64, 'base64'));

// 이미지 편집 (v6 신기능 — 지원 모델)
const { image: edited } = await generateImage({
  model: openai.image('gpt-image-1'),
  prompt:    '배경을 우주로 바꿔줘',
  image:     existingImageBase64,
  operation: 'edit',
});
```

---

## 15. 텔레메트리 및 DevTools

### OpenTelemetry 통합

```typescript
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

const { text } = await generateText({
  model:        openai('gpt-4o'),
  prompt:       '...',
  experimental_telemetry: {
    isEnabled:        true,
    functionId:       'my-function',                       // 트레이스 식별자
    metadata:         { userId: 'user_123', env: 'prod' }, // 커스텀 속성
    recordInputs:     true,   // 입력 기록 (기본값 true)
    recordOutputs:    true,   // 출력 기록 (기본값 true)
  },
});
```

### DevTools 설정 (개발 환경)

```typescript
// 개발 서버 시작 시 DevTools 활성화
// package.json scripts에 추가:
// "dev:ai": "ai-sdk devtools"

// 또는 코드에서:
import { enableDevTools } from '@ai-sdk/devtools';
enableDevTools(); // localhost:4000 에서 UI 제공
```

---

## 16. 에러 처리

```typescript
import { generateText, APICallError, NoSuchModelError } from 'ai';
import { openai } from '@ai-sdk/openai';

try {
  const { text } = await generateText({
    model:  openai('gpt-4o'),
    prompt: '...',
    maxRetries: 3,   // 자동 재시도 (기본값 2)
    abortSignal: AbortSignal.timeout(30_000), // 30초 타임아웃
  });
} catch (error) {
  if (APICallError.isInstance(error)) {
    console.error('API 오류:', error.statusCode, error.message);
    console.error('원인:', error.cause);
  } else if (NoSuchModelError.isInstance(error)) {
    console.error('모델 없음:', error.modelId);
  } else {
    throw error;
  }
}

// streamText 에러는 스트림 소비 중 발생
const result = streamText({ model: openai('gpt-4o'), prompt: '...' });
try {
  for await (const chunk of result.textStream) { /* ... */ }
} catch (error) {
  // 스트리밍 오류 처리
}
```

---

## 17. Next.js App Router 통합 패턴

### 파일 구조 권장안

```
app/
├── api/
│   └── chat/
│       └── route.ts        ← API Route Handler
├── page.tsx                ← 클라이언트 UI
agents/
├── support-agent.ts        ← ToolLoopAgent 정의
├── research-agent.ts
tools/
├── weather.ts              ← tool() 정의
├── search.ts
├── database.ts
```

### 완전한 Route Handler 예시

```typescript
// app/api/chat/route.ts
import { createAgentUIStreamResponse } from 'ai';
import { supportAgent } from '@/agents/support-agent';

export const runtime = 'nodejs'; // 또는 'edge'
export const maxDuration = 60;   // Vercel 함수 최대 실행 시간(초)

export async function POST(req: Request) {
  const { messages, userId, accountType } = await req.json();

  return createAgentUIStreamResponse({
    agent:      supportAgent,
    uiMessages: messages,
    options: { userId, accountType },
  });
}
```

### 스트리밍 재개 (Chatbot Resume Streams)

```typescript
// 긴 작업 중 연결이 끊겨도 재개 가능
import { streamText } from 'ai';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  // 스트림 상태를 외부 저장소에서 복원
  const savedStream = await db.streams.findUnique({ where: { id: params.id } });
  // ...재개 로직
}
```

---

## 빠른 참조 — API 시그니처 요약

| 함수/클래스 | 주요 파라미터 | 반환 |
|------------|-------------|------|
| `generateText()` | model, prompt/messages/system, tools, maxSteps | `{ text, toolResults, usage, steps }` |
| `streamText()` | model, prompt/messages/system, tools, maxSteps | `{ textStream, toDataStreamResponse() }` |
| `generateObject()` | model, schema, prompt, tools, maxSteps | `{ object }` |
| `streamObject()` | model, schema, prompt | `{ partialObjectStream }` |
| `embed()` | model, value | `{ embedding }` |
| `embedMany()` | model, values | `{ embeddings }` |
| `rerank()` | model, query, documents, topK | `{ rerankedDocuments }` |
| `generateImage()` | model, prompt, size, quality | `{ image }` |
| `new ToolLoopAgent()` | model, instructions, tools, callOptionsSchema | Agent 인스턴스 |
| `agent.generate()` | prompt/messages, options | `{ text, toolResults }` |
| `agent.stream()` | prompt/messages, options | 스트림 객체 |
| `createMCPClient()` | transport | MCP 클라이언트 |
| `useChat()` | api, initialMessages, onFinish | `{ messages, input, handleSubmit, … }` |

---

## 주요 변경사항 (v5 → v6)

| 항목 | v5 | v6 |
|------|----|----|
| 에이전트 클래스 | `Agent` | `ToolLoopAgent` (기본 구현) |
| 메시지 변환 | `convertToCoreMessages()` | `convertToModelMessages()` |
| 툴 파라미터 키 | `parameters` | `inputSchema` (parameters도 유효) |
| 구조화 출력 | `generateObject` 별도 | `generateObject`에서 툴 루프 지원 |
| MCP | 부분 지원 | 완전 통합 (`createMCPClient`) |
| 스키마 | zod 전용 | 표준 JSON Schema + zod 모두 지원 |

---

*공식 전체 문서: https://ai-sdk.dev/docs*  
*LLM용 전체 문서 (단일 파일): https://ai-sdk.dev/llms.txt*  
*GitHub: https://github.com/vercel/ai*