---
name: certificado
description: Geração, emissão e validação de certificados de conclusão na Conatus Academy. Use ao mexer em elegibilidade, código de validação, layout do certificado, impressão/PDF ou nas páginas Certificate.jsx.
---

# Geração de Certificado

## Quando usar
- Mexer em elegibilidade, emissão, código de validação ou layout do certificado.
- Trabalhar em `src/pages/Certificate.jsx`, `AdminCertificados.jsx` ou na lógica de certificado em `cursos.js` / `mopProgress.js`.

## Regras do projeto — DOIS fluxos
1. **MOP estático:** `getOrIssueCertificate()` em `src/utils/mopProgress.js`, chave `conatus_mop_cert_${uid}` no localStorage. Elegibilidade via `isCertEligible(lessonPct)` (fonte da verdade): 100% das aulas + aprovação no quiz (≥80%).
2. **Cursos DB (padrão):** `DbCertificate` emite **automaticamente** ao abrir a página se elegível. Validação de elegibilidade ocorre **no servidor** (`cursos.js`).

Ambos compartilham o layout `CertificateSheet` em `Certificate.jsx`. Rota: `/cursos/:id/certificado`.

## Elegibilidade (cursos DB) — validada no servidor
Para emitir, TODAS as condições:
- 100% das aulas **obrigatórias** concluídas (`recalcularProgresso` conta só obrigatórias).
- Aprovação na avaliação **se** houver avaliação ativa com questões (ver skill `avaliacao-final`).
- Curso com status `publicado`.

## Código de validação — segurança
- Gerado com **`crypto.randomBytes`** (NUNCA `Math.random()`). Formato `CN-` + 4 bytes hex maiúsculo.
- Código é único e persistido junto ao certificado; serve para verificação pública.

## Impressão / PDF
- Botão imprimir usa `window.print()` + CSS `@media print` (já no `components.css`/`Certificate.jsx`).
- Layout deve caber em uma folha, sem cortar borda nem código de validação.

## Preservação
- Desmatrícula de aluno (admin) remove matrícula/progresso/tentativas mas **preserva certificados já emitidos** (ver skill `painel-admin`).

## Checklist de implementação
- [ ] Elegibilidade DB validada no servidor (não confiar no cliente)?
- [ ] Conta só aulas obrigatórias para o 100%?
- [ ] Exige aprovação se houver avaliação ativa com questões?
- [ ] Curso precisa estar `publicado`?
- [ ] Código gerado com `crypto.randomBytes`, único e persistido?
- [ ] Impressão (`@media print`) cabe em 1 folha com o código visível?
- [ ] Certificado não é reemitido com código novo se já existe?

## Critérios de qualidade
- Impossível emitir certificado sem cumprir 100% + aprovação + publicado.
- Código de validação criptograficamente aleatório e estável (não muda a cada visita).
- Layout profissional, impressão limpa em PDF.
- Certificados sobrevivem à desmatrícula.

## Comandos de teste/verificação
```bash
cd conatus-academy-react
# Tentar emitir sem cumprir requisitos deve falhar no servidor:
curl -i http://localhost:3000/api/cursos/<id>/certificado -H "Authorization: Bearer <token>"
# Fluxo: concluir 100% aulas + passar na avaliação → abrir /cursos/:id/certificado
# → certificado emitido com código CN-XXXXXXXX → imprimir (Ctrl+P) confere 1 folha
npm run lint && npm run build
```
