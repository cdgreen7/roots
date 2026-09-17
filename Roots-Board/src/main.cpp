#include <Arduino.h>
#include <Wire.h>
#include <DHT.h>
#include <Adafruit_TSL2591.h>

// soil moisture (capacitive v2.0.0, with analog output)
#define SOIL_PIN 34 // ADC1 pin, (a pin that is safe to use alongside WiFi)

// Calibrate these for your sensor!
// raw reading in air (dry) and fully submerged in water (wet). (Capacitive sensors will read higher when dry vs wet)
const int SOIL_DRY = 3000;
const int SOIL_WET = 1200;

// DHT11 (TEMP/HUMIDITY)
#define DHT_PIN 4
#define DHT_TYPE DHT11
DHT dht(DHT_PIN, DHT_TYPE);

// TSL2591 (I2C SENSOR, use the following: SDA=21, SCL=22 on ESP32 DevKit )
Adafruit_TSL2591 tsl = Adafruit_TSL2591(2591);

void setupTSL2591() {
  tsl.setGain(TSL2591_GAIN_MED);
  tsl.setTiming(TSL2591_INTEGRATIONTIME_300MS);
}

// SETUP process for board with the sensors
void setup() {
  Serial.begin(115200);
  delay(1000);

  dht.begin();

  if (!tsl.begin()) {
    Serial.println("TSL2591 not found - check wiring");
    while (1) delay(1000);
  }
  setupTSL2591();

  Serial.println("Sensors initialized");
}

// read the different metrics, print them over serial connection
void loop() {
  // Soil moisture
  int soilRaw = analogRead(SOIL_PIN);
  int soilPercent = map(soilRaw, SOIL_DRY, SOIL_WET, 0, 100);
  soilPercent = constrain(soilPercent, 0, 100);

  // Temp / Humidity (DHT Sensor)
  float humidity = dht.readHumidity();
  float tempC = dht.readTemperature();

  // Light sensor (TSL2591)
  uint32_t lum = tsl.getFullLuminosity();
  uint16_t ir = lum >> 16;
  uint16_t full = lum & 0xFFFF;
  float lux = tsl.calculateLux(full, ir);

  Serial.println("- Sensor Readings -");

  Serial.print("Soil moisture: ");
  Serial.print(soilPercent);
  Serial.print("% (raw: ");
  Serial.print(soilRaw);
  Serial.println(")");

  if (isnan(humidity) || isnan(tempC)) {
    Serial.println("DHT11 read failed");
  } else {
    Serial.print("Temperature: ");
    Serial.print(tempC);
    Serial.println(" C");
    Serial.print("Humidity: ");
    Serial.print(humidity);
    Serial.println(" %");
  }

  Serial.print("Light: ");
  Serial.print(lux);
  Serial.println(" lux");

  Serial.println();
  delay(2000);
}
