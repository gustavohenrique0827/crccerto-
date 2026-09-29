import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Check, Clock, Calendar, CheckCheck, Users, MessageSquare } from 'lucide-react';
import { useApp } from '@/src/context/AppContext';

interface Notification {
  id: string;
  title: string;
  description: string;
  time: string;
  type: 'info' | 'success' | 'warning';
  read: boolean;
}

interface NotificationPopoverProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationPopover({ isOpen, onClose }: NotificationPopoverProps) {
  const { currentClinic } = useApp();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Generate notifications strictly from real system data in localStorage
  useEffect(() => {
    try {
      const realNotifs: Notification[] = [];
      const todayStr = new Date().toISOString().split('T')[0];

      // 1. Check real Leads (new leads)
      const leadsRaw = localStorage.getItem('crm_leads_data');
      if (leadsRaw) {
        const leads = JSON.parse(leadsRaw);
        if (Array.isArray(leads)) {
          const newLeads = leads.filter((l: any) => l.status === 'novo');
          if (newLeads.length > 0) {
            realNotifs.push({
              id: 'notif-leads-new',
              title: 'Novos Leads no Pipeline',
              description: `Existem ${newLeads.length} novo(s) lead(s) aguardando primeiro contato.`,
              time: 'Agora',
              type: 'warning',
              read: false
            });
          }
        }
      }

      // 2. Check real Appointments for today
      const apptsRaw = localStorage.getItem('crm_appointments_data');
      if (apptsRaw) {
        const appts = JSON.parse(apptsRaw);
        if (Array.isArray(appts)) {
          const todayAppts = appts.filter((a: any) => {
            const dateStr = a.date || a.appointment_date || '';
            return dateStr.startsWith(todayStr);
          });
          if (todayAppts.length > 0) {
            realNotifs.push({
              id: 'notif-appts-today',
              title: 'Consultas Agendadas Hoje',
              description: `Sua agenda possui ${todayAppts.length} consulta(s) marcada(s) para hoje.`,
              time: 'Hoje',
              type: 'info',
              read: false
            });
          }
        }
      }

      // 3. Check real Follow-ups due today
      const followUpsRaw = localStorage.getItem('crm_followups_data');
      if (followUpsRaw) {
        const followups = JSON.parse(followUpsRaw);
        if (Array.isArray(followups)) {
          const todayFollowups = followups.filter((f: any) => f.dueDate === todayStr && f.status !== 'completed');
          if (todayFollowups.length > 0) {
            realNotifs.push({
              id: 'notif-followups-today',
              title: 'Follow-ups Pendentes',
              description: `Você tem ${todayFollowups.length} follow-up(s) operacional(is) vencendo hoje.`,
              time: 'Hoje',
              type: 'warning',
              read: false
            });
          }
        }
      }

      // 4. Check sync history logs
      const syncLogsRaw = localStorage.getItem('crm_sync_history');
      if (syncLogsRaw) {
        const logs = JSON.parse(syncLogsRaw);
        if (Array.isArray(logs) && logs.length > 0) {
          const last = logs[0];
          realNotifs.push({
            id: `notif-sync-${last.id || 'last'}`,
            title: 'Sincronização de Agenda',
            description: `${last.action || 'Sincronização realizada'} - Status: ${last.status}`,
            time: 'Recente',
            type: last.status === 'success' ? 'success' : 'warning',
            read: true
          });
        }
      }

      setNotifications(realNotifs);
    } catch (e) {
      console.error(e);
    }
  }, [isOpen]);

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden"
          >
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Notificações em Tempo Real</h3>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
                    {unreadCount} nova(s)
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-slate-400">Em dia</span>
                )}
                {notifications.length > 0 && (
                  <button 
                    onClick={markAllAsRead} 
                    title="Marcar lidas"
                    className="p-1 text-slate-400 hover:text-blue-600 rounded-md cursor-pointer"
                  >
                    <CheckCheck size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-[360px] overflow-y-auto custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center mb-2">
                    <Check size={18} />
                  </div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Tudo em dia!</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Nenhum aviso ou alerta pendente no momento.</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div 
                    key={notification.id} 
                    className={`p-4 border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${!notification.read ? 'bg-blue-50/20 dark:bg-blue-900/5' : ''}`}
                  >
                    <div className="flex gap-3">
                      <div className={`p-2 h-fit rounded-lg ${
                        notification.type === 'info' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                        notification.type === 'success' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                      }`}>
                        {notification.type === 'info' ? <Calendar size={16} /> :
                         notification.type === 'success' ? <Check size={16} /> :
                         <Clock size={16} />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-0.5">
                          <h4 className="text-xs font-bold text-slate-800 dark:text-white">{notification.title}</h4>
                          <span className="text-[10px] text-slate-400 font-medium">{notification.time}</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          {notification.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {notifications.length > 0 && (
              <button 
                onClick={clearNotifications}
                className="w-full p-2.5 text-center text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-t border-slate-100 dark:border-slate-800 cursor-pointer"
              >
                Limpar Notificações
              </button>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
