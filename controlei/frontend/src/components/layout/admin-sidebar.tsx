'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  MessageCircle,
  History,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';
import { FinnixLogo } from '@/components/shared/finnix-logo';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/usuarios', label: 'Usuários', icon: Users },
  { href: '/admin/influencers', label: 'Influencers', icon: Sparkles },
  { href: '/admin/whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { href: '/admin/historico', label: 'Histórico', icon: History },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="flex h-screen w-[280px] flex-col border-r-2 bg-card">
      <div className="flex flex-col items-center px-4 py-6">
        <FinnixLogo size="lg" href="/admin" />
        <p className="mt-3 text-sm font-extrabold uppercase tracking-wider text-primary">
          Painel Admin
        </p>
      </div>

      <nav className="flex-1 space-y-1.5 px-3">
        {navItems.map((item) => {
          const isActive =
            item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-3 text-base font-bold transition-colors',
                isActive
                  ? 'border-l-4 border-primary bg-primary/15 text-primary'
                  : 'text-foreground/70 hover:bg-accent hover:text-foreground',
              )}
            >
              <item.icon className="h-5 w-5" strokeWidth={2.5} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4">
        <Separator className="mb-4" />
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-foreground">{user?.name}</p>
            <p className="truncate text-xs font-semibold text-foreground/60">
              {user?.email}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={logout} title="Sair">
              <LogOut className="h-5 w-5" strokeWidth={2.5} />
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
