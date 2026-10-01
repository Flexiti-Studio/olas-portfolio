"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Sidebar() {
  const pathname = usePathname();

  const links = [
    { name: 'Dashboard', href: '/trading', icon: 'dashboard' },
    { name: 'Watchlist', href: '/watchlist', icon: 'star' },
    { name: 'Strategy', href: '/trading/strategy', icon: 'auto_graph' },
    { name: 'Journal', href: '/journal', icon: 'calendar_month' },
    { name: 'Trade History', href: '/mt5-history', icon: 'history' }
  ];

  return (
    <div className="w-64 border-r border-gray-800 bg-black min-h-screen p-4 flex flex-col">
      <div className="text-xl font-bold text-white mb-8 px-4 py-2">
        News Engine
      </div>
      <nav className="flex flex-col gap-2">
        {links.map(link => {
          const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link 
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                isActive 
                  ? 'bg-blue-600/10 text-blue-500' 
                  : 'text-gray-400 hover:bg-gray-900 hover:text-gray-200'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{link.icon}</span>
              {link.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
