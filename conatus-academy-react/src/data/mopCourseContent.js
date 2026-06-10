const img = (name, alt) =>
  `<img src="/images/courses/mop/${name}" alt="${alt}" style="max-width:100%;border-radius:8px;margin:16px 0;display:block;" />`;

const link = (url, label) =>
  `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color:var(--gold);font-weight:600;">${label}</a>`;

const brands = (...names) =>
  `<p style="margin-top:12px;font-size:0.9rem;color:var(--text-muted);"><strong>Fabricantes:</strong> ${names.join(' · ')}</p>`;

const bq = (text) =>
  `<blockquote style="border-left:4px solid var(--gold);padding:12px 16px;margin:20px 0;background:var(--bg-light);font-style:italic;">${text}</blockquote>`;

export const mopCourseContent = {
  courseId: 'mop-interno',
  title: 'Especialização Operacional: Elaboração de MOPs para Data Centers',
  modules: [

    // ─── MÓDULO 1 ────────────────────────────────────────────────────────────
    {
      id: 'm1',
      title: 'Módulo 1 — Introdução ao Treinamento',
      lessons: [
        {
          id: 'l1.1',
          title: 'Por que este treinamento?',
          content: `
<h2>Por que este treinamento?</h2>
<ul>
  <li>Aumento do grau de conhecimentos técnicos</li>
  <li>Padronização de procedimentos</li>
  <li>Mitigação de risco operacional</li>
  <li>Multiplicação de conhecimentos</li>
  <li>Melhoria contínua</li>
  <li>Reduzir retrabalho</li>
</ul>
${bq('Metodologia Conatus: Padronização · Confiabilidade · Excelência Operacional')}
`,
        },
        {
          id: 'l1.2',
          title: 'Objetivo do treinamento',
          content: `
<h2>Objetivo do Treinamento</h2>
<p>Ao final do treinamento, você será capaz de:</p>
<ul>
  <li>Elaborar MOP, SOP e EOP estruturados</li>
  <li>Aplicar análise de risco adequada</li>
  <li>Analisar redundância de projeto</li>
  <li>Integrar sistemas críticos corretamente</li>
  <li>Produzir documentos tecnicamente seguros e padronizados</li>
</ul>
`,
        },
        {
          id: 'l1.3',
          title: 'O que é um Ambiente Crítico?',
          content: `
<h2>O que é um Ambiente Crítico?</h2>
<ul>
  <li>Alta disponibilidade</li>
  <li>Operação 24x7</li>
  <li>Redundância de equipamentos</li>
  <li>Interdependência entre sistemas</li>
  <li>Tolerância mínima a erro</li>
</ul>
<p>Para entender melhor, assista ao vídeo:</p>
<p>${link('https://www.youtube.com/watch?v=GdmazdxHiYI', '▶ O que é ambiente crítico? (YouTube)')}</p>
`,
        },
        {
          id: 'l1.4',
          title: 'O Impacto de um Erro em Data Center',
          content: `
<h2>O Impacto de um Erro em Data Center</h2>
<ul>
  <li>Downtime pode gerar prejuízo milionário</li>
  <li>Erro humano é uma das principais causas de falha</li>
  <li>Procedimento mal estruturado = risco invisível</li>
  <li>Falha técnica pode gerar efeito cascata entre sistemas</li>
</ul>
<p>Leia o caso real: ${link('https://g1.globo.com/tecnologia/noticia/2025/10/21/mais-barato-e-mais-antigo-como-falha-em-um-data-center-da-amazon-afetou-ifood-mercado-livre-e-mais-centenas-de-empresas.ghtml', 'Como falha em Data Center da Amazon afetou iFood, Mercado Livre e centenas de empresas (G1)')}</p>
`,
        },
        {
          id: 'l1.5',
          title: 'Efeito Cascata',
          content: `
<h2>Efeito Cascata</h2>
<p>Exemplo prático:</p>
${bq('Falha elétrica → Parada de HVAC → Aumento de temperatura → Desligamento de racks → Impacto em clientes')}
<p>O procedimento deve prever o impacto cruzado entre sistemas. Nunca analise um sistema de forma isolada — em Data Centers, todos os sistemas são interdependentes.</p>
`,
        },
      ],
    },

    // ─── MÓDULO 2 ────────────────────────────────────────────────────────────
    {
      id: 'm2',
      title: 'Módulo 2 — Tipos de Data Center',
      lessons: [
        {
          id: 'l2.1',
          title: 'Tipos de Data Center',
          content: `
<h2>Tipos de Data Center</h2>
<ul>
  <li><strong>Enterprise</strong></li>
  <li><strong>Edge</strong></li>
  <li><strong>Colocation</strong></li>
  <li><strong>Hiperscale</strong></li>
</ul>
<p>Para entender cada tipo, assista ao vídeo:</p>
<p>${link('https://youtu.be/orsNmJSDpws?si=ZIJ70wIW794i2-8Z', '▶ Tipos de Data Center (YouTube)')}</p>
`,
        },
        {
          id: 'l2.2',
          title: 'Data Center Enterprise',
          content: `
<h2>Data Center Enterprise</h2>
${img('image3.jpeg', 'Data Center Enterprise')}
<p>Um Data Center Enterprise (ou corporativo/on-premises) é uma infraestrutura física própria, construída e gerenciada pela empresa, focada em alto controle, segurança de dados e personalização de TI. Embora exija alto investimento inicial e equipe qualificada, é preferido para armazenar aplicações críticas e dados sensíveis localmente.</p>
`,
        },
        {
          id: 'l2.3',
          title: 'Data Center Edge',
          content: `
<h2>Data Center Edge</h2>
${img('image4.png', 'Data Center Edge')}
<p>Data centers edge (de borda) são instalações compactas e descentralizadas posicionadas próximas aos usuários finais ou fontes de dados, reduzindo drasticamente a latência e o tráfego de rede. Essenciais para 5G, IoT e streaming, eles processam informações localmente, oferecendo alta velocidade, maior segurança e eficiência operacional.</p>
`,
        },
        {
          id: 'l2.4',
          title: 'Data Center Colocation',
          content: `
<h2>Data Center Colocation</h2>
${img('image5.jpeg', 'Data Center Colocation')}
<p>Um data center de colocation (ou co-locação) é uma instalação terceirizada onde empresas alugam espaço, energia, refrigeração e segurança para hospedar seus próprios servidores e equipamentos de TI. Ele permite alta disponibilidade, conectividade redundante e escalabilidade, transferindo a gestão da infraestrutura física para um provedor especializado, reduzindo custos operacionais.</p>
`,
        },
        {
          id: 'l2.5',
          title: 'Data Center Hiperscale',
          content: `
<h2>Data Center Hiperscale</h2>
${img('image6.jpeg', 'Data Center Hiperscale')}
<p>Um data center hyperscale é uma instalação de computação massiva, projetada para suportar cargas de trabalho extremas, escalabilidade horizontal rápida e alta densidade, superando 5.000 servidores e 930 m². Essencial para nuvem e big data (AWS, Google, Microsoft, Meta, Azure), ele prioriza eficiência energética e automação, sendo sinônimo de infraestrutura de dados em hiperescala.</p>
`,
        },
      ],
    },

    // ─── MÓDULO 3 ────────────────────────────────────────────────────────────
    {
      id: 'm3',
      title: 'Módulo 3 — Redundância e Classificação Tier',
      lessons: [
        {
          id: 'l3.1',
          title: 'Níveis de Redundância — Tier',
          content: `
<h2>Níveis de Redundância — Tier</h2>
${img('image7.png', 'Classificação Tier - Uptime Institute')}
<p>É uma classificação criada pela empresa <strong>Uptime Institute Professional Services</strong> há mais de 30 anos, usada para mensurar o nível de tolerância a falhas de infraestrutura em um local destinado para o funcionamento de um Data Center e/ou Centro de Processamento de Dados (CPD).</p>
`,
        },
        {
          id: 'l3.2',
          title: 'Classificação Tier I — Básica',
          content: `
<h2>Classificação Tier I — Básica</h2>
${img('image8.jpeg', 'Diagrama Tier I')}
<p>Desligamentos em todo o local são necessários para trabalhos de manutenção ou reparo. Falhas de capacidade ou distribuição afetarão o site — ou seja, quaisquer problema que ocorra com equipamentos que mantenham o DC operacional, interação humana ou falha na distribuição, causarão indisponibilidade parcial ou total do ambiente.</p>
`,
        },
        {
          id: 'l3.3',
          title: 'Classificação Tier II — Componentes Redundantes',
          content: `
<h2>Classificação Tier II — Componentes Redundantes</h2>
${img('image8.jpeg', 'Diagrama Tier II')}
<p>Desligamentos em todo o local para manutenção também são necessários. Falhas de capacidade podem afetar o site. Falhas de distribuição afetarão o site. Passamos a ter algumas redundâncias como: no-break e alguns cabeamentos elétricos, mas a distribuição ainda é única.</p>
`,
        },
        {
          id: 'l3.4',
          title: 'Classificação Tier III — Simultaneamente Mantido',
          content: `
<h2>Classificação Tier III — Simultaneamente Mantido</h2>
${img('image8.jpeg', 'Diagrama Tier III')}
<p>Cada componente de capacidade e caminho de distribuição em um local podem ser removidos de forma planejada para manutenção ou substituição sem afetar as operações. O local ainda está exposto a uma falha do equipamento ou erro do operador.</p>
<p>Aqui já possuímos distribuição redundante, passamos a ter a "obrigatoriedade" de os equipamentos de TI terem suporte para 2 fontes para usufruir da redundância de forma efetiva.</p>
`,
        },
        {
          id: 'l3.5',
          title: 'Classificação Tier IV — Tolerante a Falhas',
          content: `
<h2>Classificação Tier IV — Tolerante a Falhas</h2>
${img('image8.jpeg', 'Diagrama Tier IV')}
<p>Uma falha individual do equipamento ou interrupção do caminho de distribuição não afetará a operação. Um site tolerante a falhas também é mantido simultaneamente. Isso quer dizer que tudo é redundante — seja entrada de energia elétrica, caminhos dos cabos elétricos até os quadros de energia, ar condicionado, no-breaks, caminhos dos cabos de alimentação dos equipamentos de TI, etc.</p>
`,
        },
        {
          id: 'l3.6',
          title: 'Conceito de Redundância N, N+1, 2N e 2N+1',
          content: `
<h2>Conceito de Redundância</h2>
<ul>
  <li><strong>N</strong> → Sem redundância</li>
  <li><strong>N+1</strong> → Um equipamento reserva</li>
  <li><strong>2N</strong> → Dupla alimentação independente</li>
  <li><strong>2N+1</strong> → Dupla + backup adicional</li>
</ul>
${bq('Redundância não elimina risco — apenas o gerencia.')}
`,
        },
        {
          id: 'l3.7',
          title: 'Redundância N — Operação Normal',
          content: `
<h2>Redundância N — Operação Normal</h2>
<p>No diagrama abaixo: uma única cadeia de alimentação. A falha de qualquer componente (UPS, transformador, gerador) resulta em perda de carga.</p>
${img('image9.jpeg', 'Diagrama N - Operação Normal')}
${img('image10.png', 'Legenda N')}
`,
        },
        {
          id: 'l3.8',
          title: 'Redundância N+1 — Operação Normal',
          content: `
<h2>Redundância N+1 — Operação Normal</h2>
<p>Uma UPS extra está disponível. Se UPS-1 falhar, UPS-2 assume a carga completa sem interrupção.</p>
${img('image22.png', 'Diagrama N+1 - Operação Normal')}
`,
        },
        {
          id: 'l3.9',
          title: 'Redundância 2N — Operação Normal',
          content: `
<h2>Redundância 2N — Operação Normal</h2>
<p>Duas cadeias completamente independentes (A e B). Cada rack de TI é alimentado por ambas as fontes. A falha completa de uma cadeia não afeta a operação.</p>
${img('image23.png', 'Diagrama 2N - Operação Normal')}
`,
        },
        {
          id: 'l3.10',
          title: 'Redundância 2N+1 — Operação Normal',
          content: `
<h2>Redundância 2N+1 — Operação Normal</h2>
<p>Arquitetura 2N com uma UPS extra em cada cadeia. Máximo nível de proteção contra falha de equipamento e manutenção simultânea.</p>
${img('image27.png', 'Diagrama 2N+1 - Operação Normal')}
`,
        },
      ],
    },

    // ─── MÓDULO 4 ────────────────────────────────────────────────────────────
    {
      id: 'm4',
      title: 'Módulo 4 — Sistema Elétrico',
      lessons: [
        {
          id: 'l4.1',
          title: 'Subestação',
          content: `
<h2>Sistema Elétrico — Subestação</h2>
${img('image31.jpeg', 'Subestação')}
${img('image32.png', 'Diagrama Subestação')}
<p>A subestação é o ponto de entrada da energia no Data Center, responsável por receber, proteger e transformar a energia elétrica para níveis adequados de distribuição, garantindo segurança e confiabilidade da operação.</p>
${brands('Siemens', 'Schneider Electric', 'ABB', 'WEG')}
`,
        },
        {
          id: 'l4.2',
          title: 'Painéis MT — MV-IN',
          content: `
<h2>Sistema Elétrico — Painéis MT (MV-IN)</h2>
${img('image33.jpeg', 'MV-IN - Painel de Entrada de Média Tensão')}
<p>Conjunto de painéis de manobra, proteção e seccionamento responsável por receber a energia da rede de média tensão da concessionária e encaminhá-la com segurança para os transformadores e demais sistemas de distribuição do Data Center. O MV-IN permite o controle operacional da entrada de energia, garantindo proteção do sistema elétrico contra falhas, sobrecorrentes e curtos-circuitos.</p>
${brands('Siemens', 'Schneider Electric', 'ABB', 'Teknica')}
`,
        },
        {
          id: 'l4.3',
          title: 'Painéis MT — RMU/PMT',
          content: `
<h2>Sistema Elétrico — Painéis MT (RMU/PMT)</h2>
${img('image34.jpeg', 'RMU - Ring Mains Unit')}
${img('image35.png', 'Diagrama RMU')}
<p>O PMT/RMU é um painel de média tensão utilizado para distribuição e manobra de energia em redes configuradas em anel, permitindo maior confiabilidade e continuidade no fornecimento elétrico para sistemas críticos como Data Centers. Normalmente alimentam os transformadores de MT.</p>
${brands('Siemens', 'Schneider Electric', 'ABB', 'Teknica')}
`,
        },
        {
          id: 'l4.4',
          title: 'Relé de Proteção',
          content: `
<h2>Sistema Elétrico — Relé de Proteção</h2>
${img('image36.jpeg', 'Relé de Proteção Digital')}
${img('image37.png', 'Diagrama Relé de Proteção')}
<p>O relé de proteção monitora continuamente os parâmetros elétricos do sistema de média tensão e atua automaticamente na abertura do disjuntor em caso de falhas, protegendo transformadores, cabos e equipamentos do Data Center contra danos elétricos. Utilizado normalmente o modelo <strong>P3U30</strong> ou <strong>SIPROTEC 7SJ62</strong>.</p>
${brands('Schneider (Sepam / Easergy)', 'ABB (REF Series)', 'Siemens (Siprotec)', 'GE Grid Solutions (Multilin)')}
`,
        },
        {
          id: 'l4.5',
          title: 'Tabela ANSI',
          content: `
<h2>Sistema Elétrico — Tabela ANSI</h2>
${img('image38.png', 'Tabela ANSI - Funções de Proteção')}
${img('image39.png', 'Tabela ANSI complemento')}
<p>A tabela ANSI define os números de função para cada tipo de proteção elétrica, padronizando a nomenclatura usada em relés e diagramas de proteção.</p>
<p>Consulte a tabela completa em: ${link('https://selinc.com/pt/products/tables/ansi/', 'Tabela ANSI — SEL Inc.')}</p>
`,
        },
        {
          id: 'l4.6',
          title: 'Transformador de Potência MT/BT',
          content: `
<h2>Sistema Elétrico — Transformador</h2>
${img('image40.png', 'Transformador de Potência')}
${img('image41.png', 'Dados técnicos Transformador')}
<p>O transformador é responsável por converter os níveis de tensão elétrica da rede de média tensão para os níveis utilizados no sistema de distribuição do Data Center, garantindo fornecimento seguro e eficiente de energia para toda a infraestrutura crítica. Pode ter sistema construtivo <strong>a seco</strong> ou <strong>a óleo isolante</strong> e ligação de triângulo ou estrela entre primário e secundário.</p>
${brands('WEG', 'ABB', 'Siemens', 'Hitachi', 'Schneider Electric')}
`,
        },
        {
          id: 'l4.7',
          title: 'Gerador Diesel',
          content: `
<h2>Sistema Elétrico — Gerador Diesel</h2>
${img('image42.png', 'Gerador Diesel')}
<p>Fonte de energia secundária para o Data Center durante falhas curtas ou prolongadas da concessionária. O gerador entra automaticamente em operação após a detecção da perda de energia e fornece alimentação às cargas críticas por meio do sistema de transferência (ATS), podendo também ser utilizado como fonte estável durante paradas programadas para manutenção de sistemas como UPS. Dependendo da arquitetura do sistema, a transferência pode ocorrer em <strong>transição aberta</strong> ou <strong>fechada</strong>.</p>
<p>Classificações de operação: <strong>Standby Power (ESP)</strong>, <strong>Prime Power (PRP)</strong> e <strong>Continuous Power (COP)</strong>.</p>
${brands('Sotreq', 'MTU', 'Cummins', 'Weichai')}
`,
        },
        {
          id: 'l4.8',
          title: 'DRUPS — UPS Rotativa a Diesel',
          content: `
<h2>Sistema Elétrico — DRUPS</h2>
${img('image43.jpeg', 'DRUPS - Diesel Rotary UPS')}
<p>O DRUPS é um sistema que combina UPS e gerador diesel em uma única solução rotativa, utilizando <strong>volante de inércia</strong> para garantir fornecimento contínuo de energia sem necessidade de baterias.</p>
${brands('Piller Power Systems', 'Hitec Power Protection', 'MTU', 'Euro-Diesel')}
`,
        },
        {
          id: 'l4.9',
          title: 'IHM Geradores — EMCP/USCA',
          content: `
<h2>Sistema Elétrico — IHM Geradores (EMCP/USCA)</h2>
${img('image44.png', 'Controlador EMCP')}
${img('image45.png', 'Painel EMCP')}
${img('image47.jpeg', 'EMCP instalado')}
<p>O controlador EMCP é o sistema responsável por monitorar, controlar e proteger o funcionamento dos geradores, gerenciando automaticamente os parâmetros elétricos e mecânicos para garantir operação segura e confiável da geração de energia no Data Center.</p>
${brands('Sotreq', 'Deep Sea', 'Cummins')}
`,
        },
        {
          id: 'l4.10',
          title: 'PG-DB — Power Generator Distribution Board',
          content: `
<h2>Sistema Elétrico — PG-DB</h2>
${img('image49.jpeg', 'PG-DB')}
${img('image50.png', 'Diagrama PG-DB')}
<p>O PG-DB é o quadro responsável por distribuir a energia proveniente dos geradores para os sistemas elétricos do Data Center, garantindo alimentação segura das cargas críticas durante operação em modo de geração. Além disso, normalmente, ele é conectado ao barramento do painel do gerador de backup (MSB-SW) e ao barramento do banco de cargas (MSB-LB).</p>
${brands('VEPAN', 'Schneider', 'Siemens')}
`,
        },
        {
          id: 'l4.11',
          title: 'PQM — Analisador de Qualidade de Energia',
          content: `
<h2>Sistema Elétrico — PQM</h2>
${img('image51.png', 'PQM - Power Quality Meter')}
${img('image52.jpeg', 'PQM instalado')}
<p>O PQM é um analisador de qualidade de energia instalado em painéis elétricos, responsável por monitorar parâmetros elétricos avançados e identificar distúrbios que possam impactar a operação e a confiabilidade do Data Center.</p>
${brands('Schneider Electric (ION / PowerLogic)', 'Siemens (Sentron / PAC)', 'Janitza', 'ABB', 'Eaton')}
`,
        },
        {
          id: 'l4.12',
          title: 'MSB — Main Switch Board / QGBT',
          content: `
<h2>Sistema Elétrico — MSB-X / QGBT</h2>
${img('image53.png', 'MSB - Main Switch Board')}
${img('image54.png', 'Diagrama MSB')}
<p>O MSB/QGBT é o painel principal de distribuição de baixa tensão responsável por receber energia dos transformadores ou geradores e distribuí-la de forma segura para os sistemas elétricos e cargas críticas do Data Center. Normalmente é onde fica instalado o controlador de transferência de alimentação como o <strong>AGC 150 (DEIF)</strong> ou <strong>Magelis</strong>.</p>
${brands('Schneider Electric', 'Siemens', 'VEPAN', 'Teknica')}
`,
        },
        {
          id: 'l4.13',
          title: 'Controladores de Transferência',
          content: `
<h2>Sistema Elétrico — Controladores</h2>
${img('image55.png', 'Controlador de Paralelismo')}
${img('image47.jpeg', 'Controlador instalado')}
<p>Equipamento responsável por transferir automaticamente a alimentação entre duas fontes de energia (ex: concessionária e gerador), garantindo continuidade sem intervenção manual. Pode ser <strong>transição aberta</strong> ou <strong>fechada</strong>. Normalmente instalado no painel MSB.</p>
<p>Veja o vídeo explicativo: ${link('https://www.youtube.com/watch?v=D7Gf9l1kdWQ', '▶ Controladores (YouTube)')}</p>
${brands('DEIF', 'Deep Sea', 'ABB', 'Siemens', 'Schneider Electric')}
`,
        },
        {
          id: 'l4.14',
          title: 'MSB-SW — Painel de Transferência Swing',
          content: `
<h2>Sistema Elétrico — MSB-SW</h2>
${img('image56.png', 'MSB-SW')}
<p>O MSB-SW é o painel responsável por conectar o gerador swing ao sistema elétrico do Data Center, permitindo transferência de carga entre barramentos e garantindo maior redundância e flexibilidade operacional do sistema de geração.</p>
${brands('Siemens', 'Schneider Electric', 'VEPAN', 'Teknica')}
`,
        },
        {
          id: 'l4.15',
          title: 'Busway — Barramento Blindado',
          content: `
<h2>Sistema Elétrico — Busway</h2>
${img('image57.png', 'Busway - Barramento Blindado')}
<p>Sistema de distribuição elétrica composto por barramentos condutores protegidos por invólucro metálico, utilizado para transportar e distribuir energia elétrica de forma segura e eficiente dentro do Data Center. O busway substitui cabos tradicionais em muitas aplicações, permitindo distribuição modular e expansível de energia, especialmente em áreas de racks de TI.</p>
${brands('Schneider Electric', 'ABB', 'Siemens', 'Eaton')}
`,
        },
        {
          id: 'l4.16',
          title: 'Smart Busway — Barramento Inteligente',
          content: `
<h2>Sistema Elétrico — Smart Busway</h2>
${img('image58.jpeg', 'Smart Busway')}
<p>O smart busway é um sistema de barramento blindado com monitoramento inteligente incorporado, utilizado para distribuir energia de forma modular e permitir supervisão em tempo real da carga elétrica nos Data Centers.</p>
${brands('Schneider Electric', 'ABB', 'Siemens', 'Eaton', 'Legrand', 'Starline')}
`,
        },
        {
          id: 'l4.17',
          title: 'MSB-LB — Painel de Banco de Carga',
          content: `
<h2>Sistema Elétrico — MSB-LB</h2>
${img('image59.png', 'MSB-LB')}
<p>MSB-LB é o painel utilizado para conexão de bancos de carga ao sistema de geração, permitindo realizar testes controlados dos geradores e validar a capacidade operacional da infraestrutura elétrica do Data Center através de bancos fixos ou temporários (Cam-Lok / Power Lock).</p>
${brands('Siemens', 'Schneider Electric', 'VEPAN', 'Teknica')}
`,
        },
        {
          id: 'l4.18',
          title: 'Banco de Cargas — Load Bank',
          content: `
<h2>Sistema Elétrico — Banco de Carga</h2>
${img('image60.png', 'Banco de Cargas')}
${img('image61.png', 'Banco de Cargas - detalhe')}
${img('image62.png', 'Banco de Cargas - instalação')}
${img('image63.png', 'Banco de Cargas - externo')}
${img('image64.png', 'Banco de Cargas - conexão')}
<p>O banco de cargas é um equipamento utilizado para simular consumo elétrico controlado, permitindo testar e validar o desempenho de geradores e sistemas elétricos do Data Center sem impactar as cargas críticas.</p>
${brands('Avtron Power Solutions', 'ASCO Power Technologies', '3BW', 'Aggreko')}
`,
        },
        {
          id: 'l4.19',
          title: 'MSB-GS — Serviços Gerais',
          content: `
<h2>Sistema Elétrico — MSB-GS</h2>
${img('image65.png', 'MSB-GS')}
<p>O MSB-GS é o painel de distribuição responsável por alimentar os sistemas administrativos e auxiliares do Data Center, garantindo fornecimento de energia para as cargas prediais e de suporte ao funcionamento do site.</p>
${brands('Siemens', 'Schneider Electric', 'VEPAN', 'Teknica')}
`,
        },
        {
          id: 'l4.20',
          title: 'DSB — Distribution Switchboard',
          content: `
<h2>Sistema Elétrico — DSB</h2>
${img('image66.jpeg', 'DSB - Distribution Switchboard')}
<p>O DSB é um painel de distribuição de baixa tensão que recebe energia do quadro geral (MSB/QGBT ou outro DSB) e a distribui para sistemas e cargas auxiliares do Data Center, garantindo proteção e organização da infraestrutura elétrica.</p>
<p>TAGs mais usadas: <strong>DSB-DH, DSB-UPS, DSB-AUX, DSB-MECH, DSB-CH, DSB-SIS, DSB-VDC</strong>, etc.</p>
${brands('Siemens', 'Schneider Electric', 'VEPAN', 'Teknica')}
`,
        },
        {
          id: 'l4.21',
          title: 'ATS — Chave de Transferência Automática',
          content: `
<h2>Sistema Elétrico — ATS/QTA</h2>
${img('image67.png', 'ATS - Automatic Transfer Switch')}
<p>O ATS é o equipamento responsável por transferir automaticamente a alimentação entre a fonte principal e redundante, garantindo continuidade de energia e operação segura da infraestrutura crítica do Data Center.</p>
${brands('ASCO', 'ABB', 'Siemens', 'Schneider Electric')}
`,
        },
        {
          id: 'l4.22',
          title: 'UPS — Sistema de Alimentação Ininterrupta',
          content: `
<h2>Sistema Elétrico — UPS</h2>
${img('image68.png', 'UPS - Uninterruptible Power Supply')}
${img('image69.png', 'UPS - vista frontal')}
${img('image70.png', 'UPS - diagrama')}
<p>Equipamento responsável por fornecer energia estabilizada e sem interrupção para cargas críticas do Data Center. Atua entre a concessionária/gerador e os racks de TI, garantindo continuidade durante falhas, transientes ou perda de energia. Opera normalmente em <strong>dupla conversão (AC-DC-AC)</strong>, single ou paralelo e pode possuir <strong>bypass estático</strong> e <strong>bypass de manutenção</strong> (interno e externo).</p>
${brands('Vertiv', 'Schneider', 'Huawei', 'Eaton', 'Emerson')}
`,
        },
        {
          id: 'l4.23',
          title: 'Retificador — Sistema DC Power',
          content: `
<h2>Sistema Elétrico — Retificador</h2>
${img('image71.jpeg', 'Retificador DC')}
${img('image72.png', 'Diagrama Retificador')}
<p>Equipamento responsável por converter corrente alternada (AC) em corrente contínua (DC), alimentando cargas em corrente contínua e mantendo o banco de baterias carregado. Opera normalmente com tensão de <strong>125Vcc</strong>.</p>
${brands('Vertiv', 'Schneider', 'Huawei', 'Eletrol', 'TEKNICA', 'CTRL Tech')}
`,
        },
        {
          id: 'l4.24',
          title: 'Banco de Baterias',
          content: `
<h2>Sistema Elétrico — Banco de Baterias</h2>
${img('image73.png', 'Banco de Baterias')}
${img('image74.png', 'Baterias VRLA')}
${img('image75.jpeg', 'Rack de baterias')}
<p>Armazena energia elétrica para manter a UPS/Retificador alimentando as cargas durante falhas da concessionária até a entrada e operação do sistema de geração. Pode ser tecnologia <strong>chumbo-ácido regulada por válvula (VRLA)</strong> ou <strong>lítio</strong>.</p>
${brands('Enersys', 'CSB', 'Samsung', 'Narada')}
`,
        },
        {
          id: 'l4.25',
          title: 'STS — Chave de Transferência Estática',
          content: `
<h2>Sistema Elétrico — STS</h2>
${img('image76.png', 'STS - Static Transfer Switch')}
${img('image77.jpeg', 'STS instalado')}
${img('image78.png', 'Diagrama STS')}
<p>Equipamento responsável por transferir automaticamente a alimentação de uma carga crítica entre duas fontes de energia independentes, garantindo continuidade do fornecimento elétrico sem interrupção perceptível. A transferência ocorre em tempo extremamente rápido (<strong>tipicamente 2 a 4 milissegundos</strong>) utilizando dispositivos eletrônicos de potência, evitando impacto nos equipamentos de TI.</p>
${brands('Vertiv', 'Schneider Electric', 'ABB', 'Eaton')}
`,
        },
        {
          id: 'l4.26',
          title: 'PDU — Power Distribution Unit',
          content: `
<h2>Sistema Elétrico — PDU</h2>
${img('image79.jpeg', 'PDU - Power Distribution Unit')}
<p>Distribui energia da UPS para os painéis de distribuição dos racks (RPP ou diretamente para racks). Pode conter transformador interno para isolamento e/ou rebaixamento de tensão.</p>
${brands('Vertiv', 'Schneider Electric')}
`,
        },
        {
          id: 'l4.27',
          title: 'RPP — Remote Power Panel',
          content: `
<h2>Sistema Elétrico — RPP</h2>
${img('image80.png', 'RPP - Remote Power Panel')}
<p>Distribui energia da PDU ou de painel a montante (DSB-DH) para os racks individuais de TI. Contém disjuntores para circuitos de <strong>16A, 32A</strong> ou superiores.</p>
${brands('Vertiv', 'Schneider Electric', 'Teknica')}
`,
        },
        {
          id: 'l4.28',
          title: 'Alimentação Elétrica dos Racks de TI',
          content: `
<h2>Sistema Elétrico — Racks de TI</h2>
${img('image81.png', 'Alimentação de racks')}
${img('image82.jpeg', 'Racks de TI')}
<p>A alimentação elétrica dos racks de TI podem ser através do entrepiso (normalmente cabos) ou pela parte superior dos equipamentos (busway / smart bus bar), fornecendo energia <strong>trifásica ou monofásica</strong> para os equipamentos do Data Center.</p>
`,
        },
        {
          id: 'l4.29',
          title: 'Pontos Críticos Elétricos',
          content: `
<h2>Pontos Críticos Elétricos</h2>
<ul>
  <li>Bypass estático e mecânico (linha em geração)</li>
  <li>Transferência de carga (aberta/fechada, manual/automática)</li>
  <li>Intertravamentos (elétrico e/ou mecânico)</li>
  <li>Coordenação de proteção (estudo de seletividade)</li>
  <li>Monitoramento durante manobra</li>
  <li>Planos de retornos (rollback)</li>
  <li>Alarmes gerados</li>
</ul>
${bq('Durante qualquer manobra elétrica, a redundância do sistema é reduzida. O procedimento deve prever e documentar o impacto em cada etapa.')}
`,
        },
      ],
    },

    // ─── MÓDULO 5 ────────────────────────────────────────────────────────────
    {
      id: 'm5',
      title: 'Módulo 5 — Sistema Mecânico',
      lessons: [
        {
          id: 'l5.1',
          title: 'Visão Geral do Sistema Mecânico',
          content: `
<h2>Sistema Mecânico</h2>
<p>O sistema mecânico do Data Center é responsável pelo controle térmico da infraestrutura, garantindo que os equipamentos de TI e elétricos operem dentro dos limites de temperatura adequados.</p>
<p>Para entender os sistemas mecânicos, assista aos vídeos:</p>
<p>${link('https://www.youtube.com/watch?v=bIo_nRp8rvQ', '▶ Sistema Mecânico — Parte 1 (YouTube)')}</p>
<p>${link('https://www.youtube.com/watch?v=kgs90cYVHAc', '▶ Sistema Mecânico — Parte 2 (YouTube)')}</p>
`,
        },
        {
          id: 'l5.2',
          title: 'Chiller — Visão Geral',
          content: `
<h2>Equipamentos Mecânicos — Chiller</h2>
${img('image83.jpeg', 'Chiller')}
<p>Equipamento responsável por remover calor da água do sistema de resfriamento, produzindo água gelada utilizada para climatizar o Data Center. O chiller é o principal equipamento da planta de resfriamento, responsável por fornecer água gelada para sistemas como CRAH, AHU e fanwalls, que distribuem o ar frio nos ambientes.</p>
${brands('Vertiv (Liebert)', 'Schneider Electric', 'Trane', 'Daikin', 'Carrier', 'York')}
`,
        },
        {
          id: 'l5.3',
          title: 'Chiller a Ar — Fluxograma',
          content: `
<h2>Equipamentos Mecânicos — Chiller a Ar (Fluxograma)</h2>
${img('image84.jpeg', 'Fluxograma Chiller a Ar')}
<p>Fluxograma do sistema de chiller resfriado a ar mostrando o circuito de água gelada e os componentes interligados.</p>
`,
        },
        {
          id: 'l5.4',
          title: 'Chiller a Ar',
          content: `
<h2>Equipamentos Mecânicos — Chiller a Ar</h2>
${img('image85.png', 'Chiller a Ar')}
<p>O chiller a ar é um equipamento que produz água gelada para o sistema de climatização do Data Center, dissipando o calor diretamente para o ar ambiente, <strong>sem necessidade de torre de resfriamento</strong> ou circuito de água de condensação.</p>
${brands('Vertiv (Liebert)', 'Schneider Electric', 'Trane', 'Daikin', 'Carrier', 'York')}
`,
        },
        {
          id: 'l5.5',
          title: 'Bombas Hidráulicas HVAC',
          content: `
<h2>Equipamentos Mecânicos — Bombas</h2>
${img('image86.png', 'Bombas Hidráulicas')}
${img('image87.png', 'Diagrama Bombas')}
<p>Responsáveis pela circulação da água gelada entre chiller, trocadores e CRAHs.</p>
<ul>
  <li><strong>Sistema primário:</strong> Circulação interna do chiller</li>
  <li><strong>Sistema secundário:</strong> Distribuição até a sala de TI</li>
</ul>
${brands('Grundfos', 'Siemens', 'KSB', 'Wilo')}
`,
        },
        {
          id: 'l5.6',
          title: 'TST — Tanque de Armazenamento Térmico',
          content: `
<h2>Equipamentos Mecânicos — TST</h2>
${img('image88.jpeg', 'Tanque TST')}
${img('image89.jpeg', 'TST - detalhe')}
<p>Reservatório de grande volume utilizado para armazenar água gelada produzida pelos chillers, permitindo que a energia térmica seja utilizada posteriormente para auxiliar ou manter o resfriamento do Data Center. O TST funciona como um <strong>buffer térmico</strong>, ajudando a estabilizar o sistema de climatização e garantindo continuidade de resfriamento durante variações operacionais.</p>
`,
        },
        {
          id: 'l5.7',
          title: 'Chiller a Água — Fluxograma',
          content: `
<h2>Equipamentos Mecânicos — Chiller a Água (Fluxograma)</h2>
${img('image90.gif', 'Fluxograma Chiller a Água')}
<p>Fluxograma do sistema de chiller resfriado a água mostrando o circuito de condensação integrado às torres de resfriamento.</p>
`,
        },
        {
          id: 'l5.8',
          title: 'Chiller a Água',
          content: `
<h2>Equipamentos Mecânicos — Chiller a Água</h2>
${img('image91.jpeg', 'Chiller a Água')}
<p>O chiller a água é o equipamento responsável por produzir água gelada para o sistema de climatização do Data Center, transferindo o calor removido para um circuito de condensação resfriado por torres de resfriamento, oferecendo <strong>alta eficiência e estabilidade</strong> para plantas de grande porte.</p>
${brands('Trane', 'Daikin', 'Carrier', 'York')}
`,
        },
        {
          id: 'l5.9',
          title: 'BAGP — Bomba de Água Gelada Primária',
          content: `
<h2>Equipamentos Mecânicos — BAGP</h2>
${img('image92.jpeg', 'BAGP - Bomba Primária')}
<p>A BAGP é a bomba responsável por circular a água gelada no <strong>circuito primário</strong> da planta, garantindo vazão adequada através dos chillers e estabilidade operacional do sistema de resfriamento do Data Center.</p>
${brands('Grundfos', 'KSB', 'Wilo', 'Armstrong Fluid Technology', 'Xylem / Bell & Gossett')}
`,
        },
        {
          id: 'l5.10',
          title: 'BAGS — Bomba de Água Gelada Secundária',
          content: `
<h2>Equipamentos Mecânicos — BAGS</h2>
${img('image93.jpeg', 'BAGS - Bomba Secundária')}
<p>A BAGS é a bomba responsável por circular a água gelada no <strong>circuito secundário</strong> da planta, distribuindo o fluido para CRAHs, AHUs e fanwalls, garantindo vazão, pressão e estabilidade térmica adequadas para o resfriamento do Data Center.</p>
${brands('Grundfos', 'KSB', 'Wilo', 'Armstrong Fluid Technology', 'Xylem / Bell & Gossett')}
`,
        },
        {
          id: 'l5.11',
          title: 'Torre de Resfriamento',
          content: `
<h2>Equipamentos Mecânicos — Torre HVAC</h2>
${img('image94.jpeg', 'Torre de Resfriamento')}
${img('image95.gif', 'Funcionamento Torre de Resfriamento')}
<p>Equipamento responsável por remover o calor do circuito de água de condensação do sistema de resfriamento, dissipando esse calor para a atmosfera através do processo de evaporação. A torre de resfriamento é parte fundamental da planta de água gelada, permitindo que os chillers operem de forma eficiente ao reduzir a temperatura da água do condensador.</p>
${brands('SPX Cooling Technologies (Marley)', 'Baltimore Aircoil Company', 'Evapco', 'Johnson Controls')}
`,
        },
        {
          id: 'l5.12',
          title: 'BAC — Bomba de Água de Condensação',
          content: `
<h2>Equipamentos Mecânicos — BAC</h2>
${img('image96.jpeg', 'BAC - Bomba de Condensação')}
<p>A BAC é a bomba responsável por circular a água no <strong>circuito de condensação</strong> entre os chillers e as torres de resfriamento, removendo o calor rejeitado pela planta e garantindo eficiência e estabilidade operacional do sistema de resfriamento do Data Center.</p>
${brands('Grundfos', 'KSB', 'Wilo', 'Armstrong Fluid Technology', 'Xylem / Bell & Gossett')}
`,
        },
        {
          id: 'l5.13',
          title: 'Sistema de Enchimento Rápido',
          content: `
<h2>Equipamentos Mecânicos — Fast Filling</h2>
${img('image97.png', 'Sistema de Enchimento Rápido')}
<p>Tanque responsável por fornecer reposição rápida de água para o circuito de condensação do sistema de resfriamento, alimentando o sistema de CWP (Condenser Water Pumps) e torres de resfriamento.</p>
<p>Ele garante que o sistema hidráulico de condensação mantenha nível e volume adequados de água, principalmente após:</p>
<ul>
  <li>Perdas por evaporação nas torres</li>
  <li>Purga do sistema (blowdown)</li>
  <li>Manutenção ou drenagem do circuito</li>
  <li>Partida inicial do sistema HVAC</li>
</ul>
`,
        },
        {
          id: 'l5.14',
          title: 'AHU — Air Handling Unit',
          content: `
<h2>Equipamentos Mecânicos — AHU</h2>
${img('image98.jpeg', 'AHU - Air Handling Unit')}
<p>Equipamento responsável por tratar e movimentar grandes volumes de ar em sistemas HVAC, realizando <strong>filtragem, controle de temperatura, umidade e renovação de ar</strong>.</p>
${brands('Trane', 'Stulz', 'Carrier', 'Daikin')}
`,
        },
        {
          id: 'l5.15',
          title: 'CRAC — Computer Room Air Conditioner',
          content: `
<h2>Equipamentos Mecânicos — CRAC</h2>
${img('image99.png', 'CRAC - Computer Room Air Conditioner')}
<p>Sistema de climatização que realiza resfriamento direto do ar através de <strong>expansão direta (DX)</strong>, utilizando gás refrigerante. Indicado para ambientes de menor porte ou salas técnicas específicas.</p>
${brands('Vertiv (Liebert)', 'Stulz', 'Schneider Electric', 'Trane')}
`,
        },
        {
          id: 'l5.16',
          title: 'CRAH — Computer Room Air Handler',
          content: `
<h2>Equipamentos Mecânicos — CRAH</h2>
${img('image100.png', 'CRAH - Computer Room Air Handler')}
<p>O CRAH é um sistema de climatização de precisão que utiliza <strong>água gelada da CAG/CWP</strong> para remover o calor gerado pelos equipamentos de TI, garantindo controle térmico e circulação adequada de ar no Data Hall ou salas elétricas.</p>
${brands('Vertiv (Liebert)', 'Stulz', 'Schneider Electric', 'Johnson Controls')}
`,
        },
        {
          id: 'l5.17',
          title: 'Fanwall — Sistema de Ventiladores Modulares',
          content: `
<h2>Equipamentos Mecânicos — Fanwall (FW)</h2>
${img('image101.png', 'Fanwall')}
<p>O Fanwall é um sistema composto por múltiplos ventiladores modulares que trabalham em conjunto para movimentar grandes volumes de ar no Data Center, garantindo alta eficiência energética, redundância e melhor distribuição do ar climatizado. Utiliza também a água gelada da CAG.</p>
${brands('Vertiv (Liebert)', 'Schneider Electric', 'Stulz')}
`,
        },
        {
          id: 'l5.18',
          title: 'FCU — Fan Coil Unit',
          content: `
<h2>Equipamentos Mecânicos — FCU (Fancoil)</h2>
${img('image102.jpeg', 'FCU - Fan Coil Unit')}
<p>Equipamento de climatização que realiza o resfriamento ou aquecimento do ar através de uma serpentina alimentada por água gelada ou água quente, utilizando um ventilador para movimentação do ar.</p>
${brands('Trane', 'Carrier', 'Daikin', 'York')}
`,
        },
        {
          id: 'l5.19',
          title: 'Bomba de Água Potável',
          content: `
<h2>Equipamentos Mecânicos — Bombas de Água Potável</h2>
${img('image103.jpeg', 'Bomba de Água Potável')}
${img('image104.jpeg', 'Instalação Bomba Potável')}
<p>Equipamento responsável por pressurizar e distribuir água potável para consumo humano dentro da infraestrutura do Data Center. O sistema garante pressão e vazão adequadas para atender banheiros, copas, vestiários, áreas administrativas e sistemas de apoio predial.</p>
${brands('Grundfos', 'KSB', 'Wilo')}
`,
        },
        {
          id: 'l5.20',
          title: 'Sistema Vento Connect — Pressurização CWP',
          content: `
<h2>Equipamentos Mecânicos — Pressão (Vento Connect)</h2>
${img('image105.png', 'Sistema Vento Connect')}
<p>O sistema Vento Connect mantém a pressão estável e remove gases do circuito hidráulico, garantindo operação segura e eficiente das bombas e do sistema de resfriamento do Data Center.</p>
${brands('IMI Hydronic Engineering')}
`,
        },
        {
          id: 'l5.21',
          title: 'Tanque de Expansão',
          content: `
<h2>Equipamentos Mecânicos — Expansão</h2>
${img('image106.png', 'Tanque de Expansão')}
<p>O tanque de expansão absorve a variação de volume da água causada pelas mudanças de temperatura no sistema hidráulico, mantendo a pressão estável e protegendo o circuito de resfriamento do Data Center.</p>
${brands('IMI Hydronic Engineering', 'Reflex Winkelmann', 'Flamco')}
`,
        },
        {
          id: 'l5.22',
          title: 'Válvula de Bypass',
          content: `
<h2>Equipamentos Mecânicos — Bypass</h2>
${img('image107.png', 'Válvula de Bypass')}
<p>Válvula responsável por controlar ou desviar o fluxo de água dentro do anel hidráulico do sistema de água gelada, permitindo manter vazão mínima e estabilidade hidráulica no sistema.</p>
<p>No Data Center, essa válvula garante que o circuito de água continue operando de forma segura mesmo quando parte das cargas térmicas (CRAH, AHU ou Fanwall) está fechada.</p>
${brands('Belimo', 'Honeywell', 'Johnson Controls', 'Siemens')}
`,
        },
        {
          id: 'l5.23',
          title: 'Pontos Críticos Mecânicos',
          content: `
<h2>Pontos Críticos Mecânicos</h2>
<ul>
  <li>Perda de circulação de água gelada</li>
  <li>Pressão fora dos limites mínimo e máximo</li>
  <li>Falha de bombas de resfriamento</li>
  <li>Falha de ventilação ou distribuição de ar</li>
  <li>Perda de eficiência térmica da planta</li>
  <li>Falha de controle ou automação do HVAC</li>
</ul>
${bq('Toda intervenção no sistema mecânico deve ter análise de impacto térmico antes de ser executada. A perda de circulação de água gelada pode comprometer toda a infraestrutura de TI em minutos.')}
`,
        },
      ],
    },

    // ─── MÓDULO 6 ────────────────────────────────────────────────────────────
    {
      id: 'm6',
      title: 'Módulo 6 — Sistema Diesel',
      lessons: [
        {
          id: 'l6.1',
          title: 'Tanque de Diesel Principal',
          content: `
<h2>Sistema Diesel — Tanque Principal (TQP)</h2>
${img('image108.png', 'Tanque de Diesel Principal')}
<p>Reservatório (soterrado ou não) de grande capacidade responsável por armazenar o combustível diesel utilizado pelos geradores do Data Center, garantindo autonomia operacional em caso de falha da concessionária. O tanque principal abastece os <strong>tanques diários (daily tanks)</strong> dos geradores por meio de um sistema de transferência com bombas e linhas de combustível.</p>
${brands('Caterpillar', 'Cummins', 'Franklin Electric', 'Fill-Rite')}
`,
        },
        {
          id: 'l6.2',
          title: 'Tanque de Diesel Diário',
          content: `
<h2>Sistema Diesel — Tanque Diário (TD)</h2>
${img('image109.png', 'Tanque Diário')}
${img('image110.jpeg', 'Tanque acoplado sob gerador')}
${img('image111.jpeg', 'Tanque segregado - tipo 1')}
${img('image112.jpeg', 'Tanque segregado - tipo 2')}
<p>O tanque de diesel diário armazena combustível próximo ao gerador e garante alimentação contínua do motor, sendo automaticamente abastecido pelo tanque principal para manter a operação do sistema de geração em ambientes de missão crítica.</p>
<p>Pode ser instalado de duas formas:</p>
<ul>
  <li><strong>Acoplado sob o gerador</strong></li>
  <li><strong>Tanque segregado</strong></li>
</ul>
`,
        },
        {
          id: 'l6.3',
          title: 'Sistema de Recirculação de Diesel',
          content: `
<h2>Sistema Diesel — Recirculação</h2>
${img('image113.png', 'Sistema de Recirculação de Diesel')}
<p>O sistema de recirculação de diesel mantém o combustível armazenado nos tanques limpo e livre de contaminantes, através de <strong>filtragem e separação de água</strong>, garantindo confiabilidade e operação segura dos geradores em Data Centers de missão crítica.</p>
${brands('Parker Hannifin', 'Alfa Laval', 'Donaldson Company', 'Cim-Tek Filtration')}
`,
        },
      ],
    },

    // ─── MÓDULO 7 ────────────────────────────────────────────────────────────
    {
      id: 'm7',
      title: 'Módulo 7 — SDAI: Sistema de Detecção e Alarme de Incêndio',
      lessons: [
        {
          id: 'l7.1',
          title: 'Central de Alarme de Incêndio',
          content: `
<h2>SDAI — Central de Alarme de Incêndio</h2>
${img('image114.jpeg', 'Central de Alarme de Incêndio')}
<p>A central de alarme de incêndio monitora todos os dispositivos de detecção do sistema de proteção contra incêndio e coordena o acionamento de alarmes e sistemas de combate, garantindo resposta rápida e segura em caso de emergência no Data Center. Utilizada normalmente a central <strong>NFS2-3030</strong>.</p>
${brands('Honeywell', 'Siemens', 'Johnson Controls', 'Bosch')}
`,
        },
        {
          id: 'l7.2',
          title: 'INS — Sistema de Geração de Nitrogênio',
          content: `
<h2>SDAI — INS (Inert Nitrogen System)</h2>
${img('image115.png', 'Sistema INS - Nitrogênio')}
<p>O sistema de geração de nitrogênio (INS) produz nitrogênio a partir do ar atmosférico para pressurizar sistemas de combate a incêndio do tipo <strong>Dry Pipe</strong> e <strong>Pre-Action</strong>, reduzindo corrosão nas tubulações e aumentando a confiabilidade da infraestrutura de proteção contra incêndio.</p>
${brands('Potter', 'Parker Hannifin', 'Atlas Copco', 'Ingersoll Rand', 'Generon')}
`,
        },
        {
          id: 'l7.3',
          title: 'Compressor de Ar — Rede Seca',
          content: `
<h2>SDAI — Compressor de Ar (Dry Pipe / Pre-Action)</h2>
${img('image116.jpeg', 'Compressor de Ar')}
${img('image117.png', 'Painel de controle compressor')}
${img('image118.png', 'Diagrama compressor')}
<p>O compressor de ar do sistema de rede seca mantém as tubulações dos sistemas Dry Pipe e Pre-Action pressurizadas com ar, garantindo que a válvula principal permaneça fechada até a ativação de um sprinkler, permitindo a liberação controlada de água em caso de incêndio.</p>
${brands('Atlas Copco', 'Ingersoll Rand', 'Kaeser Kompressoren', 'Sullair')}
`,
        },
        {
          id: 'l7.4',
          title: 'VESDA — Detecção de Fumaça por Aspiração',
          content: `
<h2>SDAI — VESDA</h2>
${img('image119.jpeg', 'VESDA detector')}
${img('image120.jpeg', 'VESDA instalado')}
<p>O sistema VESDA é um sistema de detecção de fumaça por aspiração de <strong>alta sensibilidade</strong> que permite identificar incêndios em estágio inicial, oferecendo resposta precoce e maior proteção para ambientes críticos como Data Centers.</p>
${brands('Honeywell', 'Siemens', 'Johnson Controls', 'Bosch')}
`,
        },
        {
          id: 'l7.5',
          title: 'Acionador Manual de Incêndio',
          content: `
<h2>SDAI — Acionador Manual (AM)</h2>
${img('image121.png', 'Acionador Manual de Incêndio')}
<p>O acionador manual de incêndio permite que qualquer pessoa ative manualmente o sistema de alarme em caso de emergência, enviando um sinal imediato para a central de incêndio e iniciando os protocolos de resposta e evacuação do ambiente.</p>
${brands('Honeywell', 'Siemens', 'Johnson Controls', 'Bosch')}
`,
        },
        {
          id: 'l7.6',
          title: 'Detector de Fumaça',
          content: `
<h2>SDAI — Detector de Fumaça (DF)</h2>
${img('image122.jpeg', 'Detector de Fumaça')}
${img('image123.jpeg', 'Detector instalado')}
<p>O detector de fumaça é responsável por identificar a presença de partículas de fumaça no ambiente e enviar um sinal à central de incêndio, permitindo a detecção precoce de incêndios e a ativação rápida dos sistemas de resposta em Data Centers.</p>
${brands('Honeywell', 'Siemens', 'Johnson Controls', 'Intelbras')}
`,
        },
        {
          id: 'l7.7',
          title: 'Detector Multicritério',
          content: `
<h2>SDAI — Detector Multicritério</h2>
${img('image124.png', 'Detector Multicritério')}
${img('image125.jpeg', 'Detector Multicritério instalado')}
<p>O detector multicritério utiliza múltiplos sensores para analisar simultaneamente sinais de <strong>fumaça, temperatura e outros parâmetros</strong>, proporcionando detecção de incêndio mais confiável e reduzindo falsos alarmes em ambientes críticos como Data Centers.</p>
${brands('Honeywell', 'Siemens', 'Johnson Controls', 'Intelbras')}
`,
        },
        {
          id: 'l7.8',
          title: 'Módulo Monitor',
          content: `
<h2>SDAI — Módulo Monitor (MM)</h2>
${img('image126.png', 'Módulo Monitor')}
<p>O módulo monitor permite integrar dispositivos externos ao sistema de alarme de incêndio, monitorando mudanças de estado em contatos elétricos e transmitindo essas informações para a central de incêndio para processamento e acionamento das respostas do sistema.</p>
${brands('Honeywell', 'Siemens', 'Johnson Controls', 'Bosch')}
`,
        },
        {
          id: 'l7.9',
          title: 'Módulo Relé',
          content: `
<h2>SDAI — Módulo Relé (MR)</h2>
${img('image127.png', 'Módulo Relé')}
<p>O módulo relé do sistema SDAI permite que a central de alarme de incêndio acione automaticamente equipamentos e sistemas externos, executando comandos de segurança como <strong>ativação de sistemas de supressão, desligamento de ventilação ou acionamento de alarmes</strong> em caso de incêndio.</p>
${brands('Honeywell', 'Siemens', 'Johnson Controls', 'Bosch')}
`,
        },
        {
          id: 'l7.10',
          title: 'Sistema Dry Pipe',
          content: `
<h2>SDAI — Sistema Dry Pipe</h2>
${img('image128.png', 'Sistema Dry Pipe')}
<p>O sistema Dry Pipe é um sistema de sprinklers onde as tubulações permanecem pressurizadas com ar ou nitrogênio, liberando água apenas quando ocorre ativação de um sprinkler, sendo utilizado em áreas onde a presença constante de água nas tubulações não é desejada ou pode causar congelamento.</p>
${brands('Victaulic', 'Tyco Fire Protection', 'Viking Group', 'Reliable Automatic Sprinkler')}
`,
        },
        {
          id: 'l7.11',
          title: 'VGA — Válvula de Governo e Alarme',
          content: `
<h2>SDAI — VGA (Alarm Check Valve)</h2>
${img('image129.png', 'VGA - Válvula de Governo e Alarme')}
${img('image130.png', 'VGA - detalhe')}
${img('image131.png', 'VGA - instalação')}
${img('image132.png', 'VGA - diagrama 1')}
${img('image133.png', 'VGA - diagrama 2')}
${img('image134.png', 'VGA - diagrama 3')}
${img('image135.png', 'VGA - configuração')}
${img('image136.png', 'VGA - componentes')}
${img('image137.png', 'VGA - montagem')}
<p>A válvula de governo e alarme (VGA) controla o fluxo de água nos sistemas de sprinklers do tipo <strong>Wet Pipe</strong> e aciona alarmes quando ocorre descarga de água devido à ativação de um sprinkler, garantindo resposta automática ao incêndio.</p>
${brands('Victaulic', 'Tyco Fire Protection', 'Viking Group', 'Reliable Automatic Sprinkler')}
`,
        },
        {
          id: 'l7.12',
          title: 'VPA — Válvula de Pré-Ação',
          content: `
<h2>SDAI — VPA (Pre-Action Valve)</h2>
${img('image138.png', 'VPA - Válvula de Pré-Ação')}
${img('image139.png', 'VPA - detalhe')}
${img('image140.png', 'VPA - instalação')}
${img('image141.png', 'VPA - diagrama 1')}
${img('image142.png', 'VPA - diagrama 2')}
${img('image143.png', 'VPA - diagrama 3')}
${img('image144.png', 'VPA - componentes')}
${img('image145.png', 'VPA - configuração')}
${img('image146.png', 'VPA - montagem')}
<p>A VPA é a válvula principal do sistema de sprinklers de <strong>pré-ação</strong>, utilizada em ambientes críticos para evitar descargas acidentais de água, liberando o fluxo apenas após confirmação de incêndio pelo sistema de detecção e/ou abertura de sprinklers.</p>
${brands('Victaulic', 'Tyco Fire Protection', 'Viking Group', 'Reliable Automatic Sprinkler')}
`,
        },
        {
          id: 'l7.13',
          title: 'Bomba Jockey',
          content: `
<h2>SDAI — Bomba Jockey</h2>
${img('image147.jpeg', 'Bomba Jockey')}
${img('image148.png', 'Diagrama Bomba Jockey')}
<p>A bomba jockey mantém a pressão constante na rede de combate a incêndio, compensando pequenas perdas de pressão e <strong>evitando o acionamento desnecessário das bombas principais</strong> do sistema.</p>
${brands('Grundfos', 'KSB', 'Wilo')}
`,
        },
        {
          id: 'l7.14',
          title: 'Bomba Principal de Incêndio',
          content: `
<h2>SDAI — Bomba Principal</h2>
${img('image149.jpeg', 'Bomba Principal')}
${img('image150.png', 'Diagrama Bomba Principal')}
<p>A bomba principal do sistema de combate a incêndio fornece a vazão e pressão necessárias de água para os sistemas de hidrantes e sprinklers quando ocorre uma demanda real de combate a incêndio no Data Center. A bomba principal pode ser <strong>elétrica ou a diesel</strong>.</p>
${brands('Grundfos', 'KSB', 'Wilo')}
`,
        },
        {
          id: 'l7.15',
          title: 'Sistema de Sprinklers',
          content: `
<h2>SDAI — Sprinklers</h2>
${img('image151.png', 'Sprinklers')}
${img('image152.png', 'Tipos de Sprinklers')}
${img('image153.gif', 'Funcionamento Sprinkler')}
<p>O sistema de sprinklers é um sistema automático de combate a incêndio que libera água quando detecta altas temperaturas, atuando diretamente sobre o foco do incêndio para controlar ou extinguir o fogo de forma rápida e eficaz. Os sprinklers podem ser instalados em diferentes configurações — como <strong>upright, pendent, sidewall</strong> ou com conexão flexível — dependendo da arquitetura do ambiente, garantindo distribuição eficiente da água no combate a incêndios.</p>
`,
        },
        {
          id: 'l7.16',
          title: 'Sistema de Hidrantes',
          content: `
<h2>SDAI — Hidrantes</h2>
${img('image154.jpeg', 'Sistema de Hidrantes')}
${img('image155.png', 'Hidrante instalado')}
<p>O sistema de hidrantes fornece pontos de combate manual ao incêndio através de mangueiras conectadas à rede pressurizada de água, permitindo atuação rápida de brigadas de incêndio em áreas do Data Center e instalações adjacentes.</p>
${brands('Tyco Fire Protection', 'Viking Group', 'Victaulic', 'Akron Brass')}
`,
        },
        {
          id: 'l7.17',
          title: 'Sistema FM-200 — Agente Limpo',
          content: `
<h2>SDAI — FM-200 (Agente Limpo)</h2>
${img('image156.png', 'Sistema FM-200')}
<p>O sistema FM-200 é um sistema de combate a incêndio por agente limpo que extingue incêndios rapidamente <strong>sem danificar equipamentos eletrônicos</strong>, sendo amplamente utilizado em Data Centers para proteger áreas críticas como salas de TI, UPS e telecomunicações.</p>
${brands('Kidde', 'Ansul', 'Siemens', 'Johnson Controls', 'Honeywell')}
`,
        },
        {
          id: 'l7.18',
          title: 'Matriz Causa x Efeito — SDAI + Automação',
          content: `
<h2>SDAI + Automação — Matriz Causa x Efeito</h2>
${img('image157.png', 'Matriz Causa x Efeito SDAI')}
<p>A Matriz Causa x Efeito documenta todas as relações entre detecção de eventos (causas) e as ações automáticas do sistema (efeitos), sendo fundamental para elaboração de MOPs que envolvam o SDAI.</p>
<p>Acesse a planilha de referência: ${link('https://conatusprocedures.sharepoint.com/:x:/s/Biblioteca/IQAyGRw85i4IQYn6aDAOuBw0AZ_ic-GxlrtEj6NDdQe-AxI?e=uLfwfo', 'Matriz Causa x Efeito — SharePoint Conatus')}</p>
`,
        },
      ],
    },

    // ─── MÓDULO 8 ────────────────────────────────────────────────────────────
    {
      id: 'm8',
      title: 'Módulo 8 — BMS, EPMS e Infraestrutura',
      lessons: [
        {
          id: 'l8.1',
          title: 'BMS — Building Management System',
          content: `
<h2>Sistema de Gerenciamento — BMS</h2>
${img('image159.jpeg', 'BMS - Building Management System')}
<p>Sistema de automação que monitora e integra elétrica, mecânica, SDAI e infraestrutura predial. Permite supervisão, alarmes, histórico de eventos e integração entre sistemas.</p>
${brands('Schneider Electric (EcoStruxure)', 'Honeywell', 'Johnson Controls', 'Siemens')}
`,
        },
        {
          id: 'l8.2',
          title: 'EPMS — Electrical Power Monitoring System',
          content: `
<h2>Sistema de Monitoramento — EPMS</h2>
${img('image160.png', 'EPMS - Electrical Power Monitoring System')}
<p>O EPMS é o sistema responsável por monitorar e registrar os parâmetros elétricos da infraestrutura do Data Center em tempo real, permitindo análise de desempenho, <strong>gestão energética (PUE)</strong> e aumento da confiabilidade do sistema elétrico.</p>
${brands('Schneider Electric', 'ABB')}
`,
        },
        {
          id: 'l8.3',
          title: 'Piso Elevado',
          content: `
<h2>Infraestrutura — Piso Elevado</h2>
${img('image161.jpeg', 'Piso Elevado')}
${img('image162.jpeg', 'Estrutura Piso Elevado')}
<p>Estrutura modular instalada acima do piso estrutural do Data Center (Data hall e/ou corredores técnicos), criando um espaço técnico inferior (<strong>plenum</strong>) utilizado para distribuição de ar frio, cabos e infraestrutura elétrica. O piso elevado permite melhor organização da infraestrutura e contribui para a eficiência do sistema de climatização do Data Hall.</p>
`,
        },
        {
          id: 'l8.4',
          title: 'Enclausuramento de Corredores',
          content: `
<h2>Infraestrutura — Enclausuramento (Contenção Quente e Fria)</h2>
${img('image163.png', 'Enclausuramento de Corredores')}
${img('image164.jpeg', 'Contenção Quente')}
${img('image165.png', 'Contenção Fria')}
<p>O sistema de enclausuramento de corredores separa o fluxo de ar frio e quente no Data Hall, aumentando a eficiência do sistema de resfriamento e garantindo melhor controle térmico da infraestrutura do Data Center.</p>
`,
        },
        {
          id: 'l8.5',
          title: 'Whips — Alimentação Elétrica dos Racks',
          content: `
<h2>Infraestrutura — Whips</h2>
${img('image166.jpeg', 'Whips - cabos de alimentação')}
${img('image81.png', 'Alimentação por Whips')}
<p>Os whips são cabos de alimentação elétrica utilizados para conectar painéis de distribuição ou busways às PDUs dos racks de TI, fornecendo energia <strong>trifásica ou monofásica</strong> para os equipamentos do Data Center.</p>
`,
        },
        {
          id: 'l8.6',
          title: 'Rack de TI',
          content: `
<h2>Infraestrutura — Rack TI</h2>
${img('image167.png', 'Rack de TI')}
${img('image168.png', 'Organização de racks')}
<p>Estrutura metálica padronizada utilizada para instalar, organizar e suportar equipamentos de tecnologia da informação, como servidores, switches, storages e equipamentos de rede. Os racks são projetados para permitir instalação modular, ventilação adequada e organização da infraestrutura de TI dentro do Data Hall.</p>
`,
        },
      ],
    },

    // ─── MÓDULO 9 ────────────────────────────────────────────────────────────
    {
      id: 'm9',
      title: 'Módulo 9 — Tipos de Procedimentos',
      lessons: [
        {
          id: 'l9.1',
          title: 'O que é MOP?',
          content: `
<h2>O que é MOP?</h2>
<p><strong>Method of Procedure</strong> (Método de Procedimento)</p>
<ul>
  <li>Manutenção planejada</li>
  <li>Risco controlado</li>
  <li>Sequência estruturada</li>
  <li>Inclui plano de rollback</li>
  <li>Inclui SOP</li>
  <li>Pode incluir EOP</li>
  <li>Necessita validação prévia</li>
</ul>
${bq('O MOP é o documento que define como uma atividade de risco será executada em um ambiente crítico, garantindo segurança, rastreabilidade e reversibilidade.')}
`,
        },
        {
          id: 'l9.2',
          title: 'O que é SOP?',
          content: `
<h2>O que é SOP?</h2>
<p><strong>Standard Operating Procedure</strong> (Procedimento de Operação Padrão)</p>
<ul>
  <li>Operação padrão</li>
  <li>Atividade recorrente</li>
  <li>Inclui plano de rollback</li>
  <li>Processo estável</li>
  <li>Define parâmetros e limites</li>
</ul>
${bq('O SOP documenta operações rotineiras e recorrentes, estabelecendo parâmetros claros e limites operacionais para que qualquer operador qualificado possa executar a atividade com segurança.')}
`,
        },
        {
          id: 'l9.3',
          title: 'O que é EOP?',
          content: `
<h2>O que é EOP?</h2>
<p><strong>Emergency Operating Procedure</strong> (Procedimento de Operação Emergencial)</p>
<ul>
  <li>Evento inesperado</li>
  <li>Resposta rápida</li>
  <li>Alta criticidade</li>
  <li>Priorização de ações</li>
  <li>Comunicação emergencial</li>
  <li><strong>Sem rollback</strong></li>
</ul>
${bq('No EOP, não há rollback porque a situação de emergência exige ação imediata. O objetivo é estabilizar o ambiente, não reverter para um estado anterior.')}
`,
        },
        {
          id: 'l9.4',
          title: 'O que é Dry Run?',
          content: `
<h2>O que é Dry Run?</h2>
<p>O Dry Run é a simulação ou ensaio do procedimento antes de sua execução real no ambiente crítico. Permite que a equipe:</p>
<ul>
  <li>Valide cada passo do procedimento</li>
  <li>Identifique divergências entre o documento e o campo</li>
  <li>Treine os executores sem risco operacional</li>
  <li>Confirme a sequência de ações e os pontos de rollback</li>
</ul>
${bq('Nenhum MOP de alto risco deve ser executado sem Dry Run previamente realizado e validado pela equipe técnica responsável.')}
`,
        },
        {
          id: 'l9.5',
          title: 'Plano de Rollback',
          content: `
<h2>Plano de Rollback</h2>
<p>Todo MOP deve responder:</p>
<ul>
  <li>Como voltar ao estado anterior?</li>
  <li>Em que momento abortar?</li>
  <li>Quem autoriza o retorno?</li>
</ul>
${bq('Sem rollback definido = procedimento incompleto. Um MOP sem plano de rollback não pode ser aprovado pela Conatus.')}
`,
        },
        {
          id: 'l9.6',
          title: 'Análise de Risco',
          content: `
<h2>Análise de Risco</h2>
<p>Responder sempre:</p>
<ul>
  <li>O que pode dar errado?</li>
  <li>Qual o impacto?</li>
  <li>Existe efeito cascata?</li>
  <li>Como retornar ao estado seguro?</li>
</ul>
${bq('A análise de risco não é uma formalidade. É a etapa que diferencia um operador técnico de um executor mecânico. Todo risco identificado deve ser mitigado ou documentado como risco aceito.')}
`,
        },
        {
          id: 'l9.7',
          title: 'Quais EPIs Utilizar?',
          content: `
<h2>EPIs em Ambientes Críticos</h2>
<p>A seleção correta dos EPIs deve ser definida no procedimento antes de qualquer atividade. Os principais EPIs em Data Centers incluem:</p>
<ul>
  <li><strong>Elétrico:</strong> Luvas isolantes, capacete com proteção facial, calçado isolante, vestimenta para arco elétrico (CAT 2 ou superior conforme análise)</li>
  <li><strong>Mecânico:</strong> Luvas de proteção mecânica, óculos de segurança, calçado de segurança</li>
  <li><strong>Geral:</strong> EPI conforme PPRA/PGR e NR-10 (para trabalhos elétricos)</li>
</ul>
${bq('O EPI não substitui o procedimento seguro — ele é a última barreira de proteção. O procedimento correto é a primeira.')}
`,
        },
      ],
    },

    // ─── MÓDULO 10 ───────────────────────────────────────────────────────────
    {
      id: 'm10',
      title: 'Módulo 10 — Estrutura Padrão e Documentação',
      lessons: [
        {
          id: 'l10.1',
          title: 'Consulta de Documentação',
          content: `
<h2>Consulta de Documentação</h2>
<p>Antes de escrever qualquer procedimento:</p>
<ul>
  <li>Validar versão do desenho</li>
  <li>Conferir data da revisão</li>
  <li>Confirmar TAG em campo</li>
  <li>Conferir divergências</li>
</ul>
<p><strong>Documentação colaborativa:</strong> SharePoint</p>
${bq('Nunca elabore um procedimento baseado em documentação desatualizada. A divergência entre projeto e campo é uma das principais causas de erros em MOPs.')}
`,
        },
        {
          id: 'l10.2',
          title: 'Estrutura Padrão Conatus — Parte 1',
          content: `
<h2>Estrutura Padrão Conatus — Parte 1</h2>
<p>Todo procedimento deve conter:</p>
<ul>
  <li>Informações do documento</li>
  <li>Classificação de risco (MOP)</li>
  <li>Preenchimento de Dry Run</li>
  <li>Aprovação interna de acordo com a classificação de riscos</li>
  <li>Análise de permissão para trabalho</li>
  <li>Duração da atividade</li>
  <li>Escopo (O que é a atividade, Por quê a atividade e Descrição da atividade)</li>
  <li>Análise de riscos envolvidos de acordo com a infraestrutura</li>
</ul>
`,
        },
        {
          id: 'l10.3',
          title: 'Estrutura Padrão Conatus — Parte 2',
          content: `
<h2>Estrutura Padrão Conatus — Parte 2</h2>
<ul>
  <li>Informações do fornecedor para os casos aplicáveis</li>
  <li>Informação da equipe que vai participar da atividade</li>
  <li>Lista de escalonamento atualizada</li>
  <li>Alarmes esperados</li>
  <li>Redundância de projeto, durante a atividade e sistema afetado</li>
  <li>Equipamentos envolvidos nas atividades que sofrerão algum tipo de alteração</li>
  <li>Documentação técnica relacionada</li>
  <li>Instrumentos calibráveis relacionados</li>
</ul>
`,
        },
        {
          id: 'l10.4',
          title: 'Estrutura Padrão Conatus — Parte 3',
          content: `
<h2>Estrutura Padrão Conatus — Parte 3</h2>
<ul>
  <li>Etapas de pré-trabalho</li>
  <li>Etapas Principais</li>
  <li>Etapas de validação</li>
  <li>Passos de Rollback</li>
  <li>Anotações importantes</li>
  <li>Comentários</li>
  <li>Lista de Acrônimos</li>
  <li>Preenchimento de revisão interna</li>
</ul>
`,
        },
        {
          id: 'l10.5',
          title: 'Simbologia',
          content: `
<h2>Simbologia</h2>
<p>A simbologia padronizada da Conatus é utilizada nos diagramas e procedimentos para representar o estado dos equipamentos e ações a serem executadas. Consulte o documento de simbologia atualizado no SharePoint para a versão mais recente.</p>
${bq('Utilize sempre a simbologia correta. Símbolos incorretos ou fora do padrão são causa de reprovação no checklist de qualidade (QA).')}
`,
        },
        {
          id: 'l10.6',
          title: 'Formatação das Colunas',
          content: `
<h2>Estrutura Padrão — Colunas do Procedimento</h2>
<ul>
  <li>Coluna com <strong>checkbox</strong></li>
  <li>Coluna <strong>sequência numérica</strong></li>
  <li>Coluna <strong>localização</strong></li>
  <li>Coluna <strong>equipamento</strong></li>
  <li>Coluna <strong>Descrição dos passos</strong></li>
  <li>Coluna <strong>responsável</strong></li>
  <li>Coluna <strong>executor</strong></li>
  <li>Formatação padrão Conatus</li>
</ul>
`,
        },
        {
          id: 'l10.7',
          title: 'Identificação Correta do Documento',
          content: `
<h2>Identificação Correta</h2>
<p>Todo procedimento deve conter no cabeçalho:</p>
<ul>
  <li>Tipo de documento</li>
  <li>Código do documento</li>
  <li>Data da última revisão</li>
  <li>Sistema envolvido</li>
  <li>TAG do equipamento</li>
  <li>Site / País</li>
  <li>Revisão</li>
  <li>Classificação</li>
  <li>Rodapé</li>
</ul>
`,
        },
        {
          id: 'l10.8',
          title: 'Referências Técnicas',
          content: `
<h2>Referências Técnicas</h2>
<p>Sempre incluir no procedimento:</p>
<ul>
  <li>Desenho unifilar</li>
  <li>Layout atualizado</li>
  <li>As-built</li>
  <li>Manual do fabricante</li>
  <li>Normas aplicáveis</li>
</ul>
${bq('Nunca assumir informação não validada. Se a referência não existe ou não está atualizada, registre a divergência antes de prosseguir.')}
`,
        },
        {
          id: 'l10.9',
          title: 'Campo x Projeto',
          content: `
<h2>Campo x Projeto</h2>
<p>Sempre validar:</p>
<ul>
  <li>TAG real</li>
  <li>Localização física</li>
  <li>Interligações</li>
  <li>Condição atual do equipamento</li>
</ul>
${bq('Projeto nem sempre reflete realidade atual. Modificações de campo, emergências passadas e ampliações não documentadas são comuns em Data Centers com histórico longo de operação.')}
`,
        },
        {
          id: 'l10.10',
          title: 'Erros Comuns',
          content: `
<h2>Erros Comuns em Procedimentos</h2>
<ul>
  <li>TAG incorreto</li>
  <li>Ausência de rollback</li>
  <li>Ausência de documentos</li>
  <li>Ausência de valor de referência</li>
  <li>Passos fora de ordem</li>
  <li>Falta de análise de impacto</li>
  <li>Formatação incorreta</li>
  <li>Textos em diferentes idiomas</li>
</ul>
${bq('Qualquer um desses erros pode resultar na reprovação do documento no processo de QA ou — pior — em um incidente operacional durante a execução.')}
`,
        },
        {
          id: 'l10.11',
          title: 'Checklist de Qualidade (QA)',
          content: `
<h2>Checklist de Qualidade — QA</h2>
<p>Nenhum documento sobe para revisão sem:</p>
<ul>
  <li>Estrutura validada</li>
  <li>Referências citadas</li>
  <li>Risco descrito</li>
  <li>Rollback definido</li>
  <li>Sistemas impactados identificados</li>
  <li>Pontuação, gramática e simbologia corretas</li>
  <li>Formatação e tradução conferidas</li>
</ul>
${bq('O QA protege o cliente, a operação e o autor do procedimento. Um documento que passa pelo QA é um documento em que a equipe confia.')}
`,
        },
      ],
    },

    // ─── MÓDULO 11 ───────────────────────────────────────────────────────────
    {
      id: 'm11',
      title: 'Módulo 11 — Simulações Práticas',
      lessons: [
        {
          id: 'l11.1',
          title: 'Simulação 1 — Perda de UPS Principal',
          content: `
<h2>Simulação 1 — Perda de UPS Principal</h2>
<p>Cenário: <strong>Perda de UPS principal</strong></p>
<p>Perguntas para análise:</p>
<ul>
  <li>Qual a primeira ação?</li>
  <li>Existe redundância disponível?</li>
  <li>Há impacto térmico indireto?</li>
</ul>
${bq('Em um sistema N (sem redundância), a perda da UPS implica perda imediata de carga. O procedimento deve prever a comunicação emergencial e o acionamento do EOP correspondente.')}
`,
        },
        {
          id: 'l11.2',
          title: 'Simulação 1 — N: Falha de UPS',
          content: `
<h2>Redundância N — Falha de UPS</h2>
${img('image13.png', 'Diagrama N - Falha de UPS')}
<p>No sistema N sem redundância: a falha da única UPS disponível resulta em perda total de carga. Não há caminho alternativo de alimentação.</p>
<p><strong>Impacto:</strong> 0 kW para todos os racks. Ativação de EOP imediata.</p>
`,
        },
        {
          id: 'l11.3',
          title: 'Simulação 1 — N+1: Falha de UPS',
          content: `
<h2>Redundância N+1 — Falha de UPS</h2>
${img('image22.png', 'Diagrama N+1 - Falha de UPS')}
<p>No sistema N+1: a falha da UPS-2 é absorvida pela UPS-1, que assume 100% da carga (80 kW). O sistema continua operando, mas agora está em modo N (sem redundância).</p>
<p><strong>Ação obrigatória:</strong> Iniciar procedimento de manutenção ou troca da UPS com falha antes que uma segunda falha ocorra.</p>
`,
        },
        {
          id: 'l11.4',
          title: 'Simulação 1 — 2N: Falha de UPS',
          content: `
<h2>Redundância 2N — Falha de UPS</h2>
${img('image23.png', 'Diagrama 2N - Falha de UPS')}
<p>No sistema 2N: a falha da UPS-B é absorvida pela UPS-A. O RPP-B (normalmente 80 kW) tem sua carga redistribuída para o RPP-A (agora 160 kW). Os racks com dual power supply continuam alimentados pelo caminho A.</p>
<p><strong>Ponto de atenção:</strong> Verificar se a UPS-A tem capacidade para suportar 100% da carga total.</p>
`,
        },
        {
          id: 'l11.5',
          title: 'Simulação 1 — 2N+1: Falha de UPS',
          content: `
<h2>Redundância 2N+1 — Falha de UPS</h2>
${img('image27.png', 'Diagrama 2N+1 - Falha de UPS')}
<p>No sistema 2N+1: a falha de uma UPS do grupo B é absorvida pela UPS redundante do mesmo grupo. O sistema continua em modo 2N.</p>
<p><strong>Resultado:</strong> Sem impacto nas cargas. O sistema mantém operação normal com uma UPS a menos.</p>
`,
        },
        {
          id: 'l11.6',
          title: 'Simulação 2 — Falha de Alimentação da Concessionária',
          content: `
<h2>Simulação 2 — Falha de Alimentação da Concessionária</h2>
<p>Cenário: <strong>Falha de alimentação da concessionária (linha B)</strong></p>
<p>Análise:</p>
<ul>
  <li>Qual o impacto imediato?</li>
  <li>Os geradores entram automaticamente?</li>
  <li>Qual o tempo de transferência?</li>
  <li>As baterias têm autonomia suficiente para o período de transferência?</li>
</ul>
`,
        },
        {
          id: 'l11.7',
          title: 'Simulação 2 — Sistema 2N: Falha Utility B',
          content: `
<h2>Sistema Elétrico 2N — Falha de Utility B</h2>
${img('image170.png', 'Diagrama 2N - Falha Utility B')}
${img('image171.png', 'Diagrama detalhado 2N Falha Utility B')}
${img('image172.png', 'Fluxo de ação 2N Falha Utility B')}
${img('image173.png', 'Impacto 2N Falha Utility B')}
${img('image174.png', 'Retorno 2N Falha Utility B')}
<p>Em um sistema 2N com falha da linha B de concessionária: o caminho B passa a ser alimentado pelos geradores B após o período de transferência. O caminho A permanece inalterado com concessionária A.</p>
<p><strong>Período crítico:</strong> Entre a perda da utility B e a entrada do gerador B — neste intervalo, as baterias da UPS-B sustentam a carga.</p>
`,
        },
        {
          id: 'l11.8',
          title: 'Simulação 3 — Detecção de Gás em Sala de Baterias',
          content: `
<h2>Simulação 3 — Detecção de Gás em Sala de Baterias</h2>
<p>Cenário: <strong>Detecção de gás (H₂) em sala de baterias</strong></p>
<ul>
  <li>Acionamento imediato do alarme</li>
  <li>Isolamento de área</li>
  <li>Comunicação emergencial</li>
  <li>Critério de estabilização</li>
</ul>
${bq('Baterias VRLA podem emitir hidrogênio durante sobrecarga ou falha. A concentração de H₂ acima de 4% é explosiva. O EOP deve prever evacuação imediata, ventilação forçada e bloqueio de fontes de ignição.')}
`,
        },
      ],
    },

    // ─── MÓDULO 12 ───────────────────────────────────────────────────────────
    {
      id: 'm12',
      title: 'Módulo 12 — Fluxo de Aprovação e Cultura Conatus',
      lessons: [
        {
          id: 'l12.1',
          title: 'Fluxo de Aprovação Interno',
          content: `
<h2>Fluxo de Aprovação — Interno</h2>
<ol style="line-height:2.2;">
  <li><strong>Elaboração</strong></li>
  <li><strong>Autoavaliação (QA)</strong></li>
  <li><strong>Revisão do Coordenador / Engenheiro</strong></li>
  <li><strong>Ajustes</strong></li>
  <li><strong>Aprovação</strong></li>
  <li><strong>Cliente</strong></li>
</ol>
${bq('O fluxo interno garante que nenhum procedimento chegue ao cliente sem ter passado por pelo menos duas revisões técnicas dentro da Conatus.')}
`,
        },
        {
          id: 'l12.2',
          title: 'Fluxo de Aprovação Externo (Scala)',
          content: `
<h2>Fluxo de Aprovação — Externo (Scala)</h2>
<ol style="line-height:2.2;">
  <li>Pre Analysis</li>
  <li>Atribuição da MOP</li>
  <li>Elaboração da MOP</li>
  <li>Dry Run</li>
  <li>Revisão da Qualidade</li>
  <li>Análise de Risco</li>
  <li>Validação Interna</li>
  <li>Send to Client</li>
  <li>Validação do Cliente</li>
  <li>Fechado / Completo ou Cancelado</li>
</ol>
`,
        },
        {
          id: 'l12.3',
          title: 'O que define um Procedimento Sênior?',
          content: `
<h2>O que define um Procedimento Sênior?</h2>
<ul>
  <li>Clareza absoluta</li>
  <li>Nenhuma suposição implícita</li>
  <li>Integração entre sistemas</li>
  <li>Risco antecipado</li>
  <li>Linguagem objetiva</li>
  <li>Rollback sólido</li>
  <li>Simbologia correta</li>
</ul>
${bq('Um procedimento sênior pode ser executado por qualquer operador qualificado sem a necessidade de interpretar ou inferir qualquer passo. Cada ação deve ser inequívoca.')}
`,
        },
        {
          id: 'l12.4',
          title: 'Cultura Conatus',
          content: `
<h2>Cultura Conatus</h2>
<p><strong>Procedimento não é burocracia. É:</strong></p>
<ul>
  <li>Controle de risco</li>
  <li>Proteção operacional</li>
  <li>Segurança técnica</li>
  <li>Profissionalismo</li>
</ul>
${bq('"Em ambientes críticos, improviso gera falha. Procedimentos geram confiabilidade."')}
<p style="margin-top:32px;text-align:center;font-size:1.2rem;font-weight:700;color:var(--gold);">Parabéns por concluir o treinamento!</p>
<p style="text-align:center;">Você agora tem o conhecimento para elaborar procedimentos técnicos seguros, estruturados e alinhados com a excelência operacional da Conatus.</p>
`,
        },
      ],
    },
  ],
};
