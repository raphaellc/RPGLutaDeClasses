import { Partida } from '@domain/entities/Partida';
import { PartidaRepository } from '@application/ports/PartidaRepository';

export class InMemoryPartidaRepository implements PartidaRepository {
  private store = new Map<string, Partida>();

  async salvar(p: Partida): Promise<void> {
    this.store.set(p.id, p);
  }
  async carregar(id: string): Promise<Partida | null> {
    return this.store.get(id) ?? null;
  }
  async listar(): Promise<ReadonlyArray<Partida>> {
    return [...this.store.values()];
  }
  async remover(id: string): Promise<void> {
    this.store.delete(id);
  }
}
