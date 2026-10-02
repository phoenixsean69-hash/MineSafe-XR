import { Canvas } from '@react-three/fiber'
import { Environment, Line, OrbitControls, Text } from '@react-three/drei'
import * as THREE from 'three'
import type { DrillPhase, ScenarioKind, ViewStyle } from '../types'

type Props = {
  phase: DrillPhase
  scenario: ScenarioKind
  viewStyle?: ViewStyle
  showRoutes?: boolean
  showLabels?: boolean
}

const ROUTE_PRIMARY: [number, number, number][] = [
  [-7.5, 0.23, 4],
  [-2.6, 0.23, 4],
  [2.8, 0.23, 4],
]

const ROUTE_SAFE: [number, number, number][] = [
  [-7.5, 0.25, 4],
  [-2.5, 0.25, 4],
  [0, 0.25, 1.5],
  [0, 0.25, -5],
  [5.6, 0.25, -5],
]

function Rock({ position, scale = 1, color = '#34383b' }: { position: [number, number, number]; scale?: number; color?: string }) {
  return (
    <mesh position={position} scale={scale} rotation={[0.3, 0.5, 0.2]} castShadow receiveShadow>
      <dodecahedronGeometry args={[0.45, 0]} />
      <meshStandardMaterial color={color} roughness={1} />
    </mesh>
  )
}

function SupportFrame({
  position,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number]
  rotation?: [number, number, number]
}) {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[-1.78, 1.5, 0]} castShadow>
        <boxGeometry args={[0.14, 3.0, 0.14]} />
        <meshStandardMaterial color="#555a5d" metalness={0.55} roughness={0.55} />
      </mesh>
      <mesh position={[1.78, 1.5, 0]} castShadow>
        <boxGeometry args={[0.14, 3.0, 0.14]} />
        <meshStandardMaterial color="#555a5d" metalness={0.55} roughness={0.55} />
      </mesh>
      <mesh position={[0, 3.0, 0]} castShadow>
        <boxGeometry args={[3.7, 0.14, 0.14]} />
        <meshStandardMaterial color="#555a5d" metalness={0.55} roughness={0.55} />
      </mesh>
    </group>
  )
}

function TunnelSection({
  position,
  scale,
  viewStyle,
  along = 'x',
}: {
  position: [number, number, number]
  scale: [number, number, number]
  viewStyle: ViewStyle
  along?: 'x' | 'z'
}) {
  const wireframe = viewStyle === 'wireframe'
  const wallColor = viewStyle === 'rendered' ? '#24282b' : '#1d2124'
  const floorColor = viewStyle === 'rendered' ? '#3b3f40' : '#292d2f'
  const length = along === 'x' ? scale[0] : scale[2]

  const supports = []
  for (let i = -Math.floor(length / 2) + 1; i < Math.floor(length / 2); i += 2.2) {
    supports.push(i)
  }

  return (
    <group position={position}>
      <mesh position={[0, -0.1, 0]} receiveShadow>
        <boxGeometry args={[scale[0], 0.18, scale[2]]} />
        <meshStandardMaterial color={floorColor} roughness={0.98} wireframe={wireframe} />
      </mesh>

      <mesh position={[0, 1.55, -scale[2] / 2]} receiveShadow>
        <boxGeometry args={[scale[0], 3.2, 0.16]} />
        <meshStandardMaterial color={wallColor} roughness={1} wireframe={wireframe} />
      </mesh>

      <mesh position={[0, 1.55, scale[2] / 2]} receiveShadow>
        <boxGeometry args={[scale[0], 3.2, 0.16]} />
        <meshStandardMaterial color={wallColor} roughness={1} wireframe={wireframe} />
      </mesh>

      <mesh position={[0, 3.12, 0]} receiveShadow>
        <boxGeometry args={[scale[0], 0.16, scale[2]]} />
        <meshStandardMaterial color="#262a2d" roughness={1} wireframe={wireframe} />
      </mesh>

      {supports.map((offset) =>
        along === 'x' ? (
          <SupportFrame key={offset} position={[offset, 0, 0]} rotation={[0, Math.PI / 2, 0]} />
        ) : (
          <SupportFrame key={offset} position={[0, 0, offset]} />
        ),
      )}
    </group>
  )
}

function VentDuct({ start, length, axis = 'x' }: { start: [number, number, number]; length: number; axis?: 'x' | 'z' }) {
  const rotation: [number, number, number] = axis === 'x' ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0]
  return (
    <group position={start}>
      <mesh rotation={rotation} castShadow>
        <cylinderGeometry args={[0.34, 0.34, length, 18]} />
        <meshStandardMaterial color="#777d80" metalness={0.45} roughness={0.62} />
      </mesh>
      <mesh position={axis === 'x' ? [length / 2, 0, 0] : [0, 0, length / 2]} rotation={rotation}>
        <torusGeometry args={[0.35, 0.035, 8, 18]} />
        <meshStandardMaterial color="#a1a5a6" metalness={0.6} roughness={0.45} />
      </mesh>
    </group>
  )
}

function Lamp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[0.46, 0.1, 0.18]} />
        <meshStandardMaterial color="#e7d58a" emissive="#e7d58a" emissiveIntensity={3} />
      </mesh>
      <pointLight position={[0, -0.2, 0]} intensity={7} distance={4.5} color="#f1dda0" />
    </group>
  )
}

function Worker({ position, viewStyle }: { position: [number, number, number]; viewStyle: ViewStyle }) {
  const wireframe = viewStyle === 'wireframe'

  return (
    <group position={position}>
      <mesh position={[0, 1.08, 0]} castShadow>
        <boxGeometry args={[0.48, 0.72, 0.30]} />
        <meshStandardMaterial color="#d5a52f" roughness={0.62} wireframe={wireframe} />
      </mesh>

      <mesh position={[0, 1.17, 0.165]}>
        <boxGeometry args={[0.50, 0.14, 0.025]} />
        <meshStandardMaterial color="#e6e6d8" emissive="#a6a68c" emissiveIntensity={0.18} />
      </mesh>

      <mesh position={[0, 1.58, 0]} castShadow>
        <sphereGeometry args={[0.21, 18, 18]} />
        <meshStandardMaterial color="#8f5b38" roughness={0.8} wireframe={wireframe} />
      </mesh>

      <mesh position={[0, 1.78, 0]}>
        <cylinderGeometry args={[0.28, 0.23, 0.12, 18]} />
        <meshStandardMaterial color="#e7c447" roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.81, 0.13]} rotation={[Math.PI / 2, 0, 0]}>
        <boxGeometry args={[0.42, 0.08, 0.05]} />
        <meshStandardMaterial color="#e7c447" roughness={0.5} />
      </mesh>

      <mesh position={[-0.15, 0.48, 0]}>
        <boxGeometry args={[0.15, 0.78, 0.18]} />
        <meshStandardMaterial color="#39424a" roughness={0.8} wireframe={wireframe} />
      </mesh>
      <mesh position={[0.15, 0.48, 0]}>
        <boxGeometry args={[0.15, 0.78, 0.18]} />
        <meshStandardMaterial color="#39424a" roughness={0.8} wireframe={wireframe} />
      </mesh>

      <mesh position={[-0.33, 1.12, 0]} rotation={[0, 0, -0.12]}>
        <boxGeometry args={[0.12, 0.68, 0.16]} />
        <meshStandardMaterial color="#8f5b38" roughness={0.8} wireframe={wireframe} />
      </mesh>
      <mesh position={[0.33, 1.12, 0]} rotation={[0, 0, 0.12]}>
        <boxGeometry args={[0.12, 0.68, 0.16]} />
        <meshStandardMaterial color="#8f5b38" roughness={0.8} wireframe={wireframe} />
      </mesh>
    </group>
  )
}

function Loader({ position, viewStyle }: { position: [number, number, number]; viewStyle: ViewStyle }) {
  const wireframe = viewStyle === 'wireframe'

  return (
    <group position={position}>
      <mesh position={[0, 0.68, 0]} castShadow>
        <boxGeometry args={[2.6, 0.75, 1.2]} />
        <meshStandardMaterial color="#c9902c" roughness={0.62} metalness={0.25} wireframe={wireframe} />
      </mesh>

      <mesh position={[-0.55, 1.22, 0]} castShadow>
        <boxGeometry args={[0.9, 0.9, 1.0]} />
        <meshStandardMaterial color="#a56d1d" roughness={0.58} wireframe={wireframe} />
      </mesh>
      <mesh position={[-0.55, 1.27, 0.48]}>
        <boxGeometry args={[0.62, 0.52, 0.05]} />
        <meshStandardMaterial color="#22292e" metalness={0.2} roughness={0.35} />
      </mesh>

      {[-0.88, 0.85].map((x) =>
        [-0.55, 0.55].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, 0.40, z]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.42, 0.42, 0.28, 18]} />
            <meshStandardMaterial color="#17191b" roughness={0.9} />
          </mesh>
        )),
      )}

      <group position={[1.65, 0.55, 0]}>
        <mesh rotation={[0, 0, -0.22]}>
          <boxGeometry args={[1.55, 0.18, 0.22]} />
          <meshStandardMaterial color="#b67b24" metalness={0.25} roughness={0.6} />
        </mesh>
        <mesh position={[0.95, -0.18, 0]}>
          <boxGeometry args={[0.8, 0.42, 1.25]} />
          <meshStandardMaterial color="#a97025" roughness={0.7} />
        </mesh>
      </group>
    </group>
  )
}

function Refuge({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow>
        <boxGeometry args={[1.7, 2.3, 1.2]} />
        <meshStandardMaterial color="#5a6268" metalness={0.45} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0, 0.62]}>
        <boxGeometry args={[1.0, 1.6, 0.05]} />
        <meshStandardMaterial color="#2c3337" roughness={0.65} />
      </mesh>
      <mesh position={[0, 1.55, 0.67]}>
        <boxGeometry args={[1.35, 0.32, 0.04]} />
        <meshStandardMaterial color="#2f805d" emissive="#1e5c42" emissiveIntensity={0.4} />
      </mesh>
      <Text position={[0, 1.55, 0.72]} fontSize={0.16} color="#e7f5ed" anchorX="center">
        REFUGE 2
      </Text>
    </group>
  )
}

function FireHazard({ active, labels }: { active: boolean; labels: boolean }) {
  if (!active) return null

  return (
    <group position={[2.7, 0.45, 4]}>
      <mesh position={[0, 0.5, 0]}>
        <coneGeometry args={[0.46, 1.35, 18]} />
        <meshStandardMaterial color="#f06a32" emissive="#f03a18" emissiveIntensity={2.2} transparent opacity={0.8} />
      </mesh>
      <mesh position={[0.08, 0.92, 0]} scale={0.58}>
        <coneGeometry args={[0.42, 1.2, 18]} />
        <meshStandardMaterial color="#ffd05d" emissive="#ff9b32" emissiveIntensity={2.5} transparent opacity={0.8} />
      </mesh>

      {[[-0.4, 1.6, 0.1], [0.2, 1.9, -0.1], [0.55, 2.2, 0.12], [-0.2, 2.45, -0.15]].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]} scale={0.75 + i * 0.15}>
          <sphereGeometry args={[0.48, 16, 16]} />
          <meshStandardMaterial color="#60666a" transparent opacity={0.2 - i * 0.025} />
        </mesh>
      ))}

      {labels && (
        <Text position={[0, 2.9, 0]} fontSize={0.28} color="#ff9b7b" anchorX="center">
          SIMULATED FIRE
        </Text>
      )}
    </group>
  )
}

function RockfallHazard({ active, labels }: { active: boolean; labels: boolean }) {
  if (!active) return null

  const positions: [number, number, number][] = [
    [1.6, 0.35, 4],
    [2.0, 0.5, 4.15],
    [2.35, 0.3, 3.8],
    [2.65, 0.55, 4.05],
    [1.95, 0.85, 3.95],
    [2.45, 0.92, 4.18],
  ]

  return (
    <group>
      {positions.map((p, index) => <Rock key={index} position={p} scale={0.9 + (index % 3) * 0.22} color="#4a4a46" />)}
      {labels && (
        <Text position={[2.2, 1.9, 4]} fontSize={0.28} color="#e7a17f" anchorX="center">
          SIMULATED ROCKFALL
        </Text>
      )}
    </group>
  )
}

function VentilationHazard({ active, labels }: { active: boolean; labels: boolean }) {
  return (
    <group position={[0, 1.2, -4.8]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.75, 0.75, 0.32, 28]} />
        <meshStandardMaterial color={active ? '#75433b' : '#4c626a'} metalness={0.45} roughness={0.55} />
      </mesh>

      {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((rotation, index) => (
        <mesh key={index} rotation={[0, 0, rotation]} position={[0, 0, 0.18]}>
          <boxGeometry args={[0.12, 0.95, 0.08]} />
          <meshStandardMaterial color="#7c8589" metalness={0.55} roughness={0.45} />
        </mesh>
      ))}

      {labels && (
        <Text position={[0, 1.25, 0]} fontSize={0.25} color={active ? '#e78b75' : '#9dd2d2'} anchorX="center">
          {active ? 'FAN 03 FAILED' : 'FAN 03'}
        </Text>
      )}
    </group>
  )
}

function RouteMarkers({
  route,
  color,
}: {
  route: [number, number, number][]
  color: string
}) {
  return (
    <>
      {route.slice(1, -1).map((point, index) => (
        <mesh key={`${color}-${index}`} position={[point[0], 0.34, point[2]]} rotation={[0, 0, Math.PI]}>
          <coneGeometry args={[0.12, 0.34, 8]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} />
        </mesh>
      ))}
    </>
  )
}

function MineWorld({
  phase,
  scenario,
  viewStyle = 'solid',
  showRoutes = true,
  showLabels = true,
}: Props) {
  const incidentActive = phase !== 'idle'
  const routeBlocked = phase === 'blocked' || phase === 'reroute' || phase === 'complete'
  const safeRouteVisible = phase === 'reroute' || phase === 'complete'
  const rendered = viewStyle === 'rendered'

  return (
    <>
      <color attach="background" args={[rendered ? '#080a0b' : '#0b0d0e']} />
      <fog attach="fog" args={[rendered ? '#080a0b' : '#0b0d0e', 11, 34]} />
      <ambientLight intensity={rendered ? 0.42 : 0.62} />
      <directionalLight position={[4, 9, 6]} intensity={rendered ? 3.0 : 2.0} castShadow />

      <TunnelSection position={[-1.5, 0, 4]} scale={[14, 3.2, 4.0]} viewStyle={viewStyle} along="x" />
      <TunnelSection position={[0, 0, -0.5]} scale={[4.0, 3.2, 9]} viewStyle={viewStyle} along="z" />
      <TunnelSection position={[4.2, 0, -5]} scale={[8.5, 3.2, 4.0]} viewStyle={viewStyle} along="x" />

      <VentDuct start={[-1.3, 2.55, 3.45]} length={9.8} axis="x" />
      <VentDuct start={[0.65, 2.52, -1]} length={5.6} axis="z" />

      {[-6, -3.5, -1, 1.5, 4].map((x) => <Lamp key={x} position={[x, 2.82, 3.55]} />)}
      {[-3.5, -1.2, 1.0].map((z) => <Lamp key={`z-${z}`} position={[0.55, 2.82, z]} />)}

      <mesh position={[-0.1, 2.72, 3.72]}>
        <boxGeometry args={[11.5, 0.05, 0.06]} />
        <meshStandardMaterial color="#3b464e" metalness={0.45} roughness={0.5} />
      </mesh>

      <Worker position={[-6.3, 0, 4]} viewStyle={viewStyle} />
      <Loader position={[2.7, 0, 4]} viewStyle={viewStyle} />
      <Refuge position={[5.4, 1.12, -5]} />

      <Rock position={[-4.9, 0.22, 2.5]} scale={0.55} />
      <Rock position={[-3.8, 0.15, 5.45]} scale={0.42} />
      <Rock position={[1.6, 0.16, -2.5]} scale={0.48} />

      <FireHazard active={scenario === 'fire' && incidentActive} labels={showLabels} />
      <RockfallHazard active={scenario === 'rockfall' && (phase === 'blocked' || phase === 'reroute' || phase === 'complete')} labels={showLabels} />
      <VentilationHazard active={scenario === 'ventilation' && incidentActive} labels={showLabels} />

      {showRoutes && (
        <>
          <Line
            points={ROUTE_PRIMARY}
            color={routeBlocked ? '#bc5b4a' : '#d4b75f'}
            lineWidth={routeBlocked ? 2 : 3}
            dashed={routeBlocked}
            dashScale={0.7}
          />
          <RouteMarkers route={ROUTE_PRIMARY} color={routeBlocked ? '#bc5b4a' : '#d4b75f'} />
        </>
      )}

      {showRoutes && safeRouteVisible && (
        <>
          <Line points={ROUTE_SAFE} color="#62c99c" lineWidth={4} />
          <RouteMarkers route={ROUTE_SAFE} color="#62c99c" />
        </>
      )}

      {routeBlocked && showRoutes && (
        <group position={[1.65, 0.75, 4]}>
          <mesh rotation={[0, 0, Math.PI / 4]}>
            <boxGeometry args={[2.2, 0.12, 0.12]} />
            <meshStandardMaterial color="#d85b49" emissive="#a23628" emissiveIntensity={0.8} />
          </mesh>
          <mesh rotation={[0, 0, -Math.PI / 4]}>
            <boxGeometry args={[2.2, 0.12, 0.12]} />
            <meshStandardMaterial color="#d85b49" emissive="#a23628" emissiveIntensity={0.8} />
          </mesh>
          {showLabels && (
            <Text position={[0, 1.45, 0]} fontSize={0.25} color="#ef8371" anchorX="center">
              ROUTE BLOCKED
            </Text>
          )}
        </group>
      )}

      <OrbitControls
        makeDefault
        target={[0, 0.9, 1]}
        minDistance={6.5}
        maxDistance={22}
        maxPolarAngle={Math.PI / 2.03}
      />

      {rendered && <Environment preset="warehouse" />}
    </>
  )
}

export default function MineScene(props: Props) {
  return (
    <Canvas
      shadows
      camera={{ position: [-10.5, 7.2, 12.8], fov: 47 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true }}
    >
      <MineWorld {...props} />
    </Canvas>
  )
}