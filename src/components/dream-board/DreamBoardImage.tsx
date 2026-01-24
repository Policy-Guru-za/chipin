import Image from 'next/image';

import { cn } from '@/lib/utils';

type DreamBoardImageProps = {
  src: string;
  alt: string;
  fallbackSrc?: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
  imageClassName?: string;
};

const defaultFallback = '/images/child-placeholder.svg';

export function DreamBoardImage({
  src,
  alt,
  fallbackSrc = defaultFallback,
  sizes = '(max-width: 768px) 100vw, 112px',
  priority = false,
  className,
  imageClassName,
}: DreamBoardImageProps) {
  const resolvedSrc = src?.trim().length ? src : fallbackSrc;

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden rounded-2xl bg-stone-100 aspect-[3/2]',
        className
      )}
    >
      <Image
        src={resolvedSrc}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className={cn('object-cover', imageClassName)}
      />
    </div>
  );
}
