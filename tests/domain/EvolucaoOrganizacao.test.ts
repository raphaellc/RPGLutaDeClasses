import { describe, it, expect } from 'vitest';
import { contribuirParaOrganizacao } from '@domain/services/EvolucaoOrganizacao';
import { faisca } from './fixtures';

describe('Evolução da Organização (RF05+RF06 / UC04)', () => {
  it('acumula CC e Fundo de Greve', () => {
    const r = contribuirParaOrganizacao(faisca([]), { cc: 5, cm: 2, tl: 3 });
    expect(r.organizacao.ccColetivaAcumulada).toBe(5);
    expect(r.organizacao.fundoDeGreve.cm).toBe(4); // 2 inicial + 2 doado
    expect(r.organizacao.fundoDeGreve.tl).toBe(8); // 5 + 3
  });

  it('avança nível 1 → 2 ao cruzar 30 CC', () => {
    const r = contribuirParaOrganizacao(faisca([]), { cc: 35, cm: 0, tl: 0 });
    expect(r.organizacao.nivel).toBe(2);
    expect(r.eventos.some((e) => e.tipo === 'organizacaoEvoluiu')).toBe(true);
  });

  it('avança direto para nível 4 com CC suficiente', () => {
    const r = contribuirParaOrganizacao(faisca([]), { cc: 150, cm: 0, tl: 0 });
    expect(r.organizacao.nivel).toBe(4);
  });

  it('não emite evento de evolução quando o nível não muda', () => {
    const r = contribuirParaOrganizacao(faisca([]), { cc: 5, cm: 0, tl: 0 });
    expect(r.organizacao.nivel).toBe(1);
    expect(r.eventos.length).toBe(0);
  });
});
