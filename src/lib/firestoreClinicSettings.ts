import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './googleAuth';
import { 
  GoogleSyncSettings, 
  getGoogleSyncSettings, 
  saveGoogleSyncSettings, 
  DEFAULT_GOOGLE_SYNC_SETTINGS 
} from './googleSyncSettings';

export interface FirestoreSaveResult {
  success: boolean;
  timestamp: string;
  error?: string;
}

/**
 * Saves the clinic's Google Calendar synchronization interval and preferences to Firestore.
 * Updates both the main clinic document and the dedicated google_sync settings sub-document.
 */
export async function saveClinicSyncIntervalToFirestore(
  clinicId: string,
  clinicName: string,
  intervalMinutes: number,
  autoSyncEnabled: boolean = true,
  updatedBy?: string
): Promise<FirestoreSaveResult> {
  const timestamp = new Date().toISOString();
  
  // 1. Update local storage and in-memory state first for instant responsiveness
  const currentSettings = getGoogleSyncSettings(clinicId);
  const updatedSettings: GoogleSyncSettings = {
    ...currentSettings,
    clinicId,
    clinicName,
    syncIntervalMinutes: intervalMinutes,
    autoSyncEnabled: autoSyncEnabled,
  };
  saveGoogleSyncSettings(updatedSettings);

  // 2. Persist to Firestore
  try {
    const effectiveClinicId = clinicId || '1';
    
    // Payload for dedicated subcollection
    const settingsPayload = {
      clinicId: effectiveClinicId,
      clinicName: clinicName || 'Clínica Principal',
      syncIntervalMinutes: intervalMinutes,
      googleCalendarSyncIntervalMinutes: intervalMinutes,
      autoSyncEnabled,
      syncDirection: updatedSettings.syncDirection,
      targetCalendarId: updatedSettings.targetCalendarId,
      conflictResolution: updatedSettings.conflictResolution,
      updatedAt: timestamp,
      updatedBy: updatedBy || 'Administrador',
      source: 'IntegrationsWorkspace_Selector'
    };

    // Write to /clinics/{clinicId}/settings/google_sync
    const subDocRef = doc(db, 'clinics', effectiveClinicId, 'settings', 'google_sync');
    await setDoc(subDocRef, settingsPayload, { merge: true });

    // Also update /clinics/{clinicId} root doc with integration preferences
    const clinicDocRef = doc(db, 'clinics', effectiveClinicId);
    await setDoc(clinicDocRef, {
      id: effectiveClinicId,
      name: clinicName || 'Clínica Principal',
      googleCalendarSyncIntervalMinutes: intervalMinutes,
      syncIntervalMinutes: intervalMinutes,
      autoSyncEnabled,
      integrationStatus: 'connected',
      updatedAt: timestamp,
      updatedBy: updatedBy || 'Administrador'
    }, { merge: true });

    // Store last Firestore sync success in local storage
    localStorage.setItem(`crm_gcal_firestore_sync_${effectiveClinicId}`, JSON.stringify({
      savedAt: timestamp,
      intervalMinutes,
      autoSyncEnabled
    }));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('crm_firestore_sync_status_changed', {
        detail: { clinicId: effectiveClinicId, savedAt: timestamp, success: true }
      }));
    }

    return {
      success: true,
      timestamp
    };
  } catch (error: any) {
    console.error('Erro ao salvar preferência de sincronização no Firestore:', error);
    
    // Store pending status if offline
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('crm_firestore_sync_status_changed', {
        detail: { clinicId, savedAt: timestamp, success: false, error: error.message }
      }));
    }

    return {
      success: false,
      timestamp,
      error: error.message || 'Falha ao conectar com o Firestore'
    };
  }
}

/**
 * Fetches the clinic's Google Calendar synchronization interval from Firestore.
 */
export async function fetchClinicSyncSettingsFromFirestore(
  clinicId: string
): Promise<GoogleSyncSettings | null> {
  if (!clinicId) return null;

  try {
    const subDocRef = doc(db, 'clinics', clinicId, 'settings', 'google_sync');
    const subDocSnap = await getDoc(subDocRef);

    if (subDocSnap.exists()) {
      const data = subDocSnap.data();
      const loadedSettings: GoogleSyncSettings = {
        ...getGoogleSyncSettings(clinicId),
        syncIntervalMinutes: data.syncIntervalMinutes ?? 15,
        autoSyncEnabled: data.autoSyncEnabled ?? true,
        syncDirection: data.syncDirection ?? 'bidirectional',
        targetCalendarId: data.targetCalendarId ?? 'primary',
        conflictResolution: data.conflictResolution ?? 'prefer_crm',
        clinicId,
        clinicName: data.clinicName || 'Clínica',
      };

      saveGoogleSyncSettings(loadedSettings);
      return loadedSettings;
    }

    // Fallback check root clinic document
    const clinicDocRef = doc(db, 'clinics', clinicId);
    const clinicDocSnap = await getDoc(clinicDocRef);
    if (clinicDocSnap.exists()) {
      const cData = clinicDocSnap.data();
      if (cData.syncIntervalMinutes || cData.googleCalendarSyncIntervalMinutes) {
        const interval = cData.syncIntervalMinutes || cData.googleCalendarSyncIntervalMinutes;
        const loadedSettings: GoogleSyncSettings = {
          ...getGoogleSyncSettings(clinicId),
          syncIntervalMinutes: Number(interval),
          autoSyncEnabled: cData.autoSyncEnabled ?? true,
          clinicId,
        };
        saveGoogleSyncSettings(loadedSettings);
        return loadedSettings;
      }
    }
  } catch (err) {
    console.warn('Aviso ao buscar configurações da clínica no Firestore (usando cache local):', err);
  }

  return null;
}
