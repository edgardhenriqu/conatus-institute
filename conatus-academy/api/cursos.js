const cursos = [
  { id: 1, nome: "Relés de Proteção Elétrica", duracao: "20h", image: "assets/img/Relés de Proteção Elétrica.png" },
  { id: 2, nome: "Geradores para Data Center", duracao: "15h", image: "assets/img/Geradores para Data Center.png" },
  { id: 3, nome: "Introdução ao Data Center", duracao: "10h", image: "assets/img/Introdução ao Data Center.png" },
  { id: 4, nome: "Segurança em Data Center", duracao: "12h", image: "assets/img/Segurança em Data Center.png" },
  { id: 5, nome: "Redes e Telecom", duracao: "18h", image: "assets/img/Redes e Telecom.png" },
  { id: 6, nome: "Refrigeração para Data Center", duracao: "16h", image: "assets/img/Refrigeração para Data Center.png" }
];

module.exports = (req, res) => {
  res.status(200).json(cursos);
};