/**
 * Plant settings: actuator control (/actuators, /pump_reset) and automation rules (/rules).
 * Commands go to the board over MQTT, so they fail with "Device is offline" when the board isn't connected.
 */
import { apiRequest } from './client';

export type ActuatorName = 'water_pump' | 'grow_light' | 'fan';
export type ActuatorMode = 'on' | 'off' | 'auto';

// What the board last reported: whether each output is on, and whether auto watering gave up.
export type ActuatorState = {
  water_pump: boolean;
  grow_light: boolean;
  fan: boolean;
  pump_fault: boolean;
  uploaded_at: string;
};

// The board's automation rules. Temperatures are °C. null means the board hasn't reported that rule.
export type Rules = {
  water_pump_auto: boolean | null;
  grow_light_auto: boolean | null;
  fan_auto: boolean | null;
  soil_min: number | null;       // % - water when the soil is drier than this
  soil_target: number | null;    // % - stop watering at this
  pulse_s: number | null;        // seconds the pump runs per pulse
  soak_s: number | null;         // seconds to wait between pulses
  max_pulses: number | null;     // pulses before giving up (pump fault)
  temp_max: number | null;       // °C - fan on above this
  humidity_max: number | null;   // % - fan on above this
  light_on_hour: number | null;  // hour of day the grow light turns on (0-23)
  light_on_hours: number | null; // how many hours it stays on (0-24)
};

type RulesResponse = { plant_id: string; rules: Rules };

export function getActuators(plantId: string) {
  return apiRequest<ActuatorState>('/actuators', { query: { plant_id: plantId } });
}

// setActuator turns an actuator on or off by hand (for durationS seconds if given), or hands it back to the rules.
export function setActuator(plantId: string, actuator: ActuatorName, state: ActuatorMode, durationS?: number) {
  return apiRequest('/actuators', {
    method: 'POST',
    body: { plant_id: plantId, actuator, state, duration_s: durationS },
  });
}

export function pumpReset(plantId: string) {
  return apiRequest('/pump_reset', { method: 'POST', body: { plant_id: plantId } });
}

export async function getRules(plantId: string): Promise<Rules> {
  const data = await apiRequest<RulesResponse>('/rules', { query: { plant_id: plantId } });
  return data.rules;
}

// updateRules sends only the changed rules and returns the full rule set the board will run.
export async function updateRules(plantId: string, changes: Partial<Rules>): Promise<Rules> {
  const data = await apiRequest<RulesResponse>('/rules', {
    method: 'PUT',
    body: { plant_id: plantId, rules: changes },
  });
  return data.rules;
}