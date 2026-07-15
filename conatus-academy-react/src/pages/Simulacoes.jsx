import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { PageLoader } from '../components/ui/PageLoader';
import { Carousel } from '../components/ui/Carousel';
import { SIMULACAO_TEMAS } from '../data/simulacoesTemas';

/**
 * Simulações Aplicadas a Data Centers — galeria de vídeos.
 *
 * Página exclusiva para alunos logados (rota protegida em App.jsx).
 * Os vídeos são cadastrados pelo admin em /admin/simulacoes e ficam no banco;
 * aqui eles aparecem agrupados nos três eixos (Falhas, Operações, Manutenções).
 */

/** Converte URLs do YouTube/Vimeo em URL de embed (igual ao CourseViewer). */
function toEmbedUrl(url) {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

function VideoCard({ video }) {
  const embedUrl = toEmbedUrl(video.video_url);
  return (
    <div className="simulacao-video-card">
      <div className="lesson-video">
        {embedUrl ? (
          <iframe
            src={embedUrl}
            title={video.titulo}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <video controls src={video.video_url} />
        )}
      </div>
      <h4>{video.titulo}</h4>
      {video.descricao && <p className="simulacao-video-desc">{video.descricao}</p>}
    </div>
  );
}

export function Simulacoes() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getSimulacoes()
      .then(data => setVideos(data.simulacoes || []))
      .catch(err => console.error('Erro ao carregar simulações:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader message="Carregando simulações..." />;

  return (
    <div className="cursos-body">
      <div className="container">
        <div className="cursos-header">
          <h1>Simulações Aplicadas a Data Centers</h1>
          <p>
            Vídeos das nossas simulações práticas, organizados por eixo. Assista quantas
            vezes precisar para dominar cada procedimento antes de atuar na operação crítica.
          </p>
        </div>
      </div>

      {SIMULACAO_TEMAS.map((tema) => {
        const doTema = videos.filter((v) => v.tema === tema.id);
        return (
          <section key={tema.id} id={tema.id} className="section simulacao-tema">
            <div className="container">
              <div className="simulacao-tema-head">
                <span className="simulacao-tema-icon">{tema.icone}</span>
                <div>
                  <h2>{tema.titulo}</h2>
                  <p>{tema.descricao}</p>
                </div>
              </div>

              {doTema.length === 0 ? (
                <div className="simulacao-empty">
                  🎬 Vídeos em breve nesta categoria.
                </div>
              ) : doTema.length >= 3 ? (
                // 3+ vídeos: carousel mostra 3 por vez e as setinhas revelam os
                // demais. Com 3 ou mais, os 3 slides visíveis são sempre distintos
                // (nunca repete) — reaproveita o Carousel dos cursos.
                <Carousel
                  items={doTema}
                  variant="carousel"
                  autoPlay={false}
                  renderItem={(v) => <VideoCard video={v} />}
                />
              ) : (
                // 1 ou 2 vídeos: grade alinhada à esquerda, sem duplicar e sem
                // setinhas (o carousel de 3 colunas repetiria o mesmo clipe).
                <div className="simulacao-video-grid">
                  {doTema.map((v) => (
                    <VideoCard key={v.id} video={v} />
                  ))}
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
