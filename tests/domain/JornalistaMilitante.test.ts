import { describe, it, expect } from 'vitest';
import { aplicarComando } from '@application/use-cases/AcoesDoTurno';
import { criarPartida } from '@application/use-cases/CriarPartida';

function partidaComJornalista() {
  return criarPartida({
    modo: 'turnoATurno',
    dificuldade: 'normal',
    trabalhadores: [
      { nome: 'Ana', arquetipo: 'jornalistaMilitante' },
      { nome: 'Beto', arquetipo: 'ferreiroEngrenagens' },
    ],
    antagonistas: [{ arquetipo: 'estadoBurgues' }],
  });
}

describe('Jornalista Militante — Publicar Denúncia', () => {
  it('remove fetichismo de todos os trabalhadores não-colapsados', () => {
    let p = partidaComJornalista();

    // Aplica fetichismo nos dois
    p = aplicarComando(p, { tipo: 'aplicarStatus', alvoId: p.trabalhadores[0]!.id, status: 'fetichismo', turnos: 3 }).partida;
    p = aplicarComando(p, { tipo: 'aplicarStatus', alvoId: p.trabalhadores[1]!.id, status: 'fetichismo', turnos: 3 }).partida;

    const jornalista = p.trabalhadores.find((t) => t.arquetipo === 'jornalistaMilitante')!;
    const tlAntes = jornalista.recursos.tl;

    const r = aplicarComando(p, { tipo: 'publicarDenuncia', jornalistaId: jornalista.id });

    expect(r.erro).toBeUndefined();
    for (const t of r.partida.trabalhadores) {
      expect(t.status.some((s) => s.tipo === 'fetichismo')).toBe(false);
    }
    const jornalistaDepois = r.partida.trabalhadores.find((t) => t.arquetipo === 'jornalistaMilitante')!;
    expect(jornalistaDepois.recursos.tl).toBe(tlAntes - 4);
  });

  it('emite evento narrativa e statusCurado por cada trabalhador curado', () => {
    let p = partidaComJornalista();
    p = aplicarComando(p, { tipo: 'aplicarStatus', alvoId: p.trabalhadores[1]!.id, status: 'fetichismo', turnos: 2 }).partida;
    const jornalista = p.trabalhadores.find((t) => t.arquetipo === 'jornalistaMilitante')!;

    const { eventos } = aplicarComando(p, { tipo: 'publicarDenuncia', jornalistaId: jornalista.id });

    expect(eventos.some((e) => e.tipo === 'narrativa')).toBe(true);
    expect(eventos.some((e) => e.tipo === 'statusCurado')).toBe(true);
  });

  it('retorna evento narrativo quando não há fetichismo ativo', () => {
    const p = partidaComJornalista();
    const jornalista = p.trabalhadores.find((t) => t.arquetipo === 'jornalistaMilitante')!;

    const r = aplicarComando(p, { tipo: 'publicarDenuncia', jornalistaId: jornalista.id });

    expect(r.erro).toBeUndefined();
    expect(r.eventos.some((e) => e.tipo === 'narrativa')).toBe(true);
    // Estado não muda — sem fetichismo, sem custo
    expect(r.partida.trabalhadores.find((t) => t.arquetipo === 'jornalistaMilitante')!.recursos.tl)
      .toBe(jornalista.recursos.tl);
  });

  it('falha se TL insuficiente', () => {
    let p = partidaComJornalista();
    p = aplicarComando(p, { tipo: 'aplicarStatus', alvoId: p.trabalhadores[0]!.id, status: 'fetichismo', turnos: 2 }).partida;
    // Drena TL da jornalista até ficar com 3
    const jornalista = p.trabalhadores.find((t) => t.arquetipo === 'jornalistaMilitante')!;
    p = {
      ...p,
      trabalhadores: p.trabalhadores.map((t) =>
        t.id === jornalista.id ? { ...t, recursos: { ...t.recursos, tl: 3 } } : t,
      ),
    };
    const r = aplicarComando(p, { tipo: 'publicarDenuncia', jornalistaId: jornalista.id });
    expect(r.erro).toMatch(/Tempo Livre/);
  });

  it('falha se trabalhador não é Jornalista Militante', () => {
    const p = partidaComJornalista();
    const ferreiro = p.trabalhadores.find((t) => t.arquetipo === 'ferreiroEngrenagens')!;
    const r = aplicarComando(p, { tipo: 'publicarDenuncia', jornalistaId: ferreiro.id });
    expect(r.erro).toMatch(/Jornalista/);
  });
});

describe('Dificuldade — escalonamento de capital dos antagonistas', () => {
  it('fácil cria antagonista com 65% do capital padrão', () => {
    const p = criarPartida({
      modo: 'turnoATurno',
      dificuldade: 'facil',
      trabalhadores: [{ nome: 'Ana', arquetipo: 'ferreiroEngrenagens' }],
      antagonistas: [{ arquetipo: 'senhorNuvens' }], // padrão: 100
    });
    expect(p.antagonistas[0]!.capitalAcumulado).toBe(65);
    expect(p.dificuldade).toBe('facil');
  });

  it('normal mantém capital padrão', () => {
    const p = criarPartida({
      modo: 'turnoATurno',
      dificuldade: 'normal',
      trabalhadores: [{ nome: 'Ana', arquetipo: 'ferreiroEngrenagens' }],
      antagonistas: [{ arquetipo: 'senhorNuvens' }],
    });
    expect(p.antagonistas[0]!.capitalAcumulado).toBe(100);
  });

  it('difícil cria antagonista com 150% do capital padrão', () => {
    const p = criarPartida({
      modo: 'turnoATurno',
      dificuldade: 'dificil',
      trabalhadores: [{ nome: 'Ana', arquetipo: 'ferreiroEngrenagens' }],
      antagonistas: [{ arquetipo: 'senhorNuvens' }],
    });
    expect(p.antagonistas[0]!.capitalAcumulado).toBe(150);
  });

  it('capitalAcumuladoMax igual ao capitalAcumulado inicial', () => {
    const p = criarPartida({
      modo: 'turnoATurno',
      dificuldade: 'dificil',
      trabalhadores: [{ nome: 'Ana', arquetipo: 'ferreiroEngrenagens' }],
      antagonistas: [{ arquetipo: 'estadoBurgues' }], // padrão: 200
    });
    expect(p.antagonistas[0]!.capitalAcumulado).toBe(p.antagonistas[0]!.capitalAcumuladoMax);
    expect(p.antagonistas[0]!.capitalAcumulado).toBe(300);
  });

  it('dificuldade default é normal quando não especificada', () => {
    const p = criarPartida({
      modo: 'turnoATurno',
      trabalhadores: [{ nome: 'Ana', arquetipo: 'ferreiroEngrenagens' }],
      antagonistas: [{ arquetipo: 'capitalistaIndustrial' }], // padrão: 120
    });
    expect(p.dificuldade).toBe('normal');
    expect(p.antagonistas[0]!.capitalAcumulado).toBe(120);
  });
});
