/**
 * Supabase Client & Realtime Sync Service for Plaisirs & Saveurs HACCP
 * Strictly isolated tables with prefix: ps_haccp_* (Zero collision with other projects)
 */

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  TemperatureTarget,
  TemperatureRecord,
  GoodsReceipt,
  SecondaryDlcItem,
  CleaningTask,
} from '../types';

const STORAGE_SUPABASE_URL_KEY = 'haccp_supabase_url';
const STORAGE_SUPABASE_KEY_KEY = 'haccp_supabase_anon_key';
const DEFAULT_SUPABASE_URL = 'https://hsylnrzxeyqxczdalurj.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzeWxucnp4ZXlxeGN6ZGFsdXJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4ODIzMDksImV4cCI6MjA4MTQ1ODMwOX0.LmDeLvw6vHO7mjHi2qWeWwIEaNDutZ1spsahUGxEAnc';

export const getSupabaseConfig = (): { url: string; anonKey: string } => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  const storedUrl = localStorage.getItem(STORAGE_SUPABASE_URL_KEY) || envUrl || DEFAULT_SUPABASE_URL;
  const storedKey = localStorage.getItem(STORAGE_SUPABASE_KEY_KEY) || envKey || DEFAULT_SUPABASE_ANON_KEY;

  return {
    url: storedUrl.trim(),
    anonKey: storedKey.trim(),
  };
};

export const saveSupabaseConfig = (url: string, anonKey: string): void => {
  localStorage.setItem(STORAGE_SUPABASE_URL_KEY, url.trim());
  localStorage.setItem(STORAGE_SUPABASE_KEY_KEY, anonKey.trim());
  supabaseInstance = null;
};

export const isSupabaseConfigured = (): boolean => {
  const config = getSupabaseConfig();
  return Boolean(config.url && config.anonKey && config.url.startsWith('http'));
};

let supabaseInstance: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient | null => {
  if (supabaseInstance) return supabaseInstance;

  const { url, anonKey } = getSupabaseConfig();
  if (url && anonKey && url.startsWith('http')) {
    try {
      supabaseInstance = createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
      return supabaseInstance;
    } catch (e) {
      console.error('[Supabase] Init error:', e);
      return null;
    }
  }

  return null;
};

/**
 * Uploads a base64 photo to dedicated Supabase Storage bucket 'ps-haccp-photos'
 */
export const uploadPhotoToSupabase = async (
  base64DataUrl: string,
  fileNamePrefix: string = 'photo',
  bucketName: string = 'ps-haccp-photos'
): Promise<string> => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return base64DataUrl;
  }

  try {
    const res = await fetch(base64DataUrl);
    const blob = await res.blob();
    const extension = blob.type.split('/')[1] || 'jpg';
    const filePath = `plaisirs_saveurs/${fileNamePrefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, blob, {
        contentType: blob.type,
        upsert: true,
      });

    if (uploadError) {
      console.warn('[Supabase Storage] Upload warning:', uploadError.message);
      return base64DataUrl;
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl || base64DataUrl;
  } catch (err) {
    console.warn('[Supabase Storage] Catch warning:', err);
    return base64DataUrl;
  }
};

/**
 * Real-time Supabase Database Sync for all Plaisirs & Saveurs tables
 */
export const subscribeToSupabaseRealtime = (
  onRemoteChange: () => void
): (() => void) => {
  const supabase = getSupabaseClient();
  if (!supabase) return () => {};

  const channel = supabase
    .channel('ps_haccp_realtime_channel')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'ps_haccp_targets' }, () => onRemoteChange())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'ps_haccp_records' }, () => onRemoteChange())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'ps_haccp_receipts' }, () => onRemoteChange())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'ps_haccp_secondary_dlc' }, () => onRemoteChange())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'ps_haccp_cleaning_tasks' }, () => onRemoteChange())
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

/**
 * Lecture d'une table complète, page par page (aucune limite à 100 lignes : tout l'historique est conservé).
 * Renvoie null en cas d'erreur, pour ne jamais fusionner une liste incomplète.
 */
const PAGE_SIZE = 1000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

const fetchWholeTable = async (supabase: SupabaseClient, table: string, orderBy?: string): Promise<Row[] | null> => {
  const rows: Row[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    let query = supabase.from(table).select('*');
    if (orderBy) query = query.order(orderBy, { ascending: true });
    const { data, error } = await query.range(from, from + PAGE_SIZE - 1);
    if (error) {
      console.warn(`[Supabase] lecture ${table} impossible :`, error.message);
      return null;
    }
    rows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
};

const fromTargetRow = (t: Row): TemperatureTarget => ({
  id: t.id,
  name: t.name,
  type: t.type,
  zone: t.zone || 'Fournil',
  minTemp: Number(t.min_temp),
  maxTemp: Number(t.max_temp),
  currentTemp: t.current_temp !== null && t.current_temp !== undefined ? Number(t.current_temp) : undefined,
  photoUrl: t.photo_url || undefined,
  lastChecked: t.last_checked || undefined,
  status:
    t.current_temp === null || t.current_temp === undefined
      ? 'non_verifie'
      : Number(t.current_temp) >= Number(t.min_temp) && Number(t.current_temp) <= Number(t.max_temp)
      ? 'conforme'
      : 'alerte',
});

const fromRecordRow = (r: Row): TemperatureRecord => ({
  id: r.id,
  targetId: r.target_id,
  targetName: r.target_name,
  value: Number(r.temp_value),
  minTemp: r.min_allowed !== null ? Number(r.min_allowed) : 0,
  maxTemp: r.max_allowed !== null ? Number(r.max_allowed) : 4,
  status: r.status === 'alerte' ? 'alerte' : 'conforme',
  timestamp: r.recorded_at,
  userId: r.user_id || 'inconnu',
  userName: r.operator_name || 'Inconnu',
  period: r.period || (new Date(r.recorded_at).getHours() < 12 ? 'Matin' : 'Soir'),
  correctiveAction: r.notes || undefined,
});

const fromReceiptRow = (r: Row): GoodsReceipt => ({
  id: r.id,
  supplier: r.supplier,
  category: r.category,
  truckTemp: r.truck_temp !== null ? Number(r.truck_temp) : undefined,
  isTempCompliant: r.is_temp_compliant,
  isPackageIntact: r.is_package_intact,
  timestamp: r.timestamp,
  receivedBy: r.received_by,
  invoicePhotoUrl: r.invoice_photo_url || undefined,
  goodsPhotoUrl: r.goods_photo_url || undefined,
  photoUrl: r.invoice_photo_url || r.goods_photo_url || undefined,
  status: r.status,
  notes: r.notes || undefined,
});

const fromDlcRow = (d: Row): SecondaryDlcItem => ({
  id: d.id,
  productName: d.product_name,
  category: d.category,
  prepDate: d.prep_date,
  durationHours: Number(d.duration_hours),
  expiryDate: d.expiry_date,
  preparedBy: d.prepared_by,
  storageTemp: d.storage_temp || '+2°C à +4°C',
  notes: d.notes || undefined,
});

const fromCleaningRow = (c: Row): CleaningTask => ({
  id: c.id,
  name: c.name,
  zone: c.zone,
  frequency: c.frequency,
  period: c.period || undefined,
  completed: Boolean(c.completed),
  completedAt: c.completed_at || undefined,
  completedBy: c.completed_by || undefined,
  instructions: c.instructions || '',
  // Pour les entrées d'historique, la remarque est stockée dans "instructions"
  ...(String(c.id).startsWith('cl_log_') ? { notes: c.instructions || undefined } : {}),
});

/** Les identifiants des entrées d'historique de nettoyage (stockées dans la même table que les machines). */
export const CLEANING_LOG_PREFIX = 'cl_log_';

export const fetchAllFromSupabase = async (): Promise<{
  targets: TemperatureTarget[];
  records: TemperatureRecord[];
  receipts: GoodsReceipt[];
  secondaryDlc: SecondaryDlcItem[];
  cleaningTasks: CleaningTask[];
  cleaningLogs: CleaningTask[];
} | null> => {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const [targets, records, receipts, dlc, cleaning] = await Promise.all([
      fetchWholeTable(supabase, 'ps_haccp_targets'),
      fetchWholeTable(supabase, 'ps_haccp_records', 'created_at'),
      fetchWholeTable(supabase, 'ps_haccp_receipts', 'created_at'),
      fetchWholeTable(supabase, 'ps_haccp_secondary_dlc', 'created_at'),
      fetchWholeTable(supabase, 'ps_haccp_cleaning_tasks'),
    ]);
    if (!targets || !records || !receipts || !dlc || !cleaning) return null;

    const allCleaning = cleaning.map(fromCleaningRow);
    return {
      targets: targets.map(fromTargetRow),
      records: records.map(fromRecordRow),
      receipts: receipts.map(fromReceiptRow),
      secondaryDlc: dlc.map(fromDlcRow),
      cleaningTasks: allCleaning.filter((t) => !t.id.startsWith(CLEANING_LOG_PREFIX)),
      cleaningLogs: allCleaning.filter((t) => t.id.startsWith(CLEANING_LOG_PREFIX)),
    };
  } catch (err) {
    console.error('[Supabase] fetch error:', err);
    return null;
  }
};

const uploadIfBase64 = async (url: string | undefined, prefix: string) =>
  url && url.startsWith('data:image') ? uploadPhotoToSupabase(url, prefix) : url;

const toRowFns = {
  targets: async (t: TemperatureTarget) => ({
    id: t.id,
    name: t.name,
    type: t.type,
    zone: t.zone || 'Fournil',
    min_temp: t.minTemp,
    max_temp: t.maxTemp,
    current_temp: t.currentTemp ?? null,
    photo_url: (await uploadIfBase64(t.photoUrl, 'frigo')) ?? null,
    last_checked: t.lastChecked ?? null,
  }),
  records: async (r: TemperatureRecord) => ({
    id: r.id,
    target_id: r.targetId,
    target_name: r.targetName,
    temp_value: r.value,
    min_allowed: r.minTemp,
    max_allowed: r.maxTemp,
    is_compliant: r.status === 'conforme',
    recorded_at: r.timestamp,
    operator_name: r.userName,
    status: r.status,
    notes: r.correctiveAction ?? null,
  }),
  receipts: async (r: GoodsReceipt) => ({
    id: r.id,
    supplier: r.supplier,
    category: r.category || 'Courses / Marchandises',
    truck_temp: r.truckTemp ?? null,
    is_temp_compliant: r.isTempCompliant ?? true,
    is_package_intact: r.isPackageIntact ?? true,
    timestamp: r.timestamp,
    received_by: r.receivedBy || 'Utilisateur',
    invoice_photo_url: (await uploadIfBase64(r.invoicePhotoUrl, 'facture')) ?? null,
    goods_photo_url: (await uploadIfBase64(r.goodsPhotoUrl, 'marchandise')) ?? null,
    status: r.status,
    notes: r.notes ?? null,
  }),
  secondaryDlc: async (d: SecondaryDlcItem) => ({
    id: d.id,
    product_name: d.productName,
    category: d.category,
    prep_date: d.prepDate,
    duration_hours: d.durationHours,
    expiry_date: d.expiryDate,
    prepared_by: d.preparedBy,
    storage_temp: d.storageTemp ?? '+2°C à +4°C',
    notes: d.notes ?? null,
  }),
  cleaningTasks: async (c: CleaningTask) => ({
    id: c.id,
    name: c.name,
    zone: c.zone,
    frequency: c.frequency,
    period: c.period ?? null,
    completed: c.completed,
    completed_at: c.completedAt ?? null,
    completed_by: c.completedBy ?? null,
    instructions: c.instructions ?? null,
  }),
  cleaningLogs: async (c: CleaningTask) => ({
    id: c.id,
    name: c.name,
    zone: c.zone,
    frequency: c.frequency,
    period: c.period ?? null,
    completed: true,
    completed_at: c.completedAt ?? null,
    completed_by: c.completedBy ?? null,
    instructions: c.notes ?? null,
  }),
};

const TABLES = {
  targets: 'ps_haccp_targets',
  records: 'ps_haccp_records',
  receipts: 'ps_haccp_receipts',
  secondaryDlc: 'ps_haccp_secondary_dlc',
  cleaningTasks: 'ps_haccp_cleaning_tasks',
  cleaningLogs: 'ps_haccp_cleaning_tasks',
} as const;

/**
 * Envoie uniquement ce qui a changé sur cet appareil (ajouts, modifications, suppressions).
 * Renvoie true seulement si tout a été accepté par Supabase.
 */
export const pushChangesToSupabase = async <K extends keyof typeof toRowFns>(
  collection: K,
  upserts: Parameters<(typeof toRowFns)[K]>[0][],
  deletes: string[]
): Promise<boolean> => {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  const table = TABLES[collection];
  try {
    if (upserts.length > 0) {
      const toRow = toRowFns[collection] as (item: unknown) => Promise<Row>;
      const rows = await Promise.all(upserts.map((it) => toRow(it)));
      const { error } = await supabase.from(table).upsert(rows);
      if (error) {
        console.warn(`[Supabase] envoi ${table} refusé :`, error.message);
        return false;
      }
    }
    if (deletes.length > 0) {
      const { error } = await supabase.from(table).delete().in('id', deletes);
      if (error) {
        console.warn(`[Supabase] suppression ${table} refusée :`, error.message);
        return false;
      }
    }
    return true;
  } catch (err) {
    console.error('[Supabase] push error:', err);
    return false;
  }
};

/**
 * The exact isolated SQL Schema to run in Supabase SQL Editor
 */
export const SUPABASE_SQL_SCHEMA = `-- 🥐 PLAISIRS & SAVEURS • TABLES 100% ISOLÉES (Préfixe: ps_haccp_)
-- Aucune interférence avec Twin Pizza ou Allstar Academy

-- 1. Table des Équipements (Frigos & Congélateurs)
CREATE TABLE IF NOT EXISTS ps_haccp_targets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  zone TEXT DEFAULT 'Général',
  min_temp NUMERIC NOT NULL,
  max_temp NUMERIC NOT NULL,
  target_temp NUMERIC NOT NULL,
  current_temp NUMERIC,
  photo_url TEXT,
  last_checked TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Table des Relevés de Température
CREATE TABLE IF NOT EXISTS ps_haccp_records (
  id TEXT PRIMARY KEY,
  target_id TEXT NOT NULL,
  target_name TEXT NOT NULL,
  temp_value NUMERIC NOT NULL,
  min_allowed NUMERIC,
  max_allowed NUMERIC,
  is_compliant BOOLEAN DEFAULT TRUE,
  recorded_at TEXT NOT NULL,
  operator_name TEXT NOT NULL,
  status TEXT DEFAULT 'conforme',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Table des Réceptions de Marchandises & Courses
CREATE TABLE IF NOT EXISTS ps_haccp_receipts (
  id TEXT PRIMARY KEY,
  supplier TEXT NOT NULL,
  category TEXT DEFAULT 'Courses / Marchandises',
  truck_temp NUMERIC,
  is_temp_compliant BOOLEAN DEFAULT TRUE,
  is_package_intact BOOLEAN DEFAULT TRUE,
  timestamp TEXT NOT NULL,
  received_by TEXT NOT NULL,
  invoice_photo_url TEXT,
  goods_photo_url TEXT,
  status TEXT DEFAULT 'conforme',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Table des Étiquettes DLC Secondaires
CREATE TABLE IF NOT EXISTS ps_haccp_secondary_dlc (
  id TEXT PRIMARY KEY,
  product_name TEXT NOT NULL,
  category TEXT NOT NULL,
  prep_date TEXT NOT NULL,
  duration_hours NUMERIC NOT NULL,
  expiry_date TEXT NOT NULL,
  prepared_by TEXT NOT NULL,
  storage_temp TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Table du Plan de Nettoyage
CREATE TABLE IF NOT EXISTS ps_haccp_cleaning_tasks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  zone TEXT NOT NULL,
  frequency TEXT NOT NULL,
  period TEXT,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TEXT,
  completed_by TEXT,
  instructions TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Activer le Realtime pour toutes les tables Plaisirs & Saveurs
ALTER PUBLICATION supabase_realtime ADD TABLE ps_haccp_targets, ps_haccp_records, ps_haccp_receipts, ps_haccp_secondary_dlc, ps_haccp_cleaning_tasks;

-- 7. Créer le Bucket de Stockage Photos Dédié
INSERT INTO storage.buckets (id, name, public) 
VALUES ('ps-haccp-photos', 'ps-haccp-photos', true)
ON CONFLICT (id) DO NOTHING;

-- 8. Règles de Sécurité (RLS Permissif pour l'App)
ALTER TABLE ps_haccp_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ps_haccp_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE ps_haccp_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ps_haccp_secondary_dlc ENABLE ROW LEVEL SECURITY;
ALTER TABLE ps_haccp_cleaning_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on ps_haccp_targets" ON ps_haccp_targets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on ps_haccp_records" ON ps_haccp_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on ps_haccp_receipts" ON ps_haccp_receipts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on ps_haccp_secondary_dlc" ON ps_haccp_secondary_dlc FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on ps_haccp_cleaning_tasks" ON ps_haccp_cleaning_tasks FOR ALL USING (true) WITH CHECK (true);

-- 9. Règle Storage pour les Photos
CREATE POLICY "Public Read ps-haccp-photos" ON storage.objects FOR SELECT USING (bucket_id = 'ps-haccp-photos');
CREATE POLICY "Public Insert ps-haccp-photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'ps-haccp-photos');
CREATE POLICY "Public Update ps-haccp-photos" ON storage.objects FOR UPDATE USING (bucket_id = 'ps-haccp-photos');
CREATE POLICY "Public Delete ps-haccp-photos" ON storage.objects FOR DELETE USING (bucket_id = 'ps-haccp-photos');
`;
