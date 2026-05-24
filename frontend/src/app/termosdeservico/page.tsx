import Link from 'next/link';

export const metadata = {
  title: 'Termos de Serviço — MeuCaixa',
  description:
    'Termos de Serviço do MeuCaixa: regras de uso, planos, pagamento e responsabilidades.',
  robots: { index: false, follow: false },
};

export default function TermosDeServicoPage() {
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
          Termos de Serviço
        </h1>
        <p className="mt-2 text-sm text-black/60">
          Última atualização: 22 de maio de 2026
        </p>

        <section className="mt-10 space-y-4">
          <h2 className="font-cabinet text-2xl font-extrabold">
            1. Aceitação dos termos
          </h2>
          <p>
            Ao criar uma conta no MeuCaixa (
            <a
              href="https://meucaixa.store"
              className="font-bold underline"
            >
              meucaixa.store
            </a>
            ) ou usar qualquer um dos nossos serviços, você concorda com
            estes Termos de Serviço e com a nossa{' '}
            <Link href="/privacidade" className="font-bold underline">
              Política de Privacidade
            </Link>
            . Caso não concorde com qualquer cláusula, não utilize o serviço.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="font-cabinet text-2xl font-extrabold">
            2. Descrição do serviço
          </h2>
          <p>
            O MeuCaixa é uma plataforma SaaS de controle financeiro
            empresarial que permite registrar receitas, despesas e categorias
            por meio de mensagens no WhatsApp (texto, áudio, imagem e PDF) e
            visualizar relatórios em um painel web.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="font-cabinet text-2xl font-extrabold">
            3. Cadastro e elegibilidade
          </h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>Você deve ter pelo menos 18 anos para usar o serviço.</li>
            <li>
              As informações fornecidas no cadastro devem ser verdadeiras,
              completas e atualizadas.
            </li>
            <li>
              Você é responsável por manter a confidencialidade da sua senha e
              por todas as atividades realizadas na sua conta.
            </li>
            <li>
              Cada conta corresponde a uma empresa (multi-tenant); o
              compartilhamento entre múltiplas empresas distintas em uma única
              conta não é permitido.
            </li>
          </ul>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="font-cabinet text-2xl font-extrabold">
            4. Planos e pagamento
          </h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              Oferecemos um plano gratuito com limites e planos pagos com
              recursos adicionais. Os valores e limites de cada plano são
              apresentados na página de planos.
            </li>
            <li>
              Os pagamentos são processados por gateway de terceiros
              (Kirvano). A cobrança é recorrente conforme a periodicidade do
              plano contratado.
            </li>
            <li>
              Em caso de falha de pagamento, podemos suspender ou rebaixar a
              conta para o plano gratuito sem aviso prévio.
            </li>
            <li>
              Reservamo-nos o direito de alterar preços com aviso prévio de no
              mínimo 30 dias por e-mail.
            </li>
          </ul>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="font-cabinet text-2xl font-extrabold">
            5. Cancelamento e reembolso
          </h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              Você pode cancelar sua assinatura a qualquer momento pelo
              painel ou solicitando ao suporte.
            </li>
            <li>
              Conforme o Código de Defesa do Consumidor, garantimos
              reembolso integral em caso de arrependimento dentro de 7 dias
              corridos a partir da contratação.
            </li>
            <li>
              Após esse período, não há reembolso proporcional para o ciclo
              já iniciado, mas o serviço permanece ativo até o fim do
              período pago.
            </li>
          </ul>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="font-cabinet text-2xl font-extrabold">
            6. Uso aceitável
          </h2>
          <p>Você concorda em NÃO usar a plataforma para:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              Atividades ilegais, fraudulentas, lavagem de dinheiro ou
              evasão fiscal.
            </li>
            <li>
              Enviar spam, conteúdo ofensivo, discriminatório, pornográfico
              ou que viole direitos autorais.
            </li>
            <li>
              Tentar acessar, decifrar ou interferir em sistemas, contas ou
              dados de outros usuários.
            </li>
            <li>
              Realizar engenharia reversa, scraping em massa ou tentativa de
              comprometer a segurança da plataforma.
            </li>
            <li>
              Revender o serviço sem autorização expressa por escrito.
            </li>
          </ul>
          <p>
            O descumprimento pode resultar em suspensão imediata da conta sem
            reembolso.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="font-cabinet text-2xl font-extrabold">
            7. Conteúdo do usuário
          </h2>
          <p>
            Você mantém a propriedade integral dos dados financeiros e
            documentos enviados. Concede ao MeuCaixa apenas a licença
            necessária para armazenar, processar e exibir esse conteúdo no
            âmbito da prestação do serviço.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="font-cabinet text-2xl font-extrabold">
            8. Disponibilidade
          </h2>
          <p>
            Buscamos manter o serviço disponível 24/7, mas não garantimos
            ausência total de interrupções. Podem ocorrer paradas para
            manutenção programada, atualizações, falhas de provedores
            terceiros (WhatsApp, gateways, provedores de IA, infraestrutura
            de nuvem) ou eventos de força maior.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="font-cabinet text-2xl font-extrabold">
            9. Limitação de responsabilidade
          </h2>
          <p>
            O MeuCaixa é uma ferramenta de apoio à organização financeira. A
            classificação automatizada feita por IA pode apresentar
            imprecisões, e o usuário é responsável por revisar os
            lançamentos.
          </p>
          <p>
            Não nos responsabilizamos por decisões financeiras, contábeis ou
            fiscais tomadas com base nos dados exibidos. A nossa
            responsabilidade, em qualquer hipótese, fica limitada ao valor
            efetivamente pago pelo usuário nos últimos 12 meses.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="font-cabinet text-2xl font-extrabold">
            10. Propriedade intelectual
          </h2>
          <p>
            Todos os direitos sobre a plataforma, marca, logotipo, código,
            interfaces e materiais visuais pertencem ao MeuCaixa. Você
            recebe apenas uma licença de uso, não-exclusiva, intransferível
            e revogável, durante a vigência da contratação.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="font-cabinet text-2xl font-extrabold">
            11. Alterações dos termos
          </h2>
          <p>
            Podemos atualizar estes Termos a qualquer momento. Alterações
            relevantes serão comunicadas por e-mail ou aviso no painel com
            antecedência razoável. O uso continuado após a alteração
            representa aceitação dos novos Termos.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="font-cabinet text-2xl font-extrabold">
            12. Lei aplicável e foro
          </h2>
          <p>
            Estes Termos são regidos pela legislação brasileira. Fica eleito
            o foro da comarca do domicílio do usuário consumidor para dirimir
            quaisquer controvérsias.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="font-cabinet text-2xl font-extrabold">13. Contato</h2>
          <p>
            <strong>E-mail:</strong>{' '}
            <a
              href="mailto:contato@meucaixa.store"
              className="font-bold underline"
            >
              contato@meucaixa.store
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
