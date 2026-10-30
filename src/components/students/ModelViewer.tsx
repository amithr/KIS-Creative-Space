"use client";

import { useEffect, useRef, useState } from "react";

export type ViewerLabels = {
  loading: string;
  failed: string;
  hint: string;
  /** "OVER 18 CM" — appended when a side exceeds maxMm. */
  over: (cm: number) => string;
};

const EN_LABELS: ViewerLabels = {
  loading: "LOADING MODEL…",
  failed: "COULDN'T SHOW THIS FILE",
  hint: "DRAG TO ORBIT · SCROLL TO ZOOM",
  over: (cm) => `OVER ${cm} CM`,
};

type Props = {
  /** Public URL of the upload (.stl / .3mf / .obj). */
  url: string;
  fileName: string;
  /** Filament hex, used for the mesh so the preview matches the job. */
  color: string;
  /** Prints over this size (mm) are flagged. */
  maxMm?: number;
  labels?: ViewerLabels;
};

type Dims = { x: number; y: number; z: number };

const CREAM = 0xfbf6ee;
const HAIR = 0xe9dfd0;
const MUTED = 0xd9cdbb;

/**
 * In-browser preview of a 3D upload: three.js loads the file straight from
 * the public bucket, centres it, fits the camera and lets the user orbit.
 * Everything heavy is imported on first mount, so the admin page only pays
 * for three.js once someone opens a preview.
 */
export function ModelViewer({ url, fileName, color, maxMm = 180, labels = EN_LABELS }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [dims, setDims] = useState<Dims | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let disposed = false;
    let cleanup = () => {};

    (async () => {
      try {
        const [THREE, { OrbitControls }] = await Promise.all([
          import("three"),
          import("three/addons/controls/OrbitControls.js"),
        ]);
        if (disposed) return;

        const object = await loadModel(THREE, url, fileName);
        if (disposed) return;

        // Size before any rotation: files from slicers are Z-up millimetres.
        const raw = new THREE.Box3().setFromObject(object);
        const size = raw.getSize(new THREE.Vector3());
        setDims({ x: size.x, y: size.y, z: size.z });

        const material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(color),
          roughness: 0.55,
          metalness: 0.05,
        });
        object.traverse((node) => {
          const mesh = node as { isMesh?: boolean; material?: unknown };
          if (mesh.isMesh) mesh.material = material;
        });

        // Recentre on the origin, then stand it up (Z-up → three's Y-up).
        const centre = raw.getCenter(new THREE.Vector3());
        object.position.sub(centre);
        const pivot = new THREE.Group();
        pivot.add(object);
        pivot.rotation.x = -Math.PI / 2;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(CREAM);
        scene.add(pivot);
        scene.add(new THREE.HemisphereLight(0xffffff, 0xb8a98f, 1.1));
        const key = new THREE.DirectionalLight(0xffffff, 1.6);
        key.position.set(1, 2, 1.5);
        scene.add(key);
        const fill = new THREE.DirectionalLight(0xffffff, 0.5);
        fill.position.set(-2, 0.5, -1);
        scene.add(fill);

        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const grid = new THREE.GridHelper(maxDim * 2.2, 10, MUTED, HAIR);
        grid.position.y = -size.z / 2;
        scene.add(grid);

        const camera = new THREE.PerspectiveCamera(38, 1, maxDim / 100, maxDim * 20);
        const dist = (maxDim / 2 / Math.tan((camera.fov * Math.PI) / 360)) * 1.45;
        camera.position.set(dist * 0.7, dist * 0.55, dist * 0.7);
        camera.lookAt(0, 0, 0);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        el.replaceChildren(renderer.domElement);
        renderer.domElement.style.display = "block";
        renderer.domElement.style.width = "100%";
        renderer.domElement.style.height = "100%";

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 1.2;
        controls.addEventListener("start", () => {
          controls.autoRotate = false;
        });

        function resize() {
          const w = el!.clientWidth || 1;
          const h = el!.clientHeight || 1;
          renderer.setSize(w, h, false);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
        }
        resize();
        const ro = new ResizeObserver(resize);
        ro.observe(el);

        let frame = 0;
        const tick = () => {
          controls.update();
          renderer.render(scene, camera);
          frame = requestAnimationFrame(tick);
        };
        tick();
        setState("ready");

        cleanup = () => {
          cancelAnimationFrame(frame);
          ro.disconnect();
          controls.dispose();
          material.dispose();
          object.traverse((node) => {
            const mesh = node as { geometry?: { dispose(): void } };
            mesh.geometry?.dispose();
          });
          renderer.dispose();
          renderer.forceContextLoss();
          el.replaceChildren();
        };
      } catch (e) {
        if (disposed) return;
        setError(e instanceof Error ? e.message : "Could not load the file");
        setState("error");
      }
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, [url, fileName, color]);

  const tooBig = dims ? Math.max(dims.x, dims.y, dims.z) > maxMm : false;

  return (
    <div className="st-viewer">
      <div ref={host} className="st-viewer-canvas" aria-label={`3D preview of ${fileName}`} />
      {state !== "ready" && (
        <p className="st-viewer-note" aria-live="polite">
          {state === "loading" ? labels.loading : `${labels.failed} · ${error.toUpperCase()}`}
        </p>
      )}
      {dims && (
        <p className="st-viewer-dims" style={{ color: tooBig ? "#b5342c" : undefined }}>
          {mm(dims.x)} × {mm(dims.y)} × {mm(dims.z)} MM
          {tooBig ? ` · ${labels.over(maxMm / 10)}` : ""}
          <span className="st-viewer-hint">{labels.hint}</span>
        </p>
      )}
    </div>
  );
}

function mm(n: number) {
  return n >= 100 ? n.toFixed(0) : n.toFixed(1);
}

type Three = typeof import("three");

async function loadModel(THREE: Three, url: string, fileName: string): Promise<import("three").Object3D> {
  const ext = fileName.toLowerCase().split(".").pop();
  if (ext === "stl") {
    const { STLLoader } = await import("three/addons/loaders/STLLoader.js");
    const geometry = await new STLLoader().loadAsync(url);
    geometry.computeVertexNormals();
    return new THREE.Mesh(geometry);
  }
  if (ext === "obj") {
    const { OBJLoader } = await import("three/addons/loaders/OBJLoader.js");
    return new OBJLoader().loadAsync(url);
  }
  if (ext === "3mf") {
    const { ThreeMFLoader } = await import("three/addons/loaders/3MFLoader.js");
    return new ThreeMFLoader().loadAsync(url);
  }
  throw new Error("not a 3D file");
}
