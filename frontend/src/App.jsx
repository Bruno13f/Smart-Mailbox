import React, { Suspense, useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import PortugueseMailbox from "./components/PortugueseMailbox";
import MailLetter from "./components/MailLetter";
import LetterCountDisplay from "./components/LetterCountDisplay";
import TemperatureDisplay from "./components/TemperatureDisplay";
import HumidityDisplay from "./components/HumidityDisplay";
import LedLightSensor from "./components/LedLightSensor";

export default function App() {
  const initialLetterPos = [0.6, 0.1, 0.25];
  const initialLetterRot = [0, 0, 0];
  const [flapOpen, setFlapOpen] = useState(false);
  const [letterCount, setLetterCount] = useState(0);
  const [temperature, setTemperature] = useState(0);
  const [humidity, setHumidity] = useState(0);
  const [ledBlink, setLedBlink] = useState(false);

  // Track a list of letters, each with a unique id and animation state
  const [letters, setLetters] = useState([{ id: 0, animating: false }]);

  // Compute if any letter is animating
  const anyAnimating = letters.some((l) => l.animating);

  // Flap should be open if any letter is animating, closed otherwise
  useEffect(() => {
    setFlapOpen(anyAnimating);
  }, [anyAnimating]);

  // When a letter finishes animating, remove it and increment the count
  const handleLetterAtSlot = (id) => {
    setLetters((prev) => prev.filter((l) => l.id !== id));
    setLetterCount((prevCount) => prevCount + 1);
  };

  // Only create the WebSocket once on mount
  useEffect(() => {
    const ws = new WebSocket("ws://192.168.1.37:3000/ws");
    ws.onopen = () => {
      console.log("WebSocket connected");
    };
    ws.onmessage = (event) => {
      console.log("WebSocket message received:", event.data);
      try {
        const data = JSON.parse(event.data);

        if (data.message === "new-mail") {
          // Use functional update to always get latest nextId
          setLetters((prev) => {
            const idx = prev.findIndex((l) => !l.animating);
            if (idx === -1) return prev;
            const updated = prev.map((l, i) =>
              i === idx ? { ...l, animating: true } : l
            );
            return [
              ...updated,
              {
                id: prev.length ? prev[prev.length - 1].id + 1 : 1,
                animating: false,
              },
            ];
          });
        }

        if (
          data.message === "new-temperature" &&
          data.data &&
          data.data.temperature
        ) {
          const temperature = parseFloat(data.data.temperature);
          console.log("Temperature:", temperature);
          if (!isNaN(temperature)) {
            setTemperature(temperature);
            setLedBlink(true);
            setTimeout(() => setLedBlink(false), 200); // Blink
          }
        }

        if (
          data.message === "new-humidity" &&
          data.data &&
          data.data.humidity
        ) {
          const humidity = parseFloat(data.data.humidity);
          console.log("Humidity:", humidity);
          if (!isNaN(humidity)) {
            setHumidity(humidity);
            setLedBlink(true);
            setTimeout(() => setLedBlink(false), 200); // Blink
          }
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };
    ws.onclose = () => {
      console.log("WebSocket disconnected");
    };
    return () => ws.close();
  }, []); // Only run once on mount

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      <LetterCountDisplay count={letterCount} />
      <TemperatureDisplay temperature={temperature} />
      <HumidityDisplay humidity={humidity} />
      {/*<MailButton onClick={handleMailButtonClick} />*/}
      <Canvas
        shadows
        camera={{ position: [0, 0, 3], fov: 50 }}
        style={{ height: "100vh", width: "100vw", display: "block" }}>
        <color attach="background" args={["#f0f0f0"]} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
        <spotLight
          position={[-5, 5, 5]}
          angle={0.15}
          penumbra={1}
          intensity={1}
          castShadow
        />
        <Environment preset="apartment" background />
        <Suspense fallback={null}>
          <PortugueseMailbox flapOpen={flapOpen} setFlapOpen={setFlapOpen} />
          <LedLightSensor position={[0.7, 0.7, 0.0]} blink={ledBlink} />
          {letters.map((letter) => (
            <MailLetter
              key={letter.id}
              animationStep={letter.animating ? 1 : 0}
              onFallEnd={() => handleLetterAtSlot(letter.id)}
              initialPos={initialLetterPos}
              initialRot={initialLetterRot}
            />
          ))}
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, -0.75, 0]}
            receiveShadow>
            <planeGeometry args={[10, 10]} />
            <shadowMaterial opacity={0.2} />
          </mesh>
        </Suspense>
        <OrbitControls
          minPolarAngle={0}
          maxPolarAngle={Math.PI / 2}
          minDistance={1}
          maxDistance={10}
        />
      </Canvas>
    </div>
  );
}
