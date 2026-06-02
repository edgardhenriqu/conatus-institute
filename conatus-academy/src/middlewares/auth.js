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
  } catch (error) {
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

    // Verificar role diretamente do JWT primeiro
    if (decoded.role === 'admin') {
      req.userRole = decoded.role;
      return next();
    }

    // Se não tiver role no JWT, buscar no banco
    const resultado = await pool.query(
      'SELECT role FROM alunos WHERE id = $1',
      [decoded.id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }

    if (resultado.rows[0].role !== 'admin') {
      return res.status(403).json({ erro: 'Acesso negado. Apenas administradores podem acessar esta rota.' });
    }

    req.userRole = 'admin';
    next();
  } catch (error) {
    return res.status(401).json({ erro: 'Token inválido ou expirado' });
  }
}

module.exports = { authMiddleware, adminMiddleware };
