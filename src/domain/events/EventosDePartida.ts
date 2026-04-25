/**
 * Eventos de domínio — dados puros emitidos pelos serviços.
 * A camada de apresentação consome para narração; a camada de aplicação para registro.
 * Nenhum serviço de domínio deve lançar exceção como controle de fluxo: emite evento.
 */
export type EventoPartida =
  | { tipo: 'maisValiaExtraida'; alvoId: string; danoBruto: number; danoReal: number; perdaTL: number; perdaPV: number }
  | { tipo: 'solidariedadeExecutada'; doadorId: string; receptorId: string; cmTransferido: number; tlGanho: number; ccGanho: number }
  | { tipo: 'cicloSemanalAplicado'; trabalhadorId: string; descricao: string }
  | { tipo: 'organizacaoEvoluiu'; nivelAnterior: number; nivelNovo: number; habilidadesDesbloqueadas: ReadonlyArray<string> }
  | { tipo: 'piqueteConvocado'; antagonistaId: string; danoCapital: number; custoCm: number }
  | { tipo: 'greveGeralConvocada'; danoCapital: number; custoCm: number; custoTl: number }
  | { tipo: 'expropriacao'; antagonistaId: string }
  | { tipo: 'statusAplicado'; alvoId: string; status: string; turnos: number }
  | { tipo: 'statusCurado'; alvoId: string; status: string }
  | { tipo: 'colapso'; trabalhadorId: string }
  | { tipo: 'antagonistaDerrotado'; antagonistaId: string }
  | { tipo: 'rolagem'; valor: number; resultado: 'sucessoPleno' | 'sucessoComCusto' | 'derrota' }
  | { tipo: 'acaoDiretaResolvida'; executorId: string; intencao: string; eixo: string; d6: number; bonus: number; total: number; resultado: 'sucessoPleno' | 'sucessoComCusto' | 'derrota'; danoAoCapital: number; alvoAntagonistaId?: string }
  | { tipo: 'maquinasVorazes'; antagonistaId: string; danoBase: number; alvosAfetados: ReadonlyArray<{ alvoId: string; dano: number }> }
  | { tipo: 'narrativa'; texto: string };
