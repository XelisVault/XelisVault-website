'use client'

// The Lattice 3D — the BlockDAG as a floating constellation of glowing cubes.
//
// Same data as the 2D canvas, but with depth: x = height (auto-advancing),
// z = fork lane, cubes glow by block type, tip edges are drawn as beams, and
// new blocks spawn with a scale-in pop + expanding pulse shell. The camera
// slowly auto-orbits — grab it to fly around the DAG yourself.
//
// Shared geometry + per-type materials; ≤ ~40 cubes + one LineSegments batch,
// so this stays trivially smooth even on integrated GPUs.

import { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { XelisBlock, fmtXEL, shortHash } from '@/lib/xelis/explorer'

const TYPE_COLORS: Record<string, number> = {
  Normal: 0xa78bfa,
  Sync: 0x67e8f9,
  Side: 0xfbbf24,
  Orphaned: 0xf87171,
}

const SPACING_X = 3.2
const SPACING_Z = 3.0
const CUBE = 1.5
const WINDOW_N = 26 // blocks along x

interface HoverInfo {
  block: XelisBlock
  x: number
  y: number
}

export function Lattice3D({
  blocks,
  stableHeight,
  onSelect,
}: {
  blocks: XelisBlock[]
  stableHeight: number | null
  onSelect: (b: XelisBlock) => void
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<HoverInfo | null>(null)

  const blocksRef = useRef(blocks)
  const stableRef = useRef(stableHeight)
  const onSelectRef = useRef(onSelect)
  useEffect(() => { blocksRef.current = blocks }, [blocks])
  useEffect(() => { stableRef.current = stableHeight }, [stableHeight])
  useEffect(() => { onSelectRef.current = onSelect }, [onSelect])

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return

    // ---- Renderer / scene / camera ----
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(wrap.clientWidth, wrap.clientHeight)
    wrap.appendChild(renderer.domElement)
    renderer.domElement.style.display = 'block'
    renderer.domElement.style.touchAction = 'none'

    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x0b0714, 0.028)

    const camera = new THREE.PerspectiveCamera(50, wrap.clientWidth / wrap.clientHeight, 0.1, 400)
    camera.position.set(18, 16, 30)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.enablePan = false
    controls.minDistance = 12
    controls.maxDistance = 70
    controls.maxPolarAngle = Math.PI * 0.52
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.55

    // pause auto-orbit while the user drives; resume after 6s idle
    let idleTimer: ReturnType<typeof setTimeout> | null = null
    const resumeOrbit = () => {
      if (idleTimer) clearTimeout(idleTimer)
      idleTimer = setTimeout(() => { controls.autoRotate = true }, 6000)
    }
    controls.addEventListener('start', () => {
      controls.autoRotate = false
      resumeOrbit()
    })
    controls.addEventListener('change', resumeOrbit)

    // ---- Lights ----
    scene.add(new THREE.AmbientLight(0x8b7fb8, 0.55))
    const key = new THREE.PointLight(0xa78bfa, 60, 120)
    key.position.set(10, 24, 14)
    scene.add(key)
    const rim = new THREE.PointLight(0x67e8f9, 25, 120)
    rim.position.set(-16, 12, -10)
    scene.add(rim)

    // ---- Floor grid ----
    const grid = new THREE.GridHelper(120, 60, 0x4c3a78, 0x241b3d)
    ;(grid.material as THREE.Material).transparent = true
    ;(grid.material as THREE.Material).opacity = 0.22
    grid.position.y = -3.2
    scene.add(grid)

    // ---- Starfield ----
    const starGeo = new THREE.BufferGeometry()
    const starCount = 320
    const starPos = new Float32Array(starCount * 3)
    for (let i = 0; i < starCount; i++) {
      const r = 90 + Math.random() * 90
      const th = Math.random() * Math.PI * 2
      const ph = Math.acos(2 * Math.random() - 1)
      starPos[i * 3] = r * Math.sin(ph) * Math.cos(th)
      starPos[i * 3 + 1] = r * Math.cos(ph) * 0.6 + 10
      starPos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th)
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0x9d8fd0, size: 0.55, transparent: true, opacity: 0.5, sizeAttenuation: true }))
    scene.add(stars)

    // ---- Shared cube geometry + per-type materials ----
    const cubeGeo = new RoundedBoxGeometry(CUBE, CUBE, CUBE, 3, 0.32)
    const materials: Record<string, THREE.MeshStandardMaterial> = {}
    for (const [type, color] of Object.entries(TYPE_COLORS)) {
      materials[type] = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.38,
        roughness: 0.35,
        metalness: 0.25,
      })
    }

    // ---- Edge beams (one batched LineSegments) ----
    const edgeMax = 512
    const edgePos = new Float32Array(edgeMax * 6)
    const edgeGeo = new THREE.BufferGeometry()
    edgeGeo.setAttribute('position', new THREE.BufferAttribute(edgePos, 3))
    const edges = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({ color: 0x9a8cc8, transparent: true, opacity: 0.3 }))
    scene.add(edges)

    // ---- Finality plane ----
    const finality = new THREE.Group()
    const fPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(26, 14),
      new THREE.MeshBasicMaterial({ color: 0x4ade80, transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false })
    )
    const fLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -7, 0), new THREE.Vector3(0, 7, 0)]),
      new THREE.LineBasicMaterial({ color: 0x4ade80, transparent: true, opacity: 0.5 })
    )
    finality.add(fPlane, fLine)
    finality.rotation.y = Math.PI / 2
    finality.position.y = 0
    finality.visible = false
    scene.add(finality)

    // ---- Cube pool ----
    interface CubeRec {
      mesh: THREE.Mesh
      block: XelisBlock
      bornAt: number
      lane: number
    }
    const cubes = new Map<string, CubeRec>()
    const seen = new Set<string>()
    const pulses: { mesh: THREE.Mesh; t0: number }[] = []
    const pulseMat = new THREE.MeshBasicMaterial({ color: 0xa78bfa, wireframe: true, transparent: true })
    const pulseGeo = new THREE.SphereGeometry(1, 12, 10)

    const group = new THREE.Group()
    scene.add(group)
    // cubes + edges live inside `group`; the group is re-centered each frame
    group.add(edges)
    group.add(finality)

    let viewHMin: number | null = null

    const spawnPulse = (color: number) => {
      const m = new THREE.Mesh(pulseGeo, pulseMat.clone())
      ;(m.material as THREE.MeshBasicMaterial).color.setHex(color)
      group.add(m)
      pulses.push({ mesh: m, t0: performance.now() })
    }

    // ---- Layout (runs each frame) ----
    const layout = () => {
      const all = blocksRef.current
      const now = performance.now()

      if (all.length === 0) return
      const maxH = Math.max(...all.map((b) => b.height))
      const minH = Math.max(0, maxH - WINDOW_N + 1)
      if (viewHMin === null) viewHMin = minH
      viewHMin += (minH - viewHMin) * 0.12
      const hMin = viewHMin

      // group by height within window
      const byHeight = new Map<number, XelisBlock[]>()
      for (const b of all) {
        if (b.height < Math.floor(hMin) - 1 || b.height > maxH) continue
        const arr = byHeight.get(b.height) ?? []
        arr.push(b)
        byHeight.set(b.height, arr)
      }
      let maxLanes = 1
      for (const [, arr] of byHeight) {
        arr.sort((a, b) => a.topoheight - b.topoheight)
        maxLanes = Math.max(maxLanes, arr.length)
      }

      // sync cube pool with visible blocks
      const visibleHashes = new Set<string>()
      for (const [height, arr] of byHeight) {
        arr.forEach((b, lane) => {
          visibleHashes.add(b.hash)
          const isNew = !seen.has(b.hash)
          seen.add(b.hash)
          const x = (height - hMin) * SPACING_X
          const z = (lane - (Math.max(1, maxLanes) - 1) / 2) * SPACING_Z
          let rec = cubes.get(b.hash)
          if (!rec) {
            const mat = (materials[b.block_type] ?? materials.Normal).clone()
            const mesh = new THREE.Mesh(cubeGeo, mat)
            group.add(mesh)
            rec = { mesh, block: b, bornAt: isNew ? now : now - 10000, lane }
            cubes.set(b.hash, rec)
            if (isNew) {
              spawnPulse(TYPE_COLORS[b.block_type] ?? 0xa78bfa)
              // recent edge flash color is handled per-frame below via bornAt
            }
          }
          rec.block = b
          rec.lane = lane
          // ease toward target position
          rec.mesh.position.x += (x - rec.mesh.position.x) * 0.2
          rec.mesh.position.z += (z - rec.mesh.position.z) * 0.2
          rec.mesh.position.y += (0 - rec.mesh.position.y) * 0.2
          // spawn scale-in + gentle float
          const age = (now - rec.bornAt) / 1000
          const targetScale = age < 0.7 ? 0.25 + 0.75 * (age / 0.7) : 1
          rec.mesh.scale.setScalar(targetScale)
          rec.mesh.position.y = Math.sin(now / 900 + (rec.block.topoheight || 0)) * 0.12
          // glow fade for fresh blocks
          const mat = rec.mesh.material as THREE.MeshStandardMaterial
          mat.emissiveIntensity = age < 8 ? 0.38 + 0.62 * Math.max(0, 1 - age / 8) : 0.38
        })
      }
      // remove cubes that left the window
      for (const [hash, rec] of cubes) {
        if (!visibleHashes.has(hash)) {
          group.remove(rec.mesh)
          ;(rec.mesh.material as THREE.Material).dispose()
          cubes.delete(hash)
        }
      }

      // rebuild edge beams
      let i = 0
      for (const [, rec] of cubes) {
        for (const tip of rec.block.tips ?? []) {
          const t = cubes.get(tip)
          if (!t || i >= edgeMax) continue
          const fresh = now - rec.bornAt < 3000
          const a = rec.mesh.position
          const b = t.mesh.position
          edgePos[i * 6] = a.x; edgePos[i * 6 + 1] = a.y; edgePos[i * 6 + 2] = a.z
          edgePos[i * 6 + 3] = b.x; edgePos[i * 6 + 4] = b.y; edgePos[i * 6 + 5] = b.z
          i++
          if (fresh) {
            // bright overlay line for fresh edges (drawn as a second segment)
            if (i < edgeMax) {
              edgePos[i * 6] = a.x; edgePos[i * 6 + 1] = a.y; edgePos[i * 6 + 2] = a.z
              edgePos[i * 6 + 3] = b.x; edgePos[i * 6 + 4] = b.y; edgePos[i * 6 + 5] = b.z
              i++
            }
          }
        }
      }
      edgeGeo.setDrawRange(0, i * 2)
      ;(edgeGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true

      // center the group on the visible window
      const centerX = ((maxH - hMin) / 2) * SPACING_X
      group.position.x = -centerX
      // finality plane
      const stable = stableRef.current
      if (stable !== null) {
        const fx = (stable - hMin) * SPACING_X
        const inWindow = stable >= hMin && stable <= maxH
        finality.visible = inWindow
        finality.position.x = fx
      } else {
        finality.visible = false
      }

      // pulses
      for (let p = pulses.length - 1; p >= 0; p--) {
        const pu = pulses[p]
        const age = (now - pu.t0) / 1400
        if (age > 1) {
          group.remove(pu.mesh)
          ;(pu.mesh.material as THREE.Material).dispose()
          pulses.splice(p, 1)
          continue
        }
        // attach to the newest cube position (approx — pulses spawn at origin + group offset is fine visually)
        pu.mesh.scale.setScalar(1 + age * 7)
        ;(pu.mesh.material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - age)
      }
    }

    // ---- Raycast hover / click ----
    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    let hovered: string | null = null
    const proj = new THREE.Vector3()

    const pick = (ev: PointerEvent): XelisBlock | null => {
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(pointer, camera)
      const meshes: THREE.Object3D[] = []
      for (const [, rec] of cubes) meshes.push(rec.mesh)
      const hits = raycaster.intersectObjects(meshes, false)
      if (hits.length > 0) {
        const rec = [...cubes.values()].find((r) => r.mesh === hits[0].object)
        return rec ? rec.block : null
      }
      return null
    }

    const onPointerMove = (ev: PointerEvent) => {
      const b = pick(ev)
      renderer.domElement.style.cursor = b ? 'pointer' : 'grab'
      if (b) {
        hovered = b.hash
        // project block position to screen for the tooltip
        const rec = cubes.get(b.hash)!
        proj.copy(rec.mesh.position).applyMatrix4(group.matrixWorld).project(camera)
        const rect = renderer.domElement.getBoundingClientRect()
        setHover({
          block: b,
          x: ((proj.x + 1) / 2) * rect.width,
          y: ((-proj.y + 1) / 2) * rect.height,
        })
      } else {
        hovered = null
        setHover(null)
      }
    }
    const onPointerLeave = () => { hovered = null; setHover(null) }
    const onClick = (ev: PointerEvent) => {
      const b = pick(ev)
      if (b) onSelectRef.current(b)
    }
    renderer.domElement.addEventListener('pointermove', onPointerMove)
    renderer.domElement.addEventListener('pointerleave', onPointerLeave)
    renderer.domElement.addEventListener('click', onClick)

    // ---- Resize ----
    const resize = () => {
      const w = wrap.clientWidth
      const h = wrap.clientHeight
      if (w === 0 || h === 0) return
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)

    // ---- Render loop ----
    let raf = 0
    let running = true
    const tick = () => {
      if (!running) return
      raf = requestAnimationFrame(tick)
      layout()
      controls.update()
      renderer.render(scene, camera)
    }
    raf = requestAnimationFrame(tick)

    // pause rendering when hidden (tab switch / offscreen)
    const onVis = () => {
      if (document.hidden) {
        running = false
        cancelAnimationFrame(raf)
      } else if (!running) {
        running = true
        raf = requestAnimationFrame(tick)
      }
    }
    document.addEventListener('visibilitychange', onVis)

    return () => {
      running = false
      cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', onVis)
      renderer.domElement.removeEventListener('pointermove', onPointerMove)
      renderer.domElement.removeEventListener('pointerleave', onPointerLeave)
      renderer.domElement.removeEventListener('click', onClick)
      if (idleTimer) clearTimeout(idleTimer)
      ro.disconnect()
      controls.dispose()
      cubes.forEach((rec) => (rec.mesh.material as THREE.Material).dispose())
      pulses.forEach((p) => (p.mesh.material as THREE.Material).dispose())
      Object.values(materials).forEach((m) => m.dispose())
      cubeGeo.dispose()
      pulseGeo.dispose()
      edgeGeo.dispose()
      starGeo.dispose()
      ;(stars.material as THREE.Material).dispose()
      grid.geometry.dispose()
      ;(grid.material as THREE.Material).dispose()
      fPlane.geometry.dispose()
      ;(fPlane.material as THREE.Material).dispose()
      fLine.geometry.dispose()
      ;(fLine.material as THREE.Material).dispose()
      renderer.dispose()
      if (renderer.domElement.parentElement === wrap) wrap.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div ref={wrapRef} className="relative w-full h-full">
      {/* Tooltip (HTML overlay, projected from 3D) */}
      {hover && (
        <div
          className="pointer-events-none absolute z-20 rounded-xl glass-panel px-3 py-2.5 text-[11px] font-mono leading-relaxed shadow-2xl"
          style={{
            left: Math.min(Math.max(hover.x + 14, 8), 10000),
            top: Math.max(hover.y - 14, 8),
            width: 200,
            transform: hover.x > 260 ? 'translateX(-110%)' : undefined,
          }}
        >
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-vault font-semibold">{hover.block.topoheight >= 0 ? `#${hover.block.topoheight}` : 'orphaned'}</span>
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground">{hover.block.block_type}</span>
          </div>
          <div className="text-muted-foreground">height {hover.block.height} · {hover.block.txs_hashes?.length ?? 0} txs</div>
          <div className="text-muted-foreground">reward {fmtXEL(hover.block.reward)} XET</div>
          <div className="text-muted-foreground truncate">{shortHash(hover.block.miner, 14, 8)}</div>
          <div className="text-vault/70 mt-1 text-[9px] uppercase tracking-wider">click to inspect</div>
        </div>
      )}
    </div>
  )
}
