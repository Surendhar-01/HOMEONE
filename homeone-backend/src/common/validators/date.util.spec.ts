import { BadRequestException } from '@nestjs/common';
import { assertSameDay, parseIsoDate } from './date.util';

describe('date.util', () => {
  describe('parseIsoDate', () => {
    it('parses a date-only string', () => {
      expect(parseIsoDate('2026-02-01').toISOString()).toBe('2026-02-01T00:00:00.000Z');
    });

    it('parses a full ISO timestamp by taking the date part', () => {
      expect(parseIsoDate('2026-02-01T10:30:00Z').toISOString()).toBe('2026-02-01T00:00:00.000Z');
    });

    it('rejects a non ISO date', () => {
      expect(() => parseIsoDate('01-02-2026')).toThrow(BadRequestException);
    });

    it('rejects an impossible calendar date', () => {
      expect(() => parseIsoDate('2026-02-31')).toThrow(BadRequestException);
    });

    it('rejects an empty value', () => {
      expect(() => parseIsoDate('')).toThrow(BadRequestException);
    });
  });

  describe('assertSameDay', () => {
    it('accepts two timestamps on the same UTC day', () => {
      expect(() =>
        assertSameDay(new Date('2026-02-01T01:00:00Z'), new Date('2026-02-01T23:00:00Z')),
      ).not.toThrow();
    });

    it('rejects timestamps on different days', () => {
      expect(() =>
        assertSameDay(new Date('2026-02-01T23:00:00Z'), new Date('2026-02-02T01:00:00Z')),
      ).toThrow(BadRequestException);
    });
  });
});
