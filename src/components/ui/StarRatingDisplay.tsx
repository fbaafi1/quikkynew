
"use client";

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingDisplayProps {
  rating: number;
  totalStars?: number;
  size?: number;
  className?: string;
}

export default function StarRatingDisplay({
  rating,
  totalStars = 5,
  size = 16,
  className,
}: StarRatingDisplayProps) {
  const fullStars = Math.floor(rating);
  const partialStar = rating % 1;
  const emptyStars = totalStars - Math.ceil(rating);

  return (
    <div className={cn("flex items-center", className)}>
      {[...Array(fullStars)].map((_, i) => (
        <Star key={`full-${i}`} fill="currentColor" size={size} className="text-yellow-400 stroke-yellow-400" />
      ))}
      {partialStar > 0 && (
        <div style={{ position: 'relative', display: 'inline-block', width: size, height: size }}>
          <Star size={size} className="text-gray-300 stroke-gray-300" />
          <div style={{ position: 'absolute', top: 0, left: 0, width: `${partialStar * 100}%`, height: '100%', overflow: 'hidden' }}>
            <Star size={size} fill="currentColor" className="text-yellow-400 stroke-yellow-400" />
          </div>
        </div>
      )}
      {[...Array(emptyStars)].map((_, i) => (
        <Star key={`empty-${i}`} size={size} className="text-gray-300 stroke-gray-300" />
      ))}
    </div>
  );
}
