/*
  Roots Firmware.
  This firmware is designed for an ESP32-based sensor board.
  It reads temperature, humidity, soil moisture, and light level.
  It connects to a Wi-Fi network and publishes sensor readings to an MQTT broker in JSON format. 
  It also listens for commands via MQTT to trigger readings or change the data send interval.


  Note: the DHT sensor is read only once per data send interval to avoid overloading it, as it can be slow and unreliable if read too frequently.
  Note: Debug statements are printed to the Serial console for monitoring and troubleshooting, these get dropped if no Serial monitor is connected.
*/
#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_TSL2591.h>
#include "config.h"

/*
  Globals
*/
WiFiClient net;
PubSubClient mqtt(net);
DHT dht(PIN_DHT, DHT_TYPE);
Adafruit_TSL2591 tsl(2591);
bool tslFound = false;

String deviceId;
String topicSensorData, topicStatus, topicCmd;

uint32_t dataSendIntervalMS = SENSOR_DATA_SEND_INTERVAL;
uint32_t lastSend = 0;
uint32_t lastMqttAttempt = 0;

/*
  Readings struct holds the latest sensor readings.
  This is what gets serialized to JSON and sent to the backend.
*/
struct Readings {
  bool  dhtOk;
  float tempC;
  float humidity;
  int   soilRaw;
  float soilPct;
  bool  lightOk;
  float lux;
};


/*
  readAnalogAvg reads the given pin multiple times and returns the average. 
  Helpful for smoothing out noise in the readings.
*/
static int readAnalogAvg(uint8_t pin, uint8_t samples = 16) {
  uint32_t sum = 0;
  for (uint8_t i = 0; i < samples; i++) {
    sum += analogRead(pin);
    delay(2);
  }
  return sum / samples;
}


/*
  toPercent converts a raw sensor reading to a percentage based on the given calibration values.
  Helpful for analog sensors like soil moisture, which have different ranges depending on the sensor and environment.
  Works whether raw0 is above or below raw100 (the soil sensor reads lower when wet).
*/
static float toPercent(int raw, int raw0, int raw100) {
  float pct = (float)(raw - raw0) * 100.0f / (float)(raw100 - raw0);
  return constrain(pct, 0.0f, 100.0f);
}


/*
  readLux reads the TSL2591 and returns lux, or NAN on failure.
  Starts at medium gain; if the sensor saturates (bright sun), retries at low gain.
*/
static float readLux() {
  // If the TSL2591 light sensor is not found, return NAN to indicate failure.
  if (!tslFound) return NAN;

  // Start with medium gain; if the sensor saturates (bright sun), retry at low gain.
  tsl.setGain(TSL2591_GAIN_MED); 

  // Returns a 32-bit value with IR in the upper 16 bits and full spectrum in the lower 16 bits.
  uint32_t lum = tsl.getFullLuminosity(); 
  // Extract the IR and full spectrum values from the 32-bit luminosity value.
  uint16_t ir = lum >> 16, full = lum & 0xFFFF; 
  // Calculate lux from the full spectrum and IR values.
  float lux = tsl.calculateLux(full, ir); 

  if (lux < 0) {  // saturated
    tsl.setGain(TSL2591_GAIN_LOW);
    lum = tsl.getFullLuminosity();
    ir = lum >> 16; full = lum & 0xFFFF;
    lux = tsl.calculateLux(full, ir);
  }
  return (lux < 0) ? NAN : lux;
}


/*
  readSensors reads all the sensors and returns a Readings struct with the latest values.
*/
Readings readSensors() {
  Readings read;
  read.tempC    = dht.readTemperature();
  read.humidity = dht.readHumidity();
  read.dhtOk    = !isnan(read.tempC) && !isnan(read.humidity);

  read.soilRaw  = readAnalogAvg(PIN_SOIL);
  read.soilPct  = toPercent(read.soilRaw, SOIL_RAW_DRY, SOIL_RAW_WET);

  read.lux     = readLux();
  read.lightOk = !isnan(read.lux);
  return read;
}


/*
  sendData reads the sensors, serializes the readings to JSON, and publishes them to the MQTT broker.
  calls readSensors() to get the latest readings, then constructs a JSON document with the device ID, uptime, and sensor values.
  If the DHT sensor read fails, it sets the temperature and humidity fields to null in the JSON document, which the backend can interpret as a failed reading.
*/
void sendData() {
  Readings read = readSensors();

  JsonDocument sensorData;
  // Add the device ID and uptime in seconds to the JSON document.
  sensorData["device_id"] = deviceId;
  sensorData["uptime_s"]  = millis() / 1000;
  // Add the sensor readings to the JSON document. If the DHT sensor read failed, set the temperature and humidity fields to null.
  if (read.dhtOk) {
    sensorData["temp_c"]   = serialized(String(read.tempC, 1));
    sensorData["humidity"] = serialized(String(read.humidity, 1));
  } else {
    sensorData["temp_c"]   = nullptr;     
    sensorData["humidity"] = nullptr;
  }
  // Add the soil moisture to the JSON document, both as raw values and as percentages.
  sensorData["soil_pct"]  = serialized(String(read.soilPct, 1));
  sensorData["soil_raw"]  = read.soilRaw;
  // Add the light level to the JSON document. If the light sensor read failed, set the lux field to null.
  if (read.lightOk) {
    sensorData["light_lux"] = serialized(String(read.lux, 1));
  } else {
    sensorData["light_lux"] = nullptr;
  }
  sensorData["rssi"] = WiFi.RSSI();
  // Serialize the JSON document to a buffer and publish it to the MQTT broker. Print the result to Serial for debugging.
  // At most, the buffer should be less than 180 bytes, but we use 256 to be safe. 
  char buf[256];
  size_t n = serializeJson(sensorData, buf, sizeof(buf));
  // If the serialized JSON somehow exceeds the buffer size, print an error and return without publishing.
  if (n >= sizeof(buf)) {
    Serial.println("[pub FAIL] payload truncated");
    return;
  }
  bool ok = mqtt.publish(topicSensorData.c_str(), buf, n);
  Serial.printf("[pub %s] %s\n", ok ? "OK" : "FAIL", buf);
}

/*
  onMessage is the MQTT callback that gets called when a message is received on a subscribed topic.
  It deserializes the JSON payload and checks for a "cmd" field.
  "read":     sends the latest sensor readings immediately and restarts the send timer.
  "interval": sets the send interval to "seconds" (5-3600).
  Anything else is logged as unknown.
*/
void onMessage(char* topic, byte* payload, unsigned int len) {
  JsonDocument command;
  // Deserialize the JSON payload. If it fails, print an error and return.
  if (deserializeJson(command, payload, len)) {
    Serial.println("[cmd] bad JSON");
    return;
  }
  const char* cmd = command["cmd"] | "";
  // If the command is "read", send the latest sensor readings immediately and restart the send timer.
  if (strcmp(cmd, "read") == 0) {
    sendData();
    lastSend = millis(); 
  } else if (strcmp(cmd, "interval") == 0) {
    uint32_t s = command["seconds"] | 0;
    // If the command is "interval", set the send interval to "seconds" (5-3600). If out of range, print an error.
    if (s >= 5 && s <= 3600) {
      dataSendIntervalMS = s * 1000UL;
      Serial.printf("[cmd] interval = %lus\n", (unsigned long)s);
    } else {
      Serial.printf("[cmd] interval out of range (5-3600): %lu\n", (unsigned long)s);
    }
  } else {
    Serial.printf("[cmd] unknown: %s\n", cmd);
  }
}

/*
  connectWiFi connects to the Wi-Fi network using the credentials in secrets.h.
  Waits up to WIFI_CONNECT_TIMEOUT, printing dots to Serial. If it can't connect,
  it restarts the board to try again from a clean state.
  After the first connection, the ESP32 reconnects automatically if Wi-Fi drops.
*/
void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Wi-Fi connecting");

  uint32_t start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < WIFI_CONNECT_TIMEOUT) {
    delay(500);
    Serial.print(".");
  }
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("\nWi-Fi failed, restarting");
    delay(1000);
    ESP.restart();
  }
  Serial.printf("\nWi-Fi OK, IP %s\n", WiFi.localIP().toString().c_str());
}

/*
  connectMqtt connects to the MQTT broker using the credentials in secrets.h.
  Sets a Last Will so the broker publishes a retained "offline" status if the board drops off.
  On success, publishes a retained "online" status and subscribes to the command topic.
  On failure, prints the error code to Serial. loop() retries every MQTT_RETRY_INTERVAL.
*/
bool connectMqtt() {
  const char* user = strlen(MQTT_USER) ? MQTT_USER : nullptr;
  const char* pass = strlen(MQTT_PASS) ? MQTT_PASS : nullptr;

  // Last Will: broker publishes "offline" (retained) if the board drops off.
  bool ok = mqtt.connect(deviceId.c_str(), user, pass, topicStatus.c_str(), 1, true, "offline");

  // If the connection is successful, publish "online" and subscribe to the command topic. Otherwise, print an error message.
  if (ok) {
    mqtt.publish(topicStatus.c_str(), "online", true);
    mqtt.subscribe(topicCmd.c_str(), 1);
    Serial.println("MQTT connected");
  } else {
    Serial.printf("MQTT failed, rc=%d\n", mqtt.state());
  }
  return ok;
}

/*
  setupSensors initializes the ADC, the DHT sensor, and the TSL2591 light sensor over I2C.
*/
void setupSensors() {
  analogReadResolution(12);         // 0-4095
  analogSetAttenuation(ADC_11db);   // full 0-3.3 V range
  dht.begin();

  Wire.begin(PIN_LUX_SDA, PIN_LUX_SCL);
  tslFound = tsl.begin();
  if (tslFound) {
    tsl.setTiming(TSL2591_INTEGRATIONTIME_100MS);
    Serial.println("TSL2591 found");
  } else {
    Serial.println("TSL2591 NOT found! Check SDA/SCL wiring");
  }
}

/*
  setupDeviceId builds a unique device ID from the MAC address and the MQTT topic strings.
  Must run after connectWiFi() so the Wi-Fi hardware is initialized.
*/
void setupDeviceId() {
  uint8_t mac[6];
  WiFi.macAddress(mac);
  char id[20];
  snprintf(id, sizeof(id), "roots-%02x%02x%02x", mac[3], mac[4], mac[5]);
  deviceId = id;

  String base     = String(TOPIC_ROOT) + "/" + deviceId;
  topicSensorData = base + "/sensordata";
  topicStatus     = base + "/status";
  topicCmd        = base + "/cmd";
  Serial.printf("Device ID: %s\n", deviceId.c_str());
}

/*
  setupMqtt configures the MQTT client. The actual connection happens in loop().
*/
void setupMqtt() {
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(onMessage);
  mqtt.setBufferSize(512);
  mqtt.setKeepAlive(30);
}

/*
  setup runs once at boot, initializing Serial, sensors, Wi-Fi, device ID, and MQTT.
*/
void setup() {
  Serial.begin(115200);
  setupSensors();
  connectWiFi();
  setupDeviceId();
  setupMqtt();
}

/*
  loop runs the main application logic, handling MQTT connection management and sensor data transmission.
*/
void loop() {
  // If the MQTT client is not connected, attempt to reconnect every 5 seconds.
  if (!mqtt.connected()) {
    uint32_t now = millis();
    // If 5 seconds have passed since the last attempt, try to connect to the MQTT broker.
      if (now - lastMqttAttempt >= MQTT_RETRY_INTERVAL) {
      lastMqttAttempt = now;
      if (WiFi.status() == WL_CONNECTED) connectMqtt();
    }
    return;
  }
  // If connected, call mqtt.loop() to process incoming messages and maintain the connection.
  mqtt.loop();

  // If the data send interval has elapsed, read the sensors and send the data.
  if (millis() - lastSend >= dataSendIntervalMS) {
    lastSend = millis();
    sendData();
  }
}
