import megafoneImg from '../../assets/megafone-narracao.png';

/**
 * Mini-player da narração.
 *
 * Não existe caixa de narração acima da aula: quem inicia a fala é a própria
 * figura do megafone dentro do texto (ver CourseViewer). Este controle é
 * transitório — só aparece enquanto há voz tocando ou pausada, para o aluno
 * poder pausar, retomar e ver o progresso sem perder o conteúdo de vista.
 *
 * A voz mora no hook useNarracao; aqui é só interface.
 */
export function NarrationDock({ narracao }) {
  const {
    suportado, estado, blocoAtivo, totalBlocos, progresso,
    pausar, retomar, parar,
  } = narracao;

  const ativo = estado === 'falando' || estado === 'pausado';
  if (!suportado || !totalBlocos || !ativo) return null;

  const falando = estado === 'falando';
  const trecho = blocoAtivo !== null ? blocoAtivo + 1 : 1;

  return (
    <div
      className={`narration-dock narration-dock--${estado}`}
      role="region"
      aria-label="Controle da narração"
    >
      <img src={megafoneImg} alt="" className="narration-icon-img" />

      <div className="narration-dock-info">
        <span className="narration-dock-label">
          {falando ? 'Narrando' : 'Narração pausada'}
          {totalBlocos > 1 ? ` · trecho ${trecho} de ${totalBlocos}` : ''}
        </span>
        <div
          className="narration-dock-progress"
          role="progressbar"
          aria-valuenow={progresso}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progresso da narração"
        >
          <div className="narration-dock-bar" style={{ width: `${progresso}%` }} />
        </div>
      </div>

      <button
        type="button"
        className="narration-dock-btn"
        onClick={falando ? pausar : retomar}
        aria-label={falando ? 'Pausar narração' : 'Retomar narração'}
        title={falando ? 'Pausar' : 'Retomar'}
      >
        {falando ? '⏸' : '▶'}
      </button>

      <button
        type="button"
        className="narration-dock-btn narration-dock-btn--fechar"
        onClick={parar}
        aria-label="Encerrar narração"
        title="Encerrar"
      >
        ✕
      </button>
    </div>
  );
}
