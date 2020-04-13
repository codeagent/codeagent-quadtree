import { mat3, vec2 as glvec2 } from "gl-matrix";

import { Box, Frustum, Scene, Entity } from "./scene";
import { AABB, mult, vec2, Polygon, hasIntersection } from "./math";
import { QuadTreeNode } from "./quadtree";

export const canvas = document.getElementById("canvas") as HTMLCanvasElement;
export const context = canvas.getContext("2d") as CanvasRenderingContext2D;
export const container = document.getElementById("container") as HTMLDivElement;

export const clear = (): void => {
  context.clearRect(0, 0, canvas.width, canvas.height);
};

export const drawAABB = (aabb: AABB, color: string, dashed = false) => {
  context.lineWidth = 1;
  context.strokeStyle = color;
  context.setLineDash(dashed ? [1, 1] : []);

  context.beginPath();
  context.moveTo(aabb.min[0], aabb.min[1]);
  context.lineTo(aabb.min[0], aabb.max[1]);
  context.lineTo(aabb.max[0], aabb.max[1]);
  context.lineTo(aabb.max[0], aabb.min[1]);
  context.lineTo(aabb.min[0], aabb.min[1]);
  context.stroke();
};

export const drawPoly = (poly: Polygon, color: string, dashed = false) => {
  context.lineWidth = 1;
  context.strokeStyle = color;
  context.setLineDash(dashed ? [1, 1] : []);

  context.beginPath();
  for (let i = 0; i < poly.length; i++) {
    if (i === 0) {
      context.moveTo(poly[i][0], poly[i][1]);
    }
    context.lineTo(
      poly[(i + 1) % poly.length][0],
      poly[(i + 1) % poly.length][1]
    );
  }
  context.stroke();
};

export interface DrawStatisitics {
  total: number;
  inFrustum: number;
  inFrustumChecks: number;
}

const grabNodes = (
  node: QuadTreeNode,
  frustum: Frustum,
  set: Set<QuadTreeNode>
) => {
  if (!node) {
    return;
  }
  if (hasIntersection(frustum.polygon, node.aabb.rect)) {
    set.add(node);
    for (const child of node.children) {
      grabNodes(child, frustum, set);
    }
  }
};

const grabVisible = (
  scene: Scene,
  node: QuadTreeNode,
  frustum: Frustum,
  outNodes: Set<QuadTreeNode>,
  outEntities: Set<Box>
): number => {
  let checks = 0;
  if (!node) {
    return checks;
  }
  checks++;
  if (hasIntersection(frustum.polygon, node.aabb.rect)) {
    outNodes.add(node);

    if (scene.nodeEntitiesLookup.has(node)) {
      scene.nodeEntitiesLookup
        .get(node)
        .filter(box => hasIntersection(frustum.polygon, (box as Box).aabb.rect))
        .forEach(entity => outEntities.add(entity as Box));

      checks += scene.nodeEntitiesLookup.get(node).length;
    }
    for (const child of node.children) {
      checks += grabVisible(scene, child, frustum, outNodes, outEntities);
    }
  }
  return checks;
};

export const drawScene = (scene: Scene): DrawStatisitics => {
  const AABB_COLOR = "#fff30f";
  const BOX_COLOR = "#900C3F";
  const FRUSTUM_COLOR = "#00d93a";
  const NODE_COLOR = "#D3D3D3";
  const VISIBLE_NODE_COLOR = "#fc030f";
  const VISIBLE_ENTITY_COLOR = "#4287f5";
  let total = 0;
  let inFrustum = 0;
  let inFrustumChecks = 0;

  const aabbs = new Set<AABB>([]);
  let frustum: Frustum;
  scene.entities.forEach(entity => {
    if (entity instanceof Box) {
      drawPoly((entity as Box).polygon, BOX_COLOR);
      drawAABB((entity as Box).aabb, AABB_COLOR, true);

      let node = scene.entityNodeLookup.get(entity);
      while (node) {
        aabbs.add(node.aabb);
        node = node.parent;
      }
      total++;
    } else if (entity instanceof Frustum) {
      frustum = entity as Frustum;
    }
  });
  aabbs.forEach(aabb => drawAABB(aabb, NODE_COLOR, true));

  if (frustum) {
    drawPoly(frustum.polygon, FRUSTUM_COLOR);
    const visibleNodes = new Set<QuadTreeNode>([]);
    const visibleEntities = new Set<Box>([]);
    inFrustumChecks = grabVisible(
      scene,
      scene.quadTree.root,
      frustum,
      visibleNodes,
      visibleEntities
    );
    visibleNodes.forEach(node => drawAABB(node.aabb, VISIBLE_NODE_COLOR, true));
    visibleEntities.forEach(box => drawPoly(box.polygon, VISIBLE_ENTITY_COLOR));
    inFrustum = visibleEntities.size;
  }

  return {
    total,
    inFrustum,
    inFrustumChecks
  };
};
