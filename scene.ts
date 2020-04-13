import { mat3, vec2 as glvec2 } from "gl-matrix";

import { QuadTreeNode, QuadTree } from "./quadtree";
import {
  vec2,
  mult,
  AABB,
  sqrt,
  distance,
  rangeRandom,
  normalize,
  sub,
  length,
  sangle,
  PI,
  add,
  min,
  tan,
  Polygon,
  hasIntersection
} from "./math";

export class Entity {
  set rotation(degrees: number) {
    this._rotation = degrees;
    this.markAsDirty();
  }

  get rotation(): number {
    return this._rotation;
  }

  set position(coords: vec2) {
    this._position = coords;
    this.markAsDirty();
  }

  get position(): vec2 {
    return this._position;
  }

  get transform(): mat3 {
    if (this._dirty) {
      mat3.fromTranslation(this._transform, this.position);
      mat3.rotate(this._transform, this._transform, this._rotation);
      this._dirty = false;
    }
    return this._transform;
  }

  get forward(): vec2 {
    return [this.transform[3], this.transform[4]];
  }

  get right(): vec2 {
    return [this.transform[0], this.transform[1]];
  }

  protected _transform = mat3.create();
  protected _dirty = true;
  protected _rotation = 0.0;
  protected _position: vec2 = [0.0, 0.0];

  constructor(position: vec2, rotation: number) {
    this._position = position;
    this._rotation = rotation;
  }

  protected markAsDirty() {
    this._dirty = true;
  }
}

export class Box extends Entity {
  get aabb(): AABB {
    if (this._boxDirty) {
      this.updateBox();
    }
    return this._aabb;
  }

  get polygon(): Polygon {
    if (this._boxDirty) {
      this.updateBox();
    }
    return this._polygon;
  }

  get size(): vec2 {
    return this._size;
  }

  protected _size: vec2;
  protected _aabb: AABB;
  protected _polygon: Polygon;
  protected _boxDirty = true;

  constructor(size: vec2, position: vec2 = [0.0, 0.0], rotation: number = 0.0) {
    super(position, rotation);
    this._size = size;
  }

  protected updateBox() {
    const min = mult(this._size, -0.5);
    const max = mult(this._size, 0.5);
    const vertices = [min, [min[0], max[1]], max, [max[0], min[1]]]
      .map((vertex: vec2) => glvec2.fromValues(vertex[0], vertex[1]))
      .map((vertex: glvec2) =>
        glvec2.transformMat3(vertex, vertex, this.transform)
      )
      .map((vertex: glvec2) => [vertex[0], vertex[1]] as vec2);

    let minX = vertices[0][0],
      minY = vertices[0][1],
      maxX = vertices[0][0],
      maxY = vertices[0][1];

    for (let v of vertices) {
      if (v[0] < minX) {
        minX = v[0];
      }
      if (v[1] < minY) {
        minY = v[1];
      }
      if (v[0] > maxX) {
        maxX = v[0];
      }
      if (v[1] > maxY) {
        maxY = v[1];
      }
    }
    this._aabb = new AABB([minX, minY], [maxX, maxY]);
    this._polygon = vertices as Polygon;
    this._boxDirty = false;
  }

  protected markAsDirty() {
    super.markAsDirty();
    this._boxDirty = true;
  }
}

export class Frustum extends Entity {
  get polygon(): Polygon {
    if (this._frustumDirty) {
      this.updateFrustum();
    }
    return this._polygon;
  }

  get fov() {
    return this._fov;
  }

  get near() {
    return this._near;
  }

  get far() {
    return this._far;
  }

  protected _fov: number;
  protected _near: number;
  protected _far: number;
  protected _polygon: Polygon;
  protected _frustumDirty = true;

  constructor(
    fov: number, // in degrees
    near: number,
    far: number,
    position: vec2 = [0.0, 0.0],
    rotation: number = 0
  ) {
    super(position, rotation);
    this._fov = (PI / 180.0) * fov;
    this._near = near;
    this._far = far;
  }

  protected markAsDirty() {
    super.markAsDirty();
    this._frustumDirty = true;
  }

  protected updateFrustum() {
    const n = this._near * tan(this._fov * 0.5);
    const f = this._far * tan(this._fov * 0.5);

    this._polygon = [
      [n, this._near],
      [-n, this._near],
      [-f, this._far],
      [f, this._far]
    ]
      .map((vertex: vec2) => glvec2.fromValues(vertex[0], vertex[1]))
      .map((vertex: glvec2) =>
        glvec2.transformMat3(vertex, vertex, this.transform)
      )
      .map((vertex: glvec2) => [vertex[0], vertex[1]] as vec2);

    this._frustumDirty = false;
  }
}

export interface SceneControllerInterface {
  update(dt: number): void;
}

export class FpsSceneController implements SceneControllerInterface {
  protected mask: number = 0x0;

  constructor(
    protected entity: Entity,
    protected speed = 512.0,
    protected angularSpeed = PI
  ) {
    this.initController();
  }

  update(dt: number): void {
    if (this.mask & 0x01) {
      this.entity.rotation = this.entity.rotation - this.angularSpeed * dt;
    }

    if (this.mask & 0x02) {
      this.entity.position = add(
        this.entity.position,
        mult(this.entity.forward, -dt * this.speed)
      );
    }

    if (this.mask & 0x04) {
      this.entity.rotation = this.entity.rotation + this.angularSpeed * dt;
    }

    if (this.mask & 0x08) {
      this.entity.position = add(
        this.entity.position,
        mult(this.entity.forward, dt * this.speed)
      );
    }
  }

  protected initController() {
    const A = 65;
    const D = 68;
    const W = 87;
    const S = 83;

    document.addEventListener("keydown", (event: KeyboardEvent) => {
      switch (event.keyCode) {
        case A:
          this.mask |= 0x01;
          break;

        case S:
          this.mask |= 0x02;
          break;

        case D:
          this.mask |= 0x04;
          break;

        case W:
          this.mask |= 0x08;
          break;
      }
    });

    document.addEventListener("keyup", (event: KeyboardEvent) => {
      switch (event.keyCode) {
        case A:
          this.mask &= ~0x01;
          break;

        case S:
          this.mask &= ~0x02;
          break;

        case D:
          this.mask &= ~0x04;
          break;

        case W:
          this.mask &= ~0x08;
          break;
      }
    });
  }
}

export interface Body {
  position: vec2;
  angle: number;
  velocity: vec2;
  omega: number;
  destination: vec2;
  entity: Box;
}

export class CrowdSceneController implements SceneControllerInterface {
  protected bodies: Body[] = [];

  constructor(protected entities: Box[], protected fieldSize: number) {
    this.initController();
  }

  update(dt: number): void {
    if (dt === 0) {
      return;
    }

    const attractionCoeff = 32.0;
    const impactDistance = 32.0;
    const repulsiveCoeff = 128;
    const maxSpeed = 32.0;

    for (let body of this.bodies) {
      // 1. Check destination
      const r =
        sqrt(body.entity.aabb.width ** 2 + body.entity.aabb.height ** 2) * 0.5;
      const dist = distance(body.destination, body.position);
      if (dist <= r) {
        body.destination = [
          rangeRandom(0.0, this.fieldSize),
          rangeRandom(0.0, this.fieldSize)
        ];
      }

      // 2. Calc attraction force to destination
      let force: vec2 = mult(
        normalize(sub(body.destination, body.position)),
        attractionCoeff
      );

      // 3. Calc repulsive forces
      // !@todo: Use quadtree for better performance
      // @solution:
      // This quadtree variant is't effective solution for this task.
      // For collision detection one need leaf-based (where items are stored primarily in leaf nodes not in intermediate nodes) quadtree data structure.
      for (let body2 of this.bodies) {
        if (body === body2) {
          continue;
        }
        const dist = distance(body.position, body2.position);
        if (dist < impactDistance) {
          const repulsive = mult(
            sub(body.position, body2.position),
            repulsiveCoeff / dist + repulsiveCoeff / dist ** 2
          );

          force = add(force, repulsive);
        }
      }

      // 4. Calc velocity, omega, positon and rotation
      // !@todo: calc through mass
      body.velocity = add(body.velocity, mult(force, dt));
      const speed = min(length(body.velocity), maxSpeed);
      body.velocity = mult(normalize(body.velocity), speed);

      body.omega = sangle(this.getMainAxis(body.entity), body.velocity);

      body.position = add(body.position, mult(body.velocity, dt));
      body.angle = body.angle + body.omega * dt;

      // 5. Apply transform to entity
      body.entity.position = body.position;
      body.entity.rotation = body.angle;
    }
  }

  protected initController() {
    const MIN_VELOCITY = 4;
    const MAX_VELOCITY = 32;
    for (let entity of this.entities) {
      const velocity: vec2 = mult(
        this.getMainAxis(entity),
        rangeRandom(MIN_VELOCITY, MAX_VELOCITY)
      );
      const omega = 0.0;
      const destination: vec2 = [
        rangeRandom(0.0, this.fieldSize),
        rangeRandom(0.0, this.fieldSize)
      ];
      this.bodies.push({
        position: entity.position,
        angle: entity.rotation,
        velocity,
        omega,
        entity,
        destination
      });
    }
  }

  protected getMainAxis(box: Box): vec2 {
    if (box.size[0] > box.size[1]) {
      return box.right;
    } else {
      return box.forward;
    }
  }
}

export interface SceneOptions {
  fieldSize: number;
  totalItems: number;
  frustumFov: number;
  frustumNear: number;
  frustumFar: number;
}

export class Scene {
  entityNodeLookup = new WeakMap<Entity, QuadTreeNode>([]);
  nodeEntitiesLookup = new WeakMap<QuadTreeNode, Entity[]>([]);
  quadTree: QuadTree;
  entities: Entity[] = [];
  controllers: SceneControllerInterface[] = [];

  constructor(public options: SceneOptions) {
    this.initScene();
  }

  protected initScene() {
    // Scene quad tree
    this.quadTree = new QuadTree(
      new AABB([0, 0], [this.options.fieldSize, this.options.fieldSize])
    );

    // Scene entities
    const MIN_SIZE = 4;
    const MAX_SIZE = 32;
    const bodies = [];
    for (let i = 0; i < this.options.totalItems; i++) {
      const position: vec2 = [
        rangeRandom(0.0, this.options.fieldSize),
        rangeRandom(0.0, this.options.fieldSize)
      ];
      const rotation = rangeRandom(0.0, 2.0 * PI);
      const size: vec2 = [
        rangeRandom(MIN_SIZE, MAX_SIZE),
        rangeRandom(MIN_SIZE, MAX_SIZE)
      ];
      const box = new Box(size, position, rotation);
      this.entities.push(box);
      bodies.push(box);
    }

    const frustum = new Frustum(
      this.options.frustumFov,
      min(this.options.frustumNear, this.options.frustumFar),
      this.options.frustumFar,
      [this.options.fieldSize * 0.5, this.options.fieldSize * 0.5]
    );
    this.entities.push(frustum);

    // Scene controllers
    this.controllers.push(
      new CrowdSceneController(bodies as Box[], this.options.fieldSize)
    );
    this.controllers.push(new FpsSceneController(frustum));
  }

  update(dt) {
    // Clear state
    this.quadTree.clear();

    // Update entities
    this.controllers.forEach(controller => controller.update(dt));

    // Update quadtree
    this.updateQuadTreeNodes();
  }

  protected updateQuadTreeNodes() {
    for (let entity of this.entities) {
      if (entity instanceof Box) {
        const node = this.quadTree.addToTree((entity as Box).aabb);
        this.entityNodeLookup.set(entity, node);
        if (!this.nodeEntitiesLookup.has(node)) {
          this.nodeEntitiesLookup.set(node, []);
        }
        this.nodeEntitiesLookup.get(node).push(entity);
      }
    }
  }
}
