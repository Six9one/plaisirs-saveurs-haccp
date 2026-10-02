/**
 * Cloud Synchronization Service for Plaisirs & Saveurs HACCP
 * Enables real-time cross-device data & photo synchronization across phones, tablets, and computers.
 */

import type {
  TemperatureTarget,
  TemperatureRecord,
  GoodsReceipt,
  SecondaryDlcItem,
  CleaningTask,
  PestBaitStation,
  WasteLog,
} from '../types';

export interface CloudHaccpState {
  targets: TemperatureTarget[];
  records: TemperatureRecord[];
  receipts: GoodsReceipt[];
  secondaryDlc: SecondaryDlcItem[];
  cleaningTasks: CleaningTask[];
  pestStations: PestBaitStation[];
  wasteLogs: WasteLog[];
  lastUpdated: string;
  updatedByDevice?: string;
}

const DEFAULT_STORE_ID = 'plaisirs-saveurs-principal';
const STORAGE_SYNC_KEY = 'haccp_cloud_sync_store_id';
const STORAGE_DEVICE_ID_KEY = 'haccp_cloud_device_id';

// Generate or retrieve persistent unique Device ID
export const getDeviceId = (): string => {
  let deviceId = localStorage.getItem(STORAGE_DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = 'dev_' + Math.random().toString(36).substring(2, 9) + '_' + (navigator.userAgent.includes('Mobile') ? 'mobile' : 'desktop');
    localStorage.setItem(STORAGE_DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
};

// Retrieve active Store ID (from URL parameter or localStorage)
export const getActiveStoreId = (): string => {
  // Check if URL has ?sync=MY_STORE_ID
  const urlParams = new URLSearchParams(window.location.search);
  const paramSync = urlParams.get('sync');
  if (paramSync && paramSync.trim()) {
    const cleanId = paramSync.trim().toLowerCase();
    localStorage.setItem(STORAGE_SYNC_KEY, cleanId);
    return cleanId;
  }

  const stored = localStorage.getItem(STORAGE_SYNC_KEY);
  if (stored && stored.trim()) {
    return stored.trim();
  }

  return DEFAULT_STORE_ID;
};

// Set active Store ID manually
export const setActiveStoreId = (storeId: string): void => {
  const cleanId = storeId.trim().toLowerCase() || DEFAULT_STORE_ID;
  localStorage.setItem(STORAGE_SYNC_KEY, cleanId);
};

// Push full state to Cloud
export const pushStateToCloud = async (
  storeId: string,
  state: CloudHaccpState
): Promise<boolean> => {
  try {
    const payload: CloudHaccpState = {
      ...state,
      lastUpdated: new Date().toISOString(),
      updatedByDevice: getDeviceId(),
    };

    // 1. Broadcast locally to other tabs/windows
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel(`haccp_sync_${storeId}`);
      channel.postMessage({ type: 'STATE_UPDATE', payload });
      channel.close();
    }

    // 2. Cloud Serverless Storage Persistence
    // Using cloud KV store API with fallback to cloud key-value bin
    const res = await fetch(`https://kvdb.io/4y9yN5F1gJd7uP9xQv7d7K/haccp_${storeId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return res.ok;
  } catch (error) {
    console.warn('[CloudSync] Failed to push to remote cloud, cached locally:', error);
    return false;
  }
};

// Fetch full state from Cloud
export const fetchStateFromCloud = async (
  storeId: string
): Promise<CloudHaccpState | null> => {
  try {
    const res = await fetch(`https://kvdb.io/4y9yN5F1gJd7uP9xQv7d7K/haccp_${storeId}?nocache=${Date.now()}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    return data as CloudHaccpState;
  } catch (error) {
    console.warn('[CloudSync] Failed to fetch from remote cloud:', error);
    return null;
  }
};

// Real-time Cloud Subscriber / Poller
export const subscribeToCloudSync = (
  storeId: string,
  onRemoteUpdate: (state: CloudHaccpState) => void
): (() => void) => {
  let isStopped = false;
  let lastSeenTimestamp = '';

  // 1. Listen to Local BroadcastChannel for instant same-device tab sync
  let localChannel: BroadcastChannel | null = null;
  if ('BroadcastChannel' in window) {
    localChannel = new BroadcastChannel(`haccp_sync_${storeId}`);
    localChannel.onmessage = (event) => {
      if (event.data?.type === 'STATE_UPDATE' && event.data.payload) {
        const incoming = event.data.payload as CloudHaccpState;
        if (incoming.updatedByDevice !== getDeviceId()) {
          onRemoteUpdate(incoming);
        }
      }
    };
  }

  // 2. Cloud Remote Polling (every 6 seconds when online)
  const pollCloud = async () => {
    if (isStopped || !navigator.onLine) return;

    try {
      const cloudData = await fetchStateFromCloud(storeId);
      if (cloudData && cloudData.lastUpdated && cloudData.lastUpdated !== lastSeenTimestamp) {
        // If update was from another device and is newer
        if (cloudData.updatedByDevice !== getDeviceId()) {
          lastSeenTimestamp = cloudData.lastUpdated;
          onRemoteUpdate(cloudData);
        }
      }
    } catch (err) {
      // Quiet fail on network hiccup
    }
  };

  // Initial fetch
  pollCloud();

  // Periodic interval
  const timer = setInterval(pollCloud, 30000);

  // When device comes back online, immediately poll
  const handleOnline = () => {
    pollCloud();
  };
  window.addEventListener('online', handleOnline);

  // Return unsubscribe cleanup function
  return () => {
    isStopped = true;
    clearInterval(timer);
    window.removeEventListener('online', handleOnline);
    if (localChannel) {
      localChannel.close();
    }
  };
};
