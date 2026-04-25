import { Partida } from '@domain/entities/Partida';

/**
 * Porta de persistência. Implementada em /infrastructure/repositories.
 * Domínio e aplicação dependem da abstração; nenhum import de localStorage aqui.
 */
export interface PartidaRepository {
  salvar(p: Partida): Promise<void>;
  carregar(id: string): Promise<Partida | null>;
  listar(): Promise<ReadonlyArray<Partida>>;
  remover(id: string): Promise<void>;
}
