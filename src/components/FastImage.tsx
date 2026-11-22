import React, { useEffect, useRef, useState } from 'react';

interface FastImageProps {
  src: string;
  webpSrc?: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  priority?: boolean;
  darkBg?: boolean;
  onError?: () => void;
}

export const FastImage: React.FC<FastImageProps> = ({
  src,
  webpSrc,
  alt,
  className = '',
  style,
  priority = false,
  darkBg = false,
  onError,
}) => {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const isInstant = priority || src.startsWith('data:');
  const [loaded, setLoaded] = useState(isInstant);

  useEffect(() => {
    if (isInstant) {
      setLoaded(true);
      return;
    }
    const el = imgRef.current;
    if (el && el.complete && el.currentSrc) {
      if (el.naturalWidth > 0) {
        setLoaded(true);
      } else {
        setLoaded(true);
        onErrorRef.current?.();
      }
      return;
    }
    setLoaded(false);
  }, [src, webpSrc, isInstant]);

  const handleError = () => {
    setLoaded(true);
    onErrorRef.current?.();
  };

  const imgEl = (
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      fetchPriority={priority ? 'high' : 'auto'}
      referrerPolicy="no-referrer"
      onLoad={() => setLoaded(true)}
      onError={handleError}
      style={style}
      className={`${className} transition-opacity duration-150 ${
        loaded ? 'opacity-100' : 'opacity-0'
      }`}
    />
  );

  return (
    <div className={`relative w-full h-full ${darkBg ? 'bg-[#081522]' : 'bg-slate-200/70'}`}>
      {!loaded && !priority && (
        <div
          aria-hidden="true"
          className={`absolute inset-0 animate-pulse ${
            darkBg ? 'bg-[#0F2338]' : 'bg-slate-200'
          }`}
        />
      )}
      {webpSrc ? (
        <picture className="contents">
          <source srcSet={webpSrc} type="image/webp" />
          {imgEl}
        </picture>
      ) : (
        imgEl
      )}
    </div>
  );
};
