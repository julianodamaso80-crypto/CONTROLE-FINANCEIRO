import type { Metadata } from 'next';
import Script from 'next/script';
import { Suspense } from 'react';
import { Inter_Tight, Fraunces } from 'next/font/google';
import { QueryProvider } from '@/providers/query-provider';
import { AuthProvider } from '@/providers/auth-provider';
import { ThemeProvider } from '@/providers/theme-provider';
import { AppToaster } from '@/components/shared/app-toaster';
import { TrackingInit } from '@/components/tracking/TrackingInit';
import { CtaTracker } from '@/components/tracking/CtaTracker';
import { WhatsAppTracker } from '@/components/tracking/WhatsAppTracker';
import './globals.css';

const interTight = Inter_Tight({
  subsets: ['latin'],
  variable: '--font-inter-tight',
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://controlei.ia.br'),
  title: 'Controlei — Controle Financeiro Inteligente',
  description:
    'SaaS de controle financeiro empresarial com bot WhatsApp e IA',
  openGraph: {
    type: 'website',
    url: 'https://controlei.ia.br',
    siteName: 'Controlei',
    title: 'Controlei — Controle Financeiro Inteligente',
    description:
      'SaaS de controle financeiro empresarial com bot WhatsApp e IA',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Controlei — Seu controle de gastos por chat',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Controlei — Controle Financeiro Inteligente',
    description:
      'SaaS de controle financeiro empresarial com bot WhatsApp e IA',
    images: ['/og-image.png'],
  },
};

const themeInitScript = `(function(){try{var t=localStorage.getItem('meucaixa-theme')||'dark';var r=document.documentElement;if(t==='dark'){r.classList.add('dark')}else{r.classList.remove('dark')}r.style.colorScheme=t;}catch(e){document.documentElement.classList.add('dark')}})();`;

// Stape Custom Loader (sGTM) — carrega GTM-NG5RG625 via ss.meucaixa.ia.br
// Atualizado: 2026-05-27 | snippet em mcp-gtm/snippet-stape-loader.html
const stapeLoaderScript = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s);j.async=true;j.src="https://ss.meucaixa.ia.br/c67cpwbmmhn.js?"+i;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','6vjwwok1=BwxQKjY6XS0pXT8qVEVFRRhVX0NTURQNUwUIGAEWGRsPRgQMTBUC');`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      className={`${interTight.variable} ${fraunces.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <Script
          id="stape-gtm-loader"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: stapeLoaderScript }}
        />
      </head>
      <body className="font-sans bg-background text-foreground antialiased">
        {/* GTM noscript fallback (renderiza sem JS / com adblock pesado) */}
        <noscript>
          <iframe
            src="https://ss.meucaixa.ia.br/ns.html?id=GTM-NG5RG625"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>

        <ThemeProvider>
          <QueryProvider>
            <AuthProvider>
              {/* Tracking client-side — invisíveis, montados uma vez */}
              <Suspense fallback={null}>
                <TrackingInit />
              </Suspense>
              <CtaTracker />
              <WhatsAppTracker />

              {children}
              <AppToaster />
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
