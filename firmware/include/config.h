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
