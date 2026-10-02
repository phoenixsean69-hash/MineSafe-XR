import { Canvas } from '@react-three/fiber'
import { Environment, Line, OrbitControls, Text } from '@react-three/drei'
import * as THREE from 'three'

export type DrillPhase = 'idle' | 'alarm' | 'blocked' | 'reroute' | 'complete'
export type ViewStyle = 'wireframe' | 'solid' | 'rendered'

type Props = {
  phase: DrillPhase
  viewStyle?: ViewStyle
  showRoutes?: boolean
  showLabels?: boolean
}

const ROUTE_SAFE: [number, number, number][] = [
  [-7, 0.22, 4],
  [-3, 0.22, 4],
  [0, 0.22, 1],
  [0, 0.22, -5],
  [5, 0.22, -5],
]

const ROUTE_PRIMARY: [number, number, number][] = [
  [-7, 0.24, 4],
  [-1, 0.24, 4],
  [4, 0.24, 4],
]

function TunnelSegment({
  position,
  scale,
  viewStyle,
}: {
  position: [number, number, number]
  scale: [number, number, number]
  viewStyle: ViewStyle
}) {
  const wireframe = viewStyle === 'wireframe'
  const floor = viewStyle === 'rendered' ? '#31363b' : '#24292f'
  const wall = viewStyle === 'rendered' ? '#22282d' : '#181c20'
  const roof = viewStyle === 'rendered' ? '#292f34' : '#20252a'

  return (
    <group position={position}>
      <mesh position={[0, -0.12, 0]} receiveShadow>
        <boxGeometry args={[scale[0], 0.2, scale[2]]} />
        <meshStandardMaterial color={floor} roughness={0.95} wireframe={wireframe} />
      </mesh>
      <mesh position={[0, 1.65, -scale[2] / 2]}>
        <boxGeometry args={[scale[0], 3.5, 0.18]} />
        <meshStandardMaterial color={wall} roughness={1} wireframe={wireframe} />
      </mesh>
      <mesh position={[0, 1.65, scale[2] / 2]}>
        <boxGeometry args={[scale[0], 3.5, 0.18]} />
        <meshStandardMaterial color={wall} roughness={1} wireframe={wireframe} />
      </mesh>
      <mesh position={[0, 3.35, 0]}>
        <boxGeometry args={[scale[0], 0.2, scale[2]]} />
        <meshStandardMaterial color={roof} roughness={1} wireframe={wireframe} />
      </mesh>
    </group>
  )
}

function Worker({ position, viewStyle }: { position: [number, number, number]; viewStyle: ViewStyle }) {
  const wireframe = viewStyle === 'wireframe'

  return (
    <group position={position}>
      <mesh position={[0, 0.75, 0]} castShadow>
        <capsuleGeometry args={[0.22, 0.72, 8, 12]} />
        <meshStandardMaterial color="#e7b84b" roughness={0.6} wireframe={wireframe} />
      </mesh>
      <mesh position={[0, 1.42, 0]} castShadow>
        <sphereGeometry args={[0.24, 16, 16]} />
        <meshStandardMaterial color="#d7b59a" roughness={0.8} wireframe={wireframe} />
      </mesh>
      <mesh position={[0, 1.62, 0]}>
        <sphereGeometry args={[0.28, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#f0c84b" roughness={0.55} wireframe={wireframe} />
      </mesh>
    </group>
  )
}

function MineWorld({
  phase,
  viewStyle = 'solid',
  showRoutes = true,
  showLabels = true,
}: Props) {
  const incidentActive = phase !== 'idle'
  const routeBlocked = phase === 'blocked' || phase === 'reroute' || phase === 'complete'
  const showSafeRoute = phase === 'reroute' || phase === 'complete'
  const rendered = viewStyle === 'rendered'
  const wireframe = viewStyle === 'wireframe'

  return (
    <>
      <color attach="background" args={[rendered ? '#07090a' : '#090b0d']} />
      <fog attach="fog" args={[rendered ? '#07090a' : '#090b0d', 11, 32]} />
      <ambientLight intensity={rendered ? 0.5 : 0.7} />
      <directionalLight position={[4, 8, 5]} intensity={rendered ? 3.0 : 2.3} castShadow />
      <pointLight position={[-4, 2.5, 4]} intensity={rendered ? 22 : 18} distance={8} color="#e2c16d" />
      <pointLight position={[3, 2.4, -5]} intensity={rendered ? 15 : 12} distance={7} color="#a7b8ff" />

      <TunnelSegment position={[-1.5, 0, 4]} scale={[13, 3.5, 4.2]} viewStyle={viewStyle} />
      <TunnelSegment position={[0, 0, -1]} scale={[4.2, 3.5, 8]} viewStyle={viewStyle} />
      <TunnelSegment position={[4, 0, -5]} scale={[8, 3.5, 4.2]} viewStyle={viewStyle} />

      {[-6, -3, 0, 3].map((x) => (
        <mesh key={`lamp-${x}`} position={[x, 3.05, 3.92]}>
          <boxGeometry args={[0.45, 0.12, 0.2]} />
          <meshStandardMaterial color="#e9d68a" emissive="#e9d68a" emissiveIntensity={2.4} wireframe={wireframe} />
        </mesh>
      ))}

      <Worker position={[-6.3, 0, 4]} viewStyle={viewStyle} />

      <mesh position={[2.8, 0.5, 4]} castShadow>
        <boxGeometry args={[1.9, 0.9, 1.25]} />
        <meshStandardMaterial color="#8b6a2d" roughness={0.75} metalness={0.35} wireframe={wireframe} />
      </mesh>
      <mesh position={[2.25, 0.92, 4]}>
        <boxGeometry args={[0.7, 0.9, 1.05]} />
        <meshStandardMaterial color="#6f5424" roughness={0.7} wireframe={wireframe} />
      </mesh>

      {incidentActive && (
        <group position={[2.8, 0.3, 4]}>
          <mesh>
            <sphereGeometry args={[1.25, 32, 32]} />
            <meshStandardMaterial
              color="#ff5b32"
              emissive="#ff3b16"
              emissiveIntensity={1.4}
              transparent
              opacity={0.23}
              side={THREE.DoubleSide}
              wireframe={wireframe}
            />
          </mesh>
          {showLabels && (
            <Text position={[0, 1.9, 0]} fontSize={0.38} color="#ff9b7b" anchorX="center">
              SIMULATED FIRE
            </Text>
          )}
        </group>
      )}

      {showRoutes && (
        <Line
          points={ROUTE_PRIMARY}
          color={routeBlocked ? '#b04a3a' : '#d1b55a'}
          lineWidth={routeBlocked ? 2 : 3}
          dashed={routeBlocked}
          dashScale={0.7}
        />
      )}

      {showRoutes && showSafeRoute && (
        <Line points={ROUTE_SAFE} color="#55d39a" lineWidth={4} />
      )}

      {routeBlocked && showRoutes && (
        <group position={[1.7, 0.6, 4]}>
          <mesh rotation={[0, 0, Math.PI / 4]}>
            <boxGeometry args={[2.6, 0.14, 0.14]} />
            <meshStandardMaterial color="#e55540" emissive="#9a2419" emissiveIntensity={1.5} wireframe={wireframe} />
          </mesh>
          <mesh rotation={[0, 0, -Math.PI / 4]}>
            <boxGeometry args={[2.6, 0.14, 0.14]} />
            <meshStandardMaterial color="#e55540" emissive="#9a2419" emissiveIntensity={1.5} wireframe={wireframe} />
          </mesh>
          {showLabels && (
            <Text position={[0, 1.6, 0]} fontSize={0.34} color="#ff8573" anchorX="center">
              ROUTE BLOCKED
            </Text>
          )}
        </group>
      )}

      {showLabels && (
        <Text position={[5.2, 1.4, -5]} rotation={[0, -Math.PI / 2, 0]} fontSize={0.34} color="#8ce1b4">
          REFUGE
        </Text>
      )}

      <OrbitControls
        makeDefault
        target={[0, 0.8, 1]}
        minDistance={7}
        maxDistance={22}
        maxPolarAngle={Math.PI / 2.02}
      />

      {rendered && <Environment preset="warehouse" />}
    </>
  )
}

export default function MineScene(props: Props) {
  return (
    <Canvas
      shadows
      camera={{ position: [-10, 7.5, 12], fov: 48 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true }}
    >
      <MineWorld {...props} />
    </Canvas>
  )
}