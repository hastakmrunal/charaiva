import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { RecognitionResult, TravelJournalEntry } from '../types';
import { handleFirestoreError, OperationType } from './userPersistence';

const ALLOWED_CATEGORIES: ReadonlyArray<RecognitionResult['category']> = [
  'monument',
  'temple',
  'fort',
  'museum',
  'landscape',
  'food',
  'plant',
  'object',
  'building',
  'animal',
];

const GUEST_JOURNAL_KEY = 'charaiva_guest_journal_v1';
const UID_CACHE_KEY_PREFIX = 'charaiva_journal_cache_';

function clampStr(val: string | undefined | null, maxLen: number, fallback = ''): string {
  const cleaned = String(val ?? fallback).trim();
  return cleaned.length > maxLen ? cleaned.slice(0, maxLen) : cleaned;
}

function clampStringArray(arr: string[] | undefined, maxItems = 12, maxItemLen = 280): string[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((item) => typeof item === 'string' && item.trim().length > 0)
    .slice(0, maxItems)
    .map((item) => clampStr(item, maxItemLen));
}

export function getTodayDateStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function normalizeVisitDate(dateStr?: string): string {
  const cleaned = (dateStr || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned;
  }
  return getTodayDateStr();
}

export function sanitizeImageUrlForCloud(url?: string): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  // Never store raw base64 data URIs in Firestore documents (1MB document limit + privacy)
  if (trimmed.startsWith('data:')) return '';
  if (trimmed.length > 600) return '';
  return trimmed;
}

export function generateSafeJournalId(seed?: string): string {
  const baseSlug = (seed || 'entry')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32) || 'entry';
  const rand = Math.random().toString(36).replace(/[^a-z0-9]/g, '').slice(0, 6) || 'x';
  return `j_${Date.now()}_${baseSlug}_${rand}`.slice(0, 100);
}

export function normalizeCategory(cat?: string): RecognitionResult['category'] {
  if (cat && ALLOWED_CATEGORIES.includes(cat as RecognitionResult['category'])) {
    return cat as RecognitionResult['category'];
  }
  return 'monument';
}

export function parseLocationParts(
  locationName?: string,
  explicitCity?: string,
  explicitCountry?: string
): { city: string; country: string; locationName: string } {
  const cleanCity = clampStr(explicitCity, 100);
  const cleanCountry = clampStr(explicitCountry, 100);
  const cleanLoc = clampStr(locationName, 200);

  if (cleanCity || cleanCountry) {
    return {
      city: cleanCity,
      country: cleanCountry,
      locationName: cleanLoc || [cleanCity, cleanCountry].filter(Boolean).join(', '),
    };
  }

  if (cleanLoc) {
    const parts = cleanLoc
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length >= 2) {
      return {
        city: clampStr(parts[0], 100),
        country: clampStr(parts[parts.length - 1], 100),
        locationName: cleanLoc,
      };
    }
    return {
      city: clampStr(parts[0], 100),
      country: '',
      locationName: cleanLoc,
    };
  }

  return { city: '', country: '', locationName: '' };
}

function timestampToIso(val: unknown): string {
  if (!val) return new Date().toISOString();
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  if (typeof (val as { toDate?: () => Date }).toDate === 'function') {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof val === 'string') return val;
  return new Date().toISOString();
}

export function sortJournalEntriesNewestFirst(entries: TravelJournalEntry[]): TravelJournalEntry[] {
  return [...entries].sort((a, b) => {
    const dateCompare = (b.visitDate || '').localeCompare(a.visitDate || '');
    if (dateCompare !== 0) return dateCompare;
    const bTime = Date.parse(b.createdAt || b.updatedAt || '') || 0;
    const aTime = Date.parse(a.createdAt || a.updatedAt || '') || 0;
    return bTime - aTime;
  });
}

export function recognitionResultToJournalPayload(
  landmark: RecognitionResult,
  options?: {
    notes?: string;
    visitDate?: string;
    city?: string;
    country?: string;
    visitedConfirmed?: boolean;
  }
): Omit<TravelJournalEntry, 'journalId' | 'userId' | 'createdAt' | 'updatedAt'> {
  const loc = parseLocationParts(
    landmark.locationName,
    options?.city ?? landmark.city ?? landmark.coords?.city,
    options?.country ?? landmark.country ?? landmark.coords?.country
  );

  return {
    placeId: clampStr(landmark.placeId || landmark.id || '', 160),
    placeName: clampStr(landmark.title, 160, 'Unnamed Landmark'),
    city: loc.city,
    country: loc.country,
    locationName: loc.locationName || clampStr(landmark.locationName, 200),
    category: normalizeCategory(landmark.category),
    visitDate: normalizeVisitDate(options?.visitDate ?? landmark.visitDate),
    notes: clampStr(options?.notes ?? landmark.notes ?? '', 2000),
    guideSummary: clampStr(landmark.summary, 1500),
    narration: clampStr(landmark.narration, 6000),
    keyFacts: clampStringArray(landmark.keyFacts, 12, 280),
    tags: clampStringArray(landmark.tags, 12, 60),
    language: clampStr(landmark.language, 60),
    imageUrl: sanitizeImageUrlForCloud(landmark.imageUrl),
    visitedConfirmed:
      options?.visitedConfirmed !== undefined
        ? Boolean(options.visitedConfirmed)
        : Boolean(landmark.visitedConfirmed ?? true),
  };
}

export function journalEntryToRecognitionResult(entry: TravelJournalEntry): RecognitionResult {
  const locDisplay =
    entry.locationName ||
    [entry.city, entry.country].filter(Boolean).join(', ') ||
    'Saved Destination';

  return {
    id: entry.journalId,
    journalId: entry.journalId,
    placeId: entry.placeId,
    title: entry.placeName,
    category: normalizeCategory(entry.category),
    confidence: 1,
    locationName: locDisplay,
    city: entry.city,
    country: entry.country,
    summary: entry.guideSummary || entry.notes || `Visited ${entry.placeName}`,
    narration:
      entry.narration ||
      entry.guideSummary ||
      entry.notes ||
      `${entry.placeName}${locDisplay ? ` in ${locDisplay}` : ''}.`,
    keyFacts: Array.isArray(entry.keyFacts) ? entry.keyFacts : [],
    tags: Array.isArray(entry.tags) ? entry.tags : [],
    language: entry.language || 'English',
    imageUrl: entry.imageUrl || undefined,
    timestamp: entry.createdAt || entry.updatedAt || entry.visitDate,
    visitDate: entry.visitDate,
    notes: entry.notes,
    visitedConfirmed: entry.visitedConfirmed,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

// Strict UID-scoped offline read cache (never shared across users)
export function loadUidJournalCache(uid: string): TravelJournalEntry[] {
  if (!uid) return [];
  try {
    const raw = localStorage.getItem(`${UID_CACHE_KEY_PREFIX}${uid}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return sortJournalEntriesNewestFirst(
      parsed.filter((item) => item && item.userId === uid && item.journalId && item.placeName)
    );
  } catch {
    return [];
  }
}

export function saveUidJournalCache(uid: string, entries: TravelJournalEntry[]): void {
  if (!uid) return;
  try {
    const uidOnly = entries.filter((e) => e.userId === uid);
    localStorage.setItem(`${UID_CACHE_KEY_PREFIX}${uid}`, JSON.stringify(uidOnly));
  } catch {
    // ignore storage quota errors
  }
}

// Temporary guest-only storage (strictly separate from authenticated accounts)
export function loadGuestJournal(): TravelJournalEntry[] {
  try {
    const raw = localStorage.getItem(GUEST_JOURNAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return sortJournalEntriesNewestFirst(
      parsed.filter((item) => item && item.userId === 'guest' && item.journalId && item.placeName)
    );
  } catch {
    return [];
  }
}

export function saveGuestJournal(entries: TravelJournalEntry[]): void {
  try {
    localStorage.setItem(GUEST_JOURNAL_KEY, JSON.stringify(entries.filter((e) => e.userId === 'guest')));
  } catch {
    // ignore
  }
}

export function clearGuestJournal(): void {
  try {
    localStorage.removeItem(GUEST_JOURNAL_KEY);
  } catch {
    // ignore
  }
}

function buildFirestoreJournalPayload(
  uid: string,
  journalId: string,
  data: Omit<TravelJournalEntry, 'journalId' | 'userId' | 'createdAt' | 'updatedAt'>
): Record<string, any> {
  const payload: Record<string, any> = {
    journalId,
    userId: uid,
    placeId: clampStr(data.placeId, 160),
    placeName: clampStr(data.placeName, 160),
    city: clampStr(data.city, 100),
    country: clampStr(data.country, 100),
    locationName: clampStr(
      data.locationName || [data.city, data.country].filter(Boolean).join(', '),
      200
    ),
    category: normalizeCategory(data.category),
    visitDate: normalizeVisitDate(data.visitDate),
    notes: clampStr(data.notes, 2000),
    guideSummary: clampStr(data.guideSummary, 1500),
    visitedConfirmed: Boolean(data.visitedConfirmed),
  };

  const cleanNarration = clampStr(data.narration, 6000);
  if (cleanNarration) payload.narration = cleanNarration;

  const cleanLang = clampStr(data.language, 60);
  if (cleanLang) payload.language = cleanLang;

  const safeImg = sanitizeImageUrlForCloud(data.imageUrl);
  if (safeImg) payload.imageUrl = safeImg;

  const safeFacts = clampStringArray(data.keyFacts, 12, 280);
  if (safeFacts.length > 0) payload.keyFacts = safeFacts;

  const safeTags = clampStringArray(data.tags, 12, 60);
  if (safeTags.length > 0) payload.tags = safeTags;

  return payload;
}

export async function loadUserJournalEntries(uid: string): Promise<{
  entries: TravelJournalEntry[];
  fromCache: boolean;
  error?: string;
}> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) {
    return { entries: [], fromCache: false, error: 'Authentication required to access saved journal.' };
  }

  const colPath = `users/${uid}/journalEntries`;
  try {
    // Query enforces userId filter so Firestore security rule `resource.data.userId == request.auth.uid` succeeds
    const q = query(collection(db, 'users', uid, 'journalEntries'), where('userId', '==', uid));
    const snapshot = await getDocs(q);

    const entries: TravelJournalEntry[] = [];
    snapshot.forEach((docSnap) => {
      const d = docSnap.data();
      if (!d || d.userId !== uid) return;
      entries.push({
        journalId: String(d.journalId || docSnap.id),
        userId: String(d.userId),
        placeId: String(d.placeId || ''),
        placeName: String(d.placeName || 'Saved Destination'),
        city: String(d.city || ''),
        country: String(d.country || ''),
        locationName: String(d.locationName || [d.city, d.country].filter(Boolean).join(', ')),
        category: normalizeCategory(d.category),
        visitDate: String(d.visitDate || getTodayDateStr()),
        notes: String(d.notes || ''),
        guideSummary: String(d.guideSummary || ''),
        narration: d.narration ? String(d.narration) : undefined,
        keyFacts: Array.isArray(d.keyFacts) ? d.keyFacts.map(String) : undefined,
        tags: Array.isArray(d.tags) ? d.tags.map(String) : undefined,
        language: d.language ? String(d.language) : undefined,
        imageUrl: d.imageUrl ? String(d.imageUrl) : undefined,
        visitedConfirmed: Boolean(d.visitedConfirmed ?? true),
        createdAt: timestampToIso(d.createdAt),
        updatedAt: timestampToIso(d.updatedAt),
      });
    });

    const sorted = sortJournalEntriesNewestFirst(entries);
    saveUidJournalCache(uid, sorted);
    return { entries: sorted, fromCache: false };
  } catch (err: any) {
    if (err?.code === 'permission-denied' || String(err?.message).includes('Missing or insufficient permissions')) {
      handleFirestoreError(err, OperationType.LIST, colPath);
    }
    const cached = loadUidJournalCache(uid);
    return {
      entries: cached,
      fromCache: cached.length > 0,
      error: cached.length > 0
        ? 'Network unavailable — showing offline cached journal entries for your account.'
        : 'Unable to sync journal from cloud right now. Please check your connection and retry.',
    };
  }
}

export async function createUserJournalEntry(
  uid: string,
  input: Omit<TravelJournalEntry, 'journalId' | 'userId' | 'createdAt' | 'updatedAt'> & { journalId?: string }
): Promise<TravelJournalEntry> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) {
    throw new Error('Sign in with a verified Google account to save cloud journal entries.');
  }

  const placeName = clampStr(input.placeName, 160);
  if (!placeName) {
    throw new Error('Destination or place name is required.');
  }

  const journalId =
    input.journalId && /^[a-zA-Z0-9_\-]+$/.test(input.journalId)
      ? input.journalId.slice(0, 128)
      : generateSafeJournalId(placeName);
  const docPath = `users/${uid}/journalEntries/${journalId}`;

  const basePayload = buildFirestoreJournalPayload(uid, journalId, {
    ...input,
    placeName,
  });

  try {
    await setDoc(doc(db, 'users', uid, 'journalEntries', journalId), {
      ...basePayload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const nowIso = new Date().toISOString();
    return {
      ...(basePayload as Omit<TravelJournalEntry, 'createdAt' | 'updatedAt'>),
      createdAt: nowIso,
      updatedAt: nowIso,
    };
  } catch (err: any) {
    if (err?.code === 'permission-denied' || String(err?.message).includes('Missing or insufficient permissions')) {
      handleFirestoreError(err, OperationType.CREATE, docPath);
    }
    throw new Error(err?.message || 'Failed to save travel journal entry to cloud. Please retry.');
  }
}

export async function updateUserJournalEntry(
  uid: string,
  journalId: string,
  updates: Partial<TravelJournalEntry>,
  existingEntry: TravelJournalEntry
): Promise<TravelJournalEntry> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) {
    throw new Error('Authentication mismatch. Please sign in again.');
  }

  const placeName = clampStr(updates.placeName ?? existingEntry.placeName, 160);
  if (!placeName) {
    throw new Error('Place name cannot be empty.');
  }

  const mergedInput: Omit<TravelJournalEntry, 'journalId' | 'userId' | 'createdAt' | 'updatedAt'> = {
    placeId: clampStr(updates.placeId ?? existingEntry.placeId, 160),
    placeName,
    city: clampStr(updates.city ?? existingEntry.city, 100),
    country: clampStr(updates.country ?? existingEntry.country, 100),
    locationName: clampStr(
      updates.locationName ?? existingEntry.locationName,
      200
    ),
    category: normalizeCategory(updates.category ?? existingEntry.category),
    visitDate: normalizeVisitDate(updates.visitDate ?? existingEntry.visitDate),
    notes: clampStr(updates.notes ?? existingEntry.notes, 2000),
    guideSummary: clampStr(updates.guideSummary ?? existingEntry.guideSummary, 1500),
    narration: updates.narration ?? existingEntry.narration,
    keyFacts: updates.keyFacts ?? existingEntry.keyFacts,
    tags: updates.tags ?? existingEntry.tags,
    language: updates.language ?? existingEntry.language,
    imageUrl: updates.imageUrl ?? existingEntry.imageUrl,
    visitedConfirmed:
      updates.visitedConfirmed !== undefined
        ? Boolean(updates.visitedConfirmed)
        : existingEntry.visitedConfirmed,
  };

  const fullPayload = buildFirestoreJournalPayload(uid, journalId, mergedInput);
  // Strip immutable fields so Firestore affectedKeys().hasOnly(...) passes cleanly
  const { journalId: _j, userId: _u, ...mutableFields } = fullPayload;
  const docPath = `users/${uid}/journalEntries/${journalId}`;

  try {
    await updateDoc(doc(db, 'users', uid, 'journalEntries', journalId), {
      ...mutableFields,
      updatedAt: serverTimestamp(),
    });

    return {
      ...existingEntry,
      ...(fullPayload as TravelJournalEntry),
      updatedAt: new Date().toISOString(),
    };
  } catch (err: any) {
    if (err?.code === 'permission-denied' || String(err?.message).includes('Missing or insufficient permissions')) {
      handleFirestoreError(err, OperationType.UPDATE, docPath);
    }
    throw new Error(err?.message || 'Could not update journal entry. Please retry.');
  }
}

export async function deleteUserJournalEntry(uid: string, journalId: string): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) {
    throw new Error('Authentication required to delete this entry.');
  }

  const docPath = `users/${uid}/journalEntries/${journalId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'journalEntries', journalId));
  } catch (err: any) {
    if (err?.code === 'permission-denied' || String(err?.message).includes('Missing or insufficient permissions')) {
      handleFirestoreError(err, OperationType.DELETE, docPath);
    }
    throw new Error(err?.message || 'Failed to remove journal entry.');
  }
}

export async function clearAllUserJournalEntries(uid: string, journalIds: string[]): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== uid || journalIds.length === 0) {
    return;
  }

  const colPath = `users/${uid}/journalEntries`;
  try {
    for (let i = 0; i < journalIds.length; i += 400) {
      const batch = writeBatch(db);
      const chunk = journalIds.slice(i, i + 400);
      chunk.forEach((id) => {
        batch.delete(doc(db, 'users', uid, 'journalEntries', id));
      });
      await batch.commit();
    }
  } catch (err: any) {
    if (err?.code === 'permission-denied' || String(err?.message).includes('Missing or insufficient permissions')) {
      handleFirestoreError(err, OperationType.DELETE, colPath);
    }
    throw new Error(err?.message || 'Failed to clear cloud journal entries.');
  }
}
