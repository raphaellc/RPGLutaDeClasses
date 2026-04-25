import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ModoJogo } from '@domain/entities/Partida';
import { ArquetipoTrabalhador } from '@domain/entities/Trabalhador';
import { ArquetipoCapital } from '@domain/entities/Antagonista';
import { criarPartida, DefinicaoTrabalhador, DefinicaoAntagonista } from '@application/use-cases/CriarPartida';
import { LocalStoragePartidaRepository } from '@infrastructure/repositories/LocalStoragePartidaRepository';

const repo = new LocalStoragePartidaRepository();

const ARQ_OPCOES: { id: ArquetipoTrabalhador; nome: string; resumo: string }[] = [
  { id: 'ferreiroEngrenagens', nome: 'Ferreiro de Engrenagens', resumo: 'Proletário Fabril — descanso garantido.' },
  { id: 'fantasmaRede', nome: 'Fantasma da Rede', resumo: 'Uberizado — mobilidade, em queima constante.' },
  { id: 'tradutorVerdades', nome: 'Tradutor de Verdades', resumo: 'Intelectual orgânico — defesa contra Alienação.' },
];

const ANT_OPCOES: { id: ArquetipoCapital | 'todos'; nome: string; descricao: string }[] = [
  { id: 'senhorNuvens', nome: 'Senhor das Nuvens', descricao: 'Algoritmo-Feitor — mais-valia + Alienação periódica.' },
  { id: 'capitalistaIndustrial', nome: 'Capitalista Industrial', descricao: 'Máquinas Vorazes (AoE) + mais-valia ao elo fraco.' },
  { id: 'estadoBurgues', nome: 'Estado Burguês', descricao: 'Boss final — Polícia de Choque (PV+CM) + Fetichismo.' },
  { id: 'todos', nome: 'Todos os três (Confronto Total)', descricao: 'Capítulo 6 completo: três frentes simultâneas.' },
];

const TRABALHADORES_PADRAO: DefinicaoTrabalhador[] = [
  { nome: 'Joana', arquetipo: 'ferreiroEngrenagens' },
  { nome: 'Beto', arquetipo: 'fantasmaRede' },
  { nome: 'Marcos', arquetipo: 'tradutorVerdades' },
];

export function CriacaoPartida() {
  const nav = useNavigate();
  const [modo, setModo] = useState<ModoJogo>('turnoATurno');
  const [trabalhadores, setTrabalhadores] = useState<DefinicaoTrabalhador[]>(TRABALHADORES_PADRAO);
  const [antagonista, setAntagonista] = useState<ArquetipoCapital | 'todos'>('senhorNuvens');
  const [nomeOrg, setNomeOrg] = useState('A Faísca');

  function atualizar(idx: number, patch: Partial<DefinicaoTrabalhador>) {
    setTrabalhadores((arr) => arr.map((t, i) => (i === idx ? { ...t, ...patch } : t)));
  }

  function adicionar() {
    setTrabalhadores((arr) => [...arr, { nome: `Camarada ${arr.length + 1}`, arquetipo: 'ferreiroEngrenagens' }]);
  }

  function remover(idx: number) {
    setTrabalhadores((arr) => arr.filter((_, i) => i !== idx));
  }

  function iniciar() {
    if (trabalhadores.length === 0) return;
    const ants: DefinicaoAntagonista[] = antagonista === 'todos'
      ? [
          { arquetipo: 'capitalistaIndustrial' },
          { arquetipo: 'senhorNuvens' },
          { arquetipo: 'estadoBurgues' },
        ]
      : [{ arquetipo: antagonista }];
    const partida = criarPartida({ modo, trabalhadores, antagonistas: ants, nomeOrganizacao: nomeOrg });
    sessionStorage.setItem('rpg-luta:partida-corrente', JSON.stringify(partida));
    // Persiste imediatamente para o Diário da Luta (turno-a-turno) e para "Continuar"
    if (modo === 'turnoATurno') void repo.salvar(partida);
    nav(modo === 'simulado' ? '/simulado' : '/turno');
  }

  return (
    <main className="intro">
      <h1 className="titulo-cartaz">Anatomia do Oprimido</h1>
      <p>Escolham as suas grilhetas para poderem quebrá-las. O grupo é a Organização: a sua "base de operações".</p>

      <h3 className="subtitulo">Modo de Jogo</h3>
      <div className="controles">
        <label>
          <input type="radio" checked={modo === 'turnoATurno'} onChange={() => setModo('turnoATurno')} /> Turno a turno
        </label>
        <label>
          <input type="radio" checked={modo === 'simulado'} onChange={() => setModo('simulado')} /> Simulado (autônomo)
        </label>
      </div>

      <h3 className="subtitulo">Organização</h3>
      <input
        type="text"
        value={nomeOrg}
        onChange={(e) => setNomeOrg(e.target.value)}
        style={{ width: '100%' }}
      />

      <h3 className="subtitulo">Trabalhadores</h3>
      <table className="tabela-recursos">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Arquétipo</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {trabalhadores.map((t, idx) => (
            <tr key={idx}>
              <td>
                <input type="text" value={t.nome} onChange={(e) => atualizar(idx, { nome: e.target.value })} />
              </td>
              <td>
                <select
                  value={t.arquetipo}
                  onChange={(e) => atualizar(idx, { arquetipo: e.target.value as ArquetipoTrabalhador })}
                >
                  {ARQ_OPCOES.map((o) => (
                    <option key={o.id} value={o.id}>{o.nome} — {o.resumo}</option>
                  ))}
                </select>
              </td>
              <td>
                <button className="secundaria" onClick={() => remover(idx)}>Remover</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="secundaria" onClick={adicionar} style={{ marginTop: 12 }}>+ Adicionar Trabalhador</button>

      <h3 className="subtitulo">Antagonista(s) — sempre NPC</h3>
      <select
        value={antagonista}
        onChange={(e) => setAntagonista(e.target.value as ArquetipoCapital | 'todos')}
        style={{ width: '100%' }}
      >
        {ANT_OPCOES.map((o) => (
          <option key={o.id} value={o.id}>{o.nome} — {o.descricao}</option>
        ))}
      </select>

      <div className="controles" style={{ marginTop: 32 }}>
        <button className="primaria" disabled={trabalhadores.length === 0} onClick={iniciar}>
          Iniciar a Luta
        </button>
      </div>
    </main>
  );
}
