"use client";

import { useState, useEffect } from 'react';
import NextImage from 'next/image';
import type { Advertisement } from '@/lib/types';

interface AdvertisementCarouselProps {
  advertisements: Advertisement[];
}

export default function AdvertisementCarousel({ advertisements }: AdvertisementCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-rotate advertisements every 6 seconds
  useEffect(() => {
    if (advertisements.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % advertisements.length);
    }, 6000); // 6 seconds

    return () => clearInterval(interval);
  }, [advertisements.length]);

  if (advertisements.length === 0) return null;

  const currentAd = advertisements[currentIndex];

  return (
    <section className="relative w-full max-w-4xl mx-auto overflow-hidden rounded-lg shadow-lg aspect-video md:aspect-[2.4/1]" style={{ backgroundColor: '#f3f4f6' }}>
      <div className="relative w-full h-full" style={{ backgroundColor: '#e5e7eb' }}>
        <NextImage
          src={currentAd.media_url || `https://placehold.co/1280x720.png?text=${encodeURIComponent(currentAd.title)}`}
          alt={currentAd.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 80vw, 60vw"
          className="object-cover"
          data-ai-hint="advertisement banner"
          priority={currentIndex === 0}
          style={{
            transition: 'opacity 0.5s ease-in-out',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />

        {/* Overlay content */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent flex items-end p-6 z-10">
          <div className="w-full">
            <h3 className="font-semibold text-white text-xl drop-shadow-md">
              {currentAd.title}
            </h3>
          </div>
        </div>

        {/* Optional: Click to navigate */}
        {currentAd.link_url && (
          <a
            href={currentAd.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute inset-0 cursor-pointer z-20"
            aria-label={`Visit ${currentAd.title}`}
          />
        )}
      </div>
    </section>
  );
}
