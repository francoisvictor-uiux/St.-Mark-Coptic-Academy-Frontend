"use client";

import {
  Camera,
  Mesh,
  Plane,
  Program,
  Renderer,
  Texture,
  Transform,
  type OGLRenderingContext,
} from "ogl";
import { useEffect, useRef } from "react";

/* --------------------------------
 * Types
 * -------------------------------- */
export interface GalleryItem {
  image: string;
  text: string;
}

interface CircularGalleryProps extends React.HTMLAttributes<HTMLDivElement> {
  items?: GalleryItem[];
  /** The amount of curvature. Higher values create a stronger bend. @default 3 */
  bend?: number;
  /** Border radius for the images, as a fraction (0.0 to 0.5). @default 0.05 */
  borderRadius?: number;
  /** Multiplier for scroll interaction speed. @default 2 */
  scrollSpeed?: number;
  /** Easing factor for the scroll animation (lower is smoother). @default 0.05 */
  scrollEase?: number;
  /** Optional class name to override the caption font. */
  fontClassName?: string;
}

/* --------------------------------
 * Helpers
 * -------------------------------- */
type Size = { width: number; height: number };
type Scroll = { ease: number; current: number; target: number; last: number; position: number };

function debounce<T extends unknown[]>(func: (...args: T) => void, wait: number) {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: T) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

function lerp(p1: number, p2: number, t: number) {
  return p1 + (p2 - p1) * t;
}

function createTextTexture(gl: OGLRenderingContext, text: string, font: string, color: string) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d")!;
  context.font = font;
  const metrics = context.measureText(text);
  const textWidth = Math.ceil(metrics.width);
  const textHeight = Math.ceil(parseInt(font, 10) * 1.2);
  canvas.width = textWidth + 20;
  canvas.height = textHeight + 20;
  context.font = font;
  context.fillStyle = color;
  context.textBaseline = "middle";
  context.textAlign = "center";
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillText(text, canvas.width / 2, canvas.height / 2);
  const texture = new Texture(gl, { generateMipmaps: false });
  texture.image = canvas;
  return { texture, width: canvas.width, height: canvas.height };
}

/* --------------------------------
 * OGL classes
 * -------------------------------- */
class Title {
  mesh!: Mesh;

  constructor(
    private gl: OGLRenderingContext,
    private plane: Mesh,
    text: string,
    textColor: string,
    font: string,
  ) {
    const { texture, width, height } = createTextTexture(gl, text, font, textColor);
    const geometry = new Plane(gl);
    const program = new Program(gl, {
      vertex: `
        attribute vec3 position;
        attribute vec2 uv;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragment: `
        precision highp float;
        uniform sampler2D tMap;
        varying vec2 vUv;
        void main() {
          vec4 color = texture2D(tMap, vUv);
          if (color.a < 0.1) discard;
          gl_FragColor = color;
        }
      `,
      uniforms: { tMap: { value: texture } },
      transparent: true,
    });
    this.mesh = new Mesh(gl, { geometry, program });
    const aspect = width / height;
    const textHeight = plane.scale.y * 0.15;
    const textWidth = textHeight * aspect;
    this.mesh.scale.set(textWidth, textHeight, 1);
    this.mesh.position.y = -plane.scale.y * 0.5 - textHeight * 0.5 - 0.05;
    this.mesh.setParent(plane);
  }
}

type MediaOptions = {
  geometry: Plane;
  gl: OGLRenderingContext;
  image: string;
  index: number;
  length: number;
  scene: Transform;
  screen: Size;
  text: string;
  viewport: Size;
  bend: number;
  textColor: string;
  borderRadius: number;
  font: string;
};

class Media {
  gl: OGLRenderingContext;
  geometry: Plane;
  image: string;
  index: number;
  length: number;
  scene: Transform;
  screen: Size;
  text: string;
  viewport: Size;
  bend: number;
  textColor: string;
  borderRadius: number;
  font: string;
  program!: Program;
  plane!: Mesh;
  extra = 0;
  widthTotal = 0;
  width = 0;
  x = 0;
  scale = 1;
  padding = 2;
  speed = 0;
  isBefore = false;
  isAfter = false;

  constructor(options: MediaOptions) {
    this.geometry = options.geometry;
    this.gl = options.gl;
    this.image = options.image;
    this.index = options.index;
    this.length = options.length;
    this.scene = options.scene;
    this.screen = options.screen;
    this.text = options.text;
    this.viewport = options.viewport;
    this.bend = options.bend;
    this.textColor = options.textColor;
    this.borderRadius = options.borderRadius;
    this.font = options.font;
    this.createShader();
    this.createMesh();
    if (this.text) {
      new Title(this.gl, this.plane, this.text, this.textColor, this.font);
    }
    this.onResize();
  }

  createShader() {
    // Anisotropic filtering keeps the images crisp even when the bend angles
    // them; mipmaps avoid shimmering when they're scaled down.
    const texture = new Texture(this.gl, { generateMipmaps: true, anisotropy: 8 });
    this.program = new Program(this.gl, {
      depthTest: false,
      depthWrite: false,
      vertex: `
        precision highp float;
        attribute vec3 position;
        attribute vec2 uv;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        uniform float uTime;
        uniform float uSpeed;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 p = position;
          p.z = (sin(p.x * 4.0 + uTime) * 1.5 + cos(p.y * 2.0 + uTime) * 1.5) * (0.1 + uSpeed * 0.5);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragment: `
        precision highp float;
        uniform vec2 uImageSizes;
        uniform vec2 uPlaneSizes;
        uniform sampler2D tMap;
        uniform float uBorderRadius;
        varying vec2 vUv;

        float roundedBoxSDF(vec2 p, vec2 b, float r) {
          vec2 d = abs(p) - b;
          return length(max(d, vec2(0.0))) + min(max(d.x, d.y), 0.0) - r;
        }

        void main() {
          vec2 ratio = vec2(
            min((uPlaneSizes.x / uPlaneSizes.y) / (uImageSizes.x / uImageSizes.y), 1.0),
            min((uPlaneSizes.y / uPlaneSizes.x) / (uImageSizes.y / uImageSizes.x), 1.0)
          );
          vec2 uv = vec2(
            vUv.x * ratio.x + (1.0 - ratio.x) * 0.5,
            vUv.y * ratio.y + (1.0 - ratio.y) * 0.5
          );
          vec4 color = texture2D(tMap, uv);

          float d = roundedBoxSDF(vUv - 0.5, vec2(0.5 - uBorderRadius), uBorderRadius);
          float edgeSmooth = 0.0035;
          float alpha = 1.0 - smoothstep(-edgeSmooth, edgeSmooth, d);

          gl_FragColor = vec4(color.rgb, alpha);
        }
      `,
      uniforms: {
        tMap: { value: texture },
        uPlaneSizes: { value: [0, 0] },
        uImageSizes: { value: [0, 0] },
        uSpeed: { value: 0 },
        uTime: { value: 100 * Math.random() },
        uBorderRadius: { value: this.borderRadius },
      },
      transparent: true,
    });

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = this.image;
    img.onload = () => {
      texture.image = img;
      this.program.uniforms.uImageSizes.value = [img.naturalWidth, img.naturalHeight];
    };
  }

  createMesh() {
    this.plane = new Mesh(this.gl, { geometry: this.geometry, program: this.program });
    this.plane.setParent(this.scene);
  }

  update(scroll: Scroll, direction: "left" | "right") {
    this.plane.position.x = this.x - scroll.current - this.extra;

    const x = this.plane.position.x;
    const H = this.viewport.width / 2;

    if (this.bend === 0) {
      this.plane.position.y = 0;
      this.plane.rotation.z = 0;
    } else {
      const bendAbs = Math.abs(this.bend);
      const R = (H * H + bendAbs * bendAbs) / (2 * bendAbs);
      const effectiveX = Math.min(Math.abs(x), H);
      const arc = R - Math.sqrt(R * R - effectiveX * effectiveX);

      if (this.bend > 0) {
        this.plane.position.y = -arc;
        this.plane.rotation.z = -Math.sign(x) * Math.asin(effectiveX / R);
      } else {
        this.plane.position.y = arc;
        this.plane.rotation.z = Math.sign(x) * Math.asin(effectiveX / R);
      }
    }

    this.speed = scroll.current - scroll.last;
    this.program.uniforms.uTime.value += 0.04;
    this.program.uniforms.uSpeed.value = this.speed;

    const planeOffset = this.plane.scale.x / 2;
    const viewportOffset = this.viewport.width / 2;
    this.isBefore = this.plane.position.x + planeOffset < -viewportOffset;
    this.isAfter = this.plane.position.x - planeOffset > viewportOffset;

    if (direction === "right" && this.isBefore) {
      this.extra -= this.widthTotal;
      this.isBefore = this.isAfter = false;
    }
    if (direction === "left" && this.isAfter) {
      this.extra += this.widthTotal;
      this.isBefore = this.isAfter = false;
    }
  }

  onResize({ screen, viewport }: { screen?: Size; viewport?: Size } = {}) {
    if (screen) this.screen = screen;
    if (viewport) this.viewport = viewport;
    this.scale = this.screen.height / 1500;
    // Keep the card ~60% of the viewport height so the bend never pushes the
    // edge cards out of frame; the container height controls the actual size.
    this.plane.scale.y = (this.viewport.height * (900 * this.scale)) / this.screen.height;
    this.plane.scale.x = (this.viewport.width * (700 * this.scale)) / this.screen.width;
    this.program.uniforms.uPlaneSizes.value = [this.plane.scale.x, this.plane.scale.y];
    this.padding = 2;
    this.width = this.plane.scale.x + this.padding;
    this.widthTotal = this.width * this.length;
    this.x = this.width * this.index;
  }
}

type AppOptions = {
  items: GalleryItem[];
  bend: number;
  textColor: string;
  borderRadius: number;
  font: string;
  scrollSpeed: number;
  scrollEase: number;
};

class App {
  container: HTMLElement;
  scrollSpeed: number;
  scroll: Scroll;
  onCheckDebounce: () => void;
  renderer!: Renderer;
  gl!: OGLRenderingContext;
  camera!: Camera;
  scene!: Transform;
  planeGeometry!: Plane;
  medias: Media[] = [];
  isDown = false;
  start = 0;
  screen!: Size;
  viewport!: Size;
  raf = 0;

  // Render-loop gating: only run rAF while the gallery is visible, the tab is
  // active, and the carousel is actually in motion. A static WebGL scene that
  // keeps re-rendering 60fps is pure wasted CPU/GPU and a common cause of lag.
  running = false;
  isVisible = true;
  isTabActive = true;
  observer?: IntersectionObserver;

  boundOnResize = () => {
    this.onResize();
    this.wake();
  };
  boundOnWheel = (e: Event) => this.onWheel(e as WheelEvent);
  boundOnTouchDown = (e: MouseEvent | TouchEvent) => this.onTouchDown(e);
  boundOnTouchMove = (e: MouseEvent | TouchEvent) => this.onTouchMove(e);
  boundOnTouchUp = () => this.onTouchUp();
  boundUpdate = () => this.update();
  boundOnVisibility = () => {
    this.isTabActive = document.visibilityState === "visible";
    this.wake();
  };

  constructor(container: HTMLElement, options: AppOptions) {
    this.container = container;
    this.scrollSpeed = options.scrollSpeed;
    this.scroll = { ease: options.scrollEase, current: 0, target: 0, last: 0, position: 0 };
    this.onCheckDebounce = debounce(() => this.onCheck(), 200);

    this.createRenderer();
    this.createCamera();
    this.createScene();
    this.onResize();
    this.createGeometry();
    this.createMedias(options);
    this.addEventListeners();
    this.wake();
  }

  createRenderer() {
    this.renderer = new Renderer({
      alpha: true,
      antialias: true,
      dpr: Math.min(window.devicePixelRatio || 1, 2),
    });
    this.gl = this.renderer.gl;
    this.gl.clearColor(0, 0, 0, 0);
    this.container.appendChild(this.gl.canvas as HTMLCanvasElement);
  }

  createCamera() {
    this.camera = new Camera(this.gl);
    this.camera.fov = 45;
    this.camera.position.z = 20;
  }

  createScene() {
    this.scene = new Transform();
  }

  createGeometry() {
    this.planeGeometry = new Plane(this.gl, { heightSegments: 50, widthSegments: 100 });
  }

  createMedias({ items, bend, textColor, borderRadius, font }: AppOptions) {
    // Duplicate the set for a seamless loop.
    const mediasImages = [...items, ...items];
    this.medias = mediasImages.map(
      (data, index) =>
        new Media({
          geometry: this.planeGeometry,
          gl: this.gl,
          image: data.image,
          index,
          length: mediasImages.length,
          scene: this.scene,
          screen: this.screen,
          text: data.text,
          viewport: this.viewport,
          bend,
          textColor,
          borderRadius,
          font,
        }),
    );
  }

  onTouchDown(e: MouseEvent | TouchEvent) {
    this.isDown = true;
    this.scroll.position = this.scroll.current;
    this.start = "touches" in e ? e.touches[0].clientX : e.clientX;
    this.wake();
  }

  onTouchMove(e: MouseEvent | TouchEvent) {
    if (!this.isDown) return;
    const x = "touches" in e ? e.touches[0].clientX : e.clientX;
    const distance = (this.start - x) * (this.scrollSpeed * 0.025);
    this.scroll.target = this.scroll.position + distance;
    this.wake();
  }

  onTouchUp() {
    this.isDown = false;
    this.onCheck();
  }

  onWheel(e: WheelEvent) {
    const delta = e.deltaY || e.detail;
    this.scroll.target += (delta > 0 ? this.scrollSpeed : -this.scrollSpeed) * 0.2;
    this.onCheckDebounce();
    this.wake();
  }

  onCheck() {
    if (!this.medias[0]) return;
    const width = this.medias[0].width;
    const itemIndex = Math.round(Math.abs(this.scroll.target) / width);
    const item = width * itemIndex;
    this.scroll.target = this.scroll.target < 0 ? -item : item;
  }

  onResize() {
    this.screen = {
      width: this.container.clientWidth,
      height: this.container.clientHeight,
    };
    this.renderer.setSize(this.screen.width, this.screen.height);
    this.camera.perspective({ aspect: this.screen.width / this.screen.height });
    const fov = (this.camera.fov * Math.PI) / 180;
    const height = 2 * Math.tan(fov / 2) * this.camera.position.z;
    const width = height * this.camera.aspect;
    this.viewport = { width, height };
    this.medias.forEach((media) =>
      media.onResize({ screen: this.screen, viewport: this.viewport }),
    );
  }

  // Start the render loop if it isn't already running and the gallery is
  // actually on screen with an active tab.
  wake() {
    if (this.running || !this.isVisible || !this.isTabActive) return;
    this.running = true;
    this.raf = window.requestAnimationFrame(this.boundUpdate);
  }

  stop() {
    this.running = false;
    if (this.raf) window.cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  update() {
    this.scroll.current = lerp(this.scroll.current, this.scroll.target, this.scroll.ease);
    const direction = this.scroll.current > this.scroll.last ? "right" : "left";
    this.medias.forEach((media) => media.update(this.scroll, direction));
    this.renderer.render({ scene: this.scene, camera: this.camera });
    this.scroll.last = this.scroll.current;

    // If the carousel has settled (and the user isn't dragging), park the loop
    // so we stop burning frames until the next interaction wakes it back up.
    const atRest = Math.abs(this.scroll.target - this.scroll.current) < 0.001;
    if (atRest && !this.isDown) {
      this.running = false;
      this.raf = 0;
      return;
    }
    this.raf = window.requestAnimationFrame(this.boundUpdate);
  }

  addEventListeners() {
    window.addEventListener("resize", this.boundOnResize);
    window.addEventListener("wheel", this.boundOnWheel, { passive: true });
    this.container.addEventListener("mousedown", this.boundOnTouchDown);
    window.addEventListener("mousemove", this.boundOnTouchMove);
    window.addEventListener("mouseup", this.boundOnTouchUp);
    this.container.addEventListener("touchstart", this.boundOnTouchDown, { passive: true });
    window.addEventListener("touchmove", this.boundOnTouchMove, { passive: true });
    window.addEventListener("touchend", this.boundOnTouchUp);
    document.addEventListener("visibilitychange", this.boundOnVisibility);

    // Pause the whole render loop whenever the gallery scrolls out of view.
    this.observer = new IntersectionObserver(
      ([entry]) => {
        this.isVisible = entry.isIntersecting;
        if (this.isVisible) this.wake();
        else this.stop();
      },
      { threshold: 0 },
    );
    this.observer.observe(this.container);
  }

  destroy() {
    this.stop();
    this.observer?.disconnect();
    document.removeEventListener("visibilitychange", this.boundOnVisibility);
    window.removeEventListener("resize", this.boundOnResize);
    window.removeEventListener("wheel", this.boundOnWheel);
    this.container.removeEventListener("mousedown", this.boundOnTouchDown);
    window.removeEventListener("mousemove", this.boundOnTouchMove);
    window.removeEventListener("mouseup", this.boundOnTouchUp);
    this.container.removeEventListener("touchstart", this.boundOnTouchDown);
    window.removeEventListener("touchmove", this.boundOnTouchMove);
    window.removeEventListener("touchend", this.boundOnTouchUp);

    const canvas = this.gl?.canvas as HTMLCanvasElement | undefined;
    canvas?.parentNode?.removeChild(canvas);
  }
}

/* --------------------------------
 * React component
 * -------------------------------- */
export default function CircularGallery({
  items = [],
  bend = 3,
  borderRadius = 0.05,
  scrollSpeed = 2,
  scrollEase = 0.05,
  className = "",
  fontClassName = "",
  ...props
}: CircularGalleryProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || items.length === 0) return;

    // Read the caption style from the container so it follows the theme.
    const computedStyle = getComputedStyle(container);
    const computedColor = computedStyle.color || "#24110f";
    const computedFont = `${computedStyle.fontWeight || "bold"} ${computedStyle.fontSize || "30px"} ${computedStyle.fontFamily}`;

    const app = new App(container, {
      items,
      bend,
      textColor: computedColor,
      borderRadius,
      font: computedFont,
      scrollSpeed,
      scrollEase,
    });

    return () => app.destroy();
  }, [items, bend, borderRadius, scrollSpeed, scrollEase, fontClassName]);

  return (
    <div
      ref={containerRef}
      className={`h-full w-full cursor-grab overflow-hidden font-serif text-[30px] font-bold text-brown-500 active:cursor-grabbing ${fontClassName} ${className}`}
      {...props}
    />
  );
}
