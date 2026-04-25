import { describe, it, expect } from 'vitest';
import { planejarTurnoTrabalhadores } from '@application/npc/EstrategiaProletariado';
import { rodarSimulacao } from '@application/game-modes/MotorSimulado';
import { criarPartida } from '@application/use-cases/CriarPartida';
import { DadoDeterministico } from '@infrastructure/rng/DadoDeterministico';
import { Partida } from '@domain/entities/Partida';

// ── Helpers ──────────────────────────────────────────────────────────────────

function partidaPadrao(): Partida {
  return criarPartida({
    modo: 'simulado',
      dificuldade: 'normal',
    trabalhadores: [
      { nome: 'Joana', arquetipo: 'ferreiroEngrenagens' },
      { nome: 'Beto', arquetipo: 'fantasmaRede' },
      { nome: 'Marcos', arquetipo: 'tradutorVerdades' },
    ],
    antagonistas: [{ arquetipo: 'senhorNuvens' }],
  });
}

// ── planejarTurnoTrabalhadores gera acaoDireta ────────────────────────────────

describe('planejarTurnoTrabalhadores — Ação Direta', () => {
  it('gera pelo menos um Comando acaoDireta por turno', () => {
    const dado = new DadoDeterministico([5]); // sucesso pleno garantido
    const cmds = planejarTurnoTrabalhadores(partidaPadrao(), dado);
    expect(cmds.some((c) => c.tipo === 'acaoDireta')).toBe(true);
  });

  it('acaoDireta tem rolagem pré-calculada com o dado injetado', () => {
    const dado = new DadoDeterministico([6]); // d6 = 6 → sucesso pleno
    const cmds = planejarTurnoTrabalhadores(partidaPadrao(), dado);
    const ad = cmds.find((c) => c.tipo === 'acaoDireta');
    expect(ad?.tipo).toBe('acaoDireta');
    if (ad?.tipo === 'acaoDireta') {
      expect(ad.rolagem.d6).toBe(6);
      expect(ad.rolagem.resultado).toBe('sucessoPleno');
    }
  });

  it('acaoDireta com d6=1 resulta em derrota', () => {
    const dado = new DadoDeterministico([1]); // derrota garantida
    const cmds = planejarTurnoTrabalhadores(partidaPadrao(), dado);
    const ad = cmds.find((c) => c.tipo === 'acaoDireta');
    expect(ad?.tipo).toBe('acaoDireta');
    if (ad?.tipo === 'acaoDireta') {
      expect(ad.rolagem.resultado).toBe('derrota');
    }
  });

  it('acaoDireta com d6=3 resulta em sucessoComCusto e custo definido', () => {
    const dado = new DadoDeterministico([3]); // sucessoComCusto
    const p = partidaPadrao();
    const cmds = planejarTurnoTrabalhadores(p, dado);
    const ad = cmds.find((c) => c.tipo === 'acaoDireta');
    expect(ad?.tipo).toBe('acaoDireta');
    if (ad?.tipo === 'acaoDireta') {
      expect(ad.rolagem.resultado).toBe('sucessoComCusto');
      expect(['pv', 'cm', 'alienacao']).toContain(ad.custoEscolhido);
    }
  });

  it('executor tem PV > 5 (não sacrifica quem está na lona)', () => {
    const dado = new DadoDeterministico([4]);
    // Deixar Joana com PV = 2 (abaixo do limiar)
    const p = partidaPadrao();
    const pComJoanaFraca = {
      ...p,
      trabalhadores: p.trabalhadores.map((t) =>
        t.nome === 'Joana' ? { ...t, recursos: { ...t.recursos, pv: 2 } } : t,
      ),
    };
    const cmds = planejarTurnoTrabalhadores(pComJoanaFraca, dado);
    const ad = cmds.find((c) => c.tipo === 'acaoDireta');
    if (ad?.tipo === 'acaoDireta') {
      // O executor não deve ser Joana (PV ≤ 5)
      const joana = p.trabalhadores.find((t) => t.nome === 'Joana')!;
      expect(ad.executorId).not.toBe(joana.id);
    }
  });

  it('alvo da acaoDireta é um antagonista vivo', () => {
    const dado = new DadoDeterministico([5]);
    const cmds = planejarTurnoTrabalhadores(partidaPadrao(), dado);
    const ad = cmds.find((c) => c.tipo === 'acaoDireta');
    expect(ad?.tipo).toBe('acaoDireta');
    if (ad?.tipo === 'acaoDireta') {
      expect(ad.alvoAntagonistaId).toBeDefined();
    }
  });

  it('dano ao Capital é proporcional ao capital restante (≥5)', () => {
    const dado = new DadoDeterministico([6]);
    const cmds = planejarTurnoTrabalhadores(partidaPadrao(), dado);
    const ad = cmds.find((c) => c.tipo === 'acaoDireta');
    if (ad?.tipo === 'acaoDireta') {
      expect(ad.parametros.danoAoCapitalSeSucesso).toBeGreaterThanOrEqual(5);
    }
  });

  it('intencao é uma string não-vazia', () => {
    const dado = new DadoDeterministico([5]);
    const cmds = planejarTurnoTrabalhadores(partidaPadrao(), dado);
    const ad = cmds.find((c) => c.tipo === 'acaoDireta');
    if (ad?.tipo === 'acaoDireta') {
      expect(ad.parametros.intencao.length).toBeGreaterThan(0);
    }
  });

  it('sem trabalhadores ativos, retorna array vazio', () => {
    const dado = new DadoDeterministico([5]);
    const p = partidaPadrao();
    const semAtivos = {
      ...p,
      trabalhadores: p.trabalhadores.map((t) => ({ ...t, colapsado: true })),
    };
    expect(planejarTurnoTrabalhadores(semAtivos, dado)).toHaveLength(0);
  });
});

// ── Integração: simulação com dado determinístico ─────────────────────────────

describe('Simulação com DadoDeterministico', () => {
  it('termina sem travar — dado favorável ao proletariado', () => {
    const dado = new DadoDeterministico([5, 6, 5, 6]); // sucessos constantes
    const r = rodarSimulacao(partidaPadrao(), 30, dado);
    expect(r.passos.length).toBeGreaterThan(0);
    expect(['vitoriaProletaria', 'derrotaDoGrupo', 'emAndamento']).toContain(r.partidaFinal.fase);
  });

  it('termina sem travar — dado sempre derrota', () => {
    const dado = new DadoDeterministico([1]); // derrota constante (–3 PV/turno)
    const r = rodarSimulacao(partidaPadrao(), 30, dado);
    // Com derrotas constantes, o proletariado colapsa antes de vencer
    expect(r.passos.length).toBeGreaterThan(0);
  });

  it('acaoDireta aparece nos passos da simulação', () => {
    const dado = new DadoDeterministico([5]);
    const r = rodarSimulacao(partidaPadrao(), 10, dado);
    const temAD = r.passos.some((p) => p.comando.tipo === 'acaoDireta');
    expect(temAD).toBe(true);
  });

  it('estatísticas calculadas corretamente com dado determinístico', () => {
    const dado = new DadoDeterministico([6]);
    const r = rodarSimulacao(partidaPadrao(), 20, dado);
    expect(typeof r.estatisticas.turnosJogados).toBe('number');
    expect(r.estatisticas.turnosJogados).toBeGreaterThan(0);
  });
});
