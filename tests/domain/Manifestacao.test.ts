import { describe, it, expect } from 'vitest';
import { criarPartida } from '@application/use-cases/CriarPartida';
import { aplicarComando } from '@application/use-cases/AcoesDoTurno';
import { Partida } from '@domain/entities/Partida';

function partidaNivel(nivel: 1 | 2 | 3 | 4, fundoTl: number): Partida {
  const base = criarPartida({
    modo: 'turnoATurno',
    trabalhadores: [
      { nome: 'Joana', arquetipo: 'ferreiroEngrenagens' },
      { nome: 'Beto', arquetipo: 'fantasmaRede' },
    ],
    antagonistas: [{ arquetipo: 'senhorNuvens' }],
  });
  return {
    ...base,
    organizacao: {
      ...base.organizacao,
      nivel,
      fundoDeGreve: { cm: 0, tl: fundoTl },
    },
  };
}

describe('Manifestação de Massas', () => {
  it('exige Nível 3 da Organização', () => {
    const r = aplicarComando(partidaNivel(2, 50), { tipo: 'manifestacaoDeMassas' });
    expect(r.erro).toBeDefined();
  });

  it('exige TL suficiente no Fundo de Greve', () => {
    const r = aplicarComando(partidaNivel(3, 5), { tipo: 'manifestacaoDeMassas' });
    expect(r.erro).toBeDefined();
  });

  it('concede imunidade a todos os trabalhadores e gasta 10 TL do Fundo', () => {
    const p = partidaNivel(3, 30);
    const r = aplicarComando(p, { tipo: 'manifestacaoDeMassas' });
    expect(r.erro).toBeUndefined();
    expect(r.partida.organizacao.fundoDeGreve.tl).toBe(20);
    for (const t of r.partida.trabalhadores) {
      expect(t.imunidadeStatusTurnos).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('Decay automático ao avançar turno', () => {
  it('decai status apenas quando o ciclo volta para os jogadores', () => {
    let p = partidaNivel(1, 0);
    // Aplica status em Joana
    p = aplicarComando(p, { tipo: 'aplicarStatus', alvoId: p.trabalhadores[0]!.id, status: 'alienacao', turnos: 2 }).partida;

    // Avança para o sistema → não decai
    p = aplicarComando(p, { tipo: 'avancarTurno' }).partida;
    expect(p.trabalhadores[0]!.status[0]!.turnosRestantes).toBe(2);

    // Avança de volta para os jogadores → decai
    p = aplicarComando(p, { tipo: 'avancarTurno' }).partida;
    expect(p.trabalhadores[0]!.status[0]!.turnosRestantes).toBe(1);
  });
});
