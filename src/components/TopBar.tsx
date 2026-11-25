import { LogOut, Menu } from 'lucide-react';
import type { User } from '../lib/types';

interface TopBarProps {
  sectionTitle: string;
  user: User;
  onOpenMobileMenu: () => void;
  onLogout: () => void;
}

export function TopBar({ sectionTitle, user, onOpenMobileMenu, onLogout }: TopBarProps) {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 text-sm min-w-0">
          <span className="hidden sm:inline text-slate-500 whitespace-nowrap">CareLedger</span>
          <span className="hidden sm:inline text-slate-300" aria-hidden="true">/</span>
          <h1 className="font-display font-semibold text-slate-900 truncate">{sectionTitle}</h1>
        </div>
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600 whitespace-nowrap">
          <span className="font-medium text-slate-900">{user.fullName}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono text-teal-800">{user.role}</span>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </header>
  );
}
