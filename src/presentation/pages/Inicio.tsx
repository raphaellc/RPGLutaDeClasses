import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Partida } from '@domain/entities/Partida';
import { LocalStoragePartidaRepository } from '@infrastructure/repositories/LocalStoragePartidaRepository';

const repo = new LocalStoragePartidaRepository();

// ── Continuar ─────────────────────────────────────────────────────────────────

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
        <span>🏭 Antagonistas: {antVivos.map((a) => a.nome).join(', ') || '—'}</span>
        <span>🏴 Org. nível {partida.organizacao.nivel}</span>
      </div>

      <div className="controles" style={{ marginTop: 4 }}>
        <button className="primaria" onClick={onContinuar}>Continuar Partida</button>
        <button
          className="secundaria"
          onClick={onAbandonar}
          title="Descarta esta partida permanentemente"
        >
          Abandonar
        </button>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export function Inicio() {
  const nav = useNavigate();

  // undefined = ainda carregando, null = nenhuma, Partida = encontrada
  const [partidaSalva, setPartidaSalva] = useState<Partida | null | undefined>(undefined);

  useEffect(() => {
    repo
      .listar()
      .then((partidas) => {
        // Apenas turno-a-turno é persistido — simulado não passa por useEstadoPartida
        const candidatas = partidas
          .filter((p) => p.fase === 'emAndamento' && p.modo === 'turnoATurno')
          .sort((a, b) => b.turno - a.turno); // mais avançada primeiro
        setPartidaSalva(candidatas[0] ?? null);
      })
      .catch(() => setPartidaSalva(null)); // falha silenciosa (modo incógnito, storage cheio…)
  }, []);

  function continuar(p: Partida) {
    sessionStorage.setItem('rpg-luta:partida-corrente', JSON.stringify(p));
    nav('/turno');
  }

  async function abandonar(id: string) {
    await repo.remover(id);
    setPartidaSalva(null);
  }

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

      {/* ── Partida salva ── */}
      {partidaSalva === undefined && (
        <p style={{ color: 'var(--branco-manifesto-2)', fontSize: 13, marginTop: 24 }}>
          Verificando partidas salvas…
        </p>
      )}

      {partidaSalva && (
        <>
          <h3 className="subtitulo" style={{ marginTop: 32 }}>Retomar a luta</h3>
          <CardContinuar
            partida={partidaSalva}
            onContinuar={() => continuar(partidaSalva)}
            onAbandonar={() => abandonar(partidaSalva.id)}
          />
        </>
      )}

      <div className="controles" style={{ marginTop: partidaSalva ? 0 : 32 }}>
        <Link to="/nova"><button className={partidaSalva ? 'secundaria' : 'primaria'}>Nova Partida</button></Link>
      </div>

      <h3 className="subtitulo" style={{ marginTop: 48 }}>Arquitetura</h3>
      <p style={{ fontSize: 12, color: 'var(--branco-manifesto-2)' }}>
        Domain · Application · Infrastructure · Presentation. Regras puras em TypeScript no
        domínio; React isolado na apresentação. Persistência via LocalStorage substituível por
        qualquer outra implementação da porta <code>PartidaRepository</code>.
      </p>
    </main>
  );
}
