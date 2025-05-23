import React, { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";

export default function MailLetter({
  animationStep,
  onFallEnd,
  initialPos,
  initialRot,
}) {
  const ref = useRef();
  const [localPos, setLocalPos] = useState(initialPos);
  const [localRot, setLocalRot] = useState(initialRot);

  useEffect(() => {
    if (animationStep === 0) {
      setLocalPos(initialPos);
      setLocalRot(initialRot);
    }
  }, [animationStep, initialPos, initialRot]);

  useFrame(() => {
    if (animationStep === 1) {
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
    if (animationStep === 2) {
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
