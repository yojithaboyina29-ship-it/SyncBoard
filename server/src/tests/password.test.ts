import { describe, it, expect } from 'vitest';
import { passwordSchema } from '../controllers/authController';

describe('Password Restrictions Validation', () => {
  it('denies passwords shorter than 8 characters', () => {
    const res = passwordSchema.safeParse('Aa1!');
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.errors[0].message).toContain('at least 8 characters');
    }
  });

  it('denies passwords without a capital letter', () => {
    const res = passwordSchema.safeParse('lowercase123!');
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.errors[0].message).toContain('capital letter (A-Z)');
    }
  });

  it('denies passwords without a small letter', () => {
    const res = passwordSchema.safeParse('UPPERCASE123!');
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.errors[0].message).toContain('small letter (a-z)');
    }
  });

  it('denies passwords without a number', () => {
    const res = passwordSchema.safeParse('NoNumberHere!');
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.errors[0].message).toContain('number (0-9)');
    }
  });

  it('denies passwords without a special character', () => {
    const res = passwordSchema.safeParse('NoSpecial1234');
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.errors[0].message).toContain('special character');
    }
  });

  it('accepts passwords meeting all restrictions', () => {
    const res = passwordSchema.safeParse('SyncBoard@2026!');
    expect(res.success).toBe(true);
  });
});
