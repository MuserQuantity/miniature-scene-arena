'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Mesh, MeshBasicMaterial } from 'three'
import { colors as C } from './primitives'

function seeded(index: number) {
  const value = Math.sin(index * 127.1 + 311.7) * 43758.5453
  return value - Math.floor(value)
}

export function RainWeather({ animate, dense }: { animate: boolean; dense: boolean }) {
  const count = dense ? 950 : 430
  const ref = useRef<BufferGeometry>(null)
  const ripples = useRef<(Mesh | null)[]>([])
  const dripRef = useRef<BufferGeometry>(null)
  const positions = useMemo(() => {
    const array = new Float32Array(count * 6)
    for (let i = 0; i < count; i++) {
      const x = seeded(i + 1) * 11.7 - 5.85
      const y = seeded(i + 903) * 7.2
      const z = seeded(i + 319) * 11.7 - 5.85
      array.set([x, y, z, x - 0.035, y + 0.22 + seeded(i + 701) * 0.1, z], i * 6)
    }
    return array
  }, [count])
  const drips = useMemo(() => {
    const array = new Float32Array(14 * 6)
    for (let i = 0; i < 14; i++) {
      const x = -4.5 + seeded(i + 71) * 7.4
      const y = seeded(i + 37) * 2.3 + 0.1
      array.set([x, y, 2.095, x, y + 0.07, 2.095], i * 6)
    }
    return array
  }, [])
  useFrame(({ clock }, delta) => {
    if (!animate) return
    const step = Math.min(delta, 0.05)
    if (ref.current) {
      const attribute = ref.current.attributes.position as BufferAttribute
      const array = attribute.array as Float32Array
      for (let i = 0; i < count; i++) {
        const index = i * 6
        array[index + 1] -= step * 7.5
        array[index + 4] -= step * 7.5
        if (array[index + 1] < 0.08) { array[index + 1] += 7.2; array[index + 4] += 7.2 }
      }
      attribute.needsUpdate = true
    }
    if (dripRef.current) {
      const attribute = dripRef.current.attributes.position as BufferAttribute
      const array = attribute.array as Float32Array
      for (let i = 0; i < 14; i++) {
        const j = i * 6
        array[j + 1] -= step * 2.1
        array[j + 4] -= step * 2.1
        if (array[j + 1] < 0.25) { array[j + 1] += 2; array[j + 4] += 2 }
      }
      attribute.needsUpdate = true
    }
    ripples.current.forEach((mesh, i) => {
      if (!mesh) return
      const phase = (clock.elapsedTime * 0.7 + i * 0.27) % 1
      const scale = 0.3 + phase * 2.8
      mesh.scale.setScalar(scale)
      ;(mesh.material as MeshBasicMaterial).opacity = (1 - phase) * 0.24
    })
  })
  return (
    <group>
      <lineSegments frustumCulled={false}>
        <bufferGeometry ref={ref}><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry>
        <lineBasicMaterial color={C.blue} opacity={0.31} transparent depthWrite={false} blending={AdditiveBlending} />
      </lineSegments>
      <lineSegments frustumCulled={false}>
        <bufferGeometry ref={dripRef}><bufferAttribute attach="attributes-position" args={[drips, 3]} /></bufferGeometry>
        <lineBasicMaterial color={C.amber} opacity={0.24} transparent depthWrite={false} />
      </lineSegments>
      {Array.from({ length: 18 }, (_, i) => (
        <mesh key={i} ref={(node) => { ripples.current[i] = node }} position={i < 12 ? [-5.2 + seeded(i + 21) * 10.6, 0.064, 3.25 + seeded(i + 27) * 2.2] : [4.36 + seeded(i) * 0.7, 0.064, -4.9 + seeded(i + 1) * 6.4]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.057, 0.063, 24]} />
          <meshBasicMaterial color={i % 3 === 0 ? C.amber : C.blue} transparent opacity={0.15} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}
