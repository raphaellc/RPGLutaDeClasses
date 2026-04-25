import { Antagonista } from '../entities/Antagonista';
import { Organizacao } from '../entities/Organizacao';
import { EventoPartida } from '../events/EventosDePartida';

/**
 * UC05 / RF07 — Ações coletivas (Piquete, Greve Geral, Expropriação).
 * Consome recursos do Fundo de Greve e aplica dano ao Capital Acumulado.
 *
 * Padrão: cada ação devolve resultado discriminado — sem exceções.
 */
export type ResultadoAcaoColetiva =
  | { ok: true; organizacao: Organizacao; antagonista: Antagonista; eventos: EventoPartida[] }
  | { ok: false; motivo: string };

const CUSTO_PIQUETE_CM = 5;
const CUSTO_GREVE_GERAL_CM = 15;
const CUSTO_GREVE_GERAL_TL = 20;

/**
 * Piquete: nível ≥ 2, custa 5 CM do Fundo. Bloqueia próximo ataque do alvo
 * e causa dano = praxisColetiva (passada como parâmetro pelo caso de uso).
 */
export function convocarPiquete(
  org: Organizacao,
  alvo: Antagonista,
  praxisColetiva: number,
): ResultadoAcaoColetiva {
  if (alvo.derrotado) return { ok: false, motivo: 'Antagonista já derrotado.' };
  if (org.nivel < 2) return { ok: false, motivo: 'Organização precisa estar no Nível 2 (Sindicato).' };
  if (org.fundoDeGreve.cm < CUSTO_PIQUETE_CM) {
    return { ok: false, motivo: 'Fundo de Greve insuficiente — a classe não consegue sustentar os dias parados.' };
  }

  const danoCapital = Math.max(1, praxisColetiva);
  const novoFundo = { ...org.fundoDeGreve, cm: org.fundoDeGreve.cm - CUSTO_PIQUETE_CM };
  const novoCapital = Math.max(0, alvo.capitalAcumulado - danoCapital);
  const derrotado = novoCapital === 0;

  const eventos: EventoPartida[] = [
    { tipo: 'piqueteConvocado', antagonistaId: alvo.id, danoCapital, custoCm: CUSTO_PIQUETE_CM },
  ];
  if (derrotado) eventos.push({ tipo: 'antagonistaDerrotado', antagonistaId: alvo.id });

  return {
    ok: true,
    organizacao: { ...org, fundoDeGreve: novoFundo },
    antagonista: { ...alvo, capitalAcumulado: novoCapital, bloqueadoNoTurno: true, derrotado },
    eventos,
  };
}

/**
 * Greve Geral: nível ≥ 3, custa 15 CM e 20 TL. Aplica dano massivo a todos os alvos
 * (caller itera sobre os antagonistas vivos).
 */
export function convocarGreveGeral(
  org: Organizacao,
  alvo: Antagonista,
  praxisColetiva: number,
): ResultadoAcaoColetiva {
  if (alvo.derrotado) return { ok: false, motivo: 'Antagonista já derrotado.' };
  if (org.nivel < 3) return { ok: false, motivo: 'Organização precisa estar no Nível 3 (Partido/Movimento).' };
  if (org.fundoDeGreve.cm < CUSTO_GREVE_GERAL_CM || org.fundoDeGreve.tl < CUSTO_GREVE_GERAL_TL) {
    return { ok: false, motivo: 'Recursos insuficientes para uma Greve Geral.' };
  }
  const danoCapital = Math.max(1, praxisColetiva * 2);
  const novoFundo = {
    cm: org.fundoDeGreve.cm - CUSTO_GREVE_GERAL_CM,
    tl: org.fundoDeGreve.tl - CUSTO_GREVE_GERAL_TL,
  };
  const novoCapital = Math.max(0, alvo.capitalAcumulado - danoCapital);
  const derrotado = novoCapital === 0;

  const eventos: EventoPartida[] = [
    { tipo: 'greveGeralConvocada', danoCapital, custoCm: CUSTO_GREVE_GERAL_CM, custoTl: CUSTO_GREVE_GERAL_TL },
  ];
  if (derrotado) eventos.push({ tipo: 'antagonistaDerrotado', antagonistaId: alvo.id });

  return {
    ok: true,
    organizacao: { ...org, fundoDeGreve: novoFundo },
    antagonista: { ...alvo, capitalAcumulado: novoCapital, bloqueadoNoTurno: true, derrotado },
    eventos,
  };
}

/**
 * Expropriação: ação supremo no Nível 4. Reduz a zero o Capital — toma os meios de produção.
 */
export function expropriar(org: Organizacao, alvo: Antagonista): ResultadoAcaoColetiva {
  if (alvo.derrotado) return { ok: false, motivo: 'Antagonista já derrotado.' };
  if (org.nivel < 4) return { ok: false, motivo: 'Organização precisa estar no Nível 4 (Conselho/Comuna).' };
  return {
    ok: true,
    organizacao: org,
    antagonista: { ...alvo, capitalAcumulado: 0, derrotado: true },
    eventos: [
      { tipo: 'expropriacao', antagonistaId: alvo.id },
      { tipo: 'antagonistaDerrotado', antagonistaId: alvo.id },
    ],
  };
}
