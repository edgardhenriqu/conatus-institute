---
name: cursos-edicao
description: Criar e editar cursos, módulos e aulas na Conatus Academy. Use ao mexer em conteúdo de curso, editor de aulas (Quill), módulos, vídeo/PDF/material, ou ao distinguir o fluxo MOP estático do fluxo de cursos no banco.
---

# Criação e Edição de Cursos

## Quando usar
- Criar, editar, duplicar ou reordenar cursos, módulos e aulas.
- Mexer no editor de conteúdo de aula (texto rico via Quill), vídeos, PDFs ou materiais.
- Trabalhar no `CourseEditor`, `ModuleEditor`, `LessonEditor` ou no `CourseViewer`.

## Regras do projeto — DOIS fluxos coexistem
Antes de qualquer mudança, identifique qual fluxo é afetado:
1. **MOP estático (legado):** `legacyMopCourse` em `src/data/courses.js`, progresso em **localStorage** via `src/utils/mopProgress.js` (fonte da verdade). Rotas `/cursos/mop-interno/*` usam o branch estático do `CourseViewer`/`CourseQuiz`/`Certificate`. O conteúdo também foi semeado no banco por `server/db/seedMopCourse.js`.
2. **Cursos DB (padrão atual):** criados pelo admin, persistidos em PostgreSQL, consumidos via API (`src/services/adminApi.js` no admin, `src/services/api.js` no aluno). Todo curso novo segue este fluxo.

`CourseViewer.jsx` detecta MOP (estático) vs DB (API) e renderiza o branch correto. `normalizeDbCourse()` em `courses.js` traduz nível/tipo para os cards.

## Regras de edição de aula (Quill)
- Editor é `react-quill-new@3` (NÃO `react-quill@2`, incompatível com React 19). Wrapper: `src/components/common/QuillEditor.jsx`.
- No array `formats`, **não inclua `'bullet'`** — `'list'` já cobre listas.
- `normalizeQuillHtml()` (`src/utils/quillHtml.js`) é obrigatória ao **SALVAR** a aula (no `CourseEditor`) e ao **RENDERIZAR** (no `CourseViewer`) — corrige `&nbsp;` que quebrava palavras no player.
- **NUNCA** aplique `normalizeQuillHtml()` no `onChange` do editor — o componente é controlado e o cursor saltaria.

## Modelo de dados (cursos DB)
- `cursos`: descricao_curta, categoria, nivel (basico/intermediario/avancado), tipo (gratuito/interno/pago), status (rascunho/publicado/inativo), visivel, publico_alvo, objetivo, requisitos, requisitos_certificado, cert_*.
- `aulas`: descricao, tipo_conteudo (texto/video/pdf/link/material), video_url, material_url, duracao_minutos, **obrigatoria**.
- Vídeo: use `toEmbedUrl` do `CourseViewer` para YouTube/Vimeo.
- Progresso de aula no DB: chave `aula-<id>` em `progresso_aulas.aula_titulo`; só aulas **obrigatórias** contam no `recalcularProgresso`.

## Checklist de implementação
- [ ] Identifiquei se a mudança afeta o fluxo MOP estático, o DB, ou ambos?
- [ ] Editor usa `react-quill-new`, sem `'bullet'` em formats?
- [ ] `normalizeQuillHtml()` aplicada ao salvar E ao renderizar (nunca no onChange)?
- [ ] Campos novos refletidos em `CURSO_FIELDS` (admin.js) e no editor?
- [ ] Aulas não obrigatórias não quebram o cálculo de progresso/certificado?
- [ ] Reordenação de módulos/aulas persiste a ordem?

## Critérios de qualidade
- Conteúdo salvo é renderizado idêntico no player (sem palavras coladas/quebradas).
- Vídeos embedam corretamente; PDFs/materiais abrem.
- Mudança não quebra o curso MOP legado nem cursos DB existentes.
- Status/visibilidade respeitados (rascunho não vaza para o catálogo).

## Comandos de teste/verificação
```bash
cd conatus-academy-react
npm run dev           # sobe server + client (concurrently)
# Fluxo manual: admin cria curso → adiciona módulo/aula → edita conteúdo Quill
# → publica → abre como aluno e confere o conteúdo no player
npm run lint && npm run build
```
