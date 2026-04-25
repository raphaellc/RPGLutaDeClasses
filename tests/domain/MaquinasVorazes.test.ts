import { describe, it, expect } from 'vitest';
import { aplicarMaquinasVorazes } from '@domain/services/MaquinasVorazes';
import { aplicarComando } from '@application/use-cases/AcoesDoTurno';
import { criarPartida } from '@application/use-cases/CriarPartida';
import { Partida } from '@domain/entities/Partida';
import { Trabalhador } from '@domain/entities/Trabalhador';
import { joana, beto } from './fixtures';

// ── Helpers ──────────────────────────────────────────────────────────────────

function capitalistaId(p: Partida): string {
  const ant = p.antagonistas.find((a) => a.arquetipo === 'capitalistaIndustrial');
  if (!ant) throw new Error('Nenhum capitalistaIndustrial na partida');
  return ant.id;
}

function partidaComCapitalista(): Partida {
  return criarPartida({
    modo: 'turnoATurno',
      dificuldade: 'normal',
    trabalhadores: [
      { nome: 'Joana', arquetipo: 'ferreiroEngrenagens' },
      { nome: 'Beto', arquetipo: 'fantasmaRede' },
    ],
    antagonistas: [{ arquetipo: 'capitalistaIndustrial' }],
  });
}

// ── Serviço de domínio puro ──────────────────────────────────────────────────

describe('aplicarMaquinasVorazes — serviço de domínio', () => {
  it('reduz PV de todos os trabalhadores não-colapsados', () => {
    const trabalhadores: Trabalhador[] = [joana(), beto()];
    const pvAntes = trabalhadores.map((t) => t.recursos.pv);
    const r = aplicarMaquinasVorazes(trabalhadores, 'cap-1', 3);
    for (let i = 0; i < r.trabalhadores.length; i++) {
      expect(r.trabalhadores[i]!.recursos.pv).toBe(pvAntes[i]! - 3);
    }
  });

  it('não afeta trabalhadores já colapsados', () => {
    const colapsado: Trabalhador = { ...joana(), colapsado: true };
    const r = aplicarMaquinasVorazes([colapsado, beto()], 'cap-1', 5);
    // Joana (colapsada) não muda; Beto sim
    expect(r.trabalhadores[0]!.recursos.pv).toBe(joana().recursos.pv);
    expect(r.trabalhadores[1]!.recursos.pv).toBe(beto().recursos.pv - 5);
    // Apenas Beto aparece em alvosAfetados
    expect(r.eventos[0]!.tipo).toBe('maquinasVorazes');
    if (r.eventos[0]!.tipo === 'maquinasVorazes') {
      expect(r.eventos[0]!.alvosAfetados).toHaveLength(1);
      expect(r.eventos[0]!.alvosAfetados[0]!.alvoId).toBe('beto');
    }
  });

  it('emite evento maquinasVorazes com danoBase e alvosAfetados corretos', () => {
    const r = aplicarMaquinasVorazes([joana(), beto()], 'cap-x', 4);
    const ev = r.eventos[0]!;
    expect(ev.tipo).toBe('maquinasVorazes');
    if (ev.tipo === 'maquinasVorazes') {
      expect(ev.antagonistaId).toBe('cap-x');
      expect(ev.danoBase).toBe(4);
      expect(ev.alvosAfetados).toHaveLength(2);
    }
  });

  it('PV não vai abaixo de 0', () => {
    const fraco: Trabalhador = { ...beto(), recursos: { ...beto().recursos, pv: 1 } };
    const r = aplicarMaquinasVorazes([fraco], 'cap-1', 99);
    expect(r.trabalhadores[0]!.recursos.pv).toBe(0);
  });

  it('emite evento colapso quando PV chega a 0', () => {
    const naLimite: Trabalhador = { ...beto(), recursos: { ...beto().recursos, pv: 2 } };
    const r = aplicarMaquinasVorazes([naLimite], 'cap-1', 2);
    expect(r.trabalhadores[0]!.colapsado).toBe(true);
    const colapsoEv = r.eventos.find((e) => e.tipo === 'colapso');
    expect(colapsoEv).toBeDefined();
    if (colapsoEv?.tipo === 'colapso') {
      expect(colapsoEv.trabalhadorId).toBe('beto');
    }
  });

  it('evento maquinasVorazes antecede evento de colapso', () => {
    const naLimite: Trabalhador = { ...joana(), recursos: { ...joana().recursos, pv: 1 } };
    const r = aplicarMaquinasVorazes([naLimite], 'cap-1', 5);
    expect(r.eventos[0]!.tipo).toBe('maquinasVorazes');
    expect(r.eventos[1]!.tipo).toBe('colapso');
  });
});

// ── Comando maquinasVorazes em aplicarComando ────────────────────────────────

describe('Comando maquinasVorazes', () => {
  it('aplica dano a todos os trabalhadores na Partida', () => {
    const p = partidaComCapitalista();
    const antId = capitalistaId(p);
    const pvAntes = p.trabalhadores.map((t) => t.recursos.pv);
    const r = aplicarComando(p, { tipo: 'maquinasVorazes', antagonistaId: antId, danoBase: 3 });
    expect(r.erro).toBeUndefined();
    for (let i = 0; i < r.partida.trabalhadores.length; i++) {
      expect(r.partida.trabalhadores[i]!.recursos.pv).toBe(pvAntes[i]! - 3);
    }
  });

  it('é bloqueado por Piquete (bloqueadoNoTurno)', () => {
    let p = partidaComCapitalista();
    const antId = capitalistaId(p);
    // Simular efeito do Piquete
    p = {
      ...p,
      antagonistas: p.antagonistas.map((a) =>
        a.id === antId ? { ...a, bloqueadoNoTurno: true } : a,
      ),
    };
    const pvAntes = p.trabalhadores.map((t) => t.recursos.pv);
    const r = aplicarComando(p, { tipo: 'maquinasVorazes', antagonistaId: antId, danoBase: 3 });
    // PV intacto — Piquete parou as máquinas
    for (let i = 0; i < r.partida.trabalhadores.length; i++) {
      expect(r.partida.trabalhadores[i]!.recursos.pv).toBe(pvAntes[i]!);
    }
    // Deve emitir narrativa explicativa
    expect(r.eventos.some((e) => e.tipo === 'narrativa')).toBe(true);
  });

  it('não falha para antagonista derrotado', () => {
    let p = partidaComCapitalista();
    const antId = capitalistaId(p);
    p = {
      ...p,
      antagonistas: p.antagonistas.map((a) =>
        a.id === antId ? { ...a, derrotado: true } : a,
      ),
    };
    const r = aplicarComando(p, { tipo: 'maquinasVorazes', antagonistaId: antId, danoBase: 3 });
    expect(r.erro).toBeDefined();
  });

  it('transita para derrotaDoGrupo quando todos colapsam', () => {
    let p = partidaComCapitalista();
    const antId = capitalistaId(p);
    // Deixar todos os trabalhadores com 1 PV
    p = {
      ...p,
      trabalhadores: p.trabalhadores.map((t) => ({
        ...t,
        recursos: { ...t.recursos, pv: 1 },
      })),
    };
    const r = aplicarComando(p, { tipo: 'maquinasVorazes', antagonistaId: antId, danoBase: 1 });
    expect(r.partida.fase).toBe('derrotaDoGrupo');
  });
});

// ── Integração com planejarTurnoSistema ──────────────────────────────────────

describe('EstrategiaCapital — Capitalista Industrial gera Máquinas Vorazes', () => {
  it('o primeiro comando do turno é maquinasVorazes', async () => {
    const { planejarTurnoSistema } = await import('@application/npc/EstrategiaCapital');
    const p = partidaComCapitalista();
    const cmds = planejarTurnoSistema(p);
    // Pelo menos dois comandos: maquinasVorazes + extrairMaisValia
    expect(cmds.length).toBeGreaterThanOrEqual(2);
    expect(cmds[0]!.tipo).toBe('maquinasVorazes');
    expect(cmds[1]!.tipo).toBe('extrairMaisValia');
  });

  it('maquinasVorazes escala com o turno', async () => {
    const { planejarTurnoSistema } = await import('@application/npc/EstrategiaCapital');
    const p0 = { ...partidaComCapitalista(), turno: 0 };
    const p8 = { ...partidaComCapitalista(), turno: 8 };
    const cmds0 = planejarTurnoSistema(p0);
    const cmds8 = planejarTurnoSistema(p8);
    const mv0 = cmds0[0]!;
    const mv8 = cmds8[0]!;
    expect(mv0.tipo).toBe('maquinasVorazes');
    expect(mv8.tipo).toBe('maquinasVorazes');
    if (mv0.tipo === 'maquinasVorazes' && mv8.tipo === 'maquinasVorazes') {
      expect(mv8.danoBase).toBeGreaterThan(mv0.danoBase);
    }
  });

  it('Senhor das Nuvens NÃO gera maquinasVorazes', async () => {
    const { planejarTurnoSistema } = await import('@application/npc/EstrategiaCapital');
    const p = criarPartida({
      modo: 'turnoATurno',
      dificuldade: 'normal',
      trabalhadores: [{ nome: 'Joana', arquetipo: 'ferreiroEngrenagens' }],
      antagonistas: [{ arquetipo: 'senhorNuvens' }],
    });
    const cmds = planejarTurnoSistema(p);
    expect(cmds.every((c) => c.tipo !== 'maquinasVorazes')).toBe(true);
  });
});
