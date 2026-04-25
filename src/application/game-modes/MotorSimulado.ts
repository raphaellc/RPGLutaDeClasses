import { Partida } from '@domain/entities/Partida';
import { EventoPartida } from '@domain/events/EventosDePartida';
import { Dado } from '@domain/services/Dado';
import { aplicarComando, Comando } from '../use-cases/AcoesDoTurno';
import { planejarTurnoSistema } from '../npc/EstrategiaCapital';
import { planejarTurnoTrabalhadores } from '../npc/EstrategiaProletariado';
import { DadoCriptografico } from '@infrastructure/rng/DadoCriptografico';

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
  erro?: string;
}

export interface EstatisticasSimulacao {
  turnosJogados: number;
  trabalhadoresColapsados: ReadonlyArray<string>;
  antagonistasDerrotados: ReadonlyArray<string>;
  greveGeralConvocada: boolean;
  escolaFundada: boolean;
  expropriado: boolean;
}

export interface ResultadoSimulacao {
  partidaFinal: Partida;
  passos: ReadonlyArray<PassoSimulacao>;
  estatisticas: EstatisticasSimulacao;
}

const MAX_TURNOS_DEFAULT = 40;

/**
 * @param dado  Porta de aleatoriedade — DadoCriptografico por padrão.
 *              Passe DadoDeterministico nos testes para resultados previsíveis.
 */
export function rodarSimulacao(
  inicial: Partida,
  maxTurnos = MAX_TURNOS_DEFAULT,
  dado: Dado = new DadoCriptografico(),
): ResultadoSimulacao {
  let partida = inicial;
  const passos: PassoSimulacao[] = [];

  while (partida.fase === 'emAndamento' && partida.turno <= maxTurnos) {
    const comandos = partida.turnoAtivoDe === 'jogadores'
      ? planejarTurnoTrabalhadores(partida, dado)
      : planejarTurnoSistema(partida);

    let algumProgresso = false;

    for (const cmd of comandos) {
      const antes = partida;
      const r = aplicarComando(partida, cmd);
      partida = r.partida;
      passos.push({
        partidaAntes: antes,
        comando: cmd,
        partidaDepois: partida,
        eventos: r.eventos,
        erro: r.erro,
      });
      algumProgresso = true;
      if (partida.fase !== 'emAndamento') break;
    }

    if (partida.fase !== 'emAndamento') break;

    // Se nenhum comando foi gerado ou todos falharam sem avançar, ainda assim avançamos
    // para não travar em loop infinito.
    const antes = partida;
    const r = aplicarComando(partida, { tipo: 'avancarTurno' });
    partida = r.partida;
    passos.push({
      partidaAntes: antes,
      comando: { tipo: 'avancarTurno' },
      partidaDepois: partida,
      eventos: r.eventos,
    });

    // Guarda de segurança: se estamos em loop sem progresso real, paramos
    if (!algumProgresso && partida.turno > maxTurnos / 2) break;
  }

  return {
    partidaFinal: partida,
    passos,
    estatisticas: calcularEstatisticas(partida, passos),
  };
}

function calcularEstatisticas(
  partidaFinal: Partida,
  passos: ReadonlyArray<PassoSimulacao>,
): EstatisticasSimulacao {
  const todosEventos = passos.flatMap((p) => p.eventos);

  const trabalhadoresColapsados = todosEventos
    .filter((e) => e.tipo === 'colapso')
    .map((e) => (e.tipo === 'colapso' ? e.trabalhadorId : ''))
    .filter(Boolean);

  const antagonistasDerrotados = todosEventos
    .filter((e) => e.tipo === 'antagonistaDerrotado')
    .map((e) => (e.tipo === 'antagonistaDerrotado' ? e.antagonistaId : ''))
    .filter(Boolean);

  return {
    turnosJogados: partidaFinal.turno,
    trabalhadoresColapsados: [...new Set(trabalhadoresColapsados)],
    antagonistasDerrotados: [...new Set(antagonistasDerrotados)],
    greveGeralConvocada: todosEventos.some((e) => e.tipo === 'greveGeralConvocada'),
    escolaFundada: passos.some((p) => p.comando.tipo === 'escolaDeFormacao' && !p.erro),
    expropriado: todosEventos.some((e) => e.tipo === 'expropriacao'),
  };
}
