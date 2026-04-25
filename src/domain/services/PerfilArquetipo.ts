import { ArquetipoTrabalhador } from '../entities/Trabalhador';
import { LimitesRecursos, Recursos, recursos } from '../value-objects/Recursos';

/**
 * Perfis iniciais por arquétipo. Reflectem a assimetria material descrita no
 * Capítulo 2 do manual: Fabril com CM e PV altos; Uberizado com mobilidade
 * mas exausto; Intelectual com TL alto e foco em discurso.
 */
export interface PerfilInicial {
  readonly limites: LimitesRecursos;
  readonly recursos: Recursos;
  readonly descricao: string;
}

export const PERFIS: Record<ArquetipoTrabalhador, PerfilInicial> = {
  ferreiroEngrenagens: {
    limites: { pvMax: 100, tlMax: 30, cmMax: 15 },
    recursos: recursos(80, 10, 5, 0),
    descricao: 'Proletário Fabril — escuta o lamento do metal. Salário fixo, descanso regulamentado.',
  },
  fantasmaRede: {
    limites: { pvMax: 60, tlMax: 20, cmMax: 8 },
    recursos: recursos(30, 2, 1, 0),
    descricao: 'Trabalhador Uberizado — habita as frestas do algoritmo. Mobilidade, mas em queima constante.',
  },
  tradutorVerdades: {
    limites: { pvMax: 70, tlMax: 35, cmMax: 10 },
    recursos: recursos(60, 15, 3, 0),
    descricao: 'Intelectual Orgânico — vê as palavras invisíveis nos cartazes. Cura a Alienação.',
  },
};
