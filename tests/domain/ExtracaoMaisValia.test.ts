import { describe, it, expect } from 'vitest';
import { aplicarMaisValia } from '@domain/services/ExtracaoMaisValia';
import { beto } from './fixtures';

describe('Extração de Mais-Valia (RF02 / UC01)', () => {
  it('CM atenua o dano antes de qualquer subtração', () => {
    // Beto: PV 30, TL 2, CM 1.  Dano bruto 8 → real 7.
    const r = aplicarMaisValia(beto(), 8);
    const e = r.eventos[0]!;
    expect(e.tipo).toBe('maisValiaExtraida');
    if (e.tipo !== 'maisValiaExtraida') throw new Error();
    expect(e.danoReal).toBe(7);
  });

  it('subtrai TL primeiro; saldo corrói PV', () => {
    // Real 7, TL 2 → consome todo o TL e 5 PV. Beto fica com PV 25 (= 30 - 5).
    const r = aplicarMaisValia(beto(), 8);
    expect(r.alvo.recursos.tl).toBe(0);
    expect(r.alvo.recursos.pv).toBe(25);
    const e = r.eventos[0]!;
    if (e.tipo !== 'maisValiaExtraida') throw new Error();
    expect(e.perdaTL).toBe(2);
    expect(e.perdaPV).toBe(5);
  });

  it('CM não é consumida — apenas atenua', () => {
    const r = aplicarMaisValia(beto(), 8);
    expect(r.alvo.recursos.cm).toBe(1);
  });

  it('emite evento de colapso quando PV chega a zero', () => {
    const fragil = { ...beto(), recursos: { ...beto().recursos, pv: 3 } };
    const r = aplicarMaisValia(fragil, 100);
    expect(r.alvo.colapsado).toBe(true);
    expect(r.eventos.some((e) => e.tipo === 'colapso')).toBe(true);
  });

  it('dano <= CM produz dano real zero', () => {
    const r = aplicarMaisValia(beto(), 1); // CM = 1
    const e = r.eventos[0]!;
    if (e.tipo !== 'maisValiaExtraida') throw new Error();
    expect(e.danoReal).toBe(0);
    expect(r.alvo.recursos.tl).toBe(2);
    expect(r.alvo.recursos.pv).toBe(30);
  });
});
