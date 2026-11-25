import {
  Activity,
  BedDouble,
  Bot,
  CalendarClock,
  FileBarChart2,
  FileText,
  LayoutDashboard,
  Pill,
  Receipt,
  Stethoscope,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import type { Role } from '../lib/types';

export type NavSection =
  | 'dashboard'
  | 'patients'
  | 'doctors'
  | 'appointments'
  | 'admissions'
  | 'prescriptions'
  | 'billing'
  | 'reports'
  | 'ai-advisory'
  | 'users'
  | 'srs-blueprint';

export interface NavItem {
  id: NavSection;
  label: string;
  roles: Role[];
  icon: typeof LayoutDashboard;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', roles: ['Admin', 'Doctor', 'Receptionist', 'Patient'], icon: LayoutDashboard },
  { id: 'patients', label: 'Patients', roles: ['Admin', 'Doctor', 'Receptionist'], icon: Users },
  { id: 'doctors', label: 'Doctors & Depts', roles: ['Admin', 'Doctor', 'Receptionist', 'Patient'], icon: Stethoscope },
  { id: 'appointments', label: 'Appointments', roles: ['Admin', 'Doctor', 'Receptionist', 'Patient'], icon: CalendarClock },
  { id: 'admissions', label: 'Admissions & Beds', roles: ['Admin', 'Doctor', 'Receptionist', 'Patient'], icon: BedDouble },
  { id: 'prescriptions', label: 'Rx & Medicines', roles: ['Admin', 'Doctor', 'Receptionist', 'Patient'], icon: Pill },
  { id: 'billing', label: 'Billing & Payments', roles: ['Admin', 'Receptionist', 'Patient'], icon: Receipt },
  { id: 'reports', label: 'Reports', roles: ['Admin', 'Doctor', 'Receptionist'], icon: FileBarChart2 },
  { id: 'ai-advisory', label: 'AI Triage Advisory', roles: ['Admin', 'Doctor', 'Receptionist', 'Patient'], icon: Bot },
  { id: 'users', label: 'Users & Roles', roles: ['Admin'], icon: UserCog },
  { id: 'srs-blueprint', label: 'SRS & UML Diagrams', roles: ['Admin', 'Doctor', 'Receptionist', 'Patient'], icon: FileText },
];

interface SidebarProps {
  active: NavSection;
  role: Role;
  mobileOpen: boolean;
  onSelect: (section: NavSection) => void;
  onCloseMobile: () => void;
}

export function Sidebar({ active, role, mobileOpen, onSelect, onCloseMobile }: SidebarProps) {
  const allowedItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  const navContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 w-64">
      <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-2.5">
          <Activity className="w-5 h-5 text-teal-700 shrink-0" />
          <span className="font-display font-bold text-base tracking-tight text-slate-900 whitespace-nowrap">
            CareLedger HMS
          </span>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation menu"
          className="lg:hidden p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav aria-label="Primary HMS navigation" className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {allowedItems.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelect(item.id);
                onCloseMobile();
              }}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-teal-50 text-teal-800 border border-teal-200/70'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-teal-700' : 'text-slate-500'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-200 text-xs text-slate-500">
        <div className="font-medium text-slate-700">Academic HMS Prototype</div>
        <div className="mt-0.5">28 Core FR Scope · RBAC Enforced</div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block shrink-0">{navContent}</aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-50 flex">{navContent}</div>
        </div>
      )}
    </>
  );
}
