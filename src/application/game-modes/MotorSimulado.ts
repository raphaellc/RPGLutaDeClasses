import { Partida } from '@domain/entities/Partida';
import { EventoPartida } from '@domain/events/EventosDePartida';
import { aplicarComando, Comando } from '../use-cases/AcoesDoTurno';
import { planejarTurnoSistema } from '../npc/EstrategiaCapital';
import { planejarTurnoTrabalhadores } from '../npc/EstrategiaProletariado';

/**
 * Motor de Simulação. Roda automaticamente até a partida terminar
 * ou até atingir o número máximo de turnos.
 *
 * Não persiste nada — devolve a sequência de estados e eventos.
 * O caller (UI ou teste) decide o que fazer com isso.
 */
export interface PassoSimulacao {
  partidaAntes: Partida;
  comando: Comando;
  partidaDepois: Partida;
  eventos: ReadonlyArray<EventoPartida>;
}

export interface ResultadoSimulacao {
  partidaFinal: Partida;
  passos: ReadonlyArray<PassoSimulacao>;
}

const MAX_TURNOS_DEFAULT = 30;

export function rodarSimulacao(inicial: Partida, maxTurnos = MAX_TURNOS_DEFAULT): ResultadoSimulacao {
  let partida = inicial;
  const passos: PassoSimulacao[] = [];

  while (partida.fase === 'emAndamento' && partida.turno <= maxTurnos) {
    const comandos = partida.turnoAtivoDe === 'jogadores'
      ? planejarTurnoTrabalhadores(partida)
      : planejarTurnoSistema(partida);

    for (const cmd of comandos) {
      const antes = partida;
      const r = aplicarComando(partida, cmd);
      partida = r.partida;
      passos.push({ partidaAntes: antes, comando: cmd, partidaDepois: partida, eventos: r.eventos });
      if (partida.fase !== 'emAndamento') break;
    }

    if (partida.fase !== 'emAndamento') break;

    // Avança o turno
    const antes = partida;
    const r = aplicarComando(partida, { tipo: 'avancarTurno' });
    partida = r.partida;
    passos.push({ partidaAntes: antes, comando: { tipo: 'avancarTurno' }, partidaDepois: partida, eventos: r.eventos });
  }

  return { partidaFinal: partida, passos };
}
