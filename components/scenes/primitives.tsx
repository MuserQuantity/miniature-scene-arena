'use client'

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { Edges, Text } from '@react-three/drei'
import { CatmullRomCurve3, Color, DataTexture, InstancedMesh, NearestFilter, Object3D, RedFormat, Vector3 } from 'three'

export const colors = {
  ink: '#172c3e',
  blue: '#597b90',
  cream: '#f1e6cf',
  amber: '#ffc16f',
  mint: '#85bfb0',
} as const

export type Point = [number, number, number]

const toonRamp = new DataTexture(new Uint8Array([75, 155, 225, 255]), 4, 1, RedFormat)
toonRamp.minFilter = NearestFilter
toonRamp.magFilter = NearestFilter
toonRamp.needsUpdate = true

export function Block({ position, size, color = colors.blue, rotation, glow = 0, edges = false, opacity = 1 }: {
  position: Point
  size: Point
  color?: string
  rotation?: Point
  glow?: number
  edges?: boolean
  opacity?: number
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow={opacity === 1} receiveShadow>
      <boxGeometry args={size} />
      <meshToonMaterial color={color} gradientMap={toonRamp} emissive={color} emissiveIntensity={glow} transparent={opacity < 1} opacity={opacity} depthWrite={opacity === 1} />
      {edges && <Edges threshold={25} color={colors.ink} />}
    </mesh>
  )
}

export function Rod({ from, to, radius = 0.035, color = colors.ink }: { from: Point; to: Point; radius?: number; color?: string }) {
  const [fromX, fromY, fromZ] = from
  const [toX, toY, toZ] = to
  const { middle, length, quaternion } = useMemo(() => {
    const start = new Vector3(fromX, fromY, fromZ)
    const end = new Vector3(toX, toY, toZ)
    const direction = end.clone().sub(start)
    const object = new Object3D()
    object.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), direction.clone().normalize())
    return { middle: start.add(end).multiplyScalar(0.5), length: direction.length(), quaternion: object.quaternion }
  }, [fromX, fromY, fromZ, toX, toY, toZ])
  return (
    <mesh position={middle} quaternion={quaternion} castShadow>
      <cylinderGeometry args={[radius, radius, length, 7]} />
      <meshToonMaterial color={color} gradientMap={toonRamp} />
    </mesh>
  )
}

export function Cable({ points, radius = 0.018 }: { points: Point[]; radius?: number }) {
  const curve = useMemo(() => new CatmullRomCurve3(points.map((p) => new Vector3(...p))), [points])
  return (
    <mesh>
      <tubeGeometry args={[curve, 30, radius, 5, false]} />
      <meshToonMaterial color={colors.ink} />
    </mesh>
  )
}

export function SignText({ children, position, size = 0.2, color = colors.cream, rotation, maxWidth = 10 }: {
  children: string
  position: Point
  size?: number
  color?: string
  rotation?: Point
  maxWidth?: number
}) {
  return (
    <Text font="/fonts/geist.woff" position={position} rotation={rotation} fontSize={size} color={color} anchorX="center" anchorY="middle" maxWidth={maxWidth} letterSpacing={0.08}>
      {children}
      <meshBasicMaterial color={color} toneMapped={false} />
    </Text>
  )
}

export function ProductInstances({ items, shape = 'box' }: { items: { position: Point; size: Point; color: string }[]; shape?: 'box' | 'bottle' }) {
  const ref = useRef<InstancedMesh>(null)
  const object = useMemo(() => new Object3D(), [])
  const color = useMemo(() => new Color(), [])
  useLayoutEffect(() => {
    if (!ref.current) return
    items.forEach((item, i) => {
      object.position.set(...item.position)
      object.scale.set(...item.size)
      object.updateMatrix()
      ref.current!.setMatrixAt(i, object.matrix)
      ref.current!.setColorAt(i, color.set(item.color))
    })
    ref.current.instanceMatrix.needsUpdate = true
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true
    ref.current.computeBoundingSphere()
  }, [items, object, color])
  useEffect(() => () => { ref.current?.dispose() }, [])
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]} castShadow receiveShadow>
      {shape === 'box' ? <boxGeometry args={[1, 1, 1]} /> : <cylinderGeometry args={[0.38, 0.5, 1, 7]} />}
      <meshToonMaterial gradientMap={toonRamp} />
    </instancedMesh>
  )
}
