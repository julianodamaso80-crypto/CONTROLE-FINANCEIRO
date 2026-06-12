import Link from 'next/link';

export const metadata = {
  title: 'Política de Privacidade — Controlei',
  description:
    'Política de Privacidade do Controlei: como coletamos, usamos e protegemos seus dados.',
  robots: { index: false, follow: false },
};

export default function PrivacidadePage() {
  return (
    <main className="min-h-screen bg-white text-black">
      <div className="mx-auto max-w-3xl px-6 py-16 leading-relaxed">
        <Link
          href="/"
          className="text-sm font-bold text-black/60 hover:text-black hover:underline"
        >
          ← Voltar
        </Link>

        <h1 className="mt-6 font-cabinet text-4xl font-extrabold">
          Política de Privacidade
        </h1>
        <p className="mt-2 text-sm text-black/60">
          Última atualização: 22 de maio de 2026
        </p>

        <section className="mt-10 space-y-4">
          <h2 className="font-cabinet text-2xl font-extrabold">1. Quem somos</h2>
          <p>
            O Controlei (acessível em{' '}
            <a
              href="https://controlei.ia.br"
              className="font-bold underline"
            >
              controlei.ia.br
            </a>
            ) é uma plataforma de controle financeiro empresarial via WhatsApp e
            painel web. Esta Política descreve como coletamos, usamos,
            armazenamos e protegemos suas informações pessoais, em conformidade
            com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="font-cabinet text-2xl font-extrabold">
            2. Dados que coletamos
          </h2>
          <p>Coletamos as seguintes informações para operar o serviço:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>Dados de cadastro:</strong> nome, e-mail, número de
              WhatsApp e senha (armazenada com hash criptográfico).
            </li>
            <li>
              <strong>Dados financeiros lançados pelo usuário:</strong>{' '}
              descrições de receitas, despesas, categorias, valores, datas e
              anexos enviados (áudios, imagens, PDFs de notas e boletos).
            </li>
            <li>
              <strong>Mensagens de WhatsApp:</strong> conteúdo das mensagens
              enviadas ao bot, transcrições de áudios e respostas geradas.
            </li>
            <li>
              <strong>Dados técnicos:</strong> endereço IP, tipo de
              dispositivo, navegador, logs de acesso e cookies de sessão.
            </li>
            <li>
              <strong>Dados de pagamento:</strong> processados por
              gateways terceiros (Kirvano). Não armazenamos dados completos de
              cartão em nossos servidores.
            </li>
          </ul>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="font-cabinet text-2xl font-extrabold">
            3. Como usamos seus dados
          </h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>Operar o lançamento e a classificação automática de transações financeiras.</li>
            <li>Enviar respostas, relatórios e notificações via WhatsApp e e-mail.</li>
            <li>Processar pagamentos de assinatura e emitir comprovantes.</li>
            <li>Melhorar a qualidade da IA classificadora (dados anonimizados).</li>
            <li>Cumprir obrigações legais, fiscais e regulatórias.</li>
            <li>Prevenir fraudes e proteger a segurança da plataforma.</li>
          </ul>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="font-cabinet text-2xl font-extrabold">
            4. Compartilhamento com terceiros
          </h2>
          <p>
            Compartilhamos dados estritamente necessários com provedores que
            viabilizam a operação:
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>Meta / WhatsApp:</strong> envio e recebimento de
              mensagens via WhatsApp Business Platform.
            </li>
            <li>
              <strong>Provedores de IA:</strong> processamento de linguagem
              natural, transcrição de áudio e leitura de imagens/PDFs.
            </li>
            <li>
              <strong>Gateway de pagamento (Kirvano):</strong> cobrança de
              assinaturas.
            </li>
            <li>
              <strong>Provedores de infraestrutura:</strong> hospedagem em
              nuvem (Hostinger VPS e equivalentes).
            </li>
          </ul>
          <p>
            Não vendemos, alugamos nem trocamos seus dados pessoais com
            terceiros para fins de marketing.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="font-cabinet text-2xl font-extrabold">
            5. Armazenamento e segurança
          </h2>
          <p>
            Seus dados ficam armazenados em servidores localizados no Brasil
            e/ou em provedores que oferecem garantias contratuais de proteção
            equivalentes às da LGPD. Aplicamos criptografia em trânsito (TLS),
            controle de acesso por papel e isolamento multi-tenant por empresa.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="font-cabinet text-2xl font-extrabold">
            6. Seus direitos (LGPD)
          </h2>
          <p>Você pode, a qualquer momento, solicitar:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Confirmação de tratamento dos seus dados;</li>
            <li>Acesso aos dados que armazenamos sobre você;</li>
            <li>Correção de dados incompletos ou desatualizados;</li>
            <li>Anonimização, bloqueio ou eliminação de dados desnecessários;</li>
            <li>Portabilidade dos dados;</li>
            <li>Eliminação dos dados tratados com base no seu consentimento;</li>
            <li>Revogação do consentimento.</li>
          </ul>
          <p>
            Para exercer qualquer direito, envie um e-mail para{' '}
            <a
              href="mailto:contato@controlei.ia.br"
              className="font-bold underline"
            >
              contato@controlei.ia.br
            </a>
            .
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="font-cabinet text-2xl font-extrabold">
            7. Retenção e exclusão
          </h2>
          <p>
            Mantemos seus dados enquanto sua conta estiver ativa. Após o
            cancelamento, retemos por até 5 anos para cumprimento de
            obrigações legais e fiscais. Você pode solicitar a exclusão
            antecipada conforme o item 6.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="font-cabinet text-2xl font-extrabold">8. Cookies</h2>
          <p>
            Usamos cookies essenciais para autenticação e funcionamento da
            plataforma. Não utilizamos cookies de rastreamento publicitário de
            terceiros sem o seu consentimento.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="font-cabinet text-2xl font-extrabold">
            9. Alterações nesta Política
          </h2>
          <p>
            Podemos atualizar esta Política periodicamente. Alterações
            significativas serão comunicadas por e-mail ou na própria
            plataforma com antecedência razoável.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="font-cabinet text-2xl font-extrabold">10. Contato</h2>
          <p>
            Dúvidas ou solicitações sobre esta Política e sobre o tratamento
            dos seus dados:
          </p>
          <p>
            <strong>E-mail:</strong>{' '}
            <a
              href="mailto:contato@controlei.ia.br"
              className="font-bold underline"
            >
              contato@controlei.ia.br
            </a>
          </p>
        </section>

        <div className="mt-16 border-t border-black/10 pt-6 text-sm text-black/60">
          <Link href="/" className="font-bold hover:underline">
            ← Voltar para a página inicial
          </Link>
        </div>
      </div>
    </main>
  );
}
