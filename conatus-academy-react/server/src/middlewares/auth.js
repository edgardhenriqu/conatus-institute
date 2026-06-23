const jwt = require('jsonwebtoken');
const pool = require('../../db/connection');

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

const ADMIN_ROLES = ['admin', 'superadmin'];
const CONTENT_ROLES = ['admin', 'superadmin', 'instrutor'];

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

module.exports = { authMiddleware, adminMiddleware, contentMiddleware, ADMIN_ROLES, CONTENT_ROLES };
