/**
 * Organização — o "Megazord Sindical". Agrega trabalhadores e gere o Fundo de Greve.
 * Os marcos de CC coletiva determinam o nível e desbloqueiam habilidades coletivas.
 */
export type NivelOrganizacao = 1 | 2 | 3 | 4;

export const LIMIARES_NIVEL: Record<NivelOrganizacao, number> = {
  1: 10,   // Célula
  2: 30,   // Sindicato Combativo
  3: 60,   // Partido / Movimento de Massas
  4: 100,  // Conselho / Comuna
};

export interface FundoDeGreve {
  readonly cm: number;
  readonly tl: number;
}

export interface Organizacao {
  readonly id: string;
  readonly nome: string;
  readonly membrosIds: ReadonlyArray<string>;
  readonly nivel: NivelOrganizacao;
  readonly ccColetivaAcumulada: number;
  readonly fundoDeGreve: FundoDeGreve;
}

export function nivelParaCc(cc: number): NivelOrganizacao {
  if (cc >= LIMIARES_NIVEL[4]) return 4;
  if (cc >= LIMIARES_NIVEL[3]) return 3;
  if (cc >= LIMIARES_NIVEL[2]) return 2;
  return 1;
}
