'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface AppSidebarProps {
  variant: 'wide' | 'narrow'
}

export default function AppSidebar({ variant }: AppSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const menuItems = [
    { name: '대시보드', icon: LayoutDashboard, href: '/dashboard' },
  ]

  const isWide = variant === 'wide'

  return (
    <aside 
      className={`${
        isWide ? 'w-56' : 'w-14'
      } border-r bg-gray-50 flex flex-col transition-all duration-300 flex-shrink-0 h-full`}
    >
      <div className={`p-4 border-b flex items-center ${isWide ? 'justify-start gap-2' : 'justify-center'}`}>
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0 text-sm">
          문
        </div>
        {isWide && <span className="font-bold text-gray-900 truncate">문서봇</span>}
      </div>

      <nav className="flex-1 p-2 space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center rounded-md transition-colors ${
                isWide ? 'px-3 py-2 gap-3' : 'p-2 justify-center'
              } ${
                isActive 
                  ? 'bg-blue-50 text-blue-700 font-medium' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title={!isWide ? item.name : undefined}
            >
              <item.icon size={20} className={isActive ? 'text-blue-600' : 'text-gray-500'} />
              {isWide && <span className="truncate">{item.name}</span>}
            </Link>
          )
        })}
      </nav>

      <div className="p-2 border-t">
        <button
          onClick={handleLogout}
          className={`flex items-center w-full rounded-md text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors ${
            isWide ? 'px-3 py-2 gap-3' : 'p-2 justify-center'
          }`}
          title={!isWide ? '로그아웃' : undefined}
        >
          <LogOut size={20} />
          {isWide && <span className="truncate">로그아웃</span>}
        </button>
      </div>
    </aside>
  )
}