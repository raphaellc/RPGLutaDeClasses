import { EventoPartida } from '@domain/events/EventosDePartida';
import { Partida } from '@domain/entities/Partida';
import { EstatisticasSimulacao } from '../game-modes/MotorSimulado';

/**
 * Calcula estatísticas da partida a partir de um stream plano de eventos
 * e do estado final. Usada pelo turno-a-turno (log acumulado) e pode ser
 * reutilizada por qualquer outro motor que emita EventoPartida.
 */
export function calcularEstatisticasDeEventos(
  eventos: ReadonlyArray<EventoPartida>,
  partidaFinal: Partida,
): EstatisticasSimulacao {
  const trabalhadoresColapsados = eventos
    .filter((e): e is Extract<EventoPartida, { tipo: 'colapso' }> => e.tipo === 'colapso')
    .map((e) => e.trabalhadorId);

  const antagonistasDerrotados = eventos
    .filter((e): e is Extract<EventoPartida, { tipo: 'antagonistaDerrotado' }> => e.tipo === 'antagonistaDerrotado')
    .map((e) => e.antagonistaId);

  const greveGeralConvocada = eventos.some((e) => e.tipo === 'greveGeralConvocada');

  // Escola: verificada no estado final — trabalhadores com imunidades permanentes
  const escolaFundada = partidaFinal.trabalhadores.some((t) => t.imunidadesPermanentes.length > 0);

  const expropriado = eventos.some((e) => e.tipo === 'expropriacao');

  return {
    turnosJogados: partidaFinal.turno,
    trabalhadoresColapsados: [...new Set(trabalhadoresColapsados)],
    antagonistasDerrotados: [...new Set(antagonistasDerrotados)],
    greveGeralConvocada,
    escolaFundada,
    expropriado,
  };
}
