import type { Metadata } from 'next';
import { Inter_Tight, Fraunces } from 'next/font/google';
import { QueryProvider } from '@/providers/query-provider';
import { AuthProvider } from '@/providers/auth-provider';
import { Toaster } from 'sonner';
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
  title: 'Finnix — Controle Financeiro Inteligente',
  description:
    'SaaS de controle financeiro empresarial com bot WhatsApp e IA',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      className={`${interTight.variable} ${fraunces.variable} dark`}
    >
      <body className="font-sans bg-background text-foreground antialiased">
        <QueryProvider>
          <AuthProvider>
            {children}
            <Toaster position="top-right" theme="dark" richColors />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
