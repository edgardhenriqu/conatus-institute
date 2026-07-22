const jwt = require('jsonwebtoken');
const pool = require('../../db/connection');
const { ADMIN_ROLES, CONTENT_ROLES, SUPERADMIN_ROLES } = require('../utils/roles');

const JWT_SECRET = process.env.JWT_SECRET;

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ erro: 'Token não fornecido' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.alunoId = decoded.id;
    req.userRole = decoded.role;
    next();
  } catch {
    return res.status(401).json({ erro: 'Token inválido ou expirado' });
  }
}

async function adminMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ erro: 'Token não fornecido' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.alunoId = decoded.id;

    // Sempre confere o role no banco: o token pode estar desatualizado
    const resultado = await pool.query(
      'SELECT role FROM alunos WHERE id = $1',
      [decoded.id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }

    if (!ADMIN_ROLES.includes(resultado.rows[0].role)) {
      return res.status(403).json({ erro: 'Acesso negado. Apenas administradores podem acessar esta rota.' });
    }

    req.userRole = resultado.rows[0].role;
    next();
  } catch {
    return res.status(401).json({ erro: 'Token inválido ou expirado' });
  }
}

// Permite APENAS superadmin e diretor — para ações sensíveis que o admin comum
// não deve executar (ex.: fechar/excluir chamados de suporte).
async function superAdminMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ erro: 'Token não fornecido' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.alunoId = decoded.id;

    // Confere o role no banco: o token pode estar desatualizado.
    const resultado = await pool.query(
      'SELECT role FROM alunos WHERE id = $1',
      [decoded.id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }

    if (!SUPERADMIN_ROLES.includes(resultado.rows[0].role)) {
      return res.status(403).json({ erro: 'Acesso negado. Apenas o superadministrador ou o diretor podem executar esta ação.' });
    }

    req.userRole = resultado.rows[0].role;
    next();
  } catch {
    return res.status(401).json({ erro: 'Token inválido ou expirado' });
  }
}

// Permite admin, superadmin e instrutor
async function contentMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ erro: 'Token não fornecido' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.alunoId = decoded.id;

    const resultado = await pool.query(
      'SELECT role FROM alunos WHERE id = $1',
      [decoded.id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }

    if (!CONTENT_ROLES.includes(resultado.rows[0].role)) {
      return res.status(403).json({ erro: 'Acesso negado.' });
    }

    req.userRole = resultado.rows[0].role;
    next();
  } catch {
    return res.status(401).json({ erro: 'Token inválido ou expirado' });
  }
}

module.exports = { authMiddleware, adminMiddleware, superAdminMiddleware, contentMiddleware, ADMIN_ROLES, CONTENT_ROLES };
