import { describe, it, expect } from 'vitest';
import { aplicarStatus, concederImunidadePermanente } from '@domain/services/StatusService';
import { aplicarComando } from '@application/use-cases/AcoesDoTurno';
import { criarPartida } from '@application/use-cases/CriarPartida';
import { Partida } from '@domain/entities/Partida';
import { beto } from './fixtures';

function partidaCom(nivel: 1 | 2 | 3 | 4, tl: number, cm: number): Partida {
  const base = criarPartida({
    modo: 'turnoATurno',
      dificuldade: 'normal',
    trabalhadores: [
      { nome: 'Joana', arquetipo: 'ferreiroEngrenagens' },
      { nome: 'Beto', arquetipo: 'fantasmaRede' },
    ],
    antagonistas: [{ arquetipo: 'senhorNuvens' }],
  });
  return {
    ...base,
    organizacao: { ...base.organizacao, nivel, fundoDeGreve: { tl, cm } },
  };
}

describe('concederImunidadePermanente — serviço de domínio', () => {
  it('adiciona tipos novos sem duplicar', () => {
    const t = beto();
    const r1 = concederImunidadePermanente(t, ['alienacao']);
    expect(r1.alvo.imunidadesPermanentes).toEqual(['alienacao']);

    const r2 = concederImunidadePermanente(r1.alvo, ['alienacao', 'fetichismo']);
    // 'alienacao' já estava, só 'fetichismo' é novo.
    expect(r2.alvo.imunidadesPermanentes).toEqual(['alienacao', 'fetichismo']);
  });

  it('cura status ativos do tipo imunizado', () => {
    const t = {
      ...beto(),
      status: [
        { tipo: 'alienacao' as const, turnosRestantes: 3 },
        { tipo: 'fetichismo' as const, turnosRestantes: 2 },
      ],
    };
    const r = concederImunidadePermanente(t, ['alienacao']);
    expect(r.alvo.status.find((s) => s.tipo === 'alienacao')).toBeUndefined();
    expect(r.alvo.status.find((s) => s.tipo === 'fetichismo')).toBeDefined();
    expect(r.eventos.some((e) => e.tipo === 'statusCurado')).toBe(true);
  });

  it('aplicarStatus é bloqueado quando o tipo está na lista permanente', () => {
    const t = { ...beto(), imunidadesPermanentes: ['alienacao' as const] };
    const r = aplicarStatus(t, 'alienacao', 5);
    expect(r.alvo.status.length).toBe(0);
    // Imunidade permanente vence sobre temporária — narrativa explicita Escola.
    const eve = r.eventos[0]!;
    expect(eve.tipo).toBe('narrativa');
    if (eve.tipo === 'narrativa') {
      expect(eve.texto).toMatch(/Escola/);
    }
  });

  it('aplicarStatus continua aplicando tipos não imunizados', () => {
    const t = { ...beto(), imunidadesPermanentes: ['alienacao' as const] };
    const r = aplicarStatus(t, 'fetichismo', 2);
    expect(r.alvo.status.find((s) => s.tipo === 'fetichismo')).toBeDefined();
  });
});

describe('Comando escolaDeFormacao', () => {
  it('exige Nível 3', () => {
    const r = aplicarComando(partidaCom(2, 50, 50), { tipo: 'escolaDeFormacao' });
    expect(r.erro).toBeDefined();
  });

  it('exige TL ≥ 15 e CM ≥ 5 no Fundo de Greve', () => {
    expect(aplicarComando(partidaCom(3, 10, 10), { tipo: 'escolaDeFormacao' }).erro).toBeDefined();
    expect(aplicarComando(partidaCom(3, 20, 3), { tipo: 'escolaDeFormacao' }).erro).toBeDefined();
  });

  it('imuniza permanentemente todos os trabalhadores e gasta o Fundo', () => {
    const p = partidaCom(3, 30, 10);
    const r = aplicarComando(p, { tipo: 'escolaDeFormacao' });
    expect(r.erro).toBeUndefined();
    expect(r.partida.organizacao.fundoDeGreve.tl).toBe(15);
    expect(r.partida.organizacao.fundoDeGreve.cm).toBe(5);
    for (const t of r.partida.trabalhadores) {
      expect(t.imunidadesPermanentes).toContain('alienacao');
      expect(t.imunidadesPermanentes).toContain('fetichismo');
    }
  });

  it('é idempotente — segunda chamada não cobra recursos se todos já são imunes', () => {
    let p = partidaCom(3, 30, 10);
    p = aplicarComando(p, { tipo: 'escolaDeFormacao' }).partida;
    const fundoApos1 = { ...p.organizacao.fundoDeGreve };

    const r = aplicarComando(p, { tipo: 'escolaDeFormacao' });
    expect(r.partida.organizacao.fundoDeGreve).toEqual(fundoApos1);
  });

  it('NPC do Capital não consegue aplicar Alienação após Escola', () => {
    let p = partidaCom(3, 30, 10);
    p = aplicarComando(p, { tipo: 'escolaDeFormacao' }).partida;
    const alvo = p.trabalhadores[0]!;
    const r = aplicarComando(p, { tipo: 'aplicarStatus', alvoId: alvo.id, status: 'alienacao', turnos: 3 });
    expect(r.partida.trabalhadores[0]!.status.length).toBe(0);
  });
});
