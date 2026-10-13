#include "actuators.h"
#if ACTUATORS_ENABLED

#include <Preferences.h>
#include <time.h>

namespace actuators {

/*
  Actuator table
*/
enum Id : uint8_t { PUMP, LIGHT, FAN, COUNT };

struct Actuator {
  const char* name;        // matches actuator_state columns / command "target"
  uint8_t     pin;
  bool        activeLow;   // true for most relay modules, false for MOSFET modules
  uint32_t    maxOnMs;     // hard safety limit, 0 = none
  bool        on;
  uint32_t    onSince;
  bool        manual;      // manual override active (auto rules paused)
  bool        timed;       // manual override expires at overrideEnd
  uint32_t    overrideEnd;
};

static Actuator acts[COUNT] = {
  { "water_pump", PIN_PUMP,  PUMP_ACTIVE_LOW,  PUMP_MAX_ON_S * 1000UL, false, 0, false, false, 0 },
  { "grow_light", PIN_LIGHT, LIGHT_ACTIVE_LOW, 0,                      false, 0, false, false, 0 },
  { "fan",        PIN_FAN,   FAN_ACTIVE_LOW,   0,                      false, 0, false, false, 0 },
};

/*
  Rules (persisted in NVS). Key names mirror the plant_rules table where possible.
*/
struct Rules {
  uint8_t  version;
  bool     pumpAuto, lightAuto, fanAuto;
  float    soilMin;        // start watering below this %
  float    soilTarget;     // stop watering once this % is reached
  uint16_t pulseS;         // seconds per pump pulse
  uint16_t soakS;          // seconds to let water soak in before re-checking
  uint8_t  maxPulses;      // pulses per watering cycle before flagging a fault
  float    tempMax;        // fan on above this (C)
  float    humidityMax;    // fan on above this (%)
  uint8_t  lightOnHour;    // local hour the light turns on (0-23)
  uint8_t  lightOnHours;   // photoperiod length (0 = never, 24 = always)
};

static const uint8_t RULES_VERSION = 1;
static Rules rules = {
  RULES_VERSION,
  false, false, false,     // everything starts manual until the app enables auto
  30.0f, 45.0f,
  5, 300, 6,
  28.0f, 75.0f,
  7, 14,
};

static Preferences prefs;
static PublishFn   publishFn = nullptr;

// Pump auto-watering state machine
static bool     watering      = false;
static uint8_t  pulses        = 0;
static uint32_t lastPulseEnd  = 0;
static bool     pumpFault     = false;   // set when max pulses didn't reach soil target

static Readings last;
static bool     haveReadings  = false;
static bool     stateDirty    = false;

/*
  Helpers
*/
static bool reached(uint32_t deadline) { return (int32_t)(millis() - deadline) >= 0; }

static void writePin(Actuator& a, bool on) {
  digitalWrite(a.pin, (on != a.activeLow) ? HIGH : LOW);
}

static void set(Id id, bool on, const char* why) {
  Actuator& a = acts[id];
  if (a.on == on) return;
  a.on = on;
  if (on) a.onSince = millis();
  else if (id == PUMP) lastPulseEnd = millis();  // soak timer starts whenever the pump stops
  writePin(a, on);
  stateDirty = true;
  Serial.printf("[act] %s %s (%s)\n", a.name, on ? "ON" : "OFF", why);
}

static int findActuator(const char* name) {
  for (uint8_t i = 0; i < COUNT; i++)
    if (strcmp(name, acts[i].name) == 0) return i;
  // short aliases for testing from mosquitto_pub
  if (strcmp(name, "pump") == 0)  return PUMP;
  if (strcmp(name, "light") == 0) return LIGHT;
  return -1;
}

static bool isAuto(Id id) {
  if (acts[id].manual) return false;
  switch (id) {
    case PUMP:  return rules.pumpAuto && !pumpFault;
    case LIGHT: return rules.lightAuto;
    case FAN:   return rules.fanAuto;
    default:    return false;
  }
}

static bool timeSynced() { return time(nullptr) > 1700000000; }  // NTP has set the clock

static void saveRules() {
  prefs.putBytes("rules", &rules, sizeof(rules));
}

static void loadRules() {
  Rules stored;
  if (prefs.getBytesLength("rules") == sizeof(Rules) &&
      prefs.getBytes("rules", &stored, sizeof(stored)) == sizeof(stored) &&
      stored.version == RULES_VERSION) {
    rules = stored;
    Serial.println("[act] rules loaded from NVS");
  } else {
    Serial.println("[act] using default rules");
  }
}

/*
  Publishing
*/
static void publishState() {
  if (!publishFn) return;
  JsonDocument doc;
  for (uint8_t i = 0; i < COUNT; i++) {
    Actuator& a = acts[i];
    JsonObject o = doc[a.name].to<JsonObject>();
    o["on"]   = a.on;
    o["mode"] = isAuto((Id)i) ? "auto" : "manual";
    if (a.manual && a.timed) o["override_s"] = (int32_t)(a.overrideEnd - millis()) / 1000;
  }
  doc["pump_fault"]  = pumpFault;
  doc["time_synced"] = timeSynced();

  char buf[384];
  size_t n = serializeJson(doc, buf, sizeof(buf));
  if (n >= sizeof(buf)) { Serial.println("[act] state payload truncated"); return; }
  if (publishFn("actuators", buf, true)) stateDirty = false;
}

static void publishRules() {
  if (!publishFn) return;
  JsonDocument doc;
  doc["water_pump_auto"] = rules.pumpAuto;
  doc["grow_light_auto"] = rules.lightAuto;
  doc["fan_auto"]        = rules.fanAuto;
  doc["soil_min"]        = rules.soilMin;
  doc["soil_target"]     = rules.soilTarget;
  doc["pulse_s"]         = rules.pulseS;
  doc["soak_s"]          = rules.soakS;
  doc["max_pulses"]      = rules.maxPulses;
  doc["temp_max"]        = rules.tempMax;
  doc["humidity_max"]    = rules.humidityMax;
  doc["light_on_hour"]   = rules.lightOnHour;
  doc["light_on_hours"]  = rules.lightOnHours;

  char buf[384];
  size_t n = serializeJson(doc, buf, sizeof(buf));
  if (n < sizeof(buf)) publishFn("rules", buf, true);
}

void publishAll() {
  publishState();
  publishRules();
}

/*
  Auto rules
*/
static void autoPump(const Readings& r) {
  if (!isAuto(PUMP)) { watering = false; return; }

  // Disconnected/shorted soil sensor reads near the ADC rails. Never water on a bad reading.
  bool soilValid = r.soilRaw > SOIL_RAW_MIN_VALID && r.soilRaw < SOIL_RAW_MAX_VALID;
  if (!soilValid) {
    if (watering) Serial.println("[act] soil reading invalid, stopping watering");
    watering = false;
    set(PUMP, false, "invalid soil reading");
    return;
  }

  if (!watering && r.soilPct < rules.soilMin) {
    watering = true;
    pulses = 0;
    lastPulseEnd = millis() - rules.soakS * 1000UL;  // first pulse immediately
    Serial.printf("[act] soil %.1f%% < %.1f%%, start watering\n", r.soilPct, rules.soilMin);
  }
  if (!watering) return;

  if (r.soilPct >= rules.soilTarget) {
    watering = false;
    Serial.printf("[act] soil %.1f%% reached target, done (%u pulses)\n", r.soilPct, pulses);
    return;
  }

  // Water in short pulses and let it soak, so the slow soil sensor doesn't cause overwatering.
  if (!acts[PUMP].on && millis() - lastPulseEnd >= rules.soakS * 1000UL) {
    if (pulses >= rules.maxPulses) {
      // Pumped several times and soil still dry: empty reservoir, kinked tube, or sensor out of the pot.
      watering = false;
      pumpFault = true;
      stateDirty = true;
      Serial.println("[act] PUMP FAULT: soil not responding, auto watering disabled");
      return;
    }
    pulses++;
    set(PUMP, true, "auto pulse");
  }
}

static void autoFan(const Readings& r) {
  if (!isAuto(FAN) || !r.dhtOk) return;  // keep current state on a failed DHT read
  bool want = acts[FAN].on
    ? (r.tempC > rules.tempMax - FAN_TEMP_HYST || r.humidity > rules.humidityMax - FAN_HUMIDITY_HYST)
    : (r.tempC > rules.tempMax || r.humidity > rules.humidityMax);
  set(FAN, want, "auto");
}

static void autoLight() {
  if (!isAuto(LIGHT) || !timeSynced()) return;
  struct tm t;
  time_t now = time(nullptr);
  localtime_r(&now, &t);
  bool want;
  if (rules.lightOnHours == 0)       want = false;
  else if (rules.lightOnHours >= 24) want = true;
  else want = ((t.tm_hour - rules.lightOnHour + 24) % 24) < rules.lightOnHours;  // handles wrap past midnight
  set(LIGHT, want, "schedule");
}

void update(const Readings& r) {
  last = r;
  haveReadings = true;
  autoPump(r);
  autoFan(r);
  autoLight();
  if (stateDirty) publishState();
}

/*
  Timers and safety; runs every loop() regardless of MQTT state.
*/
void tick() {
  for (uint8_t i = 0; i < COUNT; i++) {
    Actuator& a = acts[i];

    // Hard safety limit (pump can never run longer than PUMP_MAX_ON_S at once).
    if (a.on && a.maxOnMs && millis() - a.onSince >= a.maxOnMs) {
      set((Id)i, false, "max on-time");
      a.manual = false;
    }
    // Timed manual override expired: turn off and hand back to auto.
    if (a.manual && a.timed && reached(a.overrideEnd)) {
      a.manual = false;
      set((Id)i, false, "override expired");
      if (haveReadings) update(last);
    }
  }

  // End of an auto pump pulse.
  if (acts[PUMP].on && !acts[PUMP].manual && millis() - acts[PUMP].onSince >= rules.pulseS * 1000UL) {
    set(PUMP, false, "pulse done");
  }

  // Light schedule is time-based, so check it here too (cheap) in case sensor reads are infrequent.
  static uint32_t lastLightCheck = 0;
  if (millis() - lastLightCheck >= 30000UL) {
    lastLightCheck = millis();
    autoLight();
  }

  if (stateDirty) publishState();
}

/*
  Commands (arrive on roots/<deviceId>/cmd):

  {"cmd":"actuator","target":"water_pump","state":"on","duration_s":10}
  {"cmd":"actuator","target":"fan","state":"off"}        manual until "auto"
  {"cmd":"actuator","target":"grow_light","state":"auto"} back to rules
  {"cmd":"rules","soil_min":30,"fan_auto":true,...}      partial update, persisted
  {"cmd":"pump_reset"}                                   clear pump fault
  {"cmd":"actuators"}                                    re-publish state + rules
*/
static void cmdActuator(JsonDocument& c) {
  const char* target = c["target"] | "";
  const char* state  = c["state"]  | "";
  int idx = findActuator(target);
  if (idx < 0) { Serial.printf("[act] unknown target: %s\n", target); return; }
  Id id = (Id)idx;
  Actuator& a = acts[id];

  if (strcmp(state, "auto") == 0) {
    a.manual = false;
    if (id == PUMP) set(PUMP, false, "auto resumed");
    if (haveReadings) update(last);
    stateDirty = true;
    publishState();
    return;
  }

  bool on;
  if      (strcmp(state, "on") == 0)     on = true;
  else if (strcmp(state, "off") == 0)    on = false;
  else if (strcmp(state, "toggle") == 0) on = !a.on;
  else { Serial.printf("[act] bad state: %s\n", state); return; }

  uint32_t dur = c["duration_s"] | 0;
  // Pump must always be timed: default PUMP_DEFAULT_S, capped at PUMP_MAX_ON_S.
  if (id == PUMP && on) {
    if (dur == 0) dur = PUMP_DEFAULT_S;
    dur = min<uint32_t>(dur, PUMP_MAX_ON_S);
    watering = false;
  }
  dur = min<uint32_t>(dur, 24UL * 3600UL);

  a.manual = true;
  a.timed  = dur > 0;
  a.overrideEnd = millis() + dur * 1000UL;
  set(id, on, "manual");
  stateDirty = true;
  publishState();
}

static void cmdRules(JsonDocument& c) {
  if (!c["water_pump_auto"].isNull()) rules.pumpAuto  = c["water_pump_auto"];
  if (!c["grow_light_auto"].isNull()) rules.lightAuto = c["grow_light_auto"];
  if (!c["fan_auto"].isNull())        rules.fanAuto   = c["fan_auto"];
  if (!c["soil_min"].isNull())        rules.soilMin     = constrain(c["soil_min"].as<float>(), 0.0f, 100.0f);
  if (!c["soil_target"].isNull())     rules.soilTarget  = constrain(c["soil_target"].as<float>(), 0.0f, 100.0f);
  if (!c["pulse_s"].isNull())         rules.pulseS      = constrain(c["pulse_s"].as<int>(), 1, (int)PUMP_MAX_ON_S);
  if (!c["soak_s"].isNull())          rules.soakS       = constrain(c["soak_s"].as<int>(), 10, 3600);
  if (!c["max_pulses"].isNull())      rules.maxPulses   = constrain(c["max_pulses"].as<int>(), 1, 50);
  if (!c["temp_max"].isNull())        rules.tempMax     = constrain(c["temp_max"].as<float>(), 0.0f, 60.0f);
  if (!c["humidity_max"].isNull())    rules.humidityMax = constrain(c["humidity_max"].as<float>(), 0.0f, 100.0f);
  if (!c["light_on_hour"].isNull())   rules.lightOnHour  = constrain(c["light_on_hour"].as<int>(), 0, 23);
  if (!c["light_on_hours"].isNull())  rules.lightOnHours = constrain(c["light_on_hours"].as<int>(), 0, 24);

  // Target must sit above the start threshold or the pump would never stop cleanly.
  if (rules.soilTarget <= rules.soilMin) rules.soilTarget = min(rules.soilMin + 10.0f, 100.0f);

  saveRules();
  Serial.println("[act] rules updated");
  if (haveReadings) update(last);
  publishRules();
  stateDirty = true;
  publishState();
}

bool handleCommand(JsonDocument& c) {
  const char* cmd = c["cmd"] | "";
  if      (strcmp(cmd, "actuator") == 0)  cmdActuator(c);
  else if (strcmp(cmd, "rules") == 0)     cmdRules(c);
  else if (strcmp(cmd, "pump_reset") == 0) { pumpFault = false; stateDirty = true; publishState(); }
  else if (strcmp(cmd, "actuators") == 0) publishAll();
  else return false;
  return true;
}

/*
  begin: drive every output to its OFF level before enabling it, so nothing
  twitches on at boot, then load saved rules.
*/
void begin(PublishFn publish) {
  publishFn = publish;
  for (uint8_t i = 0; i < COUNT; i++) {
    writePin(acts[i], false);
    pinMode(acts[i].pin, OUTPUT);
    writePin(acts[i], false);
  }
  prefs.begin("roots", false);
  loadRules();
}

}  // namespace actuators
#endif
