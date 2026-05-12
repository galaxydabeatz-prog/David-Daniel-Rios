/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect, useCallback, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cpu, Music, Radio, Sparkles, Zap, Layers, ChevronRight, Globe, Compass, Terminal, Activity, Shield, Box, Play, Pause, Volume2, Maximize2 } from 'lucide-react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, MeshDistortMaterial, Float, Sphere, MeshWobbleMaterial, PresentationControls, Stars, PerspectiveCamera, Text, Environment } from '@react-three/drei';
import * as THREE from 'three';

// --- Audio Visualizer Logic ---
const useAudioAnalyzer = (isPlaying: boolean) => {
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [dataArray, setDataArray] = useState<Uint8Array | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<OscillatorNode | null>(null);

  useEffect(() => {
    if (isPlaying && !audioContextRef.current) {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyzerNode = audioCtx.createAnalyser();
      analyzerNode.fftSize = 256;
      
      const bufferLength = analyzerNode.frequencyBinCount;
      const data = new Uint8Array(bufferLength);
      
      // For demo purposes, we use an oscillator as a mock source 
      // In a real app, this would be a gain node from an <audio> element
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.0001, audioCtx.currentTime); // Keep it quiet
      
      osc.connect(gain);
      gain.connect(analyzerNode);
      analyzerNode.connect(audioCtx.destination);
      
      osc.start();
      
      audioContextRef.current = audioCtx;
      sourceRef.current = osc;
      setAnalyser(analyzerNode);
      setDataArray(data);
    }

    if (!isPlaying && audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
      setAnalyser(null);
      setDataArray(null);
    }
  }, [isPlaying]);

  return { analyser, dataArray };
};

const FrequencyVisualizer = ({ analyser, dataArray }: { analyser: AnalyserNode | null; dataArray: Uint8Array | null }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        canvas.width = entry.contentRect.width;
        canvas.height = entry.contentRect.height;
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!analyser || !dataArray || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      analyser.getByteFrequencyData(dataArray);
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const barWidth = (canvas.width / dataArray.length) * 2.5;
      let x = 0;

      for (let i = 0; i < dataArray.length; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        
        const r = 132 + (i / dataArray.length) * 100;
        const g = 94;
        const b = 247;
        
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${dataArray[i] / 255 + 0.1})`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        
        x += barWidth + 1;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [analyser, dataArray]);

  return (
    <div ref={containerRef} className="w-full h-full">
      <canvas ref={canvasRef} className="w-full h-full opacity-60" />
    </div>
  );
};

const GlobalBackground3D = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      <Canvas camera={{ position: [0, 0, 20], fov: 60 }}>
        <Suspense fallback={null}>
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          <ambientLight intensity={0.2} />
          <pointLight position={[10, 10, 10]} intensity={0.5} />
          <Float speed={1} rotationIntensity={0.5} floatIntensity={0.5}>
            <fog attach="fog" args={['#020202', 10, 50]} />
          </Float>
        </Suspense>
      </Canvas>
    </div>
  );
};

const ConsciousGateScene = ({ avg }: { avg: number }) => {
  return (
    <Float speed={5} rotationIntensity={2} floatIntensity={2}>
      <mesh rotation={[Math.PI / 4, Math.PI / 4, 0]}>
        <boxGeometry args={[2, 2, 0.1]} />
        <MeshWobbleMaterial color="#a78bfa" factor={avg * 2} speed={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 4, -Math.PI / 4, 0]}>
        <torusGeometry args={[1.5, 0.05, 16, 100]} />
        <MeshDistortMaterial color="#f0cf7b" distort={avg} speed={2} />
      </mesh>
    </Float>
  );
};

const DimenSyncScene = ({ avg }: { avg: number }) => {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.getElapsedTime() * (0.5 + avg);
    }
  });
  return (
    <group ref={groupRef}>
      {[...Array(8)].map((_, i) => (
        <mesh key={i} position={[Math.cos(i * Math.PI / 4) * 2, Math.sin(i * Math.PI / 4) * 2, 0]}>
          <sphereGeometry args={[0.2 + avg * 0.5, 32, 32]} />
          <meshStandardMaterial color={i % 2 === 0 ? "#a78bfa" : "#f0cf7b"} emissive={i % 2 === 0 ? "#a78bfa" : "#f0cf7b"} emissiveIntensity={avg * 2} />
        </mesh>
      ))}
      <mesh>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="white" wireframe />
      </mesh>
    </group>
  );
};

const FluxReactiveScene = ({ avg }: { avg: number }) => {
  return (
    <mesh>
      <sphereGeometry args={[1.5, 64, 64]} />
      <MeshDistortMaterial color="#a78bfa" speed={3} distort={0.6 + avg} radius={1} />
      <meshStandardMaterial color="#f0cf7b" wireframe opacity={0.1} transparent />
    </mesh>
  );
};

const NeuralTrajectoryScene = ({ avg }: { avg: number }) => {
  const lineRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (lineRef.current) {
      lineRef.current.rotation.z = state.clock.getElapsedTime() * 2;
    }
  });
  return (
    <group>
      <mesh ref={lineRef}>
        <torusKnotGeometry args={[1.2, 0.3, 128, 16]} />
        <MeshWobbleMaterial color="#a78bfa" factor={avg * 3} speed={2} />
      </mesh>
      <Stars radius={10} depth={2} count={100} factor={1} saturation={1} />
    </group>
  );
};

const SacredModuleScene = ({ avg }: { avg: number }) => {
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <tetrahedronGeometry args={[2, 0]} />
        <meshStandardMaterial color="#f0cf7b" wireframe />
      </mesh>
      <mesh>
        <dodecahedronGeometry args={[1, 0]} />
        <MeshDistortMaterial color="#a78bfa" speed={1} distort={avg * 0.5} />
      </mesh>
    </group>
  );
};

const KineticCinemaScene = ({ avg }: { avg: number }) => {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.getElapsedTime() * 0.2;
    }
  });
  return (
    <group ref={ref}>
      {[...Array(5)].map((_, i) => (
        <mesh key={i} position={[0, 0, i * -2]} rotation={[0, 0, i * Math.PI / 10]}>
          <planeGeometry args={[4, 2.25]} />
          <meshStandardMaterial color="#a78bfa" transparent opacity={0.2} wireframe />
          <mesh position={[0, 0, 0.01]}>
             <planeGeometry args={[3.8, 2]} />
             <meshStandardMaterial color="#f0cf7b" transparent opacity={0.1 + avg * 0.5} />
          </mesh>
        </mesh>
      ))}
    </group>
  );
};

const GalaxyModel = ({ analyser, dataArray, index }: { analyser: AnalyserNode | null; dataArray: Uint8Array | null, index: number }) => {
  const [avg, setAvg] = useState(0);

  useFrame(() => {
    if (analyser && dataArray) {
      analyser.getByteFrequencyData(dataArray);
      const currentAvg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length / 255;
      setAvg(currentAvg);
    }
  });

  const renderScene = () => {
    switch (index) {
      case 0: return <ConsciousGateScene avg={avg} />;
      case 1: return <DimenSyncScene avg={avg} />;
      case 2: return <FluxReactiveScene avg={avg} />;
      case 3: return <NeuralTrajectoryScene avg={avg} />;
      case 4: return <SacredModuleScene avg={avg} />;
      case 5: return <KineticCinemaScene avg={avg} />;
      default: return <ConsciousGateScene avg={avg} />;
    }
  };

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#f0cf7b" />
      <spotLight position={[-10, 10, 10]} angle={0.15} penumbra={1} intensity={2} color="#a78bfa" />
      
      {renderScene()}

      <OrbitControls 
        enableZoom={true} 
        enablePan={true} 
        autoRotate 
        autoRotateSpeed={0.5}
        maxDistance={15}
        minDistance={2}
      />
    </>
  );
};

const Galaxy3DVisualizer = ({ analyser, dataArray, index }: { analyser: AnalyserNode | null; dataArray: Uint8Array | null, index: number }) => {
  return (
    <div className="w-full h-full cursor-move">
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
        <Suspense fallback={null}>
          <GalaxyModel analyser={analyser} dataArray={dataArray} index={index} />
        </Suspense>
      </Canvas>
    </div>
  );
};

interface Section {
  title: string;
  subtitle: string;
  text: string;
  icon: any;
  video?: string;
  image?: string;
  details?: {
    label: string;
    specs: { name: string; value: string }[];
    analysis: string;
  };
}

interface LanguageContent {
  heroTag: string;
  heroText: string;
  button: string;
  exploreButton: string;
  closeButton: string;
  finalTag: string;
  finalTitle: string;
  finalText: string;
  footer: string;
  spectrumInfo: {
    x: string;
    y: string;
    z: string;
    t: string;
    c: string;
    spaceQuality: string;
  };
  sections: Section[];
}

const spectrumData = [
  {
    axis: 'DIMENSION_X',
    element: 'WIDTH_EXPANSION',
    description: 'The horizontal expansion of sound fields, creating a lateral consciousness through stereo perception.',
    coord: { x: 85, y: 25 }
  },
  {
    axis: 'DIMENSION_Y',
    element: 'DEPTH_IMMERSION',
    description: 'The infinite distance of emotional resonance, pulling the observer into a deep volumetric space.',
    coord: { x: 15, y: 75 }
  },
  {
    axis: 'DIMENSION_Z',
    element: 'HEIGHT_ASCENSION',
    description: 'Vertical frequency layers that elevate consciousness toward a higher spiritual field.',
    coord: { x: 80, y: 70 }
  },
  {
    axis: 'DIMENSION_T',
    element: 'TEMPORAL_FLUX',
    description: 'The orbital rhythm of time, grounding the abstract into a physical trajectory of movement.',
    coord: { x: 20, y: 35 }
  },
  {
    axis: 'DIMENSION_C',
    element: 'CONSCIOUS_SYNC',
    description: 'The universal connection point where perception and intuition merge with the emotional field.',
    coord: { x: 50, y: 50 }
  },
];

function DimensionalScale() {
  return (
    <div className="flex flex-col gap-4 w-full max-w-[240px]">
      <div className="flex flex-col gap-1 opacity-60">
        <div className="flex justify-between text-[6px] font-mono tracking-widest text-[#f0cf7b]">
          <span>MIN_S_0.0</span>
          <span>MAX_V_1.0</span>
        </div>
        <div className="h-1 w-full bg-white/5 relative overflow-hidden">
          <motion.div 
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 w-1/2 bg-[#f0cf7b]/40 blur-sm"
          />
          <div className="absolute inset-0 flex justify-between px-1">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="w-[1px] h-full bg-white/20" />
            ))}
          </div>
        </div>
      </div>
      <div className="flex justify-between items-center opacity-40">
        <div className="text-[6px] font-mono tracking-[0.3em] uppercase">Calibration_Sync: 98.4%</div>
        <div className="flex gap-1.5">
          <div className="w-1 h-1 bg-[#f0cf7b] rounded-full animate-pulse" />
          <div className="w-1 h-1 bg-white/40" />
          <div className="w-1 h-1 bg-white/20" />
        </div>
      </div>
    </div>
  );
}

function HolographicCore() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 30;
      const y = (e.clientY / window.innerHeight - 0.5) * 30;
      setMousePos({ x, y });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const axes = [
    { label: 'X', element: 'WIDTH', angle: 0, color: '#f0cf7b' },
    { label: 'Y', element: 'DEPTH', angle: 72, color: '#a78bfa' },
    { label: 'Z', element: 'HEIGHT', angle: 144, color: '#f0cf7b' },
    { label: 'T', element: 'TIME', angle: 216, color: '#a78bfa' },
    { label: 'C', element: 'CONSCIOUS', angle: 288, color: '#f0cf7b' },
  ];

  return (
    <div className="relative w-full aspect-square max-w-[500px] flex items-center justify-center p-4 scale-[0.7] md:scale-[0.75] overflow-visible">
      {/* Background Glow */}
      <motion.div 
        animate={{ 
          x: mousePos.x * -0.3,
          y: mousePos.y * -0.3,
          scale: [1, 1.05, 1]
        }}
        transition={{ duration: 0.5, ease: "easeOut", scale: { duration: 8, repeat: Infinity } }}
        className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(240,207,123,0.1),transparent_70%)] blur-3xl opacity-50" 
      />

      {/* Simplified Sacred Matrix SVG */}
      <motion.svg 
        animate={{ 
          x: mousePos.x * 0.2,
          y: mousePos.y * 0.2,
          rotateX: mousePos.y * 0.05,
          rotateY: mousePos.x * -0.05
        }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        viewBox="0 0 400 400" 
        className="w-full h-full relative z-10 drop-shadow-[0_0_30px_rgba(240,207,123,0.2)]"
      >
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Central Geometry */}
        <motion.g 
          animate={{ rotate: 360 }}
          transition={{ duration: 100, repeat: Infinity, ease: "linear" }}
          className="origin-center"
        >
          {/* Main Pentagonal Structure */}
          <polygon
            points={axes.map(a => {
              const rad = ((a.angle - 90) * Math.PI) / 180;
              return `${200 + 120 * Math.cos(rad)},${200 + 120 * Math.sin(rad)}`;
            }).join(' ')}
            fill="none"
            stroke="white"
            strokeWidth="0.5"
            strokeOpacity="0.1"
          />
          {/* Secondary Ring */}
          <circle cx="200" cy="200" r="80" fill="none" stroke="white" strokeWidth="0.5" strokeOpacity="0.05" />
        </motion.g>

        {/* Axes & Labels */}
        {axes.map((axis, i) => {
          const rad = ((axis.angle - 90) * Math.PI) / 180;
          const x = 200 + 120 * Math.cos(rad);
          const y = 200 + 120 * Math.sin(rad);
          const labelX = 200 + 145 * Math.cos(rad);
          const labelY = 200 + 145 * Math.sin(rad);
          
          return (
            <g key={axis.label}>
              <motion.line
                x1="200" y1="200"
                x2={x} y2={y}
                stroke={axis.color}
                strokeWidth="1"
                strokeOpacity="0.3"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: i * 0.2, duration: 2 }}
              />
              
              <motion.circle 
                cx={x} cy={y} r="3" 
                fill={axis.color} 
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
              />

              {/* Minimal Text Labels */}
              <text
                x={labelX}
                y={labelY}
                fill={axis.color}
                fontSize="11"
                fontWeight="800"
                textAnchor="middle"
                dominantBaseline="middle"
                className="font-gemini italic tracking-[0.1em] opacity-90"
                style={{ filter: 'url(#glow)' }}
              >
                {axis.element}
              </text>
              <text
                x={labelX}
                y={labelY + 12}
                fill="white"
                fontSize="6"
                textAnchor="middle"
                dominantBaseline="middle"
                className="font-mono opacity-30 tracking-[0.4em]"
              >
                DIM_{axis.label}
              </text>
            </g>
          );
        })}

        {/* Core Singularity */}
        <g filter="url(#glow)">
          <circle cx="200" cy="200" r="18" fill="black" stroke="#f0cf7b" strokeWidth="1.5" />
          <motion.circle
            cx="200" cy="200" r="6"
            fill="white"
            animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.2, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
        </g>
      </motion.svg>

      {/* Outer Status Rings & Scrolling Data Readout */}
      <div className="absolute inset-x-0 bottom-2 flex justify-center pb-4 opacity-50 z-20">
        <div className="flex gap-16 items-center text-[8px] font-mono tracking-[0.6em] text-white/50">
          <motion.span 
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            className="flex items-center gap-2"
          >
            <span className="w-2 h-2 border border-white/50" />
            SYNERGY_SYNC: 100%
          </motion.span>
          <motion.span 
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: 1 }}
            className="flex items-center gap-2"
          >
            <span className="w-2 h-2 border border-white/50 bg-[#f0cf7b]/20" />
            OBSERVER: ACTIVE
          </motion.span>
        </div>
      </div>

      {/* Dynamic HUD Corners */}
      {[0, 90, 180, 270].map(rot => (
        <motion.div 
          key={rot}
          animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 3, repeat: Infinity, delay: rot / 90 * 0.5 }}
          className="absolute w-10 h-10 border-t border-l border-[#f0cf7b]/40"
          style={{ 
            top: rot === 0 || rot === 270 ? '20px' : 'auto',
            bottom: rot === 90 || rot === 180 ? '20px' : 'auto',
            left: rot === 0 || rot === 90 ? '20px' : 'auto',
            right: rot === 180 || rot === 270 ? '20px' : 'auto',
            transform: `rotate(${rot === 270 ? 90 : rot === 180 ? 180 : rot === 90 ? 270 : 0}deg)`
          }}
        />
      ))}
    </div>
  );
}

export default function App() {
  const [language, setLanguage] = useState<'en' | 'es'>('en');
  const [activeDetailIndex, setActiveDetailIndex] = useState<number | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const { analyser, dataArray } = useAudioAnalyzer(isAudioPlaying);

  const toggleAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAudioPlaying(!isAudioPlaying);
  };

  const content: Record<'en' | 'es', LanguageContent> = {
    en: {
      heroTag: 'SOUND ARCHITECTURE • MULTIDIMENSIONAL SYNERGY',
      heroText: 'Where music transcends audio to become a living, habitable space of consciousness.',
      button: 'ENTER DIMENSIONAL REALITY',
      exploreButton: 'PROBE DIMENSION',
      closeButton: 'CLOSE ANALYSIS',
      finalTag: 'THE FUTURE OF PERCEPTION',
      finalTitle: `Dimensional\nSynergy.`,
      finalText: 'The ultimate convergence where architecture, sound, and spirit dissolve into a single immersive frequency field.',
      footer: 'SYSTEM_STATUS: OPERATIONAL // GALAXY 5D © 2026',
      spectrumInfo: {
        x: 'X-AXIS / WIDTH: The lateral consciousness of space. It expands the human field of vision into an emotional horizon, creating a sense of infinite openness that allows for multiple architectural perspectives to coexist.',
        y: 'Y-AXIS / DEPTH: The volumetric quality of distance. It pulls the observer into a deep resonance where the past and future dissolve into sheer presence, mapping the proximity between the subject and the sound source.',
        z: 'Z-AXIS / HEIGHT: Spiritual elevation and structural verticality. It lifts the consciousness toward the ethereal ceiling, igniting the frequency of divine ascension through high-frequency harmonics.',
        t: 'T-AXIS / TIME: Temporal trajectory and flux. It grounds the space into a physical pulse, a rhythmic cycle that syncs the biological heart with the spatial engine, allowing the architecture to evolve dynamically.',
        c: 'C-AXIS / CONSCIOUSNESS: The core synergy and the human link. The point where the human observer becomes the architect, merging intuition with universal mathematics to define the quality of the inhabited vacuum.',
        spaceQuality: 'The space is not static; it is a breathing organism of light and sound that responds to the presence of consciousness. It represents the person as the center of a 5-dimensional spherical coordinate system, where "Space Quality" is measured by the harmonic alignment of these five vectors.'
      },
      sections: [
        {
          title: 'CONSCIOUS_GATE',
          subtitle: 'Interface of Infinite Perception',
          text: 'Sound redefined as an inhabited architecture, mapping the geometry of human awareness.',
          icon: Shield,
          video: '/mp_.mp4',
          details: {
            label: 'NEURAL_INTERFACE_REPORT',
            specs: [
              { name: 'BUFFER_SIZE', value: '4096_SAMPLES' },
              { name: 'CALIBRATION', value: '99.8%_STABLE' },
              { name: 'SYNC_RATE', value: '1.2ms' }
            ],
            analysis: 'The Conscious Gate acts as the primary filter between raw audio input and perceived spatial architecture. Current metrics indicate a perfect mapping of human emotional response to localized frequency nodes.'
          }
        },
        {
          title: 'DIMENS_SYNC',
          subtitle: 'Gravitational Audio Fields',
          text: 'Every project behaves like a localized station with unique gravity, frequency, and atmosphere.',
          icon: Box,
          image: '/Gemini_Generated_Image_ehsb7behsb7behsb.png',
          details: {
            label: 'GRAVITY_FIELD_DATA',
            specs: [
              { name: 'G_CONSTANT', value: '9.82_Hz' },
              { name: 'PRESSURE', value: '124.5_dB' },
              { name: 'DENSITY', value: 'VOLUMETRIC' }
            ],
            analysis: 'Each station maintains its own gravitational audio horizon. The Dimensional Sync module compensates for spectral shifts when transitioning between different emotional atmospheres.'
          }
        },
        {
          title: 'FLUX_REACTIVE',
          subtitle: 'Active Kinetic Geometry',
          text: 'Visual structures that breathe and morph in direct response to sub-bass resonance and spectral shifts.',
          icon: Activity,
          video: '/mp_ (1).mp4',
          details: {
            label: 'KINETIC_FLUX_LOG',
            specs: [
              { name: 'LATENCY', value: '<2ms' },
              { name: 'MORPH_RATIO', value: '1:1.618' },
              { name: 'RES_IMPACT', value: 'HIGH' }
            ],
            analysis: 'Breathes in sync with frequency fluctuations. Geometric nodes expand and contract relative to sub-bass displacement, ensuring a living architectural organism.'
          }
        },
        {
          title: 'NEURAL_TRAJECTORY',
          subtitle: 'Non-Linear Dimensional Shift',
          text: 'Traversing the digital universe through orbital interaction and immersive sonic wormholes.',
          icon: Terminal,
          image: '/Gemini_Generated_Image_iyjy3aiyjy3aiyjy.png',
          details: {
            label: 'PATH_CALCULATION',
            specs: [
              { name: 'ORBITAL_VEL', value: '7.8_km/s' },
              { name: 'W_STABILITY', value: 'MAX' },
              { name: 'JUNCTION', value: 'NODE_4' }
            ],
            analysis: 'Navigational vectors calculated through non-linear audio trajectories. Users traverse emotional distances through frequency-based wormholes without temporal displacement.'
          }
        },
        {
          title: 'SACRED_MODULE',
          subtitle: 'Universal Mathematical Resonance',
          text: 'Integrating Fibonacci patterns and orbital mechanics into a living visual frequency language.',
          icon: Compass,
          image: '/Gemini_Generated_Image_kaz58rkaz58rkaz5.png',
          details: {
            label: 'GEOMETRIC_PURITY',
            specs: [
              { name: 'PHI_PRECISION', value: '0.0001' },
              { name: 'RATIO_SYNC', value: 'ACTIVE' },
              { name: 'NODES', value: 'SACRED' }
            ],
            analysis: 'Mathematical convergence of ancient geometry and modern processing. The module ensures every visual element resonates at the golden frequency of the universe.'
          }
        },
        {
          title: 'KINETIC_CINEMA',
          subtitle: 'Spatiotemporal Narrative',
          text: 'Navigational transitions behaving like cinematic wormholes across the multidimensional spectrum.',
          icon: Radio,
          image: '/Gemini_Generated_Image_iyjy3aiyjy3aiyjy.png',
          details: {
            label: 'CINEMATIC_OUTPUT',
            specs: [
              { name: 'RESOLUTION', value: 'INFINITE' },
              { name: 'FRAME_CONT', value: '100%' },
              { name: 'NARR_FLUX', value: 'STABLE' }
            ],
            analysis: 'Visual transitions are no longer linear shifts but cinematic event horizons. The narrative evolves based on the observer proximity to the sound clusters.'
          }
        },
      ],
    },
    es: {
      heroTag: 'ARQUITECTURA SONORA • SINERGIA MULTIDIMENSIONAL',
      heroText: 'Donde la música trasciende el audio para convertirse en un espacio de consciencia vivo y habitable.',
      button: 'ENTRAR EN REALIDAD DIMENSIONAL',
      exploreButton: 'PROBAR DIMENSIÓN',
      closeButton: 'CERRAR ANÁLISIS',
      finalTag: 'EL FUTURO DE LA PERCEPCIÓN',
      finalTitle: `Sinergia\nDimensional.`,
      finalText: 'La convergencia definitiva donde la arquitectura, el sonido y el espíritu se disuelven en un campo de frecuencia inmersivo único.',
      footer: 'SYSTEM_STATUS: OPERATIONAL // GALAXY 5D © 2026',
      spectrumInfo: {
        x: 'EJE-X / ANCHO: La consciencia lateral del espacio. Expande el campo de visión humano hacia un horizonte emocional, permitiendo que múltiples perspectivas arquitectónicas coexistan en una apertura infinita.',
        y: 'EJE-Y / PROFUNDIDAD: La calidad volumétrica de la distancia. Atrae al observador hacia una resonancia profunda donde tiempo y espacio se disuelven, mapeando la proximidad entre el sujeto y la fuente sonora.',
        z: 'EJE-Z / ALTO: Elevación espiritual y verticalidad estructural. Eleva la consciencia hacia el techo etéreo, encendiendo la frecuencia de la ascensión divina mediante armónicos de alta frecuencia.',
        t: 'EJE-T / TIEMPO: Trayectoria temporal y flujo. Enraíza el espacio en un pulso físico, un ciclo rítmico que sincroniza el corazón biológico con el motor espacial, permitiendo que la arquitectura evolucione.',
        c: 'EJE-C / CONSCIENCIA: La sinergia central y el vínculo humano. El punto donde el observador se convierte en arquitecto, fusionando la intuición con las matemáticas universales para definir la calidad del vacío habitado.',
        spaceQuality: 'El espacio no es estático; es un organismo palpitante de luz y sonido que responde a la consciencia. Representa a la persona como el centro de un sistema de coordenadas esféricas de 5 dimensiones, donde la "Calidad del Espacio" se mide por la alineación armónica de estos cinco vectores.'
      },
      sections: [
        {
          title: 'PUERTA_CONSCIENTE',
          subtitle: 'Interfaz de Percepción Infinita',
          text: 'El sonido redefinido como arquitectura habitada, mapeando la geometría de la consciencia humana.',
          icon: Shield,
          video: '/mp_.mp4',
          details: {
            label: 'REPORTE_INTERFAZ_NEURAL',
            specs: [
              { name: 'TAMAÑO_BUFFER', value: '4096_SAMPLES' },
              { name: 'CALIBRACIÓN', value: '99.8%_STABLE' },
              { name: 'LATENCIA_SYNC', value: '1.2ms' }
            ],
            analysis: 'La Puerta Consciente actúa como filtro primario entre el audio crudo y la arquitectura espacial percibida. Las métricas indican un mapeo perfecto.'
          }
        },
        {
          title: 'SYNC_DIMENSIONAL',
          subtitle: 'Campos de Audio Gravitatorios',
          text: 'Cada proyecto se comporta como una estación localizada con gravedad, frecuencia y atmósfera únicas.',
          icon: Box,
          image: '/Gemini_Generated_Image_ehsb7behsb7behsb.png',
          details: {
            label: 'DATOS_CAMPO_GRAVEDAD',
            specs: [
              { name: 'CONSTANTE_G', value: '9.82_Hz' },
              { name: 'PRESIÓN', value: '124.5_dB' },
              { name: 'DENSIDAD', value: 'VOLUMÉTRICA' }
            ],
            analysis: 'Cada estación mantiene su propio horizonte gravitatorio. El módulo compensa los cambios espectrales durante las transiciones.'
          }
        },
        {
          title: 'FLUJO_REACTIVO',
          subtitle: 'Geometría Kinética Activa',
          text: 'Estructuras visuales que respiran y mutan en respuesta directa a la resonancia del sub-bass.',
          icon: Activity,
          video: '/mp_ (1).mp4',
          details: {
            label: 'LOG_FLUJO_CINÉTICO',
            specs: [
              { name: 'LATENCIA', value: '<2ms' },
              { name: 'RADIO_MUTAR', value: '1:1.618' },
              { name: 'IMPACTO_RES', value: 'ALTO' }
            ],
            analysis: 'Respira en sincronía con las fluctuaciones de frecuencia. Los nodos geométricos se expanden según el desplazamiento de graves.'
          }
        },
        {
          title: 'TRAYECTORIA_NEURAL',
          subtitle: 'Salto Dimensional No Lineal',
          text: 'Atravesando el universo digital mediante interacción orbital y agujeros de gusano sonoros.',
          icon: Terminal,
          image: '/Gemini_Generated_Image_iyjy3aiyjy3aiyjy.png',
          details: {
            label: 'CÁLCULO_TRAYECTO',
            specs: [
              { name: 'VEL_ORBITAL', value: '7.8_km/s' },
              { name: 'ESTAB_GUSANO', value: 'MAX' },
              { name: 'CONEXIÓN', value: 'NODO_4' }
            ],
            analysis: 'Vectores navegacionales calculados mediante trayectorias no lineales. Los usuarios atraviesan distancias emocionales sin desfase temporal.'
          }
        },
        {
          title: 'MÓDULO_SAGRADO',
          subtitle: 'Resonancia Matemática Universal',
          text: 'Integrando patrones Fibonacci y mecánica orbital en un lenguaje visual de frecuencia vivo.',
          icon: Compass,
          image: '/Gemini_Generated_Image_kaz58rkaz58rkaz5.png',
          details: {
            label: 'PUREZA_GEOMÉTRICA',
            specs: [
              { name: 'PRECISIÓN_PHI', value: '0.0001' },
              { name: 'SYNC_RADIO', value: 'ACTIVO' },
              { name: 'NODOS', value: 'SAGRADOS' }
            ],
            analysis: 'Convergencia matemática de geometría antigua y procesamiento moderno. Asegura que cada elemento vibre a la frecuencia dorada.'
          }
        },
        {
          title: 'CINE_KINÉTICO',
          subtitle: 'Narrativa Espaciotemporal',
          text: 'Transiciones de navegación que se comportan como agujeros de gusano cinematográficos.',
          icon: Radio,
          image: '/Gemini_Generated_Image_iyjy3aiyjy3aiyjy.png',
          details: {
            label: 'SALIDA_CINEMÁTICA',
            specs: [
              { name: 'RESOLUCIÓN', value: 'INFINITA' },
              { name: 'CONT_CUADROS', value: '100%' },
              { name: 'FLUJO_NARR', value: 'ESTABLE' }
            ],
            analysis: 'Las transiciones visuales ya no son cambios lineales sino horizontes de eventos cinematográficos.'
          }
        }
      ],
    },
  };

  const t = content[language];

  return (
    <div className="relative min-h-screen bg-[#020202] text-white selection:bg-violet-500/30 overflow-x-hidden font-sans">
      <GlobalBackground3D />
      {/* HUD Background System */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(132,94,247,0.03),transparent_70%)]" />
        <div className="absolute inset-0 bg-[#000] opacity-40 mix-blend-multiply" />
        <div className="absolute inset-0 scanlines opacity-10" />
        
        {/* Dynamic Scan Line */}
        <motion.div 
          animate={{ top: ['-10%', '110%'] }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="absolute left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-violet-500/30 to-transparent shadow-[0_0_20px_rgba(132,94,247,0.3)]"
        />

        {/* HUD Grid Overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        {/* Tech Borders */}
        <div className="hud-corner top-8 left-8 border-t-2 border-l-2" />
        <div className="hud-corner top-8 right-8 border-t-2 border-r-2" />
        <div className="hud-corner bottom-8 left-8 border-b-2 border-l-2" />
        <div className="hud-corner bottom-8 right-8 border-b-2 border-r-2" />

        <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 flex flex-col justify-between h-[80vh] items-center pointer-events-none opacity-20">
            <div className="flex flex-col items-center gap-2">
                <span className="hud-marker">SIGNAL_LOCK_A1</span>
                <div className="w-[1px] h-32 bg-white/10" />
            </div>
            <div className="flex flex-col items-center gap-2">
                <div className="w-[1px] h-32 bg-white/10" />
                <span className="hud-marker">SECTOR_GRID_B4</span>
            </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 w-full z-50 p-8 flex justify-between items-start pointer-events-none">
        <div className="pointer-events-auto">
          <div className="space-y-1">
            <p className="hud-marker text-[#f0cf7b]">G5D_2024_CORE</p>
            <p className="text-xs font-bold tracking-[0.2em]">DIMENSIONAL_HUD</p>
          </div>
        </div>
        
        <div className="flex gap-4 pointer-events-auto">
          <div className="glass rounded-full p-1 flex">
            {(['es', 'en'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`px-4 py-1.5 rounded-full text-[9px] tracking-[0.2em] font-mono uppercase transition-all duration-300 ${
                  language === lang ? 'bg-white text-black font-black' : 'text-white/40 hover:text-white'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Hero Viewport */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-10 text-center overflow-hidden">
        {/* HUD Elements */}
        <div className="absolute left-10 top-1/2 -translate-y-1/2 hidden xl:flex flex-col gap-32 items-center opacity-30 pointer-events-none">
          <span className="vertical-text hud-marker rotate-180">X_AXIS / WIDTH_FIELD</span>
          <span className="vertical-text hud-marker rotate-180">Y_AXIS / DEPTH_RESONANCE</span>
        </div>
        <div className="absolute right-10 top-1/2 -translate-y-1/2 hidden xl:flex flex-col gap-32 items-center opacity-30 pointer-events-none">
          <span className="vertical-text hud-marker">Z_AXIS / HEIGHT_SYNC</span>
          <span className="vertical-text hud-marker">T_AXIS / TEMPORAL_SHIFT</span>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 w-full max-w-6xl flex flex-col items-center pt-20"
        >
          {/* Holographic Interface Core */}
          <HolographicCore />

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 1 }}
            className="mt-8"
          >
            <p className="uppercase tracking-[1.2em] text-[#f0cf7b]/90 text-[10px] mb-6 font-bold font-gemini italic">
              {t.heroTag}
            </p>

            <h1 className="text-huge italic font-cyber gold-gradient mb-4 leading-[0.85] tracking-tight">
              GALAXY 5D
            </h1>

            <p className="max-w-2xl mx-auto text-lg md:text-xl text-white/60 font-semibold leading-relaxed mb-10 uppercase tracking-[0.15em] font-gemini italic">
              {t.heroText}
            </p>

            <motion.button
              whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.08)' }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-6 px-12 py-5 rounded-none glass border border-white/10 uppercase tracking-[0.5em] text-[10px] text-white font-black hover:border-violet-500/50 transition-all group"
            >
              {t.button}
              <ChevronRight size={14} className="text-violet-400 group-hover:translate-x-2 transition-transform" />
            </motion.button>

            <div className="mt-16 flex flex-col items-center gap-4">
              <DimensionalScale />
              <p className="text-[7px] font-mono tracking-[0.4em] text-white/20">DIMENSIONAL_STATUS: STABLE</p>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Technical Modules Grid */}
      <section className="relative z-10 py-24 md:py-32 xl:py-48 px-10">
        <div className="max-w-[1700px] mx-auto grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {t.sections.map((item, index) => {
            const statusLabels = ['LOCALIZED', 'SYNC_STABLE', 'FLUX_ACTIVE', 'NEURAL_LINK', 'GEO_ALIGNED', 'QUANTUM_UP'];
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                whileHover={{ y: -8 }}
                className="glass rounded-none p-8 min-h-[420px] relative overflow-hidden group border border-white/10 hover:border-violet-500/40 transition-all duration-700 bg-black"
              >
                {/* Tech HUD Accents */}
                <div className="absolute top-4 left-4 w-4 h-4 border-t border-l border-white/20 group-hover:border-violet-400/60 transition-colors" />
                <div className="absolute top-4 right-4 w-4 h-4 border-t border-r border-white/20 group-hover:border-violet-400/60 transition-colors" />
                <div className="absolute bottom-4 left-4 w-4 h-4 border-b border-l border-white/20 group-hover:border-violet-400/60 transition-colors" />
                <div className="absolute bottom-4 right-4 w-4 h-4 border-b border-r border-white/20 group-hover:border-violet-400/60 transition-colors" />

                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent" />

                {/* Media Background Reveal */}
                {item.video && (
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-50 transition-all duration-1000 scale-105 group-hover:scale-100 ease-out">
                    <video 
                      autoPlay 
                      muted 
                      loop 
                      playsInline 
                      className="w-full h-full object-cover grayscale transition-all duration-700 group-hover:grayscale-0"
                    >
                      <source src={item.video} type="video/mp4" />
                    </video>
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/60" />
                  </div>
                )}
                {item.image && (
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-40 transition-all duration-1000 scale-105 group-hover:scale-100 ease-out">
                    <img 
                      src={item.image} 
                      alt={item.title}
                      className="w-full h-full object-cover grayscale transition-all duration-700 group-hover:grayscale-0"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/60" />
                  </div>
                )}

                {/* Glitch Overlay */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat" />

                {/* Glint Effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none">
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-[1500ms] ease-in-out" />
                </div>

                {/* Scanning Vertical Line */}
                <div className="absolute top-0 bottom-0 left-0 w-[1px] bg-violet-400/50 shadow-[0_0_15px_rgba(132,94,247,0.5)] opacity-0 group-hover:opacity-100 group-hover:left-full transition-all duration-[2000ms] ease-linear" />

                {/* Content Overlay */}
                <div className="relative z-10 flex flex-col h-full">
                  <div className="flex justify-between items-start mb-12">
                     <div className="w-16 h-16 bg-white/[0.02] border border-white/10 flex items-center justify-center text-white/40 group-hover:text-[#f0cf7b] group-hover:border-[#f0cf7b]/30 transition-all duration-500">
                       <item.icon size={26} strokeWidth={1} />
                     </div>
                     <div className="text-right">
                       <p className="font-mono text-[8px] text-white/20 mb-1 tracking-tighter">DATA_STREAM_{index+402}</p>
                       <div className="flex items-center gap-2 justify-end">
                         <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
                         <span className="hud-marker text-[7px]">{statusLabels[index]}</span>
                       </div>
                     </div>
                  </div>
                  
                  <div className="mt-auto">
                    <div className="flex gap-1 items-center mb-4 opacity-20 group-hover:opacity-100 transition-opacity pointer-events-none">
                      {[...Array(5)].map((_, i) => (
                        <motion.div 
                          key={i} 
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                          className={`w-1 h-3 ${i < (index % 3 + 2) ? 'bg-violet-400' : 'bg-white/20'}`} 
                        />
                      ))}
                      <span className="text-[6px] font-mono tracking-[0.3em] ml-2 text-white">FREQ_STABILITY: 0.{index * 7 + 8}8</span>
                    </div>

                    <h2 className="text-2xl md:text-3xl italic gold-gradient font-cyber leading-[1.2] mb-6 tracking-[0.1em] group-hover:tracking-[0.2em] transition-all duration-700 uppercase pr-4">
                      {item.title}
                    </h2>

                    <p className="hud-marker text-white/40 mb-8 font-bold group-hover:text-violet-400 transition-colors uppercase">
                      :: {item.subtitle}
                    </p>

                    <p className="text-white/30 text-lg leading-relaxed font-light font-sans group-hover:text-white/80 transition-colors duration-500 mb-8">
                      {item.text}
                    </p>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setActiveDetailIndex(index)}
                      className="inline-flex items-center gap-3 px-6 py-2 border border-white/10 text-[9px] font-mono tracking-[0.3em] uppercase group-hover:border-[#f0cf7b]/50 group-hover:bg-[#f0cf7b]/5 transition-all"
                    >
                      <Sparkles size={10} className="text-violet-400" />
                      {t.exploreButton}
                    </motion.button>
                  </div>

                  {/* Tech Readout Footer */}
                  <div className="mt-12 pt-8 border-t border-white/5 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-all duration-700">
                    <div className="flex gap-2">
                       <div className="w-4 h-1 bg-violet-500/40" />
                       <div className="w-2 h-1 bg-white/10" />
                    </div>
                    <span className="font-mono text-[7px] text-white/20">RESONANCE_VAL: 0.{index}84</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* 5D Spectrum Field */}
      <section className="relative z-10 py-24 md:py-32 xl:py-64 px-10 border-t border-white/5 bg-[#080808]/50">
        <div className="max-w-[1700px] mx-auto">
          <div className="flex flex-col xl:flex-row items-center gap-24">
            {/* Visual HUD Module: The Human Center */}
            <div className="w-full xl:w-1/2 flex justify-center">
              <div className="relative w-full max-w-[450px] lg:max-w-[550px] xl:max-w-[600px] aspect-square glass rounded-full flex items-center justify-center p-12 border-white/5">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,215,120,0.05),transparent_70%)]" />
                
                {/* Orbital Rings */}
                <div className="absolute w-[90%] h-[90%] rounded-full border border-white/5 border-dashed animate-[spin_60s_linear_infinite]" />
                <div className="absolute w-[70%] h-[70%] rounded-full border border-white/5 border-dashed animate-[spin_40s_linear_infinite_reverse]" />
                <div className="absolute w-[50%] h-[50%] rounded-full border border-white/10 animate-[pulse_4s_ease-in-out_infinite]" />

                {/* Central Human Representation */}
                <div className="relative z-10 flex flex-col items-center">
                  <motion.div 
                    animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="w-16 h-16 rounded-full border-2 border-white/40 mb-6 flex items-center justify-center"
                  >
                    <div className="w-4 h-4 bg-white rounded-full shadow-[0_0_20px_white]" />
                  </motion.div>
                  <div className="w-[1px] h-32 bg-gradient-to-b from-white/40 via-white/10 to-transparent" />
                  <p className="hud-marker mt-4 text-white">OBSERVER_CORE</p>
                </div>

                {/* Axis Callouts */}
                {spectrumData.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    transition={{ delay: index * 0.2 }}
                    className="absolute glass px-4 py-2 border border-white/10 flex flex-col items-center group cursor-default"
                    style={{
                      top: `${index === 0 ? '10%' : index === 3 ? '10%' : index === 4 ? '50%' : '80%'}`,
                      left: `${index === 1 ? '10%' : index === 3 ? '10%' : index === 4 ? '50%' : '80%'}`,
                      transform: 'translate(-50%, -50%)',
                      ...(index === 0 && { top: '15%', left: '85%' }),
                      ...(index === 1 && { top: '85%', left: '15%' }),
                      ...(index === 2 && { top: '85%', left: '85%' }),
                      ...(index === 3 && { top: '15%', left: '15%' }),
                      ...(index === 4 && { top: '50%', left: '50%', scale: 0.8, opacity: 0.5 }),
                    }}
                  >
                    <span className="text-[7px] text-[#f0cf7b] font-black tracking-[0.3em]">{item.element}</span>
                    <span className="text-[9px] text-white font-mono mt-1">{item.axis}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Content: Dimensional Explanation */}
            <div className="w-full xl:w-1/2 space-y-12">
              <div>
                <p className="hud-marker text-[#f0cf7b] mb-4">5D_SPECTRUM_ANALYSIS</p>
                <h2 className="text-4xl md:text-6xl italic font-cyber gold-gradient leading-[1.1] mb-8 tracking-[0.05em]">
                  THE HUMAN<br />FREQUENCY SYSTEM
                </h2>
                <p className="text-xl text-white/40 font-light leading-relaxed max-w-2xl">
                  {t.spectrumInfo.spaceQuality}
                </p>
              </div>

              <div className="grid gap-6">
                {[
                  { key: 'x', element: 'WIDTH' },
                  { key: 'y', element: 'DEPTH' },
                  { key: 'z', element: 'HEIGHT' },
                  { key: 't', element: 'TIME' },
                  { key: 'c', element: 'CONSCIOUSNESS' }
                ].map((item, index) => {
                  const info = t.spectrumInfo[item.key as keyof typeof t.spectrumInfo];
                  const [title, desc] = info.split(': ');
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="glass p-8 border-l-2 border-white/5 hover:border-[#f0cf7b] transition-colors group"
                    >
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-4">
                          <h3 className="text-2xl italic font-cyber gold-gradient">{title}</h3>
                          <div className="hidden md:flex gap-1">
                            <div className="w-1 h-1 bg-[#f0cf7b]/40 rounded-full" />
                            <div className="w-1 h-1 bg-white/10 rounded-full" />
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="px-3 py-1 bg-white/5 border border-white/10 text-[8px] font-mono tracking-widest text-violet-400">
                            {item.element}_VAR
                          </span>
                          <span className="text-[6px] font-mono text-white/20 tracking-widest">STATUS: OPTIMAL</span>
                        </div>
                      </div>
                      <p className="text-white/50 text-base font-light leading-relaxed group-hover:text-white/80 transition-colors">
                        {desc}
                      </p>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Conceptual Synergy */}
      <section className="relative z-10 py-24 md:py-32 xl:py-64 px-10 text-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(144,120,255,0.05),transparent_60%)]" />
        
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="max-w-6xl mx-auto relative z-10"
        >
          <p className="hud-marker text-cyan-400 mb-16 opacity-80">
            {t.finalTag}
          </p>

          <h2 className="text-huge italic font-cyber leading-[1.1] mb-16 gold-gradient tracking-tight whitespace-pre-line overflow-visible md:py-8 px-10 text-center">
            {t.finalTitle}
          </h2>

          <p className="text-lg md:text-2xl text-white/40 leading-[1.6] font-gemini font-semibold italic mb-24 max-w-3xl mx-auto tracking-[0.1em] px-8">
            "{t.finalText}"
          </p>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {['HOLOGRAPHIC_OS', 'VOLUMETRIC_ENGINE', 'RESONANCE_FLUX', 'NEURAL_HUD'].map((m) => (
              <div key={m} className="px-6 py-4 border border-white/5 bg-white/[0.02] text-[10px] font-mono tracking-[0.4em] text-white/30 uppercase">
                {m}
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Deep Footer */}
      <footer className="relative z-10 p-12 border-t border-white/5 bg-black">
        <div className="max-w-[1700px] mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
               <Activity size={16} className="text-emerald-500 animate-pulse" />
               <span className="hud-marker text-white">SYSTEM_ID: G5D_CORE_ACTIVE</span>
            </div>
            <p className="text-[10px] uppercase tracking-[0.4em] text-white/20 font-black italic">
              {t.footer}
            </p>
          </div>

          <div className="flex gap-4">
            {['R3F', 'GLSL', 'AI_VOLUMETRIC', 'SONIC_XR'].map((t) => (
              <div key={t} className="px-5 py-2 bg-white/5 border border-white/10 rounded-sm text-[8px] font-mono tracking-[0.3em] text-white/40">
                {t}
              </div>
            ))}
          </div>
        </div>
      </footer>

      {/* Dimension Technical Detail Overlay */}
      <AnimatePresence>
        {activeDetailIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
          >
            <div 
              className="absolute inset-0 bg-black/98 backdrop-blur-3xl" 
              onClick={() => setActiveDetailIndex(null)}
            />
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 200 }}
              className="relative w-full aspect-video max-h-[90vh] glass border border-white/10 overflow-hidden flex flex-col md:flex-row shadow-[0_0_100px_rgba(0,0,0,1)]"
            >
              {/* Tech Accents Map */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)', backgroundSize: '100px 100px' }} />
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-violet-500 to-transparent" />
              
              {/* Left Panel: Stats & Controls (1/3) */}
              <div className="w-full md:w-1/3 border-r border-white/10 flex flex-col p-10 relative z-10 bg-black/40">
                <div className="flex-1 space-y-12">
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="px-2 py-1 bg-violet-500/10 border border-violet-500/20 text-[8px] font-mono tracking-widest text-[#f0cf7b]">
                         LIVE_FEED: ACTIVE
                      </div>
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                    <p className="hud-marker text-white/30 text-[9px] mb-2">DIM_ENVELOPE // 0{activeDetailIndex + 1}</p>
                    <h3 className="text-5xl italic font-cyber gold-gradient uppercase leading-tight tracking-tighter">
                      {t.sections[activeDetailIndex].title}
                    </h3>
                  </div>

                  <div className="space-y-8">
                    <p className="font-mono text-[9px] tracking-[0.6em] text-white/20 border-b border-white/10 pb-4 uppercase italic font-black">
                      Spectrum_Metrics
                    </p>
                    <div className="grid gap-6">
                      {t.sections[activeDetailIndex].details?.specs.map((spec, i) => (
                        <div key={i} className="flex justify-between items-end group">
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-mono text-white/30 tracking-widest uppercase italic">{spec.name}</span>
                            <div className="w-20 h-0.5 bg-white/5 overflow-hidden">
                               <motion.div 
                                 animate={{ x: ['-100%', '100%'] }} 
                                 transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
                                 className="w-full h-full bg-violet-500/40" 
                               />
                            </div>
                          </div>
                          <span className="text-xl font-gemini font-bold text-white group-hover:text-violet-400 transition-colors uppercase">{spec.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Audio Controls */}
                <div className="mt-12 pt-10 border-t border-white/10">
                   <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-4">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={toggleAudio}
                          className={`w-14 h-14 rounded-none flex items-center justify-center transition-all ${
                            isAudioPlaying ? 'bg-white text-black' : 'bg-transparent border border-white/20 text-white'
                          }`}
                        >
                          {isAudioPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} className="translate-x-0.5" fill="currentColor" />}
                        </motion.button>
                        <div>
                          <p className="text-[10px] font-bold text-white tracking-widest">DRIVE_VISUALS</p>
                          <p className="text-[8px] font-mono text-white/30 italic">SIGNAL_SOURCE: INTERNAL_OSC</p>
                        </div>
                      </div>
                      <Volume2 size={16} className={isAudioPlaying ? "text-violet-400" : "text-white/20"} />
                   </div>
                   <button 
                    onClick={() => setActiveDetailIndex(null)}
                    className="w-full py-4 border border-white/10 text-[9px] uppercase tracking-[0.8em] font-black hover:border-white/40 transition-all text-white/60 hover:text-white"
                   >
                     {t.closeButton}
                   </button>
                </div>
              </div>

              {/* Right Panel: Visualization & Narrative (2/3) */}
              <div className="w-full md:w-2/3 flex flex-col relative overflow-hidden bg-black/60">
                 {/* Cinematic Visualizer Canvas */}
                 <div className="absolute inset-0 opacity-80">
                   <Galaxy3DVisualizer analyser={analyser} dataArray={dataArray} index={activeDetailIndex} />
                 </div>
                 
                 <div className="relative z-10 flex flex-col h-full p-16 pointer-events-none">
                    <div className="flex-1 flex flex-col justify-center max-w-2xl">
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="mb-12"
                      >
                         <p className="hud-marker text-violet-400 text-[11px] mb-10 flex items-center gap-4 italic letter-spacing-[0.2em]">
                           <Activity size={16} className="text-violet-400" />
                           {t.sections[activeDetailIndex].details?.label}
                         </p>
                         
                         <h4 className="text-3xl md:text-5xl text-white font-gemini italic leading-[1.3] font-light">
                           {t.sections[activeDetailIndex].details?.analysis}
                         </h4>
                      </motion.div>
                    </div>

                    {/* Bottom Data Flux */}
                    <div className="mt-auto h-40 relative group pointer-events-auto">
                       <div className="absolute inset-0 glass border border-white/5 bg-white/[0.01] p-8">
                          <div className="flex justify-between items-center mb-6">
                            <p className="text-[9px] font-mono text-white/40 tracking-[0.5em] uppercase italic">Realtime_Frequency_Flux_Synthesis</p>
                            <div className="flex gap-2">
                               <div className="w-10 h-1 bg-white/10" />
                               <div className="w-2 h-1 bg-violet-500/40" />
                            </div>
                          </div>
                          <div className="w-full h-16 pointer-events-none">
                            <FrequencyVisualizer analyser={analyser} dataArray={dataArray} />
                          </div>
                       </div>
                    </div>
                 </div>

                 {/* Corner Cinematic Label */}
                 <div className="absolute top-10 right-10 flex flex-col items-end opacity-20 pointer-events-none">
                    <span className="text-[24px] font-cyber italic gold-gradient">0{activeDetailIndex + 1}</span>
                    <span className="text-[8px] font-mono tracking-[0.5em]">G5D_ENGINE</span>
                 </div>
              </div>

              {/* Background Text Accent */}
              <div className="absolute -bottom-24 -right-10 text-[260px] font-cyber gold-gradient opacity-[0.03] rotate-12 pointer-events-none italic select-none">
                {t.sections[activeDetailIndex].title}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
