import { setImmediate } from 'node:timers/promises';
import { Vec3 } from 'vec3';
import { encodePng } from './png.js';

type Point = { x: number; y: number; z: number };
type Shape = number[];
export type ViewBlock = { name: string; shapes: Shape[] };
export type ViewSource = {
  origin: Point;
  yaw: number;
  pitch: number;
  blockAt: (position: Vec3) => ViewBlock | null;
  isCurrent: () => boolean;
};
export type ViewOptions = { width: number; distance: number; fov: number };

export function blockColor(name: string): number[] {
  if (/grass|leaves|moss/.test(name)) return [88, 146, 65];
  if (/water|ice/.test(name)) return [58, 133, 205];
  if (/lava/.test(name)) return [244, 115, 35];
  if (/sand|end_stone/.test(name)) return [214, 201, 145];
  if (/snow|quartz|white/.test(name)) return [224, 229, 232];
  if (/log|wood|planks|chest/.test(name)) return [154, 109, 62];
  if (/dirt|mud/.test(name)) return [133, 92, 62];
  if (/stone|ore|deepslate/.test(name)) return [139, 143, 150];
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  return [80 + hash % 130, 80 + (hash >>> 8) % 130, 80 + (hash >>> 16) % 130];
}

function intersect(origin: number[], ray: number[], box: number[], offset: number[]): { distance: number; axis: number } | null {
  let near = 0;
  let far = Infinity;
  let axis = 1;
  for (let i = 0; i < 3; i++) {
    const min = box[i] + offset[i];
    const max = box[i + 3] + offset[i];
    if (Math.abs(ray[i]) < 1e-10) {
      if (origin[i] < min || origin[i] > max) return null;
    } else {
      const a = (min - origin[i]) / ray[i];
      const b = (max - origin[i]) / ray[i];
      const entry = Math.min(a, b);
      if (entry > near) { near = entry; axis = i; }
      far = Math.min(far, Math.max(a, b));
      if (near > far) return null;
    }
  }
  return far >= 0 ? { distance: near, axis } : null;
}

// Read-only collision geometry, not a textured Minecraft client renderer.
export async function renderBlockView(source: ViewSource, options: ViewOptions) {
  const { width, distance, fov } = options;
  if (![160, 320, 480].includes(width) || !Number.isInteger(distance) || distance < 4 || distance > 48 ||
      !Number.isFinite(fov) || fov < 30 || fov > 100 ||
      ![source.origin.x, source.origin.y, source.origin.z, source.yaw, source.pitch].every(Number.isFinite)) {
    throw new Error('Invalid visual parameters or camera position');
  }
  const height = width * 9 / 16;
  const cache = new Map<string, ViewBlock | null>();
  const lookup = (x: number, y: number, z: number) => {
    const key = `${x},${y},${z}`;
    if (!cache.has(key)) {
      const block = source.blockAt(new Vec3(x, y, z));
      cache.set(key, block ? { name: block.name, shapes: block.shapes.map(shape => [...shape]) } : null);
    }
    return cache.get(key)!;
  };
  if (!lookup(Math.floor(source.origin.x), Math.floor(source.origin.y), Math.floor(source.origin.z))) throw new Error('Camera chunk is not loaded');
  const origin = [source.origin.x, source.origin.y, source.origin.z];
  const cy = Math.cos(source.yaw), sy = Math.sin(source.yaw);
  const cp = Math.cos(source.pitch), sp = Math.sin(source.pitch);
  const forward = [-sy * cp, sp, -cy * cp];
  const right = [cy, 0, -sy];
  const up = [sy * sp, cp, cy * sp];
  const scale = Math.tan(fov * Math.PI / 360);
  const rgb = new Uint8Array(width * height * 3);
  const visible = new Map<string, number>();
  let unknownPixels = 0;
  let hitPixels = 0;
  const started = Date.now();
  for (let py = 0; py < height; py++) {
    if (py % 8 === 0) {
      await setImmediate();
      if (!source.isCurrent()) throw new Error('Bot disconnected or changed during capture');
      if (Date.now() - started > 15000) throw new Error('Visual capture exceeded 15 seconds');
    }
    for (let px = 0; px < width; px++) {
      const u = (2 * (px + 0.5) / width - 1) * scale;
      const v = (1 - 2 * (py + 0.5) / height) * scale * height / width;
      const ray = forward.map((f, i) => f + right[i] * u + up[i] * v);
      const len = Math.hypot(...ray);
      for (let i = 0; i < 3; i++) ray[i] /= len;
      const cell = origin.map(Math.floor);
      const step = ray.map(d => d >= 0 ? 1 : -1);
      const delta = ray.map(d => d === 0 ? Infinity : Math.abs(1 / d));
      const edge = ray.map((d, i) => d === 0 ? Infinity : ((cell[i] + (d > 0 ? 1 : 0)) - origin[i]) / d);
      let traveled = 0;
      // Blue is the distance limit, not proof that an unloaded chunk is empty.
      let color = [112, 166, 207];
      while (traveled <= distance) {
        const block = lookup(cell[0], cell[1], cell[2]);
        if (block === null) {
          color = (px + py) % 8 < 4 ? [88, 54, 100] : [54, 36, 64];
          unknownPixels++;
          break;
        }
        const shapes = /^(water|lava)$/.test(block.name) ? [[0, 0, 0, 1, 1, 1]] : block.shapes;
        let nearest: ReturnType<typeof intersect> = null;
        for (const shape of shapes) {
          if (shape.length !== 6) continue;
          const hit = intersect(origin, ray, shape, cell);
          if (hit && hit.distance >= traveled - 1e-6 && hit.distance <= distance && (!nearest || hit.distance < nearest.distance)) nearest = hit;
        }
        if (nearest) {
          const onGrid = origin.some((value, axis) => {
            if (axis === nearest.axis) return false;
            const coordinate = value + ray[axis] * nearest.distance;
            return Math.abs(coordinate - Math.round(coordinate)) < 0.015;
          });
          const shade = [0.78, 1, 0.62][nearest.axis] * (1 - 0.4 * nearest.distance / distance) * (onGrid ? 0.7 : 1);
          color = blockColor(block.name).map(c => Math.round(c * shade));
          visible.set(block.name, (visible.get(block.name) ?? 0) + 1);
          hitPixels++;
          break;
        }
        let axis = 0;
        if (edge[1] < edge[axis]) axis = 1;
        if (edge[2] < edge[axis]) axis = 2;
        traveled = edge[axis];
        cell[axis] += step[axis];
        edge[axis] += delta[axis];
      }
      rgb.set(color, (py * width + px) * 3);
    }
  }
  if (!source.isCurrent()) throw new Error('Bot disconnected or changed during capture');
  return {
    png: encodePng(width, height, rgb),
    metadata: { renderer: 'collision-geometry-preview', width, height, distance, fov, origin: source.origin,
      yaw: source.yaw, pitch: source.pitch, elapsedMs: Date.now() - started, hitPixels, unknownPixels,
      visibleBlocks: Object.fromEntries([...visible].sort((a, b) => b[1] - a[1]).slice(0, 32)),
      limitations: 'Simplified block collision shapes and opaque fluids; synthetic colors, no textures, entities, GUI, lighting, resource packs or custom models. Purple means unknown chunks; blue means distance limit. Not a game-client screenshot. Live data is sampled over capture duration.' }
  };
}
