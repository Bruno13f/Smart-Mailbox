#include <Arduino.h>
#include "DHT.h"
#include<WiFi.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include "soc/rtc.h"
#include "HX711.h"
#include <Preferences.h>

#define LED 2
#define DHTPIN 15
#define DHTTYPE DHT11
#define LOADCELL_DOUT 16
#define LOADCELL_SCK 4
#define MOTION_SENSOR 27
// margin of error for the load cell - 10g
#define THRESHOLD_WEIGHT 5 
// margin of error for the temp and hum sensor - 2
#define THRESHOLD_TEMP_HUM 1
// time for the notification
#define CHECK_INTERVAL 10000

#define NEW_MAIL 0
#define NEW_TEMP 1
#define NEW_HUM 2
#define NEW_REMINDER 3
#define EMPTY_MAILBOX 4

/*const float BETA = 3950;
const int LOADCELL_DOUT = 33;
const int LOADCELL_SCK = 32;*/

const char* base_url = "http://192.168.1.91:3000";
const char* ssid = "";
const char* password = "";

float weight_of_object_for_calibration;
bool isCalibrated = false;
         
int state = LOW;            
int motionVal = 0;

bool show_Weighing_Results = false;
float CALIBRATION_FACTOR;

unsigned long timerStartMillis = 0;
bool isTimerRunning = false;
int lastWeight = 0;

float lastTemp = -1000.0;
float lastHumidity = -1000.0;

HX711 LOADCELL_HX711;
Preferences preferences;
DHT dht(DHTPIN, DHTTYPE);

bool sendAPIRequest(int type, float value) {

  Serial.println("Sending new request...");

  HTTPClient http;
  String url;
  String payload;
  StaticJsonDocument<200> doc;

  switch(type) {
    case NEW_MAIL:
      url = String(base_url) + "/mail";
      doc["mail"] = true;
      break;

    case NEW_TEMP:
      url = String(base_url) + "/temperature";
      doc["temperature"] = value;
      break;

    case NEW_HUM:
      url = String(base_url) + "/humidity";
      doc["humidity"] = value;
      break;

    case NEW_REMINDER:
      url = String(base_url) + "/reminderMail";
      doc["flag"] = true;
      break;

    case EMPTY_MAILBOX:
      url = String(base_url) + "/reminderMail";
      doc["flag"] = false;
      break;

    default:
      Serial.println("Invalid request type.");
      return false;
  }

  serializeJson(doc, payload);

  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  int httpRespondCode = http.POST(payload);

  Serial.print("HTTP Response code: ");
  Serial.println(httpRespondCode);

  http.end();

  return httpRespondCode > 0;
}

void sendOneM2MSetup() {
  Serial.println("Setting up oneM2M...");

  HTTPClient http;
  String url = String(base_url) + "/setupOneM2M";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Client-Type", "esp32");
  
  // Set timeout for the HTTP connection (not streaming)
  http.setTimeout(20000);  // Timeout for establishing the connection

  int httpResponseCode = http.POST("{}");
  if (httpResponseCode == HTTP_CODE_OK) {
    Serial.println("✅ setupOneM2M completed successfully.");
  } else {
    Serial.println("❌ setupOneM2M failed. The program will stop.");
    ESP.restart();
  }
  http.end();
}


bool calibrateScale() {

  Serial.println("Do you want to calibrate the scale? (y/n)");

  while (!Serial.available()) {
    delay(100);
  }

  char input = Serial.read();
  Serial.print("Received: ");
  Serial.println(input);

  if (input == 'y' || input == 'Y') {

    if (!LOADCELL_HX711.is_ready()) {
      Serial.println("HX711 not found.");
      return false;
    }

    // flush
    while (Serial.available()) Serial.read();

    Serial.println("Please enter the known weight of the object (in grams) for calibration: ");

    while (!Serial.available()) {
      delay(100);
    }

    String inputString = Serial.readStringUntil('\n');
    inputString.trim();

    weight_of_object_for_calibration = inputString.toFloat();

    if (weight_of_object_for_calibration <= 0) {
      Serial.println("Invalid weight. Please restart and enter a valid number.");
      return false;
    }

    Serial.println(weight_of_object_for_calibration);

    Serial.println("Clear the scale. Do not place any object.");
    delayCountdown(5);

    LOADCELL_HX711.set_scale();
    LOADCELL_HX711.tare();

    Serial.println("Place the known object on the scale.");
    delayCountdown(5);

    long sensor_Reading_Results = LOADCELL_HX711.get_units(10);
    CALIBRATION_FACTOR = sensor_Reading_Results / weight_of_object_for_calibration;

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

void initWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid,password);
  Serial.print("Conecting to WiFi...");
  while (WiFi.status() != WL_CONNECTED) {
    delay(100);
    Serial.print(".");
  }
  Serial.println("Connected!");
}


void setup() {
  Serial.begin(115200);
  pinMode(LED, OUTPUT);
  pinMode(MOTION_SENSOR, INPUT);
  LOADCELL_HX711.begin(LOADCELL_DOUT, LOADCELL_SCK);
  preferences.begin("CF", false);
  delay(2000);
  initWiFi();
  isCalibrated = calibrateScale();
  sendOneM2MSetup();
  dht.begin();
  Serial.println("Done");
}


void loop() {
  motionVal = digitalRead(MOTION_SENSOR);   
  if (motionVal == HIGH) {           
    digitalWrite(LED, HIGH);   
    delay(100);                
    
    if (state == LOW) {
      Serial.println("Motion detected! New mail!"); 
      state = HIGH;      
    }
    
    sendAPIRequest(NEW_MAIL,0);

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

    // Check for significant temperature change
    if (abs(temp - lastTemp) >= THRESHOLD_TEMP_HUM) {
      Serial.println("🌡️ Creating content instance due to temperature change...");
      sendAPIRequest(NEW_TEMP,temp);
      lastTemp = temp;
    }

    Serial.print("Humidity: ");
    Serial.print(humidity);
    Serial.println(" %");

    // Check for significant humidity change
    if (abs(humidity - lastHumidity) >= THRESHOLD_TEMP_HUM) {
      Serial.println("💧 Creating content instance due to humidity change...");
      sendAPIRequest(NEW_HUM,humidity);
      lastHumidity = humidity;
    }

    if (isCalibrated){

      delay(2000);

      Serial.print("Weight: ");
      delay(500);
      int currentWeight = LOADCELL_HX711.get_units(10);
      Serial.print(currentWeight);
      Serial.println(" g");

      if (currentWeight > lastWeight + THRESHOLD_WEIGHT) {
        Serial.println("📬 New object detected in mailbox... Starting timer...");
        timerStartMillis = millis();
        isTimerRunning = true;
      }

      if (currentWeight < lastWeight && currentWeight < THRESHOLD_WEIGHT) {
        Serial.println("✅ Mailbox checked! ");
        sendAPIRequest(EMPTY_MAILBOX,0);
        if (isTimerRunning){
          isTimerRunning = false;
        }
      }

      if (isTimerRunning && millis() - timerStartMillis >= CHECK_INTERVAL) {
        Serial.println("⏳ Mailbox not checked yet! Reseting timer...");
        sendAPIRequest(NEW_REMINDER,0);
        timerStartMillis = millis();  // Reset timer for next check
      }

      lastWeight = currentWeight;

      delay(1000);

    }

  }

}
