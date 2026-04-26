import { EixosTensao } from '../value-objects/EixosTensao';
import { LimitesRecursos, Recursos } from '../value-objects/Recursos';
import { StatusAtivo, StatusNegativo } from '../value-objects/Status';

/**
 * Arquétipos jogáveis (Capítulo 2).
 * Cada um tem perfil de recursos, habilidades passivas e ação direta distintos —
 * implementados nos serviços, não na entidade (mantendo a entidade como dado puro).
 */
export type ArquetipoTrabalhador =
  | 'ferreiroEngrenagens'   // Proletário Fabril (regime 6x1, CM alto, descanso garantido)
  | 'fantasmaRede'           // Trabalhador Uberizado (regime 7x7, mobilidade, sem descanso)
  | 'tradutorVerdades'       // Intelectual Orgânico (defesa mental, cura de status)
  | 'jornalistaMilitante';   // Repórter de Base (expõe Fetichismo em toda a classe, –4 TL)

export interface Trabalhador {
  readonly id: string;
  readonly nome: string;
  readonly arquetipo: ArquetipoTrabalhador;
  readonly eixos: EixosTensao;
  readonly limites: LimitesRecursos;
  readonly recursos: Recursos;
  readonly status: ReadonlyArray<StatusAtivo>;
  /**
   * Turnos restantes de imunidade *temporária e total* — bloqueia QUALQUER
   * novo status enquanto > 0. Concedida pela Manifestação de Massas.
   */
  readonly imunidadeStatusTurnos: number;
  /**
   * Imunidades *permanentes* a tipos específicos de status, concedidas pela
   * Escola de Formação. Uma vez na lista, nunca sai — é a "consciência de
   * classe" assimilada. Status já ativos do tipo são curados quando a
   * imunidade é adquirida.
   */
  readonly imunidadesPermanentes: ReadonlyArray<StatusNegativo>;
  readonly colapsado: boolean;
}
