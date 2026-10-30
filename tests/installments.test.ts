import { describe, expect, it } from 'vitest';
import { MAX_INSTALLMENTS, splitInstallments } from '../src/domain/installments';

describe('splitInstallments', () => {
  it('à vista gera uma única parcela com o valor total', () => {
    expect(splitInstallments(12345, 1)).toEqual([12345]);
  });

  it('divisão exata gera parcelas iguais', () => {
    expect(splitInstallments(10000, 4)).toEqual([2500, 2500, 2500, 2500]);
  });

  it('ajusta os centavos na última parcela', () => {
    expect(splitInstallments(10000, 3)).toEqual([3333, 3333, 3334]);
    expect(splitInstallments(100, 3)).toEqual([33, 33, 34]);
    expect(splitInstallments(99999, 12)).toEqual([...Array(11).fill(8333), 8336]);
  });

  it('a soma das parcelas é sempre exatamente o total', () => {
    for (let total = 1; total <= 5000; total += 7) {
      for (let n = 1; n <= Math.min(MAX_INSTALLMENTS, total); n++) {
        const parts = splitInstallments(total, n);
        expect(parts).toHaveLength(n);
        expect(parts.reduce((a, b) => a + b, 0)).toBe(total);
        expect(parts.every((p) => p >= 1)).toBe(true);
        // Só a última parcela pode ser diferente.
        expect(new Set(parts.slice(0, -1)).size).toBeLessThanOrEqual(1);
      }
    }
  });

  it('rejeita valores inválidos', () => {
    expect(() => splitInstallments(0, 1)).toThrow();
    expect(() => splitInstallments(-100, 2)).toThrow();
    expect(() => splitInstallments(10.5, 2)).toThrow();
    expect(() => splitInstallments(100, 0)).toThrow();
    expect(() => splitInstallments(100, MAX_INSTALLMENTS + 1)).toThrow();
    expect(() => splitInstallments(2, 3)).toThrow();
  });
});
