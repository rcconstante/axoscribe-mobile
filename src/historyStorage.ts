import AsyncStorage from '@react-native-async-storage/async-storage';

const HISTORY_KEY = '@axoscribe_history';

export interface TranscriptionEntry {
  id: string;
  title: string;
  text: string;
  date: string; // ISO string
  wordCount: number;
  durationSeconds: number;
}

export async function loadHistory(): Promise<TranscriptionEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as TranscriptionEntry[];
  } catch {
    return [];
  }
}

export async function saveEntry(entry: TranscriptionEntry): Promise<void> {
  try {
    const existing = await loadHistory();
    // Replace if same id, otherwise prepend
    const idx = existing.findIndex((e) => e.id === entry.id);
    if (idx !== -1) {
      existing[idx] = entry;
    } else {
      existing.unshift(entry);
    }
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(existing));
  } catch {}
}

export async function deleteEntry(id: string): Promise<void> {
  try {
    const existing = await loadHistory();
    const updated = existing.filter((e) => e.id !== id);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch {}
}

export function makeTitle(text: string): string {
  const trimmed = text.trim();
  const words = trimmed.split(/\s+/).slice(0, 7).join(' ');
  return words.length < trimmed.length ? words + '…' : words;
}

export function formatEntryDate(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatEntryTime(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
