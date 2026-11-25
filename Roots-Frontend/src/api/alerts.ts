/**
 * Current problems with a plant or its board, from GET /alerts.
 */
import { apiRequest } from './client';

export type PlantAlert = {
  plant_id: string;
  type: string;    // e.g. offline, low_soil, high_temperature, pump_fault
  message: string; // ready to show to the user
};

export function getAlerts(plantId: string) {
  return apiRequest<PlantAlert[]>('/alerts', { query: { plant_id: plantId } });
}