/**
 * Checks GitHub Releases for a newer Aiserie Tracks version and nudges the
 * user toward the official install page. Purely informational — the app
 * never downloads or installs anything by itself.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Linking } from 'react-native';

const REPO = 'ViztechStudios/aiserie-tracks';
export const RELEASES_URL = `https://github.com/${REPO}/releases/latest`;
const DISMISS_KEY = 'aiserie.v1.updateDismissed';
const DISMISS_DAYS = 3;

export interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  url: string;
  /** First human-friendly line of the release notes (may be empty). */
  notes: string;
}

function currentVersion(): string {
  return Constants.expoConfig?.version ?? '0.0.0';
}

export function compareVersions(a: string, b: string): number {
  const pa = a.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

async function wasRecentlyDismissed(version: string): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const { version: v, at } = JSON.parse(raw) as { version: string; at: number };
    return v === version && Date.now() - at < DISMISS_DAYS * 24 * 3600 * 1000;
  } catch {
    return false;
  }
}

export async function dismissUpdate(version: string): Promise<void> {
  AsyncStorage.setItem(DISMISS_KEY, JSON.stringify({ version, at: Date.now() })).catch(() => {});
}

/** Returns update info when a newer release exists, else null. Never throws. */
export async function checkForUpdate(): Promise<UpdateInfo | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9000);
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json' },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      tag_name?: string;
      body?: string;
      html_url?: string;
      draft?: boolean;
      prerelease?: boolean;
    };
    if (!data.tag_name || data.draft || data.prerelease) return null;
    const latest = data.tag_name.replace(/^v/, '');
    const cur = currentVersion();
    if (compareVersions(latest, cur) <= 0) return null;
    if (await wasRecentlyDismissed(latest)) return null;
    const notes = (data.body ?? '')
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l && !l.startsWith('#') && !l.startsWith('<') && !l.startsWith('|'));
    return {
      currentVersion: cur,
      latestVersion: latest,
      url: data.html_url?.endsWith('/latest') ? data.html_url : RELEASES_URL,
      notes: notes ? notes.replace(/[*_`]/g, '').slice(0, 140) : '',
    };
  } catch {
    return null; // offline / rate-limited: stay quiet
  }
}

export function openReleases(): void {
  Linking.openURL(RELEASES_URL).catch(() => {});
}
