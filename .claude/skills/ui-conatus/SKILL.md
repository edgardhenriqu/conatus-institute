---
name: ui-conatus
description: Construir ou ajustar UI da plataforma Conatus Academy mantendo o design system (cores, tipografia, tokens CSS, componentes ui/). Use ao criar páginas, cards, botões, modais, telas de admin/aluno ou qualquer interface visual.
---

# UI Profissional Conatus

## Quando usar
- Criar ou redesenhar qualquer tela, página, seção ou componente visual.
- Ajustar layout, espaçamento, cores, tipografia ou responsividade.
- Adicionar um novo componente reutilizável em `src/components/ui/`.
- Sempre que o usuário pedir algo "mais profissional", "bonito" ou "alinhado à marca".

## Regras do projeto
- **Design system é a fonte da verdade:** todos os tokens vivem em `src/styles/variables.css`. NUNCA escreva cores, fontes, raios ou sombras hex/px soltos — use as variáveis CSS.
  - Cores: `--primary` (#003366), `--primary-light`, `--primary-dark`, `--secondary` (#8b0000), `--gold` (#d4af37), paleta data center (`--dc-dark`, `--dc-electric`), status (`--success`, `--warning`, `--danger`, `--info`).
  - Tipografia: títulos com `--font-heading` (Space Grotesk), corpo com `--font-body` (Inter).
  - Espaço/forma: `--radius`, `--radius-lg`, `--shadow`, `--shadow-lg`, `--transition`, `--container-max` (1200px), `--navbar-height` (80px).
  - Acessibilidade: foco visível com `--focus-ring`.
- **Stack:** React 19 (sem `import React` desnecessário — JSX transform automático), Vite 8, react-router-dom 7. Componentes funcionais com hooks.
- **CSS:** global em `src/styles/global.css`, componentes em `components.css`, animações em `animations.css`. NÃO use libs CSS-in-JS nem Tailwind — o projeto é CSS puro com custom properties. Mantenha classes BEM-ish já usadas (ex.: `ccard`, `mop-panel`, `qbank`).
- **Componentes prontos — reutilize antes de criar:** `ui/Button.jsx`, `ui/Badge.jsx`, `ui/CourseCard.jsx`, `ui/Carousel.jsx`, `ui/Toast.jsx` (use `useToast()` — NUNCA `alert()`), `ui/PageLoader.jsx`, `ui/ProtectedRoute.jsx`.
- **Feedback ao usuário:** sempre via `useToast()` do `ToastProvider`. Loading via `PageLoader`.
- **Conteúdo HTML de aulas:** renderizado com `dangerouslySetInnerHTML` em `CourseViewer`. Passe sempre por `normalizeQuillHtml()` (`src/utils/quillHtml.js`) ao renderizar; considere sanitizar com DOMPurify se a fonte não for confiável.
- **Português:** todo texto de interface em pt-BR.

## Checklist de implementação
- [ ] Reutilizei um componente de `ui/` em vez de recriar?
- [ ] Usei apenas tokens de `variables.css` (zero hex/px mágicos)?
- [ ] Títulos com `--font-heading`, corpo com `--font-body`?
- [ ] Estados de foco/hover/disabled cobertos e acessíveis (`--focus-ring`)?
- [ ] Responsivo (mobile-first, respeita `--container-max`)?
- [ ] Feedback via `useToast()` e loading via `PageLoader` (sem `alert`)?
- [ ] Textos em português, sem string hardcoded de cor/marca?

## Critérios de qualidade
- Visual coeso com o restante da plataforma (mesma densidade, raios e sombras).
- Nenhum valor de cor/fonte fora do design system.
- Contraste AA, navegação por teclado e foco visível.
- Sem layout shift; imagens com dimensões definidas.
- Build limpo: 0 erros, 0 warnings de lint.

## Comandos de teste/verificação
```bash
cd conatus-academy-react
npm run lint          # 0 erros, 0 warnings
npm run build         # build de produção deve passar limpo
npm run dev:client    # inspeção visual em http://localhost:5173
```
