import marca from '@/assets/marca.png';

// El colibrí del logotipo real, recortado de logo.png. La palabra "LAT-ADD"
// va aparte como texto vivo: así queda nítida a cualquier tamaño y hereda la
// tipografía de la interfaz, en vez de viajar como píxeles.
export function Marca({ className = '' }: { className?: string }) {
  return (
    <img
      src={marca}
      alt=""
      aria-hidden="true"
      width={72}
      height={72}
      className={`shrink-0 ${className}`}
    />
  );
}
