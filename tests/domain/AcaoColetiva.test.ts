import { describe, it, expect } from 'vitest';
import { convocarPiquete, convocarGreveGeral, expropriar } from '@domain/services/AcaoColetiva';
import { faisca, olimpo } from './fixtures';

describe('Ação Coletiva (RF07 / UC05)', () => {
  it('Piquete: bloqueado se nível < 2', () => {
    const org = { ...faisca([]), nivel: 1 as const, fundoDeGreve: { cm: 10, tl: 0 } };
    const r = convocarPiquete(org, olimpo(), 25);
    expect(r.ok).toBe(false);
  });

  it('Piquete: bloqueado se Fundo de Greve insuficiente', () => {
    const org = { ...faisca([]), nivel: 2 as const, fundoDeGreve: { cm: 1, tl: 0 } };
    const r = convocarPiquete(org, olimpo(), 25);
    expect(r.ok).toBe(false);
  });

  it('Piquete: gasta 5 CM, causa dano e bloqueia o antagonista', () => {
    const org = { ...faisca([]), nivel: 2 as const, fundoDeGreve: { cm: 10, tl: 0 } };
    const r = convocarPiquete(org, olimpo(), 25);
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error();
    expect(r.organizacao.fundoDeGreve.cm).toBe(5);
    expect(r.antagonista.capitalAcumulado).toBe(75);
    expect(r.antagonista.bloqueadoNoTurno).toBe(true);
  });

  it('Greve Geral: nível 3 e custo de 15 CM + 20 TL', () => {
    const org = { ...faisca([]), nivel: 3 as const, fundoDeGreve: { cm: 20, tl: 25 } };
    const r = convocarGreveGeral(org, olimpo(), 30);
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error();
    expect(r.organizacao.fundoDeGreve.cm).toBe(5);
    expect(r.organizacao.fundoDeGreve.tl).toBe(5);
    expect(r.antagonista.capitalAcumulado).toBe(40); // 100 - 60 (30 * 2)
  });

  it('Expropriação: zera o Capital e marca antagonista como derrotado (Nível 4)', () => {
    const org = { ...faisca([]), nivel: 4 as const, fundoDeGreve: { cm: 0, tl: 0 } };
    const r = expropriar(org, olimpo());
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error();
    expect(r.antagonista.capitalAcumulado).toBe(0);
    expect(r.antagonista.derrotado).toBe(true);
  });
});
