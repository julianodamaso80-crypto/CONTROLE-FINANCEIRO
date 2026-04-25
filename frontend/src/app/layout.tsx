import type { Metadata } from 'next';
import { Inter_Tight, Fraunces } from 'next/font/google';
import { QueryProvider } from '@/providers/query-provider';
import { AuthProvider } from '@/providers/auth-provider';
import { ThemeProvider } from '@/providers/theme-provider';
import { AppToaster } from '@/components/shared/app-toaster';
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
  title: 'Meu Caixa — Controle Financeiro Inteligente',
  description:
    'SaaS de controle financeiro empresarial com bot WhatsApp e IA',
};

const themeInitScript = `(function(){try{var t=localStorage.getItem('meucaixa-theme')||'dark';var r=document.documentElement;if(t==='dark'){r.classList.add('dark')}else{r.classList.remove('dark')}r.style.colorScheme=t;}catch(e){document.documentElement.classList.add('dark')}})();`;

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
      </head>
      <body className="font-sans bg-background text-foreground antialiased">
        <ThemeProvider>
          <QueryProvider>
            <AuthProvider>
              {children}
              <AppToaster />
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
