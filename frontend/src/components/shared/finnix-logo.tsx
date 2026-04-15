import Image from 'next/image';
import { cn } from '@/lib/utils';

interface FinnixLogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'auth' | 'app';
  className?: string;
}

// As logos "sem fundo" são banners horizontais que já contêm o
// porquinho + texto "Meu Caixa". Renderizamos só a imagem, sem
// texto adicional. A largura é ~3x a altura (aspect ratio ~3:1).
const sizes = {
  sm: { h: 32 },
  md: { h: 44 },
  lg: { h: 72 },
};

export function FinnixLogo({
  size = 'md',
  variant = 'app',
  className,
}: FinnixLogoProps) {
  const s = sizes[size];
  const src =
    variant === 'auth' ? '/logo-sem-fundo.png' : '/logo-sem-fundo-2.png';

  return (
    <div className={cn('flex items-center', className)}>
      <Image
        src={src}
        alt="Meu Caixa"
        width={s.h * 3}
        height={s.h}
        priority
        className="object-contain"
        style={{ height: s.h, width: 'auto' }}
      />
    </div>
  );
}
