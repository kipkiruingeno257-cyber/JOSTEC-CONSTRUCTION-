import type { SiteImageRecord, SiteImageSlotId, SiteProfileRecord } from '../types';

interface ProfileSyncEntry {
  value: SiteProfileRecord | null;
  ts: number;
}

interface SiteImageSyncEntry {
  value: SiteImageRecord | null;
  ts: number;
}

type SyncMessage =
  | { kind: 'profile'; entry: ProfileSyncEntry }
  | { kind: 'site_image'; slot: SiteImageSlotId; entry: SiteImageSyncEntry };

const CHANNEL_NAME = 'jsm_site_content_sync';
const WINDOW_EVENT = 'jsm:site-content-sync';

let latestProfileOverride: ProfileSyncEntry | null = null;
const latestSiteImagesOverride: Partial<Record<SiteImageSlotId, SiteImageSyncEntry>> = {};

let bc: BroadcastChannel | null = null;
function getChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return null;
  if (!bc) {
    bc = new BroadcastChannel(CHANNEL_NAME);
  }
  return bc;
}

function emitMessage(msg: SyncMessage): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<SyncMessage>(WINDOW_EVENT, { detail: msg }));
  try {
    getChannel()?.postMessage(msg);
  } catch {
    // Ignore BroadcastChannel errors in restricted contexts
  }
}

export function broadcastSiteProfileChange(profile: SiteProfileRecord | null): void {
  const entry: ProfileSyncEntry = {
    value: profile,
    ts: profile?.updatedAtMs || Date.now(),
  };
  latestProfileOverride = entry;
  emitMessage({ kind: 'profile', entry });
}

export function broadcastSiteImageChange(
  slot: SiteImageSlotId,
  record: SiteImageRecord | null
): void {
  const entry: SiteImageSyncEntry = {
    value: record,
    ts: record?.updatedAtMs || Date.now(),
  };
  latestSiteImagesOverride[slot] = entry;
  emitMessage({ kind: 'site_image', slot, entry });
}

export function getLatestProfileOverride(): ProfileSyncEntry | null {
  return latestProfileOverride;
}

export function getLatestSiteImageOverride(slot: SiteImageSlotId): SiteImageSyncEntry | null {
  return latestSiteImagesOverride[slot] ?? null;
}

export function subscribeSiteContentSync(handlers: {
  onProfile?: (entry: ProfileSyncEntry) => void;
  onSiteImage?: (slot: SiteImageSlotId, entry: SiteImageSyncEntry) => void;
}): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleMessage = (msg: SyncMessage | null | undefined) => {
    if (!msg) return;
    if (msg.kind === 'profile') {
      latestProfileOverride = msg.entry;
      handlers.onProfile?.(msg.entry);
    } else if (msg.kind === 'site_image') {
      latestSiteImagesOverride[msg.slot] = msg.entry;
      handlers.onSiteImage?.(msg.slot, msg.entry);
    }
  };

  const onWindowEvent = (evt: Event) => {
    const custom = evt as CustomEvent<SyncMessage>;
    handleMessage(custom.detail);
  };

  const channel = getChannel();
  const onBroadcast = (evt: MessageEvent<SyncMessage>) => {
    handleMessage(evt.data);
  };

  window.addEventListener(WINDOW_EVENT, onWindowEvent);
  channel?.addEventListener('message', onBroadcast);

  return () => {
    window.removeEventListener(WINDOW_EVENT, onWindowEvent);
    channel?.removeEventListener('message', onBroadcast);
  };
}

export function resolveTimestampMs(
  record: { updatedAt?: { toMillis?: () => number } | null; updatedAtMs?: number } | null | undefined
): number {
  if (!record) return 0;
  if (typeof record.updatedAtMs === 'number' && record.updatedAtMs > 0) {
    return record.updatedAtMs;
  }
  if (record.updatedAt && typeof record.updatedAt.toMillis === 'function') {
    return record.updatedAt.toMillis();
  }
  return 0;
}
