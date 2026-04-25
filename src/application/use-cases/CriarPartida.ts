import { Antagonista, ArquetipoCapital } from '@domain/entities/Antagonista';
import { Organizacao } from '@domain/entities/Organizacao';
import { ModoJogo, Partida } from '@domain/entities/Partida';
import { ArquetipoTrabalhador, Trabalhador } from '@domain/entities/Trabalhador';
import { criarEixos } from '@domain/value-objects/EixosTensao';
import { PERFIS } from '@domain/services/PerfilArquetipo';
import { PERFIS_ANTAGONISTA } from '@domain/services/PerfilAntagonista';

export interface DefinicaoTrabalhador {
  id?: string;
  nome: string;
  arquetipo: ArquetipoTrabalhador;
  eixos?: { suor: number; consciencia: number; acao: number };
}

export interface DefinicaoAntagonista {
  id?: string;
  arquetipo: ArquetipoCapital;
  nome?: string;
}

export interface EntradaCriarPartida {
  modo: ModoJogo;
  trabalhadores: ReadonlyArray<DefinicaoTrabalhador>;
  antagonistas: ReadonlyArray<DefinicaoAntagonista>;
  nomeOrganizacao?: string;
}

const novoId = () =>
  globalThis.crypto?.randomUUID?.() ?? `id-${Math.random().toString(36).slice(2)}-${Date.now()}`;

export function criarPartida(entrada: EntradaCriarPartida): Partida {
  const trabalhadores: Trabalhador[] = entrada.trabalhadores.map((d) => {
    const perfil = PERFIS[d.arquetipo];
    return {
      id: d.id ?? novoId(),
      nome: d.nome,
      arquetipo: d.arquetipo,
      eixos: criarEixos(d.eixos?.suor ?? 0, d.eixos?.consciencia ?? 0, d.eixos?.acao ?? 0),
      limites: perfil.limites,
      recursos: perfil.recursos,
      status: [],
      imunidadeStatusTurnos: 0,
      imunidadesPermanentes: [],
      colapsado: false,
    };
  });

  const antagonistas: Antagonista[] = entrada.antagonistas.map((d) => {
    const perfil = PERFIS_ANTAGONISTA[d.arquetipo];
    return {
      id: d.id ?? novoId(),
      nome: d.nome ?? perfil.nomePadrao,
      arquetipo: d.arquetipo,
      capitalAcumulado: perfil.capitalAcumulado,
      capitalAcumuladoMax: perfil.capitalAcumulado,
      bloqueadoNoTurno: false,
      emTarifaDinamica: false,
      derrotado: false,
    };
  });

  const organizacao: Organizacao = {
    id: novoId(),
    nome: entrada.nomeOrganizacao ?? 'A Faísca',
    membrosIds: trabalhadores.map((t) => t.id),
    nivel: 1,
    ccColetivaAcumulada: 0,
    fundoDeGreve: { cm: 0, tl: 0 },
  };

  return {
    id: novoId(),
    modo: entrada.modo,
    turno: 1,
    turnoAtivoDe: 'jogadores',
    trabalhadores,
    antagonistas,
    organizacao,
    fase: 'emAndamento',
    criadaEm: new Date().toISOString(),
  };
}
