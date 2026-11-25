/**
 * Sensor readings from GET /plant_readings.
 */
import { apiRequest } from './client';

export type Reading = {
  temp: number | null;          // °C
  humidity: number | null;      // %
  soil_moisture: number | null; // %
  light: number | null;         // lux
  recorded_at: string;
};

export type Stat = { min: number | null; max: number | null; avg: number | null };

export type Ranges = {
  temp: Stat;
  humidity: Stat;
  soil_moisture: Stat;
  light: Stat;
  count: number; // readings in the window; 0 means the board sent nothing
};

export type PlantReadings = {
  plant_id: string;
  current: Reading | null; // the newest reading, whatever the window
  history: Reading[];
  ranges: Ranges;          // over every reading in the window
  sunlight_hours: number;  // hours of light in the window
};

const HOUR_MS = 60 * 60 * 1000;

// getRecentReadings returns the plant's readings for the last `hours` hours.
// limit=1 because callers only use current, ranges and sunlight_hours, which don't depend on it.
export function getRecentReadings(plantId: string, hours: number) {
  const since = new Date(Date.now() - hours * HOUR_MS).toISOString();
  return apiRequest<PlantReadings>('/plant_readings', {
    query: { plant_id: plantId, since, limit: 1 },
  });
}