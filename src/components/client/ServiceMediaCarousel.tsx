import { useState } from 'react';
import { ChevronLeft, ChevronRight, Play, Image } from 'lucide-react';

interface ServiceMediaCarouselProps {
  imageUrl: string | null;
  videoUrl: string | null;
  serviceName: string;
}

export function ServiceMediaCarousel({ imageUrl, videoUrl, serviceName }: ServiceMediaCarouselProps) {
  const media: { type: 'image' | 'video'; url: string }[] = [];
  if (imageUrl) media.push({ type: 'image', url: imageUrl });
  if (videoUrl) media.push({ type: 'video', url: videoUrl });

  const [activeIndex, setActiveIndex] = useState(0);

  if (media.length === 0) return null;

  const goNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIndex((prev) => (prev + 1) % media.length);
  };

  const goPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIndex((prev) => (prev - 1 + media.length) % media.length);
  };

  const current = media[activeIndex];

  return (
    <div className="w-full aspect-video bg-muted/30 relative overflow-hidden group">
      {current.type === 'video' ? (
        <video
          key={current.url}
          src={current.url}
          className="w-full h-full object-cover"
          controls
          preload="metadata"
          playsInline
          muted
        />
      ) : (
        <img
          key={current.url}
          src={current.url}
          alt={serviceName}
          className="w-full h-full object-cover"
        />
      )}

      {/* Navigation arrows - only if more than 1 media */}
      {media.length > 1 && (
        <>
          <button
            onClick={goPrev}
            className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={goNext}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </>
      )}

      {/* Dots + type indicator */}
      {media.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-background/70 backdrop-blur-sm rounded-full px-2.5 py-1">
          {media.map((m, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setActiveIndex(i); }}
              className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full transition-all ${
                i === activeIndex
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {m.type === 'image' ? <Image className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              {m.type === 'image' ? 'Foto' : 'Vídeo'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
