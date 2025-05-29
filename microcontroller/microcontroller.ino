#include <Arduino.h>
#include "DHT.h"
//#include<WiFi.h>
//#include <HTTPClient.h>
//#include "HX711.h"

#define DHTPIN 2 
#define DHTTYPE DHT11

/*const float BETA = 3950;
const int LOADCELL_DOUT = 33;
const int LOADCELL_SCK = 32;
const float SCALE_FACTOR = 0.42;*/
const int LED = 2;
const int MOTION_SENSOR = 27;
const int TEMPERATURE_HUMIDITY_SENSOR = 2;
         
int state = LOW;            
int motionVal = 0;
/*float offset = 1.0;
float lastTemperature = -1000.0;

HX711 scale;*/

DHT dht(DHTPIN, DHTTYPE);

/*int sendNewMail() {
  Serial.println("Sending new mail...");
  HTTPClient http;
  http.begin("http://backend-winter-hill-842.fly.dev/cartas");
  http.addHeader("Content-Type", "application/x-www-form-urlencoded");
  int httpRespondCode = http.POST("dummy=1");

  Serial.println(httpRespondCode);
  http.end();

  if (httpRespondCode > 0) {
    return 1;
  } else {
    return 0;
  }

}*/


void setup() {
  Serial.begin(115200);
  pinMode(LED, OUTPUT);
  pinMode(MOTION_SENSOR, INPUT);
  Serial.println("Hello, ESP32!");
  /*scale.begin(LOADCELL_DOUT, LOADCELL_SCK);
  scale.set_scale(SCALE_FACTOR);
  scale.tare(); 
  Serial.print("Connecting to WiFi");
  WiFi.begin("Wokwi-GUEST", "", 6);
  while (WiFi.status() != WL_CONNECTED) {
    delay(100);
    Serial.print(".");
  }
  Serial.println("Connected!");*/
  dht.begin();
}

void loop() {
  motionVal = digitalRead(MOTION_SENSOR);   
  if (motionVal == HIGH) {           
    digitalWrite(LED, HIGH);   
    delay(100);                
    
    if (state == LOW) {
      Serial.println("Motion detected!"); 
      state = HIGH;      
    }
    
    /*if (sendNewMail() == 0){
      Serial.println("Error sending mail");
    } else {
      Serial.println("Mail sent successfully");
    }*/

  } 
  else {
      digitalWrite(LED, LOW); 
      delay(200);             
      
      if (state == HIGH){
        Serial.println("Motion stopped!");
        state = LOW;    
    }

    float humidity = dht.readHumidity();
    float temp = dht.readTemperature();

    // Check if any reads failed and exit early (to try again).
    if (isnan(humidity) || isnan(temp)) {
      Serial.println(F("Failed to read from DHT sensor!"));
      return;
    }

    Serial.print("Temperature: ");
    Serial.print(temp);
    Serial.println(" °C");

    Serial.print("Humidity: ");
    Serial.print(humidity);
    Serial.println(" %");

  }

  /*int analogmotionValue = analogRead(TEMPERATURE_SENSOR);
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
  Serial.println(" g");*/

  delay(1000);
}
