export const floor = Math.floor;
export const min = Math.min;
export const max = Math.max;
export const sqrt = Math.sqrt;
export const abs = Math.abs;
export const sign = Math.sign;
export const cos = Math.cos;
export const sin = Math.sin;
export const tan = Math.tan;
export const PI = Math.PI;
export const clamp = (t: number, from: number, to: number) =>
  max(from, min(to, t));
export const lerp = (a: number, b: number, t: number) => a * (1.0 - t) + b * t;
export const random = Math.random;
export const rangeRandom = (from: number, to: number) =>
  lerp(from, to, random());

/**
 * vec2
 */
export type vec2 = [number, number];
export const mult = (v: vec2, scalar: number): vec2 => [
  v[0] * scalar,
  v[1] * scalar
];
export const add = (a: vec2, b: vec2): vec2 => [a[0] + b[0], a[1] + b[1]];
export const sub = (a: vec2, b: vec2): vec2 => [a[0] - b[0], a[1] - b[1]];
export const length = (a: vec2): number => sqrt(a[0] ** 2 + a[1] ** 2);
export const distance = (a: vec2, b: vec2): number => length(sub(a, b));
export const normalize = (v: vec2): vec2 => mult(v, 1.0 / length(v));
export const dot = (a: vec2, b: vec2): number => a[0] * b[0] + a[1] * b[1];
export const angle = (a: vec2, b: vec2): number =>
  (dot(normalize(a), normalize(b)) - 1.0) * -0.5 * PI;
export const cross = (a: vec2, b: vec2): number => -a[0] * b[1] + b[0] * a[1];

export const sangle = (a: vec2, b: vec2): number =>
  angle(a, b) * sign(cross(a, b));

/**
 * AABB
 */
export class AABB {
  get width(): number {
    return this.max[0] - this.min[0];
  }

  get height(): number {
    return this.max[1] - this.min[1];
  }

  get area(): number {
    return this.width * this.height;
  }

  get rect(): Polygon {
    return [
      this.min,
      [this.min[0], this.max[1]],
      this.max,
      [this.max[0], this.min[1]]
    ];
  }

  constructor(public min: vec2, public max: vec2) {}

  contains(other: AABB): boolean {
    return (
      this.min[0] <= other.min[0] &&
      this.min[1] <= other.min[1] &&
      this.max[0] >= other.max[0] &&
      this.max[1] >= other.max[1]
    );
  }
}

export const subdivide = (aabb: AABB): [AABB, AABB, AABB, AABB] => {
  const min = aabb.min;
  const center = mult(add(aabb.min, aabb.max), 0.5);
  const max = aabb.max;

  return [
    new AABB([min[0], center[1]], [center[0], max[1]]), // bottom-left
    new AABB([center[0], center[1]], [max[0], max[1]]), // bottom-right
    new AABB([center[0], min[1]], [max[0], center[1]]), // top-right
    new AABB([min[0], min[1]], [center[0], center[1]]) // top-left
  ];
};

/**
 * Polygon
 */
export type Polygon = vec2[];

export const isConvex = (polygon: Polygon) => {
  let _lastSign = 0;
  for (let i = 0; i < polygon.length; i++) {
    const e1 = sub(polygon[(i + 1) % polygon.length], polygon[i]);
    const e2 = sub(
      polygon[(i + 2) % polygon.length],
      polygon[(i + 1) % polygon.length]
    );

    const _sign = sign(cross(e1, e2));
    if (i != 0) {
      if (_sign !== _lastSign) {
        return false;
      }
    }

    _lastSign = _sign;
  }

  return true; // All edges keep the same angle sign relative each other
};

export const isCCW = (polygon: Polygon) => {
  const e1 = sub(polygon[1], polygon[0]);
  const e2 = sub(polygon[2], polygon[1]);
  return sign(cross(e1, e2)) > 0;
};

export const hasIntersection = (polygon1: Polygon, polygon2: Polygon) => {
  // We assume that polygons has CCW orientation
  for (const polygon of [polygon1, polygon2]) {
    const primary = polygon === polygon1 ? polygon1 : polygon2;
    const secondary = polygon === polygon1 ? polygon2 : polygon1;

    for (let i = 0; i < primary.length; i++) {
      const e = sub(primary[(i + 1) % primary.length], primary[i]);
      // test cross product against each vertex of secondary poly
      if (secondary.every(p => cross(sub(p, primary[i]), e) > 0)) {
        return false;
      }
    }
  }

  return true;
};
