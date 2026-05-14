export type TemplateCategory =
  | '전체'
  | '사업/기획'
  | '마케팅/홍보'
  | '계약/법무'
  | 'HR/채용'
  | '보고서'
  | '제안서'
  | '브랜드'
  | '제휴/협력'

export interface Template {
  id: string
  title: string
  description: string
  category: TemplateCategory
  icon: string
  color: string // 배경색 클래스 (예: 'bg-blue-50')
  tags: string[]
  badge?: '인기' | '신규' | '추천'
  previewContent: string // 미리보기용 HTML 또는 Markdown 문자열
  toc: string[] // 목차
}