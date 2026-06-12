'use client';

import dynamic from 'next/dynamic';

const LightRays = dynamic(
  () => import('@/components/shared/light-rays').then((m) => m.LightRays),
  { ssr: false },
);

export function HeroLightRays() {
  return (
    <LightRays
      raysOrigin="top-center"
      raysColor="#90ff6b"
      raysSpeed={1.2}
      lightSpread={1.4}
      rayLength={1.8}
      followMouse={true}
      mouseInfluence={0.2}
      noiseAmount={0.02}
      distortion={0.06}
      pulsating={true}
    />
  );
}
