'use client'

import { Suspense, useEffect, useRef, useState, type ComponentRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { ACESFilmicToneMapping, MOUSE, OrthographicCamera, PCFShadowMap, TOUCH } from 'three'
import { StoreBuilding } from './store-building'
import { StreetDetails } from './street-details'
import { RainWeather } from './rain-weather'
import { colors as C } from './primitives'

export type SceneView = 'overview' | 'street' | 'interior'
export type SceneCanvasProps = {
  view?: SceneView
  resetKey?: number
  paused?: boolean
  quality?: 'auto' | 'high' | 'low'
  onReady?: () => void
  onFailure?: () => void
}

function CameraControls({ view, resetKey }: { view: SceneView; resetKey: number }) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null)
  const { get, size, gl, invalidate } = useThree()
  const zoom = Math.min(size.width / 19.3, size.height / 13.9)
  useEffect(() => {
    const cam = get().camera as OrthographicCamera
    const orbit = controls.current
    if (!orbit) return
    if (view === 'street') {
      cam.position.set(11, 5.5, 16)
      orbit.target.set(-0.2, 1.5, -0.2)
      cam.zoom = zoom * 1.2
    } else if (view === 'interior') {
      cam.position.set(8, 12, 14)
      orbit.target.set(-0.8, 1.15, -1)
      cam.zoom = zoom * 1.55
    } else {
      cam.position.set(12, 10.1, 15)
      orbit.target.set(0, 1.3, 0)
      cam.zoom = zoom
    }
    cam.updateProjectionMatrix()
    orbit.update()
    orbit.saveState()
    invalidate()
  }, [get, view, resetKey, zoom, invalidate])
  useEffect(() => {
    const element = gl.domElement
    element.setAttribute('tabindex', '0')
    element.setAttribute('role', 'img')
    element.setAttribute('aria-label', '雨夜便利店三维场景。拖拽旋转，滚轮缩放，右键拖拽或方向键平移。')
    const orbit = controls.current
    orbit?.listenToKeyEvents(element)
    return () => orbit?.stopListenToKeyEvents()
  }, [gl])
  return <OrbitControls ref={controls} makeDefault enableDamping dampingFactor={0.075} minZoom={zoom * 0.7} maxZoom={zoom * 2.8} minPolarAngle={0.15} maxPolarAngle={Math.PI * 0.48} onChange={() => { const target = controls.current?.target; if (target) target.set(Math.max(-3, Math.min(3, target.x)), Math.max(0.3, Math.min(2.8, target.y)), Math.max(-3, Math.min(3, target.z))) }} target={[0, 1.3, 0]} mouseButtons={{ LEFT: MOUSE.ROTATE, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN }} touches={{ ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN }} />
}

function ReadySignal({ onReady }: { onReady?: () => void }) {
  const signaled = useRef(false)
  useFrame(() => {
    if (signaled.current) return
    signaled.current = true
    queueMicrotask(() => onReady?.())
  })
  return null
}

export default function SceneCanvas({ view = 'overview', resetKey = 0, paused = false, quality = 'auto', onReady, onFailure }: SceneCanvasProps) {
  const container = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(true)
  const [pageVisible, setPageVisible] = useState(() => !document.hidden)
  const [small, setSmall] = useState(() => window.matchMedia('(max-width: 767px)').matches)
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)')
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => { setSmall(media.matches); setReducedMotion(motion.matches) }
    update()
    media.addEventListener('change', update)
    motion.addEventListener('change', update)
    const pageChange = () => setPageVisible(!document.hidden)
    document.addEventListener('visibilitychange', pageChange)
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.02 })
    if (container.current) observer.observe(container.current)
    return () => { media.removeEventListener('change', update); motion.removeEventListener('change', update); document.removeEventListener('visibilitychange', pageChange); observer.disconnect() }
  }, [])
  const high = quality === 'high' || (quality === 'auto' && !small)
  const animate = !paused && !reducedMotion
  return (
    <div ref={container} className="h-full w-full" onContextMenu={(event) => event.preventDefault()}>
      <Canvas
        orthographic
        shadows={high ? { type: PCFShadowMap } : false}
        camera={{ position: [12, 10.1, 15], zoom: 50, near: 0.1, far: 100 }}
        dpr={high ? [1, 1.5] : 1}
        frameloop={!visible || !pageVisible ? 'never' : animate ? 'always' : 'demand'}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: false, toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener('webglcontextlost', (event) => { event.preventDefault(); onFailure?.() }, { once: true })
        }}
        fallback={<div className="flex h-full items-center justify-center text-sm text-muted-foreground">此浏览器不支持 WebGL，请使用较新的浏览器观看。</div>}
      >
        <color attach="background" args={['#14232f']} />
        <ambientLight intensity={0.8} color={C.blue} />
        <hemisphereLight args={[C.cream, C.blue, 2.15]} />
        <directionalLight position={[-6, 12, 5]} intensity={2.25} color={C.blue} castShadow={high} shadow-mapSize={[1024, 1024]} shadow-camera-left={-9} shadow-camera-right={9} shadow-camera-top={9} shadow-camera-bottom={-9} shadow-normalBias={0.06} />
        <directionalLight position={[6, 7, -5]} intensity={1.35} color={C.blue} />
        <Suspense fallback={null}>
          <StreetDetails reflect={high} animate={animate} />
          <StoreBuilding animate={animate} roofVisible={view !== 'interior'} />
          <RainWeather dense={high} animate={animate} />
          <ReadySignal onReady={onReady} />
        </Suspense>
        <CameraControls view={view} resetKey={resetKey} />
        {high && <EffectComposer multisampling={0} enableNormalPass={false}><Bloom luminanceThreshold={1.3} mipmapBlur intensity={0.3} radius={0.5} /></EffectComposer>}
      </Canvas>
    </div>
  )
}
