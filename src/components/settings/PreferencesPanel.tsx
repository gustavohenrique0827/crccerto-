import { useState, useEffect } from 'react';
import { Mail, Bell, Volume2, Save } from 'lucide-react';
import { useApp } from '@/src/context/AppContext';

interface NotificationSetting {
  id: string;
  label: string;
  email: boolean;
  push: boolean;
  sound: boolean;
}

export default function PreferencesPanel() {
  const { addToast } = useApp();
  const [settings, setSettings] = useState<NotificationSetting[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('crm_notification_preferences');
    if (saved) {
      setSettings(JSON.parse(saved));
    } else {
      setSettings([
        { id: 'new_lead', label: 'Novo Lead Recebido', email: true, push: true, sound: true },
        { id: 'task_due', label: 'Tarefa Próxima do Vencimento', email: true, push: true, sound: false },
        { id: 'sla_alert', label: 'Alerta de SLA Excedido', email: true, push: true, sound: true },
        { id: 'appointment_confirmed', label: 'Agendamento Confirmado', email: false, push: true, sound: false },
      ]);
    }
  }, []);

  const toggleSetting = (id: string, field: keyof Omit<NotificationSetting, 'id' | 'label'>) => {
    setSettings(prev => prev.map(s => s.id === id ? { ...s, [field]: !s[field] } : s));
  };

  const handleSave = () => {
    localStorage.setItem('crm_notification_preferences', JSON.stringify(settings));
    addToast('Preferências salvas com sucesso!', 'success');
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Preferências de Notificação</h3>
        <button 
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-blue-200 dark:shadow-none"
        >
          <Save size={14} />
          Salvar Alterações
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50">
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Evento</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">E-mail</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Push</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Som</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {settings.map((setting) => (
              <tr key={setting.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="px-6 py-4">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{setting.label}</span>
                </td>
                <td className="px-6 py-4 text-center">
                  <button 
                    onClick={() => toggleSetting(setting.id, 'email')}
                    className={`p-2 rounded-lg transition-colors ${setting.email ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30' : 'text-slate-300 dark:text-slate-700'}`}
                  >
                    <Mail size={18} />
                  </button>
                </td>
                <td className="px-6 py-4 text-center">
                  <button 
                    onClick={() => toggleSetting(setting.id, 'push')}
                    className={`p-2 rounded-lg transition-colors ${setting.push ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30' : 'text-slate-300 dark:text-slate-700'}`}
                  >
                    <Bell size={18} />
                  </button>
                </td>
                <td className="px-6 py-4 text-center">
                  <button 
                    onClick={() => toggleSetting(setting.id, 'sound')}
                    className={`p-2 rounded-lg transition-colors ${setting.sound ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30' : 'text-slate-300 dark:text-slate-700'}`}
                  >
                    <Volume2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
