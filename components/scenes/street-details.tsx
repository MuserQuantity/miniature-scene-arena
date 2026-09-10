'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MeshReflectorMaterial } from '@react-three/drei'
import { Mesh, MeshBasicMaterial } from 'three'
import { Block, Cable, colors as C, ProductInstances, Rod, SignText, type Point } from './primitives'

function Bicycle({ position }: { position: Point }) {
  return (
    <group position={position} rotation={[0, -0.17, -0.08]} scale={0.86}>
      {[-0.57, 0.59].map((x) => <group key={x} position={[x, 0.47, 0]}>
        <mesh><torusGeometry args={[0.4, 0.04, 6, 26]} /><meshToonMaterial color={C.ink} /></mesh>
        <mesh><torusGeometry args={[0.36, 0.013, 5, 26]} /><meshToonMaterial color={C.cream} /></mesh>
        {[0, 1, 2, 3].map((i) => <Rod key={i} from={[Math.cos(i * Math.PI / 4) * 0.35, Math.sin(i * Math.PI / 4) * 0.35, 0]} to={[-Math.cos(i * Math.PI / 4) * 0.35, -Math.sin(i * Math.PI / 4) * 0.35, 0]} radius={0.007} color={C.blue} />)}
      </group>)}
      <Rod from={[-0.57, 0.47, 0]} to={[-0.1, 0.39, 0]} color={C.mint} />
      <Rod from={[-0.57, 0.47, 0]} to={[-0.33, 0.93, 0]} color={C.mint} />
      <Rod from={[-0.33, 0.93, 0]} to={[-0.1, 0.39, 0]} color={C.mint} />
      <Rod from={[-0.1, 0.39, 0]} to={[0.36, 0.95, 0]} color={C.mint} />
      <Rod from={[-0.33, 0.93, 0]} to={[0.36, 0.95, 0]} color={C.mint} />
      <Rod from={[0.59, 0.47, 0]} to={[0.29, 1.2, 0]} color={C.mint} />
      <Rod from={[-0.34, 0.85, 0]} to={[-0.4, 1.09, 0]} radius={0.025} color={C.cream} />
      <Block position={[-0.4, 1.1, 0]} size={[0.34, 0.07, 0.19]} color={C.ink} />
      <Rod from={[0.29, 1.2, -0.24]} to={[0.29, 1.2, 0.24]} radius={0.028} color={C.blue} />
      <mesh position={[0.53, 1.08, 0]}><boxGeometry args={[0.35, 0.28, 0.35]} /><meshBasicMaterial color={C.blue} wireframe /></mesh>
      <Rod from={[-0.1, 0.39, 0]} to={[-0.1, 0.39, 0.2]} radius={0.025} color={C.cream} />
      <Rod from={[-0.1, 0.39, 0.2]} to={[0.07, 0.24, 0.2]} radius={0.022} color={C.cream} />
    </group>
  )
}

function VendingMachine() {
  const bottles = useMemo(() => Array.from({ length: 3 }, (_, r) => Array.from({ length: 5 }, (_, i) => ({ position: [-0.28 + i * 0.13, 0.81 + r * 0.23, 0.352] as Point, size: [0.075, 0.145, 0.075] as Point, color: [C.cream, C.mint, C.amber][(i + r) % 3] }))).flat(), [])
  return (
    <group position={[3.31, 0.2, 0.19]} rotation={[0, Math.PI / 2, 0]}>
      <Block position={[0, 0.91, 0]} size={[1, 1.82, 0.7]} color={C.cream} edges />
      <Block position={[-0.04, 1.13, 0.36]} size={[0.78, 0.96, 0.024]} color={C.ink} />
      <Block position={[-0.04, 1.6, 0.36]} size={[0.74, 0.034, 0.04]} color={C.cream} glow={3} />
      <ProductInstances items={bottles} shape="bottle" />
      {[0.65, 0.89, 1.12, 1.35].map((y) => <Block key={y} position={[-0.04, y, 0.418]} size={[0.78, 0.027, 0.01]} color={C.mint} />)}
      <Block position={[0, 0.32, 0.36]} size={[0.64, 0.19, 0.036]} color={C.ink} />
      <Block position={[0.405, 0.94, 0.36]} size={[0.11, 0.3, 0.04]} color={C.blue} />
      <Block position={[0.415, 1.18, 0.383]} size={[0.05, 0.06, 0.01]} color={C.mint} glow={1.5} />
      <SignText position={[0, 1.72, 0.365]} size={0.087} color={C.ink}>COLD & HOT</SignText>
      <pointLight position={[0, 1.3, 0.6]} intensity={1.2} distance={3} color={C.mint} />
    </group>
  )
}

function StreetLamp({ position }: { position: Point }) {
  return (
    <group position={position}>
      <Block position={[0, 0.2, 0]} size={[0.26, 0.4, 0.26]} color={C.ink} />
      <Rod from={[0, 0.2, 0]} to={[0, 4.3, 0]} radius={0.065} color={C.blue} />
      <Cable points={[[0, 4.1, 0], [0, 4.46, 0.02], [0.15, 4.6, 0.31], [0.25, 4.5, 0.65]]} radius={0.055} />
      <Block position={[0.25, 4.47, 0.65]} size={[0.28, 0.12, 0.6]} color={C.blue} />
      <Block position={[0.25, 4.397, 0.65]} size={[0.2, 0.015, 0.43]} color={C.amber} glow={4} />
      <pointLight position={[0.25, 4.23, 0.65]} color={C.amber} intensity={10} distance={8} decay={2} />
    </group>
  )
}

function UtilityPole() {
  return (
    <group>
      <Rod from={[-5.14, 0.05, -2.48]} to={[-5.14, 5.3, -2.48]} radius={0.085} color={C.blue} />
      <Rod from={[-5.88, 4.76, -2.48]} to={[-4.4, 4.76, -2.48]} radius={0.055} color={C.ink} />
      <Rod from={[-5.85, 5.07, -2.48]} to={[-4.45, 5.07, -2.48]} radius={0.04} color={C.ink} />
      {[-5.77, -5.24, -4.64].map((x) => <Rod key={x} from={[x, 4.72, -2.48]} to={[x, 5.29, -2.48]} radius={0.045} color={C.cream} />)}
      <Block position={[-5.02, 3.25, -2.48]} size={[0.27, 0.57, 0.31]} color={C.ink} />
      <Rod from={[3.79, 0, -4.95]} to={[3.79, 5, -4.95]} radius={0.075} color={C.blue} />
      <Rod from={[3.08, 4.8, -4.95]} to={[4.55, 4.8, -4.95]} radius={0.055} color={C.ink} />
      {[0, 0.3, 0.6].map((o) => <Cable key={o} points={[[-5.77 + o, 5.27, -2.48], [-2.4, 4.8, -3.52], [0.8, 4.65, -4.14], [3.1 + o, 4.9, -4.95]]} />)}
      <Cable points={[[-5.14, 4.2, -2.48], [-4.75, 3.6, -2.4], [-4.65, 3.2, -2.3]]} radius={0.025} />
    </group>
  )
}

function RoadSignal({ animate }: { animate: boolean }) {
  const light = useRef<Mesh>(null)
  useFrame(({ clock }) => {
    if (!animate || !light.current) return
    const active = Math.sin(clock.elapsedTime * 0.16) > 0
    ;(light.current.material as MeshBasicMaterial).color.set(active ? C.mint : C.amber)
  })
  return (
    <group position={[3.85, 0, 2.55]}>
      <Rod from={[0, 0, 0]} to={[0, 3.24, 0]} radius={0.055} color={C.blue} />
      <Block position={[0, 3.2, 0.05]} size={[0.35, 0.7, 0.29]} color={C.ink} edges />
      <mesh ref={light} position={[0, 3.38, 0.21]}><circleGeometry args={[0.088, 18]} /><meshBasicMaterial color={C.mint} toneMapped={false} /></mesh>
      <mesh position={[0, 3.08, 0.21]}><circleGeometry args={[0.085, 18]} /><meshToonMaterial color={C.blue} /></mesh>
      <Block position={[0, 2.39, 0.04]} size={[0.55, 0.29, 0.05]} color={C.blue} edges />
      <SignText position={[0, 2.4, 0.073]} size={0.12}>P</SignText>
    </group>
  )
}

function SidewalkDetails() {
  return (
    <group>
      <Bicycle position={[-3.89, 0.18, 2.22]} />
      <VendingMachine />
      <Block position={[-1.72, 0.25, 2.02]} size={[0.68, 0.12, 0.37]} color={C.ink} />
      {[-1.96, -1.75, -1.54].map((x, i) => <group key={x}>
        <Rod from={[x, 0.3, 2.02]} to={[x + 0.06, 1.12, 2.02]} radius={0.02} color={C.cream} />
        <mesh position={[x + 0.027, 0.63, 2.02]} rotation={[0, 0, -0.07]}><coneGeometry args={[0.085, 0.63, 6]} /><meshToonMaterial color={i % 2 ? C.mint : C.blue} /></mesh>
        <Cable points={[[x + 0.06, 1.1, 2.02], [x + 0.07, 1.18, 2.02], [x + 0.15, 1.18, 2.02], [x + 0.17, 1.11, 2.02]]} radius={0.013} />
      </group>)}
      {[-1.56, -2.22, -2.88].map((z, i) => <group key={z} position={[3.25, 0.2, z]}>
        <Block position={[0, 0.37, 0]} size={[0.53, 0.74, 0.53]} color={C.blue} edges />
        <Block position={[0, 0.78, 0]} size={[0.57, 0.1, 0.57]} color={i === 1 ? C.amber : C.mint} />
        <Block position={[0.274, 0.56, 0]} size={[0.015, 0.2, 0.22]} color={C.ink} />
      </group>)}
      <group position={[3.31, 0.15, -3.85]}>
        <Rod from={[0, 0, 0]} to={[0, 4.38, 0]} radius={0.055} color={C.cream} />
        <Block position={[0, 4.08, 0]} size={[1.02, 0.8, 0.3]} color={C.cream} glow={0.9} edges />
        <Block position={[0, 4.37, 0.17]} size={[0.98, 0.08, 0.02]} color={C.mint} glow={0.4} />
        <SignText position={[0, 4.09, 0.163]} color={C.ink} size={0.28}>24H</SignText>
        <Block position={[0, 3.77, 0.17]} size={[0.98, 0.06, 0.02]} color={C.amber} glow={0.4} />
      </group>
      <group position={[1.85, 0.2, 2.03]} rotation={[-0.12, 0, 0]}>
        <Block position={[0, 0.66, 0]} size={[0.52, 0.87, 0.065]} color={C.cream} edges />
        <Block position={[0, 0.65, 0.04]} size={[0.4, 0.71, 0.016]} color={C.ink} />
        <SignText position={[0, 0.75, 0.053]} size={0.071}>COFFEE</SignText>
        <SignText position={[0, 0.49, 0.053]} size={0.13}>24 / 7</SignText>
        <Rod from={[-0.2, 0.05, 0]} to={[-0.2, 0.82, -0.42]} radius={0.025} color={C.blue} />
        <Rod from={[0.2, 0.05, 0]} to={[0.2, 0.82, -0.42]} radius={0.025} color={C.blue} />
      </group>
      {[[-4.5, -4.96], [-4.91, -4.8], [-4.72, -4.5]].map(([x, z], i) => <Block key={i} position={[x, 0.44, z]} size={[0.34, 0.53, 0.33]} color={C.amber} edges />)}
    </group>
  )
}

export function StreetDetails({ reflect, animate }: { reflect: boolean; animate: boolean }) {
  return (
    <group>
      <Block position={[0, -0.46, 0]} size={[12, 0.9, 12]} color={C.ink} edges />
      <Block position={[0, -0.035, 0]} size={[11.98, 0.12, 11.98]} color={C.blue} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.032, 0]} receiveShadow>
        <planeGeometry args={[11.93, 11.93]} />
        {reflect ? <MeshReflectorMaterial resolution={256} mirror={0.45} color={C.ink} metalness={0.3} roughness={0.28} mixStrength={2.3} /> : <meshStandardMaterial color={C.ink} metalness={0.35} roughness={0.5} />}
      </mesh>
      <Block position={[-0.81, 0.09, -1.2]} size={[9.15, 0.22, 7.4]} color={C.blue} edges />
      <Block position={[-0.81, 0.205, -1.2]} size={[9.08, 0.016, 7.3]} color={C.blue} />
      {Array.from({ length: 21 }, (_, i) => <Block key={`curb-${i}`} position={[-5.22 + i * 0.441, 0.118, 2.55]} size={[0.419, 0.22, 0.19]} color={i % 5 === 0 ? C.cream : C.blue} />)}
      {Array.from({ length: 17 }, (_, i) => <Block key={`side-curb-${i}`} position={[3.78, 0.118, -4.76 + i * 0.442]} size={[0.19, 0.22, 0.42]} color={C.blue} />)}
      {Array.from({ length: 9 }, (_, i) => <Block key={`walk-${i}`} position={[-5.2 + i, 0.219, 1.93]} size={[0.013, 0.007, 1.19]} color={C.ink} />)}
      {Array.from({ length: 8 }, (_, i) => <Block key={`zebra-${i}`} position={[-4.72 + i * 0.47, 0.043, 4.2]} size={[0.29, 0.013, 1.67]} color={C.cream} />)}
      {[0.25, 2.22, 4.19].map((x) => <Block key={`lane-${x}`} position={[x, 0.043, 4.98]} size={[0.94, 0.014, 0.065]} color={C.cream} />)}
      {[-3.9, -1.9, 0.1].map((z) => <Block key={`lane-side-${z}`} position={[4.99, 0.043, z]} size={[0.07, 0.014, 1.02]} color={C.cream} />)}
      <Block position={[0.82, 0.043, 3.03]} size={[3.37, 0.014, 0.07]} color={C.cream} />
      {[-0.87, 2.5].map((x) => <Block key={x} position={[x, 0.043, 3.7]} size={[0.07, 0.014, 1.42]} color={C.cream} />)}
      <SignText position={[0.88, 0.055, 3.62]} rotation={[-Math.PI / 2, 0, 0]} color={C.cream} size={0.4}>P</SignText>
      {[[-4.72, 3.12], [3.48, 3.07], [4.02, -3.95]].map(([x, z], i) => <group key={i} position={[x, 0.047, z]}>
        <Block position={[0, 0, 0]} size={[0.63, 0.026, 0.36]} color={C.ink} />
        {Array.from({ length: 8 }, (_, j) => <Block key={j} position={[-0.28 + j * 0.08, 0.015, 0]} size={[0.022, 0.01, 0.31]} color={C.blue} />)}
      </group>)}
      <mesh position={[4.71, 0.047, 1.3]}><cylinderGeometry args={[0.31, 0.31, 0.017, 22]} /><meshToonMaterial color={C.blue} /></mesh>
      <Rod from={[-5.34, 0.2, 1.66]} to={[-5.34, 0.92, 1.66]} radius={0.045} color={C.cream} />
      <Rod from={[-5.34, 0.2, -0.44]} to={[-5.34, 0.92, -0.44]} radius={0.045} color={C.cream} />
      <Rod from={[-5.34, 0.9, 1.66]} to={[-5.34, 0.9, -0.44]} radius={0.045} color={C.cream} />
      <StreetLamp position={[-4.97, 0.1, 2.18]} />
      <UtilityPole />
      <RoadSignal animate={animate} />
      <SidewalkDetails />
    </group>
  )
}
