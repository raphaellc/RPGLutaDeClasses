import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Partida } from '@domain/entities/Partida';
import { rodarSimulacao } from '@application/game-modes/MotorSimulado';
import { CartaoTrabalhador } from '../components/CartaoTrabalhador';
import { CartaoAntagonista } from '../components/CartaoAntagonista';
import { PainelOrganizacao } from '../components/PainelOrganizacao';
import { LogNarrativo } from '../components/LogNarrativo';
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

function SimulacaoUI({ inicial, onNova }: { inicial: Partida; onNova: () => void }) {
  const resultado = useMemo(() => rodarSimulacao(inicial, 50), [inicial]);
  const passos = resultado.passos;
  const [idx, setIdx] = useState(0);
  const [auto, setAuto] = useState(true);
  const [velocidade, setVelocidade] = useState(700);
  const timer = useRef<number | null>(null);

  const partidaAtual: Partida = idx < passos.length
    ? passos[idx]!.partidaDepois
    : (passos[passos.length - 1]?.partidaDepois ?? inicial);

  const log: EntradaLog[] = useMemo(
    () => passos
      .slice(0, idx + 1)
      .flatMap((p, i): EntradaLog[] => p.eventos.map((evento, j) => ({
        id: `sim-${i}-${j}`,
        evento,
        turno: p.partidaDepois.turno,
      }))),
    [passos, idx],
  );

  useEffect(() => {
    if (!auto) return;
    if (idx >= passos.length - 1) return;
    timer.current = window.setTimeout(() => setIdx((i) => Math.min(passos.length - 1, i + 1)), velocidade);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [auto, idx, passos.length, velocidade]);

  return (
    <>
      <div className="cabecalho" style={{ borderTop: '1px solid var(--cinza-chumbo-claro)' }}>
        <div>
          <span className="badge ouro">SIMULAÇÃO</span>{' '}
          <span className="badge">PASSO {idx + 1} / {passos.length}</span>{' '}
          <span className="badge">TURNO {partidaAtual.turno}</span>
        </div>
        <div className="controles">
          <button className="secundaria" onClick={onNova}>Nova Partida</button>
          <button onClick={() => setIdx(0)}>Voltar ao Início</button>
          <button onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0}>‹ Anterior</button>
          <button onClick={() => setIdx((i) => Math.min(passos.length - 1, i + 1))} disabled={idx >= passos.length - 1}>Próximo ›</button>
          <button className={auto ? 'primaria' : ''} onClick={() => setAuto((x) => !x)}>
            {auto ? 'Pausar' : 'Rodar'}
          </button>
          <select value={velocidade} onChange={(e) => setVelocidade(Number(e.target.value))}>
            <option value={1500}>Lento</option>
            <option value={700}>Normal</option>
            <option value={250}>Rápido</option>
            <option value={50}>Furioso</option>
          </select>
        </div>
      </div>

      {partidaAtual.fase !== 'emAndamento' && idx >= passos.length - 1 && (
        <div className={`bandeira-fim ${partidaAtual.fase === 'vitoriaProletaria' ? 'vitoria' : 'derrota'}`}>
          <h2>{partidaAtual.fase === 'vitoriaProletaria' ? '★ A CLASSE VENCEU' : 'A METRÓPOLE ESMAGOU'}</h2>
        </div>
      )}

      <div className="tabuleiro">
        <div className="coluna">
          <h2>O Capital</h2>
          {partidaAtual.antagonistas.map((a) => <CartaoAntagonista key={a.id} antagonista={a} />)}
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

