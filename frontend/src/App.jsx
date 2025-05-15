import React, { Suspense, useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  RoundedBox,
  Text,
  useCursor,
  Environment,
} from "@react-three/drei";
import * as THREE from "three";

// PortugueseMailbox now receives flapOpen as prop
function PortugueseMailbox({ flapOpen, setFlapOpen }) {
  const ref = useRef();
  const flapRef = useRef();

  useFrame(({ clock }) => {
    ref.current.rotation.y = Math.sin(clock.elapsedTime * 0.3) * 0.1;
  });

  // Animate flap opening/closing
  useFrame(() => {
    if (!flapRef.current) return;
    const target = flapOpen ? -Math.PI / 2 : 0;
    flapRef.current.rotation.x += (target - flapRef.current.rotation.x) * 0.2;
  });

  useCursor(flapRef, "pointer");

  const mailboxColor = "#ffffff";
  const textColor = "#DF0024";

  return (
    <group ref={ref} position={[0, 0, 0]}>
      <RoundedBox args={[0.8, 1, 0.5]} radius={0.05} position={[0, 0, 0]}>
        <meshStandardMaterial
          attach="material"
          color={mailboxColor}
          metalness={0.1}
          roughness={0.2}
        />
      </RoundedBox>
      <group
        ref={flapRef}
        position={[0, 0.325, 0.26]}
      >
        <mesh
          position={[0, 0.025, 0]}
          onClick={() => setFlapOpen((open) => !open)}
        >
          <boxGeometry args={[0.5, 0.05, 0.02]} />
          <meshStandardMaterial color="#bbb" metalness={0.3} roughness={0.3} />
        </mesh>
      </group>
      <mesh position={[0, 0.35, 0.25]}>
        <boxGeometry args={[0.48, 0.04, 0.01]} />
        <meshStandardMaterial color="#111" roughness={0.5} metalness={0.2} />
      </mesh>
      <Text
        position={[0.32, -0.43, 0.251]}
        fontSize={0.12}
        color={textColor}
        anchorX="right"
        anchorY="bottom"
        style={{
          fontFamily: "Arial, sans-serif",
          fontWeight: 1000,
          textAlign: "right",
        }}>
        ctt
      </Text>
    </group>
  );
}

function MailLetter({ animationStep, onFallEnd, initialPos, initialRot }) {
  const ref = useRef();
  const [localPos, setLocalPos] = useState(initialPos);
  const [localRot, setLocalRot] = useState(initialRot);

  useFrame(() => {
    // Step 1: Move to slot and open flap in parallel
    if (animationStep === 1) {
      // Slot is at [0, 0.35, 0.255] (just in front of the mailbox slot)
      const targetPos = [0, 0.35, 0.15];
      const targetRot = [Math.PI / 2, 0, 0];
      const newPos = localPos.map((v, i) =>
        Math.abs(v - targetPos[i]) < 0.01
          ? targetPos[i]
          : v + (targetPos[i] - v) * 0.1
      );
      setLocalPos(newPos);
      const newRot = [
        Math.abs(localRot[0] - targetRot[0]) < 0.01
          ? targetRot[0]
          : localRot[0] + (targetRot[0] - localRot[0]) * 0.1,
        0,
        0,
      ];
      setLocalRot(newRot);
      if (
        newPos.every((v, i) => Math.abs(v - targetPos[i]) < 0.01) &&
        Math.abs(newRot[0] - targetRot[0]) < 0.01
      ) {
        onFallEnd && onFallEnd();
      }
    }
    // Step 2: Fall inside (deeper and with rotation)
    if (animationStep === 2) {
      // Fall straight down, well below the mailbox
      const targetPos = [0, 0, 0.1];
      const targetRot = [Math.PI / 2 + 0.3, 0.1, 0.1];
      const newPos = localPos.map((v, i) =>
        Math.abs(v - targetPos[i]) < 0.01
          ? targetPos[i]
          : v + (targetPos[i] - v) * 0.08
      );
      setLocalPos(newPos);
      const newRot = localRot.map((v, i) =>
        Math.abs(v - targetRot[i]) < 0.01
          ? targetRot[i]
          : v + (targetRot[i] - v) * 0.08
      );
      setLocalRot(newRot);
      if (
        Math.abs(newPos[1] - targetPos[1]) < 0.01 &&
        newRot.every((v, i) => Math.abs(v - targetRot[i]) < 0.01)
      ) {
        onFallEnd && onFallEnd();
      }
    }
  });

  return (
    <group ref={ref} position={localPos} rotation={localRot}>
      <mesh>
        <boxGeometry args={[0.28, 0.18, 0.01]} />
        <meshStandardMaterial color="#fff" />
      </mesh>
      <mesh>
        <boxGeometry args={[0.282, 0.182, 0.012]} />
        <meshStandardMaterial color="#bbb" wireframe />
      </mesh>
      <mesh>
        <boxGeometry args={[-0.282, 0.182, 0.012]} />
        <meshStandardMaterial color="#bbb" wireframe />
      </mesh>
    </group>
  );
}

export default function App() {
  const initialLetterPos = [0.6, 0.1, 0.25];
  const initialLetterRot = [0, 0, 0];
  const [animationStep, setAnimationStep] = useState(0); // 0: idle, 1: move to slot+open flap, 2: fall, 3: close flap
  const [flapOpen, setFlapOpen] = useState(false);
  const [buttonDisabled, setButtonDisabled] = useState(false);

  // Animation sequence
  useEffect(() => {
    if (animationStep === 1) {
      setFlapOpen(true); // Open flap as letter moves
    }
    if (animationStep === 2) {
      setTimeout(() => setFlapOpen(false), 400); // Close flap after short delay
    }
    if (animationStep === 3) {
      setButtonDisabled(true);
    }
  }, [animationStep]);

  // When letter reaches slot, start falling
  const handleLetterAtSlot = () => {
    if (animationStep === 1) {
      setAnimationStep(2);
    } else if (animationStep === 2) {
      setAnimationStep(3);
    }
  };

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      <button
        style={{
          position: "absolute",
          zIndex: 10,
          top: 20,
          left: 20,
          padding: "10px 20px",
          fontSize: "1.1em",
        }}
        onClick={() => {
          setAnimationStep(1);
          setButtonDisabled(false);
        }}
        disabled={buttonDisabled || animationStep !== 0}
      >
        Mail Letter
      </button>
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
        <Environment preset="apartment" background /> {/* <-- Add this line */}
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
