/*
  Roots Sensor Test

  What this does:
    Every 2 seconds it reads each sensor on the Roots board and prints the results
    to the Serial Monitor. Since the usual firmware is under development, this is a simple way to check 
    that the sensors are working and that the wiring is correct, and hopefully make it easier to understand
    how the sensors work from the development perspective.

    Check the readme for how to wire the sensors to the ESP32 and how to use this test sketch.

*/
#include <Arduino.h>
#include <Wire.h>              // I2C communication (used by the light sensor)
#include <DHT.h>               // Temperature + humidity sensor
#include <Adafruit_Sensor.h>
#include <Adafruit_TSL2591.h>  // Light sensor


// Which ESP32 pin (GPIO number) each sensor is wired to.On the ESP32Devkit V1, the GPIO pins are labeled with "D" then the GPIO number.
// The soil sensor must be on GPIO 32-39, because the other analog pins stop working once Wi-Fi is turned on in the main firmware.

#define PIN_DHT       4    // DHT11 "DATA" wire
#define DHT_TYPE      DHT11
#define PIN_SOIL      34   // Soil sensor "AOUT" wire
#define PIN_LUX_SDA   21   // Light sensor "SDA" wire
#define PIN_LUX_SCL   22   // Light sensor "SCL" wire

// See README for how to calibrate the soil sensor. The values below are just a starting point for testing.
#define SOIL_RAW_DRY  3000
#define SOIL_RAW_WET  1300

// Time between readings, in milliseconds (2000 ms = 2 seconds).
// Don't go below 2000: the DHT11 can't be read faster than that.
#define READ_INTERVAL_MS 2000



DHT dht(PIN_DHT, DHT_TYPE);
Adafruit_TSL2591 tsl(2591);   // 2591 is just an ID number the library asks for
bool lightSensorFound = false;
int readingNumber = 0;

/*
  readAnalogAverage reads a pin several times and returns the average.
  Single analog readings on the ESP32 jump around a bit, so averaging smooths them out.
*/
int readAnalogAverage(int pin, int samples = 16) {
  long total = 0;
  for (int i = 0; i < samples; i++) {
    total += analogRead(pin);
    delay(2);
  }
  return total / samples;
}

/*
  toPercent turns a raw reading into 0-100% using the two calibration values.
  It works even when the numbers run "backwards" (the soil sensor reads LOWER when wet).
*/
float toPercent(int raw, int rawAt0Percent, int rawAt100Percent) {
  float percent = (raw - rawAt0Percent) * 100.0 / (rawAt100Percent - rawAt0Percent);
  return constrain(percent, 0.0, 100.0);   // clamp to the 0-100 range
}

/*
  printTemperatureAndHumidity reads the DHT11.
  If the read fails, the library returns "NAN" (not a number) instead of a value.
  That's almost always a loose DATA wire or a missing pull-up resistor.
*/
void printTemperatureAndHumidity() {
  float tempC    = dht.readTemperature();
  float humidity = dht.readHumidity();

  Serial.print("  Temperature/Humidity (DHT11): ");
  if (isnan(tempC) || isnan(humidity)) {
    Serial.println("read FAILED - check the DATA wire on GPIO 4");
    return;
  }

  float tempF = tempC * 9.0 / 5.0 + 32.0;
  Serial.print(tempC, 1);       // the ", 1" means "show 1 decimal place"
  Serial.print(" C / ");
  Serial.print(tempF, 1);
  Serial.print(" F, humidity ");
  Serial.print(humidity, 1);
  Serial.println("%");
}

/*
  printSoilMoisture reads the capacitive soil sensor.
  The ESP32 measures the sensor's voltage as a number from 0 to 4095 (the "raw" value).
  We then convert that to a moisture percentage using the calibration values above.
*/
void printSoilMoisture() {
  int raw         = readAnalogAverage(PIN_SOIL);
  float moisture  = toPercent(raw, SOIL_RAW_DRY, SOIL_RAW_WET);

  Serial.print("  Soil moisture:                ");
  Serial.print(moisture, 1);
  Serial.print("%   (raw ");
  Serial.print(raw);
  Serial.print(", calibrated dry=");
  Serial.print(SOIL_RAW_DRY);
  Serial.print(" wet=");
  Serial.print(SOIL_RAW_WET);
  Serial.println(")");
}

/*
  readLux asks the light sensor for a brightness reading in lux.

  "Gain" is like the sensitivity setting on a camera: high gain is good for dim
  rooms, low gain is good for bright sunlight. If the gain is too high for the
  current light, the sensor gets overwhelmed ("saturated") and the library
  returns a negative number instead of a real lux value.
*/
float readLux(tsl2591Gain_t gain) {
  tsl.setGain(gain);

  // The sensor has two light detectors and returns both readings packed into one number:
  //   - "full": all light, visible + infrared
  //   - "ir":   infrared only
  // The library uses both to calculate how bright the light looks to a human eye (lux).
  uint32_t bothReadings = tsl.getFullLuminosity();
  uint16_t ir   = bothReadings >> 16;      // top half of the number
  uint16_t full = bothReadings & 0xFFFF;   // bottom half of the number

  return tsl.calculateLux(full, ir);
}

/*
  printLight reads the TSL2591 light sensor. It tries medium sensitivity first,
  and if that's too sensitive for the current light, it tries again at low.
*/
void printLight() {
  Serial.print("  Light (TSL2591):              ");
  if (!lightSensorFound) {
    Serial.println("NOT FOUND - check SDA (GPIO 21) and SCL (GPIO 22) wires");
    return;
  }

  String sensitivity = "medium";
  float lux = readLux(TSL2591_GAIN_MED);

  if (lux < 0) {   // too bright for medium sensitivity, so try low
    sensitivity = "low";
    lux = readLux(TSL2591_GAIN_LOW);
  }

  if (lux < 0) {
    Serial.println("too bright to measure, even at low sensitivity");
    return;
  }

  Serial.print(lux, 1);
  Serial.print(" lux   (sensitivity: ");
  Serial.print(sensitivity);
  Serial.println(")");
}

/*
  setup() runs once when the ESP32 powers on or resets.
*/
void setup() {
  Serial.begin(115200);
  delay(1000);  // give the Serial Monitor a moment to connect
  Serial.println();
  Serial.println("Roots sensor test!");

  // Set up the analog pin: readings will range 0-4095 across the full 0-3.3 V range.
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);

  dht.begin();

  // Start I2C on our pins, then look for the light sensor.
  Wire.begin(PIN_LUX_SDA, PIN_LUX_SCL);
  lightSensorFound = tsl.begin();
  if (lightSensorFound) {
    tsl.setTiming(TSL2591_INTEGRATIONTIME_100MS);  // how long each light reading takes
    Serial.println("Light sensor found.");
  } else {
    Serial.println("Light sensor NOT found! Check the SDA/SCL wiring.");
  }
}

/*
  loop() runs over and over forever after setup() finishes.
*/
void loop() {
  readingNumber++;
  int secondsSinceStart = millis() / 1000;   // millis() = milliseconds since power-on

  Serial.println();
  Serial.print("--- Reading #");
  Serial.print(readingNumber);
  Serial.print("  (");
  Serial.print(secondsSinceStart);
  Serial.println(" seconds since start) ---");

  printTemperatureAndHumidity();
  printSoilMoisture();
  printLight();

  delay(READ_INTERVAL_MS);
}
