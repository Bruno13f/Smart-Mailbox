import React from "react";

/**
 * A simple 3D model of a typical LED light sensor (green LED with legs).
 * Position is relative to the mailbox scene.
 */
export default function LedLightSensor(props) {
  // Optionally, you can use useThree for scene context if needed
  return (
    <group {...props}>
      {/* LED body */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.08, 32]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      {/* LED dome */}
      <mesh position={[0, 0.05, 0]}>
        <sphereGeometry args={[0.03, 16, 16]} />
        <meshStandardMaterial
          color="#00ff00"
          emissive="#00ff00"
          emissiveIntensity={0.7}
          transparent
          opacity={0.7}
        />
      </mesh>
      {/* LED legs */}
      <mesh position={[-0.01, -0.06, 0]}>
        <cylinderGeometry args={[0.004, 0.004, 0.08, 8]} />
        <meshStandardMaterial color="#aaa" />
      </mesh>
      <mesh position={[0.01, -0.06, 0]}>
        <cylinderGeometry args={[0.004, 0.004, 0.08, 8]} />
        <meshStandardMaterial color="#aaa" />
      </mesh>
    </group>
  );
}
