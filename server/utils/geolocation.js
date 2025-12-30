/**
 * Calculate the distance between two points on Earth using the Haversine formula
 * @param {number} lat1 - Latitude of point 1 in degrees
 * @param {number} lon1 - Longitude of point 1 in degrees
 * @param {number} lat2 - Latitude of point 2 in degrees
 * @param {number} lon2 - Longitude of point 2 in degrees
 * @returns {number} Distance in meters
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  console.log('Calculating distance between:', { lat1, lon1, lat2, lon2 });
  
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI/180; // φ, λ in radians
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  const distance = R * c; // Distance in meters
  console.log('Calculated distance:', distance, 'meters');
  
  return distance;
};

/**
 * Validate if a worker's location is within the allowed radius
 * @param {Object} adminLocation - Admin configured location {latitude, longitude, radius}
 * @param {Object} workerLocation - Worker's current location {latitude, longitude}
 * @returns {boolean} True if worker is within allowed radius, false otherwise
 */
const isWithinAllowedLocation = (adminLocation, workerLocation) => {
  console.log('Checking location validity:', { adminLocation, workerLocation });
  
  // If location restriction is not enabled, allow attendance
  if (!adminLocation.enabled) {
    console.log('Location restriction not enabled, allowing attendance');
    return true;
  }
  
  // Calculate distance between admin location and worker location
  const distance = calculateDistance(
    adminLocation.latitude,
    adminLocation.longitude,
    workerLocation.latitude,
    workerLocation.longitude
  );
  
  // Check if distance is within allowed radius
  const isValid = distance <= adminLocation.radius;
  console.log('Location validity check result:', { distance, radius: adminLocation.radius, isValid });
  
  return isValid;
};

module.exports = {
  calculateDistance,
  isWithinAllowedLocation
};