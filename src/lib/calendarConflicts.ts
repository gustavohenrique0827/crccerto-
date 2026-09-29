// Appointment Conflict Detection Engine

export interface ConflictingItem {
  id: string;
  patient: string;
  time: string;
  endTime: string;
  duration: number;
  procedure: string;
  professional: string;
  clinicName: string;
  source?: string;
}

export interface AppointmentConflictInfo {
  hasConflict: boolean;
  conflicts: ConflictingItem[];
  reason: string;
}

/**
 * Calculates start and end timestamps in minutes from start of day
 */
function getTimeRangeMinutes(timeStr: string, durationMinutes: number = 45) {
  const [h, m] = (timeStr || '09:00').split(':').map(Number);
  const start = (h || 0) * 60 + (m || 0);
  const end = start + (durationMinutes || 45);
  return { start, end };
}

function formatMinutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Scans a list of appointments and detects time collisions.
 * Returns a Map keyed by appointment.id with conflict information.
 */
export function detectAppointmentConflicts(appointments: any[]): Map<string, AppointmentConflictInfo> {
  const conflictMap = new Map<string, AppointmentConflictInfo>();

  // Filter out cancelled appointments
  const activeAppointments = appointments.filter(a => a.status !== 'cancelled');

  for (let i = 0; i < activeAppointments.length; i++) {
    const aptA = activeAppointments[i];
    const rangeA = getTimeRangeMinutes(aptA.time, aptA.duration);
    const conflictsForA: ConflictingItem[] = [];

    for (let j = 0; j < activeAppointments.length; j++) {
      if (i === j) continue;
      const aptB = activeAppointments[j];

      // Must be on the exact same date
      if (aptA.date !== aptB.date) continue;

      // Must be in the same clinic or share the same professional
      const sameClinic = aptA.clinicId && aptB.clinicId ? aptA.clinicId === aptB.clinicId : true;
      const sameProf = aptA.professional && aptB.professional && aptA.professional !== 'Todos' && aptB.professional !== 'Todos' 
        ? aptA.professional === aptB.professional 
        : false;

      // If neither same clinic nor same professional, no direct schedule collision
      if (!sameClinic && !sameProf) continue;

      const rangeB = getTimeRangeMinutes(aptB.time, aptB.duration);

      // Overlap condition: startA < endB && endA > startB
      const hasOverlap = rangeA.start < rangeB.end && rangeA.end > rangeB.start;

      if (hasOverlap) {
        conflictsForA.push({
          id: aptB.id,
          patient: aptB.patient || 'Paciente',
          time: aptB.time,
          endTime: formatMinutesToTime(rangeB.end),
          duration: aptB.duration || 45,
          procedure: aptB.procedure || 'Consulta',
          professional: aptB.professional || 'Profissional',
          clinicName: aptB.clinicName || 'Clínica',
          source: aptB.source || (aptB.id?.startsWith('gcal_') ? 'google_calendar' : 'crm'),
        });
      }
    }

    if (conflictsForA.length > 0) {
      const isFromGoogle = aptA.source === 'google_calendar' || aptA.id?.startsWith('gcal_');
      const otherNames = conflictsForA.map(c => `${c.patient} (${c.time})`).join(', ');
      const reason = isFromGoogle 
        ? `Agendamento sincronizado do Google Calendar colide com: ${otherNames}`
        : `Horário sobreposto com: ${otherNames}`;

      conflictMap.set(aptA.id, {
        hasConflict: true,
        conflicts: conflictsForA,
        reason,
      });
    }
  }

  return conflictMap;
}
