import { describe, expect, it } from 'vitest';

import { FixedMonotonicClock, HrTimeMonotonicClock } from '@/core/system/monotonic-clock';

describe('FixedMonotonicClock', () => {
  it('mulai dari nol dan maju sesuai advance', () => {
    const clock = new FixedMonotonicClock();
    expect(clock.now().value).toBe(0);
    clock.advance(1.5);
    expect(clock.now().value).toBe(1.5);
  });

  it('membekukan instant agar tidak bisa dimutasi', () => {
    const clock = new FixedMonotonicClock(10);
    expect(Object.isFrozen(clock.now())).toBe(true);
  });
});

describe('HrTimeMonotonicClock', () => {
  it('tidak pernah mundur antar panggilan', () => {
    const clock = new HrTimeMonotonicClock();
    const first = clock.now().value;
    const second = clock.now().value;
    expect(second).toBeGreaterThanOrEqual(first);
  });

  it('membekukan instant hasil now', () => {
    expect(Object.isFrozen(new HrTimeMonotonicClock().now())).toBe(true);
  });
});
