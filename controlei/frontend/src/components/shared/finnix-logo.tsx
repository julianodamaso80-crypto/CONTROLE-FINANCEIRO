import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface FinnixLogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'auth' | 'app';
  className?: string;
  /** Destino ao clicar. Default '/' (home). Passe null para desativar o link. */
  href?: string | null;
}

// Logo oficial Controlei (icone + texto, fundo branco). Aspect ratio ~3:1.
const sizes = {
  sm: { h: 36, w: 108 },
  md: { h: 52, w: 156 },
  lg: { h: 80, w: 240 },
};

export function FinnixLogo({
  size = 'md',
  variant: _variant = 'app',
  className,
  href = '/',
}: FinnixLogoProps) {
  const s = sizes[size];
  // _variant ignorado: usamos a mesma logo oficial em todos os contextos.
  void _variant;

  const img = (
    <Image
      src="/logo-controlei.jpg"
      alt="Controlei"
      width={s.w}
      height={s.h}
      priority
      className="object-contain"
      style={{ height: s.h, width: 'auto' }}
    />
  );

  if (href === null) {
    return <div className={cn('flex items-center', className)}>{img}</div>;
  }

  return (
    <Link
      href={href}
      aria-label="Controlei — ir para a home"
      className={cn(
        'inline-flex items-center transition-opacity hover:opacity-80',
        className,
      )}
    >
      {img}
    </Link>
  );
}
