#include <Arduino.h>
#include <WiFi.h>
#include "HX711.h"

const float BETA = 3950;
const int LOADCELL_DOUT = 33;
const int LOADCELL_SCK = 32;
const float SCALE_FACTOR = 0.42;
const int LED = 12;
const int MOTION_SENSOR = 34;
const int TEMPERATURE_SENSOR = 35;
         
int state = LOW;            
int motionVal = 0;
float offset = 1.0;
float lastTemperature = -1000.0;

HX711 scale;

void setup() {
  Serial.begin(115200);
  Serial.println("Hello, ESP32!");
  pinMode(LED, OUTPUT);
  pinMode(MOTION_SENSOR, INPUT);
  scale.begin(LOADCELL_DOUT, LOADCELL_SCK);
  scale.set_scale(SCALE_FACTOR);
  scale.tare(); 
  Serial.print("Connecting to WiFi");
  WiFi.begin("Wokwi-GUEST", "", 6);
  while (WiFi.status() != WL_CONNECTED) {
    delay(100);
    Serial.print(".");
  }
  Serial.println(" Connected!");
}

void loop() {
  motionVal = digitalRead(MOTION_SENSOR);   
  if (motionVal == HIGH) {           
    digitalWrite(LED, HIGH);   
    delay(100);                
    
    if (state == LOW) {
      Serial.println("Motion detected! Counting 2 seconds..."); 
      state = HIGH;      
    }
  } 
  else {
      digitalWrite(LED, LOW); 
      delay(200);             
      
      if (state == HIGH){
        Serial.println("Motion stopped!");
        state = LOW;    
    }
  }

  int analogmotionValue = analogRead(TEMPERATURE_SENSOR);
  // analog read in esp32 0-4095 ; in arduino 0-1023
  float celsius = 1 / (log(1 / (4095. / analogmotionValue - 1)) / BETA + 1.0 / 298.15) - 273.15;
  
  if (abs(celsius - lastTemperature) >= offset) {
    String temp = (String) celsius;
    Serial.print("Temperature: ");
    Serial.print(celsius);
    Serial.println(" °C");
    lastTemperature = celsius;
  }

  Serial.print("Weight: ");
  Serial.print(scale.get_units(), 1);
  Serial.println(" g");

  delay(1000);
}
