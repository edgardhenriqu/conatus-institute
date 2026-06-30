const express = require('express');

const router = express.Router();

// Feeds RSS de portais especializados em data centers (em inglês).
const FEEDS = [
  { fonte: 'DatacenterDynamics', url: 'https://www.datacenterdynamics.com/en/rss/' },
  { fonte: 'Data Center Knowledge', url: 'https://www.datacenterknowledge.com/rss.xml' },
];

const MAX_ITENS = 6;            // quantas notícias devolver
const CACHE_TTL = 60 * 60 * 1000; // 1 hora
const FETCH_TIMEOUT = 12000;    // 12s por feed

let cache = { dados: null, expira: 0 };

// ── Parsing de RSS (sem dependências externas) ─────────────────────────────────

function decodeEntidades(s = '') {
  return s
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
}

function limparTexto(str = '') {
  let s = str.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1'); // desempacota CDATA
  s = s.replace(/<[^>]+>/g, ' ');   // remove tags HTML reais
  s = decodeEntidades(s);           // decodifica entidades (pode revelar HTML "escapado")
  s = s.replace(/<[^>]+>/g, ' ');   // remove o HTML que estava escapado (ex.: &lt;p&gt;)
  return s.replace(/\s+/g, ' ').trim();
}

function extrairTag(bloco, tag) {
  const m = bloco.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return m ? limparTexto(m[1]) : '';
}

function parseFeed(xml, fonte) {
  const itens = [];
  const blocos = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
  for (const bloco of blocos) {
    const titulo = extrairTag(bloco, 'title');
    const link = extrairTag(bloco, 'link');
    if (!titulo || !link) continue;
    const pubDate = extrairTag(bloco, 'pubDate');
    let resumo = extrairTag(bloco, 'description');
    if (resumo.length > 180) resumo = resumo.slice(0, 177).trimEnd() + '…';
    itens.push({
      titulo,
      link,
      fonte,
      resumo,
      data: pubDate ? new Date(pubDate).toISOString() : null,
    });
  }
  return itens;
}

async function buscarFeed({ fonte, url }) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (ConatusAcademy NewsBot)' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    return parseFeed(xml, fonte);
  } finally {
    clearTimeout(t);
  }
}

// ── Rota pública ───────────────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  if (cache.dados && Date.now() < cache.expira) {
    return res.json({ noticias: cache.dados, cache: true });
  }

  try {
    const resultados = await Promise.allSettled(FEEDS.map(buscarFeed));
    let itens = resultados
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value);

    // ordena por data (mais recentes primeiro) e limita
    itens.sort((a, b) => (b.data || '').localeCompare(a.data || ''));
    itens = itens.slice(0, MAX_ITENS);

    // Se todos os feeds falharam, mantém o cache antigo (se houver)
    if (itens.length === 0 && cache.dados) {
      return res.json({ noticias: cache.dados, cache: true, stale: true });
    }

    cache = { dados: itens, expira: Date.now() + CACHE_TTL };
    res.json({ noticias: itens, cache: false });
  } catch (error) {
    console.error('Erro ao buscar notícias externas:', error.message);
    if (cache.dados) return res.json({ noticias: cache.dados, cache: true, stale: true });
    res.status(502).json({ erro: 'Não foi possível carregar as notícias no momento.', noticias: [] });
  }
});

module.exports = router;
