import { Trabalhador } from '@domain/entities/Trabalhador';
import { Antagonista } from '@domain/entities/Antagonista';
import { Organizacao } from '@domain/entities/Organizacao';
import { criarEixos } from '@domain/value-objects/EixosTensao';
import { recursos } from '@domain/value-objects/Recursos';
import { PERFIS } from '@domain/services/PerfilArquetipo';

export function joana(): Trabalhador {
  const perfil = PERFIS.ferreiroEngrenagens;
  return {
    id: 'joana',
    nome: 'Joana',
    arquetipo: 'ferreiroEngrenagens',
    eixos: criarEixos(2, 1, 0),
    limites: perfil.limites,
    recursos: recursos(80, 10, 5, 0),
    status: [],
    imunidadeStatusTurnos: 0,
    colapsado: false,
  };
}

export function beto(): Trabalhador {
  const perfil = PERFIS.fantasmaRede;
  return {
    id: 'beto',
    nome: 'Beto',
    arquetipo: 'fantasmaRede',
    eixos: criarEixos(0, 0, 2),
    limites: perfil.limites,
    recursos: recursos(30, 2, 1, 0),
    status: [],
    imunidadeStatusTurnos: 0,
    colapsado: false,
  };
}

export function olimpo(): Antagonista {
  return {
    id: 'olimpo',
    nome: 'Olimpo',
    arquetipo: 'senhorNuvens',
    capitalAcumulado: 100,
    capitalAcumuladoMax: 100,
    bloqueadoNoTurno: false,
    derrotado: false,
  };
}

export function faisca(membros: string[]): Organizacao {
  return {
    id: 'org-faisca',
    nome: 'A Faísca',
    membrosIds: membros,
    nivel: 1,
    ccColetivaAcumulada: 0,
    fundoDeGreve: { cm: 2, tl: 5 },
  };
}
