import { describe, it, expect } from 'vitest';
import { aplicarResultadoAcao, bonusEixo, classificarTotal, Rolagem } from '@domain/services/AcaoDireta';
import { DadoDeterministico } from '@infrastructure/rng/DadoDeterministico';
import { rolarAcaoDireta } from '@application/use-cases/IniciarAcaoDireta';
import { aplicarComando } from '@application/use-cases/AcoesDoTurno';
import { criarPartida } from '@application/use-cases/CriarPartida';
import { beto, joana } from './fixtures';

describe('AcaoDireta — classificação e bônus', () => {
  it('classificarTotal: 5+ = sucessoPleno, 3-4 = sucessoComCusto, 1-2 = derrota', () => {
    expect(classificarTotal(6)).toBe('sucessoPleno');
    expect(classificarTotal(5)).toBe('sucessoPleno');
    expect(classificarTotal(4)).toBe('sucessoComCusto');
    expect(classificarTotal(3)).toBe('sucessoComCusto');
    expect(classificarTotal(2)).toBe('derrota');
    expect(classificarTotal(1)).toBe('derrota');
  });

  it('bonusEixo lê o eixo correto do trabalhador', () => {
    const j = { ...joana(), eixos: { suorVsSonho: 2, conscienciaVsRuido: -1, acaoVsInercia: 3 } };
    expect(bonusEixo(j, 'suorVsSonho')).toBe(2);
    expect(bonusEixo(j, 'conscienciaVsRuido')).toBe(-1);
    expect(bonusEixo(j, 'acaoVsInercia')).toBe(3);
  });
});

describe('rolarAcaoDireta — caso de uso de aplicação', () => {
  it('rola o d6 e soma o bônus do eixo', () => {
    const dado = new DadoDeterministico([4]);
    const j = { ...joana(), eixos: { suorVsSonho: 0, conscienciaVsRuido: 0, acaoVsInercia: 2 } };
    const r = rolarAcaoDireta(j, 'acaoVsInercia', dado);
    expect(r.d6).toBe(4);
    expect(r.bonus).toBe(2);
    expect(r.total).toBe(6);
    expect(r.resultado).toBe('sucessoPleno');
  });
});

function rolagemFalsa(d6: number, bonus = 0): Rolagem {
  const total = d6 + bonus;
  return { d6, bonus, total, resultado: classificarTotal(total), eixo: 'acaoVsInercia' };
}

describe('aplicarResultadoAcao — três caminhos', () => {
  const param = { intencao: 'Sabotar a esteira', eixo: 'acaoVsInercia' as const, danoAoCapitalSeSucesso: 20 };

  it('sucesso pleno: dano total ao Capital, sem custo no executor', () => {
    const j = joana();
    const res = aplicarResultadoAcao(j, rolagemFalsa(6), param);
    expect(res.danoAoCapital).toBe(20);
    expect(res.executor.recursos).toEqual(j.recursos);
  });

  it('sucesso com custo (cm): dano metade, –1 CM no executor', () => {
    const j = joana();
    const res = aplicarResultadoAcao(j, rolagemFalsa(4), param, 'cm');
    expect(res.danoAoCapital).toBe(10);
    expect(res.executor.recursos.cm).toBe(j.recursos.cm - 1);
  });

  it('sucesso com custo (pv): –2 PV no executor', () => {
    const j = joana();
    const res = aplicarResultadoAcao(j, rolagemFalsa(3), param, 'pv');
    expect(res.executor.recursos.pv).toBe(j.recursos.pv - 2);
  });

  it('sucesso com custo (alienacao): aplica status de Alienação por 2 turnos', () => {
    const j = joana();
    const res = aplicarResultadoAcao(j, rolagemFalsa(3), param, 'alienacao');
    expect(res.executor.status.some((s) => s.tipo === 'alienacao')).toBe(true);
  });

  it('imunidade absorve o tique de Alienação no sucesso com custo', () => {
    const j = { ...joana(), imunidadeStatusTurnos: 2 };
    const res = aplicarResultadoAcao(j, rolagemFalsa(3), param, 'alienacao');
    expect(res.executor.status.length).toBe(0);
  });

  it('derrota: sem dano ao Capital, –3 PV poéticos', () => {
    const j = joana();
    const res = aplicarResultadoAcao(j, rolagemFalsa(2), param);
    expect(res.danoAoCapital).toBe(0);
    expect(res.executor.recursos.pv).toBe(j.recursos.pv - 3);
  });

  it('derrota colapsa o executor se PV chega a zero', () => {
    const fragil = { ...beto(), recursos: { ...beto().recursos, pv: 2 } };
    const res = aplicarResultadoAcao(fragil, rolagemFalsa(1), { intencao: 'desafiar o algoritmo', eixo: 'acaoVsInercia' });
    expect(res.executor.colapsado).toBe(true);
    expect(res.eventos.some((e) => e.tipo === 'colapso')).toBe(true);
  });
});

describe('Comando acaoDireta — integração com aplicarComando', () => {
  it('aplica dano ao alvo antagonista no sucesso pleno e emite evento detalhado', () => {
    const partida = criarPartida({
      modo: 'turnoATurno',
      dificuldade: 'normal',
      trabalhadores: [{ nome: 'Joana', arquetipo: 'ferreiroEngrenagens' }],
      antagonistas: [{ arquetipo: 'capitalistaIndustrial' }],
    });
    const exec = partida.trabalhadores[0]!;
    const ant = partida.antagonistas[0]!;
    const capInicial = ant.capitalAcumulado;

    const r = aplicarComando(partida, {
      tipo: 'acaoDireta',
      executorId: exec.id,
      alvoAntagonistaId: ant.id,
      parametros: { intencao: 'Quebrar a esteira', eixo: 'acaoVsInercia', danoAoCapitalSeSucesso: 25 },
      rolagem: rolagemFalsa(6),
    });

    expect(r.erro).toBeUndefined();
    const novoAnt = r.partida.antagonistas[0]!;
    expect(novoAnt.capitalAcumulado).toBe(capInicial - 25);
    expect(r.eventos.some((e) => e.tipo === 'acaoDiretaResolvida')).toBe(true);
  });

  it('derrota a antagonistas se o dano zera o Capital Acumulado', () => {
    const partida = criarPartida({
      modo: 'turnoATurno',
      dificuldade: 'normal',
      trabalhadores: [{ nome: 'Joana', arquetipo: 'ferreiroEngrenagens' }],
      antagonistas: [{ arquetipo: 'senhorNuvens' }],
    });
    const exec = partida.trabalhadores[0]!;
    const ant = partida.antagonistas[0]!;

    const r = aplicarComando(partida, {
      tipo: 'acaoDireta',
      executorId: exec.id,
      alvoAntagonistaId: ant.id,
      parametros: { intencao: 'Greve solo épica', eixo: 'acaoVsInercia', danoAoCapitalSeSucesso: 9999 },
      rolagem: rolagemFalsa(6),
    });

    expect(r.partida.antagonistas[0]!.derrotado).toBe(true);
    expect(r.partida.fase).toBe('vitoriaProletaria');
    expect(r.eventos.some((e) => e.tipo === 'antagonistaDerrotado')).toBe(true);
  });
});
