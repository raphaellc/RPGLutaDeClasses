import { Trabalhador } from '@domain/entities/Trabalhador';
import { EventoPartida } from '@domain/events/EventosDePartida';

export interface ResultadoMaquinasVorazes {
  trabalhadores: ReadonlyArray<Trabalhador>;
  eventos: EventoPartida[];
}

/**
 * Máquinas Vorazes — dano passivo automático do Capitalista Industrial.
 *
 * Atinge TODOS os trabalhadores não-colapsados a cada turno do sistema.
 * O dano é desgaste físico puro (PV) e não é mitigado por CM:
 * "Você não pode negociar com uma máquina."
 *
 * Bloqueio por Piquete é verificado na camada de aplicação (AcoesDoTurno),
 * não aqui — este serviço apenas aplica dano dado um conjunto de trabalhadores.
 */
export function aplicarMaquinasVorazes(
  trabalhadores: ReadonlyArray<Trabalhador>,
  antagonistaId: string,
  danoBase: number,
): ResultadoMaquinasVorazes {
  const alvosAfetados: Array<{ alvoId: string; dano: number }> = [];
  const eventosColapso: EventoPartida[] = [];

  const novosTrabs = trabalhadores.map((t) => {
    if (t.colapsado) return t;

    const dano = danoBase;
    const novoPV = Math.max(0, t.recursos.pv - dano);
    const colapsou = novoPV === 0;

    alvosAfetados.push({ alvoId: t.id, dano });

    const novoT: Trabalhador = {
      ...t,
      recursos: { ...t.recursos, pv: novoPV },
      colapsado: colapsou,
    };

    if (colapsou) {
      eventosColapso.push({ tipo: 'colapso', trabalhadorId: t.id });
    }

    return novoT;
  });

  const eventoMV: EventoPartida = {
    tipo: 'maquinasVorazes',
    antagonistaId,
    danoBase,
    alvosAfetados,
  };

  return {
    trabalhadores: novosTrabs,
    // Evento-marco primeiro; colapsos ao final (ordem narrativa)
    eventos: [eventoMV, ...eventosColapso],
  };
}
