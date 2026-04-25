import { describe, it, expect } from 'vitest';
import { aplicarComando } from '@application/use-cases/AcoesDoTurno';
import { criarPartida } from '@application/use-cases/CriarPartida';
import { Partida } from '@domain/entities/Partida';

// ── Helpers ──────────────────────────────────────────────────────────────────

function partidaComNuvens(turno = 0): Partida {
  const base = criarPartida({
    modo: 'turnoATurno',
    trabalhadores: [
      { nome: 'Joana', arquetipo: 'ferreiroEngrenagens' },
      { nome: 'Beto', arquetipo: 'fantasmaRede' },
    ],
    antagonistas: [{ arquetipo: 'senhorNuvens' }],
  });
  return { ...base, turno };
}

function nuvensId(p: Partida): string {
  const ant = p.antagonistas.find((a) => a.arquetipo === 'senhorNuvens');
  if (!ant) throw new Error('Nenhum senhorNuvens na partida');
  return ant.id;
}

// ── Comando ativarTarifaDinamica ──────────────────────────────────────────────

describe('Comando ativarTarifaDinamica', () => {
  it('seta emTarifaDinamica = true no antagonista', () => {
    const p = partidaComNuvens();
    const antId = nuvensId(p);
    const r = aplicarComando(p, { tipo: 'ativarTarifaDinamica', antagonistaId: antId, multiplicador: 2 });
    expect(r.erro).toBeUndefined();
    const ant = r.partida.antagonistas.find((a) => a.id === antId)!;
    expect(ant.emTarifaDinamica).toBe(true);
  });

  it('emite evento tarifaDinamicaAtivada com multiplicador correto', () => {
    const p = partidaComNuvens();
    const antId = nuvensId(p);
    const r = aplicarComando(p, { tipo: 'ativarTarifaDinamica', antagonistaId: antId, multiplicador: 2 });
    const ev = r.eventos[0]!;
    expect(ev.tipo).toBe('tarifaDinamicaAtivada');
    if (ev.tipo === 'tarifaDinamicaAtivada') {
      expect(ev.antagonistaId).toBe(antId);
      expect(ev.multiplicador).toBe(2);
    }
  });

  it('não afeta outros antagonistas', () => {
    const base = criarPartida({
      modo: 'turnoATurno',
      trabalhadores: [{ nome: 'Joana', arquetipo: 'ferreiroEngrenagens' }],
      antagonistas: [{ arquetipo: 'senhorNuvens' }, { arquetipo: 'capitalistaIndustrial' }],
    });
    const nuvensAnt = base.antagonistas.find((a) => a.arquetipo === 'senhorNuvens')!;
    const r = aplicarComando(base, { tipo: 'ativarTarifaDinamica', antagonistaId: nuvensAnt.id, multiplicador: 2 });
    const capitalista = r.partida.antagonistas.find((a) => a.arquetipo === 'capitalistaIndustrial')!;
    expect(capitalista.emTarifaDinamica).toBe(false);
  });
});

// ── Limpeza via avancarTurno ──────────────────────────────────────────────────

describe('avancarTurno reseta emTarifaDinamica', () => {
  it('emTarifaDinamica é false após avancarTurno', () => {
    let p = partidaComNuvens();
    const antId = nuvensId(p);
    // Ativa
    p = aplicarComando(p, { tipo: 'ativarTarifaDinamica', antagonistaId: antId, multiplicador: 2 }).partida;
    expect(p.antagonistas.find((a) => a.id === antId)!.emTarifaDinamica).toBe(true);
    // Avança turno
    p = aplicarComando(p, { tipo: 'avancarTurno' }).partida;
    expect(p.antagonistas.find((a) => a.id === antId)!.emTarifaDinamica).toBe(false);
  });
});

// ── Integração com EstrategiaCapital ─────────────────────────────────────────

describe('EstrategiaCapital — Senhor das Nuvens usa Tarifa Dinâmica', () => {
  it('no turno % 3 === 0 gera ativarTarifaDinamica como primeiro comando', async () => {
    const { planejarTurnoSistema } = await import('@application/npc/EstrategiaCapital');
    const p = partidaComNuvens(3); // turno 3 → 3 % 3 === 0
    const cmds = planejarTurnoSistema(p);
    expect(cmds[0]!.tipo).toBe('ativarTarifaDinamica');
  });

  it('no turno % 3 !== 0 NÃO gera ativarTarifaDinamica', async () => {
    const { planejarTurnoSistema } = await import('@application/npc/EstrategiaCapital');
    const p = partidaComNuvens(1);
    const cmds = planejarTurnoSistema(p);
    expect(cmds.every((c) => c.tipo !== 'ativarTarifaDinamica')).toBe(true);
  });

  it('em Modo Pico o danoBruto de extrairMaisValia é dobrado', async () => {
    const { planejarTurnoSistema } = await import('@application/npc/EstrategiaCapital');
    const pNormal = partidaComNuvens(1);
    const pPico   = partidaComNuvens(3);

    const cmdsNormal = planejarTurnoSistema(pNormal);
    const cmdsPico   = planejarTurnoSistema(pPico);

    const mvNormal = cmdsNormal.find((c) => c.tipo === 'extrairMaisValia');
    const mvPico   = cmdsPico.find((c) => c.tipo === 'extrairMaisValia');

    expect(mvNormal?.tipo).toBe('extrairMaisValia');
    expect(mvPico?.tipo).toBe('extrairMaisValia');
    if (mvNormal?.tipo === 'extrairMaisValia' && mvPico?.tipo === 'extrairMaisValia') {
      expect(mvPico.danoBruto).toBe(mvNormal.danoBruto * 2);
    }
  });

  it('Capitalista Industrial nunca gera ativarTarifaDinamica', async () => {
    const { planejarTurnoSistema } = await import('@application/npc/EstrategiaCapital');
    const p = criarPartida({
      modo: 'turnoATurno',
      trabalhadores: [{ nome: 'Joana', arquetipo: 'ferreiroEngrenagens' }],
      antagonistas: [{ arquetipo: 'capitalistaIndustrial' }],
    });
    // Testar vários turnos
    for (const turno of [0, 1, 2, 3, 6, 9]) {
      const cmds = planejarTurnoSistema({ ...p, turno });
      expect(cmds.every((c) => c.tipo !== 'ativarTarifaDinamica')).toBe(true);
    }
  });

  it('Alienação também é aplicada em turno par de Modo Pico (turno 6)', async () => {
    const { planejarTurnoSistema } = await import('@application/npc/EstrategiaCapital');
    const p = partidaComNuvens(6); // 6 % 3 === 0 e 6 % 2 === 0
    const cmds = planejarTurnoSistema(p);
    expect(cmds.some((c) => c.tipo === 'ativarTarifaDinamica')).toBe(true);
    expect(cmds.some((c) => c.tipo === 'aplicarStatus')).toBe(true);
    // 3 comandos: ativarTarifaDinamica + extrairMaisValia + aplicarStatus
    expect(cmds).toHaveLength(3);
  });
});
