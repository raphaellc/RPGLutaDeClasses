import { Partida } from '@domain/entities/Partida';
import { PartidaRepository } from '@application/ports/PartidaRepository';

const PREFIXO = 'rpg-luta:partida:';
const INDICE = 'rpg-luta:indice';

/**
 * Adapta o domínio à API DOM (localStorage). Falha graciosamente quando
 * o storage não estiver disponível (modo incógnito, SSR).
 */
export class LocalStoragePartidaRepository implements PartidaRepository {
  private get ls(): Storage | null {
    try {
      return typeof window !== 'undefined' ? window.localStorage : null;
    } catch {
      return null;
    }
  }

  private indice(): string[] {
    if (!this.ls) return [];
    try {
      const raw = this.ls.getItem(INDICE);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  }

  private setIndice(ids: string[]): void {
    if (!this.ls) return;
    this.ls.setItem(INDICE, JSON.stringify([...new Set(ids)]));
  }

  async salvar(p: Partida): Promise<void> {
    if (!this.ls) return;
    this.ls.setItem(PREFIXO + p.id, JSON.stringify(p));
    this.setIndice([...this.indice(), p.id]);
  }

  async carregar(id: string): Promise<Partida | null> {
    if (!this.ls) return null;
    const raw = this.ls.getItem(PREFIXO + id);
    return raw ? (JSON.parse(raw) as Partida) : null;
  }

  async listar(): Promise<ReadonlyArray<Partida>> {
    const out: Partida[] = [];
    for (const id of this.indice()) {
      const p = await this.carregar(id);
      if (p) out.push(p);
    }
    return out;
  }

  async remover(id: string): Promise<void> {
    if (!this.ls) return;
    this.ls.removeItem(PREFIXO + id);
    this.setIndice(this.indice().filter((x) => x !== id));
  }
}
