#include <Arduino.h>
#include "DHT.h"
//#include<WiFi.h>
//#include <HTTPClient.h>
#include "soc/rtc.h"
#include "HX711.h"
#include <Preferences.h>

#define LED 2
#define DHTPIN 15
#define DHTTYPE DHT11
#define LOADCELL_DOUT 16
#define LOADCELL_SCK 4
#define WEIGHT_OF_OBJECT_FOR_CALIBRATION 61
// margin of error for the load cell - 10g
#define THRESHOLD 5 
// time for the notification
#define CHECK_INTERVAL 10000

/*const float BETA = 3950;
const int LOADCELL_DOUT = 33;
const int LOADCELL_SCK = 32;*/
         
int state = LOW;            
int motionVal = 0;
/*float offset = 1.0;
float lastTemperature = -1000.0;
*/

bool show_Weighing_Results = false;
float CALIBRATION_FACTOR;

unsigned long timerStartMillis = 0;
bool isTimerRunning = false;
int lastWeight = 0;

HX711 LOADCELL_HX711;
Preferences preferences;
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

bool calibrateScale() {

  Serial.println();
  Serial.println("Do you want to calibrate the scale? (y/n)");

  while (!Serial.available()) {
    delay(100);
  }

  char input = Serial.read();
  Serial.println();
  Serial.print("Received: ");
  Serial.println(input);

  if (input == 'y' || input == 'Y') {
    if (!LOADCELL_HX711.is_ready()) {
      Serial.println("HX711 not found.");
      return false;
    }

    Serial.println("Clear the scale. Do not place any object.");
    delayCountdown(5);

    LOADCELL_HX711.set_scale();
    LOADCELL_HX711.tare();

    Serial.println("Place a known object (e.g. 61g) on the scale.");
    delayCountdown(5);

    long sensor_Reading_Results = LOADCELL_HX711.get_units(10);
    CALIBRATION_FACTOR = sensor_Reading_Results / WEIGHT_OF_OBJECT_FOR_CALIBRATION;

    preferences.putFloat("CFVal", CALIBRATION_FACTOR);
    float loaded = preferences.getFloat("CFVal", 0);

    LOADCELL_HX711.set_scale(loaded);

    Serial.print("Calibration complete. Factor: ");
    Serial.println(loaded);
    Serial.println("Ready to weigh!");

    show_Weighing_Results = true;
    return true;

  } else {
    float savedFactor = preferences.getFloat("CFVal", 0);
    if (savedFactor == 0) {
      Serial.println("No saved calibration found. Please calibrate first.");
      return false;
    }

    LOADCELL_HX711.set_scale(savedFactor);
    show_Weighing_Results = true;
    Serial.print("Using saved calibration factor: ");
    Serial.println(savedFactor);
    return true;
  }
}

void delayCountdown(byte seconds) {
  for (byte i = seconds; i > 0; i--) {
    Serial.println(i);
    delay(1000);
  }
}


void setup() {
  Serial.begin(115200);
  pinMode(LED, OUTPUT);
  //pinMode(MOTION_SENSOR, INPUT);
  Serial.print("Setup... ");
  LOADCELL_HX711.begin(LOADCELL_DOUT, LOADCELL_SCK);
  preferences.begin("CF", false);
  delay(500);
  /*Serial.print("Connecting to WiFi");
  WiFi.begin("Wokwi-GUEST", "", 6);
  while (WiFi.status() != WL_CONNECTED) {
    delay(100);
    Serial.print(".");
  }
  Serial.println("Connected!");*/
  calibrateScale();
  dht.begin();
  Serial.println("Done");
}


void loop() {
  /*motionVal = digitalRead(MOTION_SENSOR);   
  if (motionVal == HIGH) {           
    digitalWrite(LED, HIGH);   
    delay(100);                
    
    if (state == LOW) {
      Serial.println("Motion detected!"); 
      state = HIGH;      
    }
    
    if (sendNewMail() == 0){
      Serial.println("Error sending mail");
    } else {
      Serial.println("Mail sent successfully");
    }

  }
  else {
    digitalWrite(LED, LOW); 
    delay(200);             
    
    if (state == HIGH){
      Serial.println("Motion stopped!");
      state = LOW;    
    }

  }*/

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

  Serial.print("Weight: ");
  delay(500);
  int currentWeight = LOADCELL_HX711.get_units(10);
  Serial.print(currentWeight);
  Serial.println(" g");

  if (currentWeight > lastWeight + THRESHOLD) {
    Serial.println("📬 New object detected in mailbox... Starting timer");
    timerStartMillis = millis();
    isTimerRunning = true;
  }

  if (currentWeight < lastWeight && currentWeight < THRESHOLD) {
    Serial.println("✅ Mailbox checked!");
    if (isTimerRunning){
      isTimerRunning = false;
    }
  }

  if (isTimerRunning && millis() - timerStartMillis >= CHECK_INTERVAL) {
    Serial.println("⏳ Mailbox not checked yet!");
    timerStartMillis = millis();  // Reset timer for next check
  }

  lastWeight = currentWeight;

  delay(1000);
}
