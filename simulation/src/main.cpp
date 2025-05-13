#include <Arduino.h>
#include <MD_Parola.h>
#include <MD_MAX72xx.h>

#define HARDWARE_TYPE MD_MAX72XX::PAROLA_HW
#define MAX_DEVICES 4
#define CS_PIN 10
MD_Parola myDisplay = MD_Parola(HARDWARE_TYPE, CS_PIN, MAX_DEVICES);

const float BETA = 3950;
int led = 12;               
int sensor = 2;       
int state = LOW;            
int val = 0;            

void setup() {
  pinMode(led, OUTPUT);      
  pinMode(sensor, INPUT);    
  Serial.begin(9600);        
  myDisplay.begin();
  myDisplay.setIntensity(0);
  myDisplay.displayClear();
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
  Serial.println(temp);
  myDisplay.print(temp);
  delay(1000);
}