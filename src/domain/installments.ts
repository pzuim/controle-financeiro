export const MAX_INSTALLMENTS = 24;

/**
 * Divide o valor total (em centavos) em parcelas iguais.
 * Os centavos que sobram da divisão vão para a última parcela,
 * garantindo que a soma das parcelas seja exatamente o total.
 *
 * Ex.: R$ 100,00 em 3x → 33,33 + 33,33 + 33,34.
 */
export function splitInstallments(totalCents: number, count: number): number[] {
  if (!Number.isInteger(totalCents) || totalCents <= 0) {
    throw new Error('O valor total deve ser um número inteiro de centavos maior que zero.');
  }
  if (!Number.isInteger(count) || count < 1 || count > MAX_INSTALLMENTS) {
    throw new Error(`O número de parcelas deve estar entre 1 e ${MAX_INSTALLMENTS}.`);
  }
  if (totalCents < count) {
    throw new Error('O valor é pequeno demais para esse número de parcelas.');
  }
  const base = Math.floor(totalCents / count);
  const parts = Array.from({ length: count }, () => base);
  parts[count - 1] = totalCents - base * (count - 1);
  return parts;
}
