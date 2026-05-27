// SPDX-License-Identifier: BUSL-1.1

import { isMaskingMode, MaskingMode } from './masking';

/** Persistence behavior for public privacy mode. */
export enum PrivacyPersistenceOption {
  OffAfterOneMinute = 'off_after_1_minute',
  OffWhenAppCloses = 'off_when_app_closes',
  ManualOnly = 'manual_only',
}

/** Snapshot exposed by the privacy state machine. */
export interface PrivacySnapshot {
  readonly privacyMode: boolean;
  readonly persistence: PrivacyPersistenceOption;
  readonly activatedAtMs: number | null;
  readonly firstActivationExplained: boolean;
  readonly surfaceOverrides: Readonly<Record<string, MaskingMode>>;
  readonly categoryProtection: Readonly<Record<string, boolean>>;
}

export type PrivacyListener = (snapshot: PrivacySnapshot) => void;

const DEFAULT_SNAPSHOT: PrivacySnapshot = {
  privacyMode: false,
  persistence: PrivacyPersistenceOption.OffAfterOneMinute,
  activatedAtMs: null,
  firstActivationExplained: false,
  surfaceOverrides: {},
  categoryProtection: {},
};

function copySnapshot(snapshot: PrivacySnapshot): PrivacySnapshot {
  return {
    ...snapshot,
    surfaceOverrides: { ...snapshot.surfaceOverrides },
    categoryProtection: { ...snapshot.categoryProtection },
  };
}

function isPersistenceOption(value: unknown): value is PrivacyPersistenceOption {
  return (
    value === PrivacyPersistenceOption.OffAfterOneMinute ||
    value === PrivacyPersistenceOption.OffWhenAppCloses ||
    value === PrivacyPersistenceOption.ManualOnly
  );
}

/** In-memory storage contract used by tests and platform adapters. */
export interface PrivacyStorage {
  read: () => string | null;
  write: (value: string) => void;
}

/** Create a localStorage-backed persistence adapter. */
export function createLocalStoragePrivacyStorage(key: string): PrivacyStorage {
  return {
    read: () => {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    write: (value) => {
      try {
        localStorage.setItem(key, value);
      } catch {
        // Private browsing or quota errors should not disable privacy controls.
      }
    },
  };
}

/** Reactive privacy state machine shared by app, settings, widgets, and category protection. */
export class PrivacyState {
  private snapshot: PrivacySnapshot;
  private readonly listeners = new Set<PrivacyListener>();
  private readonly storage?: PrivacyStorage;
  private readonly now: () => number;

  constructor(
    options: {
      initial?: Partial<PrivacySnapshot>;
      storage?: PrivacyStorage;
      now?: () => number;
    } = {},
  ) {
    this.storage = options.storage;
    this.now = options.now ?? Date.now;
    this.snapshot = { ...DEFAULT_SNAPSHOT, ...this.loadStoredSnapshot(), ...options.initial };
  }

  /** Return a defensive copy of the current privacy state. */
  getSnapshot(): PrivacySnapshot {
    this.expireIfNeeded();
    return copySnapshot(this.snapshot);
  }

  /** Subscribe to future state changes. Returns an unsubscribe function. */
  subscribe(listener: PrivacyListener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Enable or disable public privacy mode. */
  setPrivacyMode(enabled: boolean): void {
    this.commit({
      privacyMode: enabled,
      activatedAtMs: enabled ? this.now() : null,
      firstActivationExplained: enabled ? true : this.snapshot.firstActivationExplained,
    });
  }

  /** Toggle public privacy mode. */
  togglePrivacyMode(): void {
    this.setPrivacyMode(!this.snapshot.privacyMode);
  }

  /** Update persistence behavior for the global privacy toggle. */
  setPersistence(option: PrivacyPersistenceOption): void {
    this.commit({ persistence: option });
  }

  /** Set a per-surface masking override. */
  setSurfaceOverride(surfaceId: string, mode: MaskingMode): void {
    this.commit({ surfaceOverrides: { ...this.snapshot.surfaceOverrides, [surfaceId]: mode } });
  }

  /** Remove a per-surface masking override. */
  clearSurfaceOverride(surfaceId: string): void {
    const next = { ...this.snapshot.surfaceOverrides };
    delete next[surfaceId];
    this.commit({ surfaceOverrides: next });
  }

  /** Resolve effective masking mode for a surface. */
  getEffectiveMode(surfaceId?: string): MaskingMode {
    this.expireIfNeeded();
    if (surfaceId && this.snapshot.surfaceOverrides[surfaceId]) {
      return this.snapshot.surfaceOverrides[surfaceId];
    }
    return this.snapshot.privacyMode ? MaskingMode.Dots : MaskingMode.Visible;
  }

  /** Mark whether a category requires biometric protection. */
  setCategoryProtection(categoryId: string, protectedCategory: boolean): void {
    this.commit({
      categoryProtection: { ...this.snapshot.categoryProtection, [categoryId]: protectedCategory },
    });
  }

  /** Return whether a category is biometric protected. */
  isCategoryProtected(categoryId: string): boolean {
    return this.snapshot.categoryProtection[categoryId] === true;
  }

  /** Apply app-close lifecycle semantics. */
  handleAppClose(): void {
    if (this.snapshot.persistence === PrivacyPersistenceOption.OffWhenAppCloses) {
      this.setPrivacyMode(false);
    }
  }

  /** Force evaluation of time-based transitions. */
  tick(): void {
    this.expireIfNeeded();
  }

  private expireIfNeeded(): void {
    if (
      this.snapshot.privacyMode &&
      this.snapshot.persistence === PrivacyPersistenceOption.OffAfterOneMinute &&
      this.snapshot.activatedAtMs !== null &&
      this.now() - this.snapshot.activatedAtMs >= 60_000
    ) {
      this.commit({ privacyMode: false, activatedAtMs: null });
    }
  }

  private commit(patch: Partial<PrivacySnapshot>): void {
    this.snapshot = copySnapshot({ ...this.snapshot, ...patch });
    this.persist();
    for (const listener of this.listeners) {
      listener(this.getSnapshot());
    }
  }

  private loadStoredSnapshot(): Partial<PrivacySnapshot> {
    const raw = this.storage?.read();
    if (!raw) return {};

    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const surfaceOverrides: Record<string, MaskingMode> = {};
      const categoryProtection: Record<string, boolean> = {};

      if (typeof parsed.surfaceOverrides === 'object' && parsed.surfaceOverrides !== null) {
        for (const [key, value] of Object.entries(parsed.surfaceOverrides)) {
          if (isMaskingMode(value)) surfaceOverrides[key] = value;
        }
      }

      if (typeof parsed.categoryProtection === 'object' && parsed.categoryProtection !== null) {
        for (const [key, value] of Object.entries(parsed.categoryProtection)) {
          categoryProtection[key] = value === true;
        }
      }

      return {
        privacyMode: parsed.privacyMode === true,
        persistence: isPersistenceOption(parsed.persistence)
          ? parsed.persistence
          : PrivacyPersistenceOption.OffAfterOneMinute,
        activatedAtMs: typeof parsed.activatedAtMs === 'number' ? parsed.activatedAtMs : null,
        firstActivationExplained: parsed.firstActivationExplained === true,
        surfaceOverrides,
        categoryProtection,
      };
    } catch {
      return {};
    }
  }

  private persist(): void {
    this.storage?.write(JSON.stringify(this.snapshot));
  }
}
