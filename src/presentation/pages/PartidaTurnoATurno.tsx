import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Partida } from '@domain/entities/Partida';
import { Trabalhador } from '@domain/entities/Trabalhador';
import { Comando } from '@application/use-cases/AcoesDoTurno';
import { useEstadoPartida } from '../hooks/useEstadoPartida';
import { DialogoAcaoDireta } from '../components/DialogoAcaoDireta';
import { CartaoTrabalhador } from '../components/CartaoTrabalhador';
import { CartaoAntagonista } from '../components/CartaoAntagonista';
import { PainelOrganizacao } from '../components/PainelOrganizacao';
import { LogNarrativo } from '../components/LogNarrativo';

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
  const { partida, log, erro, aplicar, encerrarTurno } = useEstadoPartida(inicial);
  const [acaoDiretaDe, setAcaoDiretaDe] = useState<Trabalhador | undefined>();

  const ativos = partida.trabalhadores.filter((t) => !t.colapsado);
  const antagonistasVivos = partida.antagonistas.filter((a) => !a.derrotado);
  const podeAgir = partida.fase === 'emAndamento' && partida.turnoAtivoDe === 'jogadores';

  return (
    <>
      <div className="cabecalho" style={{ borderTop: '1px solid var(--cinza-chumbo-claro)' }}>
        <div>
          <span className="badge">TURNO {partida.turno}</span>{' '}
          <span className="badge ouro">{partida.turnoAtivoDe === 'jogadores' ? 'Trabalhadores' : 'Voz do Sistema'}</span>
        </div>
        <div className="controles">
          <button className="secundaria" onClick={onNova}>Nova Partida</button>
          <button className="primaria" disabled={!podeAgir} onClick={encerrarTurno}>Encerrar Turno</button>
        </div>
      </div>

      {partida.fase !== 'emAndamento' && (
        <div className={`bandeira-fim ${partida.fase === 'vitoriaProletaria' ? 'vitoria' : 'derrota'}`}>
          <h2>{partida.fase === 'vitoriaProletaria' ? '★ A CLASSE VENCEU' : 'A METRÓPOLE ESMAGOU'}</h2>
          <p>
            {partida.fase === 'vitoriaProletaria'
              ? 'Os meios de produção estão na mão do Conselho. O Tempo Excedente foi convertido em Tempo Livre.'
              : 'Os trabalhadores caíram. Mas a luta apenas começou — a história continua.'}
          </p>
        </div>
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

  return (
    <>
      <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, alignItems: 'center' }}>
        <select value={alvoSolid} onChange={(e) => setAlvoSolid(e.target.value)} style={{ flex: 1 }}>
          {outros.map((t) => (
            <option key={t.id} value={t.id}>{t.nome}</option>
          ))}
        </select>
        <button
          disabled={!alvoSolid || trabalhador.recursos.cm < 1}
          onClick={() => aplicar({ tipo: 'solidariedade', doadorId: trabalhador.id, receptorId: alvoSolid })}
        >
          Solidariedade (–1 CM)
        </button>
      </div>

      <button
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
        disabled={trabalhador.arquetipo !== 'tradutorVerdades' || trabalhador.recursos.tl < 3}
        onClick={() => {
          const alvo = outros.find((o) => o.status.length > 0);
          if (alvo) aplicar({ tipo: 'curarStatus', alvoId: alvo.id, status: alvo.status[0]!.tipo });
        }}
      >
        Desmistificar
      </button>

      <button
        disabled={trabalhador.arquetipo !== 'fantasmaRede'}
        onClick={() => aplicar({ tipo: 'cicloSemanal', trabalhadorId: trabalhador.id, escolha: 'folgar' })}
      >
        Folgar (–2 CM, +5 TL)
      </button>

      <button
        onClick={() => aplicar({ tipo: 'cicloSemanal', trabalhadorId: trabalhador.id, escolha: 'rodar' })}
      >
        Descansar
      </button>

      <button className="secundaria" onClick={abrirAcaoDireta}>
        Ação Direta (1d6)
      </button>

      {alvoAntag && organizacao.nivel >= 2 && (
        <button
          className="primaria"
          disabled={organizacao.fundoDeGreve.cm < 5}
          onClick={() => aplicar({ tipo: 'piquete', antagonistaId: alvoAntag.id })}
        >
          PIQUETE (–5 CM Fundo)
        </button>
      )}
      {alvoAntag && organizacao.nivel >= 3 && (
        <button
          className="primaria"
          disabled={organizacao.fundoDeGreve.cm < 15 || organizacao.fundoDeGreve.tl < 20}
          onClick={() => aplicar({ tipo: 'greveGeral', antagonistaId: alvoAntag.id })}
        >
          GREVE GERAL
        </button>
      )}
      {organizacao.nivel >= 3 && (
        <button
          className="secundaria"
          disabled={organizacao.fundoDeGreve.tl < 10}
          onClick={() => aplicar({ tipo: 'manifestacaoDeMassas' })}
        >
          MANIFESTAÇÃO (–10 TL Fundo)
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
