import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Partida } from '@domain/entities/Partida';
import { NivelOrganizacao } from '@domain/entities/Organizacao';
import { LocalStoragePartidaRepository } from '@infrastructure/repositories/LocalStoragePartidaRepository';
import { PainelReferencia } from '../components/PainelReferencia';

const repo = new LocalStoragePartidaRepository();

const NOME_NIVEL: Record<NivelOrganizacao, string> = {
  1: 'Célula',
  2: 'Sindicato Combativo',
  3: 'Partido / Movimento de Massas',
  4: 'Conselho / Comuna',
};

// ── Card de partida em andamento ──────────────────────────────────────────────

function CardContinuar({ partida, onContinuar, onAbandonar }: {
  partida: Partida;
  onContinuar: () => void;
  onAbandonar: () => void;
}) {
  const ativos = partida.trabalhadores.filter((t) => !t.colapsado).length;
  const antVivos = partida.antagonistas.filter((a) => !a.derrotado);
  const dataISO = new Date(partida.criadaEm).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

  return (
    <div
      className="painel"
      style={{
        borderLeft: '4px solid var(--vermelho-revolucao)',
        marginBottom: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <span className="badge vermelho">EM ANDAMENTO</span>
        <strong>{partida.organizacao.nome}</strong>
        <span style={{ fontSize: 12, color: 'var(--branco-manifesto-2)' }}>criada em {dataISO}</span>
      </div>

      <div style={{ fontSize: 13, color: 'var(--branco-manifesto-2)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <span>⏱ Turno {partida.turno}</span>
        <span>👷 {ativos}/{partida.trabalhadores.length} trabalhadores ativos</span>
        <span>🏭 {antVivos.map((a) => a.nome).join(', ') || '—'}</span>
        <span>🏴 {NOME_NIVEL[partida.organizacao.nivel]}</span>
      </div>

      <div className="controles" style={{ marginTop: 4 }}>
        <button className="primaria" onClick={onContinuar}>Continuar Partida</button>
        <button className="secundaria" onClick={onAbandonar} title="Descarta esta partida permanentemente">
          Abandonar
        </button>
      </div>
    </div>
  );
}

// ── Diário de entrada ─────────────────────────────────────────────────────────

function EntradaDiario({ partida, onRemover }: { partida: Partida; onRemover: () => void }) {
  const [expandido, setExpandido] = useState(false);
  const vitoria = partida.fase === 'vitoriaProletaria';

  const colapsados  = partida.trabalhadores.filter((t) => t.colapsado);
  const derrotados  = partida.antagonistas.filter((a) => a.derrotado);
  const escolaFundada = partida.trabalhadores.some((t) => t.imunidadesPermanentes.length > 0);

  const dataISO = new Date(partida.criadaEm).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

  return (
    <div
      className="painel"
      style={{
        borderLeft: `4px solid ${vitoria ? 'var(--ouro-operario)' : 'var(--cinza-chumbo-claro)'}`,
        marginBottom: 8,
        cursor: 'pointer',
      }}
      onClick={() => setExpandido((x) => !x)}
    >
      {/* ── Linha de resumo ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{
          fontFamily: 'var(--fonte-display)',
          fontSize: 18,
          color: vitoria ? 'var(--ouro-operario)' : 'var(--cinza-chumbo-claro)',
          minWidth: 20,
        }}>
          {vitoria ? '★' : '✕'}
        </span>

        <strong style={{ color: vitoria ? 'var(--ouro-operario)' : 'inherit' }}>
          {partida.organizacao.nome}
        </strong>

        <span className={`badge ${vitoria ? 'ouro' : ''}`} style={vitoria ? {} : { background: 'var(--cinza-chumbo)' }}>
          {vitoria ? 'VITÓRIA' : 'DERROTA'}
        </span>

        <span style={{ fontSize: 12, color: 'var(--branco-manifesto-2)', marginLeft: 'auto' }}>
          T{partida.turno} · {dataISO}
        </span>

        <span style={{ fontSize: 11, color: 'var(--branco-manifesto-2)' }}>{expandido ? '▲' : '▼'}</span>
      </div>

      {/* ── Detalhe expandido ── */}
      {expandido && (
        <div
          style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', color: 'var(--branco-manifesto-2)' }}>
            <span>🏴 {NOME_NIVEL[partida.organizacao.nivel]}</span>
            <span>⏱ {partida.turno} turnos</span>
            <span>👷 {partida.trabalhadores.length - colapsados.length}/{partida.trabalhadores.length} sobreviventes</span>
          </div>

          {derrotados.length > 0 && (
            <div>
              <span style={{ color: 'var(--ouro-operario)' }}>★ Antagonistas derrubados: </span>
              {derrotados.map((a) => a.nome).join(', ')}
            </div>
          )}

          {colapsados.length > 0 && (
            <div>
              <span style={{ color: 'var(--vermelho-revolucao)' }}>✕ Colapsados: </span>
              {colapsados.map((t) => t.nome).join(', ')}
            </div>
          )}

          {escolaFundada && (
            <div style={{ color: 'var(--ouro-operario)' }}>★ Escola de Formação fundada</div>
          )}

          <div style={{ marginTop: 4 }}>
            <button
              className="secundaria"
              style={{ fontSize: 11, padding: '2px 8px' }}
              onClick={onRemover}
            >
              Remover do diário
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Diário completo ───────────────────────────────────────────────────────────

function DiarioDaLuta({ historico, onRemover, onLimpar }: {
  historico: Partida[];
  onRemover: (id: string) => void;
  onLimpar: () => void;
}) {
  const vitorias = historico.filter((p) => p.fase === 'vitoriaProletaria').length;
  const derrotas  = historico.length - vitorias;

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
        <h3 className="subtitulo" style={{ margin: 0 }}>Diário da Luta</h3>
        <span style={{ fontSize: 12, color: 'var(--branco-manifesto-2)' }}>
          {vitorias}★ {derrotas}✕
        </span>
        <button
          className="secundaria"
          style={{ fontSize: 11, padding: '2px 8px', marginLeft: 'auto' }}
          onClick={onLimpar}
          title="Remove todas as partidas concluídas do histórico"
        >
          Limpar histórico
        </button>
      </div>

      {historico.map((p) => (
        <EntradaDiario key={p.id} partida={p} onRemover={() => onRemover(p.id)} />
      ))}
    </>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

interface EstadoPartidas {
  ativa: Partida | null;
  historico: Partida[];
}

export function Inicio() {
  const nav = useNavigate();

  // undefined = carregando; null/[] = sem dados
  const [estado, setEstado] = useState<EstadoPartidas | undefined>(undefined);
  const [verReferencia, setVerReferencia] = useState(false);

  useEffect(() => {
    repo
      .listar()
      .then((partidas) => {
        // Turno-a-turno em andamento — a mais avançada se houver múltiplas
        const ativas = partidas
          .filter((p) => p.fase === 'emAndamento' && p.modo === 'turnoATurno')
          .sort((a, b) => b.turno - a.turno);

        // Histórico — partidas concluídas, mais recentes primeiro (até 20)
        const concluidas = partidas
          .filter((p) => p.fase !== 'emAndamento')
          .sort((a, b) => new Date(b.criadaEm).getTime() - new Date(a.criadaEm).getTime())
          .slice(0, 20);

        setEstado({ ativa: ativas[0] ?? null, historico: concluidas });
      })
      .catch(() => setEstado({ ativa: null, historico: [] }));
  }, []);

  function continuar(p: Partida) {
    sessionStorage.setItem('rpg-luta:partida-corrente', JSON.stringify(p));
    nav('/turno');
  }

  async function abandonar(id: string) {
    await repo.remover(id);
    setEstado((prev) => prev ? { ...prev, ativa: null } : prev);
  }

  async function removerHistorico(id: string) {
    await repo.remover(id);
    setEstado((prev) =>
      prev ? { ...prev, historico: prev.historico.filter((p) => p.id !== id) } : prev,
    );
  }

  async function limparHistorico() {
    if (!estado) return;
    await Promise.all(estado.historico.map((p) => repo.remover(p.id)));
    setEstado((prev) => prev ? { ...prev, historico: [] } : prev);
  }

  const temHistorico = (estado?.historico.length ?? 0) > 0;

  return (
    <main className="intro">
      <h1 className="titulo-cartaz">A Metrópole-Máquina respira exaustão.</h1>

      <p className="citacao">
        "Esqueçam os dragões e as masmorras. O verdadeiro monstro veste um fato de corte impecável e habita
        as frestas entre os segundos. O Capital é um Leviatã pálido, um deus-aranha tecido com fibra ótica e
        fuligem."
      </p>

      <p>
        <strong>O Capital · Luta de Classes</strong> é um RPG em que vocês não são heróis predestinados — são
        os despossuídos. Não acumulam ouro: gastam Tempo de Vida (PV), Tempo Livre (TL) e Condições
        Materiais (CM) tentando despertar a Consciência de Classe.
      </p>

      <p>
        Os antagonistas — Capitalista Industrial, Algoritmo-Feitor, Estado Burguês — são <strong>NPCs</strong>
        controlados pela Voz do Sistema. Vocês jogam apenas pelo lado da classe trabalhadora.
      </p>

      <h3 className="subtitulo">Modos de jogo</h3>
      <ul style={{ marginLeft: 24 }}>
        <li><strong>Turno-a-turno:</strong> você comanda os trabalhadores, a IA do Capital responde.</li>
        <li><strong>Simulado:</strong> assista uma partida rodando sozinha, com heurísticas para os dois lados.</li>
      </ul>

      {/* ── Estado de carregamento ── */}
      {estado === undefined && (
        <p style={{ color: 'var(--branco-manifesto-2)', fontSize: 13, marginTop: 24 }}>
          Verificando partidas salvas…
        </p>
      )}

      {/* ── Partida em andamento ── */}
      {estado?.ativa && (
        <>
          <h3 className="subtitulo" style={{ marginTop: 32 }}>Retomar a luta</h3>
          <CardContinuar
            partida={estado.ativa}
            onContinuar={() => continuar(estado.ativa!)}
            onAbandonar={() => abandonar(estado.ativa!.id)}
          />
        </>
      )}

      {/* ── Ações principais ── */}
      <div className="controles" style={{ marginTop: estado?.ativa ? 0 : 32 }}>
        <Link to="/nova">
          <button className={estado?.ativa ? 'secundaria' : 'primaria'}>Nova Partida</button>
        </Link>
        <button onClick={() => setVerReferencia(true)} title="Referência rápida de regras" style={{ minWidth: 36 }}>?</button>
      </div>

      {verReferencia && <PainelReferencia onFechar={() => setVerReferencia(false)} />}

      {/* ── Histórico ── */}
      {estado !== undefined && temHistorico && (
        <div style={{ marginTop: 40 }}>
          <DiarioDaLuta
            historico={estado.historico}
            onRemover={removerHistorico}
            onLimpar={limparHistorico}
          />
        </div>
      )}

      <h3 className="subtitulo" style={{ marginTop: 48 }}>Arquitetura</h3>
      <p style={{ fontSize: 12, color: 'var(--branco-manifesto-2)' }}>
        Domain · Application · Infrastructure · Presentation. Regras puras em TypeScript no
        domínio; React isolado na apresentação. Persistência via LocalStorage substituível por
        qualquer outra implementação da porta <code>PartidaRepository</code>.
      </p>
    </main>
  );
}
