'use client';

import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';

export const faqItems = [
  {
    q: 'Como funciona o trial de 3 dias?',
    a: 'Você cria conta com email, senha e seu WhatsApp, sem precisar de cartão de crédito. Tem acesso completo a todas as funções por 3 dias. Se gostar, escolhe plano mensal ou anual. Se não gostar, é só não fazer nada que a conta desativa sozinha.',
  },
  {
    q: 'Preciso instalar algum app no celular?',
    a: 'Não. Você usa o WhatsApp que já tem instalado pra lançar transações, consultar saldo e pedir relatórios. Pra ver dashboards e configurar orçamentos, acessa app.meucaixa.store pelo navegador do celular ou computador. Sem app pra baixar.',
  },
  {
    q: 'Preciso conectar meu WhatsApp com QR code?',
    a: 'Não. A MeuCaixa tem um número oficial — (21) 98312-8245. Você só salva esse contato no seu zap e manda mensagem normal pra ele. O bot identifica você pelo número que você cadastrou na conta e responde com seus dados.',
  },
  {
    q: 'Posso compartilhar com cônjuge, sócio ou família?',
    a: 'Sim. O sistema é multi-usuário com 3 níveis de permissão (Admin, Financeiro, Usuário). Cada pessoa cadastra o WhatsApp próprio e o bot reconhece quem está mandando. Útil pra casal organizar finanças juntos ou família dividindo despesas.',
  },
  {
    q: 'Como gero o relatório em PDF?',
    a: 'Pelo WhatsApp você manda "relatório do mês em PDF". O bot pergunta o período, gera o documento formatado e envia direto no chat como anexo. Quota de 4 PDFs por mês. Útil pra guardar, mandar pro contador ou usar na declaração de IR.',
  },
  {
    q: 'Aceita cartão de crédito parcelado?',
    a: 'Sim. Cadastra o cartão com bandeira, últimos 4 dígitos, limite, dia de fechamento e vencimento. Quando lança uma compra parcelada (até 48x), o sistema distribui automaticamente nas faturas dos meses seguintes. Você acompanha cada fatura com status (aberta, fechada, paga, vencida).',
  },
  {
    q: 'Serve pra finanças pessoais ou só pra negócio?',
    a: 'Foi feito pra finanças pessoais — controle de gastos do dia a dia, orçamento doméstico, organização familiar. Também serve pra freelancer ou MEI que quer separar finanças e ter relatório fácil. Não é um ERP empresarial, é um controle simples que funciona pelo WhatsApp.',
  },
  {
    q: 'Como funciona o lembrete automático?',
    a: 'Duas rotinas rodam todo dia no servidor. Às 8h, se algum orçamento ultrapassou o limite de alerta (padrão 80%), o bot te avisa no zap. Às 9h, manda lista de boletos vencendo hoje. Você não precisa configurar nada — é automático pra todos os clientes.',
  },
  {
    q: 'Meus dados ficam seguros?',
    a: 'Servidor no Brasil, backup diário automático, senha criptografada, conexão HTTPS em todas as páginas. Cumprimos a LGPD: você pode pedir exportação ou exclusão dos seus dados a qualquer momento pelo email contato@meucaixa.store.',
  },
  {
    q: 'Se eu cancelar, perco meus dados?',
    a: 'Não. Antes de cancelar você pode pedir PDF dos últimos meses pelo WhatsApp e baixar tudo. Mesmo após cancelar, mantemos seus dados por 90 dias caso você queira reativar a conta. Depois disso é excluído conforme LGPD.',
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  };

  return (
    <section
      id="faq"
      className="border-b-2 border-black bg-white py-24"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="mx-auto max-w-4xl px-6">
        <div className="mb-16 text-center">
          <span className="inline-block rounded-full border-2 border-black bg-[#90ff6b] px-4 py-1 font-cabinet text-sm font-extrabold">
            DÚVIDAS FREQUENTES
          </span>
          <h2 className="mx-auto mt-6 max-w-3xl text-balance font-cabinet text-5xl font-extrabold tracking-tighter sm:text-6xl">
            Tá em <span className="text-stroke">dúvida</span>? Boa, todo mundo fica.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg font-medium text-black/70">
            Respondi as 10 perguntas que mais aparecem. Se faltar alguma, manda mensagem que respondo direto.
          </p>
        </div>

        <div className="space-y-3">
          {faqItems.map((item, i) => (
            <div
              key={i}
              className={`rounded-2xl border-2 border-black transition-all ${
                openIndex === i ? 'bg-[#90ff6b]' : 'bg-white hover:bg-[#f4f4f5]'
              }`}
              style={openIndex === i ? { boxShadow: '6px 6px 0px 0px #000000' } : { boxShadow: '3px 3px 0px 0px #000000' }}
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="flex w-full items-center justify-between gap-4 p-5 text-left lg:p-6"
                aria-expanded={openIndex === i}
              >
                <h3 className="font-cabinet text-lg font-extrabold lg:text-xl">
                  {item.q}
                </h3>
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-black transition-transform ${
                    openIndex === i ? 'bg-black text-[#90ff6b] rotate-180' : 'bg-white'
                  }`}
                >
                  {openIndex === i ? (
                    <Minus className="h-5 w-5" strokeWidth={3} />
                  ) : (
                    <Plus className="h-5 w-5" strokeWidth={3} />
                  )}
                </div>
              </button>

              {openIndex === i && (
                <div className="px-5 pb-6 lg:px-6">
                  <div className="rounded-xl border-2 border-black bg-white p-5">
                    <p className="text-base font-medium leading-relaxed text-black">
                      {item.a}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border-2 border-black bg-[#171e19] p-8 text-center text-white">
          <p className="mb-2 font-cabinet text-2xl font-extrabold">
            Ainda tem dúvida?
          </p>
          <p className="mb-6 font-medium text-[#b7c6c2]">
            Manda um zap pra gente que respondemos em até 2 horas no horário comercial.
          </p>
          <a
            href="https://wa.me/5521983128245"
            target="_blank"
            rel="noopener noreferrer"
            className="brutal-btn inline-flex items-center gap-2 rounded-xl border-2 border-[#90ff6b] bg-[#90ff6b] px-6 py-3 font-cabinet font-extrabold text-black"
            style={{ boxShadow: '4px 4px 0px 0px #90ff6b' }}
          >
            Falar com a gente no WhatsApp
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
