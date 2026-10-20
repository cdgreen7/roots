// Mock account data shaped after the `users` and `plants` tables in
// server/db/01-database.sql. Device IDs follow the firmware's
// `roots-<last 3 MAC bytes>` format; `status` mirrors the retained
// roots/<deviceId>/status MQTT topic ("online" / "offline").

export type User = {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
};

export type DeviceStatus = "online" | "offline";

export type Device = {
  device_id: string;
  plant_id: string;
  plant_name: string;
  status: DeviceStatus;
  last_seen: string;
};

export const currentUser: User = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "caden@example.com",
  display_name: "Caden",
  created_at: "2026-09-01T00:00:00Z",
};

const minutesAgo = (m: number) =>
  new Date(Date.now() - m * 60_000).toISOString();

export const devices: Device[] = [
  {
    device_id: "roots-a1b2c3",
    plant_id: "00000000-0000-0000-0000-0000000000a1",
    plant_name: "Plant1",
    status: "online",
    last_seen: minutesAgo(1),
  },
  {
    device_id: "roots-4d5e6f",
    plant_id: "00000000-0000-0000-0000-0000000000a2",
    plant_name: "Plant2",
    status: "offline",
    last_seen: minutesAgo(60 * 26),
  },
];

export function formatLastSeen(iso: string, now: number) {
  const mins = Math.round((now - new Date(iso).getTime()) / 60_000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.round(hours / 24)} days ago`;
}
