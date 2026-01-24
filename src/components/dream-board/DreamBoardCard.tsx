import { DreamBoardImage } from '@/components/dream-board/DreamBoardImage';
import { Card, CardContent } from '@/components/ui/card';

type DreamBoardCardProps = {
  imageUrl: string;
  title: string;
  subtitle: string;
  tag?: string;
  imagePriority?: boolean;
};

export function DreamBoardCard({
  imageUrl,
  title,
  subtitle,
  tag,
  imagePriority,
}: DreamBoardCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-col gap-4 p-6 md:flex-row md:items-center">
          <DreamBoardImage
            src={imageUrl}
            alt={title}
            priority={imagePriority}
            sizes="(max-width: 768px) 100vw, 112px"
            className="h-32 w-full md:h-28 md:w-28"
          />
          <div className="flex-1 space-y-2">
            {tag ? (
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
                {tag}
              </p>
            ) : null}
            <p className="text-lg font-display text-text">{title}</p>
            <p className="text-sm text-text-muted">{subtitle}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
