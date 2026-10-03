import React, { useState, useRef, useEffect } from 'react';
import { 
  Sun, 
  Moon, 
  Bell, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  User, 
  LogOut, 
  X, 
  CheckCheck,
  Menu
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useApp } from '@/src/context/AppContext';

interface TopbarProps {
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

interface NotificationItem {
  id: string;
  title: string;
  time: string;
  isUnread: boolean;
  type: 'alert' | 'info' | 'system';
  desc: string;
}

export function Topbar({
  isSidebarCollapsed,
  setIsSidebarCollapsed,
  isMobileOpen,
  setIsMobileOpen
}: TopbarProps) {
  const { 
    theme, 
    toggleTheme, 
    user, 
    currentClinic, 
    isAllClinicsView, 
    confirmLogout,
    setActiveTab
  } = useApp();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [activeNotifTab, setActiveNotifTab] = useState<'all' | 'unread' | 'alerts'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [notifications, setNotifications] = useState<NotificationItem[]>([
    { id: '1', title: 'Novo lead qualificado', time: 'Há 5 min', isUnread: true, type: 'alert', desc: 'Lead de implante solicitou agendamento direto.' },
    { id: '2', title: 'SLA de atendimento excedido', time: 'Há 18 min', isUnread: true, type: 'alert', desc: 'Atendimento aguardando resposta há mais de 15 min.' },
    { id: '3', title: 'Sincronização de API concluída', time: 'Há 1 hora', isUnread: false, type: 'info', desc: 'Integração Clinicorp processou 42 registros.' }
  ]);

  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => n.isUnread).length;

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isUnread: false })));
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isUnread: false } : n));
  };

  const getUserInitials = () => {
    if (!user || !user.name) return 'US';
    const parts = user.name.split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return user.name.substring(0, 2).toUpperCase();
  };

  const filteredNotifications = notifications.filter(n => {
    if (activeNotifTab === 'unread') return n.isUnread;
    if (activeNotifTab === 'alerts') return n.type === 'alert';
    return true;
  });

  return (
    <header className="h-16 border-b border-[var(--color-border-default)] bg-[var(--color-surface)]/80 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between z-40 shrink-0">
      
      {/* Left Block */}
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger */}
        <button
          type="button"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-2 rounded-[var(--radius-control)] bg-[var(--color-surface-sunken)] hover:bg-[var(--color-border-default)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors lg:hidden cursor-pointer"
        >
          <Menu size={18} />
        </button>

        {/* Desktop Sidebar Toggle */}
        <button
          type="button"
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="hidden lg:flex p-2 rounded-[var(--radius-control)] bg-[var(--color-surface-sunken)] hover:bg-[var(--color-border-default)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
          title={isSidebarCollapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
        >
          {isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Theme Switcher (Sun amber / Moon indigo) */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-[var(--radius-control)] bg-[var(--color-surface-sunken)] hover:bg-[var(--color-border-default)] transition-colors cursor-pointer"
          title={theme === 'dark' ? "Mudar para tema claro" : "Mudar para tema escuro"}
        >
          {theme === 'dark' ? (
            <Sun size={18} className="text-amber-400 fill-amber-400/20" />
          ) : (
            <Moon size={18} className="text-indigo-600 fill-indigo-600/20" />
          )}
        </button>

        {/* Notifications Bell */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="p-2 rounded-[var(--radius-control)] bg-[var(--color-surface-sunken)] hover:bg-[var(--color-border-default)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer relative"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--color-danger)] text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-[var(--color-surface)]">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Floating Popover (440px) */}
          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-[440px] bg-[var(--color-surface-elevated)] border border-[var(--color-border-default)] rounded-[var(--radius-panel)] shadow-[var(--shadow-panel)] overflow-hidden z-50 animate-fade-in">
              {/* Header */}
              <div className="p-4 bg-[var(--color-surface-sunken)] border-b border-[var(--color-border-default)] flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-[var(--color-text-primary)]">
                    Central de Notificações
                  </h4>
                  <p className="text-[10px] text-[var(--color-text-muted)]">
                    Alertas operacionais e eventos do sistema
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllAsRead}
                      className="text-[10px] font-bold text-[var(--color-primary-blue)] hover:underline flex items-center gap-1 cursor-pointer bg-[var(--color-primary-blue)]/10 px-2 py-1 rounded border border-[var(--color-primary-blue)]/20"
                      title="Marcar todas como lidas"
                    >
                      <CheckCheck size={12} />
                      <span>Marcar como lidas</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsNotifOpen(false)}
                    className="p-1 rounded text-[var(--color-text-faint)] hover:text-[var(--color-text-primary)] cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] text-[10px] font-bold uppercase">
                <button
                  type="button"
                  onClick={() => setActiveNotifTab('all')}
                  className={cn(
                    "flex-1 py-2 text-center transition-colors border-b-2 cursor-pointer",
                    activeNotifTab === 'all'
                      ? "border-[var(--color-primary-blue)] text-[var(--color-primary-blue)] font-black"
                      : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                  )}
                >
                  Todas ({notifications.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveNotifTab('unread')}
                  className={cn(
                    "flex-1 py-2 text-center transition-colors border-b-2 cursor-pointer",
                    activeNotifTab === 'unread'
                      ? "border-[var(--color-primary-blue)] text-[var(--color-primary-blue)] font-black"
                      : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                  )}
                >
                  Não lidas ({unreadCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveNotifTab('alerts')}
                  className={cn(
                    "flex-1 py-2 text-center transition-colors border-b-2 cursor-pointer",
                    activeNotifTab === 'alerts'
                      ? "border-[var(--color-primary-blue)] text-[var(--color-primary-blue)] font-black"
                      : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                  )}
                >
                  Alertas ({notifications.filter(n => n.type === 'alert').length})
                </button>
              </div>

              {/* List */}
              <div className="divide-y divide-[var(--color-border-subtle)] max-h-72 overflow-y-auto custom-scrollbar">
                {filteredNotifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[var(--color-text-muted)]">
                    Nenhuma notificação encontrada
                  </div>
                ) : (
                  filteredNotifications.map((n) => (
                    <div 
                      key={n.id} 
                      onClick={() => markAsRead(n.id)}
                      className={cn(
                        "p-3 transition-colors flex items-start gap-3 cursor-pointer",
                        n.isUnread ? "bg-[var(--color-primary-blue)]/5 hover:bg-[var(--color-primary-blue)]/10" : "hover:bg-[var(--color-surface-sunken)]/50"
                      )}
                    >
                      {n.isUnread ? (
                        <div className="w-2 h-2 rounded-full bg-[var(--color-primary-blue)] mt-1.5 shrink-0" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-transparent mt-1.5 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold text-[var(--color-text-primary)] truncate">{n.title}</p>
                          <span className="text-[10px] text-[var(--color-text-faint)] shrink-0">{n.time}</span>
                        </div>
                        <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5 leading-snug">{n.desc}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Block separated by border-l */}
        <div className="pl-3 border-l border-[var(--color-border-default)] flex items-center gap-2.5 relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2.5 hover:opacity-90 transition-opacity cursor-pointer text-left"
          >
            {/* Avatar 36px rounded-xl with blue gradient & initials */}
            <div className="w-9 h-9 rounded-[var(--radius-control)] bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm">
              {getUserInitials()}
            </div>

            <div className="hidden md:block min-w-0">
              <p className="text-xs font-bold text-[var(--color-text-primary)] truncate max-w-[140px]">
                {user?.name || 'Operador'}
              </p>
            </div>
          </button>

          {/* User Dropdown Menu */}
          {isUserMenuOpen && (
            <div className="absolute right-0 top-12 w-56 bg-[var(--color-surface-elevated)] border border-[var(--color-border-default)] rounded-[var(--radius-panel)] shadow-[var(--shadow-panel)] p-1.5 space-y-1 z-50 animate-fade-in">
              <div className="px-3 py-2 border-b border-[var(--color-border-default)]">
                <p className="text-xs font-bold text-[var(--color-text-primary)]">{user?.name}</p>
                <p className="text-[10px] text-[var(--color-text-faint)] truncate">{user?.email}</p>
                <span className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--color-primary-blue)]/10 text-[var(--color-primary-blue)]">
                  {user?.role.replace('_', ' ')}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('configuracoes');
                  setIsUserMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-sunken)] rounded-[var(--radius-control)] transition-colors cursor-pointer"
              >
                <User size={14} />
                <span>Configurações da Conta</span>
              </button>

              <div className="pt-1 border-t border-[var(--color-border-default)]">
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    confirmLogout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 rounded-[var(--radius-control)] transition-colors cursor-pointer"
                >
                  <LogOut size={14} />
                  <span>Sair do Sistema</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
