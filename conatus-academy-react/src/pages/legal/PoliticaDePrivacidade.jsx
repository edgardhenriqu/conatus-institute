import { Link } from 'react-router-dom';
import { LegalPage } from '../../components/layout/LegalPage';
import { EMPRESA, ULTIMA_ATUALIZACAO } from './empresaInfo';

/**
 * Política de Privacidade (Aviso de Privacidade) da Conatus Institute.
 *
 * Elaborada em conformidade com a Lei Geral de Proteção de Dados
 * (Lei nº 13.709/2018 — LGPD). Os dados oficiais e o contato do Encarregado
 * vêm de `empresaInfo.js`.
 */
export function PoliticaDePrivacidade() {
  const sections = [
    {
      id: 'introducao',
      heading: '1. Introdução',
      content: (
        <>
          <p>
            A <strong>{EMPRESA.nome}</strong> ({EMPRESA.razaoSocial}, CNPJ nº {EMPRESA.cnpj}) leva a
            sério a privacidade e a proteção dos dados pessoais de seus usuários. Este Aviso de
            Privacidade descreve, de forma transparente, como coletamos, utilizamos, armazenamos,
            compartilhamos e protegemos os dados pessoais tratados no âmbito de nossa plataforma de
            educação em Data Centers e infraestrutura crítica.
          </p>
          <p>
            Este documento foi elaborado em conformidade com a{' '}
            <strong>Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 — LGPD)</strong> e
            com o Marco Civil da Internet (Lei nº 12.965/2014). Ele complementa nossos{' '}
            <Link to="/termos-de-servico">Termos de Serviço</Link> e aplica-se a todos os titulares
            de dados que interagem com a Plataforma — alunos, visitantes e demais usuários.
          </p>
          <p>
            Para os fins deste Aviso, a {EMPRESA.nome} atua como <strong>Controladora</strong> dos
            dados pessoais, ou seja, a quem competem as decisões sobre o tratamento realizado.
          </p>
        </>
      ),
    },
    {
      id: 'dados-coletados',
      heading: '2. Quais dados coletamos',
      content: (
        <>
          <p>Coletamos diferentes categorias de dados pessoais, conforme a interação do titular com a Plataforma:</p>
          <h3>2.1. Dados fornecidos pelo titular</h3>
          <ul>
            <li><strong>Dados cadastrais:</strong> nome completo, e-mail, CPF, data de nascimento, telefone;</li>
            <li><strong>Dados profissionais:</strong> empresa e cargo informados no cadastro;</li>
            <li><strong>Dados de endereço:</strong> CEP, logradouro, cidade e estado;</li>
            <li><strong>Dados de acesso:</strong> credenciais de login e senha (armazenada de forma criptografada);</li>
            <li><strong>Comunicações:</strong> mensagens e solicitações enviadas aos nossos canais de suporte.</li>
          </ul>
          <h3>2.2. Dados coletados automaticamente</h3>
          <ul>
            <li><strong>Dados de navegação e uso:</strong> páginas visitadas, cursos acessados, progresso, resultados de avaliações e certificados emitidos;</li>
            <li><strong>Dados técnicos:</strong> endereço IP, tipo de navegador, dispositivo, sistema operacional, data e hora de acesso e registros (logs) de aplicação;</li>
            <li><strong>Cookies e tecnologias similares:</strong> conforme descrito na seção específica sobre cookies.</li>
          </ul>
          <p>
            Não coletamos intencionalmente dados pessoais sensíveis. Solicitamos que o titular não
            insira informações dessa natureza em campos livres, salvo quando expressamente
            requerido e amparado por base legal adequada.
          </p>
        </>
      ),
    },
    {
      id: 'uso-dados',
      heading: '3. Como os dados são utilizados',
      content: (
        <>
          <p>Os dados pessoais são tratados para finalidades legítimas, específicas e informadas, entre as quais:</p>
          <ul>
            <li>Criar e gerenciar a conta do usuário e viabilizar o acesso à Plataforma;</li>
            <li>Realizar matrículas, disponibilizar cursos, registrar progresso e aplicar avaliações;</li>
            <li>Emitir, autenticar e validar certificados de conclusão;</li>
            <li>Prestar suporte, responder solicitações e comunicar informações relevantes sobre os serviços;</li>
            <li>Enviar comunicações administrativas, avisos de segurança e, mediante consentimento, conteúdos informativos e novidades;</li>
            <li>Aprimorar a Plataforma, personalizar a experiência e produzir estatísticas e métricas de uso;</li>
            <li>Prevenir fraudes, garantir a segurança e cumprir obrigações legais e regulatórias.</li>
          </ul>
          <p>
            Os dados não serão utilizados para finalidades incompatíveis com aquelas informadas no
            momento da coleta.
          </p>
        </>
      ),
    },
    {
      id: 'base-legal',
      heading: '4. Base legal do tratamento',
      content: (
        <>
          <p>
            Todo tratamento de dados realizado pela {EMPRESA.nome} está fundamentado em uma das
            bases legais previstas nos artigos 7º e 11 da LGPD, notadamente:
          </p>
          <ul>
            <li><strong>Execução de contrato</strong> (art. 7º, V): para disponibilizar os cursos, gerenciar matrículas e emitir certificados solicitados pelo titular;</li>
            <li><strong>Cumprimento de obrigação legal ou regulatória</strong> (art. 7º, II): para atender exigências fiscais, contábeis e legais;</li>
            <li><strong>Legítimo interesse</strong> (art. 7º, IX): para segurança, prevenção a fraudes, melhoria dos serviços e comunicações relacionadas, sempre respeitados os direitos e as expectativas do titular;</li>
            <li><strong>Consentimento</strong> (art. 7º, I): para o envio de comunicações de marketing e para o uso de cookies não essenciais, podendo ser revogado a qualquer momento;</li>
            <li><strong>Exercício regular de direitos</strong> (art. 7º, VI): em processos administrativos, judiciais ou arbitrais.</li>
          </ul>
        </>
      ),
    },
    {
      id: 'compartilhamento',
      heading: '5. Compartilhamento de dados',
      content: (
        <>
          <p>
            A {EMPRESA.nome} <strong>não comercializa</strong> dados pessoais. O compartilhamento
            ocorre apenas quando necessário e limitado às finalidades descritas, com as seguintes
            categorias de destinatários:
          </p>
          <ul>
            <li><strong>Operadores e prestadores de serviço:</strong> provedores de hospedagem, infraestrutura em nuvem, envio de e-mails, processamento de pagamentos e ferramentas de vídeo, que tratam os dados em nosso nome e sob instruções contratuais;</li>
            <li><strong>Empresas parceiras:</strong> quando o acesso a determinado curso decorrer de vínculo do titular com empresa parceira, limitado às informações estritamente necessárias à gestão da matrícula;</li>
            <li><strong>Autoridades públicas:</strong> para cumprimento de obrigação legal, regulatória ou ordem de autoridade competente;</li>
            <li><strong>Operações societárias:</strong> em caso de reestruturação, fusão ou aquisição, mediante a preservação das garantias deste Aviso.</li>
          </ul>
          <p>
            Eventuais transferências internacionais de dados — por exemplo, quando um prestador
            estiver sediado no exterior — observarão as salvaguardas exigidas pelos artigos 33 a 36
            da LGPD.
          </p>
        </>
      ),
    },
    {
      id: 'cookies',
      heading: '6. Cookies',
      content: (
        <>
          <p>
            Cookies são pequenos arquivos armazenados no dispositivo do usuário que permitem o
            funcionamento adequado da Plataforma e o aprimoramento da experiência. Utilizamos:
          </p>
          <ul>
            <li><strong>Cookies essenciais:</strong> indispensáveis à autenticação, à segurança e à navegação — sem eles a Plataforma não funciona corretamente;</li>
            <li><strong>Cookies de desempenho e análise:</strong> ajudam a compreender como a Plataforma é utilizada, permitindo melhorias contínuas;</li>
            <li><strong>Cookies de preferência:</strong> memorizam escolhas do usuário para personalizar a experiência.</li>
          </ul>
          <p>
            O titular pode gerenciar ou desativar cookies nas configurações de seu navegador. A
            desativação de cookies essenciais, contudo, pode comprometer funcionalidades da
            Plataforma. Cookies não essenciais somente são utilizados mediante consentimento.
          </p>
        </>
      ),
    },
    {
      id: 'armazenamento',
      heading: '7. Armazenamento das informações',
      content: (
        <>
          <p>
            Os dados pessoais são armazenados em ambientes controlados, em servidores e serviços de
            nuvem que adotam medidas técnicas e organizacionais de segurança. O acesso é restrito a
            colaboradores e operadores autorizados, sujeitos a deveres de confidencialidade.
          </p>
          <p>
            Quando o armazenamento ocorrer em provedores localizados fora do território nacional,
            adotaremos as garantias e salvaguardas exigidas pela LGPD para assegurar nível adequado
            de proteção aos dados dos titulares.
          </p>
        </>
      ),
    },
    {
      id: 'seguranca',
      heading: '8. Segurança dos dados',
      content: (
        <>
          <p>
            A {EMPRESA.nome} adota medidas de segurança técnicas e administrativas aptas a proteger
            os dados pessoais contra acessos não autorizados e situações acidentais ou ilícitas de
            destruição, perda, alteração, comunicação ou difusão, incluindo:
          </p>
          <ul>
            <li>Criptografia de senhas e uso de conexões seguras (HTTPS/TLS);</li>
            <li>Controles de acesso, autenticação e segregação de funções;</li>
            <li>Registros de auditoria (logs) e monitoramento de eventos de segurança;</li>
            <li>Políticas internas de proteção de dados e conscientização de colaboradores.</li>
          </ul>
          <p>
            Embora empreguemos as melhores práticas, nenhum sistema é totalmente imune a incidentes.
            Na hipótese de incidente de segurança que possa acarretar risco ou dano relevante aos
            titulares, comunicaremos os afetados e a Autoridade Nacional de Proteção de Dados (ANPD),
            nos termos da legislação.
          </p>
        </>
      ),
    },
    {
      id: 'direitos-titular',
      heading: '9. Direitos do titular (LGPD)',
      content: (
        <>
          <p>
            A LGPD assegura ao titular dos dados um conjunto de direitos, que podem ser exercidos
            gratuitamente e a qualquer momento mediante solicitação aos nossos canais. São eles:
          </p>
          <ul className="legal-cards">
            <li><strong>Confirmação e acesso</strong><span>Confirmar a existência de tratamento e acessar os dados que mantemos sobre você.</span></li>
            <li><strong>Correção</strong><span>Solicitar a correção de dados incompletos, inexatos ou desatualizados.</span></li>
            <li><strong>Anonimização ou bloqueio</strong><span>Requerer a anonimização, o bloqueio ou a eliminação de dados desnecessários ou tratados em desconformidade com a lei.</span></li>
            <li><strong>Eliminação</strong><span>Pedir a exclusão dos dados tratados com base no consentimento, ressalvadas as hipóteses de guarda legal.</span></li>
            <li><strong>Portabilidade</strong><span>Solicitar a portabilidade dos dados a outro fornecedor de serviço, observada a regulamentação.</span></li>
            <li><strong>Informação sobre compartilhamento</strong><span>Obter informação sobre as entidades públicas e privadas com as quais compartilhamos seus dados.</span></li>
            <li><strong>Revogação do consentimento</strong><span>Retirar, a qualquer tempo, o consentimento antes concedido, sem afetar tratamentos anteriores.</span></li>
            <li><strong>Oposição e revisão</strong><span>Opor-se a tratamentos realizados com base no legítimo interesse e solicitar revisão de decisões automatizadas.</span></li>
          </ul>
          <p>
            Para exercer seus direitos, entre em contato com nosso Encarregado pelos canais
            indicados na seção &ldquo;Contato do Encarregado&rdquo;. Poderemos solicitar informações
            adicionais para confirmar sua identidade e garantir a segurança do atendimento.
          </p>
        </>
      ),
    },
    {
      id: 'retencao',
      heading: '10. Retenção dos dados',
      content: (
        <>
          <p>
            Os dados pessoais são mantidos apenas pelo tempo necessário ao cumprimento das
            finalidades para as quais foram coletados, respeitados os prazos legais e regulatórios
            aplicáveis.
          </p>
          <ul>
            <li>Dados de cadastro e histórico acadêmico são mantidos enquanto durar a relação com o usuário e pelos prazos necessários à comprovação de emissão e validação de certificados;</li>
            <li>Registros de acesso a aplicações são guardados pelo prazo mínimo legal previsto no Marco Civil da Internet;</li>
            <li>Dados tratados com base no consentimento são mantidos até a sua revogação, salvo obrigação legal de guarda.</li>
          </ul>
          <p>
            Encerrado o prazo de retenção e inexistindo hipótese legal de conservação, os dados são
            eliminados ou anonimizados de forma segura.
          </p>
        </>
      ),
    },
    {
      id: 'alteracoes',
      heading: '11. Alterações da política',
      content: (
        <>
          <p>
            Este Aviso de Privacidade poderá ser atualizado periodicamente para refletir mudanças
            legais, técnicas ou em nossos serviços. A versão vigente estará sempre disponível nesta
            página, com a data da última atualização indicada no topo.
          </p>
          <p>
            Recomendamos a revisão periódica deste documento. Alterações significativas serão
            comunicadas por meios adequados. A continuidade do uso da Plataforma após a publicação
            das alterações indica ciência do titular quanto ao Aviso atualizado.
          </p>
        </>
      ),
    },
    {
      id: 'encarregado',
      heading: '12. Contato do Encarregado (DPO)',
      content: (
        <>
          <p>
            A {EMPRESA.nome} disponibiliza um Encarregado pelo Tratamento de Dados Pessoais (DPO),
            responsável por atuar como canal de comunicação entre a empresa, os titulares e a
            Autoridade Nacional de Proteção de Dados (ANPD). Para exercer seus direitos ou esclarecer
            dúvidas sobre privacidade, utilize os canais abaixo:
          </p>
          <div className="legal-callout">
            <p><strong>Encarregado pelo Tratamento de Dados (DPO)</strong></p>
            <p><strong>E-mail do Encarregado:</strong> {EMPRESA.emailDpo}</p>
            <p><strong>Controladora:</strong> {EMPRESA.razaoSocial} — CNPJ {EMPRESA.cnpj}</p>
            <p><strong>Endereço:</strong> {EMPRESA.endereco}</p>
            <p><strong>E-mail geral:</strong> {EMPRESA.email}</p>
          </div>
          <p>
            Caso entenda que seus direitos não foram adequadamente atendidos, o titular pode também
            apresentar reclamação à Autoridade Nacional de Proteção de Dados (ANPD).
          </p>
        </>
      ),
    },
  ];

  return (
    <LegalPage
      title="Política de Privacidade"
      subtitle="Como a Conatus Institute coleta, utiliza e protege seus dados pessoais, em conformidade com a LGPD."
      breadcrumbLabel="Política de Privacidade"
      updatedAt={ULTIMA_ATUALIZACAO}
      seoTitle={`Política de Privacidade | ${EMPRESA.nome}`}
      seoDescription="Aviso de Privacidade da Conatus Institute: quais dados coletamos, bases legais, cookies, segurança, retenção e os direitos do titular garantidos pela LGPD."
      sections={sections}
    />
  );
}
