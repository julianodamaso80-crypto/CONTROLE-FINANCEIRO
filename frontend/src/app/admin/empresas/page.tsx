'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ApiResponse } from '@/types/api';

interface AdminCompany {
  id: string;
  name: string;
  email: string;
  document: string | null;
  phone: string | null;
  plan: string;
  whatsappNumber: string | null;
  createdAt: string;
  _count: { users: number; transactions: number };
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('pt-BR');
}

export default function AdminEmpresasPage() {
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<ApiResponse<AdminCompany[]>>('/admin/companies')
      .then((res) => setCompanies(res.data.data))
      .catch(() => setCompanies([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Empresas</h1>
        <p className="text-sm text-muted-foreground">
          Todas as empresas cadastradas no MeuCaixa
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{companies.length} empresas</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : companies.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma empresa cadastrada.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="px-2 py-3">Nome</th>
                    <th className="px-2 py-3">Email</th>
                    <th className="px-2 py-3">Plano</th>
                    <th className="px-2 py-3">Usuários</th>
                    <th className="px-2 py-3">Transações</th>
                    <th className="px-2 py-3">WhatsApp</th>
                    <th className="px-2 py-3">Desde</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((c) => (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="px-2 py-3 font-medium">{c.name}</td>
                      <td className="px-2 py-3 text-muted-foreground">
                        {c.email}
                      </td>
                      <td className="px-2 py-3">
                        <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          {c.plan}
                        </span>
                      </td>
                      <td className="px-2 py-3">{c._count.users}</td>
                      <td className="px-2 py-3">{c._count.transactions}</td>
                      <td className="px-2 py-3 text-muted-foreground">
                        {c.whatsappNumber ?? '—'}
                      </td>
                      <td className="px-2 py-3 text-muted-foreground">
                        {formatDate(c.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
