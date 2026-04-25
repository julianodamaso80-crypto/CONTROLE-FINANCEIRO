'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Tags,
  FolderTree,
  Settings,
  CreditCard,
  LogOut,
  Menu,
  X,
  Wallet,
  PiggyBank,
  Target,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';
import { FinnixLogo } from '@/components/shared/finnix-logo';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transactions', label: 'Transações', icon: ArrowLeftRight },
  { href: '/credit-cards', label: 'Cartões', icon: Wallet },
  { href: '/budgets', label: 'Orçamentos', icon: PiggyBank },
  { href: '/goals', label: 'Metas', icon: Target },
  { href: '/segments', label: 'Segmentos', icon: Tags },
  { href: '/categories', label: 'Categorias', icon: FolderTree },
  { href: '/team', label: 'Equipe', icon: Users },
  { href: '/plano', label: 'Meu Plano', icon: CreditCard },
  { href: '/settings', label: 'Configurações', icon: Settings },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <>
      <div className="p-4 md:p-6">
        <FinnixLogo size="sm" />
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'border-l-2 border-primary bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4">
        <Separator className="mb-4" />
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user?.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {user?.email}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

export function MobileHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Fecha ao navegar
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Bloqueia scroll do body quando aberto
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      {/* Barra do topo — só aparece em telas < md */}
      <header className="flex items-center justify-between border-b bg-card px-4 py-3 md:hidden">
        <FinnixLogo size="sm" />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      {/* Overlay + Drawer */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col bg-card shadow-xl md:hidden">
            <SidebarContent onNavigate={() => setOpen(false)} />
          </aside>
        </>
      )}
    </>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden h-screen w-[260px] flex-col border-r bg-card md:flex">
      <SidebarContent />
    </aside>
  );
}
