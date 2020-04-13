import { AABB, subdivide } from "./math";

export class QuadTreeNode {
  parent: QuadTreeNode = null;
  children: [
    QuadTreeNode, // bottom-left
    QuadTreeNode, // bottom-right
    QuadTreeNode, // top-right
    QuadTreeNode // top-left
  ] = [null, null, null, null];

  get isLeaf() {
    return (
      this.children[0] === null &&
      this.children[1] === null &&
      this.children[2] === null &&
      this.children[3] === null
    );
  }

  get isRoot() {
    return parent === null;
  }

  constructor(public aabb: AABB) {}

  addChild(child: QuadTreeNode, slot: number) {
    if (this.children[slot]) {
      return;
    }
    this.children[slot] = child;
    child.parent = this;
  }
}

export class QuadTree {
  get root(): QuadTreeNode {
    return this._root;
  }

  protected _root: QuadTreeNode;

  constructor(protected aabb: AABB, private maxDepthLevel = 4) {
    this.clear();
  }

  addToTree(aabb: AABB): QuadTreeNode {
    return this.getBranchNode(this._root, aabb, 0);
  }

  clear() {
    this._root = new QuadTreeNode(this.aabb);
  }

  /**
   * Construct branch and return node on it
   */
  private getBranchNode(
    from: QuadTreeNode,
    aabb: AABB,
    level: number
  ): QuadTreeNode {
    if (level >= this.maxDepthLevel) {
      return from;
    }
    const subdivided = subdivide(from.aabb);
    const bottomLeft = from.children[0] || new QuadTreeNode(subdivided[0]);
    const bottomRight = from.children[1] || new QuadTreeNode(subdivided[1]);
    const topRight = from.children[2] || new QuadTreeNode(subdivided[2]);
    const topLeft = from.children[3] || new QuadTreeNode(subdivided[3]);

    if (bottomLeft.aabb.contains(aabb)) {
      from.addChild(bottomLeft, 0);
      return this.getBranchNode(bottomLeft, aabb, level + 1);
    }

    if (bottomRight.aabb.contains(aabb)) {
      from.addChild(bottomRight, 1);
      return this.getBranchNode(bottomRight, aabb, level + 1);
    }

    if (topRight.aabb.contains(aabb)) {
      from.addChild(topRight, 2);
      return this.getBranchNode(topRight, aabb, level + 1);
    }

    if (topLeft.aabb.contains(aabb)) {
      from.addChild(topLeft, 3);
      return this.getBranchNode(topLeft, aabb, level + 1);
    }

    return from;
  }
}
