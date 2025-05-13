import React, { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  Box,
  Cylinder,
  RoundedBox,
  Text,
  Html,
} from "@react-three/drei";
import * as THREE from "three";

function PortugueseMailbox() {
  const ref = useRef();
  useFrame(({ clock }) => {
    ref.current.rotation.y = Math.sin(clock.elapsedTime * 0.3) * 0.1;
  });

  // CTT Red color
  const cttRed = "#E5252A";

  return (
    <group ref={ref} position={[0, 0, 0]}>
      {/* Main mailbox body */}
      <RoundedBox args={[0.8, 1, 0.5]} radius={0.05} position={[0, 0, 0]}>
        <meshStandardMaterial
          attach="material"
          color={cttRed}
          metalness={0.5}
          roughness={0.2}
        />
      </RoundedBox>

      {/* Mail slot */}
      <RoundedBox
        args={[0.5, 0.05, 0.1]}
        radius={0.01}
        position={[0, 0.3, 0.25]}>
        <meshStandardMaterial attach="material" color="#111" />
      </RoundedBox>

      {/* CTT Logo - simplified as a yellow circle */}
      <Cylinder args={[0.1, 0.1, 0.01, 32]} position={[0, 0.1, 0.251]}>
        <meshStandardMaterial attach="material" color="#FFD700" />
      </Cylinder>

      {/* Text - CTT */}
      <Text
        position={[0, -0.2, 0.251]}
        fontSize={0.1}
        color="#FFD700"
        anchorX="center"
        anchorY="middle">
        CTT
      </Text>
    </group>
  );
}

export default function App() {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 0, 3], fov: 50 }}
      style={{ height: "100vh", width: "100%" }}>
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
