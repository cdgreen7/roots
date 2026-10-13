#pragma once
/*
  Actuator control for the Roots board: water pump, grow light, fan.

  Each actuator is in one of two modes:
    auto   - driven by on-device rules (soil_min / temp_max / humidity_max / light schedule)
    manual - driven by "actuator" commands from the app/backend

  Rules live on the board (persisted in NVS) so plants are still cared for
  if the Wi-Fi or server goes down. The backend pushes rule changes with a "rules" command.

  Compiles to no-ops when ACTUATORS_ENABLED is 0 (sensor-only boards).
*/
#include <Arduino.h>
#include <ArduinoJson.h>
#include "config.h"
#include "readings.h"

namespace actuators {

// Publishes payload to roots/<deviceId>/<subtopic>. Provided by main.cpp.
using PublishFn = bool (*)(const char* subtopic, const char* payload, bool retained);

#if ACTUATORS_ENABLED
void begin(PublishFn publish);              // call first in setup(): drives all outputs OFF
void update(const Readings& r);             // run auto rules with fresh readings
void tick();                                // timers / safety cut-offs; call every loop()
bool handleCommand(JsonDocument& cmd);      // returns true if the command was an actuator command
void publishAll();                          // retained state + rules (call on MQTT connect)
#else // Actuators disabled, compile the functions with nothing in them so the rest of the code doesn't need #if ACTUATORS_ENABLED checks (and no overhead for sensor-only boards).
inline void begin(PublishFn) {}
inline void update(const Readings&) {}
inline void tick() {}
inline bool handleCommand(JsonDocument&) { return false; }
inline void publishAll() {}
#endif

}  // namespace actuators
