import { ArquetipoCapital } from '../entities/Antagonista';

export interface PerfilAntagonista {
  readonly nomePadrao: string;
  readonly capitalAcumulado: number;
  readonly danoBrutoBase: number;
  readonly descricao: string;
}

export const PERFIS_ANTAGONISTA: Record<ArquetipoCapital, PerfilAntagonista> = {
  capitalistaIndustrial: {
    nomePadrao: 'O Capitalista Industrial',
    capitalAcumulado: 120,
    danoBrutoBase: 6,
    descricao: 'Fábrica e Máquinas Vorazes — dano contínuo, opressão fordista.',
  },
  senhorNuvens: {
    nomePadrao: 'O Algoritmo-Feitor (Olimpo)',
    capitalAcumulado: 100,
    danoBrutoBase: 8,
    descricao: 'Tarifa Dinâmica e vigilância em rede. Aplica Alienação.',
  },
  estadoBurgues: {
    nomePadrao: 'O Estado Burguês',
    capitalAcumulado: 200,
    danoBrutoBase: 12,
    descricao: 'Polícia de Choque (PV) e Tribunais (CM). Boss final.',
  },
};
