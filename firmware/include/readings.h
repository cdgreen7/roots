#pragma once

/*
  Readings struct holds the latest sensor readings.
  Shared by main.cpp (publishing) and actuators.cpp (auto rules).
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
