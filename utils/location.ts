import * as Location from 'expo-location';

export const getDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const requestLocationPermission = async (): Promise<boolean> => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting location permission:', error);
    return false;
  }
};

export const getCurrentLocation = async (): Promise<Location.LocationObject | null> => {
  try {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      return null;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return location;
  } catch (error) {
    console.error('Error getting current location:', error);
    return null;
  }
};

export const watchLocation = async (
  callback: (location: Location.LocationObject) => void
): Promise<Location.LocationSubscription | null> => {
  try {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      return null;
    }

    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 30000, // Update every 30 seconds
        distanceInterval: 50, // Or when moved 50 meters
      },
      (location) => {
        callback(location);
      }
    );

    return subscription;
  } catch (error) {
    console.error('Error watching location:', error);
    return null;
  }
};

export const checkIfInDangerZone = (
  userLat: number,
  userLon: number,
  dangerLat: number,
  dangerLon: number,
  radius: number
): boolean => {
  const distance = getDistance(userLat, userLon, dangerLat, dangerLon);
  return distance <= radius;
};

export const getReverseGeocode = async (latitude: number, longitude: number): Promise<string | null> => {
  try {
    const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (geocode && geocode.length > 0) {
      const place = geocode[0];
      const parts = [];
      if (place.city || place.subregion || place.district) parts.push(place.city || place.subregion || place.district);
      if (place.region) parts.push(place.region);
      if (place.country) parts.push(place.country);
      return parts.length > 0 ? parts.join(", ") : null;
    }
  } catch (error) {
    console.error("Error reverse geocoding:", error);
  }
  return null;
};
