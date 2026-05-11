'use client';

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { 
  ArrowRight, 
  Sparkles, 
  MessageSquare, 
  List, 
  FileText, 
  ChevronRight, 
  Upload, 
  Eye, 
  History 
} from 'lucide-react'

export default function LandingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(true)
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        router.replace('/dashboard')
      } else {
        setIsLoading(false)
      }
    }
    checkUser()

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [supabase, router])

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 h-20 transition-all duration-200 bg-white/80 backdrop-blur-md flex items-center justify-center px-4 ${isScrolled ? 'border-b border-gray-200' : ''}`}>
        <div className="max-w-7xl w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-100">
              문
            </div>
            <span className="text-2xl font-bold text-gray-900 tracking-tight">문서봇</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
              베타 무료 체험
            </span>
            <Link 
              href="/login" 
              className="text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors"
            >
              로그인
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-sm font-semibold mb-8">
            <Sparkles size={16} />
            <span>🎉 베타 출시</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 mb-6 tracking-tight leading-[1.1]">
            AI가 함께 쓰는<br/>
            <span className="text-blue-600">실무 문서 작성 도구</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            기획서, 제안서, 보고서 — AI가 목차부터 본문까지 함께 완성합니다.<br className="hidden md:block" />
            기존 워드 파일 서식도 그대로 유지됩니다.
          </p>

          <div className="flex flex-col items-center gap-6">
            <Link 
              href="/login" 
              className="flex items-center justify-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-200"
            >
              구글로 시작하기
              <ArrowRight size={20} />
            </Link>
            
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-gray-500">
              <span className="flex items-center gap-1">✓ 구글 계정으로 바로 시작</span>
              <span className="flex items-center gap-1">✓ 신용카드 불필요</span>
              <span className="flex items-center gap-1">✓ 베타 기간 무료</span>
            </div>
          </div>
        </div>

        {/* Editor Mockup */}
        <div className="max-w-4xl mx-auto px-4">
          <div className="rounded-2xl border border-gray-200 shadow-2xl overflow-hidden bg-white">
            {/* Window Header */}
            <div className="h-10 bg-gray-50 border-b border-gray-100 flex items-center px-4 gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
              <div className="w-3 h-3 rounded-full bg-green-400"></div>
            </div>
            {/* Window Content */}
            <div className="flex h-[400px]">
              {/* Document Side (60%) */}
              <div className="w-3/5 p-8 border-r border-gray-50 space-y-4">
                <div className="h-6 bg-gray-100 rounded w-3/4 mb-8"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-50 rounded w-full"></div>
                  <div className="h-3 bg-gray-50 rounded w-full"></div>
                  <div className="h-3 bg-gray-50 rounded w-5/6"></div>
                </div>
                <div className="h-4 bg-gray-100 rounded w-1/2 mt-8"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-50 rounded w-full"></div>
                  <div className="h-3 bg-gray-50 rounded w-full"></div>
                </div>
              </div>
              {/* Chat Side (40%) */}
              <div className="w-2/5 bg-gray-50 p-6 flex flex-col gap-4">
                <div className="self-end bg-blue-600 text-white p-3 rounded-2xl rounded-tr-none text-xs max-w-[80%] shadow-sm">
                  사업계획서 작성해줘
                </div>
                <div className="self-start bg-white border border-gray-100 p-3 rounded-2xl rounded-tl-none text-xs max-w-[80%] shadow-sm text-gray-600 leading-relaxed">
                  목차를 먼저 구성할게요. 시장 분석과 기대 효과를 포함할까요?
                </div>
                <div className="self-end bg-blue-600 text-white p-3 rounded-2xl rounded-tr-none text-xs max-w-[80%] shadow-sm">
                  응, 꼼꼼하게 부탁해!
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Workflow Section */}
      <section className="py-24 bg-gray-50 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">3단계로 완성되는 전문 문서</h2>
          <p className="text-gray-500 mb-16">AI가 인터뷰부터 본문 작성까지 단계별로 안내합니다</p>
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-4">
            <div className="flex-1 flex flex-col items-center">
              <div className="w-16 h-16 bg-white rounded-2xl shadow-md flex items-center justify-center text-blue-600 mb-6 border border-gray-100">
                <MessageSquare size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2">1. AI 인터뷰</h3>
              <p className="text-gray-500 text-sm leading-relaxed max-w-[240px]">
                목적, 타겟, 핵심 메시지를 AI와 대화로 정리합니다
              </p>
            </div>
            
            <ChevronRight className="hidden md:block text-gray-300" size={32} />
            
            <div className="flex-1 flex flex-col items-center">
              <div className="w-16 h-16 bg-white rounded-2xl shadow-md flex items-center justify-center text-blue-600 mb-6 border border-gray-100">
                <List size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2">2. 목차 자동 생성</h3>
              <p className="text-gray-500 text-sm leading-relaxed max-w-[240px]">
                업종과 문서 유형에 맞는 목차를 제안하고 직접 편집합니다
              </p>
            </div>

            <ChevronRight className="hidden md:block text-gray-300" size={32} />

            <div className="flex-1 flex flex-col items-center">
              <div className="w-16 h-16 bg-white rounded-2xl shadow-md flex items-center justify-center text-blue-600 mb-6 border border-gray-100">
                <FileText size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2">3. 본문 완성</h3>
              <p className="text-gray-500 text-sm leading-relaxed max-w-[240px]">
                각 섹션을 AI가 전문가 수준으로 채워드립니다
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Cards Section */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">문서봇만의 차별점</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="border border-gray-100 rounded-2xl p-8 hover:border-blue-100 hover:shadow-xl hover:shadow-blue-50 transition-all group">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Upload size={24} />
              </div>
              <h3 className="text-xl font-bold mb-3">기존 워드 파일 그대로</h3>
              <p className="text-gray-500 leading-relaxed">
                회사 양식, 폰트, 표 서식을 유지한 채로 AI 편집이 가능합니다. 새로 디자인할 필요가 없습니다.
              </p>
            </div>

            <div className="border border-gray-100 rounded-2xl p-8 hover:border-blue-100 hover:shadow-xl hover:shadow-blue-50 transition-all group">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Eye size={24} />
              </div>
              <h3 className="text-xl font-bold mb-3">수정 전 미리보기</h3>
              <p className="text-gray-500 leading-relaxed">
                AI가 제안한 내용을 적용 전에 확인하고 수락 또는 거절합니다. 문서의 주도권은 항상 사용자에게 있습니다.
              </p>
            </div>

            <div className="border border-gray-100 rounded-2xl p-8 hover:border-blue-100 hover:shadow-xl hover:shadow-blue-50 transition-all group">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <History size={24} />
              </div>
              <h3 className="text-xl font-bold mb-3">버전 히스토리</h3>
              <p className="text-gray-500 leading-relaxed">
                수동 저장마다 스냅샷이 생성되어 언제든 이전 버전으로 복원합니다. 실수 걱정 없이 자유롭게 작성하세요.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-blue-600 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">지금 바로 시작해보세요</h2>
          <p className="text-blue-100 mb-10 text-lg">베타 기간 동안 모든 기능을 무료로 사용할 수 있습니다</p>
          <Link 
            href="/login" 
            className="inline-flex items-center justify-center bg-white text-blue-600 px-10 py-4 rounded-xl text-lg font-bold hover:bg-blue-50 transition-all shadow-xl shadow-blue-900/20"
          >
            구글로 무료 시작하기
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-gray-100 text-center text-gray-400 text-sm">
        <div className="max-w-7xl mx-auto px-4">
          <p>&copy; {new Date().getFullYear()} 문서봇. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}