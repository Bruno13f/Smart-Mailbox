#include <Arduino.h>
#include "HX711.h"

const float BETA = 3950;
const int LOADCELL_DOUT = 7;
const int LOADCELL_SCK = 6;
const float SCALE_FACTOR = 0.42;

int led = 12;               
int sensor = 2;    
int state = LOW;            
int val = 0;

HX711 scale;

void setup() {
  pinMode(led, OUTPUT);      
  pinMode(sensor, INPUT);    
  Serial.begin(9600);
  scale.begin(LOADCELL_DOUT, LOADCELL_SCK);
  scale.set_scale(SCALE_FACTOR);
  scale.tare(); 
}

void loop(){
  val = digitalRead(sensor);   
  if (val == HIGH) {           
    digitalWrite(led, HIGH);   
    delay(100);                
    
    if (state == LOW) {
      Serial.println("Motion detected! Counting 2 seconds..."); 
      state = HIGH;      
    }
  } 
  else {
      digitalWrite(led, LOW); 
      delay(200);             
      
      if (state == HIGH){
        Serial.println("Motion stopped!");
        state = LOW;    
    }
  }

  int analogValue = analogRead(A0);
  float celsius = 1 / (log(1 / (1023. / analogValue - 1)) / BETA + 1.0 / 298.15) - 273.15;
  String temp = (String) celsius;
  Serial.print("Temperature: ");
  Serial.print(celsius);
  Serial.println(" °C");

  Serial.print("Weight: ");
  Serial.print(scale.get_units(), 1);
  Serial.println(" g");
  
  delay(1000);
  
}