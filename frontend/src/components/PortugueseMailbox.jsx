import React, { useRef } from "react";
import { RoundedBox, Text, useCursor } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";

export default function PortugueseMailbox({ flapOpen, setFlapOpen }) {
  const ref = useRef();
  const flapRef = useRef();

  useFrame(({ clock }) => {
    ref.current.rotation.y = Math.sin(clock.elapsedTime * 0.3) * 0.1;
  });

  useFrame(() => {
    if (!flapRef.current) return;
    const target = flapOpen ? -Math.PI / 2 : 0;
    flapRef.current.rotation.x += (target - flapRef.current.rotation.x) * 0.2;
  });

  useCursor(flapRef, "pointer");

  return (
    <group ref={ref} position={[0, 0, 0]}>
      <RoundedBox args={[0.8, 1, 0.5]} radius={0.05} position={[0, 0, 0]}>
        <meshStandardMaterial color="#ffffff" metalness={0.1} roughness={0.2} />
      </RoundedBox>
      <group ref={flapRef} position={[0, 0.325, 0.26]}>
        <mesh
          position={[0, 0.025, 0]}
          onClick={() => setFlapOpen((open) => !open)}>
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
        color="#DF0024"
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
