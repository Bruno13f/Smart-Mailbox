import React, { Suspense, useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import PortugueseMailbox from "./components/PortugueseMailbox";
import MailLetter from "./components/MailLetter";
import LetterCountDisplay from "./components/LetterCountDisplay";
import MailButton from "./components/MailButton";

export default function App() {
  const initialLetterPos = [0.6, 0.1, 0.25];
  const initialLetterRot = [0, 0, 0];
  const [animationStep, setAnimationStep] = useState(0); // 0: idle, 1: move to slot+open flap, 2: fall, 3: close flap
  const [flapOpen, setFlapOpen] = useState(false);
  const [letterCount, setLetterCount] = useState(0);

  useEffect(() => {
    if (animationStep === 1) {
      setFlapOpen(true);
    }
    if (animationStep === 2) {
      setTimeout(() => setFlapOpen(false), 400);
    }
    if (animationStep === 3) {
      setAnimationStep(0);
      setLetterCount((prevCount) => prevCount + 1);
    }
  }, [animationStep]);

  const handleLetterAtSlot = () => {
    if (animationStep === 1) {
      setAnimationStep(2);
    } else if (animationStep === 2) {
      setAnimationStep(3);
    }
  };

  const handleMailButtonClick = () => {
    setAnimationStep(1);
  };

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      <LetterCountDisplay count={letterCount} />
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
          <MailLetter
            animationStep={animationStep}
            onFallEnd={handleLetterAtSlot}
            initialPos={initialLetterPos}
            initialRot={initialLetterRot}
          />
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
