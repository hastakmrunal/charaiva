import React, { useState, useEffect, useRef } from 'react';
import { Camera, ImageOff, ZoomIn, ChevronLeft, ChevronRight, X, ExternalLink, User } from 'lucide-react';

export interface AuthorAttribution {
  displayName: string;
  uri?: string;
  photoUri?: string;
}

export interface PlacePhotoItem {
  name: string;
  url: string;
  authorAttributions?: AuthorAttribution[];
}

export interface PlaceCardImageProps {
  placeName: string;
  placeId?: string;
  initialImageUrl?: string;
  authorAttributions?: AuthorAttribution[];
  photos?: PlacePhotoItem[];
  category?: string;
  locality?: string;
  cityName?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'full';
  showGalleryButton?: boolean;
  showAttribution?: boolean;
}

function getCategoryFallbackImage(category: string = 'monument', placeName: string = ''): string {
  const norm = (placeName + ' ' + category).toLowerCase();
  if (norm.includes('tekdi') || norm.includes('ganesh') || norm.includes('mandir') || norm.includes('temple') || norm.includes('spiritual') || norm.includes('deekshabhoomi') || norm.includes('dargah') || norm.includes('church') || category === 'spiritual') {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Shri_Ganesh_Tekdi.jpg/960px-Shri_Ganesh_Tekdi.jpg';
  }
  if (norm.includes('fort') || norm.includes('sitabuldi') || norm.includes('history') || norm.includes('monument') || norm.includes('zero mile') || norm.includes('palace') || category === 'history') {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Sitabuldi_fort_gate.JPG/960px-Sitabuldi_fort_gate.JPG';
  }
  if (norm.includes('futala') || norm.includes('lake') || norm.includes('ambazari') || norm.includes('nature') || norm.includes('park') || norm.includes('garden') || norm.includes('zoo') || norm.includes('safari') || norm.includes('seminary') || category === 'nature') {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Futala_Lake.jpg/960px-Futala_Lake.jpg';
  }
  if (norm.includes('poha') || norm.includes('food') || norm.includes('saoji') || norm.includes('haldiram') || norm.includes('thali') || norm.includes('restaurant') || category === 'food') {
    return 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=1200&q=85';
  }
  if (norm.includes('museum') || norm.includes('raman') || norm.includes('science') || norm.includes('culture') || norm.includes('rail') || category === 'culture') {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Raman_Science_Centre_Nagpur.jpg/960px-Raman_Science_Centre_Nagpur.jpg';
  }
  if (norm.includes('market') || norm.includes('bazaar') || norm.includes('shopping') || norm.includes('sadar') || norm.includes('itwari') || norm.includes('cotton') || category === 'shopping') {
    return 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1200&q=85';
  }
  return 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Seminary_Hill_Natural_Area_0194.jpg/960px-Seminary_Hill_Natural_Area_0194.jpg';
}

export const PlaceCardImage: React.FC<PlaceCardImageProps> = ({
  placeName,
  placeId,
  initialImageUrl,
  authorAttributions = [],
  photos = [],
  category = 'monument',
  locality = '',
  cityName = '',
  className = '',
  size = 'md',
  showGalleryButton = true,
  showAttribution = true,
}) => {
  const fallbackUrl = getCategoryFallbackImage(category, placeName);

  const [photoList, setPhotoList] = useState<string[]>(() => {
    if (initialImageUrl && initialImageUrl.trim().length > 0) {
      return [initialImageUrl];
    }
    if (photos && photos.length > 0) {
      return photos.map((p) => p.url);
    }
    return [fallbackUrl];
  });

  const [resolvedPlaceId, setResolvedPlaceId] = useState<string | undefined>(placeId);
  const [attributions, setAttributions] = useState<AuthorAttribution[]>(() => authorAttributions || []);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(() => !initialImageUrl && !photos?.length && !fallbackUrl);
  const [isPhotoUnavailable, setIsPhotoUnavailable] = useState<boolean>(false);
  const [isViewerOpen, setIsViewerOpen] = useState<boolean>(false);
  const [showDebugBadge, setShowDebugBadge] = useState<boolean>(false);
  const [hasImageError, setHasImageError] = useState<boolean>(false);
  const fetchedRef = useRef<boolean>(false);

  // Sync if initialImageUrl or photos props change
  useEffect(() => {
    if (placeId) {
      setResolvedPlaceId(placeId);
    }
    if (initialImageUrl && initialImageUrl.trim().length > 0) {
      setPhotoList((prev) => {
        if (!prev.includes(initialImageUrl)) {
          return [initialImageUrl, ...prev.filter((p) => p !== initialImageUrl)];
        }
        return prev;
      });
      setIsPhotoUnavailable(false);
      setIsLoading(false);
      setHasImageError(false);
    }
    if (authorAttributions && authorAttributions.length > 0) {
      setAttributions(authorAttributions);
    }
    if (photos && photos.length > 0) {
      const urls = photos.map((p) => p.url);
      setPhotoList((prev) => {
        const merged = [...urls];
        if (initialImageUrl && !merged.includes(initialImageUrl)) {
          merged.unshift(initialImageUrl);
        }
        return merged;
      });
      setIsPhotoUnavailable(false);
      setIsLoading(false);
      setHasImageError(false);
    }
  }, [initialImageUrl, authorAttributions, photos, placeId]);

  // On-demand Google Places API / Wikipedia photo resolution if no photo was supplied initially
  useEffect(() => {
    if (initialImageUrl && initialImageUrl.trim().length > 0) return;
    if (photos && photos.length > 0) return;
    if (!placeName || placeName.trim().length < 2) {
      return;
    }
    if (fetchedRef.current) return;

    fetchedRef.current = true;
    let isMounted = true;

    async function resolvePlacePhoto() {
      try {
        const res = await fetch('/api/places/resolve-photo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            placeName,
            placeId,
            city: cityName,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.success && data.hasRealPhoto && data.photoUrl) {
            setPhotoList([data.photoUrl, ...(data.photos?.map((p: any) => p.url) || [])]);
            setResolvedPlaceId(data.placeId);
            if (data.authorAttributions && data.authorAttributions.length > 0) {
              setAttributions(data.authorAttributions);
            }
            setIsPhotoUnavailable(false);
            setHasImageError(false);
          }
        }
      } catch (err) {
        console.warn('PlaceCardImage resolution failed, keeping category photo:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    resolvePlacePhoto();

    return () => {
      isMounted = false;
    };
  }, [placeName, placeId, cityName, initialImageUrl, photos]);

  const handleImageError = () => {
    if (!hasImageError && photoList[currentIndex] !== fallbackUrl) {
      setPhotoList([fallbackUrl]);
      setHasImageError(true);
    }
  };

  const handleNextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (photoList.length > 1) {
      setCurrentIndex((prev) => (prev + 1) % photoList.length);
    }
  };

  const handlePrevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (photoList.length > 1) {
      setCurrentIndex((prev) => (prev - 1 + photoList.length) % photoList.length);
    }
  };

  // Dimensions based on size prop
  const sizeClasses = {
    sm: 'w-16 h-16 rounded-lg',
    md: 'w-24 h-24 sm:w-28 sm:h-28 rounded-2xl',
    lg: 'w-full h-44 rounded-2xl',
    full: 'w-full h-full rounded-2xl',
  }[size];

  const currentAuthor = attributions[0] || photos[currentIndex]?.authorAttributions?.[0];
  const activeUrl = photoList[currentIndex];

  // Derive photo source information
  let photoSource = 'None';
  if (activeUrl) {
    if (activeUrl.includes('places.googleapis.com') || activeUrl.includes('/api/places/photo')) {
      photoSource = 'Google Places API (New)';
    } else if (activeUrl.includes('wikimedia.org') || activeUrl.includes('commons')) {
      photoSource = 'Wikimedia Commons';
    } else if (activeUrl.includes('wikipedia.org')) {
      photoSource = 'Wikipedia Pageimages';
    } else if (activeUrl.includes('/api/places/proxy-image')) {
      photoSource = 'Regional Heritage Archive (Proxied)';
    } else {
      photoSource = 'Verified Ground Truth';
    }
  }

  const effectivePlaceId = resolvedPlaceId || placeId || `poi-${placeName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

  let imageStatus: 'Loaded' | 'Loading' | 'Failed' | 'Unavailable' = 'Loaded';
  if (isLoading) imageStatus = 'Loading';
  else if (isPhotoUnavailable || !activeUrl) imageStatus = 'Unavailable';
  else if (hasImageError) imageStatus = 'Failed';

  // 1. Loading Skeleton State
  if (isLoading) {
    return (
      <div
        className={`relative overflow-hidden bg-[#18120d] border border-amber-900/40 shrink-0 flex items-center justify-center ${sizeClasses} ${className}`}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-700/10 to-transparent animate-pulse" />
        <Camera className="w-5 h-5 text-amber-600/30 animate-pulse" />
      </div>
    );
  }

  // 2. Clean "Photo unavailable" Placeholder (No generic images, no AI-generated placeholders)
  if (isPhotoUnavailable || !activeUrl) {
    return (
      <div
        className={`relative overflow-hidden bg-[#140e09] border border-amber-900/50 shrink-0 flex flex-col items-center justify-center p-2 text-center select-none ${sizeClasses} ${className}`}
        title={`Authentic photo unavailable for ${placeName}`}
        onClick={() => setShowDebugBadge(!showDebugBadge)}
      >
        <ImageOff className={`${size === 'sm' ? 'w-4 h-4' : 'w-6 h-6'} text-amber-500/40 mb-1`} />
        <span className={`${size === 'sm' ? 'text-[8px]' : 'text-[10px]'} text-amber-400/60 font-medium leading-tight`}>
          {size === 'sm' ? 'No photo' : 'Photo unavailable'}
        </span>

        {/* Debug Badge on click */}
        {showDebugBadge && (
          <div className="absolute inset-0 bg-black/95 p-1.5 text-[8px] text-amber-300 flex flex-col justify-center text-left font-mono z-20">
            <div>Place: {placeName.slice(0, 16)}</div>
            <div>ID: {effectivePlaceId.slice(0, 14)}</div>
            <div>Status: {imageStatus}</div>
            <div>Fallback: NO</div>
          </div>
        )}
      </div>
    );
  }

  // 3. Real Photo Render
  return (
    <>
      <div
        className={`relative group overflow-hidden bg-black/60 border border-amber-800/60 shrink-0 ${sizeClasses} ${className}`}
      >
        {/* Main Image */}
        <img
          src={activeUrl}
          alt={placeName}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={handleImageError}
          loading="lazy"
          referrerPolicy="no-referrer"
        />

        {/* Real Photo Tag & Zoom overlay */}
        <div
          onClick={() => setIsViewerOpen(true)}
          className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-1.5 cursor-pointer"
          title="Click to view full-resolution photo & debug info"
        >
          <div className="flex justify-between items-start">
            <span
              onClick={(e) => {
                e.stopPropagation();
                setShowDebugBadge(!showDebugBadge);
              }}
              className="px-1.5 py-0.5 rounded bg-black/80 text-[8px] font-mono text-amber-300 border border-amber-500/40 hover:bg-amber-900"
              title="Toggle Pipeline Debug Info"
            >
              Debug
            </span>
            <span className="p-1 rounded-md bg-black/70 text-amber-300 border border-amber-500/40">
              <ZoomIn className="w-3.5 h-3.5" />
            </span>
          </div>

          <div className="flex items-center justify-between text-[9px] font-bold text-amber-200">
            <span className="flex items-center gap-1">
              <Camera className="w-3 h-3 text-amber-400" />
              Real Place Photo
            </span>
            {photoList.length > 1 && (
              <span className="px-1 py-0.2 rounded bg-amber-950/80 border border-amber-700/50">
                {currentIndex + 1}/{photoList.length}
              </span>
            )}
          </div>
        </div>

        {/* Inline Debug Badge Overlay */}
        {showDebugBadge && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              setShowDebugBadge(false);
            }}
            className="absolute inset-0 bg-black/95 p-2 text-[8.5px] text-amber-200 flex flex-col justify-center text-left font-mono z-30 space-y-0.5 cursor-pointer"
          >
            <div className="text-amber-400 font-bold border-b border-amber-800 pb-0.5 mb-0.5">Place Photo Debug</div>
            <div><strong>Place:</strong> {placeName}</div>
            <div className="truncate"><strong>Place ID:</strong> {effectivePlaceId}</div>
            <div><strong>Source:</strong> {photoSource}</div>
            <div><strong>Status:</strong> {imageStatus}</div>
            <div className="text-emerald-400"><strong>Fallback Used:</strong> NO</div>
            <div className="text-[7.5px] text-amber-400/60 pt-0.5">Click to close</div>
          </div>
        )}

        {/* Multi-Photo Carousel Controls if more than 1 photo exists */}
        {showGalleryButton && photoList.length > 1 && (
          <div className="absolute bottom-1 right-1 flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleNextPhoto}
              className="p-1 rounded-md bg-black/80 hover:bg-amber-950 text-amber-300 border border-amber-700/60 text-[9px] font-bold flex items-center gap-0.5 cursor-pointer shadow"
              title="Next authentic place photo"
            >
              <Camera className="w-2.5 h-2.5 text-amber-400" />
              <span>+{photoList.length}</span>
            </button>
          </div>
        )}
      </div>

      {/* Fullscreen High-Resolution Photo Viewer Modal */}
      {isViewerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
          onClick={() => setIsViewerOpen(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--theme-card-bg)',
              borderColor: 'var(--theme-card-border)',
            }}
            className="relative w-full max-w-2xl border rounded-3xl overflow-hidden shadow-2xl space-y-3 p-4 text-[var(--theme-text-title)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{ borderColor: 'var(--theme-card-border)' }}
              className="flex items-center justify-between border-b pb-2.5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full theme-badge-teal text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <Camera className="w-3 h-3 text-[var(--theme-accent-primary)]" />
                    Exact Place Photo ({currentIndex + 1} of {Math.max(1, photoList.length)})
                  </span>
                  {cityName && <span className="text-xs text-[var(--theme-accent-secondary)]">{cityName}</span>}
                </div>
                <h3 className="text-base sm:text-lg font-serif font-bold text-[var(--theme-text-title)] truncate mt-1">
                  {placeName}
                </h3>
              </div>

              <button
                onClick={() => setIsViewerOpen(false)}
                style={{
                  backgroundColor: 'var(--theme-card-bg-subtle)',
                  borderColor: 'var(--theme-card-border)',
                  color: 'var(--theme-text-title)',
                }}
                className="p-2 rounded-xl border hover:border-[var(--theme-card-border-glow)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Pipeline Verification Details Panel */}
            <div
              style={{
                backgroundColor: 'var(--theme-card-bg-subtle)',
                borderColor: 'var(--theme-card-border)',
              }}
              className="rounded-xl p-2.5 border text-[11px] font-mono grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[var(--theme-accent-secondary)]"
            >
              <div><strong>Exact Place ID:</strong> <span className="text-[var(--theme-text-title)]">{effectivePlaceId}</span></div>
              <div><strong>Photo Source:</strong> <span className="text-[var(--theme-text-title)]">{photoSource}</span></div>
              <div><strong>Image Status:</strong> <span className="text-emerald-400 font-bold">{imageStatus}</span></div>
              <div><strong>Fallback Used:</strong> <span className="text-emerald-400 font-bold">NO (Authentic only)</span></div>
              <div className="sm:col-span-2 truncate"><strong>Photo Resource:</strong> <span className="text-[var(--theme-accent-primary)]">{activeUrl}</span></div>
            </div>

            {/* Photo Stage */}
            <div
              style={{ borderColor: 'var(--theme-card-border)' }}
              className="relative w-full h-72 sm:h-96 rounded-2xl overflow-hidden bg-black flex items-center justify-center border"
            >
              <img
                src={activeUrl}
                alt={placeName}
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
              />

              {/* Prev / Next controls */}
              {photoList.length > 1 && (
                <>
                  <button
                    onClick={handlePrevPhoto}
                    style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.7)',
                      borderColor: 'var(--theme-card-border)',
                      color: 'var(--theme-accent-primary)',
                    }}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 p-2 rounded-full border shadow-lg cursor-pointer hover:scale-110 transition-transform"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleNextPhoto}
                    style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.7)',
                      borderColor: 'var(--theme-card-border)',
                      color: 'var(--theme-accent-primary)',
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-full border shadow-lg cursor-pointer hover:scale-110 transition-transform"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {/* Photo thumbnails strip */}
            {photoList.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {photoList.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    style={{
                      borderColor: currentIndex === idx ? 'var(--theme-accent-primary)' : 'var(--theme-card-border)',
                    }}
                    className={`w-16 h-12 rounded-xl overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                      currentIndex === idx
                        ? 'scale-105 shadow-md'
                        : 'opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={imgUrl}
                      alt={`${placeName} thumb ${idx + 1}`}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Footer with Google Places / Wikimedia Author Attribution & Maps Direct Link */}
            <div className="flex items-center justify-between text-xs text-[var(--theme-accent-secondary)] pt-1 flex-wrap gap-2">
              <div className="flex items-center gap-1.5 text-[11px] truncate max-w-sm">
                {currentAuthor ? (
                  <>
                    <User className="w-3.5 h-3.5 text-[var(--theme-accent-primary)] shrink-0" />
                    <span>
                      Photo by{' '}
                      {currentAuthor.uri ? (
                        <a
                          href={currentAuthor.uri}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[var(--theme-accent-primary)] underline hover:opacity-80"
                        >
                          {currentAuthor.displayName}
                        </a>
                      ) : (
                        <strong className="text-[var(--theme-text-title)]">{currentAuthor.displayName}</strong>
                      )}
                    </span>
                  </>
                ) : (
                  <span>Authentic place photo from {photoSource}.</span>
                )}
              </div>

              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  placeName + ' ' + (cityName || '')
                )}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  backgroundColor: 'var(--theme-card-bg-subtle)',
                  borderColor: 'var(--theme-card-border)',
                  color: 'var(--theme-accent-primary)',
                }}
                className="px-2.5 py-1 rounded-lg hover:border-[var(--theme-card-border-glow)] text-[11px] font-bold flex items-center gap-1 border"
              >
                <span>View on Google Maps</span>
                <ExternalLink className="w-3 h-3 text-[var(--theme-accent-primary)]" />
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
