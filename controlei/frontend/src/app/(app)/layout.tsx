'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { Sidebar, MobileHeader } from '@/components/layout/sidebar';
import { OnboardingDialog } from '@/components/onboarding/onboarding-dialog';
import { SubscriptionBanner } from '@/components/shared/subscription-banner';
import { SubscribeTracker } from '@/components/tracking/SubscribeTracker';
import { WhatsAppFab } from '@/components/shared/whatsapp-fab';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    // Influencer não usa o app financeiro — manda pro painel dele
    if (user?.role === 'INFLUENCER') {
      router.replace('/influencer');
    }
  }, [user, isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen flex-col md:flex-row">
      {/* Mobile: header com hamburger no topo */}
      <MobileHeader />
      {/* Desktop: sidebar fixa na esquerda */}
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <SubscriptionBanner />
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>
      <OnboardingDialog />
      <SubscribeTracker />
      <WhatsAppFab />
    </div>
  );
}
