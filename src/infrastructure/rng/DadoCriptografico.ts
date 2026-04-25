import { Dado } from '@domain/services/Dado';

/**
 * Implementação de Dado usando crypto.getRandomValues quando disponível,
 * com fallback para Math.random.
 */
export class DadoCriptografico implements Dado {
  d6(): number {
    if (typeof globalThis.crypto?.getRandomValues === 'function') {
      const buf = new Uint8Array(1);
      let v: number;
      // Rejeição para evitar viés em distribuição módulo 6.
      do {
        globalThis.crypto.getRandomValues(buf);
        v = buf[0]!;
      } while (v >= 252);
      return (v % 6) + 1;
    }
    return Math.floor(Math.random() * 6) + 1;
  }
}
