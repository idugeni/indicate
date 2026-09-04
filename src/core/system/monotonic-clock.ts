/** Freshness uses monotonic time so NTP/manual clock edits can't extend validity. */
export interface MonotonicClock {
  now(): MonotonicInstant;
}

export interface MonotonicInstant {
  readonly value: number;
}

export class HrTimeMonotonicClock implements MonotonicClock {
  #origin: bigint = process.hrtime.bigint();

  now(): MonotonicInstant {
    const elapsedNs = process.hrtime.bigint() - this.#origin;
    return Object.freeze({ value: Number(elapsedNs) / 1e9 });
  }
}

export class FixedMonotonicClock implements MonotonicClock {
  #value: number;

  constructor(initialSeconds = 0) {
    this.#value = initialSeconds;
  }

  now(): MonotonicInstant {
    return Object.freeze({ value: this.#value });
  }

  advance(seconds: number): void {
    this.#value += seconds;
  }
}

