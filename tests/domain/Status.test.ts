import { describe, it, expect } from 'vitest';
import { aplicarMaisValia } from '@domain/services/ExtracaoMaisValia';
import { praxisColetiva } from '@domain/services/Praxis';
import { executarSolidariedade } from '@domain/services/Solidariedade';
import { aplicarStatus, concederImunidade, decairStatus } from '@domain/services/StatusService';
import { beto, joana } from './fixtures';

describe('Efeitos mecânicos dos status (RF08)', () => {
  describe('Fetichismo da Mercadoria', () => {
    it('anula a mitigação de CM contra mais-valia', () => {
      // Beto sem fetichismo: dano 8 - CM 1 = 7 real.
      const semStatus = aplicarMaisValia(beto(), 8);
      const e1 = semStatus.eventos[0]!;
      if (e1.tipo !== 'maisValiaExtraida') throw new Error();
      expect(e1.danoReal).toBe(7);

      // Beto com fetichismo: CM ignorada, dano real = 8.
      const fetichizado = {
        ...beto(),
        status: [{ tipo: 'fetichismo' as const, turnosRestantes: 2 }],
      };
      const r = aplicarMaisValia(fetichizado, 8);
      const e2 = r.eventos[0]!;
      if (e2.tipo !== 'maisValiaExtraida') throw new Error();
      expect(e2.danoReal).toBe(8);
    });
  });

  describe('Alienação', () => {
    it('reduz a contribuição de práxis pela metade', () => {
      const j = joana(); // eixo acaoVsInercia = 0  → contribuição base 5.
      const pNormal = praxisColetiva([j]);
      expect(pNormal).toBe(5);

      const alienada = { ...j, status: [{ tipo: 'alienacao' as const, turnosRestantes: 2 }] };
      const pAlienada = praxisColetiva([alienada]);
      expect(pAlienada).toBe(2); // floor(5/2) = 2
    });

    it('bloqueia o doador de executar Solidariedade', () => {
      const j = { ...joana(), status: [{ tipo: 'alienacao' as const, turnosRestantes: 2 }] };
      const r = executarSolidariedade(j, beto());
      expect(r.ok).toBe(false);
    });
  });

  describe('Imunidade (Manifestação de Massas / Escola de Formação)', () => {
    it('Trabalhador imune ignora a aplicação de novo status', () => {
      const imune = concederImunidade(beto(), 2);
      expect(imune.imunidadeStatusTurnos).toBe(2);

      const r = aplicarStatus(imune, 'alienacao', 3);
      expect(r.alvo.status.length).toBe(0); // não aplicou
      expect(r.eventos[0]!.tipo).toBe('narrativa');
    });

    it('decairStatus reduz status e imunidade em 1 turno', () => {
      const t = {
        ...beto(),
        status: [{ tipo: 'alienacao' as const, turnosRestantes: 2 }],
        imunidadeStatusTurnos: 2,
      };
      const r = decairStatus(t);
      expect(r.alvo.status[0]!.turnosRestantes).toBe(1);
      expect(r.alvo.imunidadeStatusTurnos).toBe(1);
    });

    it('decairStatus emite evento de cura quando o status zera', () => {
      const t = { ...beto(), status: [{ tipo: 'alienacao' as const, turnosRestantes: 1 }] };
      const r = decairStatus(t);
      expect(r.alvo.status.length).toBe(0);
      expect(r.eventos.some((e) => e.tipo === 'statusCurado')).toBe(true);
    });

    it('decairStatus não vai abaixo de zero na imunidade', () => {
      const t = { ...beto(), imunidadeStatusTurnos: 0 };
      const r = decairStatus(t);
      expect(r.alvo.imunidadeStatusTurnos).toBe(0);
    });
  });
});
