import { canvas, clear, drawScene, DrawStatisitics } from "./draw";
import { Scene, SceneOptions } from "./scene";
import { Subject, Observable, BehaviorSubject } from "rxjs";

class StatService {
  protected total: HTMLElement;
  protected visible: HTMLElement;
  protected brute: HTMLElement;
  protected quad: HTMLElement;

  constructor(protected container: HTMLElement) {
    this.total = this.container.querySelector("#total");
    this.visible = this.container.querySelector("#visible");
    this.brute = this.container.querySelector("#brute");
    this.quad = this.container.querySelector("#quad");
  }

  write(stat: DrawStatisitics) {
    this.total.innerHTML = `${stat.total}`;
    this.visible.innerHTML = `${stat.inFrustum}`;
    this.brute.innerHTML = `${stat.total}`;
    this.quad.innerHTML = `${stat.inFrustumChecks}`;
  }
}

class SceneOptionsForm {
  protected total: HTMLInputElement;
  protected fov: HTMLInputElement;
  protected near: HTMLInputElement;
  protected far: HTMLInputElement;

  get change$(): Observable<SceneOptions> {
    return this._change$.asObservable();
  }

  private _change$: BehaviorSubject<SceneOptions>;

  constructor(value: SceneOptions, protected container: HTMLElement) {
    this.total = this.container.querySelector("#total") as HTMLInputElement;
    this.fov = this.container.querySelector("#fov") as HTMLInputElement;
    this.near = this.container.querySelector("#near") as HTMLInputElement;
    this.far = this.container.querySelector("#far") as HTMLInputElement;

    this.total.value = `${value.totalItems}`;
    this.fov.value = `${value.frustumFov}`;
    this.near.value = `${value.frustumNear}`;
    this.far.value = `${value.frustumFar}`;

    this._change$ = new BehaviorSubject<SceneOptions>(value);

    this.total.addEventListener("change", () =>
      this._change$.next({
        ...this._change$.value,
        totalItems: +this.total.value
      })
    );

    this.fov.addEventListener("change", () =>
      this._change$.next({
        ...this._change$.value,
        frustumFov: +this.fov.value
      })
    );

    this.near.addEventListener("change", () =>
      this._change$.next({
        ...this._change$.value,
        frustumNear: +this.near.value
      })
    );

    this.far.addEventListener("change", () =>
      this._change$.next({
        ...this._change$.value,
        frustumFar: +this.far.value
      })
    );
  }
}

const sceneOptionsForm = new SceneOptionsForm(
  {
    fieldSize: canvas.width,
    totalItems: 256,
    frustumFov: 45.0,
    frustumNear: 10.0,
    frustumFar: 512.0
  },
  document.getElementById("form")
);
const statService = new StatService(document.getElementById("stat"));
let scene: Scene;

sceneOptionsForm.change$.subscribe(value => {
  console.log(value);
  scene = new Scene(value);
});

let lastFrameTime = Date.now();
let dt = 0.0;
let now = lastFrameTime;

const draw = () => {
  scene.update(dt);
  clear();
  const statistics = drawScene(scene);
  requestAnimationFrame(draw);

  now = Date.now();
  dt = (now - lastFrameTime) * 1.0e-3;
  lastFrameTime = now;

  statService.write(statistics);
};

draw();
