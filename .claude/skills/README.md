# Skills do Projeto — Conatus Academy / Core

Skills específicas deste projeto. Cada pasta tem um `SKILL.md` com: quando usar, regras do projeto, checklist, critérios de qualidade e comandos de verificação.

| Skill | Use quando for mexer em… |
|---|---|
| `ui-conatus` | UI/visual — design system (`variables.css`), componentes `ui/`, layout, tipografia |
| `cursos-edicao` | Conteúdo de cursos/módulos/aulas, editor Quill, fluxos MOP estático vs DB |
| `painel-admin` | Telas `pages/admin/`, rotas `server/.../admin.js`, matrículas, gestão |
| `permissoes-perfil` | Acesso por papel (`permissions.js`), proteção de rotas, cursos internos |
| `avaliacao-final` | Quiz/avaliação, banco de questões, correção server-side, tentativas |
| `certificado` | Elegibilidade, emissão, código de validação, impressão/PDF |
| `docker-deploy` | Infra Docker, schema/migrações, `.env`, CORS, SMTP, build/deploy |

## Fatos transversais do projeto
- **Frontend:** React 19 + Vite 8, ESM, CSS puro com custom properties. **Backend:** Express 4 **CommonJS** (`require`), `pg`, JWT, bcrypt, nodemailer — sem hot-reload (reiniciar ao mudar).
- **Dois fluxos coexistem em quase tudo:** MOP estático (localStorage via `mopProgress.js`) e cursos DB (API/PostgreSQL). Sempre identifique qual está em jogo.
- **Segurança no servidor:** avaliação corrigida e certificado validado no back; front é só UX.
