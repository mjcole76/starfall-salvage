// ---------------------------------------------------------------------------
// Minimap.ts  --  Radar-style circular minimap for Starfall Salvage
// ---------------------------------------------------------------------------

export type MinimapMarker = {
  x: number;
  z: number;
  type:
    | 'core'
    | 'core_collected'
    | 'salvage'
    | 'salvage_collected'
    | 'extraction'
    | 'extraction_active'
    | 'radiation'
    | 'heat'
    | 'drone'
    | 'fuel'
    | 'repair';
  radius?: number; // world-units, used for zone markers
};

// ---------------------------------------------------------------------------

const MAP_DIAMETER = 160;
const MAP_RADIUS = MAP_DIAMETER / 2;
const HALF = MAP_RADIUS; // alias for readability

const TWO_PI = Math.PI * 2;
// Default visible world-unit diameter
const DEFAULT_SCALE = 120;

// Radar sweep speed (radians / second)
const SWEEP_SPEED = 1.2;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert a world position relative to the player into minimap pixel coords. */
function worldToMinimap(
  wx: number,
  wz: number,
  playerX: number,
  playerZ: number,
  pixelsPerUnit: number,
): [number, number] {
  const dx = (wx - playerX) * pixelsPerUnit;
  const dz = (wz - playerZ) * pixelsPerUnit;
  return [HALF + dx, HALF - dz]; // z is "up" on screen
}

/** Distance in minimap-pixel space from the center. */
function distFromCenter(px: number, py: number): number {
  const dx = px - HALF;
  const dy = py - HALF;
  return Math.sqrt(dx * dx + dy * dy);
}

// ---------------------------------------------------------------------------
// Minimap class
// ---------------------------------------------------------------------------

export class Minimap {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private scale: number = DEFAULT_SCALE; // world-units visible across diameter
  private sweepAngle: number = 0;

  constructor(container: HTMLElement) {
    // --- create canvas ---
    this.canvas = document.createElement('canvas');
    this.canvas.width = MAP_DIAMETER;
    this.canvas.height = MAP_DIAMETER;

    // Fixed bottom-right positioning
    Object.assign(this.canvas.style, {
      position: 'fixed',
      right: '16px',
      bottom: '16px',
      width: `${MAP_DIAMETER}px`,
      height: `${MAP_DIAMETER}px`,
      borderRadius: '50%',
      pointerEvents: 'none',
      zIndex: '100',
      imageRendering: 'auto',
    } as Partial<CSSStyleDeclaration>);

    container.appendChild(this.canvas);

    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Minimap: failed to get 2d context');
    this.ctx = ctx;
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  setScale(unitsVisible: number): void {
    this.scale = Math.max(10, unitsVisible);
  }

  update(
    playerX: number,
    playerZ: number,
    playerFacing: number, // radians, 0 = +Z (north), CW positive
    markers: MinimapMarker[],
    stormRadius: number,
    stormCenterX: number,
    stormCenterZ: number,
    dt: number,
  ): void {
    const ctx = this.ctx;
    const ppu = MAP_DIAMETER / this.scale; // pixels per world-unit

    // Advance cosmetic sweep
    this.sweepAngle = (this.sweepAngle + SWEEP_SPEED * dt) % TWO_PI;

    // ------------------------------------------------------------------
    // Clear & clip to circle
    // ------------------------------------------------------------------
    ctx.clearRect(0, 0, MAP_DIAMETER, MAP_DIAMETER);
    ctx.save();

    ctx.beginPath();
    ctx.arc(HALF, HALF, MAP_RADIUS, 0, TWO_PI);
    ctx.clip();

    // ------------------------------------------------------------------
    // Background
    // ------------------------------------------------------------------
    ctx.fillStyle = 'rgba(5, 12, 20, 0.82)';
    ctx.fillRect(0, 0, MAP_DIAMETER, MAP_DIAMETER);

    // Subtle grid rings
    ctx.strokeStyle = 'rgba(40, 70, 90, 0.25)';
    ctx.lineWidth = 0.5;
    for (let r = 20; r < MAP_RADIUS; r += 20) {
      ctx.beginPath();
      ctx.arc(HALF, HALF, r, 0, TWO_PI);
      ctx.stroke();
    }

    // Cross-hairs
    ctx.strokeStyle = 'rgba(40, 70, 90, 0.2)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(HALF, 0);
    ctx.lineTo(HALF, MAP_DIAMETER);
    ctx.moveTo(0, HALF);
    ctx.lineTo(MAP_DIAMETER, HALF);
    ctx.stroke();

    // ------------------------------------------------------------------
    // Radar sweep (cosmetic)
    // ------------------------------------------------------------------
    // Draw sweep as a filled arc trailing the sweep line
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = '#00ffaa';
    ctx.beginPath();
    ctx.moveTo(HALF, HALF);
    ctx.arc(HALF, HALF, MAP_RADIUS, this.sweepAngle - 0.6, this.sweepAngle);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();

    // Sweep line
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 255, 170, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(HALF, HALF);
    ctx.lineTo(
      HALF + Math.cos(this.sweepAngle) * MAP_RADIUS,
      HALF + Math.sin(this.sweepAngle) * MAP_RADIUS,
    );
    ctx.stroke();
    ctx.restore();

    // ------------------------------------------------------------------
    // Storm wall ring
    // ------------------------------------------------------------------
    if (stormRadius > 0) {
      const [sx, sy] = worldToMinimap(stormCenterX, stormCenterZ, playerX, playerZ, ppu);
      const sr = stormRadius * ppu;

      ctx.strokeStyle = 'rgba(255, 60, 50, 0.7)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, TWO_PI);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // ------------------------------------------------------------------
    // Markers (zones first, then items, then entities)
    // ------------------------------------------------------------------
    // Sort so zones render behind dots
    const zoneTypes = new Set<string>(['radiation', 'heat', 'extraction', 'extraction_active']);
    const zones: MinimapMarker[] = [];
    const points: MinimapMarker[] = [];

    for (const m of markers) {
      if (zoneTypes.has(m.type)) {
        zones.push(m);
      } else {
        points.push(m);
      }
    }

    // --- Zone markers ---
    for (const m of zones) {
      const [mx, my] = worldToMinimap(m.x, m.z, playerX, playerZ, ppu);
      if (distFromCenter(mx, my) > MAP_RADIUS + 20) continue; // off-screen cull
      const zr = (m.radius ?? 10) * ppu;

      switch (m.type) {
        case 'radiation':
          ctx.fillStyle = 'rgba(50, 220, 80, 0.12)';
          ctx.strokeStyle = 'rgba(50, 220, 80, 0.35)';
          break;
        case 'heat':
          ctx.fillStyle = 'rgba(240, 150, 30, 0.12)';
          ctx.strokeStyle = 'rgba(240, 150, 30, 0.35)';
          break;
        case 'extraction':
          ctx.fillStyle = 'rgba(0, 200, 60, 0.10)';
          ctx.strokeStyle = 'rgba(0, 200, 60, 0.45)';
          break;
        case 'extraction_active':
          ctx.fillStyle = 'rgba(0, 255, 80, 0.18)';
          ctx.strokeStyle = 'rgba(0, 255, 80, 0.8)';
          break;
      }

      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(mx, my, zr, 0, TWO_PI);
      ctx.fill();
      ctx.stroke();
    }

    // --- Point markers ---
    for (const m of points) {
      const [mx, my] = worldToMinimap(m.x, m.z, playerX, playerZ, ppu);
      if (distFromCenter(mx, my) > MAP_RADIUS + 4) continue;

      let color: string;
      let radius: number;

      switch (m.type) {
        case 'core':
          color = 'rgba(0, 240, 255, 0.95)';
          radius = 3;
          break;
        case 'core_collected':
          color = 'rgba(0, 160, 180, 0.4)';
          radius = 2;
          break;
        case 'salvage':
          color = 'rgba(230, 180, 40, 0.9)';
          radius = 2;
          break;
        case 'salvage_collected':
          color = 'rgba(160, 130, 40, 0.35)';
          radius = 1.5;
          break;
        case 'drone':
          color = 'rgba(255, 50, 40, 0.95)';
          radius = 2.5;
          break;
        case 'fuel':
          color = 'rgba(60, 140, 255, 0.9)';
          radius = 2;
          break;
        case 'repair':
          color = 'rgba(50, 220, 80, 0.9)';
          radius = 2;
          break;
        default:
          color = 'rgba(180,180,180,0.5)';
          radius = 1.5;
          break;
      }

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(mx, my, radius, 0, TWO_PI);
      ctx.fill();
    }

    // ------------------------------------------------------------------
    // Player (always at center)
    // ------------------------------------------------------------------
    // Direction arrow
    const arrowLen = 8;
    const arrowHalf = 3.2;
    // playerFacing: 0 = +Z = up on minimap
    // Canvas angle: up = -PI/2. We convert facing so that 0 faces up.
    const facing = -playerFacing - Math.PI / 2;

    const tipX = HALF + Math.cos(facing) * arrowLen;
    const tipY = HALF + Math.sin(facing) * arrowLen;
    const leftX = HALF + Math.cos(facing + 2.5) * arrowHalf;
    const leftY = HALF + Math.sin(facing + 2.5) * arrowHalf;
    const rightX = HALF + Math.cos(facing - 2.5) * arrowHalf;
    const rightY = HALF + Math.sin(facing - 2.5) * arrowHalf;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(leftX, leftY);
    ctx.lineTo(HALF, HALF);
    ctx.lineTo(rightX, rightY);
    ctx.closePath();
    ctx.fill();

    // Center dot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(HALF, HALF, 2, 0, TWO_PI);
    ctx.fill();

    // ------------------------------------------------------------------
    // North indicator
    // ------------------------------------------------------------------
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('N', HALF, 4);

    // Small tick at top-center
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(HALF, 0);
    ctx.lineTo(HALF, 3);
    ctx.stroke();

    // ------------------------------------------------------------------
    // Border ring
    // ------------------------------------------------------------------
    ctx.restore(); // release clip

    ctx.strokeStyle = 'rgba(60, 140, 170, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(HALF, HALF, MAP_RADIUS - 1, 0, TWO_PI);
    ctx.stroke();

    // Outer glow ring
    ctx.strokeStyle = 'rgba(60, 140, 170, 0.15)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(HALF, HALF, MAP_RADIUS - 0.5, 0, TWO_PI);
    ctx.stroke();
  }

  dispose(): void {
    this.canvas.remove();
  }
}
