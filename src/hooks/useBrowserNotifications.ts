import { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { getCalendarFieldMapping } from '../lib/googleCalendarMapping';
import { addSyncLog } from '../lib/syncHistory';

function playAlertChime() {
  try {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {
    console.warn('Could not play notification audio:', e);
  }
}

export function useBrowserNotifications() {
  const { addToast } = useApp();

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            console.log('Browser notifications permitted.');
          }
        });
      }
    }

    const checkReminders = () => {
      try {
        const now = Date.now();
        const todayStr = new Date().toISOString().split('T')[0];

        // 1. Check local lead tasks
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('lead_tasks_')) {
            const tasks = JSON.parse(localStorage.getItem(key) || '[]');
            tasks.forEach((task: any) => {
              if (task.status === 'pending' && task.date === todayStr && !task.notified) {
                if ('Notification' in window && Notification.permission === 'granted') {
                  new Notification('Lembrete de Tarefa CRM', {
                    body: `Tarefa pendente para hoje: ${task.title}`,
                    icon: '/favicon.ico'
                  });
                }
                addToast(`Tarefa pendente: ${task.title}`, 'info');
                task.notified = true;
                localStorage.setItem(key, JSON.stringify(tasks));
              }
            });
          }
        }

        // 2. Check Google Calendar synchronized appointment reminders
        const mapping = getCalendarFieldMapping();
        const crmReminders = mapping.crmReminders;

        if (crmReminders && crmReminders.enabled !== false) {
          const timingMs = (crmReminders.timingMinutesBefore || 30) * 60 * 1000;
          const appointmentsJson = localStorage.getItem('crm_appointments_data');
          if (appointmentsJson) {
            const appointments = JSON.parse(appointmentsJson);
            const notifiedIds: string[] = JSON.parse(localStorage.getItem('crm_notified_appointments') || '[]');

            appointments.forEach((apt: any) => {
              if (!apt.date || !apt.time || notifiedIds.includes(apt.id)) return;

              const aptDateTime = new Date(`${apt.date}T${apt.time}:00`);
              if (isNaN(aptDateTime.getTime())) return;

              const diffMs = aptDateTime.getTime() - now;

              // If appointment is within the reminder window (e.g. within 30 min and hasn't started yet or started < 5 min ago)
              if (diffMs <= timingMs && diffMs > -5 * 60 * 1000) {
                const minutesLeft = Math.max(1, Math.round(diffMs / (60 * 1000)));

                // Build message from template
                let messageBody = crmReminders.emailTemplate || 'Lembrete: Consulta com {professional} agendada para {date} às {time}.';
                messageBody = messageBody
                  .replace(/\{patient\}/g, apt.patient || 'Paciente')
                  .replace(/\{procedure\}/g, apt.procedure || 'Consulta')
                  .replace(/\{professional\}/g, apt.professional || 'Profissional')
                  .replace(/\{date\}/g, apt.date || '')
                  .replace(/\{time\}/g, apt.time || '')
                  .replace(/\{clinic\}/g, apt.clinicName || 'Clínica');

                const title = `Lembrete de Consulta (em ${minutesLeft} min)`;
                const channel = crmReminders.channel || 'push';

                // Play sound if configured
                if (crmReminders.alertSound) {
                  playAlertChime();
                }

                // Push browser notification
                if ((channel === 'push' || channel === 'both') && 'Notification' in window && Notification.permission === 'granted') {
                  new Notification(title, {
                    body: `${apt.patient} • ${apt.procedure} às ${apt.time}`,
                    icon: '/favicon.ico'
                  });
                }

                // In-App Toast
                addToast(`[Lembrete de Consulta - ${channel.toUpperCase()}] ${apt.patient} às ${apt.time} (${apt.procedure}) com ${apt.professional}`, 'info');

                // Log into sync history
                addSyncLog({
                  title: `Lembrete de Consulta Disparado (${channel.toUpperCase()})`,
                  action: 'event_reminder',
                  direction: 'google_to_crm',
                  status: 'success',
                  affectedItem: `${apt.patient} (${apt.date} ${apt.time})`,
                  details: `Canal: ${channel} | ${minutesLeft} min antes da consulta | Mensagem: "${messageBody}"`,
                  apiStatusCode: 200
                });

                notifiedIds.push(apt.id);
                localStorage.setItem('crm_notified_appointments', JSON.stringify(notifiedIds));
              }
            });
          }
        }
      } catch (e) {
        console.error('Error checking browser notifications:', e);
      }
    };

    // Run check immediately and then every 30 seconds
    checkReminders();
    const interval = setInterval(checkReminders, 30000);

    return () => clearInterval(interval);
  }, [addToast]);
}

