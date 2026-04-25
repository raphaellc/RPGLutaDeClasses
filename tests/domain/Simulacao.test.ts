import { describe, it, expect } from 'vitest';
import { criarPartida } from '@application/use-cases/CriarPartida';
import { rodarSimulacao } from '@application/game-modes/MotorSimulado';

describe('Motor de Simulação', () => {
  it('roda até o fim sem ficar em loop infinito', () => {
    const partida = criarPartida({
      modo: 'simulado',
      dificuldade: 'normal',
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
      dificuldade: 'normal',
      trabalhadores: [{ nome: 'Joana', arquetipo: 'ferreiroEngrenagens' }],
      antagonistas: [{ arquetipo: 'capitalistaIndustrial' }],
    });
    const { passos } = rodarSimulacao(partida, 10);
    for (let i = 1; i < passos.length; i++) {
      // O estado depois de um passo é o antes do próximo.
      expect(passos[i]!.partidaAntes.id).toBe(passos[i - 1]!.partidaDepois.id);
    }
  });

  it('devolve estatisticas com shape correto', () => {
    const partida = criarPartida({
      modo: 'simulado',
      dificuldade: 'normal',
      trabalhadores: [
        { nome: 'Joana', arquetipo: 'ferreiroEngrenagens' },
        { nome: 'Beto', arquetipo: 'fantasmaRede' },
      ],
      antagonistas: [{ arquetipo: 'senhorNuvens' }],
    });
    const { estatisticas } = rodarSimulacao(partida, 20);
    expect(typeof estatisticas.turnosJogados).toBe('number');
    expect(Array.isArray(estatisticas.trabalhadoresColapsados)).toBe(true);
    expect(Array.isArray(estatisticas.antagonistasDerrotados)).toBe(true);
    expect(typeof estatisticas.greveGeralConvocada).toBe('boolean');
    expect(typeof estatisticas.escolaFundada).toBe('boolean');
    expect(typeof estatisticas.expropriado).toBe('boolean');
  });

  it('não trava com múltiplos antagonistas (confronto total)', () => {
    const partida = criarPartida({
      modo: 'simulado',
      dificuldade: 'normal',
      trabalhadores: [
        { nome: 'Joana', arquetipo: 'ferreiroEngrenagens' },
        { nome: 'Beto', arquetipo: 'fantasmaRede' },
        { nome: 'Marcos', arquetipo: 'tradutorVerdades' },
      ],
      antagonistas: [
        { arquetipo: 'capitalistaIndustrial' },
        { arquetipo: 'senhorNuvens' },
        { arquetipo: 'estadoBurgues' },
      ],
    });
    const r = rodarSimulacao(partida, 50);
    expect(r.passos.length).toBeGreaterThan(0);
    // Termina (não é loop infinito)
    expect(['vitoriaProletaria', 'derrotaDoGrupo', 'emAndamento']).toContain(r.partidaFinal.fase);
  });

  it('respeitata maxTurnos mesmo sem vitória', () => {
    const partida = criarPartida({
      modo: 'simulado',
      dificuldade: 'normal',
      trabalhadores: [{ nome: 'Joana', arquetipo: 'ferreiroEngrenagens' }],
      antagonistas: [{ arquetipo: 'estadoBurgues' }], // boss muito difícil
    });
    const r = rodarSimulacao(partida, 5);
    expect(r.partidaFinal.turno).toBeLessThanOrEqual(6); // tolerância de 1 turno de folga
  });
});
