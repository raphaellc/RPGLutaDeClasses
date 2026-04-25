import { useMemo, useState } from 'react';
import { Antagonista } from '@domain/entities/Antagonista';
import { Trabalhador } from '@domain/entities/Trabalhador';
import {
  CustoSucessoComCusto,
  EixoNome,
  Rolagem,
  bonusEixo,
} from '@domain/services/AcaoDireta';
import { rolarAcaoDireta } from '@application/use-cases/IniciarAcaoDireta';
import { DadoCriptografico } from '@infrastructure/rng/DadoCriptografico';

const dado = new DadoCriptografico();

const EIXOS: { id: EixoNome; rotulo: string; pista: string }[] = [
  { id: 'suorVsSonho', rotulo: 'Suor ↔ Sonho', pista: 'Força de Trabalho — fadiga ou imaginação.' },
  { id: 'conscienciaVsRuido', rotulo: 'Consciência ↔ Ruído', pista: 'Clareza vs. propaganda.' },
  { id: 'acaoVsInercia', rotulo: 'Ação ↔ Inércia', pista: 'Práxis — agir vs. apatia.' },
];

interface Props {
  executor: Trabalhador;
  antagonistas: ReadonlyArray<Antagonista>;
  onConfirmar: (data: {
    rolagem: Rolagem;
    intencao: string;
    eixo: EixoNome;
    alvoAntagonistaId?: string;
    danoSeSucesso?: number;
    custo?: CustoSucessoComCusto;
  }) => void;
  onCancelar: () => void;
}

export function DialogoAcaoDireta({ executor, antagonistas, onConfirmar, onCancelar }: Props) {
  const [intencao, setIntencao] = useState('');
  const [eixo, setEixo] = useState<EixoNome>('acaoVsInercia');
  const [alvoId, setAlvoId] = useState<string>('');
  const [danoBruto, setDanoBruto] = useState<number>(0);
  const [rolagem, setRolagem] = useState<Rolagem | undefined>();
  const [custo, setCusto] = useState<CustoSucessoComCusto>('cm');

  const bonus = useMemo(() => bonusEixo(executor, eixo), [executor, eixo]);

  function rolar() {
    const r = rolarAcaoDireta(executor, eixo, dado);
    setRolagem(r);
    if (r.resultado !== 'sucessoComCusto') setCusto('cm');
  }

  function confirmar() {
    if (!rolagem) return;
    onConfirmar({
      rolagem,
      intencao: intencao.trim() || 'Ação direta',
      eixo,
      alvoAntagonistaId: alvoId || undefined,
      danoSeSucesso: alvoId ? Math.max(0, danoBruto) : undefined,
      custo: rolagem.resultado === 'sucessoComCusto' ? custo : undefined,
    });
  }

  return (
    <div style={overlayStyle} role="dialog" aria-modal="true">
      <div className="painel ouro" style={dialogStyle}>
        <h2>AÇÃO DIRETA — {executor.nome}</h2>

        <p className="subtitulo">Intenção</p>
        <input
          type="text"
          placeholder="Ex.: Sabotar o sensor da esteira na fábrica"
          value={intencao}
          onChange={(e) => setIntencao(e.target.value)}
          style={{ width: '100%' }}
          disabled={!!rolagem}
        />

        <p className="subtitulo">Eixo de Tensão</p>
        <select value={eixo} onChange={(e) => setEixo(e.target.value as EixoNome)} disabled={!!rolagem}>
          {EIXOS.map((o) => (
            <option key={o.id} value={o.id}>{o.rotulo} — {o.pista}</option>
          ))}
        </select>
        <span style={{ marginLeft: 12 }} className="badge">BÔNUS {bonus >= 0 ? '+' : ''}{bonus}</span>

        <p className="subtitulo">Alvo (opcional — se for ataque ao Capital)</p>
        <select value={alvoId} onChange={(e) => setAlvoId(e.target.value)} disabled={!!rolagem}>
          <option value="">Nenhum (resolução narrativa)</option>
          {antagonistas.filter((a) => !a.derrotado).map((a) => (
            <option key={a.id} value={a.id}>{a.nome}</option>
          ))}
        </select>
        {alvoId && (
          <div style={{ marginTop: 8 }}>
            <label className="label">Dano se sucesso pleno: </label>
            <input
              type="number"
              min={0}
              value={danoBruto}
              onChange={(e) => setDanoBruto(Number(e.target.value))}
              style={{ width: 80 }}
              disabled={!!rolagem}
            />
          </div>
        )}

        {!rolagem && (
          <div className="controles" style={{ marginTop: 24 }}>
            <button className="primaria" onClick={rolar}>Rolar 1d6</button>
            <button className="secundaria" onClick={onCancelar}>Cancelar</button>
          </div>
        )}

        {rolagem && (
          <>
            <h3 style={{ marginTop: 24 }}>
              Resultado: {rolagem.d6} + {rolagem.bonus} = <span style={{ color: corResultado(rolagem.resultado) }}>{rolagem.total}</span>
            </h3>
            <p>{descricaoResultado(rolagem.resultado)}</p>
            {rolagem.resultado === 'sucessoComCusto' && (
              <>
                <p className="subtitulo">Escolha o custo</p>
                <div className="controles">
                  {(['pv', 'cm', 'alienacao'] as const).map((c) => (
                    <label key={c} style={{ marginRight: 12 }}>
                      <input type="radio" checked={custo === c} onChange={() => setCusto(c)} /> {legenda(c)}
                    </label>
                  ))}
                </div>
              </>
            )}
            <div className="controles" style={{ marginTop: 24 }}>
              <button className="primaria" onClick={confirmar}>Aplicar</button>
              <button className="secundaria" onClick={onCancelar}>Cancelar</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.85)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 100,
  padding: 16,
};

const dialogStyle: React.CSSProperties = {
  width: 'min(640px, 100%)',
  maxHeight: '90vh',
  overflowY: 'auto',
};

function corResultado(r: Rolagem['resultado']): string {
  switch (r) {
    case 'sucessoPleno': return 'var(--ouro-operario)';
    case 'sucessoComCusto': return 'var(--branco-manifesto)';
    case 'derrota': return 'var(--vermelho-revolucao)';
  }
}

function descricaoResultado(r: Rolagem['resultado']): string {
  switch (r) {
    case 'sucessoPleno': return 'A história avança. Dignidade preservada.';
    case 'sucessoComCusto': return 'O Capital morde de volta. Você escolhe o preço.';
    case 'derrota': return 'O fracasso é visceral. O Sistema esmaga a iniciativa (–3 PV).';
  }
}

function legenda(c: CustoSucessoComCusto): string {
  switch (c) {
    case 'pv': return '–2 PV (esgotamento)';
    case 'cm': return '–1 CM (boleto atrasado)';
    case 'alienacao': return '+ Alienação (2 turnos)';
  }
}
