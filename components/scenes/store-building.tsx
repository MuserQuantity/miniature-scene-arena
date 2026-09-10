'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, MathUtils, Mesh, MeshToonMaterial } from 'three'
import { Block, colors as C, Rod, SignText, type Point } from './primitives'
import { StoreInterior } from './store-interior'

function Window({ position, width, side = false }: { position: Point; width: number; side?: boolean }) {
  return (
    <group position={position} rotation={[0, side ? Math.PI / 2 : 0, 0]}>
      <Block position={[0, 1.39, 0]} size={[width, 1.98, 0.016]} color={C.mint} opacity={0.07} />
      {[-width / 2, width / 2].map((x) => <Block key={x} position={[x, 1.4, 0.03]} size={[0.065, 2.15, 0.08]} color={C.cream} />)}
      {[0.32, 2.48].map((y) => <Block key={y} position={[0, y, 0.03]} size={[width + 0.06, 0.065, 0.08]} color={C.cream} />)}
      <Block position={[0, 0.95, 0.028]} size={[width, 0.022, 0.015]} color={C.mint} opacity={0.6} />
      {Array.from({ length: 7 }, (_, i) => <Block key={i} position={[-width * 0.4 + (width * 0.8 * i) / 6, 1.62 + Math.sin(i * 7) * 0.32, 0.05]} size={[0.006, 0.14 + (i % 3) * 0.07, 0.003]} color={C.cream} opacity={0.17} />)}
    </group>
  )
}

function SlidingDoor({ animate }: { animate: boolean }) {
  const left = useRef<Group>(null)
  const right = useRef<Group>(null)
  useFrame(({ clock }, delta) => {
    if (!animate || !left.current || !right.current) return
    const open = Math.sin(clock.elapsedTime * 0.32) > 0.65 ? 0.52 : 0
    left.current.position.x = MathUtils.damp(left.current.position.x, -0.35 - open, 2.7, delta)
    right.current.position.x = MathUtils.damp(right.current.position.x, 0.35 + open, 2.7, delta)
  })
  return (
    <group position={[0.55, 0, 1.48]}>
      {[-0.77, 0.77].map((x) => <Block key={x} position={[x, 1.46, 0]} size={[0.08, 2.32, 0.15]} color={C.ink} />)}
      <Block position={[0, 2.6, 0]} size={[1.65, 0.17, 0.18]} color={C.blue} />
      <Block position={[0, 0.35, 0]} size={[1.58, 0.04, 0.17]} color={C.blue} />
      {[[-0.35, left], [0.35, right]].map(([x, ref], i) => (
        <group key={i} ref={ref as React.RefObject<Group>} position={[x as number, 0, 0.025]}>
          <Window position={[0, 0, 0]} width={0.69} />
          <Block position={[i === 0 ? 0.24 : -0.24, 1.36, 0.1]} size={[0.024, 0.3, 0.07]} color={C.cream} />
          <Block position={[0, 1.82, 0.05]} size={[0.29, 0.12, 0.004]} color={C.cream} opacity={0.8} />
        </group>
      ))}
      <SignText position={[0, 2.59, 0.11]} size={0.08}>WELCOME</SignText>
    </group>
  )
}

function AirConditioner({ position }: { position: Point }) {
  return (
    <group position={position}>
      <Block position={[0, 0.28, 0]} size={[1.05, 0.56, 0.61]} color={C.cream} edges />
      <mesh position={[0.1, 0.3, 0.32]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.22, 0.22, 0.025, 18]} /><meshToonMaterial color={C.ink} /></mesh>
      {[0, 1, 2, 3, 4].map((i) => <Block key={i} position={[0.1, 0.13 + i * 0.08, 0.345]} size={[0.39, 0.018, 0.014]} color={C.blue} />)}
      <Rod from={[-0.52, 0.1, -0.15]} to={[-0.78, -0.1, -0.25]} radius={0.045} color={C.blue} />
      <Block position={[-0.34, -0.04, 0]} size={[0.08, 0.1, 0.8]} color={C.ink} />
      <Block position={[0.34, -0.04, 0]} size={[0.08, 0.1, 0.8]} color={C.ink} />
    </group>
  )
}

function MainSign({ animate }: { animate: boolean }) {
  const light = useRef<Mesh>(null)
  useFrame(({ clock }) => {
    if (!animate || !light.current) return
    const material = light.current.material as MeshToonMaterial
    material.emissiveIntensity = 0.67 + Math.sin(clock.elapsedTime * 1.4) * 0.035
  })
  return (
    <group position={[-0.9, 2.84, 1.72]}>
      <Block position={[0, 0, 0]} size={[7.72, 0.65, 0.48]} color={C.ink} edges />
      <mesh ref={light} position={[0, 0, 0.245]}><boxGeometry args={[7.6, 0.54, 0.028]} /><meshToonMaterial color={C.cream} emissive={C.amber} emissiveIntensity={0.7} /></mesh>
      <Block position={[0, 0.19, 0.267]} size={[7.6, 0.08, 0.019]} color={C.mint} glow={0.6} />
      <Block position={[0, -0.2, 0.267]} size={[7.6, 0.055, 0.019]} color={C.amber} glow={0.3} />
      <SignText position={[-0.2, -0.005, 0.285]} color={C.ink} size={0.29}>K O N B I N I</SignText>
      <SignText position={[-3.12, 0, 0.285]} color={C.ink} size={0.23}>24</SignText>
      <SignText position={[3.02, 0, 0.285]} color={C.ink} size={0.14}>OPEN</SignText>
      <Block position={[0, -0.45, 0.035]} size={[7.62, 0.06, 0.74]} color={C.blue} />
      <Block position={[0, -0.488, 0.11]} size={[7.3, 0.03, 0.035]} color={C.amber} glow={3} />
    </group>
  )
}

export function StoreBuilding({ animate, roofVisible = true }: { animate: boolean; roofVisible?: boolean }) {
  return (
    <group>
      <Block position={[-0.85, 0.15, -1.36]} size={[7.65, 0.3, 5.8]} color={C.cream} edges />
      <Block position={[-0.85, 1.48, -4.24]} size={[7.6, 2.63, 0.2]} color={C.blue} edges />
      <Block position={[-4.54, 1.48, -1.41]} size={[0.18, 2.63, 5.8]} color={C.blue} edges />
      <Block position={[2.8, 0.46, -1.4]} size={[0.17, 0.56, 5.8]} color={C.cream} />
      <Block position={[2.8, 1.5, -3.67]} size={[0.17, 2.55, 1.1]} color={C.blue} edges />
      <StoreInterior />
      <Window position={[-2.57, 0, 1.49]} width={3.82} />
      <Window position={[2.04, 0, 1.49]} width={1.25} />
      <Window position={[2.805, 0, -1.95]} width={2.26} side />
      <Window position={[2.805, 0, 0.28]} width={2.15} side />
      <SlidingDoor animate={animate} />
      <group visible={roofVisible}>
      <Block position={[-0.87, 2.84, -1.3]} size={[7.88, 0.3, 6.07]} color={C.blue} edges />
      <Block position={[-0.87, 3.02, -1.3]} size={[7.67, 0.1, 5.91]} color={C.ink} />
      <Block position={[-0.87, 3.13, -4.3]} size={[7.9, 0.23, 0.12]} color={C.blue} edges />
      <Block position={[-4.77, 3.13, -1.3]} size={[0.12, 0.23, 6.1]} color={C.blue} edges />
      <Block position={[3.01, 3.13, -1.3]} size={[0.12, 0.23, 6.1]} color={C.blue} edges />
      <Block position={[-0.87, 3.12, 1.68]} size={[7.9, 0.18, 0.13]} color={C.blue} />
      {Array.from({ length: 12 }, (_, i) => <Block key={i} position={[-4.55 + i * 0.67, 3.08, -1.3]} size={[0.026, 0.01, 5.87]} color={C.blue} />)}
      <AirConditioner position={[-3.43, 3.22, -3.24]} />
      <AirConditioner position={[-1.8, 3.22, -3.24]} />
      <Block position={[0.17, 3.29, -3.07]} size={[1.3, 0.34, 1.42]} color={C.blue} edges />
      <Block position={[0.17, 3.49, -3.07]} size={[1.46, 0.1, 1.57]} color={C.cream} />
      <Rod from={[1.82, 3.07, -3.64]} to={[1.82, 3.7, -3.64]} radius={0.075} color={C.blue} />
      <Block position={[1.82, 3.72, -3.64]} size={[0.37, 0.065, 0.37]} color={C.blue} />
      </group>
      <AirConditioner position={[-4.74, 0.3, -2.76]} />
      <MainSign animate={animate} />
      <Block position={[2.92, 2.72, -1.32]} size={[0.3, 0.48, 5.8]} color={C.cream} glow={0.6} />
      <Block position={[3.087, 2.9, -1.32]} size={[0.025, 0.07, 5.76]} color={C.mint} glow={0.6} />
      <Block position={[3.087, 2.54, -1.32]} size={[0.025, 0.045, 5.76]} color={C.amber} glow={0.5} />
      <SignText position={[3.098, 2.73, -0.7]} rotation={[0, Math.PI / 2, 0]} color={C.ink} size={0.2}>OPEN 24 HOURS</SignText>
      <Block position={[-3.54, 1.77, 1.556]} size={[0.42, 0.55, 0.014]} color={C.amber} />
      <SignText position={[-3.54, 1.79, 1.572]} size={0.095} color={C.ink}>COFFEE</SignText>
      <SignText position={[-3.54, 1.58, 1.572]} size={0.073} color={C.ink}>100</SignText>
      <Block position={[0.58, 0.217, 1.97]} size={[1.6, 0.035, 0.63]} color={C.ink} />
      <SignText position={[0.58, 0.242, 1.94]} rotation={[-Math.PI / 2, 0, 0]} size={0.11}>WELCOME</SignText>
    </group>
  )
}
