'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/hoy',      label: 'Hoy',       emoji: '☀️' },
  { href: '/progreso', label: 'Progreso',   emoji: '📈' },
  { href: '/pipeline', label: 'Pipeline',   emoji: '🚀' },
  { href: '/agentes',  label: 'Agentes IA', emoji: '🤖' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 flex-shrink-0 bg-[#1E293B] flex flex-col border-r border-[#334155]">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-[#334155]">
        <div className="flex items-center gap-2">
          <span className="text-2xl">☀️</span>
          <div>
            <p className="text-sm font-bold text-white">Sunrise</p>
            <p className="text-xs text-[#64748B]">0 → 10.000€</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 flex flex-col gap-1">
        {NAV.map(item => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-[#6366F1] text-white'
                  : 'text-[#94A3B8] hover:bg-[#263348] hover:text-white'
              }`}
            >
              <span>{item.emoji}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-[#334155]">
        <p className="text-xs text-[#475569]">Massin · 2025</p>
      </div>
    </aside>
  );
}
