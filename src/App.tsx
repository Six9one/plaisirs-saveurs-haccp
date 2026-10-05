import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
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
  withoutDemo,
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
  isSupabaseConfigured,
  fetchAllFromSupabase,
  pushChangesToSupabase,
  subscribeToSupabaseRealtime,
  CLEANING_LOG_PREFIX,
} from './services/supabase';
import { mergeRemote, pendingChanges, markPushed } from './services/syncMerge';
import type { SyncCollection } from './services/syncMerge';
import { isCleaningDueAgain } from './utils/formatters';

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


const VALID_TABS: TabType[] = [
  'temperatures', 'reception', 'secondary_dlc', 'cleaning', 'approved_products', 'pest_control',
  'waste', 'audit_report', 'ddpp_simulator', 'user_guide', 'travaux',
];

// Onglet demandé dans l'adresse (ex. notification "?tab=cleaning")
function readTabFromUrl(): TabType | 'home' {
  const tab = new URLSearchParams(window.location.search).get('tab');
  return VALID_TABS.includes(tab as TabType) ? (tab as TabType) : 'home';
}

export const App: React.FC = () => {
  // Intro Splash & Auto-Update status on launch
  const [showSplash, setShowSplash] = useState<boolean>(true);

  // State Initialization from LocalStorage with safe fallbacks
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const stored = getStoredData<User>(STORAGE_KEYS.CURRENT_USER, DEFAULT_USERS[0]);
    const validUser = DEFAULT_USERS.find((u) => u.name === stored?.name || u.id === stored?.id);
    return validUser || DEFAULT_USERS[0];
  });
  const [activeTab, setActiveTab] = useState<TabType | 'home'>(() => readTabFromUrl());

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
  const [cleaningLogs, setCleaningLogs] = useState<CleaningTask[]>(() =>
    getStoredData<CleaningTask[]>(STORAGE_KEYS.CLEANING_LOGS, []) || []
  );
  const [receipts, setReceipts] = useState<GoodsReceipt[]>(() => {
    const stored = getStoredData<GoodsReceipt[]>(STORAGE_KEYS.GOODS_RECEIPTS, []) || [];
    return stored.filter((r) => r.id && !r.id.startsWith('rec_0'));
  });
  const [secondaryDlc, setSecondaryDlc] = useState<SecondaryDlcItem[]>(() =>
    withoutDemo(getStoredData<SecondaryDlcItem[]>(STORAGE_KEYS.SECONDARY_DLC, DEFAULT_SECONDARY_DLC) || DEFAULT_SECONDARY_DLC)
  );
  const [incidents, setIncidents] = useState<NonConformanceIncident[]>(() =>
    withoutDemo(getStoredData<NonConformanceIncident[]>(STORAGE_KEYS.INCIDENTS, DEFAULT_INCIDENTS) || DEFAULT_INCIDENTS)
  );

  // Anti-Fermeture states
  const [pestStations, setPestStations] = useState<PestBaitStation[]>(() =>
    getStoredData<PestBaitStation[]>(STORAGE_KEYS.PEST_STATIONS, DEFAULT_PEST_STATIONS) || DEFAULT_PEST_STATIONS
  );
  const [pestContract, setPestContract] = useState<PestContractInfo>(() =>
    getStoredData<PestContractInfo>(STORAGE_KEYS.PEST_CONTRACT, DEFAULT_PEST_CONTRACT) || DEFAULT_PEST_CONTRACT
  );
  const [pestInterventions, setPestInterventions] = useState<PestIntervention[]>(() =>
    getStoredData<PestIntervention[]>(STORAGE_KEYS.PEST_INTERVENTIONS, DEFAULT_PEST_INTERVENTIONS) || DEFAULT_PEST_INTERVENTIONS
  );
  const [pestInvoices, setPestInvoices] = useState<PestInvoice[]>(() =>
    getStoredData<PestInvoice[]>(STORAGE_KEYS.PEST_INVOICES, DEFAULT_PEST_INVOICES) || DEFAULT_PEST_INVOICES
  );
  const [wasteLogs, setWasteLogs] = useState<WasteLog[]>(() =>
    withoutDemo(getStoredData<WasteLog[]>(STORAGE_KEYS.WASTE_LOGS, DEFAULT_WASTE_LOGS) || DEFAULT_WASTE_LOGS)
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

  // Connexion à l'imprimante (QZ Tray) dès l'ouverture, sans ralentir le démarrage
  useEffect(() => {
    const t = setTimeout(() => {
      import('./services/qzPrinter').then((m) => m.qzWarmUp());
    }, 1500);
    return () => clearTimeout(t);
  }, []);

  // ===== Synchronisation multi-appareils (Supabase) =====
  // Dernières valeurs locales, lisibles depuis les callbacks de synchro
  const localRef = useRef({ targets, records, receipts, secondaryDlc, cleaningTasks, cleaningLogs });
  useEffect(() => {
    localRef.current = { targets, records, receipts, secondaryDlc, cleaningTasks, cleaningLogs };
  }, [targets, records, receipts, secondaryDlc, cleaningTasks, cleaningLogs]);
  const pushingRef = useRef(false);
  const pushGenRef = useRef(0); // change à chaque envoi : une lecture lancée avant est alors ignorée

  const markSynced = () =>
    setLastSyncedTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));

  // Envoi des changements locaux (uniquement ce qui a changé, suppressions comprises)
  const pushPending = useCallback(async () => {
    if (!isSupabaseConfigured() || pushingRef.current) return;
    const local = localRef.current;
    const collections: [SyncCollection, { id: string }[]][] = [
      ['targets', local.targets],
      ['records', local.records],
      ['receipts', local.receipts],
      ['secondaryDlc', local.secondaryDlc],
      ['cleaningTasks', local.cleaningTasks],
      ['cleaningLogs', local.cleaningLogs],
    ];
    const work = collections
      .map(([collection, list]) => ({ collection, ...pendingChanges(collection, list) }))
      .filter((w) => w.upserts.length > 0 || w.deletes.length > 0);
    if (work.length === 0) return;

    pushingRef.current = true;
    pushGenRef.current += 1;
    let allOk = true;
    try {
      for (const { collection, upserts, deletes } of work) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ok = await pushChangesToSupabase(collection, upserts as any, deletes);
        if (ok) markPushed(collection, upserts, deletes);
        else allOk = false;
      }
    } finally {
      pushingRef.current = false;
    }
    if (allOk) {
      markSynced();
      // Des changements faits pendant l'envoi ? On les envoie aussitôt.
      setTimeout(() => pushPendingRef.current(), 300);
    }
  }, []);
  const pushPendingRef = useRef(pushPending);

  const syncFromRemote = useCallback(async () => {
    if (!isSupabaseConfigured() || pushingRef.current) return;
    const genAtStart = pushGenRef.current;
    const data = await fetchAllFromSupabase();
    if (!data) return; // lecture incomplète : on ne touche à rien
    if (pushingRef.current || pushGenRef.current !== genAtStart) return; // un envoi a eu lieu entre-temps : lecture périmée
    const local = localRef.current;
    const apply = <T extends { id: string }>(
      collection: SyncCollection,
      remote: T[],
      current: T[],
      setter: (v: T[]) => void
    ) => {
      const merged = mergeRemote(collection, remote, current);
      if (JSON.stringify(merged) !== JSON.stringify(current)) setter(merged);
    };
    apply('targets', data.targets, local.targets, setTargets);
    apply(
      'records',
      data.records.filter((r) => r.userId !== 'anonymous_iot' && !r.userName?.includes('IoT')),
      local.records,
      setRecords
    );
    apply('receipts', data.receipts, local.receipts, setReceipts);
    apply('secondaryDlc', withoutDemo(data.secondaryDlc), local.secondaryDlc, setSecondaryDlc);
    apply('cleaningTasks', data.cleaningTasks, local.cleaningTasks, setCleaningTasks);
    apply('cleaningLogs', data.cleaningLogs, local.cleaningLogs, setCleaningLogs);
    markSynced();
  }, []);

  useEffect(() => {
    const fullSync = async () => {
      await pushPending(); // d'abord ce qui attend sur cet appareil (ex. saisi hors-ligne)
      await syncFromRemote();
    };
    fullSync();
    const unsubscribe = isSupabaseConfigured() ? subscribeToSupabaseRealtime(syncFromRemote) : () => {};

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fullSync();
    };
    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', fullSync);
    window.addEventListener('online', fullSync);
    // Filet de sécurité si le temps réel est coupé, et nouvel essai des envois échoués
    const interval = setInterval(fullSync, 60000);

    return () => {
      unsubscribe();
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', fullSync);
      window.removeEventListener('online', fullSync);
      clearInterval(interval);
    };
  }, [pushPending, syncFromRemote]);

  useEffect(() => {
    const timer = setTimeout(pushPending, 800);
    return () => clearTimeout(timer);
  }, [targets, records, receipts, secondaryDlc, cleaningTasks, cleaningLogs, pushPending]);

  // Sauvegarde locale (fonctionne aussi hors-ligne)
  useEffect(() => setStoredData(STORAGE_KEYS.CURRENT_USER, currentUser), [currentUser]);
  useEffect(() => setStoredData(STORAGE_KEYS.TEMPERATURE_TARGETS, targets), [targets]);
  useEffect(() => setStoredData(STORAGE_KEYS.TEMPERATURE_RECORDS, records), [records]);
  useEffect(() => setStoredData(STORAGE_KEYS.GOODS_RECEIPTS, receipts), [receipts]);
  useEffect(() => setStoredData(STORAGE_KEYS.SECONDARY_DLC, secondaryDlc), [secondaryDlc]);
  useEffect(() => setStoredData(STORAGE_KEYS.CLEANING_TASKS, cleaningTasks), [cleaningTasks]);
  useEffect(() => setStoredData(STORAGE_KEYS.CLEANING_LOGS, cleaningLogs), [cleaningLogs]);
  useEffect(() => setStoredData(STORAGE_KEYS.INCIDENTS, incidents), [incidents]);
  useEffect(() => setStoredData(STORAGE_KEYS.PEST_STATIONS, pestStations), [pestStations]);
  useEffect(() => setStoredData(STORAGE_KEYS.PEST_INTERVENTIONS, pestInterventions), [pestInterventions]);
  useEffect(() => setStoredData(STORAGE_KEYS.PEST_INVOICES, pestInvoices), [pestInvoices]);
  useEffect(() => setStoredData(STORAGE_KEYS.WASTE_LOGS, wasteLogs), [wasteLogs]);
  useEffect(() => setStoredData(STORAGE_KEYS.DDPP_AUDIT_POINTS, auditPoints), [auditPoints]);

  // Nettoyage : remise "à faire" automatique selon la fréquence (l'historique, lui, est conservé)
  useEffect(() => {
    const resetDueTasks = () =>
      setCleaningTasks((prev) => {
        let changed = false;
        const next = prev.map((t) => {
          if (!t.completed || !isCleaningDueAgain(t)) return t;
          changed = true;
          return { ...t, completed: false, completedAt: undefined, completedBy: undefined, notes: undefined, photoUrl: undefined };
        });
        return changed ? next : prev;
      });
    const first = setTimeout(resetDueTasks, 0);
    const interval = setInterval(resetDueTasks, 10 * 60 * 1000);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, []);

  // Navigation : le bouton retour du téléphone revient à l'écran précédent au lieu de fermer l'app
  const activeTabRef = useRef(activeTab);
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);
  const goToTab = useCallback((tab: TabType | 'home') => {
    if (activeTabRef.current === tab) return;
    window.history.pushState({ tab }, '', tab === 'home' ? window.location.pathname : `?tab=${tab}`);
    setActiveTab(tab);
  }, []);

  useEffect(() => {
    const onPopState = (e: PopStateEvent) => {
      const tab = (e.state?.tab as TabType | 'home' | undefined) ?? readTabFromUrl();
      setActiveTab(tab);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

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

  const todayStr = new Date().toDateString();
  const pendingTemperaturesCount = safeTargets.filter(
    (t) => !t.lastChecked || new Date(t.lastChecked).toDateString() !== todayStr
  ).length;
  const pendingCleaningCount = safeCleaningTasks.filter((t) => !t.completed).length;

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
    const finalOperator = customOperatorName || currentUser?.name || 'Inconnu';
    const now = new Date();

    const newRecord: TemperatureRecord = {
      id: 'rec_' + now.getTime() + '_' + Math.random().toString(36).substring(2, 6),
      targetId,
      targetName: target.name,
      value: tempValue,
      minTemp: target.minTemp,
      maxTemp: target.maxTemp,
      status: isAlert ? 'alerte' : 'conforme',
      timestamp: now.toISOString(),
      userId: currentUser?.id || 'inconnu',
      userName: finalOperator,
      period: now.getHours() < 12 ? 'Matin' : 'Soir',
      correctiveAction,
    };
    setRecords((prev) => [...(prev || []), newRecord]);
    setTargets((prev) =>
      (prev || []).map((t) =>
        t.id === targetId
          ? {
              ...t,
              currentTemp: tempValue,
              status: isAlert ? 'alerte' : 'conforme',
              lastChecked: now.toISOString(),
              checkedBy: finalOperator,
              correctiveAction: correctiveAction || undefined,
            }
          : t
      )
    );
  };

  const handleDeleteTemperatureRecord = (id: string) => {
    setRecords((prev) => (prev || []).filter((r) => r.id !== id));
  };

  const handleAddEquipment = (newEquipment: Omit<TemperatureTarget, 'id' | 'status'>) => {
    const created: TemperatureTarget = {
      ...newEquipment,
      id: 'eq_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      status: 'non_verifie',
    };
    setTargets((prev) => [...(prev || []), created]);
  };

  const handleDeleteEquipment = (id: string) => {
    setTargets((prev) => (prev || []).filter((t) => t.id !== id));
  };

  const handleUpdateEquipment = (id: string, updates: Partial<TemperatureTarget>) => {
    setTargets((prev) => (prev || []).map((t) => (t.id === id ? { ...t, ...updates } : t)));
  };

  const handleClearAllEquipment = () => {
    setTargets([]);
  };

  // Chaque validation de nettoyage ajoute une ligne datée à l'historique (preuve du PND)
  const addCleaningLog = (task: CleaningTask, completedBy: string, completedAt: string, notes?: string, photoUrl?: string) => {
    const log: CleaningTask = {
      id: CLEANING_LOG_PREFIX + task.id + '_' + Date.now(),
      name: task.name,
      zone: task.zone,
      frequency: task.frequency,
      period: task.period,
      completed: true,
      completedAt,
      completedBy,
      instructions: '',
      notes,
      photoUrl,
    };
    setCleaningLogs((prev) => [log, ...(prev || [])]);
  };

  // Décocher par erreur : on retire la validation du jour de l'historique
  const removeTodayCleaningLog = (taskId: string) => {
    setCleaningLogs((prev) => {
      const idx = (prev || []).findIndex(
        (l) =>
          l.id.startsWith(CLEANING_LOG_PREFIX + taskId + '_') &&
          !!l.completedAt &&
          new Date(l.completedAt).toDateString() === new Date().toDateString()
      );
      return idx === -1 ? prev : prev.filter((_, i) => i !== idx);
    });
  };

  const handleToggleCleaningTask = (taskId: string) => {
    const task = (cleaningTasks || []).find((t) => t.id === taskId);
    if (!task) return;
    handleUpdateCleaningTask(taskId, !task.completed, currentUser?.name);
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
    const task = (cleaningTasks || []).find((t) => t.id === taskId);
    if (!task) return;
    const who = completedBy || currentUser?.name || 'Utilisateur';
    const when = completedAt || new Date().toISOString();

    if (completed && !task.completed) addCleaningLog(task, who, when, notes, photoUrl);
    if (!completed && task.completed) removeTodayCleaningLog(taskId);

    setCleaningTasks((prev) =>
      (prev || []).map((t) =>
        t.id === taskId
          ? {
              ...t,
              completed,
              completedAt: completed ? when : undefined,
              completedBy: completed ? who : undefined,
              notes: completed ? notes : undefined,
              photoUrl: completed ? photoUrl : undefined,
              machinePhotoUrl: machinePhotoUrl !== undefined ? machinePhotoUrl : t.machinePhotoUrl,
            }
          : t
      )
    );
  };

  const handleAddCleaningTask = (newTask: Omit<CleaningTask, 'id'>) => {
    const item: CleaningTask = {
      ...newTask,
      id: 'cl_machine_' + Date.now(),
      completed: false,
    };
    setCleaningTasks((prev) => [...(prev || []), item]);
  };

  const handleDeleteCleaningTask = (taskId: string) => {
    setCleaningTasks((prev) => (prev || []).filter((t) => t.id !== taskId));
  };

  const handleResetCleaningTasks = () => {
    if (!window.confirm('Remettre toutes les machines "à faire" ? L’historique des nettoyages déjà faits est conservé.')) return;
    setCleaningTasks((prev) =>
      (prev || []).map((t) => ({
        ...t,
        completed: false,
        completedAt: undefined,
        completedBy: undefined,
        notes: undefined,
        photoUrl: undefined,
      }))
    );
  };

  const handleAddReceipt = (newRec: Omit<GoodsReceipt, 'id'>) => {
    const item: GoodsReceipt = {
      ...newRec,
      id: 'rec_goods_' + Date.now(),
    };
    setReceipts((prev) => [item, ...(prev || [])]);
  };

  const handleAddBatchReceipts = (batch: Omit<GoodsReceipt, 'id'>[]) => {
    const newItems: GoodsReceipt[] = batch.map((r, idx) => ({
      ...r,
      id: 'rec_goods_' + (Date.now() + idx) + '_' + Math.random().toString(36).substring(2, 6),
    }));
    setReceipts((prev) => [...newItems, ...(prev || [])]);
  };

  const handleDeleteReceipt = (id: string) => {
    setReceipts((prev) => (prev || []).filter((r) => r.id !== id));
  };

  const handleAddSecondaryDlc = (newItem: Omit<SecondaryDlcItem, 'id'>) => {
    const item: SecondaryDlcItem = {
      ...newItem,
      id: 'dlc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    };
    setSecondaryDlc((prev) => [item, ...(prev || [])]);
  };

  const handleDeleteSecondaryDlc = (id: string) => {
    setSecondaryDlc((prev) => (prev || []).filter((item) => item.id !== id));
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
              lastChecked: new Date().toLocaleString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              }),
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
    setWasteLogs((prev) => (prev || []).filter((w) => w.id !== id));
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
    try {
      await syncFromRemote();
    } finally {
      setIsCloudSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* 1. Header with Brand & Logo & Profile */}
      <Header
        onGoHome={() => goToTab('home')}
        onOpenPinModal={() => setShowPinModal(true)}
        onOpenHistory={() => goToTab('audit_report')}
        onOpenGuide={() => goToTab('user_guide')}
        currentUser={currentUser}
        isHome={activeTab === 'home'}
      />

      {/* 2. Desktop Navigation Bar */}
      <div className="hidden md:block">
        <Navigation
          activeTab={activeTab === 'home' ? null : activeTab}
          onTabChange={goToTab}
          pendingTemperaturesCount={pendingTemperaturesCount}
          pendingCleaningCount={pendingCleaningCount}
        />
      </div>

      {/* 3. Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        <Suspense fallback={<div className="py-20 text-center text-slate-500 text-sm">Chargement…</div>}>
        
        {/* Back Button when inside a sub-module */}
        {/* Dashboard Grid (Shown when activeTab === 'home') */}
        {activeTab === 'home' && (
          <MobileDashboard
            onSelectModule={goToTab}
            pendingTemperaturesCount={pendingTemperaturesCount}
            pendingCleaningCount={pendingCleaningCount}
            pestStationsCount={safePestStations.length}
            onReportIncident={() => setShowIncidentModal(true)}
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
            onGoHome={() => goToTab('home')}
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
            tasks={cleaningLogs}
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
          <UserGuideModule onClose={() => goToTab('home')} />
        )}
        </Suspense>
      </main>

      {/* Mobile Bottom Bar */}
      <MobileNavBar
        activeTab={activeTab}
        onSelectTab={goToTab}
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
