/**
 * Antagonistas — sempre NPCs (controlados pela Voz do Sistema, nunca pelo jogador).
 * Cada arquétipo tem padrão de ataque distinto (ver application/npc/EstrategiaCapital).
 */
export type ArquetipoCapital =
  | 'capitalistaIndustrial' // Fábrica + Máquinas Vorazes (dano contínuo)
  | 'senhorNuvens'           // Algoritmo + Tarifa Dinâmica + Alienação
  | 'estadoBurgues';         // Polícia (PV) + Tribunais (CM) — boss final

export interface Antagonista {
  readonly id: string;
  readonly nome: string;
  readonly arquetipo: ArquetipoCapital;
  readonly capitalAcumulado: number;     // "HP" do antagonista
  readonly capitalAcumuladoMax: number;
  readonly bloqueadoNoTurno: boolean;    // efeito de Piquete
  readonly emTarifaDinamica: boolean;    // Senhor das Nuvens: surge pricing ativo neste turno
  readonly derrotado: boolean;
}
