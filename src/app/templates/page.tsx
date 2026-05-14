'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Sparkles, X, ChevronRight, LayoutTemplate, FileText } from 'lucide-react'
import AppSidebar from '@/components/layout/AppSidebar'
import Header from '@/components/layout/Header'
import { Template, TemplateCategory } from '@/types/template.types'
import { mockTemplates, templateCategories } from '@/lib/data/mockTemplates'
import { v4 as uuidv4 } from 'uuid'
import { creationIntentStore } from '@/lib/store/creationIntent'

export default function TemplatesPage() {
  const router = useRouter()
  const [isCreating, setIsCreating] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory>('전체')
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)

  // 추천 템플릿 (임의로 인기/추천 뱃지가 있는 것들을 상단에 노출)
  const recommendedTemplates = useMemo(() => {
    return mockTemplates.filter(t => t.badge === '인기' || t.badge === '추천').slice(0, 4)
  }, [])

  // 필터링된 템플릿
  const filteredTemplates = useMemo(() => {
    return mockTemplates.filter(template => {
      const matchesSearch = template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            template.description.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = selectedCategory === '전체' || template.category === selectedCategory
      
      return matchesSearch && matchesCategory
    })
  }, [searchQuery, selectedCategory])

  const handleCreateFromTemplate = (template: Template) => {
    if (isCreating) return
    setIsCreating(true)
    
    const id = uuidv4()
    creationIntentStore.setIntent(id, {
      type: 'template',
      title: `${template.title} - ${new Date().toLocaleDateString()}`,
      html: template.previewContent
    })
    
    router.push(`/editor/${id}`)
  }

  return (
    <div className="flex h-screen bg-gray-50/50">
      <AppSidebar variant="wide" />

      <main className="flex-1 flex flex-col min-w-0 relative">
        <Header />

        <div className="flex-1 overflow-auto flex">
          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0 p-6 max-w-7xl mx-auto w-full space-y-8">
            
            {/* 1. 헤더 타이틀 */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <LayoutTemplate className="text-blue-600" />
                템플릿 갤러리
              </h1>
              <p className="text-gray-500 mt-1">상황에 맞는 검증된 문서 양식을 활용하여 빠르게 문서를 작성해 보세요.</p>
            </div>

            {/* 2. 탐색 바 (검색창 + 카테고리 필터) */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-5">
              <div className="relative w-full max-w-2xl">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                  type="text"
                  placeholder="어떤 문서를 찾으시나요? (예: 사업계획서, 마케팅, 계약서 등)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors text-sm"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {templateCategories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      selectedCategory === category 
                        ? 'bg-gray-900 text-white shadow-sm' 
                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. 추천 템플릿 (검색어나 카테고리 필터가 없을 때만 표시) */}
            {searchQuery === '' && selectedCategory === '전체' && (
              <section>
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Sparkles className="text-amber-500" size={20} />
                  추천 템플릿
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {recommendedTemplates.map(template => (
                    <TemplateCard 
                      key={`rec-${template.id}`} 
                      template={template} 
                      onClick={() => setSelectedTemplate(template)}
                      onCreate={() => handleCreateFromTemplate(template)}
                      isCreating={isCreating}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* 4. 템플릿 목록 (테이블 형태) */}
            <section className="flex-1 pb-10">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                {searchQuery ? `"${searchQuery}" 검색 결과` : (selectedCategory === '전체' ? '모든 템플릿' : `${selectedCategory} 템플릿`)}
                <span className="text-gray-400 text-sm font-normal ml-2">{filteredTemplates.length}개</span>
              </h2>
              
              {filteredTemplates.length > 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50/80 border-b border-gray-200 text-sm text-gray-500">
                      <tr>
                        <th className="py-3 px-4 font-medium w-[20%]">템플릿명</th>
                        <th className="py-3 px-4 font-medium w-[45%]">설명</th>
                        <th className="py-3 px-4 font-medium w-[20%] hidden md:table-cell">태그</th>
                        <th className="py-3 px-4 font-medium w-[15%] text-right">기능</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredTemplates.map(template => (
                        <tr 
                          key={template.id} 
                          onClick={() => setSelectedTemplate(template)}
                          className="hover:bg-blue-50/30 cursor-pointer transition-colors group"
                        >
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0 ${template.color}`}>
                                {template.icon}
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900 text-sm group-hover:text-blue-700 transition-colors flex items-center gap-2">
                                  {template.title}
                                  {template.badge && (
                                    <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded whitespace-nowrap shrink-0 ${
                                      template.badge === '인기' ? 'bg-red-50 text-red-600' :
                                      template.badge === '신규' ? 'bg-blue-50 text-blue-600' :
                                      'bg-amber-50 text-amber-600'
                                    }`}>
                                      {template.badge}
                                    </span>
                                  )}
                                </h3>
                                <p className="text-xs text-gray-500 mt-0.5">{template.category}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <p className="text-sm text-gray-600 line-clamp-1">{template.description}</p>
                          </td>
                          <td className="py-4 px-4 hidden md:table-cell">
                            <div className="flex flex-wrap gap-1">
                              {template.tags.map(tag => (
                                <span key={tag} className="px-2 py-0.5 bg-gray-100 border border-gray-200 text-gray-600 text-xs rounded-md">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <button 
                              onClick={(e) => { e.stopPropagation(); setSelectedTemplate(template); }}
                              className="px-3 py-1.5 text-sm text-blue-600 font-medium hover:bg-blue-50 rounded-lg transition-colors border border-transparent group-hover:border-blue-100"
                            >
                              미리보기
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-20 text-center border-2 border-dashed border-gray-200 rounded-xl bg-white">
                  <FileText className="mx-auto text-gray-300 mb-3" size={48} />
                  <p className="text-gray-500">조건에 맞는 템플릿을 찾을 수 없습니다.</p>
                  <button 
                    onClick={() => { setSearchQuery(''); setSelectedCategory('전체') }}
                    className="mt-4 text-blue-600 font-medium hover:underline"
                  >
                    필터 초기화
                  </button>
                </div>
              )}
            </section>
          </div>
        </div>

        {/* 5. 템플릿 미리보기 패널 (우측 슬라이드) */}
        <div 
          className={`absolute inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl border-l border-gray-200 transform transition-transform duration-300 ease-in-out flex flex-col z-40 ${
            selectedTemplate ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {selectedTemplate && (
            <>
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${selectedTemplate.color}`}>
                    {selectedTemplate.icon}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      {selectedTemplate.title}
                      {selectedTemplate.badge && (
                        <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                          selectedTemplate.badge === '인기' ? 'bg-red-50 text-red-600' :
                          selectedTemplate.badge === '신규' ? 'bg-blue-50 text-blue-600' :
                          'bg-amber-50 text-amber-600'
                        }`}>
                          {selectedTemplate.badge}
                        </span>
                      )}
                    </h2>
                    <span className="text-sm text-gray-500">{selectedTemplate.category}</span>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedTemplate(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-2">템플릿 설명</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{selectedTemplate.description}</p>
                </div>
                
                <div className="flex flex-wrap gap-1 mb-4">
                  {selectedTemplate.tags.map(tag => (
                    <span key={`panel-tag-${tag}`} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">
                      {tag}
                    </span>
                  ))}
                </div>

                {selectedTemplate.toc && selectedTemplate.toc.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 mb-2">문서 구조</h3>
                    <ul className="space-y-2 bg-gray-50 p-4 rounded-xl border border-gray-100">
                      {selectedTemplate.toc.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                          <ChevronRight size={16} className="text-gray-400 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-2">문서 초안 미리보기</h3>
                  <div className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm prose prose-sm max-w-none text-gray-700 h-[300px] overflow-y-auto" dangerouslySetInnerHTML={{ __html: selectedTemplate.previewContent }} />
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 bg-gray-50">
                <button 
                  onClick={() => handleCreateFromTemplate(selectedTemplate)}
                  disabled={isCreating}
                  className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 hover:shadow-md"
                >
                  <Sparkles size={18} />
                  이 템플릿으로 AI 작성하기
                </button>
              </div>
            </>
          )}
        </div>
        
        {/* 패널 열렸을 때 배경 딤 처리 (모바일용) */}
        {selectedTemplate && (
          <div 
            className="md:hidden absolute inset-0 bg-black/20 z-30" 
            onClick={() => setSelectedTemplate(null)}
          />
        )}
      </main>
    </div>
  )
}

function TemplateCard({ 
  template, 
  onClick, 
  onCreate,
  isCreating 
}: { 
  template: Template, 
  onClick: () => void,
  onCreate: () => void,
  isCreating: boolean
}) {
  return (
    <div 
      className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-blue-300 hover:shadow-lg transition-all duration-200 group flex flex-col h-full cursor-pointer"
      onClick={onClick}
    >
      <div className="p-5 flex-1">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm ${template.color}`}>
            {template.icon}
          </div>
          {template.badge && (
            <span className={`px-2 py-1 text-xs font-bold rounded-full ${
              template.badge === '인기' ? 'bg-red-50 text-red-600' :
              template.badge === '신규' ? 'bg-blue-50 text-blue-600' :
              'bg-amber-50 text-amber-600'
            }`}>
              {template.badge}
            </span>
          )}
        </div>
        <h3 className="font-bold text-gray-900 mb-1 line-clamp-1 group-hover:text-blue-700 transition-colors">{template.title}</h3>
        <p className="text-sm text-gray-500 line-clamp-2 mb-4 h-10">{template.description}</p>
        
        <div className="flex flex-wrap gap-1">
          {template.tags.map(tag => (
            <span key={tag} className="px-2 py-0.5 bg-gray-50 border border-gray-100 text-gray-600 text-[11px] font-medium rounded-md">
              {tag}
            </span>
          ))}
        </div>
      </div>
      
      <div className="border-t border-gray-100 p-3 bg-gray-50/80">
        <button 
          onClick={(e) => { e.stopPropagation(); onClick(); }}
          className="w-full bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-sm font-medium py-2 rounded-lg transition-colors flex items-center justify-center"
        >
          미리보기
        </button>
      </div>
    </div>
  )
}