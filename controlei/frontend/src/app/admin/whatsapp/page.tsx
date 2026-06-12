'use client';

import { WhatsAppConnect } from '@/components/settings/whatsapp-connect';

export default function AdminWhatsAppPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">WhatsApp</h1>
        <p className="text-sm text-muted-foreground">
          Conecte o WhatsApp oficial da empresa. Um número único atende toda a
          operação.
        </p>
      </div>

      <WhatsAppConnect />
    </div>
  );
}
