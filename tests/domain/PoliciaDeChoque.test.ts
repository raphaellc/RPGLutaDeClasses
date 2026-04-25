import { describe, it, expect } from 'vitest';
import { aplicarPoliciaDeChoque } from '@domain/services/PoliciaDeChoque';
import { aplicarComando } from '@application/use-cases/AcoesDoTurno';
import { criarPartida } from '@application/use-cases/CriarPartida';
import { Partida } from '@domain/entities/Partida';
import { joana, beto } from './fixtures';

// ── Helpers ──────────────────────────────────────────────────────────────────

function partidaComEstado(): Partida {
  return criarPartida({
    modo: 'turnoATurno',
    trabalhadores: [
      { nome: 'Joana', arquetipo: 'ferreiroEngrenagens' },
      { nome: 'Beto', arquetipo: 'fantasmaRede' },
    ],
    antagonistas: [{ arquetipo: 'estadoBurgues' }],
  });
}

function estadoId(p: Partida): string {
  const ant = p.antagonistas.find((a) => a.arquetipo === 'estadoBurgues');
  if (!ant) throw new Error('Nenhum estadoBurgues na partida');
  return ant.id;
}

// ── Serviço de domínio puro ──────────────────────────────────────────────────

describe('aplicarPoliciaDeChoque — serviço de domínio', () => {
  it('reduz PV e CM diretamente, sem mitigação por CM existente', () => {
    const t = { ...joana(), recursos: { ...joana().recursos, pv: 50, cm: 10 } };
    const r = aplicarPoliciaDeChoque(t, 'estado-1', 8, 4);
    expect(r.alvo.recursos.pv).toBe(42); // 50 - 8
    expect(r.alvo.recursos.cm).toBe(6);  // 10 - 4
  });

  it('PV e CM não vão abaixo de 0', () => {
    const t = { ...beto(), recursos: { ...beto().recursos, pv: 2, cm: 1 } };
    const r = aplicarPoliciaDeChoque(t, 'estado-1', 99, 99);
    expect(r.alvo.recursos.pv).toBe(0);
    expect(r.alvo.recursos.cm).toBe(0);
  });

  it('não toca TL — a força policial não extrai mais-valia', () => {
    const t = { ...joana(), recursos: { ...joana().recursos, tl: 7 } };
    const r = aplicarPoliciaDeChoque(t, 'estado-1', 5, 2);
    expect(r.alvo.recursos.tl).toBe(7); // TL intacto
  });

  it('emite evento policiaDeChoque com danoPV e danoCM corretos', () => {
    const r = aplicarPoliciaDeChoque(joana(), 'est-x', 7, 3);
    const ev = r.eventos[0]!;
    expect(ev.tipo).toBe('policiaDeChoque');
    if (ev.tipo === 'policiaDeChoque') {
      expect(ev.antagonistaId).toBe('est-x');
      expect(ev.alvoId).toBe('joana');
      expect(ev.danoPV).toBe(7);
      expect(ev.danoCM).toBe(3);
    }
  });

  it('emite colapso quando PV chega a 0', () => {
    const t = { ...beto(), recursos: { ...beto().recursos, pv: 3 } };
    const r = aplicarPoliciaDeChoque(t, 'estado-1', 3, 0);
    expect(r.alvo.colapsado).toBe(true);
    const colapsoEv = r.eventos.find((e) => e.tipo === 'colapso');
    expect(colapsoEv).toBeDefined();
  });

  it('CM mitigação NÃO se aplica — mesmo sem Fetichismo', () => {
    // CM alta (10) não deve reduzir o danoPV
    const tComCMAlta = { ...joana(), recursos: { ...joana().recursos, pv: 20, cm: 10 } };
    const r = aplicarPoliciaDeChoque(tComCMAlta, 'estado-1', 8, 0);
    expect(r.alvo.recursos.pv).toBe(12); // 20 - 8, sem mitigação
  });

  it('não age em trabalhador já colapsado', () => {
    const colapsado = { ...beto(), colapsado: true };
    const r = aplicarPoliciaDeChoque(colapsado, 'estado-1', 5, 2);
    expect(r.alvo).toBe(colapsado); // mesmo objeto, imutável
    expect(r.eventos).toHaveLength(0);
  });
});

// ── Comando policiaDeChoque em aplicarComando ────────────────────────────────

describe('Comando policiaDeChoque', () => {
  it('aplica dano split na Partida', () => {
    const p = partidaComEstado();
    const antId = estadoId(p);
    const alvo = p.trabalhadores[0]!;
    const pvAntes = alvo.recursos.pv;
    const cmAntes = alvo.recursos.cm;

    const r = aplicarComando(p, {
      tipo: 'policiaDeChoque',
      antagonistaId: antId,
      alvoId: alvo.id,
      danoPV: 6,
      danoCM: 3,
    });

    expect(r.erro).toBeUndefined();
    const novoAlvo = r.partida.trabalhadores.find((t) => t.id === alvo.id)!;
    expect(novoAlvo.recursos.pv).toBe(pvAntes - 6);
    expect(novoAlvo.recursos.cm).toBe(cmAntes - 3);
    // TL intacto
    expect(novoAlvo.recursos.tl).toBe(alvo.recursos.tl);
  });

  it('é bloqueado por Piquete', () => {
    let p = partidaComEstado();
    const antId = estadoId(p);
    p = {
      ...p,
      antagonistas: p.antagonistas.map((a) =>
        a.id === antId ? { ...a, bloqueadoNoTurno: true } : a,
      ),
    };
    const alvo = p.trabalhadores[0]!;
    const pvAntes = alvo.recursos.pv;
    const r = aplicarComando(p, {
      tipo: 'policiaDeChoque',
      antagonistaId: antId,
      alvoId: alvo.id,
      danoPV: 8,
      danoCM: 4,
    });
    const novoAlvo = r.partida.trabalhadores.find((t) => t.id === alvo.id)!;
    expect(novoAlvo.recursos.pv).toBe(pvAntes);
    expect(r.eventos.some((e) => e.tipo === 'narrativa')).toBe(true);
  });

  it('transita para derrotaDoGrupo quando todos colapsam', () => {
    let p = partidaComEstado();
    const antId = estadoId(p);
    p = {
      ...p,
      trabalhadores: p.trabalhadores.map((t) => ({ ...t, recursos: { ...t.recursos, pv: 1 } })),
    };
    const alvo1 = p.trabalhadores[0]!;
    const alvo2 = p.trabalhadores[1]!;
    // Derrubar o primeiro
    let r = aplicarComando(p, { tipo: 'policiaDeChoque', antagonistaId: antId, alvoId: alvo1.id, danoPV: 1, danoCM: 0 });
    // Derrubar o segundo
    r = aplicarComando(r.partida, { tipo: 'policiaDeChoque', antagonistaId: antId, alvoId: alvo2.id, danoPV: 1, danoCM: 0 });
    expect(r.partida.fase).toBe('derrotaDoGrupo');
  });
});

// ── Integração com planejarTurnoSistema ──────────────────────────────────────

describe('EstrategiaCapital — Estado Burguês usa policiaDeChoque', () => {
  it('o comando gerado é policiaDeChoque (não extrairMaisValia)', async () => {
    const { planejarTurnoSistema } = await import('@application/npc/EstrategiaCapital');
    const p = partidaComEstado();
    const cmds = planejarTurnoSistema(p);
    expect(cmds.length).toBeGreaterThanOrEqual(1);
    expect(cmds[0]!.tipo).toBe('policiaDeChoque');
    expect(cmds.every((c) => c.tipo !== 'extrairMaisValia')).toBe(true);
  });

  it('danoPV ≈ 60 % e danoCM ≈ 40 % do danoBruto (turno 0)', async () => {
    const { planejarTurnoSistema } = await import('@application/npc/EstrategiaCapital');
    const p = partidaComEstado();
    const cmds = planejarTurnoSistema(p);
    const pdc = cmds[0]!;
    expect(pdc.tipo).toBe('policiaDeChoque');
    if (pdc.tipo === 'policiaDeChoque') {
      // danoBrutoBase = 12; danoPV = ceil(12*0.6)=8; danoCM = floor(12*0.4)=4
      expect(pdc.danoPV).toBe(8);
      expect(pdc.danoCM).toBe(4);
    }
  });

  it('no turno % 3 === 0 adiciona Fetichismo', async () => {
    const { planejarTurnoSistema } = await import('@application/npc/EstrategiaCapital');
    const p = { ...partidaComEstado(), turno: 3 };
    const cmds = planejarTurnoSistema(p);
    const statusCmd = cmds.find((c) => c.tipo === 'aplicarStatus');
    expect(statusCmd).toBeDefined();
    if (statusCmd?.tipo === 'aplicarStatus') {
      expect(statusCmd.status).toBe('fetichismo');
    }
  });

  it('fora de turno múltiplo de 3 não há Fetichismo', async () => {
    const { planejarTurnoSistema } = await import('@application/npc/EstrategiaCapital');
    const p = { ...partidaComEstado(), turno: 2 };
    const cmds = planejarTurnoSistema(p);
    expect(cmds.every((c) => c.tipo !== 'aplicarStatus')).toBe(true);
  });

  it('Capitalista Industrial NÃO gera policiaDeChoque', async () => {
    const { planejarTurnoSistema } = await import('@application/npc/EstrategiaCapital');
    const p = criarPartida({
      modo: 'turnoATurno',
      trabalhadores: [{ nome: 'Joana', arquetipo: 'ferreiroEngrenagens' }],
      antagonistas: [{ arquetipo: 'capitalistaIndustrial' }],
    });
    const cmds = planejarTurnoSistema(p);
    expect(cmds.every((c) => c.tipo !== 'policiaDeChoque')).toBe(true);
  });
});
