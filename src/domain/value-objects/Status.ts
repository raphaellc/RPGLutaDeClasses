/**
 * Status negativos aplicados pelo Sistema. Cada um tem efeito narrativo
 * e mecânico próprio (ver services/AplicacaoStatus).
 */
export type StatusNegativo = 'alienacao' | 'fetichismo' | 'paralisado';

export interface StatusAtivo {
  readonly tipo: StatusNegativo;
  readonly turnosRestantes: number;
}
