import React, { useState, useEffect } from 'react';
import { View } from '../App';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { hasPermission, PERMISSIONS } from '../utils/roles';

interface SidebarProps {
  onNavigate: (view: View, id?: string) => void;
  activePage: View;
}

export default function Sidebar({ onNavigate, activePage }: SidebarProps) {
  const { profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // State for collapse interaction
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Check local storage for preference
    const saved = localStorage.getItem('sidebar_collapsed');
    return saved === 'true';
  });

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebar_collapsed', String(newState));
  };

  return (
    <aside className={`glass-panel border-r border-glass-border/30 border-y-0 border-l-0 flex flex-col justify-between transition-all duration-300 z-20 shrink-0 lg:m-4 lg:rounded-2xl lg:mb-4 lg:h-[calc(100vh-2rem)] h-full w-64 ${isCollapsed ? 'lg:w-20' : 'lg:w-64'} shadow-2xl shadow-black/5 relative overflow-hidden group/sidebar bg-surface-dark`}>

      <div className="relative z-10">
        <div className={`h-24 flex items-center px-6 lg:px-0 ${isCollapsed ? 'lg:justify-center' : 'lg:justify-start lg:px-8'} border-b border-glass-border/50 relative transition-all duration-300`}>
          <div className="size-10 bg-gray-200/50 dark:bg-black/40 rounded-xl flex items-center justify-center border border-primary/30 shadow-lg shadow-primary/10 relative overflow-hidden group shrink-0">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent"></div>
            <span className="material-symbols-outlined text-2xl text-primary relative z-10">account_balance</span>
          </div>

          <span className={`block ${isCollapsed ? 'lg:hidden' : 'lg:block'} ml-4 font-semibold text-xl text-slate-900 dark:text-white tracking-wide whitespace-nowrap overflow-hidden transition-all duration-300`}>
            CRM K&O
          </span>

          {/* Toggle Button */}
          <button
            onClick={toggleCollapse}
            className={`hidden lg:flex absolute ${isCollapsed ? 'bottom-1 right-1/2 translate-x-1/2 translate-y-full opacity-0 group-hover/sidebar:opacity-100 group-hover/sidebar:translate-y-1' : 'right-4 top-1/2 -translate-y-1/2'} items-center justify-center p-1.5 rounded-full hover:bg-white/10 text-gray-500 hover:text-white transition-all duration-300 z-20`}
            title={isCollapsed ? "Expandir" : "Recolher"}
          >
            <span className="material-symbols-outlined text-xl">{isCollapsed ? 'last_page' : 'first_page'}</span>
          </button>
        </div>

        <nav className="p-4 space-y-2">
          {[
            { id: 'pipeline', icon: 'view_kanban', label: 'Pipeline' },
            { id: 'financial', icon: 'attach_money', label: 'Financeiro', permission: PERMISSIONS.VIEW_FINANCIAL },
            { id: 'goals', icon: 'flag', label: 'Metas' },
            { id: 'calendar', icon: 'calendar_month', label: 'Calendário' },
            { id: 'projects', icon: 'rocket_launch', label: 'Projetos' },
            { id: 'settings', icon: 'settings', label: 'Configurações', permission: PERMISSIONS.MANAGE_SETTINGS },
          ].filter(item => !item.permission || hasPermission(profile?.role, item.permission))
            .map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id as View)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all group relative duration-500 overflow-hidden ${activePage === item.id
                  ? 'text-slate-900 dark:text-white font-bold shadow-[0_0_20px_rgba(212,175,55,0.1)] border border-primary/20'
                  : 'text-gray-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'} ${isCollapsed ? 'lg:justify-center' : ''}`}
              >
                {/* Active Background - Subtle Gold Gradient */}
                {activePage === item.id && (
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent opacity-100 transition-opacity duration-500"></div>
                )}

                {/* Active Indicator - Refined Glow */}
                {activePage === item.id && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-primary rounded-r-full shadow-[0_0_12px_2px_rgba(212,175,55,0.6)]"></div>
                )}

                <span className={`material-symbols-outlined text-[20px] relative z-10 transition-all duration-300 ${activePage === item.id ? 'text-primary scale-110 drop-shadow-[0_0_8px_rgba(212,175,55,0.5)]' : 'group-hover:text-primary group-hover:scale-110'}`}>{item.icon}</span>
                <span className={`block ${isCollapsed ? 'lg:hidden' : 'lg:block'} text-sm relative z-10 text-left tracking-wide whitespace-nowrap`}>{item.label}</span>
              </button>
            ))}
        </nav>
      </div>

      <div className="flex flex-col gap-2 p-4">


        <div className="pt-4 mt-2 border-t border-glass-border/50">
          <button
            className={`w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/50 dark:hover:bg-white/5 transition-colors cursor-pointer group text-left ${isCollapsed ? 'justify-center' : ''}`}
            onClick={() => onNavigate('profile')}
          >
            <div className="size-10 rounded-full bg-cover bg-center border-2 border-white dark:border-gray-700 shadow-sm shrink-0" style={{ backgroundImage: `url('${profile?.avatar_url || 'https://i.pravatar.cc/150'}')` }}></div>
            <div className={`hidden ${isCollapsed ? '' : 'lg:block'} overflow-hidden flex-1`}>
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{profile?.name || 'Usuário'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{profile?.role || 'Consultor'}</p>
            </div>
            <div
              onClick={(e) => { e.stopPropagation(); signOut(); }}
              className={`hidden ${isCollapsed ? '' : 'lg:flex'} items-center justify-center ml-auto text-text-secondary-light hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10`}
              title="Sair"
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
            </div>
          </button>
        </div>
      </div>
    </aside>
  );
}