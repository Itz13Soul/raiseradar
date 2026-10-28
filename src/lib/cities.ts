export const CITY_COORDS: Record<string, [number, number]> = {
  bengaluru: [12.9716, 77.5946],
  bangalore: [12.9716, 77.5946],
  mumbai: [19.076, 72.8777],
  delhi: [28.6139, 77.209],
  "new delhi": [28.6139, 77.209],
  gurugram: [28.4595, 77.0266],
  gurgaon: [28.4595, 77.0266],
  noida: [28.5355, 77.391],
  hyderabad: [17.385, 78.4867],
  chennai: [13.0827, 80.2707],
  pune: [18.5204, 73.8567],
  kolkata: [22.5726, 88.3639],
  ahmedabad: [23.0225, 72.5714],
  jaipur: [26.9124, 75.7873],
  kochi: [9.9312, 76.2673],
};

export function cityToVector(city: string, radius = 1): [number, number, number] | null {
  const hit = CITY_COORDS[city.trim().toLowerCase()];
  if (!hit) return null;
  const lat = (hit[0] * Math.PI) / 180;
  const lon = (hit[1] * Math.PI) / 180;
  return [radius * Math.cos(lat) * Math.sin(lon), radius * Math.sin(lat), radius * Math.cos(lat) * Math.cos(lon)];
}
