import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Partida } from '@domain/entities/Partida';
import { rodarSimulacao, PassoSimulacao } from '@application/game-modes/MotorSimulado';
import { Comando } from '@application/use-cases/AcoesDoTurno';
import { CartaoTrabalhador } from '../components/CartaoTrabalhador';
import { CartaoAntagonista } from '../components/CartaoAntagonista';
import { PainelOrganizacao } from '../components/PainelOrganizacao';
import { LogNarrativo } from '../components/LogNarrativo';
import { TelaFinal } from '../components/TelaFinal';
import { PainelReferencia } from '../components/PainelReferencia';
import { EntradaLog } from '../hooks/useEstadoPartida';

function carregarPartidaInicial(): Partida | null {
  try {
    const raw = sessionStorage.getItem('rpg-luta:partida-corrente');
    return raw ? (JSON.parse(raw) as Partida) : null;
  } catch {
    return null;
  }
}

export function PartidaSimulada() {
  const nav = useNavigate();
  const inicial = useMemo(carregarPartidaInicial, []);
  if (!inicial) {
    return (
      <main className="intro">
        <p>Nenhuma partida ativa. <Link to="/nova">Crie uma nova</Link>.</p>
      </main>
    );
  }
  return <SimulacaoUI inicial={inicial} onNova={() => nav('/nova')} />;
}

// ── Labels de comando ─────────────────────────────────────────────────────────

function labelComando(cmd: Comando, partida: Partida): string {
  const nomeAnt = (id: string) =>
    partida.antagonistas.find((a) => a.id === id)?.nome ?? id;
  const nomeTrab = (id: string) =>
    partida.trabalhadores.find((t) => t.id === id)?.nome ?? id;

  switch (cmd.tipo) {
    case 'extrairMaisValia':
      return `${nomeAnt(cmd.antagonistaId)} extrai mais-valia de ${nomeTrab(cmd.alvoId)}`;
    case 'maquinasVorazes':
      return `${nomeAnt(cmd.antagonistaId)} — Máquinas Vorazes (–${cmd.danoBase} PV a todos)`;
    case 'policiaDeChoque':
      return `${nomeAnt(cmd.antagonistaId)} — Polícia de Choque sobre ${nomeTrab(cmd.alvoId)}`;
    case 'aplicarStatus': {
      const agente = partida.turnoAtivoDe === 'sistema'
        ? (partida.antagonistas.find((a) => !a.derrotado)?.nome ?? 'O Capital')
        : 'Trabalhadores';
      return `${agente} aplica ${cmd.status} em ${nomeTrab(cmd.alvoId)}`;
    }
    case 'solidariedade':
      return `${nomeTrab(cmd.doadorId)} → Solidariedade → ${nomeTrab(cmd.receptorId)}`;
    case 'piquete':
      return `Piquete contra ${nomeAnt(cmd.antagonistaId)}`;
    case 'greveGeral':
      return `GREVE GERAL contra ${nomeAnt(cmd.antagonistaId)}`;
    case 'manifestacaoDeMassas':
      return 'Manifestação de Massas — escudo coletivo';
    case 'escolaDeFormacao':
      return 'Escola de Formação fundada';
    case 'expropriar':
      return `Expropriação de ${nomeAnt(cmd.antagonistaId)}`;
    case 'contribuirOrganizacao':
      return `${nomeTrab(cmd.trabalhadorId)} contribui para a Organização`;
    case 'cicloSemanal':
      return `${nomeTrab(cmd.trabalhadorId)} — ciclo semanal (${cmd.escolha ?? 'rodar'})`;
    case 'curarStatus':
      return `Desmistificação de ${nomeTrab(cmd.alvoId)}`;
    case 'acaoDireta':
      return `${nomeTrab(cmd.executorId)} — Ação Direta (${cmd.parametros.eixo})`;
    case 'avancarTurno':
      return '— troca de turno —';
    default:
      return '…';
  }
}

// ── UI principal ──────────────────────────────────────────────────────────────

function SimulacaoUI({ inicial, onNova }: { inicial: Partida; onNova: () => void }) {
  const resultado = useMemo(() => rodarSimulacao(inicial, 50), [inicial]);
  const { passos, partidaFinal, estatisticas } = resultado;

  const [idx, setIdx] = useState(0);
  const [auto, setAuto] = useState(true);
  const [velocidade, setVelocidade] = useState(700);
  const [verReferencia, setVerReferencia] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const passo: PassoSimulacao | undefined = passos[idx];
  const partidaAtual: Partida = passo?.partidaDepois ?? partidaFinal;
  const terminado = idx >= passos.length - 1;

  const log: EntradaLog[] = useMemo(
    () =>
      passos
        .slice(0, idx + 1)
        .flatMap((p, i): EntradaLog[] =>
          p.eventos.map((evento, j) => ({
            id: `sim-${i}-${j}`,
            evento,
            turno: p.partidaDepois.turno,
          })),
        ),
    [passos, idx],
  );

  useEffect(() => {
    if (!auto || terminado) return;
    timer.current = setTimeout(() => setIdx((i) => Math.min(passos.length - 1, i + 1)), velocidade);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [auto, idx, terminado, passos.length, velocidade]);

  const progresso = passos.length > 1 ? Math.round((idx / (passos.length - 1)) * 100) : 100;
  const turnoAtivo = passo
    ? passo.partidaAntes.turnoAtivoDe === 'jogadores' ? 'Trabalhadores' : 'Voz do Sistema'
    : '—';

  return (
    <>
      {/* ── Cabeçalho ── */}
      <div className="cabecalho" style={{ borderTop: '1px solid var(--cinza-chumbo-claro)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div>
            <span className="badge ouro">SIMULAÇÃO</span>{' '}
            <span className="badge">{turnoAtivo}</span>{' '}
            <span className="badge">T{partidaAtual.turno}</span>{' '}
            <span className="badge">{idx + 1}/{passos.length}</span>
          </div>
          {passo && (
            <div style={{ fontSize: 12, color: 'var(--branco-manifesto-2)', fontStyle: 'italic' }}>
              {labelComando(passo.comando, passo.partidaAntes)}
            </div>
          )}
        </div>

        <div className="controles">
          <button className="secundaria" onClick={onNova}>Nova Partida</button>
          <button onClick={() => setVerReferencia(true)} title="Referência rápida de regras" style={{ minWidth: 36 }}>?</button>
          <button onClick={() => { setAuto(false); setIdx(0); }}>|◀</button>
          <button onClick={() => { setAuto(false); setIdx((i) => Math.max(0, i - 1)); }} disabled={idx === 0}>‹</button>
          <button onClick={() => { setAuto(false); setIdx((i) => Math.min(passos.length - 1, i + 1)); }} disabled={terminado}>›</button>
          <button onClick={() => { setAuto(false); setIdx(passos.length - 1); }}>▶|</button>
          <button className={auto ? 'primaria' : ''} onClick={() => setAuto((x) => !x)}>
            {auto ? '⏸ Pausar' : '▶ Rodar'}
          </button>
          <select value={velocidade} onChange={(e) => setVelocidade(Number(e.target.value))}>
            <option value={1500}>Lento</option>
            <option value={700}>Normal</option>
            <option value={250}>Rápido</option>
            <option value={50}>Furioso</option>
          </select>
        </div>
      </div>

      {/* ── Barra de progresso ── */}
      <div style={{ height: 4, background: 'var(--cinza-chumbo)' }}>
        <div
          style={{
            height: '100%',
            width: `${progresso}%`,
            background: terminado
              ? (partidaFinal.fase === 'vitoriaProletaria' ? 'var(--ouro-operario)' : 'var(--vermelho-revolucao)')
              : 'var(--vermelho-revolucao)',
            transition: 'width 0.2s ease',
          }}
        />
      </div>

      {/* ── Tela final (sobreposta ao tabuleiro quando termina e está no último passo) ── */}
      {terminado && partidaFinal.fase !== 'emAndamento' && (
        <TelaFinal
          fase={partidaFinal.fase}
          estatisticas={estatisticas}
          trabalhadores={inicial.trabalhadores}
          antagonistas={inicial.antagonistas}
          onNova={onNova}
        />
      )}

      {verReferencia && <PainelReferencia onFechar={() => setVerReferencia(false)} />}

      {/* ── Tabuleiro ── */}
      <div className="tabuleiro">
        <div className="coluna">
          <h2>O Capital</h2>
          {partidaAtual.antagonistas.map((a) => (
            <CartaoAntagonista key={a.id} antagonista={a} />
          ))}
          <PainelOrganizacao org={partidaAtual.organizacao} />
          <h2>Diário da Metrópole</h2>
          <LogNarrativo entradas={log} />
        </div>
        <div className="coluna">
          <h2>A Classe Trabalhadora</h2>
          {partidaAtual.trabalhadores.map((t) => (
            <CartaoTrabalhador key={t.id} trabalhador={t} />
          ))}
        </div>
      </div>
    </>
  );
}
