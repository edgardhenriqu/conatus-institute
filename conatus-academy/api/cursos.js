const cursos = [
  {
    id: 1,
    nome: "Introdução a Sistemas de Geração para Data Centers",
    duracao: "20h",
    image: "assets/img/Geradores para Data Center.png"
  },
  {
    id: 2,
    nome: "Introdução a Sistemas de UPS para Data Centers",
    duracao: "15h",
    image: "assets/img/Introdução ao Data Center.png"
  },
  {
    id: 3,
    nome: "Fundamentos de Procedimentos Operacionais em Data Centers",
    duracao: "10h",
    image: "assets/img/Relés de Proteção Elétrica.png"
  }
];

module.exports = (req, res) => {
  res.status(200).json(cursos);
};