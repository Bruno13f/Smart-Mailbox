import React, { Suspense, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  RoundedBox,
  Text,
  Html,
  useCursor,
} from "@react-three/drei";
import * as THREE from "three";

function PortugueseMailbox() {
  const ref = useRef();
  useFrame(({ clock }) => {
    ref.current.rotation.y = Math.sin(clock.elapsedTime * 0.3) * 0.1;
  });

  // Flap state
  const [flapOpen, setFlapOpen] = useState(false);
  const flapRef = useRef();

  // Animate flap opening/closing
  useFrame(() => {
    if (!flapRef.current) return;
    // Target rotation: closed = 0, open = -Math.PI/2 (90deg)
    const target = flapOpen ? -Math.PI / 2 : 0;
    flapRef.current.rotation.x += (target - flapRef.current.rotation.x) * 0.2;
  });

  // Cursor feedback
  useCursor(flapRef, "pointer");

  // Colors
  const mailboxColor = "#ffffff";
  const textColor = "#DF0024";

  return (
    <group ref={ref} position={[0, 0, 0]}>
      {/* Main mailbox body */}
      <RoundedBox args={[0.8, 1, 0.5]} radius={0.05} position={[0, 0, 0]}>
        <meshStandardMaterial
          attach="material"
          color={mailboxColor}
          metalness={0.1}
          roughness={0.2}
        />
      </RoundedBox>

      {/* Flap above the slot */}
      <group
        ref={flapRef}
        position={[0, 0.325, 0.26]}
        // Pivot at the back edge of the flap
      >
        <mesh
          position={[0, 0.025, 0]} // move pivot to back edge
          onClick={() => setFlapOpen((open) => !open)}
        >
          <boxGeometry args={[0.5, 0.05, 0.02]} />
          <meshStandardMaterial color="#bbb" metalness={0.3} roughness={0.3} />
        </mesh>
      </group>

      {/* Mail slot "hole" */}
      <mesh position={[0, 0.35, 0.25]}>
        <boxGeometry args={[0.48, 0.04, 0.01]} />
        <meshStandardMaterial color="#111" roughness={0.5} metalness={0.2} />
      </mesh>
      
      <Text
        position={[0.32, -0.43, 0.251]} // bottom right of the mailbox front face
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

export default function App() {
  return (
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
      <Suspense fallback={null}>
        <PortugueseMailbox />
        {/* Floor/ground */}
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
  );
}
