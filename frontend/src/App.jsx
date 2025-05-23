import React, { Suspense, useState, useEffect, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import PortugueseMailbox from "./components/PortugueseMailbox";
import MailLetter from "./components/MailLetter";
import LetterCountDisplay from "./components/LetterCountDisplay";
import MailButton from "./components/MailButton";
import TemperatureDisplay from "./components/TemperatureDisplay";
import LedLightSensor from "./components/LedLightSensor";

export default function App() {
  const initialLetterPos = [0.6, 0.1, 0.25];
  const initialLetterRot = [0, 0, 0];
  const [flapOpen, setFlapOpen] = useState(false);
  const [letterCount, setLetterCount] = useState(0);
  const [temperature, setTemperature] = useState(0);

  // Track a list of letters, each with a unique id and animation state
  const [letters, setLetters] = useState([{ id: 0, animating: false }]);
  const [nextId, setNextId] = useState(1);

  // Compute if any letter is animating
  const anyAnimating = letters.some((l) => l.animating);

  // Flap should be open if any letter is animating, closed otherwise
  useEffect(() => {
    setFlapOpen(anyAnimating);
  }, [anyAnimating]);

  // When the button is clicked, start animating the first idle letter and add a new one
  const handleMailButtonClick = useCallback(() => {
    setLetters((prev) => {
      // Find the first idle letter
      const idx = prev.findIndex((l) => !l.animating);
      if (idx === -1) return prev; // Shouldn't happen
      // Start animating it
      const updated = prev.map((l, i) =>
        i === idx ? { ...l, animating: true } : l
      );
      // Add a new idle letter
      return [...updated, { id: nextId, animating: false }];
    });
    setNextId((id) => id + 1);
  }, [nextId]);

  // When a letter finishes animating, remove it and increment the count
  const handleLetterAtSlot = (id) => {
    setLetters((prev) => prev.filter((l) => l.id !== id));
    setLetterCount((prevCount) => prevCount + 1);
  };

  // Only create the WebSocket once on mount
  useEffect(() => {
    const ws = new WebSocket("ws://localhost:3000/ws");
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
          setNextId((id) => id + 1);
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

  // Fetch initial letter count on mount
  useEffect(() => {
    fetch("http://localhost:3000/mail")
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.count === "number") {
          setLetterCount(data.count);
        }
      })
      .catch((err) =>
        console.error("Failed to fetch initial letter count", err)
      );
  }, []);

  useEffect(() => {
    const fetchTemperature = async () => {
      try {
        const response = await fetch("http://localhost:3000/temperature");
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        const data = await response.json();
        setTemperature(data.temperature || 0);
      } catch (error) {
        console.error("Error fetching temperature:", error);
      }
    };

    fetchTemperature();
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      <LetterCountDisplay count={letterCount} />
      <TemperatureDisplay temperature={temperature} />
      <MailButton onClick={handleMailButtonClick} />
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
          <LedLightSensor position={[0.7, 0.7, 0.0]} />
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
