import { useCallback, useMemo, useState } from 'react';
import { Partida } from '@domain/entities/Partida';
import { EventoPartida } from '@domain/events/EventosDePartida';
import { Comando } from '@application/use-cases/AcoesDoTurno';
import { encerrarTurnoJogadores, executarAcao } from '@application/game-modes/MotorTurnoATurno';
import { LocalStoragePartidaRepository } from '@infrastructure/repositories/LocalStoragePartidaRepository';

export type { EventoPartida };

const repo = new LocalStoragePartidaRepository();

export interface EntradaLog {
  id: string;
  evento: EventoPartida;
  turno: number;
}

let counter = 0;
const novoIdLog = () => `log-${++counter}-${Date.now()}`;

export function useEstadoPartida(inicial: Partida) {
  const [partida, setPartida] = useState<Partida>(inicial);
  const [log, setLog] = useState<EntradaLog[]>([]);
  const [erro, setErro] = useState<string | undefined>();
  // Eventos do último turno do Capital — exibidos no RelatorioCapital
  const [relatorioCapital, setRelatorioCapital] = useState<ReadonlyArray<EventoPartida>>([]);

  const aplicar = useCallback(
    (cmd: Comando) => {
      const r = executarAcao(partida, cmd);
      if (r.erro) {
        setErro(r.erro);
        return;
      }
      setErro(undefined);
      setPartida(r.partida);
      setLog((prev) => [
        ...prev,
        ...r.eventos.map((e) => ({ id: novoIdLog(), evento: e, turno: r.partida.turno })),
      ]);
      void repo.salvar(r.partida);
    },
    [partida],
  );

  const encerrarTurno = useCallback(() => {
    const r = encerrarTurnoJogadores(partida);
    if (r.erro) {
      setErro(r.erro);
      return;
    }
    setErro(undefined);
    setPartida(r.partida);
    setLog((prev) => [
      ...prev,
      ...r.eventos.map((e) => ({ id: novoIdLog(), evento: e, turno: r.partida.turno })),
    ]);
    setRelatorioCapital(r.eventos); // abre o modal de relatório
    void repo.salvar(r.partida);
  }, [partida]);

  const limparRelatorio = useCallback(() => setRelatorioCapital([]), []);

  const resumo = useMemo(() => {
    const ativos = partida.trabalhadores.filter((t) => !t.colapsado).length;
    const antagonistasVivos = partida.antagonistas.filter((a) => !a.derrotado).length;
    return { ativos, antagonistasVivos };
  }, [partida]);

  return { partida, log, erro, aplicar, encerrarTurno, resumo, relatorioCapital, limparRelatorio };
}
