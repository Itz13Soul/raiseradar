"use client";

import { useMemo, useRef, useSyncExternalStore } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { cityToVector } from "../lib/cities";

const INDIA_FRONT = -(78 * Math.PI) / 180;

function Scene({ cities, still }: { cities: string[]; still: boolean }) {
  const globe = useRef<THREE.Group>(null);
  const ringA = useRef<THREE.Mesh>(null);
  const ringB = useRef<THREE.Mesh>(null);
  const core = useRef<THREE.Mesh>(null);
  const pulse = useRef<THREE.Group>(null);

  const dots = useMemo(() => {
    const n = 900;
    const out = new Float32Array(n * 3);
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const t = golden * i;
      out[i * 3] = Math.cos(t) * r * 1.004;
      out[i * 3 + 1] = y * 1.004;
      out[i * 3 + 2] = Math.sin(t) * r * 1.004;
    }
    return out;
  }, []);

  const graticule = useMemo(() => {
    const out: number[] = [];
    const at = (lat: number, lon: number) => {
      const la = (lat * Math.PI) / 180;
      const lo = (lon * Math.PI) / 180;
      return [Math.cos(la) * Math.sin(lo) * 1.002, Math.sin(la) * 1.002, Math.cos(la) * Math.cos(lo) * 1.002];
    };
    for (let lat = -80; lat <= 80; lat += 20) {
      for (let lon = 0; lon < 360; lon += 6) out.push(...at(lat, lon), ...at(lat, lon + 6));
    }
    for (let lon = 0; lon < 360; lon += 20) {
      for (let lat = -90; lat < 90; lat += 6) out.push(...at(lat, lon), ...at(lat + 6, lon));
    }
    return new Float32Array(out);
  }, []);

  const nodes = useMemo(
    () =>
      [...new Set(cities.map((c) => c.trim().toLowerCase()))]
        .map((c) => cityToVector(c, 1.015))
        .filter((v): v is [number, number, number] => v !== null),
    [cities],
  );

  useFrame(({ pointer, clock }, dt) => {
    const g = globe.current;
    if (g) {
      if (!still) g.rotation.y += dt * 0.18;
      g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, 0.28 + pointer.y * 0.18, 0.05);
    }
    if (still) return;
    if (ringA.current) ringA.current.rotation.z += dt * 0.35;
    if (ringB.current) ringB.current.rotation.z -= dt * 0.22;
    if (core.current) {
      core.current.rotation.x += dt * 0.5;
      core.current.rotation.y += dt * 0.7;
    }
    if (pulse.current) {
      const s = 1 + 0.35 * Math.sin(clock.elapsedTime * 2.4);
      pulse.current.scale.setScalar(s);
    }
  });

  return (
    <>
      <group ref={globe} rotation={[0.28, INDIA_FRONT, 0]}>
        <mesh>
          <sphereGeometry args={[1, 48, 32]} />
          <meshBasicMaterial color="#050b18" />
        </mesh>
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[graticule, 3]} />
          </bufferGeometry>
          <lineBasicMaterial color="#22d3ee" transparent opacity={0.26} />
        </lineSegments>
        <points>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[dots, 3]} />
          </bufferGeometry>
          <pointsMaterial color="#67e8f9" size={0.011} sizeAttenuation transparent opacity={0.75} />
        </points>
        <group ref={pulse}>
          {nodes.map((p, i) => (
            <mesh key={i} position={p}>
              <sphereGeometry args={[0.028, 16, 16]} />
              <meshBasicMaterial color="#fbbf24" />
            </mesh>
          ))}
        </group>
      </group>

      <mesh ref={ringA} rotation={[Math.PI / 2.3, 0.3, 0]}>
        <torusGeometry args={[1.38, 0.0045, 8, 160]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.7} />
      </mesh>
      <mesh ref={ringB} rotation={[Math.PI / 1.7, -0.5, 0]}>
        <torusGeometry args={[1.55, 0.003, 8, 160]} />
        <meshBasicMaterial color="#a78bfa" transparent opacity={0.55} />
      </mesh>
      <mesh ref={core} position={[1.45, 0.9, 0.2]}>
        <icosahedronGeometry args={[0.1, 0]} />
        <meshBasicMaterial color="#fbbf24" wireframe />
      </mesh>
    </>
  );
}

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const q = window.matchMedia(QUERY);
  q.addEventListener("change", onChange);
  return () => q.removeEventListener("change", onChange);
}

export default function RadarGlobe({ cities }: { cities: string[] }) {
  const still = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );

  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 4.2], fov: 42 }}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      aria-label="Rotating globe marking Indian cities with recent funding rounds"
    >
      <Scene cities={cities} still={still} />
    </Canvas>
  );
}
