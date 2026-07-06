import { Link } from 'react-router-dom';
import { LegalPage } from '../../components/layout/LegalPage';
import { EMPRESA, ULTIMA_ATUALIZACAO } from './empresaInfo';

/**
 * Termos de Serviço da plataforma Conatus Institute.
 *
 * Conteúdo institucional pronto para publicação, adaptado a uma empresa de
 * tecnologia e treinamentos em Data Centers e infraestrutura crítica.
 * Os dados oficiais (razão social, CNPJ, e-mail, endereço) vêm de
 * `empresaInfo.js` — basta substituí-los lá.
 */
export function TermosDeServico() {
  const sections = [
    {
      id: 'introducao',
      heading: '1. Introdução',
      content: (
        <>
          <p>
            Bem-vindo(a) à plataforma da <strong>{EMPRESA.nome}</strong> ({EMPRESA.razaoSocial},
            inscrita no CNPJ sob o nº {EMPRESA.cnpj}), doravante denominada simplesmente
            &ldquo;{EMPRESA.nome}&rdquo;. Somos uma organização
            dedicada à educação e à capacitação técnica em Data Centers, infraestrutura crítica,
            energia, refrigeração e demais disciplinas essenciais à operação de ambientes de
            missão crítica.
          </p>
          <p>
            Estes Termos de Serviço (&ldquo;Termos&rdquo;) regulam o acesso e a utilização do
            nosso site, portal do aluno, cursos, avaliações, certificados e demais funcionalidades
            e conteúdos disponibilizados por meios digitais. Recomendamos a leitura atenta deste
            documento, pois ele estabelece direitos e obrigações tanto do usuário quanto da
            {' '}{EMPRESA.nome}.
          </p>
          <p>
            O tratamento de dados pessoais realizado no âmbito da Plataforma é detalhado em nossa{' '}
            <Link to="/politica-de-privacidade">Política de Privacidade</Link>, que integra e
            complementa estes Termos.
          </p>
        </>
      ),
    },
    {
      id: 'aceitacao',
      heading: '2. Aceitação dos Termos',
      content: (
        <>
          <p>
            Ao acessar, navegar, cadastrar-se ou utilizar qualquer funcionalidade da Plataforma, o
            usuário declara ter lido, compreendido e aceitado integralmente estes Termos, bem como
            a Política de Privacidade. Caso não concorde com quaisquer disposições aqui previstas, o
            usuário não deverá utilizar a Plataforma.
          </p>
          <p>
            O aceite é manifestado de forma inequívoca no momento do cadastro e a cada novo uso dos
            serviços. Para menores de 18 (dezoito) anos, o cadastro e a utilização dependem do
            consentimento e da supervisão dos pais ou responsáveis legais, nos termos da legislação
            aplicável.
          </p>
        </>
      ),
    },
    {
      id: 'servicos',
      heading: '3. Serviços oferecidos',
      content: (
        <>
          <p>
            A {EMPRESA.nome} disponibiliza, por meio da Plataforma, um conjunto de serviços
            educacionais e tecnológicos, incluindo, mas não se limitando a:
          </p>
          <ul>
            <li>Cursos técnicos, livres e de aperfeiçoamento em Data Centers e infraestrutura crítica, nas modalidades gratuita e paga;</li>
            <li>Trilhas de aprendizagem, aulas em vídeo, materiais de apoio, documentos e recursos complementares;</li>
            <li>Avaliações de aprendizagem, quizzes e provas com correção automatizada;</li>
            <li>Emissão de certificados de conclusão com código de autenticidade e página pública de validação;</li>
            <li>Portal do aluno para acompanhamento de progresso, matrículas e histórico;</li>
            <li>Conteúdos institucionais, informativos e de suporte técnico ao usuário.</li>
          </ul>
          <p>
            A {EMPRESA.nome} poderá, a seu exclusivo critério e a qualquer tempo, criar, alterar,
            suspender ou descontinuar serviços, funcionalidades ou conteúdos, no todo ou em parte,
            buscando sempre o aprimoramento contínuo da experiência educacional.
          </p>
        </>
      ),
    },
    {
      id: 'cadastro',
      heading: '4. Cadastro de usuários',
      content: (
        <>
          <p>
            O acesso a determinadas funcionalidades exige a criação de uma conta. No cadastro, o
            usuário compromete-se a fornecer informações verdadeiras, exatas, completas e
            atualizadas, responsabilizando-se civil e criminalmente por sua veracidade.
          </p>
          <p>Ao criar uma conta, o usuário reconhece e concorda que:</p>
          <ul>
            <li>É o único responsável pela guarda e confidencialidade de suas credenciais de acesso (login e senha);</li>
            <li>Não deve compartilhar sua conta com terceiros nem permitir o uso por outras pessoas;</li>
            <li>Deve notificar imediatamente a {EMPRESA.nome} sobre qualquer uso não autorizado ou suspeita de violação de segurança de sua conta;</li>
            <li>Todas as atividades realizadas a partir de sua conta serão de sua exclusiva responsabilidade.</li>
          </ul>
          <p>
            A {EMPRESA.nome} poderá recusar, suspender ou cancelar cadastros que apresentem
            informações incorretas, inverídicas, duplicadas ou que infrinjam estes Termos, sem
            prejuízo de outras medidas cabíveis.
          </p>
        </>
      ),
    },
    {
      id: 'responsabilidades-usuario',
      heading: '5. Responsabilidades do usuário',
      content: (
        <>
          <p>O usuário compromete-se a utilizar a Plataforma de forma ética, lícita e diligente, abstendo-se de:</p>
          <ul>
            <li>Utilizar os serviços para fins ilícitos, fraudulentos ou que violem direitos de terceiros;</li>
            <li>Reproduzir, distribuir, comercializar, ceder ou disponibilizar a terceiros, no todo ou em parte, os conteúdos, cursos e materiais sem autorização expressa;</li>
            <li>Compartilhar credenciais de acesso ou burlar mecanismos de controle de matrícula e de acesso a cursos;</li>
            <li>Praticar fraude em avaliações ou obter certificados de forma indevida;</li>
            <li>Inserir vírus, malwares, códigos maliciosos ou realizar ataques que comprometam a integridade, a segurança ou o funcionamento da Plataforma;</li>
            <li>Coletar dados de outros usuários por meios automatizados (scraping) ou não autorizados;</li>
            <li>Publicar conteúdo ofensivo, difamatório, discriminatório ou que viole a legislação vigente.</li>
          </ul>
          <p>
            O descumprimento destas obrigações poderá resultar em advertência, suspensão ou
            encerramento da conta, cancelamento de certificados emitidos indevidamente e adoção das
            medidas judiciais e extrajudiciais cabíveis.
          </p>
        </>
      ),
    },
    {
      id: 'direitos-empresa',
      heading: '6. Direitos e responsabilidades da empresa',
      content: (
        <>
          <p>A {EMPRESA.nome} compromete-se a:</p>
          <ul>
            <li>Empregar esforços razoáveis para manter a Plataforma disponível, segura e funcional;</li>
            <li>Fornecer conteúdos educacionais de qualidade, elaborados por profissionais e especialistas da área;</li>
            <li>Tratar os dados pessoais dos usuários em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018) e com a Política de Privacidade;</li>
            <li>Disponibilizar canais de suporte e atendimento ao usuário.</li>
          </ul>
          <p>São direitos da {EMPRESA.nome}, entre outros:</p>
          <ul>
            <li>Definir, alterar e gerir os planos, preços, conteúdos, requisitos de matrícula e regras de acesso aos cursos;</li>
            <li>Moderar, remover ou restringir conteúdos e contas que violem estes Termos;</li>
            <li>Aperfeiçoar, atualizar e evoluir a Plataforma e seus serviços;</li>
            <li>Suspender temporariamente o acesso para manutenção, correções ou por razões de segurança.</li>
          </ul>
        </>
      ),
    },
    {
      id: 'propriedade-intelectual',
      heading: '7. Propriedade Intelectual',
      content: (
        <>
          <p>
            Todos os conteúdos disponibilizados na Plataforma — incluindo textos, videoaulas,
            apostilas, imagens, ilustrações, marcas, logotipos, nomes, layout, código-fonte, banco
            de dados, metodologias e materiais didáticos — são de titularidade da {EMPRESA.nome} ou
            de seus licenciadores, sendo protegidos pela legislação de propriedade intelectual e
            direitos autorais (Lei nº 9.610/1998 e Lei nº 9.279/1996).
          </p>
          <p>
            A licença de uso concedida ao usuário é <strong>pessoal, intransferível, não exclusiva
            e limitada</strong> à fruição dos serviços contratados, exclusivamente para fins
            educacionais próprios. É expressamente vedada qualquer forma de reprodução, cópia,
            gravação, distribuição, sublicenciamento, engenharia reversa ou exploração comercial dos
            conteúdos sem autorização prévia e por escrito da {EMPRESA.nome}.
          </p>
          <p>
            O certificado emitido comprova a conclusão da respectiva formação, mas não transfere ao
            usuário qualquer direito sobre os materiais, a marca ou a metodologia da {EMPRESA.nome}.
          </p>
        </>
      ),
    },
    {
      id: 'limitacao',
      heading: '8. Limitação de responsabilidade',
      content: (
        <>
          <p>
            A Plataforma e seus conteúdos são fornecidos com finalidade educacional. Embora a
            {' '}{EMPRESA.nome} empregue diligência na elaboração e atualização dos materiais, não
            garante que sua aplicação prática produza resultados específicos, tampouco substitui a
            observância de normas técnicas, procedimentos de segurança, regulamentações do setor e a
            supervisão de profissionais habilitados na execução de atividades em ambientes de
            infraestrutura crítica.
          </p>
          <p>Na máxima extensão permitida pela legislação aplicável, a {EMPRESA.nome} não se responsabiliza por:</p>
          <ul>
            <li>Danos decorrentes do uso indevido, negligente ou em desacordo com estes Termos;</li>
            <li>Indisponibilidades, falhas ou interrupções causadas por fatores alheios ao seu controle, como falhas de conexão, força maior ou caso fortuito;</li>
            <li>Decisões técnicas ou operacionais tomadas pelo usuário com base nos conteúdos, cuja aplicação exige avaliação profissional do caso concreto;</li>
            <li>Conteúdos, produtos ou serviços de terceiros eventualmente acessados por meio de links na Plataforma.</li>
          </ul>
          <p>
            Nenhuma disposição destes Termos exclui ou limita responsabilidades que não possam ser
            legalmente afastadas, notadamente as previstas no Código de Defesa do Consumidor.
          </p>
        </>
      ),
    },
    {
      id: 'disponibilidade',
      heading: '9. Disponibilidade do serviço',
      content: (
        <>
          <p>
            A {EMPRESA.nome} empenha-se em manter a Plataforma disponível de forma contínua e
            estável. Contudo, o acesso poderá ser eventualmente interrompido ou limitado em razão de
            manutenções programadas, atualizações, correções técnicas, ataques cibernéticos, falhas
            de infraestrutura, indisponibilidade de provedores externos ou eventos de força maior.
          </p>
          <p>
            Sempre que possível, as manutenções programadas serão comunicadas com antecedência
            razoável. A {EMPRESA.nome} não garante disponibilidade ininterrupta e não se
            responsabiliza por prejuízos decorrentes de indisponibilidades temporárias, envidando,
            porém, os melhores esforços para restabelecer os serviços com brevidade.
          </p>
        </>
      ),
    },
    {
      id: 'links-terceiros',
      heading: '10. Links para terceiros',
      content: (
        <>
          <p>
            A Plataforma poderá conter links, integrações ou referências a sites, aplicativos e
            serviços de terceiros (por exemplo, provedores de vídeo, ferramentas de pagamento ou
            fabricantes parceiros). Tais recursos são disponibilizados apenas por conveniência do
            usuário.
          </p>
          <p>
            A {EMPRESA.nome} não controla, não endossa e não se responsabiliza pelo conteúdo, pelas
            práticas de privacidade ou pelas políticas de tais terceiros. O acesso a esses recursos
            é feito por conta e risco do usuário, recomendando-se a leitura dos respectivos termos e
            políticas antes de sua utilização.
          </p>
        </>
      ),
    },
    {
      id: 'alteracoes',
      heading: '11. Alterações dos termos',
      content: (
        <>
          <p>
            A {EMPRESA.nome} poderá modificar estes Termos a qualquer momento, visando adequá-los a
            mudanças legais, técnicas ou de negócio. A versão vigente estará sempre disponível nesta
            página, com a respectiva data de atualização indicada no topo.
          </p>
          <p>
            Alterações relevantes poderão ser comunicadas por meios adequados, como aviso na
            Plataforma ou mensagem ao usuário. A continuidade do uso dos serviços após a publicação
            das alterações representa a concordância do usuário com os Termos revisados. Caso não
            concorde, o usuário deverá cessar o uso e poderá solicitar o encerramento de sua conta.
          </p>
        </>
      ),
    },
    {
      id: 'lei-aplicavel',
      heading: '12. Lei aplicável e foro',
      content: (
        <>
          <p>
            Estes Termos são regidos e interpretados de acordo com as leis da República Federativa
            do Brasil, em especial o Código Civil, o Código de Defesa do Consumidor (Lei nº
            8.078/1990), o Marco Civil da Internet (Lei nº 12.965/2014) e a Lei Geral de Proteção de
            Dados (Lei nº 13.709/2018).
          </p>
          <p>
            Fica eleito o foro da {EMPRESA.foro} para dirimir quaisquer controvérsias decorrentes
            destes Termos, com renúncia a qualquer outro, por mais privilegiado que seja,
            ressalvado, nas relações de consumo, o direito do consumidor de optar pelo foro de seu
            domicílio.
          </p>
        </>
      ),
    },
    {
      id: 'contato',
      heading: '13. Contato',
      content: (
        <>
          <p>
            Em caso de dúvidas, solicitações ou comunicações relativas a estes Termos, o usuário
            poderá entrar em contato pelos canais oficiais abaixo:
          </p>
          <div className="legal-callout">
            <p><strong>{EMPRESA.nome}</strong> — {EMPRESA.razaoSocial}</p>
            <p><strong>CNPJ:</strong> {EMPRESA.cnpj}</p>
            <p><strong>Endereço:</strong> {EMPRESA.endereco}</p>
            <p><strong>E-mail:</strong> {EMPRESA.email}</p>
            <p><strong>Telefone:</strong> {EMPRESA.telefone}</p>
          </div>
        </>
      ),
    },
  ];

  return (
    <LegalPage
      title="Termos de Serviço"
      subtitle="Condições que regulam o acesso e o uso da plataforma educacional da Conatus Institute."
      breadcrumbLabel="Termos de Serviço"
      updatedAt={ULTIMA_ATUALIZACAO}
      seoTitle={`Termos de Serviço | ${EMPRESA.nome}`}
      seoDescription="Conheça os Termos de Serviço da Conatus Institute: regras de uso da plataforma, cadastro, responsabilidades, propriedade intelectual, disponibilidade e lei aplicável."
      sections={sections}
    />
  );
}
