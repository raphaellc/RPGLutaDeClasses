import { describe, it, expect } from 'vitest';
import { criarPartida } from '@application/use-cases/CriarPartida';
import { rodarSimulacao } from '@application/game-modes/MotorSimulado';

describe('Motor de Simulação', () => {
  it('roda até o fim sem ficar em loop infinito', () => {
    const partida = criarPartida({
      modo: 'simulado',
      trabalhadores: [
        { nome: 'Joana', arquetipo: 'ferreiroEngrenagens' },
        { nome: 'Beto', arquetipo: 'fantasmaRede' },
        { nome: 'Marcos', arquetipo: 'tradutorVerdades' },
      ],
      antagonistas: [{ arquetipo: 'senhorNuvens' }],
    });
    const r = rodarSimulacao(partida, 30);
    expect(r.passos.length).toBeGreaterThan(0);
    expect(['vitoriaProletaria', 'derrotaDoGrupo', 'emAndamento']).toContain(r.partidaFinal.fase);
  });

  it('fecha cada passo com transição de estado consistente', () => {
    const partida = criarPartida({
      modo: 'simulado',
      trabalhadores: [{ nome: 'Joana', arquetipo: 'ferreiroEngrenagens' }],
      antagonistas: [{ arquetipo: 'capitalistaIndustrial' }],
    });
    const { passos } = rodarSimulacao(partida, 10);
    for (let i = 1; i < passos.length; i++) {
      // O estado depois de um passo é o antes do próximo.
      expect(passos[i]!.partidaAntes.id).toBe(passos[i - 1]!.partidaDepois.id);
    }
  });
});
