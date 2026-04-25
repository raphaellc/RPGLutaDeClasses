/**
 * Recursos materiais do trabalhador.
 *  - PV (Tempo de Vida)        : saúde física/mental. Zero = colapso.
 *  - TL (Tempo Livre)          : "mana" para Práxis. Zero = vive no automático.
 *  - CM (Condições Materiais)  : "armadura" — comida, teto, dinheiro.
 *  - CC (Consciência de Classe): "XP" — gerado por solidariedade.
 */
export interface Recursos {
  readonly pv: number;
  readonly tl: number;
  readonly cm: number;
  readonly cc: number;
}

export interface LimitesRecursos {
  readonly pvMax: number;
  readonly tlMax: number;
  readonly cmMax: number;
}

export function recursos(pv: number, tl: number, cm: number, cc = 0): Recursos {
  return { pv, tl, cm, cc };
}

const naoNeg = (n: number) => (n < 0 ? 0 : n);
const teto = (n: number, max?: number) => (max !== undefined && n > max ? max : n);

export function comPv(r: Recursos, pv: number, lim?: LimitesRecursos): Recursos {
  return { ...r, pv: teto(naoNeg(pv), lim?.pvMax) };
}
export function comTl(r: Recursos, tl: number, lim?: LimitesRecursos): Recursos {
  return { ...r, tl: teto(naoNeg(tl), lim?.tlMax) };
}
export function comCm(r: Recursos, cm: number, lim?: LimitesRecursos): Recursos {
  return { ...r, cm: teto(naoNeg(cm), lim?.cmMax) };
}
export function comCc(r: Recursos, cc: number): Recursos {
  return { ...r, cc: naoNeg(cc) };
}

export function colapsou(r: Recursos): boolean {
  return r.pv <= 0;
}
