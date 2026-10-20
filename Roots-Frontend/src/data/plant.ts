// Mock plant data shaped after the `readings`, `plant_rules` and `actuator_state`
// tables in server/db/01-database.sql. Will swap these for API calls eventually.

export type Reading = {
  temp: number; // °F
  humidity: number; // %
  soil_moisture: number; // %
  light: number; // hours of light per day
  recorded_at: string;
};

export type PlantRules = {
  temp_min: number;
  temp_max: number;
  humidity_min: number;
  humidity_max: number;
  soil_min: number;
  light_on_hours: number;
};

export type Actuator = "heat_lamp" | "water_pump" | "grow_light";

export type ActuatorState = Record<Actuator, boolean>;

export type MetricKey = "temp" | "humidity" | "soil_moisture" | "light";

export type MetricStatus = "low" | "ok" | "high";

export const plantName = "Plant1";

export const currentReading: Reading = {
  temp: 60,
  humidity: 40,
  soil_moisture: 45,
  light: 8,
  recorded_at: new Date().toISOString(),
};

export const plantRules: PlantRules = {
  temp_min: 65,
  temp_max: 85,
  humidity_min: 40,
  humidity_max: 70,
  soil_min: 30,
  light_on_hours: 10,
};

export const initialActuatorState: ActuatorState = {
  heat_lamp: false,
  water_pump: false,
  grow_light: false,
};

export const actuatorLabels: Record<Actuator, string> = {
  heat_lamp: "Heat Lamp",
  water_pump: "Water Pump",
  grow_light: "Grow Light",
};

export const metrics: {
  key: MetricKey;
  label: string;
  unit: string;
  max: number;
}[] = [
  { key: "temp", label: "Temperature", unit: "°F", max: 110 },
  { key: "humidity", label: "Humidity", unit: "%", max: 100 },
  { key: "soil_moisture", label: "Soil Moisture", unit: "%", max: 100 },
  { key: "light", label: "Daily Sunlight", unit: " hrs", max: 24 },
];

export function metricRange(
  key: MetricKey,
  rules: PlantRules,
): [number, number] {
  switch (key) {
    case "temp":
      return [rules.temp_min, rules.temp_max];
    case "humidity":
      return [rules.humidity_min, rules.humidity_max];
    case "soil_moisture":
      return [rules.soil_min, 100];
    case "light":
      return [rules.light_on_hours, 24];
  }
}

export function metricStatus(
  key: MetricKey,
  value: number,
  rules: PlantRules,
): MetricStatus {
  const [min, max] = metricRange(key, rules);
  if (value < min) return "low";
  if (value > max) return "high";
  return "ok";
}

// Daily averages for the past 5 days, most recent first.
export const pastAverages: Reading[] = [
  { temp: 62, humidity: 42, soil_moisture: 48, light: 7.5 },
  { temp: 66, humidity: 45, soil_moisture: 55, light: 9 },
  { temp: 68, humidity: 50, soil_moisture: 62, light: 10 },
  { temp: 64, humidity: 47, soil_moisture: 38, light: 8 },
  { temp: 70, humidity: 52, soil_moisture: 33, light: 11 },
].map((reading, i) => {
  const day = new Date();
  day.setDate(day.getDate() - (i + 1));
  return { ...reading, recorded_at: day.toISOString() };
});
