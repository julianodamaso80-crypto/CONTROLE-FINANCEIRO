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

// As logos "sem fundo" são quadradas (ícone + texto "Controlei").
// Renderizamos só a imagem, sem texto adicional. Aspect ratio ~1:1.
const sizes = {
  sm: { h: 40 },
  md: { h: 56 },
  lg: { h: 96 },
};

export function FinnixLogo({
  size = 'md',
  variant = 'app',
  className,
  href = '/',
}: FinnixLogoProps) {
  const s = sizes[size];
  const src =
    variant === 'auth' ? '/logo-sem-fundo.png' : '/logo-sem-fundo-2.png';

  const img = (
    <Image
      src={src}
      alt="Controlei"
      width={s.h}
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
