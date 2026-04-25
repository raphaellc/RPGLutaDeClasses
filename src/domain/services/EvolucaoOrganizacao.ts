import { LIMIARES_NIVEL, NivelOrganizacao, Organizacao, nivelParaCc } from '../entities/Organizacao';
import { EventoPartida } from '../events/EventosDePartida';

/**
 * UC04 / RF05 + RF06 — Contribuição e Evolução da Organização.
 *
 * Trabalhadores doam CC, CM e TL para o "Fundo de Greve". A CC se acumula
 * no caixa coletivo e dispara evolução de nível ao cruzar os marcos.
 */
export interface Contribuicao {
  cc: number;
  cm: number;
  tl: number;
}

const HABILIDADES_POR_NIVEL: Record<NivelOrganizacao, ReadonlyArray<string>> = {
  1: ['Operação Tartaruga', 'Propaganda', 'Solidariedade Direta'],
  2: ['Piquete de Greve', 'Jornal Operário'],
  3: ['Greve Geral', 'Manifestação de Massas', 'Escola de Formação'],
  4: ['Expropriação'],
};

export function contribuirParaOrganizacao(
  org: Organizacao,
  c: Contribuicao,
): { organizacao: Organizacao; eventos: EventoPartida[] } {
  const ccTotal = org.ccColetivaAcumulada + Math.max(0, c.cc);
  const novoNivel = nivelParaCc(ccTotal);
  const fundo = {
    cm: org.fundoDeGreve.cm + Math.max(0, c.cm),
    tl: org.fundoDeGreve.tl + Math.max(0, c.tl),
  };
  const novaOrg: Organizacao = {
    ...org,
    ccColetivaAcumulada: ccTotal,
    fundoDeGreve: fundo,
    nivel: novoNivel,
  };

  const eventos: EventoPartida[] = [];
  if (novoNivel > org.nivel) {
    eventos.push({
      tipo: 'organizacaoEvoluiu',
      nivelAnterior: org.nivel,
      nivelNovo: novoNivel,
      habilidadesDesbloqueadas: HABILIDADES_POR_NIVEL[novoNivel],
    });
  }
  return { organizacao: novaOrg, eventos };
}

export function habilidadesDisponiveis(org: Organizacao): ReadonlyArray<string> {
  const niveis: NivelOrganizacao[] = [1, 2, 3, 4];
  return niveis.filter((n) => n <= org.nivel).flatMap((n) => HABILIDADES_POR_NIVEL[n]);
}

export { LIMIARES_NIVEL };
