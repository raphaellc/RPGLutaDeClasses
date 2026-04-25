import { describe, it, expect } from 'vitest';
import { executarSolidariedade } from '@domain/services/Solidariedade';
import { beto, joana } from './fixtures';

describe('Solidariedade de Classe (RF03 / UC02)', () => {
  it('transfere 1 CM, dá 5 TL ao receptor e 2 CC a ambos', () => {
    const r = executarSolidariedade(joana(), beto());
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error();
    expect(r.doador.recursos.cm).toBe(joana().recursos.cm - 1);
    expect(r.receptor.recursos.tl).toBe(beto().recursos.tl + 5);
    expect(r.doador.recursos.cc).toBe(2);
    expect(r.receptor.recursos.cc).toBe(2);
  });

  it('falha se doador está sem CM', () => {
    const semCm = { ...joana(), recursos: { ...joana().recursos, cm: 0 } };
    const r = executarSolidariedade(semCm, beto());
    expect(r.ok).toBe(false);
  });

  it('falha quando doador e receptor são o mesmo', () => {
    const r = executarSolidariedade(joana(), joana());
    expect(r.ok).toBe(false);
  });
});
