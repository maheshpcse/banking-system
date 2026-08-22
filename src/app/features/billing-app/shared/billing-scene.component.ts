import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild
} from '@angular/core';

type ThreeNamespace = {
  Scene: new () => {
    fog: unknown;
    add: (obj: unknown) => void;
  };
  PerspectiveCamera: new (
    fov: number,
    aspect: number,
    near: number,
    far: number
  ) => {
    position: { z: number; y: number };
    aspect: number;
    updateProjectionMatrix: () => void;
  };
  WebGLRenderer: new (params: { canvas: HTMLCanvasElement; antialias: boolean; alpha: boolean }) => {
    setSize: (w: number, h: number, updateStyle?: boolean) => void;
    setPixelRatio: (ratio: number) => void;
    render: (scene: unknown, camera: unknown) => void;
    dispose: () => void;
  };
  Fog: new (color: number, near: number, far: number) => unknown;
  BoxGeometry: new (w: number, h: number, d: number) => { dispose: () => void };
  SphereGeometry: new (r: number, w: number, h: number) => { dispose: () => void };
  BufferGeometry: new () => {
    setAttribute: (name: string, attr: unknown) => void;
    dispose: () => void;
  };
  BufferAttribute: new (array: Float32Array, itemSize: number) => unknown;
  MeshStandardMaterial: new (params: Record<string, unknown>) => {
    dispose: () => void;
  };
  PointsMaterial: new (params: Record<string, unknown>) => { dispose: () => void };
  Mesh: new (geo: unknown, mat: unknown) => {
    position: { set: (x: number, y: number, z: number) => void };
    rotation: { x: number; y: number };
  };
  Points: new (geo: unknown, mat: unknown) => unknown;
  AmbientLight: new (color: number, intensity: number) => unknown;
  DirectionalLight: new (color: number, intensity: number) => {
    position: { set: (x: number, y: number, z: number) => void };
  };
  Color: new (color: number | string) => unknown;
};

@Component({
  selector: 'app-billing-scene',
  template: `
    <div class="scene">
      <canvas #canvas class="scene__canvas" aria-hidden="true"></canvas>
      <div class="scene__caption">
        <span>Live POS field</span>
        <strong>Currency markers in orbit</strong>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .scene {
        position: relative;
        overflow: hidden;
        border-radius: 1.25rem;
        min-height: 210px;
        background: linear-gradient(160deg, rgba(219, 234, 254, 0.9), rgba(255, 255, 255, 0.55));
        border: 1px solid rgba(255, 255, 255, 0.7);
        box-shadow: 0 16px 40px rgba(15, 23, 42, 0.06);
        animation: scene-fade-up 0.45s ease both;
      }

      .scene__canvas {
        width: 100%;
        height: 210px;
        display: block;
      }

      .scene__caption {
        position: absolute;
        left: 1rem;
        bottom: 0.9rem;
        display: grid;
        gap: 0.1rem;
        pointer-events: none;

        span {
          font-size: 0.7rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #64748b;
        }

        strong {
          font-size: 0.92rem;
          color: #0f172a;
        }
      }

      @keyframes scene-fade-up {
        from {
          opacity: 0;
          transform: translateY(8px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `
  ]
})
export class BillingSceneComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private rafId = 0;
  private disposed = false;
  private renderer: { render: (s: unknown, c: unknown) => void; dispose: () => void; setSize: Function; setPixelRatio: Function } | null =
    null;
  private scene: unknown;
  private camera: { position: { z: number; y: number }; aspect: number; updateProjectionMatrix: () => void } | null =
    null;
  private box: { rotation: { x: number; y: number } } | null = null;
  private spheres: Array<{ position: { set: (x: number, y: number, z: number) => void }; baseY: number; phase: number }> =
    [];
  private disposables: Array<{ dispose: () => void }> = [];
  private onVisibility = (): void => undefined;
  private onResize = (): void => undefined;

  ngAfterViewInit(): void {
    this.waitForThree().then((THREE) => {
      if (!THREE || this.disposed) {
        return;
      }
      this.boot(THREE);
    });
  }

  ngOnDestroy(): void {
    this.disposed = true;
    cancelAnimationFrame(this.rafId);
    document.removeEventListener('visibilitychange', this.onVisibility);
    window.removeEventListener('resize', this.onResize);
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
    this.renderer?.dispose();
    this.renderer = null;
  }

  private waitForThree(attempts = 40): Promise<ThreeNamespace | null> {
    return new Promise((resolve) => {
      const tick = (left: number) => {
        const THREE = (window as unknown as { THREE?: ThreeNamespace }).THREE;
        if (THREE) {
          resolve(THREE);
          return;
        }
        if (left <= 0 || this.disposed) {
          resolve(null);
          return;
        }
        setTimeout(() => tick(left - 1), 100);
      };
      tick(attempts);
    });
  }

  private boot(THREE: ThreeNamespace): void {
    const canvas = this.canvasRef.nativeElement;
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xeaf2fb, 6, 16);
    this.scene = scene;

    const camera = new THREE.PerspectiveCamera(42, 2, 0.1, 40);
    camera.position.z = 7.2;
    camera.position.y = 1.2;
    this.camera = camera;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer = renderer;
    this.resize();

    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    const key = new THREE.DirectionalLight(0x93c5fd, 0.9);
    key.position.set(3, 5, 4);
    scene.add(ambient);
    scene.add(key);

    const boxGeo = new THREE.BoxGeometry(1.4, 1.05, 1.4);
    const boxMat = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      metalness: 0.15,
      roughness: 0.45
    });
    const box = new THREE.Mesh(boxGeo, boxMat);
    box.position.set(0, -0.2, 0);
    scene.add(box);
    this.box = box;
    this.disposables.push(boxGeo, boxMat);

    for (let i = 0; i < 5; i++) {
      const geo = new THREE.SphereGeometry(0.18 + i * 0.02, 12, 12);
      const mat = new THREE.MeshStandardMaterial({
        color: i % 2 === 0 ? 0x60a5fa : 0x93c5fd,
        metalness: 0.2,
        roughness: 0.35
      });
      const mesh = new THREE.Mesh(geo, mat) as {
        position: { set: (x: number, y: number, z: number) => void };
      };
      const angle = (i / 5) * Math.PI * 2;
      const baseY = 0.6 + i * 0.1;
      mesh.position.set(Math.cos(angle) * 2.2, baseY, Math.sin(angle) * 2.2);
      scene.add(mesh);
      this.spheres.push({ position: mesh.position, baseY, phase: i });
      this.disposables.push(geo, mat);
    }

    const count = 80;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 1] = Math.random() * 4;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const pMat = new THREE.PointsMaterial({ color: 0x93c5fd, size: 0.05, transparent: true, opacity: 0.65 });
    scene.add(new THREE.Points(pGeo, pMat));
    this.disposables.push(pGeo, pMat);

    this.onVisibility = () => {
      if (!document.hidden && !this.disposed) {
        this.loop(0);
      }
    };
    this.onResize = () => this.resize();
    document.addEventListener('visibilitychange', this.onVisibility);
    window.addEventListener('resize', this.onResize);
    this.loop(0);
  }

  private resize(): void {
    if (!this.renderer || !this.camera) {
      return;
    }
    const canvas = this.canvasRef.nativeElement;
    const width = canvas.clientWidth || 640;
    const height = 210;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  private loop = (t: number): void => {
    if (this.disposed || document.hidden) {
      return;
    }
    if (this.box) {
      this.box.rotation.y = t * 0.00045;
      this.box.rotation.x = Math.sin(t * 0.0003) * 0.15;
    }
    this.spheres.forEach((s, i) => {
      const angle = t * 0.00035 + s.phase;
      s.position.set(Math.cos(angle) * 2.2, s.baseY + Math.sin(t * 0.002 + i) * 0.25, Math.sin(angle) * 2.2);
    });
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
    this.rafId = requestAnimationFrame(this.loop);
  };
}
