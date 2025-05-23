import React, { useRef, useEffect, useState } from "react";

/**
 * A simple 3D model of a typical LED light sensor (green LED with legs).
 * Blinks when the `blink` prop is true.
 */
export default function LedLightSensor({
  position = [0, 0, 0],
  blink = false,
}) {
  const [isOn, setIsOn] = useState(false);
  const blinkInterval = useRef();

  useEffect(() => {
    if (blink) {
      // the interval sets how fast the LED blinks
      blinkInterval.current = setInterval(() => {
        setIsOn((on) => !on);
      }, 100);
      return;
    }

    setIsOn(false);
    if (blinkInterval.current) clearInterval(blinkInterval.current);

    return () => {
      if (blinkInterval.current) clearInterval(blinkInterval.current);
    };
  }, [blink]);

  return (
    <group position={position}>
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
          emissive={isOn ? "#00ff00" : "#003300"}
          emissiveIntensity={isOn ? 1.5 : 0.2}
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
