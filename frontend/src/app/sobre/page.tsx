import Link from 'next/link';
import { ArrowRight, Heart, Zap, Shield, Code, MapPin } from 'lucide-react';
import { LandingHeader } from '@/components/landing/landing-header';
import { LandingFooter } from '@/components/landing/landing-footer';

export const metadata = {
  title: 'Sobre o MeuCaixa — Por que existimos e quem está atrás disso',
  description:
    'O MeuCaixa nasceu da dor de pequenos empreendedores brasileiros que perdiam controle financeiro por ter que abrir planilha. Conheça a história, missão e o time por trás.',
  alternates: { canonical: 'https://meucaixa.store/sobre' },
};

const values = [
  {
    icon: Zap,
    title: 'Simplicidade radical',
    text: 'Se uma feature precisa de tutorial pra usar, ela não está pronta. O MeuCaixa tem que funcionar no nível "manda mensagem no WhatsApp".',
  },
  {
    icon: Heart,
    title: 'Brasileiro até o osso',
    text: 'Servidor no Brasil, suporte em português, preço em real, entende gíria e "k" pra mil. Feito por quem usa todo dia.',
  },
  {
    icon: Shield,
    title: 'Dado seu, controle seu',
    text: 'Você cancela quando quiser e leva todos os dados. Sem reféns, sem letra miúda. LGPD não é cláusula, é prática.',
  },
  {
    icon: Code,
    title: 'Software como artesanato',
    text: 'Cada feature é pensada, testada e refinada. Não somos uma fábrica de funcionalidade, somos um time pequeno fazendo bem feito.',
  },
];

const timeline = [
  {
    year: '2023',
    title: 'A frustração que virou ideia',
    text: 'Juliano, fundador, tentava controlar as próprias finanças com planilha e abandonava todo mês. Percebeu que a maioria das pessoas tem o mesmo problema: planilha exige uma disciplina que ninguém tem no corre do dia.',
  },
  {
    year: '2024',
    title: 'Primeiro protótipo no WhatsApp',
    text: 'Bot básico com 4 comandos. 6 amigos testaram. Em 3 semanas, 4 deles disseram que não viviam mais sem.',
  },
  {
    year: '2025',
    title: 'IA generativa entra em cena',
    text: 'Integração com Claude e Gemini transforma o bot. Agora entende texto livre, áudio, foto de cupom e PDF. Categorização vira automática.',
  },
  {
    year: '2026',
    title: 'MeuCaixa lança publicamente',
    text: 'Plataforma completa, dashboard web, multi-usuário pra compartilhar com família, importação OFX, cartão de crédito parcelado, projeção de saldo. Hoje, mais de 100 pessoas usam diariamente.',
  },
];

export default function SobrePage() {
  return (
    <div className="font-satoshi text-black bg-white min-h-screen">
      <LandingHeader />

      <section className="border-b-2 border-black bg-[#171e19] py-24 text-white">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border-2 border-[#90ff6b]/40 bg-[#90ff6b]/10 px-5 py-2 font-cabinet text-sm font-bold text-[#90ff6b]">
            <Heart className="h-4 w-4" strokeWidth={3} />
            QUEM SOMOS
          </span>

          <h1 className="text-balance font-cabinet text-5xl font-extrabold leading-[0.95] tracking-tighter sm:text-6xl lg:text-7xl">
            A gente acredita que controlar dinheiro{' '}
            <span
              className="text-transparent"
              style={{ WebkitTextStroke: '2px #90ff6b' }}
            >
              não devia
            </span>{' '}
            ser sofrido.
          </h1>

          <p className="mx-auto mt-10 max-w-3xl text-balance text-xl font-medium text-white/70">
            Pequeno empreendedor brasileiro perde dinheiro todo mês não por gastar errado,
            mas por não ter visibilidade do que está acontecendo. Planilha é remédio que
            ninguém toma. WhatsApp todo mundo abre 50 vezes por dia. Foi daí que nasceu o MeuCaixa.
          </p>

          <div className="mt-12 flex items-center justify-center gap-2 text-sm font-bold text-[#90ff6b]">
            <MapPin className="h-4 w-4" />
            Feito no Rio de Janeiro pra todo o Brasil
          </div>
        </div>
      </section>

      {/* MISSÃO */}
      <section className="border-b-2 border-black bg-white py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-16 text-center">
            <span className="inline-block rounded-full border-2 border-black bg-[#90ff6b] px-4 py-1 font-cabinet text-sm font-extrabold">
              NOSSA MISSÃO
            </span>
            <h2 className="mx-auto mt-6 max-w-3xl text-balance font-cabinet text-5xl font-extrabold tracking-tighter sm:text-6xl">
              Acabar com a{' '}
              <span className="text-stroke">planilha</span> que ninguém abre.
            </h2>
          </div>

          <div
            className="rounded-3xl border-2 border-black bg-[#90ff6b] p-10 lg:p-16"
            style={{ boxShadow: '12px 12px 0px 0px #000000' }}
          >
            <p className="text-xl font-medium leading-relaxed lg:text-2xl">
              Todo mundo já tentou controlar finanças com planilha. Faz a planilha, anota uma semana,
              esquece, abandona. Mês que vem promete que vai retomar e o ciclo se repete.
              Resultado: você nunca sabe pra onde foi o salário e gasta no impulso.
            </p>
            <p className="mt-6 text-xl font-medium leading-relaxed lg:text-2xl">
              O MeuCaixa existe pra resolver isso. Você manda mensagem no WhatsApp como já manda
              50 vezes por dia, a IA categoriza e o número fica certo no fim do mês,
              sem você precisar lembrar de anotar nada.
            </p>
            <p className="mt-6 font-cabinet text-2xl font-extrabold lg:text-3xl">
              Trabalho braçal pro software. Decisão consciente pra você.
            </p>
          </div>
        </div>
      </section>

      {/* VALORES */}
      <section className="border-b-2 border-black bg-[#b7c6c2] py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <span className="inline-block rounded-full border-2 border-black bg-white px-4 py-1 font-cabinet text-sm font-extrabold">
              COMO TRABALHAMOS
            </span>
            <h2 className="mx-auto mt-6 max-w-3xl text-balance font-cabinet text-5xl font-extrabold tracking-tighter sm:text-6xl">
              4 princípios{' '}
              <span className="text-stroke">não-negociáveis</span>.
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {values.map((v, i) => (
              <div
                key={i}
                className="brutal-shadow-sm rounded-2xl border-2 border-black bg-white p-8"
              >
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl border-2 border-black bg-[#90ff6b]">
                  <v.icon className="h-6 w-6" strokeWidth={2.5} />
                </div>
                <h3 className="mb-3 font-cabinet text-2xl font-extrabold">
                  {v.title}
                </h3>
                <p className="text-base font-medium leading-relaxed text-black/70">
                  {v.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TIMELINE */}
      <section className="border-b-2 border-black bg-white py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-16 text-center">
            <span className="inline-block rounded-full border-2 border-black bg-[#fde047] px-4 py-1 font-cabinet text-sm font-extrabold">
              NOSSA HISTÓRIA
            </span>
            <h2 className="mx-auto mt-6 max-w-3xl text-balance font-cabinet text-5xl font-extrabold tracking-tighter sm:text-6xl">
              Da{' '}
              <span className="text-stroke">dor</span> ao
              produto.
            </h2>
          </div>

          <div className="relative space-y-8">
            <div className="absolute bottom-0 left-[40px] top-0 hidden w-0.5 bg-black lg:block" />

            {timeline.map((t, i) => (
              <div
                key={i}
                className="relative grid gap-6 lg:grid-cols-[80px_1fr]"
              >
                <div className="flex h-20 w-20 items-center justify-center rounded-full border-[3px] border-black bg-[#90ff6b] font-cabinet text-xl font-extrabold relative z-10">
                  {t.year}
                </div>
                <div
                  className="rounded-2xl border-2 border-black bg-white p-6"
                  style={{ boxShadow: '4px 4px 0px 0px #000000' }}
                >
                  <h3 className="mb-2 font-cabinet text-2xl font-extrabold">
                    {t.title}
                  </h3>
                  <p className="font-medium text-black/70">{t.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-b-2 border-black bg-[#90ff6b] py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-balance font-cabinet text-5xl font-extrabold tracking-tighter sm:text-6xl">
            Faz parte dessa{' '}
            <span className="text-stroke">história</span>.
          </h2>
          <p className="mx-auto mt-8 max-w-2xl text-xl font-medium text-black/80">
            A gente está construindo o controle financeiro brasileiro mais simples e mais
            inteligente que existe. Bora junto?
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-5">
            <Link
              href="/register"
              className="brutal-btn brutal-shadow inline-flex items-center gap-3 rounded-xl border-2 border-black bg-black px-10 py-6 font-cabinet text-xl font-extrabold text-white"
            >
              Criar conta grátis
              <ArrowRight className="h-6 w-6" />
            </Link>
            <a
              href="https://wa.me/5521983128245"
              target="_blank"
              rel="noopener noreferrer"
              className="brutal-btn brutal-shadow-sm inline-flex items-center gap-3 rounded-xl border-2 border-black bg-white px-10 py-6 font-cabinet text-xl font-extrabold"
            >
              Falar com o time
            </a>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
