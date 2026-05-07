import type { Borough } from '@content/types';
import photos from '@content/neighborhood-photos.json';
import { BoroughHero } from './BoroughHero';

type PhotoEntry = {
  src: string;
  artist: string | null;
  license: string | null;
  licenseUrl: string | null;
  sourceUrl: string;
  commonsUrl: string;
};

const photoMap = photos as Record<string, PhotoEntry>;

type Props = {
  neighborhoodId: string;
  neighborhoodName: string;
  borough: Borough;
  className?: string;
};

export function NeighborhoodHero({ neighborhoodId, neighborhoodName, borough, className }: Props) {
  const photo = photoMap[neighborhoodId];
  if (photo) {
    return (
      <img
        src={photo.src}
        alt={neighborhoodName}
        loading="lazy"
        className={`object-cover ${className ?? ''}`}
      />
    );
  }
  return <BoroughHero borough={borough} variantSeed={neighborhoodId} className={className} />;
}

export function getPhotoCredit(neighborhoodId: string): PhotoEntry | null {
  return photoMap[neighborhoodId] ?? null;
}
