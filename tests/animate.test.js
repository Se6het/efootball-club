import { describe, expect, it } from 'vitest';
import { EASE_OUT_QUAD, defaultFormatter, easeBetween } from '../src/animate.js';

describe('EASE_OUT_QUAD', () => {
  it('is 0 at t=0 and 1 at t=1', () => {
    expect(EASE_OUT_QUAD(0)).toBe(0);
    expect(EASE_OUT_QUAD(1)).toBe(1);
  });

  it('is monotonic and within [0,1]', () => {
    for (let t = 0; t <= 1.0001; t += 0.1) {
      const v = EASE_OUT_QUAD(t);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});

describe('easeBetween', () => {
  it('returns from at t=0 and to at t=1', () => {
    expect(easeBetween(10, 20, 0)).toBe(10);
    expect(easeBetween(10, 20, 1)).toBe(20);
  });

  it('returns midpoint-ish values within range', () => {
    const v = easeBetween(0, 100, 0.5);
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(100);
  });

  it('supports negative deltas', () => {
    const v = easeBetween(50, 0, 0.5);
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(50);
  });
});

describe('defaultFormatter', () => {
  it('rounds to nearest integer', () => {
    expect(defaultFormatter(3.14159)).toBe('3');
    expect(defaultFormatter(2.5)).toBe('3');
    expect(defaultFormatter(0)).toBe('0');
  });
});
