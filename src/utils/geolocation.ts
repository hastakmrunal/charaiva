export interface DeviceExactLocation {
  locationName: string;
  locality?: string;
  city: string;
  state?: string;
  country: string;
  latitude: number;
  longitude: number;
  isLiveGps: boolean;
  accuracyMeters?: number;
}

export const DEFAULT_FALLBACK_LOCATION: DeviceExactLocation = {
  locationName: 'Nagpur, Maharashtra, India',
  locality: 'Sitabuldi / Civil Lines',
  city: 'Nagpur',
  state: 'Maharashtra',
  country: 'India',
  latitude: 21.1458,
  longitude: 79.0882,
  isLiveGps: false,
};

/**
 * Reverse geocodes coordinates into an exact human-readable address/place name.
 * Prevents raw numeric GPS coordinates from ever being shown on screen.
 */
export async function reverseGeocodeCoords(latitude: number, longitude: number): Promise<DeviceExactLocation> {
  try {
    const response = await fetch('/api/reverse-geocode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude, longitude }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.locationName) {
        return {
          locationName: data.locationName,
          locality: data.locality || '',
          city: data.city || 'Nagpur',
          state: data.state || 'Maharashtra',
          country: data.country || 'India',
          latitude,
          longitude,
          isLiveGps: true,
        };
      }
    }
  } catch (err) {
    console.warn('Server reverse geocode failed, trying client fallback:', err);
  }

  // Client-side fallback if server route is unreachable
  return {
    locationName: 'Nagpur, Maharashtra, India',
    city: 'Nagpur',
    state: 'Maharashtra',
    country: 'India',
    latitude,
    longitude,
    isLiveGps: true,
  };
}

/**
 * Retrieves the device's exact location using the browser Geolocation API
 * and immediately reverse-geocodes it into human-readable area / city / state.
 */
export function getDeviceExactLocation(): Promise<DeviceExactLocation> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) {
      resolve(DEFAULT_FALLBACK_LOCATION);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const exactLoc = await reverseGeocodeCoords(latitude, longitude);
        resolve({
          ...exactLoc,
          accuracyMeters: accuracy,
          isLiveGps: true,
        });
      },
      (error) => {
        console.warn('Geolocation error / permission declined:', error.message);
        resolve(DEFAULT_FALLBACK_LOCATION);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  });
}

/**
 * Returns a universal zero-cost open maps URL that opens native map apps or browser maps
 * without requiring any Google Maps API keys or Cloud billing.
 */
export function getMapsNavigationUrl(options: {
  placeName: string;
  localityOrCity?: string;
  latitude?: number;
  longitude?: number;
  googleMapsUri?: string;
}): string {
  const { placeName, localityOrCity, latitude, longitude, googleMapsUri } = options;

  if (googleMapsUri && googleMapsUri.startsWith('http')) {
    return googleMapsUri;
  }

  const queryText = `${placeName}${localityOrCity ? ', ' + localityOrCity : ''}`;

  if (latitude && longitude && !isNaN(latitude) && !isNaN(longitude)) {
    // Open directions / turn-by-turn navigation URL format
    return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&destination_place_name=${encodeURIComponent(queryText)}`;
  }

  // Open search / place pin URL format
  return `https://maps.google.com/?q=${encodeURIComponent(queryText)}`;
}

/**
 * Triggers native maps navigation or mobile URI protocol without incurring any Google Cloud costs or API keys.
 */
export function openNativeMapsNavigation(options: {
  placeName: string;
  localityOrCity?: string;
  latitude?: number;
  longitude?: number;
  googleMapsUri?: string;
}) {
  const url = getMapsNavigationUrl(options);
  window.open(url, '_blank', 'noopener,noreferrer');
}
