import { Dado } from '@domain/services/Dado';

/**
 * Dado determinístico para testes — devolve a sequência configurada e cicla.
 */
export class DadoDeterministico implements Dado {
  private i = 0;
  constructor(private readonly sequencia: ReadonlyArray<number>) {}

  d6(): number {
    if (this.sequencia.length === 0) return 1;
    const v = this.sequencia[this.i % this.sequencia.length]!;
    this.i++;
    return v;
  }
}
