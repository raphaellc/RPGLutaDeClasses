import { Antagonista } from '@domain/entities/Antagonista';
import { Partida } from '@domain/entities/Partida';
import { Trabalhador } from '@domain/entities/Trabalhador';
import { PERFIS_ANTAGONISTA } from '@domain/services/PerfilAntagonista';
import { Comando } from '../use-cases/AcoesDoTurno';

/**
 * IA simples para os antagonistas do Capital. Cada arquétipo tem um padrão
 * de ataque distinto, descrito no Capítulo 6 do manual.
 *
 * Política de alvo: priorizar quem tem maior dano potencial (TL+PV mais baixos
 * e CM mais baixo). É o algoritmo do Sistema: ataca quem está mais frágil.
 */
export function planejarTurnoSistema(p: Partida): Comando[] {
  const comandos: Comando[] = [];
  const ativos = p.trabalhadores.filter((t) => !t.colapsado);
  if (ativos.length === 0) return comandos;

  for (const ant of p.antagonistas) {
    if (ant.derrotado || ant.bloqueadoNoTurno) continue;
    const alvo = escolherAlvo(ant, ativos);
    if (!alvo) continue;
    comandos.push(...gerarAtaque(ant, alvo, p.turno));
  }
  return comandos;
}

function escolherAlvo(ant: Antagonista, ativos: ReadonlyArray<Trabalhador>): Trabalhador | undefined {
  // Senhor das Nuvens prefere Uberizado; Estado prefere quem tem maior CC; Capitalista vai no mais rico em PV.
  const ranking: ReadonlyArray<Trabalhador> = (() => {
    switch (ant.arquetipo) {
      case 'senhorNuvens':
        return [...ativos].sort((a, b) => peso(b, 'fragilUberizado') - peso(a, 'fragilUberizado'));
      case 'estadoBurgues':
        return [...ativos].sort((a, b) => b.recursos.cc - a.recursos.cc);
      case 'capitalistaIndustrial':
      default:
        return [...ativos].sort((a, b) => b.recursos.pv + b.recursos.tl - (a.recursos.pv + a.recursos.tl));
    }
  })();
  return ranking[0];
}

function peso(t: Trabalhador, modo: 'fragilUberizado'): number {
  if (modo === 'fragilUberizado') {
    const bonus = t.arquetipo === 'fantasmaRede' ? 100 : 0;
    return bonus - (t.recursos.pv + t.recursos.tl + t.recursos.cm);
  }
  return 0;
}

function gerarAtaque(ant: Antagonista, alvo: Trabalhador, turno: number): Comando[] {
  const base = PERFIS_ANTAGONISTA[ant.arquetipo].danoBrutoBase;
  // Escalonamento moderado por turno (a Metrópole-Máquina não cansa).
  const danoBruto = base + Math.floor(turno / 3);

  const out: Comando[] = [
    { tipo: 'extrairMaisValia', antagonistaId: ant.id, alvoId: alvo.id, danoBruto },
  ];

  // Senhor das Nuvens aplica Alienação periodicamente
  if (ant.arquetipo === 'senhorNuvens' && turno % 2 === 0) {
    out.push({ tipo: 'aplicarStatus', alvoId: alvo.id, status: 'alienacao', turnos: 2 });
  }
  // Estado Burguês aplica Fetichismo
  if (ant.arquetipo === 'estadoBurgues' && turno % 3 === 0) {
    out.push({ tipo: 'aplicarStatus', alvoId: alvo.id, status: 'fetichismo', turnos: 2 });
  }
  return out;
}
