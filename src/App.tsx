import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, Stars, Float, Text, Html } from '@react-three/drei'
import { Suspense, useState, useRef, useCallback, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Types
interface OreDeposit {
  id: number
  position: [number, number, number]
  type: 'gold' | 'diamond' | 'emerald' | 'ruby' | 'coal'
  health: number
  maxHealth: number
}

interface Particle {
  id: number
  position: [number, number, number]
  velocity: [number, number, number]
  color: string
  life: number
}

// Ore colors and values
const oreConfig = {
  gold: { color: '#FFD700', emissive: '#B8860B', value: 50, glow: 0.3 },
  diamond: { color: '#B9F2FF', emissive: '#00CED1', value: 100, glow: 0.5 },
  emerald: { color: '#50C878', emissive: '#228B22', value: 75, glow: 0.4 },
  ruby: { color: '#E0115F', emissive: '#8B0000', value: 80, glow: 0.4 },
  coal: { color: '#1C1C1C', emissive: '#2F2F2F', value: 10, glow: 0.1 },
}

// Procedural Rock Wall
function RockWall({ position, rotation = [0, 0, 0] as [number, number, number] }: { position: [number, number, number], rotation?: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null!)

  return (
    <group position={position} rotation={rotation}>
      {/* Main wall */}
      <mesh>
        <boxGeometry args={[12, 8, 1]} />
        <meshStandardMaterial
          color="#3D3D3D"
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>
      {/* Rock protrusions */}
      {Array.from({ length: 15 }).map((_, i) => (
        <mesh
          key={i}
          position={[
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 6,
            0.3 + Math.random() * 0.5
          ]}
          rotation={[Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI]}
        >
          <dodecahedronGeometry args={[0.3 + Math.random() * 0.4]} />
          <meshStandardMaterial
            color={`hsl(30, 5%, ${15 + Math.random() * 15}%)`}
            roughness={0.95}
          />
        </mesh>
      ))}
    </group>
  )
}

// Glowing Ore Component
function OreNode({
  deposit,
  onMine
}: {
  deposit: OreDeposit
  onMine: (id: number) => void
}) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const [hovered, setHovered] = useState(false)
  const config = oreConfig[deposit.type]
  const healthPercent = deposit.health / deposit.maxHealth

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.5
      const scale = 0.8 + Math.sin(state.clock.elapsedTime * 2) * 0.1
      meshRef.current.scale.setScalar(scale * healthPercent * 0.8 + 0.2)
    }
  })

  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation()
    onMine(deposit.id)
  }

  if (deposit.health <= 0) return null

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.3}>
      <group position={deposit.position}>
        {/* Ore crystal cluster */}
        <mesh
          ref={meshRef}
          onClick={handleClick}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        >
          <octahedronGeometry args={[0.4]} />
          <meshStandardMaterial
            color={config.color}
            emissive={config.emissive}
            emissiveIntensity={hovered ? 1.5 : config.glow}
            roughness={0.2}
            metalness={0.8}
            transparent
            opacity={0.9}
          />
        </mesh>
        {/* Surrounding smaller crystals */}
        {[0, 1, 2, 3].map((i) => (
          <mesh
            key={i}
            position={[
              Math.cos(i * Math.PI / 2) * 0.3,
              Math.sin(i * 0.5) * 0.2,
              Math.sin(i * Math.PI / 2) * 0.3
            ]}
            rotation={[i * 0.5, i * 0.3, i * 0.7]}
            onClick={handleClick}
            onPointerOver={() => setHovered(true)}
            onPointerOut={() => setHovered(false)}
          >
            <octahedronGeometry args={[0.15]} />
            <meshStandardMaterial
              color={config.color}
              emissive={config.emissive}
              emissiveIntensity={hovered ? 1.2 : config.glow * 0.7}
              roughness={0.3}
              metalness={0.7}
            />
          </mesh>
        ))}
        {/* Point light for glow effect */}
        <pointLight
          color={config.color}
          intensity={hovered ? 2 : 0.5}
          distance={3}
        />
        {/* Health bar */}
        {hovered && (
          <Html position={[0, 0.8, 0]} center>
            <div className="bg-black/80 px-2 py-1 rounded border border-amber-500/50 whitespace-nowrap">
              <div className="text-xs text-amber-400 font-bold uppercase tracking-wider mb-1">
                {deposit.type}
              </div>
              <div className="w-20 h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-200"
                  style={{ width: `${healthPercent * 100}%` }}
                />
              </div>
            </div>
          </Html>
        )}
      </group>
    </Float>
  )
}

// Mining Particles
function MiningParticles({ particles }: { particles: Particle[] }) {
  return (
    <>
      {particles.map((p) => (
        <mesh key={p.id} position={p.position}>
          <boxGeometry args={[0.05, 0.05, 0.05]} />
          <meshBasicMaterial color={p.color} />
        </mesh>
      ))}
    </>
  )
}

// Mine Cart
function MineCart({ position }: { position: [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null!)

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.x = position[0] + Math.sin(state.clock.elapsedTime * 0.5) * 2
    }
  })

  return (
    <group ref={groupRef} position={position}>
      {/* Cart body */}
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[0.8, 0.4, 0.5]} />
        <meshStandardMaterial color="#5C4033" roughness={0.8} metalness={0.3} />
      </mesh>
      {/* Wheels */}
      {[[-0.3, 0.1, 0.3], [0.3, 0.1, 0.3], [-0.3, 0.1, -0.3], [0.3, 0.1, -0.3]].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 0.05, 16]} />
          <meshStandardMaterial color="#4A4A4A" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
      {/* Rails */}
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[6, 0.04, 0.08]} />
        <meshStandardMaterial color="#6B6B6B" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.02, 0.4]}>
        <boxGeometry args={[6, 0.04, 0.08]} />
        <meshStandardMaterial color="#6B6B6B" metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  )
}

// Pickaxe Cursor
function Pickaxe({ active }: { active: boolean }) {
  const ref = useRef<THREE.Group>(null!)

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.z = active
        ? Math.sin(state.clock.elapsedTime * 15) * 0.3
        : Math.sin(state.clock.elapsedTime * 2) * 0.1
    }
  })

  return (
    <group ref={ref} position={[3.5, -2, 0]}>
      {/* Handle */}
      <mesh rotation={[0, 0, -0.5]}>
        <cylinderGeometry args={[0.05, 0.07, 1.2, 8]} />
        <meshStandardMaterial color="#8B4513" roughness={0.8} />
      </mesh>
      {/* Head */}
      <mesh position={[0.3, 0.5, 0]} rotation={[0, 0, -0.5]}>
        <boxGeometry args={[0.6, 0.15, 0.1]} />
        <meshStandardMaterial color="#4A4A4A" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* Pick point */}
      <mesh position={[0.6, 0.6, 0]} rotation={[0, 0, 0.3]}>
        <coneGeometry args={[0.08, 0.3, 4]} />
        <meshStandardMaterial color="#5A5A5A" metalness={0.9} roughness={0.2} />
      </mesh>
    </group>
  )
}

// Lantern
function Lantern({ position }: { position: [number, number, number] }) {
  const [intensity, setIntensity] = useState(1)

  useFrame((state) => {
    setIntensity(0.8 + Math.sin(state.clock.elapsedTime * 5) * 0.2)
  })

  return (
    <group position={position}>
      {/* Lantern body */}
      <mesh>
        <cylinderGeometry args={[0.1, 0.12, 0.25, 8]} />
        <meshStandardMaterial color="#2F2F2F" metalness={0.7} />
      </mesh>
      {/* Glass */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.15, 8]} />
        <meshStandardMaterial
          color="#FFAA00"
          transparent
          opacity={0.5}
          emissive="#FF8800"
          emissiveIntensity={0.5}
        />
      </mesh>
      {/* Light */}
      <pointLight color="#FF9933" intensity={intensity * 3} distance={8} />
    </group>
  )
}

// Support Beams
function SupportBeam({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Vertical posts */}
      <mesh position={[-2, 0, 0]}>
        <boxGeometry args={[0.3, 4, 0.3]} />
        <meshStandardMaterial color="#5D3A1A" roughness={0.9} />
      </mesh>
      <mesh position={[2, 0, 0]}>
        <boxGeometry args={[0.3, 4, 0.3]} />
        <meshStandardMaterial color="#5D3A1A" roughness={0.9} />
      </mesh>
      {/* Horizontal beam */}
      <mesh position={[0, 2, 0]}>
        <boxGeometry args={[4.6, 0.3, 0.3]} />
        <meshStandardMaterial color="#5D3A1A" roughness={0.9} />
      </mesh>
    </group>
  )
}

// Cave floor
function CaveFloor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
      <planeGeometry args={[30, 30]} />
      <meshStandardMaterial
        color="#2A2A2A"
        roughness={0.95}
        metalness={0.05}
      />
    </mesh>
  )
}

// Main Scene
function MiningScene({
  ores,
  onMine,
  particles,
  isMining
}: {
  ores: OreDeposit[]
  onMine: (id: number) => void
  particles: Particle[]
  isMining: boolean
}) {
  return (
    <>
      {/* Ambient and directional lighting */}
      <ambientLight intensity={0.15} color="#4A3728" />
      <directionalLight position={[5, 10, 5]} intensity={0.3} color="#FFE4C4" />

      {/* Stars for depth */}
      <Stars radius={50} depth={50} count={500} factor={2} fade speed={0.5} />

      {/* Cave structure */}
      <CaveFloor />
      <RockWall position={[0, 2, -5]} />
      <RockWall position={[-6, 2, 0]} rotation={[0, Math.PI / 2, 0]} />
      <RockWall position={[6, 2, 0]} rotation={[0, -Math.PI / 2, 0]} />

      {/* Support beams */}
      <SupportBeam position={[0, 0, -3]} />
      <SupportBeam position={[0, 0, 2]} />

      {/* Lanterns */}
      <Lantern position={[-2, 1.5, -3]} />
      <Lantern position={[2, 1.5, -3]} />
      <Lantern position={[0, 1.5, 2]} />

      {/* Mine cart */}
      <MineCart position={[0, -1.9, 3]} />

      {/* Ore deposits */}
      {ores.map((ore) => (
        <OreNode key={ore.id} deposit={ore} onMine={onMine} />
      ))}

      {/* Mining particles */}
      <MiningParticles particles={particles} />

      {/* Pickaxe */}
      <Pickaxe active={isMining} />

      {/* Camera controls */}
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={3}
        maxDistance={15}
        maxPolarAngle={Math.PI / 2}
        target={[0, 0, 0]}
      />
    </>
  )
}

// Generate initial ores
function generateOres(): OreDeposit[] {
  const types: OreDeposit['type'][] = ['gold', 'diamond', 'emerald', 'ruby', 'coal']
  const ores: OreDeposit[] = []

  for (let i = 0; i < 12; i++) {
    const type = types[Math.floor(Math.random() * types.length)]
    ores.push({
      id: i,
      position: [
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.3) * 3,
        (Math.random() - 0.5) * 6 - 2
      ],
      type,
      health: 3,
      maxHealth: 3
    })
  }

  return ores
}

// Main App Component
export default function App() {
  const [ores, setOres] = useState<OreDeposit[]>(generateOres)
  const [score, setScore] = useState(0)
  const [particles, setParticles] = useState<Particle[]>([])
  const [isMining, setIsMining] = useState(false)
  const [miningStats, setMiningStats] = useState({
    gold: 0,
    diamond: 0,
    emerald: 0,
    ruby: 0,
    coal: 0
  })
  const particleIdRef = useRef(0)

  // Spawn particles
  const spawnParticles = useCallback((position: [number, number, number], color: string) => {
    const newParticles: Particle[] = []
    for (let i = 0; i < 8; i++) {
      newParticles.push({
        id: particleIdRef.current++,
        position: [...position] as [number, number, number],
        velocity: [
          (Math.random() - 0.5) * 0.3,
          Math.random() * 0.2 + 0.1,
          (Math.random() - 0.5) * 0.3
        ],
        color,
        life: 1
      })
    }
    setParticles(prev => [...prev, ...newParticles])
  }, [])

  // Update particles
  useEffect(() => {
    if (particles.length === 0) return

    const interval = setInterval(() => {
      setParticles(prev =>
        prev
          .map(p => ({
            ...p,
            position: [
              p.position[0] + p.velocity[0],
              p.position[1] + p.velocity[1] - 0.02,
              p.position[2] + p.velocity[2]
            ] as [number, number, number],
            life: p.life - 0.05
          }))
          .filter(p => p.life > 0)
      )
    }, 50)

    return () => clearInterval(interval)
  }, [particles.length])

  // Handle mining
  const handleMine = useCallback((id: number) => {
    setIsMining(true)
    setTimeout(() => setIsMining(false), 200)

    setOres(prev => {
      const updated = prev.map(ore => {
        if (ore.id === id) {
          const newHealth = ore.health - 1

          // Spawn particles
          spawnParticles(ore.position, oreConfig[ore.type].color)

          // If ore is depleted
          if (newHealth <= 0) {
            const value = oreConfig[ore.type].value
            setScore(s => s + value)
            setMiningStats(stats => ({
              ...stats,
              [ore.type]: stats[ore.type] + 1
            }))
          }

          return { ...ore, health: newHealth }
        }
        return ore
      })
      return updated
    })
  }, [spawnParticles])

  // Regenerate ores
  const handleRegenerate = () => {
    setOres(generateOres())
  }

  const totalMined = Object.values(miningStats).reduce((a, b) => a + b, 0)

  return (
    <div className="w-screen h-screen bg-gradient-to-b from-[#0D0D0D] via-[#1A1209] to-[#0D0805] overflow-hidden relative">
      {/* Grain overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30 z-10"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Header HUD */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 md:p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          {/* Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-amber-500 to-amber-700 rounded-lg flex items-center justify-center shadow-lg shadow-amber-500/30">
              <span className="text-xl md:text-2xl">⛏️</span>
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-amber-400 tracking-tight" style={{ fontFamily: 'Cinzel Decorative, serif' }}>
                DEEP MINE
              </h1>
              <p className="text-[10px] md:text-xs text-amber-600/80 uppercase tracking-[0.2em]">
                Click ores to mine
              </p>
            </div>
          </div>

          {/* Score */}
          <div className="flex items-center gap-4 md:gap-6">
            <div className="bg-black/60 backdrop-blur-sm border border-amber-500/30 rounded-lg px-4 py-2 md:px-6 md:py-3">
              <div className="text-[10px] md:text-xs text-amber-600 uppercase tracking-wider mb-1">Gold Earned</div>
              <div className="text-xl md:text-3xl font-bold text-amber-400" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                {score.toLocaleString()}
              </div>
            </div>
            <button
              onClick={handleRegenerate}
              className="bg-gradient-to-br from-amber-600 to-amber-800 hover:from-amber-500 hover:to-amber-700 text-white px-4 py-2 md:px-5 md:py-3 rounded-lg font-bold text-sm uppercase tracking-wider transition-all duration-200 shadow-lg shadow-amber-600/30 hover:shadow-amber-500/50 active:scale-95 min-h-[44px]"
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              New Vein
            </button>
          </div>
        </div>
      </div>

      {/* Mining Stats Panel */}
      <div className="absolute top-24 md:top-28 left-4 md:left-6 z-20 bg-black/60 backdrop-blur-sm border border-amber-500/20 rounded-lg p-3 md:p-4 w-40 md:w-48">
        <div className="text-[10px] md:text-xs text-amber-600 uppercase tracking-wider mb-2 md:mb-3 border-b border-amber-500/20 pb-2">
          Mined: {totalMined}
        </div>
        <div className="space-y-1.5 md:space-y-2">
          {Object.entries(miningStats).map(([type, count]) => (
            <div key={type} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-sm"
                  style={{ backgroundColor: oreConfig[type as keyof typeof oreConfig].color }}
                />
                <span className="text-[10px] md:text-xs text-amber-300/80 uppercase">{type}</span>
              </div>
              <span className="text-xs md:text-sm text-amber-400 font-bold" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                {count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-20 left-4 md:bottom-16 md:left-6 z-20 bg-black/60 backdrop-blur-sm border border-amber-500/20 rounded-lg p-3 md:p-4 max-w-[200px] md:max-w-xs">
        <div className="text-[10px] md:text-xs text-amber-500/80 space-y-1">
          <p>🖱️ <span className="text-amber-400">Click</span> ores to mine</p>
          <p>🔄 <span className="text-amber-400">Drag</span> to rotate view</p>
          <p>📏 <span className="text-amber-400">Scroll</span> to zoom</p>
        </div>
      </div>

      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [5, 3, 8], fov: 50 }}
        className="cursor-pointer"
        style={{ position: 'absolute', inset: 0 }}
      >
        <Suspense fallback={null}>
          <MiningScene
            ores={ores}
            onMine={handleMine}
            particles={particles}
            isMining={isMining}
          />
        </Suspense>
      </Canvas>

      {/* Footer */}
      <div className="absolute bottom-3 md:bottom-4 left-0 right-0 z-20 text-center">
        <p className="text-[10px] md:text-xs text-amber-700/50" style={{ fontFamily: 'Crimson Text, serif' }}>
          Requested by @brandonn2221 · Built by @clonkbot
        </p>
      </div>
    </div>
  )
}
