'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Database,
  Activity,
  AlertTriangle,
  ListOrdered,
  Navigation as NavigationIcon,
  CheckCircle2,
} from 'lucide-react';

const navItems = [
  { name: 'Overview', href: '/', icon: LayoutDashboard },
  { name: 'Data', href: '/data', icon: Database },
  { name: 'Thermal Analysis', href: '/thermal-analysis', icon: Activity },
  { name: 'Risk', href: '/risk', icon: AlertTriangle },
  { name: 'Priority', href: '/priority', icon: ListOrdered },
  { name: 'Route', href: '/route', icon: NavigationIcon },
  { name: 'Delivery', href: '/delivery', icon: CheckCircle2 },
];

export const Navbar: React.FC = () => {
  const pathname = usePathname();

  return (
    <nav className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto py-2 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all select-none ${
                  isActive
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-sky-700 hover:bg-slate-100'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
