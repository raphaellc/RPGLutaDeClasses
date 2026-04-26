import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Partida } from '@domain/entities/Partida';
import { Trabalhador } from '@domain/entities/Trabalhador';
import { Comando } from '@application/use-cases/AcoesDoTurno';
import { calcularEstatisticasDeEventos } from '@application/use-cases/EstatisticasPartida';
import { useEstadoPartida } from '../hooks/useEstadoPartida';
import { DialogoAcaoDireta } from '../components/DialogoAcaoDireta';
import { CartaoTrabalhador } from '../components/CartaoTrabalhador';
import { CartaoAntagonista } from '../components/CartaoAntagonista';
import { PainelOrganizacao } from '../components/PainelOrganizacao';
import { LogNarrativo } from '../components/LogNarrativo';
import { TelaFinal } from '../components/TelaFinal';
import { PainelReferencia } from '../components/PainelReferencia';
import { RelatorioCapital } from '../components/RelatorioCapital';

function carregarPartidaInicial(): Partida | null {
  try {
    const raw = sessionStorage.getItem('rpg-luta:partida-corrente');
    return raw ? (JSON.parse(raw) as Partida) : null;
  } catch {
    return null;
  }
}

export function PartidaTurnoATurno() {
  const nav = useNavigate();
  const inicial = useMemo(carregarPartidaInicial, []);
  if (!inicial) {
    return (
      <main className="intro">
        <p>Nenhuma partida ativa. <Link to="/nova">Crie uma nova</Link>.</p>
      </main>
    );
  }
  return <PartidaUI inicial={inicial} onNova={() => nav('/nova')} />;
}

function PartidaUI({ inicial, onNova }: { inicial: Partida; onNova: () => void }) {
  const { partida, log, erro, aplicar, encerrarTurno, relatorioCapital, limparRelatorio } = useEstadoPartida(inicial);
  const [acaoDiretaDe, setAcaoDiretaDe] = useState<Trabalhador | undefined>();
  const [verReferencia, setVerReferencia] = useState(false);

  const ativos = partida.trabalhadores.filter((t) => !t.colapsado);
  const antagonistasVivos = partida.antagonistas.filter((a) => !a.derrotado);
  const podeAgir = partida.fase === 'emAndamento' && partida.turnoAtivoDe === 'jogadores';

  // Estatísticas calculadas apenas quando a partida termina
  const estatisticasFinais = useMemo(() => {
    if (partida.fase === 'emAndamento') return null;
    const eventos = log.map((e) => e.evento);
    return calcularEstatisticasDeEventos(eventos, partida);
  }, [partida.fase, log, partida]);

  return (
    <>
      <div className="cabecalho" style={{ borderTop: '1px solid var(--cinza-chumbo-claro)' }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="badge">TURNO {partida.turno}</span>
          <span className="badge ouro">{partida.turnoAtivoDe === 'jogadores' ? 'Trabalhadores' : 'Voz do Sistema'}</span>
          {partida.dificuldade !== 'normal' && (
            <span className={`badge ${partida.dificuldade === 'dificil' ? 'vermelho' : ''}`}
                  style={partida.dificuldade === 'facil' ? { background: 'var(--cinza-chumbo)', color: 'var(--branco-manifesto-2)' } : {}}>
              {partida.dificuldade === 'facil' ? 'FÁCIL' : 'DIFÍCIL'}
            </span>
          )}
        </div>
        <div className="controles">
          <button className="secundaria" onClick={onNova}>Nova Partida</button>
          <button onClick={() => setVerReferencia(true)} title="Referência rápida de regras" style={{ minWidth: 36 }}>?</button>
          <button className="primaria" disabled={!podeAgir} onClick={encerrarTurno}>Encerrar Turno</button>
        </div>
      </div>

      {partida.fase !== 'emAndamento' && estatisticasFinais && (
        <TelaFinal
          fase={partida.fase}
          estatisticas={estatisticasFinais}
          trabalhadores={inicial.trabalhadores}
          antagonistas={inicial.antagonistas}
          onNova={onNova}
        />
      )}

      {erro && <div className="painel vermelho" style={{ margin: 24 }}>⚠ {erro}</div>}

      <div className="tabuleiro">
        <div className="coluna">
          <h2>O Capital</h2>
          {partida.antagonistas.map((a) => <CartaoAntagonista key={a.id} antagonista={a} />)}
          <PainelOrganizacao org={partida.organizacao} />
          <h2>Diário da Metrópole</h2>
          <LogNarrativo entradas={log} />
        </div>

        <div className="coluna">
          <h2>A Classe Trabalhadora</h2>
          {partida.trabalhadores.map((t) => (
            <CartaoTrabalhador
              key={t.id}
              trabalhador={t}
              acoes={
                podeAgir && !t.colapsado ? (
                  <AcoesTrabalhador
                    trabalhador={t}
                    outros={ativos.filter((o) => o.id !== t.id)}
                    antagonistas={antagonistasVivos}
                    organizacao={partida.organizacao}
                    aplicar={aplicar}
                    abrirAcaoDireta={() => setAcaoDiretaDe(t)}
                  />
                ) : null
              }
            />
          ))}
        </div>
      </div>

      {verReferencia && <PainelReferencia onFechar={() => setVerReferencia(false)} />}

      {relatorioCapital.length > 0 && partida.fase === 'emAndamento' && (
        <RelatorioCapital
          turno={partida.turno - 1}
          eventos={relatorioCapital}
          onFechar={limparRelatorio}
        />
      )}

      {acaoDiretaDe && (
        <DialogoAcaoDireta
          executor={acaoDiretaDe}
          antagonistas={antagonistasVivos}
          onCancelar={() => setAcaoDiretaDe(undefined)}
          onConfirmar={(d) => {
            aplicar({
              tipo: 'acaoDireta',
              executorId: acaoDiretaDe.id,
              parametros: {
                intencao: d.intencao,
                eixo: d.eixo,
                danoAoCapitalSeSucesso: d.danoSeSucesso,
              },
              alvoAntagonistaId: d.alvoAntagonistaId,
              rolagem: d.rolagem,
              custoEscolhido: d.custo,
            });
            setAcaoDiretaDe(undefined);
          }}
        />
      )}
    </>
  );
}

interface AcoesProps {
  trabalhador: Trabalhador;
  outros: ReadonlyArray<Trabalhador>;
  antagonistas: ReadonlyArray<Partida['antagonistas'][number]>;
  organizacao: Partida['organizacao'];
  aplicar: (cmd: Comando) => void;
  abrirAcaoDireta: () => void;
}

function AcoesTrabalhador({ trabalhador, outros, antagonistas, organizacao, aplicar, abrirAcaoDireta }: AcoesProps) {
  const [alvoSolid, setAlvoSolid] = useState(outros[0]?.id ?? '');
  const alvoAntag = antagonistas[0];

  const temFetichismo      = trabalhador.status.some((s) => s.tipo === 'fetichismo');
  const eJornalista        = trabalhador.arquetipo === 'jornalistaMilitante';
  const fetichimoNoGrupo   = [...outros, trabalhador].some((t) => t.status.some((s) => s.tipo === 'fetichismo'));
  const semAliados         = outros.length === 0;
  const semCM        = trabalhador.recursos.cm < 1;
  const naoTradutor  = trabalhador.arquetipo !== 'tradutorVerdades';
  const semTLDesMist = trabalhador.recursos.tl < 3;
  const naoFantasma  = trabalhador.arquetipo !== 'fantasmaRede';
  const semAliadoComStatus = !outros.some((o) => o.status.length > 0);

  const razaoSolidariedade =
    semAliados   ? 'Nenhum aliado disponível' :
    semCM        ? 'Sem Condições Materiais (necessário: 1 CM)' :
    temFetichismo ? 'Fetichismo ativo — Solidariedade bloqueada' : undefined;

  const razaoDesmistiticar =
    naoTradutor      ? 'Exclusivo do Tradutor de Verdades' :
    semTLDesMist     ? 'Sem Tempo Livre (necessário: 3 TL)' :
    semAliadoComStatus ? 'Nenhum aliado com status ativo' : undefined;

  const razaoFolgar = naoFantasma ? 'Exclusivo do Fantasma da Rede' : undefined;

  return (
    <>
      <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, alignItems: 'center' }}>
        <select value={alvoSolid} onChange={(e) => setAlvoSolid(e.target.value)} style={{ flex: 1 }}>
          {outros.map((t) => (
            <option key={t.id} value={t.id}>{t.nome}</option>
          ))}
        </select>
        <button
          disabled={semAliados || semCM || temFetichismo}
          title={razaoSolidariedade}
          onClick={() => aplicar({ tipo: 'solidariedade', doadorId: trabalhador.id, receptorId: alvoSolid })}
        >
          Solidariedade (–1 CM)
        </button>
      </div>

      <button
        title={temFetichismo ? 'Fetichismo ativo — Contribuição bloqueada' : 'Envia CM, TL e CC ao Fundo de Greve'}
        onClick={() => aplicar({
          tipo: 'contribuirOrganizacao',
          trabalhadorId: trabalhador.id,
          cm: trabalhador.recursos.cm > 1 ? 1 : 0,
          tl: trabalhador.recursos.tl > 2 ? 2 : 0,
          cc: trabalhador.recursos.cc,
        })}
      >
        Contribuir p/ Org.
      </button>

      <button
        disabled={naoTradutor || semTLDesMist || semAliadoComStatus}
        title={razaoDesmistiticar ?? 'Cura um status de qualquer aliado (–3 TL)'}
        onClick={() => {
          const alvo = outros.find((o) => o.status.length > 0);
          if (alvo) aplicar({ tipo: 'curarStatus', alvoId: alvo.id, status: alvo.status[0]!.tipo });
        }}
      >
        Desmistificar (–3 TL)
      </button>

      <button
        disabled={naoFantasma}
        title={razaoFolgar ?? 'Troca –2 CM por +5 TL'}
        onClick={() => aplicar({ tipo: 'cicloSemanal', trabalhadorId: trabalhador.id, escolha: 'folgar' })}
      >
        Folgar (–2 CM, +5 TL)
      </button>

      <button
        title="Recupera PV e TL segundo o arquétipo"
        onClick={() => aplicar({ tipo: 'cicloSemanal', trabalhadorId: trabalhador.id, escolha: 'rodar' })}
      >
        Descansar
      </button>

      <button className="secundaria" title="Rola 1d6 — sucesso (4–6) causa dano ao Capital" onClick={abrirAcaoDireta}>
        Ação Direta (1d6)
      </button>

      {eJornalista && (
        <button
          className="secundaria"
          disabled={trabalhador.recursos.tl < 4 || !fetichimoNoGrupo}
          title={
            trabalhador.recursos.tl < 4   ? 'Sem Tempo Livre (necessário: 4 TL)' :
            !fetichimoNoGrupo              ? 'Nenhum Fetichismo ativo no grupo' :
            'Remove Fetichismo de toda a classe (–4 TL)'
          }
          onClick={() => aplicar({ tipo: 'publicarDenuncia', jornalistaId: trabalhador.id })}
        >
          Publicar Denúncia (–4 TL)
        </button>
      )}

      {alvoAntag && organizacao.nivel >= 2 && (
        <button
          className="primaria"
          disabled={organizacao.fundoDeGreve.cm < 5}
          title={organizacao.fundoDeGreve.cm < 5 ? `Fundo insuficiente (${organizacao.fundoDeGreve.cm}/5 CM)` : 'Bloqueia o antagonista por 1 turno (–5 CM do Fundo)'}
          onClick={() => aplicar({ tipo: 'piquete', antagonistaId: alvoAntag.id })}
        >
          PIQUETE (–5 CM Fundo)
        </button>
      )}
      {alvoAntag && organizacao.nivel >= 3 && (
        <button
          className="primaria"
          disabled={organizacao.fundoDeGreve.cm < 15 || organizacao.fundoDeGreve.tl < 20}
          title={
            organizacao.fundoDeGreve.cm < 15 ? `Fundo insuficiente (${organizacao.fundoDeGreve.cm}/15 CM)` :
            organizacao.fundoDeGreve.tl < 20 ? `Fundo insuficiente (${organizacao.fundoDeGreve.tl}/20 TL)` :
            'Derrota o antagonista (–15 CM e –20 TL do Fundo)'
          }
          onClick={() => aplicar({ tipo: 'greveGeral', antagonistaId: alvoAntag.id })}
        >
          GREVE GERAL
        </button>
      )}
      {organizacao.nivel >= 3 && (
        <button
          className="secundaria"
          disabled={organizacao.fundoDeGreve.tl < 10}
          title={organizacao.fundoDeGreve.tl < 10 ? `Fundo insuficiente (${organizacao.fundoDeGreve.tl}/10 TL)` : 'Escudo coletivo — mitiga próximo ataque (–10 TL do Fundo)'}
          onClick={() => aplicar({ tipo: 'manifestacaoDeMassas' })}
        >
          MANIFESTAÇÃO (–10 TL Fundo)
        </button>
      )}
      {organizacao.nivel >= 3 && (
        <button
          className="secundaria"
          disabled={organizacao.fundoDeGreve.tl < 15 || organizacao.fundoDeGreve.cm < 5}
          title={
            organizacao.fundoDeGreve.tl < 15 ? `Fundo insuficiente (${organizacao.fundoDeGreve.tl}/15 TL)` :
            organizacao.fundoDeGreve.cm < 5  ? `Fundo insuficiente (${organizacao.fundoDeGreve.cm}/5 CM)` :
            'Imunidade permanente a Alienação e Fetichismo para toda a classe (–15 TL, –5 CM)'
          }
          onClick={() => aplicar({ tipo: 'escolaDeFormacao' })}
        >
          ESCOLA DE FORMAÇÃO (–15 TL, –5 CM)
        </button>
      )}
      {alvoAntag && organizacao.nivel >= 4 && (
        <button
          className="primaria"
          onClick={() => aplicar({ tipo: 'expropriar', antagonistaId: alvoAntag.id })}
        >
          EXPROPRIAR
        </button>
      )}
    </>
  );
}
