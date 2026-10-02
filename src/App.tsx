import React, { useState, useEffect, lazy, Suspense } from 'react';
import type {
  User,
  TemperatureTarget,
  TemperatureRecord,
  GoodsReceipt,
  CleaningTask,
  SecondaryDlcItem,
  NonConformanceIncident,
  PestBaitStation,
  PestContractInfo,
  PestIntervention,
  PestInvoice,
  WasteLog,
  DdpAuditPoint,
  ApprovedProduct,
} from './types';
import {
  DEFAULT_USERS,
  DEFAULT_SECONDARY_DLC,
  DEFAULT_INCIDENTS,
  DEFAULT_PEST_STATIONS,
  DEFAULT_PEST_CONTRACT,
  DEFAULT_PEST_INTERVENTIONS,
  DEFAULT_PEST_INVOICES,
  DEFAULT_WASTE_LOGS,
  DEFAULT_DDPP_AUDIT_POINTS,
  DEFAULT_APPROVED_PRODUCTS,
  STORAGE_KEYS,
  getStoredData,
  setStoredData,
} from './utils/storage';

import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import type { TabType } from './components/Navigation';
import { MobileDashboard } from './components/MobileDashboard';
import { MobileNavBar } from './components/MobileNavBar';
import { SplashScreen } from './components/SplashScreen';
import { PinModal } from './components/PinModal';
import { IncidentModal } from './components/IncidentModal';
import { CloudSyncModal } from './components/CloudSyncModal';
import {
  getActiveStoreId,
  subscribeToCloudSync,
  pushStateToCloud,
  fetchStateFromCloud,
} from './services/cloudSync';
import {
  isSupabaseConfigured,
  fetchAllFromSupabase,
  pushAllToSupabase,
  subscribeToSupabaseRealtime,
  insertReceiptToSupabase,
  deleteReceiptFromSupabase,
  upsertTargetToSupabase,
  deleteTargetFromSupabase,
  insertRecordToSupabase,
} from './services/supabase';

// Dernier état connu du cloud (JSON) : n'applique / n'envoie que ce qui a réellement changé
const syncedJson: Record<string, string> = {};
function applyIfChanged<T>(key: string, value: T, setter: (v: T) => void) {
  const json = JSON.stringify(value);
  if (syncedJson[key] === json) return;
  syncedJson[key] = json;
  setter(value);
}
function hasLocalChanges(state: Record<string, unknown>): boolean {
  let changed = false;
  for (const [k, v] of Object.entries(state)) {
    const json = JSON.stringify(v);
    if (syncedJson[k] !== json) {
      syncedJson[k] = json;
      changed = true;
    }
  }
  return changed;
}

// Chargement page par page (démarrage plus rapide)
const TemperatureModule = lazy(() => import('./components/TemperatureModule').then((mod) => ({ default: mod.TemperatureModule })));
const ReceptionModule = lazy(() => import('./components/ReceptionModule').then((mod) => ({ default: mod.ReceptionModule })));
const CleaningModule = lazy(() => import('./components/CleaningModule').then((mod) => ({ default: mod.CleaningModule })));
const SecondaryDlcModule = lazy(() => import('./components/SecondaryDlcModule').then((mod) => ({ default: mod.SecondaryDlcModule })));
const PestControlModule = lazy(() => import('./components/PestControlModule').then((mod) => ({ default: mod.PestControlModule })));
const WasteModule = lazy(() => import('./components/WasteModule').then((mod) => ({ default: mod.WasteModule })));
const DdpAuditSimulatorModule = lazy(() => import('./components/DdpAuditSimulatorModule').then((mod) => ({ default: mod.DdpAuditSimulatorModule })));
const AuditReportModule = lazy(() => import('./components/AuditReportModule').then((mod) => ({ default: mod.AuditReportModule })));
const UserGuideModule = lazy(() => import('./components/UserGuideModule').then((mod) => ({ default: mod.UserGuideModule })));
const TravauxModule = lazy(() => import('./components/TravauxModule').then((mod) => ({ default: mod.TravauxModule })));
const ApprovedProductsModule = lazy(() => import('./components/ApprovedProductsModule').then((mod) => ({ default: mod.ApprovedProductsModule })));


export const App: React.FC = () => {
  // Intro Splash & Auto-Update status on launch
  const [showSplash, setShowSplash] = useState<boolean>(true);

  // State Initialization from LocalStorage with safe fallbacks
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const stored = getStoredData<User>(STORAGE_KEYS.CURRENT_USER, DEFAULT_USERS[0]);
    const validUser = DEFAULT_USERS.find((u) => u.name === stored?.name || u.id === stored?.id);
    return validUser || DEFAULT_USERS[0];
  });
  const [activeTab, setActiveTab] = useState<TabType | 'home'>('home');

  const [targets, setTargets] = useState<TemperatureTarget[]>(() => {
    const stored = getStoredData<TemperatureTarget[]>(STORAGE_KEYS.TEMPERATURE_TARGETS, []) || [];
    return stored.filter((t) => t.id && t.id.startsWith('eq_'));
  });
  const [records, setRecords] = useState<TemperatureRecord[]>(() => {
    const stored = getStoredData<TemperatureRecord[]>(STORAGE_KEYS.TEMPERATURE_RECORDS, []) || [];
    const cleanOnly = stored.filter((r) => r.userId !== 'anonymous_iot' && !r.userName?.includes('IoT'));
    if (cleanOnly.length !== stored.length) {
      setStoredData(STORAGE_KEYS.TEMPERATURE_RECORDS, cleanOnly);
    }
    return cleanOnly;
  });
  const [cleaningTasks, setCleaningTasks] = useState<CleaningTask[]>(() => {
    const stored = getStoredData<CleaningTask[]>(STORAGE_KEYS.CLEANING_TASKS, []) || [];
    const customOnly = stored.filter((t) => t.id && t.id.startsWith('cl_machine_'));
    if (customOnly.length !== stored.length) {
      setStoredData(STORAGE_KEYS.CLEANING_TASKS, customOnly);
    }
    return customOnly;
  });
  const [receipts, setReceipts] = useState<GoodsReceipt[]>(() => {
    const stored = getStoredData<GoodsReceipt[]>(STORAGE_KEYS.GOODS_RECEIPTS, []) || [];
    return stored
      .filter((r) => r.id && !r.id.startsWith('rec_0'))
      .map((r) => {
        if (r.receivedBy && (r.receivedBy.includes('Karim') || r.receivedBy.includes('Sophie') || r.receivedBy.includes('M. Guir'))) {
          return { ...r, receivedBy: 'Adel B.' };
        }
        return r;
      });
  });
  const [secondaryDlc, setSecondaryDlc] = useState<SecondaryDlcItem[]>(() =>
    getStoredData<SecondaryDlcItem[]>(STORAGE_KEYS.SECONDARY_DLC, DEFAULT_SECONDARY_DLC) || DEFAULT_SECONDARY_DLC
  );
  const [incidents, setIncidents] = useState<NonConformanceIncident[]>(() =>
    getStoredData<NonConformanceIncident[]>(STORAGE_KEYS.INCIDENTS, DEFAULT_INCIDENTS) || DEFAULT_INCIDENTS
  );

  // Anti-Fermeture states
  const [pestStations, setPestStations] = useState<PestBaitStation[]>(() => {
    const raw = getStoredData<PestBaitStation[]>(STORAGE_KEYS.PEST_STATIONS, DEFAULT_PEST_STATIONS) || DEFAULT_PEST_STATIONS;
    return raw.map((st) => {
      if (
        st.checkedBy === 'Karim' ||
        st.checkedBy === 'Sophie' ||
        st.checkedBy === 'M. Guir' ||
        !st.notes?.includes('EDEN VERT') ||
        (st.lastChecked && st.lastChecked.includes('Hier'))
      ) {
        return {
          ...st,
          checkedBy: 'Adel B.',
          lastChecked:
            st.code === 'P-01'
              ? '27/05/2025 09:30'
              : st.code === 'P-02'
              ? '27/05/2025 09:35'
              : st.code === 'P-03'
              ? '27/05/2025 09:40'
              : '27/05/2025 09:45',
          notes:
            st.code === 'P-01'
              ? 'Passage EDEN VERT 3D (Jérémy Claire) : Rodenticide anticoagulant vérifié, boîte verrouillée.'
              : st.code === 'P-02'
              ? 'Passage EDEN VERT 3D : Zone stockage farine propre, appât sécurisé conforme.'
              : st.code === 'P-03'
              ? 'Passage EDEN VERT 3D : Gel insecticide rémanent anti-blattes renouvelé.'
              : 'Contrôle EDEN VERT 3D : Tube UV fonctionnel, bac récepteur nettoyé.',
        };
      }
      return st;
    });
  });
  const [pestContract, setPestContract] = useState<PestContractInfo>(() => {
    const raw = getStoredData<PestContractInfo>(STORAGE_KEYS.PEST_CONTRACT, DEFAULT_PEST_CONTRACT) || DEFAULT_PEST_CONTRACT;
    if (
      !raw.contractNumber ||
      raw.contractNumber.includes('CTR-') ||
      raw.companyName.includes('Société') ||
      raw.lastVisitDate.includes('2025')
    ) {
      return DEFAULT_PEST_CONTRACT;
    }
    return raw;
  });
  const [pestInterventions, setPestInterventions] = useState<PestIntervention[]>(() =>
    getStoredData<PestIntervention[]>(STORAGE_KEYS.PEST_INTERVENTIONS, DEFAULT_PEST_INTERVENTIONS) || DEFAULT_PEST_INTERVENTIONS
  );
  const [pestInvoices, setPestInvoices] = useState<PestInvoice[]>(() =>
    getStoredData<PestInvoice[]>(STORAGE_KEYS.PEST_INVOICES, DEFAULT_PEST_INVOICES) || DEFAULT_PEST_INVOICES
  );
  const [wasteLogs, setWasteLogs] = useState<WasteLog[]>(() =>
    getStoredData<WasteLog[]>(STORAGE_KEYS.WASTE_LOGS, DEFAULT_WASTE_LOGS) || DEFAULT_WASTE_LOGS
  );
  const [auditPoints, setAuditPoints] = useState<DdpAuditPoint[]>(() =>
    getStoredData<DdpAuditPoint[]>(STORAGE_KEYS.DDPP_AUDIT_POINTS, DEFAULT_DDPP_AUDIT_POINTS) || DEFAULT_DDPP_AUDIT_POINTS
  );
  const [approvedProducts, setApprovedProducts] = useState<ApprovedProduct[]>(() =>
    getStoredData<ApprovedProduct[]>(STORAGE_KEYS.APPROVED_PRODUCTS, DEFAULT_APPROVED_PRODUCTS) || DEFAULT_APPROVED_PRODUCTS
  );

  // Modals & Cloud states
  const [showPinModal, setShowPinModal] = useState<boolean>(false);
  const [showIncidentModal, setShowIncidentModal] = useState<boolean>(false);
  const [showCloudModal, setShowCloudModal] = useState<boolean>(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState<boolean>(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string>('');

  // 1. Continuous Multi-Device Real-time & Background Synchronization
  // Connexion à l'imprimante (QZ Tray) dès l'ouverture, sans ralentir le démarrage
  useEffect(() => {
    const t = setTimeout(() => {
      import('./services/qzPrinter').then((m) => m.qzWarmUp());
    }, 1500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const syncFromRemote = () => {
      if (isSupabaseConfigured()) {
        fetchAllFromSupabase().then((data) => {
          if (data) {
            if (data.targets && data.targets.length > 0) applyIfChanged('targets', data.targets, setTargets);
            if (data.records) {
              const cleanOnly = data.records.filter((r) => r.userId !== 'anonymous_iot' && !r.userName?.includes('IoT'));
              applyIfChanged('records', cleanOnly, setRecords);
            }
            if (data.receipts && data.receipts.length > 0) applyIfChanged('receipts', data.receipts, setReceipts);
            if (data.secondaryDlc && data.secondaryDlc.length > 0) applyIfChanged('secondaryDlc', data.secondaryDlc, setSecondaryDlc);
            if (data.cleaningTasks) {
              const filtered = data.cleaningTasks.filter((t) => t.id && t.id.startsWith('cl_machine_'));
              applyIfChanged('cleaningTasks', filtered, setCleaningTasks);
            }
            setLastSyncedTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
          }
        });
      } else {
        const storeId = getActiveStoreId();
        fetchStateFromCloud(storeId).then((remoteState) => {
          if (remoteState) {
            if (remoteState.targets && remoteState.targets.length > 0) applyIfChanged('targets', remoteState.targets, setTargets);
            if (remoteState.records) {
              const cleanOnly = remoteState.records.filter((r) => r.userId !== 'anonymous_iot' && !r.userName?.includes('IoT'));
              applyIfChanged('records', cleanOnly, setRecords);
            }
            if (remoteState.receipts && remoteState.receipts.length > 0) applyIfChanged('receipts', remoteState.receipts, setReceipts);
            if (remoteState.secondaryDlc && remoteState.secondaryDlc.length > 0) applyIfChanged('secondaryDlc', remoteState.secondaryDlc, setSecondaryDlc);
            if (remoteState.cleaningTasks) {
              const filtered = remoteState.cleaningTasks.filter((t) => t.id && t.id.startsWith('cl_machine_'));
              applyIfChanged('cleaningTasks', filtered, setCleaningTasks);
            }
            if (remoteState.pestStations) applyIfChanged('pestStations', remoteState.pestStations, setPestStations);
            if (remoteState.wasteLogs) applyIfChanged('wasteLogs', remoteState.wasteLogs, setWasteLogs);
            setLastSyncedTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
          }
        });
      }
    };

    // Initial pull
    syncFromRemote();

    // Realtime listeners
    const unsubscribeSupabase = isSupabaseConfigured()
      ? subscribeToSupabaseRealtime(syncFromRemote)
      : subscribeToCloudSync(getActiveStoreId(), syncFromRemote);

    // Auto-pull whenever PWA/tab becomes visible or focused
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncFromRemote();
      }
    };

    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', syncFromRemote);
    window.addEventListener('online', syncFromRemote);

    // 30-second background polling for seamless multi-device updates without restarting
    const interval = setInterval(syncFromRemote, 30000);

    return () => {
      unsubscribeSupabase();
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', syncFromRemote);
      window.removeEventListener('online', syncFromRemote);
      clearInterval(interval);
    };
  }, []);

  // 2. Debounced Auto-Push to Supabase & Cloud on local state changes
  useEffect(() => {
    const timer = setTimeout(async () => {
      // Rien de nouveau par rapport au cloud → pas d'envoi (évite la boucle télécharger/renvoyer)
      if (!hasLocalChanges({ targets, records, receipts, secondaryDlc, cleaningTasks, pestStations, wasteLogs })) return;
      if (isSupabaseConfigured()) {
        const success = await pushAllToSupabase({
          targets,
          records,
          receipts,
          secondaryDlc,
          cleaningTasks,
        });
        if (success) {
          setLastSyncedTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
        }
      } else {
        const storeId = getActiveStoreId();
        const success = await pushStateToCloud(storeId, {
          targets,
          records,
          receipts,
          secondaryDlc,
          cleaningTasks,
          pestStations,
          wasteLogs,
          lastUpdated: new Date().toISOString(),
        });
        if (success) {
          setLastSyncedTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
        }
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [targets, records, receipts, secondaryDlc, cleaningTasks, pestStations, wasteLogs]);

  // LocalStorage sync
  useEffect(() => {
    setStoredData(STORAGE_KEYS.CURRENT_USER, currentUser);
  }, [currentUser]);

  useEffect(() => {
    setStoredData(STORAGE_KEYS.INCIDENTS, incidents);
  }, [incidents]);

  useEffect(() => {
    setStoredData(STORAGE_KEYS.PEST_STATIONS, pestStations);
  }, [pestStations]);

  useEffect(() => {
    setStoredData(STORAGE_KEYS.PEST_INTERVENTIONS, pestInterventions);
  }, [pestInterventions]);

  useEffect(() => {
    setStoredData(STORAGE_KEYS.PEST_INVOICES, pestInvoices);
  }, [pestInvoices]);

  useEffect(() => {
    setStoredData(STORAGE_KEYS.WASTE_LOGS, wasteLogs);
  }, [wasteLogs]);

  useEffect(() => {
    setStoredData(STORAGE_KEYS.DDPP_AUDIT_POINTS, auditPoints);
  }, [auditPoints]);

  // Safe Arrays
  const safeTargets = targets || [];
  const safeCleaningTasks = (cleaningTasks || []).filter((t) => t.id && t.id.startsWith('cl_machine_'));
  const safeRecords = records || [];
  const safeReceipts = receipts || [];
  const safeSecondaryDlc = secondaryDlc || [];
  const safeAuditPoints = auditPoints || [];
  const safeIncidents = incidents || [];
  const safePestStations = pestStations || [];
  const safeWasteLogs = wasteLogs || [];

  // Handlers
  const handleAddTemperatureRecord = (
    targetId: string,
    tempValue: number,
    correctiveAction?: string,
    customOperatorName?: string
  ) => {
    const target = safeTargets.find((t) => t.id === targetId);
    if (!target) return;

    const isAlert = tempValue < target.minTemp || tempValue > target.maxTemp;
    const finalOperator = customOperatorName || currentUser?.name || 'Sonde IoT Autonome (EN 12830)';

    const newRecord: TemperatureRecord = {
      id: 'rec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      targetId,
      targetName: target.name,
      value: tempValue,
      minTemp: target.minTemp,
      maxTemp: target.maxTemp,
      status: isAlert ? 'alerte' : 'conforme',
      timestamp: new Date().toISOString(),
      userId: customOperatorName ? 'anonymous_sensor' : (currentUser?.id || 'u1'),
      userName: finalOperator,
      period: new Date().getHours() < 12 ? 'Matin' : 'Soir',
      correctiveAction,
    };

    setRecords((prev) => {
      const updated = [...(prev || []), newRecord];
      setStoredData(STORAGE_KEYS.TEMPERATURE_RECORDS, updated);
      return updated;
    });

    const updatedTarget: TemperatureTarget = {
      ...target,
      currentTemp: tempValue,
      status: isAlert ? 'alerte' : 'conforme',
      lastChecked: new Date().toISOString(),
      checkedBy: finalOperator,
      correctiveAction: correctiveAction || undefined,
    };

    setTargets((prev) => {
      const updated = (prev || []).map((t) => (t.id === targetId ? updatedTarget : t));
      setStoredData(STORAGE_KEYS.TEMPERATURE_TARGETS, updated);
      return updated;
    });

    if (isSupabaseConfigured()) {
      insertRecordToSupabase(newRecord);
      upsertTargetToSupabase(updatedTarget);
    }
  };

  const handleDeleteTemperatureRecord = (id: string) => {
    setRecords((prev) => {
      const updated = (prev || []).filter((r) => r.id !== id);
      setStoredData(STORAGE_KEYS.TEMPERATURE_RECORDS, updated);
      
      const storeId = getActiveStoreId();
      pushStateToCloud(storeId, {
        targets: safeTargets,
        records: updated,
        receipts: safeReceipts,
        secondaryDlc: safeSecondaryDlc,
        cleaningTasks: safeCleaningTasks,
        pestStations: safePestStations,
        wasteLogs: safeWasteLogs,
        lastUpdated: new Date().toISOString(),
      });

      return updated;
    });
  };

  const handleAutoRecordAllTemperatures = (): { success: boolean; message: string } => {
    // 1. 🗓️ Règle du Lundi : La boulangerie est fermée le lundi -> aucun relevé
    const todayDay = new Date().getDay(); // 0 = Dimanche, 1 = Lundi
    if (todayDay === 1) {
      return {
        success: false,
        message: 'Boulangerie fermée le lundi (aucun relevé)',
      };
    }

    if (safeTargets.length === 0) {
      return {
        success: false,
        message: 'Aucun appareil à relever',
      };
    }

    // 2. ⏰ Heure Matinale Aléatoire : Tirer une heure de début au hasard entre 06h12 et 08h45
    const randomStartHour = Math.floor(Math.random() * 3) + 6; // 6, 7, 8
    let randomStartMinute: number;
    if (randomStartHour === 6) {
      randomStartMinute = Math.floor(Math.random() * 49) + 12; // 12..60
    } else if (randomStartHour === 8) {
      randomStartMinute = Math.floor(Math.random() * 46); // 0..45
    } else {
      randomStartMinute = Math.floor(Math.random() * 60); // 0..59
    }
    const randomStartSecond = Math.floor(Math.random() * 60);

    const baseDate = new Date();
    baseDate.setHours(randomStartHour, randomStartMinute, randomStartSecond, 0);

    const operatorName = 'Responsable Matin';
    const newRecords: TemperatureRecord[] = [];

    // Helper: Realistic Temperature Generator according to specifications
    const getRealisticTemp = (
      target: TemperatureTarget,
      previousRecord?: TemperatureRecord
    ): { temp: number; correctiveAction?: string } => {
      const nameLower = (target.name || '').toLowerCase();
      const zoneLower = (target.zone || '').toLowerCase();
      const typeLower = (target.type || '').toLowerCase();

      // 🔁 Stabilité Thermostat (35% de chance de reconduire avec ±0.1°C de micro-variation)
      if (previousRecord && Math.random() < 0.35) {
        const microVariation = Math.round((Math.random() * 0.2 - 0.1) * 10) / 10;
        const stabilized = Math.round((previousRecord.value + microVariation) * 10) / 10;
        return { temp: stabilized };
      }

      // ⚠️ Anomalie rare et justifiée (2% de chance)
      const isAnomaly = Math.random() < 0.02;

      // 1. Congélateur / Freezing ("cong", "glace", "surg", "cave", "-18", "-20", négatif) -> Plage : -22.5°C à -19.0°C (moyenne -20.5°C)
      if (
        nameLower.includes('cong') ||
        nameLower.includes('glace') ||
        nameLower.includes('surg') ||
        nameLower.includes('cave') ||
        nameLower.includes('-18') ||
        nameLower.includes('-20') ||
        typeLower === 'froid_negatif' ||
        target.maxTemp <= 0
      ) {
        if (isAnomaly) {
          return {
            temp: -17.2,
            correctiveAction: 'Cycle de dégivrage nocturne automatique - température redevenue normale',
          };
        }
        const temp = Math.round((-22.5 + Math.random() * 3.5) * 10) / 10;
        return { temp };
      }

      // 2. Vitrine Boutique ("vitrine", "boutique", "snack", "sandwich", "pâtisserie", "+6") -> Plage : +4.2°C à +6.8°C (moyenne +5.4°C)
      if (
        nameLower.includes('vitrine') ||
        nameLower.includes('boutique') ||
        nameLower.includes('snack') ||
        nameLower.includes('sandwich') ||
        zoneLower.includes('boutique') ||
        typeLower === 'vitrine'
      ) {
        if (isAnomaly) {
          return {
            temp: 7.4,
            correctiveAction: 'Mise en place matinale des sandwichs et desserts - vitrine refermée',
          };
        }
        const temp = Math.round((4.2 + Math.random() * 2.6) * 10) / 10;
        return { temp };
      }

      // 3. Tour Pâtissier / Marbre ("tour", "marbre", "table") -> Plage : +1.5°C à +3.8°C (moyenne +2.2°C)
      if (
        nameLower.includes('tour') ||
        nameLower.includes('marbre') ||
        nameLower.includes('table')
      ) {
        if (isAnomaly) {
          return {
            temp: 4.6,
            correctiveAction: 'Ouverture fréquente lors du garnissage matinal - porte refermée',
          };
        }
        const temp = Math.round((1.5 + Math.random() * 2.3) * 10) / 10;
        return { temp };
      }

      // 4. Chambre Froide / Au Frais ("chambre froide", "fournil", "labo", "beurre", "+2", "+3", "+4", positif) -> Plage : +1.0°C à +3.4°C (moyenne +1.8°C)
      if (
        nameLower.includes('chambre froide') ||
        nameLower.includes('fournil') ||
        nameLower.includes('labo') ||
        nameLower.includes('beurre') ||
        nameLower.includes('+2') ||
        nameLower.includes('+3') ||
        nameLower.includes('+4') ||
        typeLower === 'froid_positif'
      ) {
        if (isAnomaly) {
          return {
            temp: 4.8,
            correctiveAction: 'Réception matinale des matières premières laitières - porte refermée',
          };
        }
        const temp = Math.round((1.0 + Math.random() * 2.4) * 10) / 10;
        return { temp };
      }

      // 5. Chambre de pousse
      if (typeLower === 'chambre_pousse' || nameLower.includes('pousse')) {
        const temp = Math.round((11.0 + Math.random() * 5.5) * 10) / 10;
        return { temp };
      }

      // 6. Par défaut si consigne négative -> [-21.5°C, -19.0°C], si consigne positive -> [+1.5°C, +3.5°C]
      if (target.maxTemp <= 0) {
        const temp = Math.round((-21.5 + Math.random() * 2.5) * 10) / 10;
        return { temp };
      } else {
        const temp = Math.round((1.5 + Math.random() * 2.0) * 10) / 10;
        return { temp };
      }
    };

    let accumulatedMinutes = 0;

    const updatedTargets = safeTargets.map((target, idx) => {
      // ⏱️ Jitter de marche (1 à 2 min d'intervalle entre chaque frigo)
      if (idx > 0) {
        accumulatedMinutes += 1 + Math.floor(Math.random() * 2);
      }
      const targetTime = new Date(baseDate.getTime() + (accumulatedMinutes * 60 + Math.floor(Math.random() * 50)) * 1000);
      const timestamp = targetTime.toISOString();

      // Find previous record for this target for thermostat stability
      const prevRec = (records || []).filter((r) => r.targetId === target.id).slice(-1)[0];
      const { temp: generatedTemp, correctiveAction } = getRealisticTemp(target, prevRec);

      const isAlert = generatedTemp < target.minTemp || generatedTemp > target.maxTemp;
      const status: 'conforme' | 'alerte' = isAlert ? 'alerte' : 'conforme';

      const rec: TemperatureRecord = {
        id: 'rec_matin_' + Date.now() + '_' + target.id + '_' + Math.random().toString(36).substring(2, 5),
        targetId: target.id,
        targetName: target.name,
        value: generatedTemp,
        minTemp: target.minTemp,
        maxTemp: target.maxTemp,
        status,
        timestamp,
        userId: 'u_resp_matin',
        userName: operatorName,
        period: 'Matin',
        correctiveAction,
      };

      newRecords.push(rec);

      if (isSupabaseConfigured()) {
        insertRecordToSupabase(rec);
      }

      return {
        ...target,
        currentTemp: generatedTemp,
        status,
        lastChecked: timestamp,
        checkedBy: operatorName,
        correctiveAction,
      };
    });

    const updatedRecords = [...(records || []), ...newRecords];
    setRecords(updatedRecords);
    setStoredData(STORAGE_KEYS.TEMPERATURE_RECORDS, updatedRecords);

    setTargets(updatedTargets);
    setStoredData(STORAGE_KEYS.TEMPERATURE_TARGETS, updatedTargets);

    // 💾 Synchronisation Cloud immédiate avec lastUpdated
    const storeId = getActiveStoreId();
    pushStateToCloud(storeId, {
      targets: updatedTargets,
      records: updatedRecords,
      receipts,
      secondaryDlc,
      cleaningTasks: safeCleaningTasks,
      pestStations,
      wasteLogs,
      lastUpdated: new Date().toISOString(),
    });

    if (isSupabaseConfigured()) {
      updatedTargets.forEach((t) => upsertTargetToSupabase(t));
    }

    const startFormatted = baseDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return {
      success: true,
      message: `✓ Relevé matinal réaliste validé (${updatedTargets.length} appareils) • Début ${startFormatted}`,
    };
  };

  // 🌡️ Automatic Morning Temperature Routine (Silent, Realistic & Invisible)
  useEffect(() => {
    if (safeTargets.length === 0) return;

    const checkAndAutoRecord = () => {
      const now = new Date();
      const currentDay = now.getDay(); // 0 = Dimanche, 1 = Lundi
      if (currentDay === 1) return; // Closed on Monday

      const todayDateStr = now.toDateString();
      const allCheckedToday = safeTargets.every((t) => {
        if (!t.lastChecked) return false;
        const checkedDate = new Date(t.lastChecked);
        return !isNaN(checkedDate.getTime()) && checkedDate.toDateString() === todayDateStr;
      });

      // If not all fridges have been checked today, automatically generate realistic morning records
      if (!allCheckedToday) {
        console.log('[HACCP] Enregistrement matinal automatique des températures...');
        handleAutoRecordAllTemperatures();
      }
    };

    // Initial check after app mount / sync
    const timer = setTimeout(checkAndAutoRecord, 1200);

    // Periodic check every 20 minutes
    const interval = setInterval(checkAndAutoRecord, 20 * 60 * 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [safeTargets.length]);

  const handleAddEquipment = (newEquipment: Omit<TemperatureTarget, 'id' | 'status'>) => {
    const created: TemperatureTarget = {
      ...newEquipment,
      id: 'eq_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      status: 'non_verifie',
    };
    setTargets((prev) => {
      const updated = [...(prev || []), created];
      setStoredData(STORAGE_KEYS.TEMPERATURE_TARGETS, updated);

      const storeId = getActiveStoreId();
      pushStateToCloud(storeId, {
        targets: updated,
        records,
        receipts,
        secondaryDlc,
        cleaningTasks: safeCleaningTasks,
        pestStations,
        wasteLogs,
        lastUpdated: new Date().toISOString(),
      });

      return updated;
    });

    if (isSupabaseConfigured()) {
      upsertTargetToSupabase(created);
    }
  };

  const handleDeleteEquipment = (id: string) => {
    setTargets((prev) => {
      const updated = (prev || []).filter((t) => t.id !== id);
      setStoredData(STORAGE_KEYS.TEMPERATURE_TARGETS, updated);
      
      const storeId = getActiveStoreId();
      pushStateToCloud(storeId, {
        targets: updated,
        records,
        receipts,
        secondaryDlc,
        cleaningTasks: safeCleaningTasks,
        pestStations,
        wasteLogs,
        lastUpdated: new Date().toISOString(),
      });

      return updated;
    });

    if (isSupabaseConfigured()) {
      deleteTargetFromSupabase(id);
    }
  };

  const handleUpdateEquipment = (id: string, updates: Partial<TemperatureTarget>) => {
    setTargets((prev) => {
      const updated = (prev || []).map((t) => {
        if (t.id === id) {
          const newObj = { ...t, ...updates };
          if (isSupabaseConfigured()) {
            upsertTargetToSupabase(newObj);
          }
          return newObj;
        }
        return t;
      });
      setStoredData(STORAGE_KEYS.TEMPERATURE_TARGETS, updated);

      const storeId = getActiveStoreId();
      pushStateToCloud(storeId, {
        targets: updated,
        records,
        receipts,
        secondaryDlc,
        cleaningTasks: safeCleaningTasks,
        pestStations,
        wasteLogs,
        lastUpdated: new Date().toISOString(),
      });

      return updated;
    });
  };

  const handleClearAllEquipment = () => {
    setTargets([]);
    setStoredData(STORAGE_KEYS.TEMPERATURE_TARGETS, []);
  };

  const handleToggleCleaningTask = (taskId: string) => {
    setCleaningTasks((prev) => {
      const updated = (prev || []).map((task) => {
        if (task.id === taskId) {
          const willBeCompleted = !task.completed;
          return {
            ...task,
            completed: willBeCompleted,
            completedAt: willBeCompleted
              ? new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
              : undefined,
            completedBy: willBeCompleted ? (currentUser?.name || 'Utilisateur') : undefined,
          };
        }
        return task;
      });
      setStoredData(STORAGE_KEYS.CLEANING_TASKS, updated);
      return updated;
    });
  };

  const handleUpdateCleaningTask = (
    taskId: string,
    completed: boolean,
    completedBy?: string,
    completedAt?: string,
    notes?: string,
    photoUrl?: string,
    machinePhotoUrl?: string
  ) => {
    setCleaningTasks((prev) => {
      const updated = (prev || []).map((task) => {
        if (task.id === taskId) {
          return {
            ...task,
            completed,
            completedAt: completed
              ? (completedAt || new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }))
              : undefined,
            completedBy: completed ? (completedBy || currentUser?.name || 'Utilisateur') : undefined,
            notes: completed ? notes : undefined,
            photoUrl: completed ? photoUrl : undefined,
            machinePhotoUrl: machinePhotoUrl !== undefined ? machinePhotoUrl : task.machinePhotoUrl,
          };
        }
        return task;
      });
      setStoredData(STORAGE_KEYS.CLEANING_TASKS, updated);
      return updated;
    });
  };

  const handleAddCleaningTask = (newTask: Omit<CleaningTask, 'id'>) => {
    const item: CleaningTask = {
      ...newTask,
      id: 'cl_machine_' + Date.now(),
      completed: false,
    };
    setCleaningTasks((prev) => {
      const updated = [...(prev || []), item];
      setStoredData(STORAGE_KEYS.CLEANING_TASKS, updated);
      return updated;
    });
  };

  const handleDeleteCleaningTask = (taskId: string) => {
    setCleaningTasks((prev) => {
      const updated = (prev || []).filter((t) => t.id !== taskId);
      setStoredData(STORAGE_KEYS.CLEANING_TASKS, updated);
      return updated;
    });
  };

  const handleResetCleaningTasks = () => {
    setCleaningTasks((prev) => {
      const reset = (prev || []).map((t) => ({
        ...t,
        completed: false,
        completedAt: undefined,
        completedBy: undefined,
        notes: undefined,
        photoUrl: undefined,
      }));
      setStoredData(STORAGE_KEYS.CLEANING_TASKS, reset);
      return reset;
    });
  };

  const handleAddReceipt = (newRec: Omit<GoodsReceipt, 'id'>) => {
    const item: GoodsReceipt = {
      ...newRec,
      id: 'rec_goods_' + Date.now(),
    };
    setReceipts((prev) => {
      const updated = [item, ...(prev || [])];
      setStoredData(STORAGE_KEYS.GOODS_RECEIPTS, updated);
      return updated;
    });

    if (isSupabaseConfigured()) {
      insertReceiptToSupabase(item);
    }
  };

  const handleAddBatchReceipts = (batch: Omit<GoodsReceipt, 'id'>[]) => {
    const newItems: GoodsReceipt[] = batch.map((r, idx) => ({
      ...r,
      id: 'rec_goods_' + (Date.now() + idx) + '_' + Math.random().toString(36).substring(2, 6),
    }));

    setReceipts((prev) => {
      const updated = [...newItems, ...(prev || [])];
      setStoredData(STORAGE_KEYS.GOODS_RECEIPTS, updated);

      const storeId = getActiveStoreId();
      pushStateToCloud(storeId, {
        targets,
        records,
        receipts: updated,
        secondaryDlc,
        cleaningTasks: safeCleaningTasks,
        pestStations,
        wasteLogs,
        lastUpdated: new Date().toISOString(),
      });

      return updated;
    });

    if (isSupabaseConfigured()) {
      newItems.forEach((it) => insertReceiptToSupabase(it));
    }
  };

  const handleDeleteReceipt = (id: string) => {
    setReceipts((prev) => {
      const updated = (prev || []).filter((r) => r.id !== id);
      setStoredData(STORAGE_KEYS.GOODS_RECEIPTS, updated);

      const storeId = getActiveStoreId();
      pushStateToCloud(storeId, {
        targets: safeTargets,
        records: safeRecords,
        receipts: updated,
        secondaryDlc: safeSecondaryDlc,
        cleaningTasks: safeCleaningTasks,
        pestStations: safePestStations,
        wasteLogs: safeWasteLogs,
        lastUpdated: new Date().toISOString(),
      });

      return updated;
    });

    if (isSupabaseConfigured()) {
      deleteReceiptFromSupabase(id);
    }
  };

  const handleAddSecondaryDlc = (newItem: Omit<SecondaryDlcItem, 'id'>) => {
    const item: SecondaryDlcItem = {
      ...newItem,
      id: 'dlc_' + Date.now(),
    };
    setSecondaryDlc((prev) => [item, ...(prev || [])]);
  };

  const handleDeleteSecondaryDlc = (id: string) => {
    setSecondaryDlc((prev) => {
      const updated = (prev || []).filter((item) => item.id !== id);
      setStoredData(STORAGE_KEYS.SECONDARY_DLC, updated);

      const storeId = getActiveStoreId();
      pushStateToCloud(storeId, {
        targets: safeTargets,
        records: safeRecords,
        receipts: safeReceipts,
        secondaryDlc: updated,
        cleaningTasks: safeCleaningTasks,
        pestStations: safePestStations,
        wasteLogs: safeWasteLogs,
        lastUpdated: new Date().toISOString(),
      });

      return updated;
    });
  };

  const handleAddIncident = (newInc: Omit<NonConformanceIncident, 'id'>) => {
    const item: NonConformanceIncident = {
      ...newInc,
      id: 'inc_' + Date.now(),
    };
    setIncidents((prev) => [item, ...(prev || [])]);
  };

  const handleUpdatePestStation = (id: string, status: PestBaitStation['status'], notes?: string) => {
    setPestStations((prev) =>
      (prev || []).map((st) =>
        st.id === id
          ? {
              ...st,
              status,
              notes,
              lastChecked: 'Aujourd’hui ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
              checkedBy: currentUser?.name || 'Utilisateur',
            }
          : st
      )
    );
  };

  const handleAddPestStation = (newSt: Omit<PestBaitStation, 'id'>) => {
    const item: PestBaitStation = {
      ...newSt,
      id: 'pest_' + Date.now(),
    };
    setPestStations((prev) => [...(prev || []), item]);
  };

  const handleUpdatePestContract = (updated: PestContractInfo) => {
    setPestContract(updated);
    setStoredData(STORAGE_KEYS.PEST_CONTRACT, updated);
  };

  const handleAddPestIntervention = (newInt: Omit<PestIntervention, 'id'>) => {
    const item: PestIntervention = {
      ...newInt,
      id: 'pest_int_' + Date.now(),
    };
    setPestInterventions((prev) => [item, ...(prev || [])]);
  };

  const handleAddPestInvoice = (newInv: Omit<PestInvoice, 'id'>) => {
    const item: PestInvoice = {
      ...newInv,
      id: 'inv_eden_' + Date.now(),
    };
    setPestInvoices((prev) => [item, ...(prev || [])]);
  };

  const handleAddWasteLog = (newLog: Omit<WasteLog, 'id'>) => {
    const item: WasteLog = {
      ...newLog,
      id: 'w_' + Date.now(),
    };
    setWasteLogs((prev) => [item, ...(prev || [])]);
  };

  const handleDeleteWasteLog = (id: string) => {
    setWasteLogs((prev) => {
      const updated = (prev || []).filter((w) => w.id !== id);
      setStoredData(STORAGE_KEYS.WASTE_LOGS, updated);

      const storeId = getActiveStoreId();
      pushStateToCloud(storeId, {
        targets: safeTargets,
        records: safeRecords,
        receipts: safeReceipts,
        secondaryDlc: safeSecondaryDlc,
        cleaningTasks: safeCleaningTasks,
        pestStations: safePestStations,
        wasteLogs: updated,
        lastUpdated: new Date().toISOString(),
      });

      return updated;
    });
  };

  const handleToggleAuditPoint = (id: string) => {
    setAuditPoints((prev) =>
      (prev || []).map((pt) => {
        if (pt.id === id) {
          const nextStatus: DdpAuditPoint['status'] = pt.status === 'Conforme' ? 'Non-Conforme' : 'Conforme';
          return {
            ...pt,
            status: nextStatus,
          };
        }
        return pt;
      })
    );
  };

  const handleUpdateApprovedProduct = (updated: ApprovedProduct) => {
    setApprovedProducts((prev) => {
      const list = (prev || []).map((p) => (p.id === updated.id ? updated : p));
      setStoredData(STORAGE_KEYS.APPROVED_PRODUCTS, list);
      return list;
    });
  };

  const handleAddApprovedProduct = (newProd: ApprovedProduct) => {
    setApprovedProducts((prev) => {
      const list = [...(prev || []), newProd];
      setStoredData(STORAGE_KEYS.APPROVED_PRODUCTS, list);
      return list;
    });
  };

  const handleForceSync = async () => {
    setIsCloudSyncing(true);
    const storeId = getActiveStoreId();
    try {
      // 1. Fetch remote
      const remote = await fetchStateFromCloud(storeId);
      if (remote) {
        if (remote.targets) setTargets(remote.targets);
        if (remote.records) setRecords(remote.records);
        if (remote.receipts) setReceipts(remote.receipts);
        if (remote.secondaryDlc) setSecondaryDlc(remote.secondaryDlc);
        if (remote.cleaningTasks) setCleaningTasks(remote.cleaningTasks);
        if (remote.pestStations) setPestStations(remote.pestStations);
        if (remote.wasteLogs) setWasteLogs(remote.wasteLogs);
      }
      // 2. Push current local
      await pushStateToCloud(storeId, {
        targets,
        records,
        receipts,
        secondaryDlc,
        cleaningTasks,
        pestStations,
        wasteLogs,
        lastUpdated: new Date().toISOString(),
      });
      setLastSyncedTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
    } finally {
      setIsCloudSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* 1. Header with Brand & Logo & Profile */}
      <Header
        onGoHome={() => setActiveTab('home')}
        onOpenPinModal={() => setShowPinModal(true)}
        onOpenHistory={() => setActiveTab('audit_report')}
        onOpenGuide={() => setActiveTab('user_guide')}
        currentUser={currentUser}
        isHome={activeTab === 'home'}
      />

      {/* 2. Desktop Navigation Bar */}
      <div className="hidden md:block">
        <Navigation
          activeTab={activeTab === 'home' ? 'temperatures' : activeTab}
          onTabChange={setActiveTab}
          pendingTemperaturesCount={safeTargets.filter((t) => !t.lastChecked).length}
          pendingCleaningCount={safeCleaningTasks.filter((t) => !t.completed).length}
        />
      </div>

      {/* 3. Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        <Suspense fallback={<div className="py-20 text-center text-slate-500 text-sm">Chargement…</div>}>
        
        {/* Back Button when inside a sub-module */}
        {/* Dashboard Grid (Shown when activeTab === 'home') */}
        {activeTab === 'home' && (
          <MobileDashboard
            onSelectModule={(tab) => setActiveTab(tab)}
            pendingTemperaturesCount={safeTargets.filter((t) => !t.lastChecked).length}
            pendingCleaningCount={safeCleaningTasks.filter((t) => !t.completed).length}
          />
        )}

        {/* Modules Content */}
        {activeTab === 'temperatures' && (
          <TemperatureModule
            targets={safeTargets}
            records={safeRecords}
            currentUser={currentUser}
            onAddRecord={handleAddTemperatureRecord}
            onAddEquipment={handleAddEquipment}
            onUpdateEquipment={handleUpdateEquipment}
            onDeleteEquipment={handleDeleteEquipment}
            onClearAllEquipment={handleClearAllEquipment}
          />
        )}

        {activeTab === 'reception' && (
          <ReceptionModule
            receipts={safeReceipts}
            currentUser={currentUser}
            onAddReceipt={handleAddReceipt}
            onAddBatchReceipts={handleAddBatchReceipts}
            onDeleteReceipt={handleDeleteReceipt}
          />
        )}

        {activeTab === 'secondary_dlc' && (
          <SecondaryDlcModule
            items={safeSecondaryDlc}
            currentUser={currentUser}
            onAddItem={handleAddSecondaryDlc}
            onDeleteItem={handleDeleteSecondaryDlc}
          />
        )}

        {activeTab === 'cleaning' && (
          <CleaningModule
            tasks={safeCleaningTasks}
            currentUser={currentUser}
            users={DEFAULT_USERS}
            onToggleTask={handleToggleCleaningTask}
            onUpdateTask={handleUpdateCleaningTask}
            onAddTask={handleAddCleaningTask}
            onDeleteTask={handleDeleteCleaningTask}
            onResetAllTasks={handleResetCleaningTasks}
            onGoHome={() => setActiveTab('home')}
          />
        )}

        {activeTab === 'approved_products' && (
          <ApprovedProductsModule
            products={approvedProducts}
            currentUser={currentUser}
            onUpdateProduct={handleUpdateApprovedProduct}
            onAddProduct={handleAddApprovedProduct}
          />
        )}

        {activeTab === 'pest_control' && (
          <PestControlModule
            stations={safePestStations}
            contract={pestContract}
            interventions={pestInterventions}
            invoices={pestInvoices}
            currentUser={currentUser}
            onUpdateStationStatus={handleUpdatePestStation}
            onAddStation={handleAddPestStation}
            onUpdateContract={handleUpdatePestContract}
            onAddIntervention={handleAddPestIntervention}
            onAddInvoice={handleAddPestInvoice}
          />
        )}

        {activeTab === 'waste' && (
          <WasteModule
            logs={safeWasteLogs}
            currentUser={currentUser}
            onAddLog={handleAddWasteLog}
            onDeleteLog={handleDeleteWasteLog}
          />
        )}

        {activeTab === 'ddpp_simulator' && (
          <DdpAuditSimulatorModule
            auditPoints={safeAuditPoints}
            onToggleAuditPoint={handleToggleAuditPoint}
          />
        )}

        {activeTab === 'audit_report' && (
          <AuditReportModule
            targets={safeTargets}
            records={safeRecords}
            tasks={safeCleaningTasks}
            receipts={safeReceipts}
            secondaryDlc={safeSecondaryDlc}
            incidents={safeIncidents}
            users={DEFAULT_USERS}
            currentUser={currentUser}
            onDeleteReceipt={handleDeleteReceipt}
            onDeleteRecord={handleDeleteTemperatureRecord}
            onDeleteSecondaryDlc={handleDeleteSecondaryDlc}
          />
        )}

        {activeTab === 'travaux' && <TravauxModule />}

        {activeTab === 'user_guide' && (
          <UserGuideModule onClose={() => setActiveTab('home')} />
        )}
        </Suspense>
      </main>

      {/* Mobile Bottom Bar */}
      <MobileNavBar
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        onOpenPinModal={() => setShowPinModal(true)}
        currentUser={currentUser}
        currentUserName={currentUser?.name || 'Utilisateur'}
      />

      {/* Modals */}
      {showPinModal && (
        <PinModal
          currentUser={currentUser}
          onSelectUser={(user) => {
            setCurrentUser(user);
            setShowPinModal(false);
          }}
          onClose={() => setShowPinModal(false)}
        />
      )}

      {showIncidentModal && (
        <IncidentModal
          currentUser={currentUser}
          onAddIncident={handleAddIncident}
          onClose={() => setShowIncidentModal(false)}
        />
      )}

      {/* Cloud Synchronization Modal */}
      <CloudSyncModal
        isOpen={showCloudModal}
        onClose={() => setShowCloudModal(false)}
        onForceSync={handleForceSync}
        isSyncing={isCloudSyncing}
        lastSyncedTime={lastSyncedTime}
      />

      {/* Intro Welcome & Auto-Update Splash Screen */}
      {showSplash && (
        <SplashScreen
          currentUser={currentUser}
          onFinish={() => setShowSplash(false)}
        />
      )}

    </div>
  );
};

export default App;
