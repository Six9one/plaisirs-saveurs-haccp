/**
 * Fusion à 3 voies entre les données locales et Supabase.
 *
 * On garde en mémoire (et dans localStorage) la "base" : la dernière version de chaque
 * élément connue comme identique des deux côtés. Grâce à elle on sait :
 *  - ce qui a été ajouté / modifié sur cet appareil et pas encore envoyé (local ≠ base) ;
 *  - ce qui a été supprimé sur cet appareil (dans la base mais plus en local) ;
 *  - ce qui a été supprimé ailleurs (dans la base mais plus dans le cloud).
 * Ainsi une suppression ne "revient" plus, et une saisie hors-ligne n'est jamais écrasée.
 */

export type SyncCollection = 'targets' | 'records' | 'receipts' | 'secondaryDlc' | 'cleaningTasks' | 'cleaningLogs';

type WithId = { id: string };
type Base = Record<string, string>; // id -> JSON de la version synchronisée

const BASE_KEY = 'sp_sync_base_v1';

// Champs que la table Supabase ne stocke pas : on garde la valeur locale lors de la fusion
const LOCAL_ONLY_FIELDS: Record<SyncCollection, string[]> = {
  targets: ['checkedBy', 'correctiveAction'],
  records: ['userId', 'period'],
  receipts: ['lotNumber', 'dlc'],
  secondaryDlc: ['lotOriginal', 'isFrozenDessert'],
  cleaningTasks: ['shortName', 'photoUrl', 'machinePhotoUrl', 'notes', 'color'],
  cleaningLogs: ['shortName', 'photoUrl', 'machinePhotoUrl', 'color'],
};

let bases: Record<string, Base> = (() => {
  try {
    const raw = localStorage.getItem(BASE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
})();

const saveBases = () => {
  try {
    localStorage.setItem(BASE_KEY, JSON.stringify(bases));
  } catch (e) {
    console.warn('[Sync] Impossible de sauvegarder la base de synchro', e);
  }
};

const json = (v: unknown) => JSON.stringify(v);

/** Ce que cet appareil doit envoyer : éléments nouveaux/modifiés et suppressions. */
export function pendingChanges<T extends WithId>(collection: SyncCollection, local: T[]) {
  const base = bases[collection] || {};
  const localIds = new Set(local.map((it) => it.id));
  const upserts = local.filter((it) => base[it.id] !== json(it));
  const deletes = Object.keys(base).filter((id) => !localIds.has(id));
  return { upserts, deletes };
}

/** À appeler après un envoi réussi. */
export function markPushed<T extends WithId>(collection: SyncCollection, upserts: T[], deletes: string[]) {
  const base = { ...(bases[collection] || {}) };
  upserts.forEach((it) => (base[it.id] = json(it)));
  deletes.forEach((id) => delete base[id]);
  bases = { ...bases, [collection]: base };
  saveBases();
}

/** Fusionne la version cloud avec la version locale sans perdre les changements non envoyés. */
export function mergeRemote<T extends WithId>(collection: SyncCollection, remote: T[], local: T[]): T[] {
  const base = bases[collection] || {};
  const localById = new Map(local.map((it) => [it.id, it]));
  const remoteIds = new Set(remote.map((it) => it.id));
  const keep = LOCAL_ONLY_FIELDS[collection];

  const merged: T[] = [];
  const newBase: Base = {};

  for (const r of remote) {
    const l = localById.get(r.id);
    const locallyDeleted = !l && base[r.id] !== undefined;
    if (locallyDeleted) {
      newBase[r.id] = base[r.id]; // suppression en attente d'envoi
      continue;
    }
    const locallyChanged = l && base[r.id] !== json(l);
    if (l && locallyChanged) {
      merged.push(l); // modification locale en attente d'envoi
      if (base[r.id] !== undefined) newBase[r.id] = base[r.id];
      continue;
    }
    // Version cloud, en gardant les champs que le cloud ne stocke pas
    const item = { ...r } as Record<string, unknown>;
    if (l) {
      for (const f of keep) {
        if (item[f] === undefined && (l as Record<string, unknown>)[f] !== undefined) {
          item[f] = (l as Record<string, unknown>)[f];
        }
      }
    }
    merged.push(item as T);
    newBase[r.id] = json(item);
  }

  // Éléments locaux absents du cloud : nouveaux (on garde) ou supprimés ailleurs (on retire)
  for (const l of local) {
    if (remoteIds.has(l.id)) continue;
    const deletedElsewhere = base[l.id] !== undefined && base[l.id] === json(l);
    if (!deletedElsewhere) merged.push(l);
  }

  bases = { ...bases, [collection]: newBase };
  saveBases();
  return merged;
}
