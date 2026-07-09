import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Carousel } from '../ui/Carousel';
import { useScrollReveal } from '../../hooks/useScrollReveal';

function formatarData(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d
    .toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    .replace('.', '')
    .toUpperCase();
}

export function NewsSection() {
  const [feed, setFeed] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    api.getNoticias()
      .then(data => { if (ativo) setFeed(data.noticias || []); })
      .catch(() => { if (ativo) setFeed([]); })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, []);

  useScrollReveal([carregando]);

  return (
    <section id="news" className="section news-section">
      <div className="section-header" data-reveal>
        <h2>Notícias & Eventos Acadêmicos</h2>
        <p>Atualizado automaticamente a partir de portais especializados em data centers.</p>
      </div>

      {carregando ? (
        <p className="news-feed__loading">Carregando notícias do setor…</p>
      ) : feed.length === 0 ? (
        <p className="news-feed__loading">Nenhuma notícia disponível no momento.</p>
      ) : (
        <div data-reveal="fade" style={{ '--reveal-delay': '120ms' }}>
        <Carousel
          items={feed}
          variant="home-carousel"
          renderItem={(n) => (
            <a className="news-card news-card--link"
              href={n.link} target="_blank" rel="noopener noreferrer">
              <div className="news-date">
                {[formatarData(n.data), n.fonte].filter(Boolean).join(' · ')}
              </div>
              <h3>{n.titulo}</h3>
              {n.resumo && <p>{n.resumo}</p>}
              <span className="news-card__more">Ler no portal →</span>
            </a>
          )}
        />
        </div>
      )}
    </section>
  );
}
