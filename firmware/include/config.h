#pragma once
#include "secrets.h"

// MQTT / Mosquitto settings
#define MQTT_HOST     "192.168.1.100"   // machine running the Mosquitto container
#define MQTT_PORT     1883
#define TOPIC_ROOT    "roots"           // topics: roots/<deviceId>/...

// Sensor Pin Assignments
// Analog sensors MUST be on ADC1 (GPIO 32-39); ADC2 is unusable while Wi-Fi is on.
#define PIN_DHT       4
#define DHT_TYPE      DHT11
#define PIN_SOIL      34
#define PIN_LUX_SDA   21
#define PIN_LUX_SCL   22

// Calibration values for sensors
// Read raw values in air / in water and input them here.
#define SOIL_RAW_DRY  3000
#define SOIL_RAW_WET  1300

// Timing 
#define SENSOR_DATA_SEND_INTERVAL 10000UL // 10 seconds
#define WIFI_CONNECT_TIMEOUT      20000UL   // 20 seconds before restarting
#define MQTT_RETRY_INTERVAL       5000UL    // 5 seconds between broker reconnects


// Actuators
// Set to 0 for a sensor-only board; all actuator code compiles out.
#define ACTUATORS_ENABLED 1

// Output pins (plain GPIOs, not strapping pins, not ADC1 so analog inputs stay free).
#define PIN_PUMP      25
#define PIN_LIGHT     26
#define PIN_FAN       27

// true  = output goes LOW to switch on (most relay boards)
// false = output goes HIGH to switch on (logic-level MOSFET modules)
#define PUMP_ACTIVE_LOW   false
#define LIGHT_ACTIVE_LOW  false
#define FAN_ACTIVE_LOW    false

// Pump safety
#define PUMP_DEFAULT_S    5      // manual "on" with no duration
#define PUMP_MAX_ON_S     30     // hard cap per run, manual or auto

// Soil readings outside this raw range mean a disconnected/shorted sensor; never water on them.
#define SOIL_RAW_MIN_VALID  200
#define SOIL_RAW_MAX_VALID  3900

// Fan hysteresis so it doesn't chatter around the threshold.
#define FAN_TEMP_HYST       1.0f  // C
#define FAN_HUMIDITY_HYST   5.0f  // %

// How often sensors are read for the control loop (independent of the publish interval).
#define CONTROL_INTERVAL    10000UL

// Time zone for the grow light schedule (POSIX TZ string; Alaska).
#define TZ_INFO     "AKST9AKDT,M3.2.0,M11.1.0"
#define NTP_SERVER1 "pool.ntp.org"
#define NTP_SERVER2 "time.nist.gov"
