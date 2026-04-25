import { Partida } from '@domain/entities/Partida';
import { EventoPartida } from '@domain/events/EventosDePartida';
import { aplicarComando, Comando } from '../use-cases/AcoesDoTurno';
import { planejarTurnoSistema } from '../npc/EstrategiaCapital';

/**
 * Motor turno-a-turno. A UI dirige: chama executarAcao para cada
 * comando do jogador e finalizarTurnoJogadores para passar a vez à
 * Voz do Sistema (que joga sozinha via NPC AI).
 */
export interface ResultadoAcao {
  partida: Partida;
  eventos: ReadonlyArray<EventoPartida>;
  erro?: string;
}

export function executarAcao(p: Partida, c: Comando): ResultadoAcao {
  if (p.turnoAtivoDe !== 'jogadores') {
    return { partida: p, eventos: [], erro: 'Não é o turno dos trabalhadores.' };
  }
  return aplicarComando(p, c);
}

/**
 * Encerra o turno dos jogadores: passa a vez para o Sistema, executa toda a IA
 * de antagonistas, e devolve a partida pronta para o próximo turno do jogador.
 */
export function encerrarTurnoJogadores(p: Partida): ResultadoAcao {
  if (p.turnoAtivoDe !== 'jogadores') {
    return { partida: p, eventos: [], erro: 'Não é o turno dos trabalhadores.' };
  }
  const eventosAcumulados: EventoPartida[] = [];

  // Passa a vez ao sistema
  let r = aplicarComando(p, { tipo: 'avancarTurno' });
  let partida = r.partida;
  eventosAcumulados.push(...r.eventos);

  // IA do Capital age
  const comandos = planejarTurnoSistema(partida);
  for (const cmd of comandos) {
    if (partida.fase !== 'emAndamento') break;
    const rr = aplicarComando(partida, cmd);
    partida = rr.partida;
    eventosAcumulados.push(...rr.eventos);
  }

  if (partida.fase === 'emAndamento') {
    // Devolve o turno aos jogadores
    const rr = aplicarComando(partida, { tipo: 'avancarTurno' });
    partida = rr.partida;
    eventosAcumulados.push(...rr.eventos);
  }

  return { partida, eventos: eventosAcumulados };
}
