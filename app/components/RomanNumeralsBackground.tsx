'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';

// Hook to detect reduced motion preference
function usePrefersReducedMotion() {
  if (typeof window === 'undefined') return false;
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  return mediaQuery.matches;
}

// 3D Roman Numeral using tubes for depth
function RomanNumeral3D({
  roman,
  position,
  animationOffset
}: {
  roman: string;
  position: [number, number, number];
  animationOffset: number;
}) {
  const meshRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!meshRef.current) return;

    const time = state.clock.elapsedTime + animationOffset;

    // Slow floating drift
    meshRef.current.position.x = position[0] + Math.sin(time * 0.2) * 0.5;
    meshRef.current.position.y = position[1] + Math.cos(time * 0.3) * 0.3;
    meshRef.current.position.z = position[2] + Math.sin(time * 0.15) * 0.4;

    // Gentle rotation
    meshRef.current.rotation.x = Math.sin(time * 0.1) * 0.2;
    meshRef.current.rotation.y = time * 0.05;
    meshRef.current.rotation.z = Math.cos(time * 0.12) * 0.1;
  });

  const segments = useMemo(() => {
    const lines: [number, number, number][][] = [];
    const w = 0.8;
    const h = 2.0;
    const spacing = 0.6;

    switch (roman) {
      case 'I':
        lines.push([[0, -h/2, 0], [0, h/2, 0]]);
        break;
      case 'II':
        lines.push([[-spacing/2, -h/2, 0], [-spacing/2, h/2, 0]]);
        lines.push([[spacing/2, -h/2, 0], [spacing/2, h/2, 0]]);
        break;
      case 'III':
        lines.push([[-spacing, -h/2, 0], [-spacing, h/2, 0]]);
        lines.push([[0, -h/2, 0], [0, h/2, 0]]);
        lines.push([[spacing, -h/2, 0], [spacing, h/2, 0]]);
        break;
      case 'IV':
        lines.push([[-spacing, -h/2, 0], [-spacing, h/2, 0]]);
        lines.push([[spacing, -h/2, 0], [0, 0, 0]]);
        lines.push([[spacing, h/2, 0], [0, 0, 0]]);
        break;
      case 'V':
        lines.push([[-w/2, h/2, 0], [0, -h/2, 0]]);
        lines.push([[w/2, h/2, 0], [0, -h/2, 0]]);
        break;
      case 'VI':
        lines.push([[-spacing-w/2, h/2, 0], [-spacing, -h/2, 0]]);
        lines.push([[-spacing+w/2, h/2, 0], [-spacing, -h/2, 0]]);
        lines.push([[spacing, -h/2, 0], [spacing, h/2, 0]]);
        break;
      case 'VII':
        lines.push([[-spacing*1.5-w/2, h/2, 0], [-spacing*1.5, -h/2, 0]]);
        lines.push([[-spacing*1.5+w/2, h/2, 0], [-spacing*1.5, -h/2, 0]]);
        lines.push([[0, -h/2, 0], [0, h/2, 0]]);
        lines.push([[spacing*1.5, -h/2, 0], [spacing*1.5, h/2, 0]]);
        break;
      case 'VIII':
        lines.push([[-spacing*2-w/2, h/2, 0], [-spacing*2, -h/2, 0]]);
        lines.push([[-spacing*2+w/2, h/2, 0], [-spacing*2, -h/2, 0]]);
        lines.push([[-spacing, -h/2, 0], [-spacing, h/2, 0]]);
        lines.push([[spacing, -h/2, 0], [spacing, h/2, 0]]);
        lines.push([[spacing*2, -h/2, 0], [spacing*2, h/2, 0]]);
        break;
      case 'IX':
        lines.push([[-spacing, -h/2, 0], [-spacing, h/2, 0]]);
        lines.push([[0, -h/2, 0], [spacing, 0, 0]]);
        lines.push([[0, h/2, 0], [spacing, 0, 0]]);
        break;
      case 'X':
        lines.push([[-w/2, -h/2, 0], [w/2, h/2, 0]]);
        lines.push([[-w/2, h/2, 0], [w/2, -h/2, 0]]);
        break;
      case 'XI':
        lines.push([[-spacing*1.5-w/2, -h/2, 0], [-spacing*1.5+w/2, h/2, 0]]);
        lines.push([[-spacing*1.5-w/2, h/2, 0], [-spacing*1.5+w/2, -h/2, 0]]);
        lines.push([[spacing, -h/2, 0], [spacing, h/2, 0]]);
        break;
      case 'XII':
        lines.push([[-spacing*2-w/2, -h/2, 0], [-spacing*2+w/2, h/2, 0]]);
        lines.push([[-spacing*2-w/2, h/2, 0], [-spacing*2+w/2, -h/2, 0]]);
        lines.push([[0, -h/2, 0], [0, h/2, 0]]);
        lines.push([[spacing*2, -h/2, 0], [spacing*2, h/2, 0]]);
        break;
    }

    return lines;
  }, [roman]);

  return (
    <group ref={meshRef} position={position}>
      {segments.map((points, i) => {
        const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
        return (
          <mesh key={i}>
            <tubeGeometry args={[curve, 20, 0.08, 8, false]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive="#ffffff"
              emissiveIntensity={0.5}
              metalness={0.4}
              roughness={0.3}
            />
          </mesh>
        );
      })}
    </group>
  );
}

// Scene component
function Scene() {
  const numerals = useMemo(() => [
    { roman: 'I', pos: [3, 3, -5] as [number, number, number], offset: 0 },
    { roman: 'II', pos: [5, 1.5, -6] as [number, number, number], offset: 1.2 },
    { roman: 'III', pos: [4, -1, -7] as [number, number, number], offset: 2.4 },
    { roman: 'IV', pos: [2, -3, -5.5] as [number, number, number], offset: 3.6 },
    { roman: 'V', pos: [-1, -3.5, -6.5] as [number, number, number], offset: 4.8 },
    { roman: 'VI', pos: [-3, -2.5, -7] as [number, number, number], offset: 6 },
    { roman: 'VII', pos: [-5, 0, -5.5] as [number, number, number], offset: 7.2 },
    { roman: 'VIII', pos: [-4.5, 2, -6] as [number, number, number], offset: 8.4 },
    { roman: 'IX', pos: [-2, 3.5, -7.5] as [number, number, number], offset: 9.6 },
    { roman: 'X', pos: [0, 4, -6] as [number, number, number], offset: 10.8 },
    { roman: 'XI', pos: [1, 1, -8] as [number, number, number], offset: 12 },
    { roman: 'XII', pos: [2.5, 0, -6.5] as [number, number, number], offset: 13.2 },
  ], []);

  return (
    <>
      {numerals.map((n, i) => (
        <RomanNumeral3D
          key={i}
          roman={n.roman}
          position={n.pos}
          animationOffset={n.offset}
        />
      ))}
    </>
  );
}

// Main component
export default function RomanNumeralsBackground() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const glRef = useRef<THREE.WebGLRenderer | null>(null);

  useEffect(() => {
    return () => {
      if (glRef.current) {
        glRef.current.dispose();
        glRef.current.forceContextLoss();
        glRef.current = null;
      }
    };
  }, []);

  if (prefersReducedMotion) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      <Canvas
        key="roman-numerals-canvas"
        style={{ background: 'transparent' }}
        camera={{ position: [0, 0, 5], fov: 75 }}
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: 'high-performance',
          preserveDrawingBuffer: false
        }}
        dpr={[1, 1.5]}
        frameloop="always"
        onCreated={({ gl }) => {
          glRef.current = gl;
          gl.setClearColor(0x000000, 0);
        }}
      >
        {/* Lighting for 3D effect */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1.5} color="#ffffff" />
        <directionalLight position={[-10, -10, -5]} intensity={0.5} color="#8888ff" />
        <pointLight position={[0, 0, 10]} intensity={0.8} color="#ffffff" />
        <Scene />
      </Canvas>
    </div>
  );
}
