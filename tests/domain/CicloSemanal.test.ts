import { describe, it, expect } from 'vitest';
import { aplicarCicloSemanal } from '@domain/services/CicloSemanal';
import { beto, joana } from './fixtures';

describe('Ciclo Semanal (RF04 / UC03)', () => {
  it('Fabril: +10 TL automático sem custo de CM', () => {
    const j = joana();
    const r = aplicarCicloSemanal(j);
    expect(r.trabalhador.recursos.tl).toBe(j.recursos.tl + 10);
    expect(r.trabalhador.recursos.cm).toBe(j.recursos.cm);
  });

  it('Uberizado folgando: +5 TL, -2 CM', () => {
    const b = { ...beto(), recursos: { ...beto().recursos, cm: 5 } };
    const r = aplicarCicloSemanal(b, 'folgar');
    expect(r.trabalhador.recursos.tl).toBe(b.recursos.tl + 5);
    expect(r.trabalhador.recursos.cm).toBe(3);
  });

  it('Uberizado rodando: +1 CM, 0 TL', () => {
    const b = beto();
    const r = aplicarCicloSemanal(b, 'rodar');
    expect(r.trabalhador.recursos.cm).toBe(b.recursos.cm + 1);
    expect(r.trabalhador.recursos.tl).toBe(b.recursos.tl);
  });

  it('respeita limite máximo de TL', () => {
    const j = { ...joana(), recursos: { ...joana().recursos, tl: 28 } }; // tlMax fabril = 30
    const r = aplicarCicloSemanal(j);
    expect(r.trabalhador.recursos.tl).toBe(30);
  });
});
