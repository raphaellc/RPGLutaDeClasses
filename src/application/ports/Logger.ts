import { EventoPartida } from '@domain/events/EventosDePartida';

/**
 * Porta de log narrativo. A apresentação registra para mostrar o
 * "diário da Metrópole-Máquina"; testes podem coletar para asserts.
 */
export interface Logger {
  registrar(evento: EventoPartida): void;
}
