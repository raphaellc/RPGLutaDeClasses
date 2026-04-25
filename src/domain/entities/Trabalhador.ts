import { EixosTensao } from '../value-objects/EixosTensao';
import { LimitesRecursos, Recursos } from '../value-objects/Recursos';
import { StatusAtivo } from '../value-objects/Status';

/**
 * Arquétipos jogáveis (Capítulo 2).
 * Cada um tem perfil de recursos, habilidades passivas e ação direta distintos —
 * implementados nos serviços, não na entidade (mantendo a entidade como dado puro).
 */
export type ArquetipoTrabalhador =
  | 'ferreiroEngrenagens'   // Proletário Fabril (regime 6x1, CM alto, descanso garantido)
  | 'fantasmaRede'           // Trabalhador Uberizado (regime 7x7, mobilidade, sem descanso)
  | 'tradutorVerdades';      // Intelectual Orgânico (defesa mental, cura de status)

export interface Trabalhador {
  readonly id: string;
  readonly nome: string;
  readonly arquetipo: ArquetipoTrabalhador;
  readonly eixos: EixosTensao;
  readonly limites: LimitesRecursos;
  readonly recursos: Recursos;
  readonly status: ReadonlyArray<StatusAtivo>;
  readonly colapsado: boolean;
}
