require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require("express");
const cors = require("cors");
const authRoutes = require("./src/routes/auth");
const cursosRoutes = require("./src/routes/cursos");
const adminRoutes = require("./src/routes/admin");

const app = express();

const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(cors({
  origin: corsOrigin,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/cursos", cursosRoutes);
app.use("/api/admin", adminRoutes);

const PORT = process.env.PORT || 3000;

const ensureSchema = require('./db/ensureSchema');
const seedMopCourse = require('./db/seedMopCourse');

ensureSchema()
  .then(() => seedMopCourse())
  .catch(err => console.error('Aviso: não foi possível atualizar o schema/seed automaticamente:', err.message))
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`Backend rodando na porta ${PORT}`);
    });
  });

module.exports = app;
