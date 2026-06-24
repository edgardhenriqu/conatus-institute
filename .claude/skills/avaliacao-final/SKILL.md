---
name: avaliacao-final
description: Trabalhar na avaliação final / quiz com banco de questões da Conatus Academy. Use ao mexer em questões, tentativas, correção, nota mínima, sorteio de questões ou nas rotas de avaliação (iniciar/submeter).
---

# Avaliação Final com Banco de Questões

## Quando usar
- Criar/editar questões, alternativas, gabarito ou explicações.
- Mexer na lógica de tentativas, sorteio, correção ou nota mínima.
- Trabalhar em `CourseQuiz.jsx`, `AdminAvaliacoes.jsx` ou nas rotas de avaliação em `cursos.js`.

## Regras do projeto — DOIS fluxos de quiz
1. **MOP estático:** banco em `src/data/mopQuestions.js` (30 questões). `MopQuiz` corrige no cliente (feedback imediato), persiste tentativas em localStorage (`conatus_mop_quiz`). 10 questões aleatórias/tentativa (Fisher-Yates), máx. 3 tentativas, nota mínima 80%, bloqueado até 100% das aulas.
2. **Cursos DB (padrão):** correção **NO SERVIDOR** — esta é a regra crítica. `DbQuiz` responde tudo → envia → recebe resultado.

## Correção server-side (cursos DB) — INVIOLÁVEL
A resposta correta **NUNCA** pode chegar ao cliente antes da submissão. Fluxo em `server/src/routes/cursos.js`:
- `POST /:cursoId/avaliacao/iniciar` — sorteia N questões **sem o campo `correta`**. Valida: avaliação ativa, aluno não já aprovado, tentativas < `max_tentativas`.
- `POST /:cursoId/avaliacao/submeter` — busca `correta` no banco, compara `parseInt(respostas[q.id]) === q.correta`. **Questão não respondida = errada.** Calcula `nota`, `aprovado = nota >= config.nota_minima`, grava em `tentativas_avaliacao`, retorna correção (correta + explicação) só **depois** de submeter.
- `GET /:cursoId/avaliacao` — config + status (melhor nota, aprovado, tentativas restantes).

## Modelo de dados
- `avaliacoes` (1:1 com curso): `ativa`, `nota_minima`, `max_tentativas`, nº de questões sorteadas. MOP DB: 10 questões / 80% / 3 tentativas.
- `questoes`: `correta` (índice), `explicacao`, alternativas em **JSONB**.
- `tentativas_avaliacao`: `aluno_id`, `curso_id`, `nota`, `aprovado`, `respostas` (JSON).

## Checklist de implementação
- [ ] Correção de cursos DB acontece SÓ no servidor?
- [ ] Endpoint `iniciar` nunca expõe `correta` nem `explicacao`?
- [ ] Questão não respondida conta como errada?
- [ ] Limite de tentativas e bloqueio de "já aprovado" validados no servidor?
- [ ] `nota_minima` e `max_tentativas` vêm da config, não hardcoded?
- [ ] Tentativa registrada em `tentativas_avaliacao`?
- [ ] Quiz só liberado após 100% das aulas obrigatórias?

## Critérios de qualidade
- Impossível extrair o gabarito inspecionando a resposta do `iniciar`.
- Recontagem de nota no servidor é determinística e auditável.
- Aluno aprovado não consegue refazer; quem estourou tentativas é bloqueado.
- Sorteio realmente aleatório e sem repetição na mesma tentativa.

## Comandos de teste/verificação
```bash
cd conatus-academy-react
# Garanta que 'correta' NÃO aparece na resposta do iniciar:
curl -s -X POST http://localhost:3000/api/cursos/<id>/avaliacao/iniciar \
  -H "Authorization: Bearer <token>" | grep -i correta   # deve vir VAZIO
# Submeta respostas e confira nota/aprovado calculados no servidor.
npm run lint && npm run build
```
