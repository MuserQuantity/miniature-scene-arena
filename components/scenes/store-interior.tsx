'use client'

import { useMemo } from 'react'
import { Block, colors as C, ProductInstances, SignText, type Point } from './primitives'

const productColors = [C.cream, C.amber, C.mint, C.blue]

function StockShelf({ position, width = 2.2, rotation = 0 }: { position: Point; width?: number; rotation?: number }) {
  const products = useMemo(() => Array.from({ length: 3 }, (_, row) => Array.from({ length: 11 }, (_, i) => ({
    position: [-width / 2 + 0.15 + i * (width - 0.3) / 10, 0.35 + row * 0.36, 0.02] as Point,
    size: [0.13, 0.17 + ((i + row) % 3) * 0.025, 0.2] as Point,
    color: productColors[(i + row * 2) % productColors.length],
  }))).flat(), [width])
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Block position={[0, 0.56, -0.22]} size={[width, 1.1, 0.05]} color={C.cream} />
      {[0.18, 0.54, 0.9, 1.26].map((y) => <Block key={y} position={[0, y, 0]} size={[width, 0.065, 0.58]} color={C.cream} />)}
      {[0.21, 0.57, 0.93].map((y) => <Block key={y} position={[0, y, 0.298]} size={[width, 0.06, 0.015]} color={C.mint} />)}
      <ProductInstances items={products} />
      <Block position={[-width / 2, 0.69, -0.06]} size={[0.05, 1.25, 0.51]} color={C.blue} />
      <Block position={[width / 2, 0.69, -0.06]} size={[0.05, 1.25, 0.51]} color={C.blue} />
    </group>
  )
}

function DrinkFridge({ position }: { position: Point }) {
  const bottles = useMemo(() => Array.from({ length: 4 }, (_, row) => Array.from({ length: 15 }, (_, col) => ({
    position: [-1.85 + col * 0.26, 0.42 + row * 0.41, 0.37] as Point,
    size: [0.1, 0.22, 0.1] as Point,
    color: productColors[(col + row) % 4],
  }))).flat(), [])
  return (
    <group position={position}>
      <Block position={[0, 1.05, -0.12]} size={[4.25, 2.1, 0.7]} color={C.cream} edges />
      <Block position={[0, 1.07, 0.245]} size={[4.05, 1.84, 0.025]} color={C.ink} />
      {[0.25, 0.67, 1.08, 1.49].map((y) => <Block key={y} position={[0, y, 0.31]} size={[4.1, 0.025, 0.36]} color={C.cream} />)}
      <ProductInstances items={bottles} shape="bottle" />
      {[-2.02, -1.02, 0, 1.02, 2.02].map((x) => <Block key={x} position={[x, 1.05, 0.43]} size={[0.035, 1.95, 0.035]} color={C.blue} />)}
      {[-1.83, -0.82, 0.2, 1.23].map((x) => <Block key={x} position={[x, 1.04, 0.46]} size={[0.025, 0.28, 0.035]} color={C.cream} />)}
      <Block position={[0, 1.96, 0.39]} size={[4, 0.045, 0.07]} color={C.cream} glow={2.2} />
      <SignText position={[0, 2.075, 0.251]} size={0.1}>COLD DRINKS</SignText>
    </group>
  )
}

function Checkout() {
  return (
    <group position={[1.48, 0.32, -0.75]}>
      <Block position={[0, 0.46, 0]} size={[1.3, 0.92, 1.8]} color={C.cream} edges />
      <Block position={[0, 0.95, 0]} size={[1.44, 0.1, 1.92]} color={C.ink} />
      <Block position={[-0.3, 1.2, 0.48]} size={[0.42, 0.3, 0.18]} color={C.blue} rotation={[-0.12, 0, 0]} />
      <Block position={[-0.3, 1.21, 0.585]} size={[0.31, 0.2, 0.01]} color={C.mint} glow={0.8} />
      <Block position={[-0.3, 1.02, 0.36]} size={[0.38, 0.025, 0.26]} color={C.cream} />
      <Block position={[0.14, 1.18, -0.5]} size={[0.55, 0.45, 0.5]} color={C.blue} edges />
      <Block position={[0.14, 1.24, -0.225]} size={[0.3, 0.22, 0.03]} color={C.ink} />
      <SignText position={[0.14, 1.42, -0.235]} size={0.063}>COFFEE</SignText>
      <mesh position={[0.14, 1.01, -0.16]}><cylinderGeometry args={[0.065, 0.05, 0.12, 10]} /><meshToonMaterial color={C.cream} /></mesh>
      <Block position={[0.23, 1.035, 0.25]} size={[0.49, 0.06, 0.45]} color={C.blue} />
      {[-0.1, 0.1].map((x) => <mesh key={x} position={[x + 0.23, 1.1, 0.25]}><sphereGeometry args={[0.055, 8, 6]} /><meshToonMaterial color={C.amber} /></mesh>)}
    </group>
  )
}

export function StoreInterior() {
  return (
    <group>
      <Block position={[-0.85, 0.27, -1.38]} size={[7.05, 0.14, 5.42]} color={C.cream} />
      {Array.from({ length: 9 }, (_, i) => <Block key={`floor-x-${i}`} position={[-4.2 + i * 0.78, 0.345, -1.3]} size={[0.018, 0.006, 5.3]} color={C.blue} />)}
      {Array.from({ length: 7 }, (_, i) => <Block key={`floor-z-${i}`} position={[-0.86, 0.346, -3.96 + i * 0.78]} size={[6.96, 0.006, 0.018]} color={C.blue} />)}
      <DrinkFridge position={[-1.58, 0.36, -3.7]} />
      <StockShelf position={[-2.83, 0.35, -1.62]} width={2.1} />
      <StockShelf position={[-2.83, 0.35, -0.08]} width={2.1} />
      <StockShelf position={[-0.2, 0.35, -1.98]} width={1.6} rotation={Math.PI / 2} />
      <Checkout />
      <Block position={[1.62, 1.42, -4.03]} size={[0.82, 2.18, 0.03]} color={C.blue} edges />
      <SignText position={[1.62, 1.66, -4]} size={0.09}>STAFF ONLY</SignText>
      <Block position={[1.95, 1.2, -3.96]} size={[0.04, 0.19, 0.05]} color={C.cream} />
      <Block position={[-3.84, 0.75, 0.62]} size={[0.6, 0.8, 0.45]} color={C.blue} edges />
      {Array.from({ length: 6 }, (_, i) => <Block key={`magazine-${i}`} position={[-4.06 + i * 0.085, 1.1, 0.74]} size={[0.074, 0.35, 0.04]} rotation={[-0.2, 0, 0]} color={productColors[i % 4]} />)}
      <Block position={[-2.96, 0.8, 1.01]} size={[1.06, 0.91, 0.48]} color={C.cream} edges />
      <Block position={[-2.96, 1.27, 1.01]} size={[1.04, 0.06, 0.47]} color={C.mint} />
      <SignText position={[-2.96, 0.9, 1.259]} size={0.09} color={C.ink}>ICE CREAM</SignText>
      {[-2.9, -0.5, 1.5].map((x) => <Block key={x} position={[x, 2.58, -1.1]} size={[0.065, 0.03, 2.65]} color={C.cream} glow={1.5} />)}
      <Block position={[0.53, 0.353, 0.25]} size={[0.56, 0.008, 0.13]} color={C.mint} />
      <Block position={[0.65, 0.354, -0.12]} size={[0.13, 0.008, 0.75]} color={C.mint} />
      <pointLight position={[-2.25, 2.2, -0.4]} intensity={12} color={C.amber} distance={8} decay={2} />
      <pointLight position={[1.5, 2.1, -2.5]} intensity={10} color={C.cream} distance={7} decay={2} />
    </group>
  )
}
