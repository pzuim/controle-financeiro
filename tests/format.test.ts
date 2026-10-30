import { describe, expect, it } from 'vitest';
import {
  formatBRL,
  formatDateBR,
  formatDayMonthShort,
  formatMonthYear,
  formatSignedBRL,
  parseBRL,
} from '../src/domain/format';

const plain = (s: string) => s.replace(/ /g, ' ');

describe('formatação brasileira', () => {
  it('formata reais', () => {
    expect(plain(formatBRL(123456))).toBe('R$ 1.234,56');
    expect(plain(formatBRL(5))).toBe('R$ 0,05');
    expect(plain(formatBRL(0))).toBe('R$ 0,00');
    expect(plain(formatBRL(100000000))).toBe('R$ 1.000.000,00');
    expect(plain(formatSignedBRL(-1050))).toBe('−R$ 10,50');
    expect(plain(formatSignedBRL(1050))).toBe('+R$ 10,50');
  });

  it('formata datas', () => {
    expect(formatDateBR('2027-01-02')).toBe('02/01/2027');
    expect(formatDayMonthShort('2027-01-02')).toBe('02 jan');
    expect(formatMonthYear({ year: 2026, month: 3 })).toBe('março de 2026');
  });

  it('lê valores digitados', () => {
    expect(parseBRL('1.234,56')).toBe(123456);
    expect(parseBRL('R$ 12,5')).toBe(1250);
    expect(parseBRL('12')).toBe(1200);
    expect(parseBRL('12.5')).toBe(1250);
    expect(parseBRL('1.234')).toBe(123400);
    expect(parseBRL('')).toBeNull();
    expect(parseBRL('abc')).toBeNull();
    expect(parseBRL('1,234')).toBeNull();
  });
});
