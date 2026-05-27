// SPDX-License-Identifier: BUSL-1.1

import { describe, expect, it } from 'vitest';
import { MaskingMode } from '../masking';
import { PrivacyPersistenceOption, PrivacyState, type PrivacyStorage } from '../state';

function memoryStorage(): PrivacyStorage & { value: string | null } {
  return {
    value: null,
    read() {
      return this.value;
    },
    write(value: string) {
      this.value = value;
    },
  };
}

describe('PrivacyState', () => {
  it('turns off after one minute by default', () => {
    let now = 1_000;
    const state = new PrivacyState({ now: () => now });

    state.setPrivacyMode(true);
    expect(state.getSnapshot().privacyMode).toBe(true);
    now += 59_999;
    state.tick();
    expect(state.getSnapshot().privacyMode).toBe(true);
    now += 1;
    state.tick();
    expect(state.getSnapshot().privacyMode).toBe(false);
  });

  it('turns off when app closes for the close persistence option', () => {
    const state = new PrivacyState();
    state.setPersistence(PrivacyPersistenceOption.OffWhenAppCloses);
    state.setPrivacyMode(true);
    state.handleAppClose();
    expect(state.getSnapshot().privacyMode).toBe(false);
  });

  it('stays enabled for manual-only persistence', () => {
    let now = 1_000;
    const state = new PrivacyState({ now: () => now });
    state.setPersistence(PrivacyPersistenceOption.ManualOnly);
    state.setPrivacyMode(true);
    now += 60_000;
    state.tick();
    state.handleAppClose();
    expect(state.getSnapshot().privacyMode).toBe(true);
  });

  it('persists surface overrides and category protection', () => {
    const storage = memoryStorage();
    const state = new PrivacyState({ storage });
    state.setSurfaceOverride('widget:net-worth', MaskingMode.Bucketed);
    state.setCategoryProtection('cat-medical', true);

    const restored = new PrivacyState({ storage });
    expect(restored.getEffectiveMode('widget:net-worth')).toBe(MaskingMode.Bucketed);
    expect(restored.isCategoryProtected('cat-medical')).toBe(true);
  });
});
