// The cartoon 3D stage of the volume story: the member's lifter (cowok /
// cewek / cewek berhijab, in their skin tone) walks up to the animal the
// volume weighs as much as and lifts it overhead. Toon shading with dark
// outlines; everything is built from simple shapes, so there are no model
// files to download. Loaded with import() only when a story is made, so
// three.js stays out of the main bundle.
//
// createStage() makes one WebGL renderer for the 3D part; the 2D story
// (text, list, badge) is composed around it by drawVolumeFrame3d().

import * as THREE from "three";
import {
  COLORS,
  DEFAULT_SKIN_TONE,
  EQUIVALENTS,
  SKIN_TONES,
  STORY_HEIGHT,
  STORY_WIDTH,
  fitText,
  formatKg,
  pickEquivalent,
  roundRect,
  storySummary,
  totalVolume,
  type LifterCharacter,
  type SkinTone,
  type VolumeStoryAssets,
  type VolumeStoryData,
} from "@/lib/volumeStory";

export type AnimalName = (typeof EQUIVALENTS)[number]["name"];
/** Every animal the story can show, for a quick membership check. */
export const ANIMAL_NAMES: Record<string, true> = Object.fromEntries(EQUIVALENTS.map((e) => [e.name, true]));

// ---------------------------------------------------------------- toolkit

const ramp = (() => {
  const t = new THREE.DataTexture(new Uint8Array([90, 90, 90, 255, 170, 170, 170, 255, 255, 255, 255, 255]), 3, 1);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
})();
const mats = new Map<string, THREE.Material>();
const toon = (color: number) => {
  const key = `t${color}`;
  if (!mats.has(key)) mats.set(key, new THREE.MeshToonMaterial({ color, gradientMap: ramp }));
  return mats.get(key)!;
};
const flat = (color: number, opacity = 1) => {
  const key = `f${color}-${opacity}`;
  if (!mats.has(key)) mats.set(key, new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, side: THREE.DoubleSide }));
  return mats.get(key)!;
};
const INK = new THREE.MeshBasicMaterial({ color: 0x0b1020, side: THREE.BackSide });
const WHITE = 0xffffff, BLACK = 0x111111, BLUSH = 0xff8fa3;

const ball = (r: number) => new THREE.SphereGeometry(r, 28, 20);
const cap = (r: number, l: number) => new THREE.CapsuleGeometry(r, Math.max(0.001, l), 6, 16);
const cone = (r: number, h: number) => new THREE.ConeGeometry(r, h, 24);

type V3 = [number, number, number];
/** A shape with a dark outline (a slightly bigger back-facing copy). */
function part(geo: THREE.BufferGeometry, mat: THREE.Material, parent: THREE.Object3D, pos: V3 = [0, 0, 0], ink = true) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...pos);
  m.castShadow = true;
  if (ink) {
    const o = new THREE.Mesh(geo, INK);
    o.scale.setScalar(1.07);
    m.add(o);
  }
  parent.add(m);
  return m;
}
function pivot(parent: THREE.Object3D, pos: V3 = [0, 0, 0]) {
  const g = new THREE.Group();
  g.position.set(...pos);
  parent.add(g);
  return g;
}
/** A big shiny cartoon eye looking along +z of `parent`. */
function eye(parent: THREE.Object3D, pos: V3, r: number) {
  const g = pivot(parent, pos);
  part(ball(r), flat(WHITE), g);
  part(ball(r * 0.6), flat(BLACK), g, [0, -r * 0.05, r * 0.55], false);
  part(ball(r * 0.22), flat(WHITE), g, [r * 0.2, r * 0.22, r * 0.98], false);
  return g;
}
/** Two eyes and blushing cheeks on the front (-x) of a head, which is turned toward the camera. */
function face(head: THREE.Object3D, x: number, y: number, spread: number, r: number, blush = true) {
  for (const s of [-1, 1]) {
    const e = pivot(head, [x, y, spread * s]);
    e.rotation.y = -Math.PI / 2 + 0.25 * s;
    eye(e, [0, 0, 0], r);
    if (blush) part(ball(r * 0.8), flat(BLUSH, 0.55), head, [x + r * 0.3, y - r * 1.5, spread * s * 1.35], false).scale.set(0.3, 0.6, 1);
  }
}
/** Four legs from `top` down to the floor; returns their pivots (front first). */
function legs4(body: THREE.Object3D, mat: THREE.Material, foot: THREE.Material | null, front: number, back: number, z: number, top: number, r: number) {
  const out: THREE.Group[] = [];
  for (const [x, zz] of [[front, z], [front, -z], [back, z], [back, -z]]) {
    const p = pivot(body, [x, top, zz]);
    part(cap(r, top - 2 * r), mat, p, [0, -top / 2, 0]);
    if (foot) part(ball(r * 1.02), foot, p, [0, -top + r * 0.35, 0], false).scale.set(1.05, 0.4, 1.05);
    out.push(p);
  }
  return out;
}

interface Animal {
  root: THREE.Group;
  body: THREE.Group;
  legs: THREE.Group[];
  tail: THREE.Group | null;
  /** Height of the underside the lifter's hands hold. */
  belly: number;
  /** Top of the animal. */
  height: number;
  /** Whole-body wobble instead of walking legs (the whale). */
  flops?: boolean;
  fins?: THREE.Group[];
}

function animalBase() {
  const root = new THREE.Group();
  const body = pivot(root);
  return { root, body };
}
/** Head pivot at `pos`, its front (-x) turned partly to the camera. */
function headAt(body: THREE.Object3D, pos: V3, turn = 0.55) {
  const h = pivot(body, pos);
  h.rotation.y = turn;
  return h;
}

// ---------------------------------------------------------------- animals (all face -x)

const ANIMALS: Record<AnimalName, () => Animal> = {
  kucing() {
    const { root, body } = animalBase();
    const fur = toon(0xf7a64a), cream = toon(0xfff1dc), pink = toon(0xff9fb2);
    part(ball(1), fur, body, [0, 0.52, 0]).scale.set(0.5, 0.3, 0.3);
    part(ball(1), cream, body, [-0.05, 0.44, 0], false).scale.set(0.38, 0.2, 0.26);
    for (const x of [-0.12, 0.05, 0.22]) part(ball(1), toon(0xd9792b), body, [x, 0.8, 0], false).scale.set(0.05, 0.03, 0.22);
    const head = headAt(body, [-0.5, 0.8, 0]);
    part(ball(0.3), fur, head);
    for (const s of [-1, 1]) {
      const ear = part(cone(0.11, 0.2), fur, head, [0.02, 0.27, 0.15 * s]);
      ear.rotation.x = -0.3 * s;
      part(cone(0.06, 0.12), pink, ear, [0.01, -0.01, 0], false);
    }
    face(head, -0.24, 0.06, 0.11, 0.075);
    part(ball(0.04), pink, head, [-0.3, -0.04, 0], false);
    for (const s of [-1, 1]) for (const k of [-1, 0, 1]) {
      const w = part(new THREE.CylinderGeometry(0.004, 0.004, 0.26, 4), flat(0x334155), head, [-0.28, -0.06 + k * 0.03, 0.12 * s], false);
      w.rotation.set(Math.PI / 2 + k * 0.15 * s, 0, 0);
      w.position.z += 0.1 * s;
    }
    const legs = legs4(body, fur, cream, -0.28, 0.28, 0.14, 0.42, 0.07);
    const tail = pivot(body, [0.48, 0.6, 0]);
    part(cap(0.05, 0.4), fur, tail, [0.08, 0.2, 0]).rotation.z = -0.4;
    tail.rotation.z = -0.3;
    return { root, body, legs, tail, belly: 0.3, height: 1.15 };
  },
  anjing() {
    const { root, body } = animalBase();
    const fur = toon(0xc8874b), light = toon(0xf5deb3), dark = toon(0x6b3f1d);
    part(ball(1), fur, body, [0, 0.66, 0]).scale.set(0.62, 0.36, 0.34);
    part(ball(1), light, body, [-0.1, 0.56, 0], false).scale.set(0.45, 0.24, 0.3);
    const head = headAt(body, [-0.62, 0.98, 0]);
    part(ball(0.34), fur, head);
    part(ball(1), light, head, [-0.3, -0.1, 0]).scale.set(0.2, 0.15, 0.18);
    part(ball(0.06), flat(BLACK), head, [-0.48, -0.04, 0], false);
    part(cap(0.05, 0.08), toon(0xff6b81), head, [-0.4, -0.25, 0.04], false).rotation.x = 0.3;
    for (const s of [-1, 1]) {
      const ear = pivot(head, [0.02, 0.18, 0.28 * s]);
      part(ball(1), dark, ear, [0, -0.15, 0]).scale.set(0.12, 0.22, 0.06);
      ear.rotation.x = 0.25 * s;
    }
    face(head, -0.27, 0.1, 0.13, 0.08);
    const legs = legs4(body, fur, light, -0.36, 0.36, 0.17, 0.55, 0.09);
    const tail = pivot(body, [0.6, 0.8, 0]);
    part(cap(0.05, 0.3), fur, tail, [0.05, 0.16, 0]).rotation.z = -0.5;
    return { root, body, legs, tail, belly: 0.36, height: 1.35 };
  },
  panda() {
    const { root, body } = animalBase();
    const white = toon(0xf8fafc), black = toon(0x1f2937);
    part(ball(1), white, body, [0, 0.8, 0]).scale.set(0.72, 0.55, 0.52);
    part(ball(1), black, body, [-0.25, 0.9, 0], false).scale.set(0.25, 0.5, 0.54);
    const head = headAt(body, [-0.72, 1.18, 0], 0.7);
    part(ball(0.45), white, head);
    for (const s of [-1, 1]) {
      part(ball(0.15), black, head, [0.0, 0.38, 0.28 * s]);
      part(ball(1), black, head, [-0.38, 0.06, 0.16 * s], false).scale.set(0.08, 0.13, 0.1);
    }
    face(head, -0.4, 0.07, 0.16, 0.08, true);
    part(ball(0.07), flat(BLACK), head, [-0.44, -0.12, 0], false);
    const legs = legs4(body, black, null, -0.4, 0.4, 0.26, 0.55, 0.16);
    const tail = pivot(body, [0.72, 0.95, 0]);
    part(ball(0.1), white, tail);
    return { root, body, legs, tail, belly: 0.3, height: 1.7 };
  },
  singa() {
    const { root, body } = animalBase();
    const fur = toon(0xf2b94b), mane = toon(0xb45309), light = toon(0xfde6b0);
    part(ball(1), fur, body, [0, 0.82, 0]).scale.set(0.8, 0.42, 0.42);
    const head = headAt(body, [-0.82, 1.18, 0], 0.6);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      part(ball(0.2), mane, head, [0.08, Math.sin(a) * 0.36, Math.cos(a) * 0.36]);
    }
    part(ball(0.36), fur, head);
    part(ball(1), light, head, [-0.27, -0.1, 0], false).scale.set(0.14, 0.14, 0.2);
    part(ball(0.06), toon(0x7c2d12), head, [-0.36, -0.02, 0], false);
    for (const s of [-1, 1]) part(ball(0.09), fur, head, [0.05, 0.3, 0.22 * s]);
    face(head, -0.3, 0.1, 0.13, 0.08);
    const legs = legs4(body, fur, light, -0.5, 0.5, 0.2, 0.6, 0.11);
    const tail = pivot(body, [0.8, 0.95, 0]);
    part(cap(0.035, 0.55), fur, tail, [0.2, 0.15, 0]).rotation.z = -1.0;
    part(ball(0.09), mane, tail, [0.45, 0.32, 0]);
    return { root, body, legs, tail, belly: 0.4, height: 1.65 };
  },
  beruang() {
    const { root, body } = animalBase();
    const fur = toon(0x8b5a2b), light = toon(0xd6a77a);
    part(ball(1), fur, body, [0, 0.9, 0]).scale.set(0.85, 0.6, 0.55);
    const head = headAt(body, [-0.85, 1.25, 0], 0.6);
    part(ball(0.45), fur, head);
    part(ball(1), light, head, [-0.35, -0.12, 0]).scale.set(0.18, 0.15, 0.2);
    part(ball(0.07), flat(BLACK), head, [-0.52, -0.06, 0], false);
    for (const s of [-1, 1]) {
      part(ball(0.13), fur, head, [0.02, 0.38, 0.27 * s]);
      part(ball(0.07), light, head, [-0.06, 0.38, 0.27 * s], false);
    }
    face(head, -0.38, 0.12, 0.15, 0.085);
    const legs = legs4(body, fur, null, -0.5, 0.5, 0.28, 0.55, 0.17);
    const tail = pivot(body, [0.85, 1.0, 0]);
    part(ball(0.1), fur, tail);
    return { root, body, legs, tail, belly: 0.32, height: 1.8 };
  },
  kuda() {
    const { root, body } = animalBase();
    const coat = toon(0xa0522d), mane = toon(0x3b1f0f), hoof = toon(0x374151), light = toon(0xe7c4a0);
    part(ball(1), coat, body, [0, 1.15, 0]).scale.set(0.85, 0.38, 0.36);
    const neck = pivot(body, [-0.68, 1.3, 0]);
    neck.rotation.z = -0.55;
    part(cap(0.2, 0.5), coat, neck, [0, 0.3, 0]);
    for (let i = 0; i < 5; i++) part(ball(0.09), mane, neck, [0.17, 0.05 + i * 0.13, 0]);
    const head = headAt(body, [-0.98, 1.85, 0], 0.55);
    part(ball(1), coat, head, [-0.12, 0, 0]).scale.set(0.38, 0.22, 0.2);
    part(ball(1), light, head, [-0.38, -0.05, 0], false).scale.set(0.13, 0.15, 0.17);
    for (const s of [-1, 1]) {
      part(cone(0.06, 0.18), coat, head, [0.1, 0.25, 0.1 * s]);
      part(ball(0.025), flat(BLACK), head, [-0.47, -0.04, 0.07 * s], false);
    }
    face(head, -0.15, 0.08, 0.11, 0.065, false);
    const legs = legs4(body, coat, hoof, -0.55, 0.55, 0.17, 0.95, 0.09);
    const tail = pivot(body, [0.85, 1.25, 0]);
    part(cap(0.08, 0.45), mane, tail, [0.15, -0.2, 0]).rotation.z = 0.6;
    return { root, body, legs, tail, belly: 0.8, height: 2.1 };
  },
  sapi() {
    const { root, body } = animalBase();
    const white = toon(0xfafafa), black = toon(0x1f2937), pink = toon(0xffb3c1), horn = toon(0xfff1c7);
    part(ball(1), white, body, [0, 1.0, 0]).scale.set(0.95, 0.48, 0.46);
    for (const [x, y, z, s] of [[-0.3, 1.25, 0.32, 0.22], [0.35, 1.05, 0.4, 0.18], [0.1, 1.4, -0.2, 0.2], [0.5, 1.3, 0.15, 0.15]] as const) {
      part(ball(1), black, body, [x, y, z], false).scale.set(s, s * 0.7, s * 0.5);
    }
    part(ball(0.13), pink, body, [0.1, 0.55, 0], false).scale.set(1.2, 0.6, 1);
    const head = headAt(body, [-0.95, 1.25, 0], 0.6);
    part(ball(0.34), white, head);
    part(ball(1), pink, head, [-0.3, -0.12, 0]).scale.set(0.16, 0.16, 0.24);
    for (const s of [-1, 1]) {
      part(ball(0.035), flat(0x9f1239), head, [-0.44, -0.1, 0.08 * s], false);
      const hn = part(cone(0.05, 0.18), horn, head, [0.05, 0.32, 0.18 * s]);
      hn.rotation.x = -0.5 * s;
      part(ball(1), white, head, [0.1, 0.12, 0.34 * s]).scale.set(0.08, 0.06, 0.14);
    }
    face(head, -0.28, 0.1, 0.13, 0.075, false);
    const legs = legs4(body, white, black, -0.6, 0.6, 0.24, 0.75, 0.11);
    const tail = pivot(body, [0.95, 1.15, 0]);
    part(cap(0.03, 0.4), white, tail, [0.08, -0.2, 0]).rotation.z = 0.3;
    part(ball(0.07), black, tail, [0.14, -0.43, 0], false);
    return { root, body, legs, tail, belly: 0.55, height: 1.7 };
  },
  jerapah() {
    const { root, body } = animalBase();
    const coat = toon(0xf6c453), spot = toon(0xb45309), hoof = toon(0x78350f);
    part(ball(1), coat, body, [0, 1.25, 0]).scale.set(0.7, 0.38, 0.36);
    for (const [x, y, z] of [[-0.3, 1.42, 0.28], [0.15, 1.25, 0.35], [0.4, 1.45, 0.18], [-0.05, 1.55, -0.2], [0.3, 1.1, -0.3]] as const) {
      part(ball(1), spot, body, [x, y, z], false).scale.set(0.12, 0.1, 0.06);
    }
    const neck = pivot(body, [-0.5, 1.45, 0]);
    neck.rotation.z = 0.25;
    part(cap(0.14, 1.0), coat, neck, [0, 0.55, 0]);
    for (const k of [0.3, 0.65, 0.95]) part(ball(1), spot, neck, [-0.02, k, 0.12], false).scale.set(0.07, 0.08, 0.05);
    const head = headAt(body, [-0.85, 2.6, 0], 0.55);
    part(ball(1), coat, head, [-0.08, 0, 0]).scale.set(0.3, 0.2, 0.2);
    for (const s of [-1, 1]) {
      part(cap(0.025, 0.12), coat, head, [0.05, 0.25, 0.08 * s]);
      part(ball(0.045), spot, head, [0.05, 0.34, 0.08 * s]);
      part(ball(1), coat, head, [0.1, 0.12, 0.2 * s]).scale.set(0.05, 0.04, 0.1);
    }
    face(head, -0.15, 0.06, 0.1, 0.06, false);
    const legs = legs4(body, coat, hoof, -0.45, 0.45, 0.17, 1.05, 0.08);
    const tail = pivot(body, [0.7, 1.35, 0]);
    part(cap(0.025, 0.4), coat, tail, [0.06, -0.2, 0]).rotation.z = 0.3;
    part(ball(0.06), spot, tail, [0.12, -0.42, 0], false);
    return { root, body, legs, tail, belly: 0.9, height: 2.9 };
  },
  "kuda nil"() {
    const { root, body } = animalBase();
    const skin = toon(0x9d8bc4), light = toon(0xc9b8e8), pink = toon(0xffb3c1);
    part(ball(1), skin, body, [0, 0.82, 0]).scale.set(1.05, 0.6, 0.6);
    part(ball(1), light, body, [0, 0.55, 0], false).scale.set(0.85, 0.38, 0.5);
    const head = headAt(body, [-1.0, 0.95, 0], 0.6);
    part(ball(1), skin, head, [0, 0.12, 0]).scale.set(0.42, 0.36, 0.42);
    part(ball(1), light, head, [-0.3, -0.12, 0]).scale.set(0.3, 0.24, 0.42);
    for (const s of [-1, 1]) {
      part(ball(0.04), flat(0x4c1d95), head, [-0.5, 0.0, 0.12 * s], false);
      part(ball(0.08), skin, head, [0.05, 0.47, 0.22 * s]);
      part(cone(0.03, 0.08), flat(WHITE), head, [-0.5, -0.3, 0.16 * s], false).rotation.z = Math.PI;
    }
    face(head, -0.12, 0.32, 0.16, 0.08, false);
    part(ball(0.06), pink, head, [-0.45, -0.17, 0.3], false).scale.set(1, 0.6, 0.4);
    const legs = legs4(body, skin, null, -0.6, 0.6, 0.32, 0.45, 0.17);
    const tail = pivot(body, [1.03, 0.9, 0]);
    part(cap(0.03, 0.14), skin, tail, [0.04, -0.08, 0]).rotation.z = 0.4;
    return { root, body, legs, tail, belly: 0.25, height: 1.55 };
  },
  badak() {
    const { root, body } = animalBase();
    const grey = toon(0x9fb0c8), belly = toon(0xc9d4e3), horn = toon(0xfff1c7), pink = toon(0xffb3c1), hoof = toon(0x6b7a90);
    part(ball(1), grey, body, [0, 0.98, 0]).scale.set(1.0, 0.68, 0.64);
    part(ball(1), belly, body, [0, 0.78, 0], false).scale.set(0.82, 0.45, 0.55);
    const head = headAt(body, [-0.95, 1.05, 0], 0.5);
    head.rotation.z = 0.15;
    part(ball(1), grey, head, [-0.18, 0, 0]).scale.set(0.46, 0.42, 0.42);
    part(ball(1), grey, head, [-0.55, -0.12, 0]).scale.set(0.28, 0.25, 0.3);
    for (const s of [-1, 1]) part(ball(0.035), flat(BLACK), head, [-0.8, -0.1, 0.1 * s], false);
    part(cone(0.11, 0.38), horn, head, [-0.66, 0.18, 0]).rotation.z = 0.5;
    part(cone(0.07, 0.18), horn, head, [-0.4, 0.33, 0]).rotation.z = 0.3;
    for (const s of [-1, 1]) {
      const ear = pivot(head, [0.02, 0.38, 0.2 * s]);
      part(ball(0.1), grey, ear).scale.set(0.6, 1.2, 0.5);
      part(ball(0.06), pink, ear, [0, 0.02, 0.03 * s], false).scale.set(0.5, 1.1, 0.3);
      ear.rotation.x = -0.35 * s;
    }
    face(head, -0.4, 0.12, 0.2, 0.085);
    const legs = legs4(body, grey, hoof, -0.55, 0.55, 0.32, 0.75, 0.19);
    const tail = pivot(body, [0.98, 1.12, 0]);
    part(cap(0.03, 0.22), grey, tail, [0, -0.14, 0]);
    part(ball(0.06), hoof, tail, [0, -0.3, 0], false);
    return { root, body, legs, tail, belly: 0.3, height: 1.7 };
  },
  gajah() {
    const { root, body } = animalBase();
    const grey = toon(0x8fa3bf), light = toon(0xb8c7dc), pink = toon(0xffb3c1), tusk = toon(0xfffbeb);
    part(ball(1), grey, body, [0, 1.15, 0]).scale.set(1.15, 0.8, 0.75);
    const head = headAt(body, [-1.05, 1.45, 0], 0.55);
    part(ball(0.55), grey, head);
    for (const s of [-1, 1]) {
      const ear = pivot(head, [0.15, 0.05, 0.45 * s]);
      part(ball(1), grey, ear).scale.set(0.38, 0.48, 0.08);
      part(ball(1), pink, ear, [0, 0, 0.04 * s], false).scale.set(0.28, 0.36, 0.05);
      ear.rotation.y = 0.5 * s;
      part(cone(0.06, 0.35), tusk, head, [-0.42, -0.28, 0.18 * s]).rotation.z = Math.PI / 2 + 0.6;
    }
    // trunk: a few segments curling down and out
    let seg: THREE.Object3D = pivot(head, [-0.48, -0.05, 0]);
    for (let i = 0; i < 5; i++) {
      const r = 0.14 - i * 0.018;
      part(cap(r, 0.14), grey, seg, [0, -0.12, 0]);
      const next = pivot(seg, [0, -0.24, 0]);
      next.rotation.z = -0.22;
      seg = next;
    }
    face(head, -0.4, 0.18, 0.2, 0.09);
    const legs = legs4(body, grey, light, -0.65, 0.65, 0.4, 0.75, 0.24);
    const tail = pivot(body, [1.15, 1.2, 0]);
    part(cap(0.035, 0.35), grey, tail, [0.05, -0.18, 0]).rotation.z = 0.3;
    return { root, body, legs, tail, belly: 0.4, height: 2.2 };
  },
  "paus biru"() {
    const { root, body } = animalBase();
    const blue = toon(0x3b82f6), belly = toon(0xbfdbfe), dark = toon(0x1d4ed8);
    part(ball(1), blue, body, [0, 0.55, 0]).scale.set(1.5, 0.52, 0.55);
    part(ball(1), belly, body, [-0.2, 0.36, 0], false).scale.set(1.25, 0.3, 0.45);
    for (let i = 0; i < 5; i++) part(cap(0.012, 0.9), flat(0x1e40af), body, [-0.4 + i * 0.03, 0.2 + i * 0.05, 0.38], false).rotation.z = Math.PI / 2;
    const head = headAt(body, [-0.9, 0.62, 0], 0.5);
    face(head, -0.45, 0.12, 0.22, 0.09);
    part(new THREE.TorusGeometry(0.22, 0.02, 8, 24, Math.PI * 0.8), flat(0x1e3a8a), head, [-0.55, -0.08, 0], false).rotation.set(0, Math.PI / 2, Math.PI + 0.3);
    const fins: THREE.Group[] = [];
    for (const s of [-1, 1]) {
      const f = pivot(body, [-0.4, 0.3, 0.5 * s]);
      part(ball(1), dark, f, [0.1, -0.05, 0.12 * s]).scale.set(0.22, 0.05, 0.14);
      fins.push(f);
    }
    const tail = pivot(body, [1.45, 0.62, 0]);
    part(cap(0.12, 0.3), blue, tail, [0.15, 0, 0]).rotation.z = Math.PI / 2;
    for (const s of [-1, 1]) part(ball(1), dark, tail, [0.42, 0.06, 0.28 * s]).scale.set(0.16, 0.05, 0.3);
    // spout
    for (const [x, y, r] of [[-0.6, 1.25, 0.07], [-0.7, 1.4, 0.06], [-0.5, 1.42, 0.06]] as const) part(ball(r), flat(0x93c5fd, 0.85), body, [x, y, 0], false);
    return { root, body, legs: [], tail, belly: 0.06, height: 1.5, flops: true, fins };
  },
};

// ---------------------------------------------------------------- lifter

interface Lifter {
  root: THREE.Group;
  hips: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  headTop: THREE.Group;
  arms: Record<1 | -1, { sh: THREE.Group; el: THREE.Group; hand: THREE.Object3D }>;
  legs: Record<1 | -1, { th: THREE.Group; kn: THREE.Group; ft: THREE.Group }>;
}

function buildLifter(character: LifterCharacter, tone: SkinTone): Lifter {
  const skinHex = Number.parseInt((SKIN_TONES.find((s) => s.id === tone) ?? SKIN_TONES[1]).color.slice(1), 16);
  const SKIN = toon(skinHex), SHIRT = toon(0x2f6bff), PANTS = toon(0x1e293b), SHOE = toon(0xffffff), SOLE = toon(0xf97316);
  const HAIR = toon(0x3b2416), HIJAB = toon(0x93c5fd);
  const covered = character === "hijab";
  const root = new THREE.Group();
  root.scale.setScalar(1.3);
  const hips = pivot(root, [0, 0.95, 0]);
  part(ball(0.2), PANTS, hips, [0, 0.03, 0]).scale.set(1.15, 0.75, 0.85);
  const torso = pivot(hips, [0, 0.08, 0]);
  part(ball(0.26), SHIRT, torso, [0, 0.26, 0]).scale.set(1.0, 1.08, 0.8);
  part(new THREE.TorusGeometry(0.06, 0.018, 12, 32), flat(WHITE), torso, [0, 0.3, 0.205], false);
  const head = pivot(torso, [0, 0.5, 0]);
  const headTop = pivot(head, [0, 0.6, 0]);
  if (covered) {
    // Hijab: a soft cover around the head, the face showing through, draped to the shoulders.
    part(ball(0.335), HIJAB, head, [0, 0.29, -0.05]);
    part(ball(0.29), SKIN, head, [0, 0.25, 0.05], false).scale.set(0.92, 1, 1);
    part(new THREE.CylinderGeometry(0.2, 0.33, 0.24, 28), HIJAB, head, [0, 0.02, -0.01]);
  } else {
    part(ball(0.3), SKIN, head, [0, 0.27, 0]);
    part(new THREE.SphereGeometry(0.315, 28, 20, 0, Math.PI * 2, 0, Math.PI * 0.42), HAIR, head, [0, 0.29, -0.02]);
    if (character === "wanita") {
      const tail = pivot(head, [0, 0.42, -0.3]);
      part(ball(0.13), toon(0xf472b6), tail, [0, 0.02, 0.02], false);
      part(ball(1), HAIR, tail, [0, -0.2, -0.06]).scale.set(0.12, 0.24, 0.12);
      for (const s of [-1, 1]) part(ball(1), HAIR, head, [0.12 * s, 0.47, 0.18]).scale.set(0.13, 0.08, 0.08);
    } else {
      part(ball(0.09), HAIR, head, [0.06, 0.58, 0.05]).scale.set(1.3, 0.8, 1);
    }
    for (const s of [-1, 1]) part(ball(0.06), SKIN, head, [0.29 * s, 0.27, 0]).scale.set(0.5, 1, 0.8);
  }
  const fz = covered ? 0.3 : 0.25;
  for (const s of [-1, 1]) {
    eye(head, [0.11 * s, 0.29, fz], 0.07);
    if (character === "wanita" || covered) part(cap(0.008, 0.05), flat(BLACK), head, [0.16 * s, 0.35, fz + 0.04], false).rotation.z = 0.9 * s;
    part(cap(0.014, 0.07), flat(BLACK), head, [0.11 * s, 0.4, fz + 0.02], false).rotation.z = Math.PI / 2 + 0.25 * s;
    part(ball(0.045), flat(BLUSH, 0.55), head, [0.19 * s, 0.2, fz - 0.015], false).scale.set(1, 0.6, 0.3);
  }
  const grin = part(new THREE.SphereGeometry(0.075, 24, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), flat(0x7f1d1d), head, [0, 0.16, fz + 0.02], false);
  grin.scale.set(1.3, 0.9, 0.5);
  const arms = {} as Lifter["arms"], legs = {} as Lifter["legs"];
  for (const s of [-1, 1] as const) {
    const sh = pivot(torso, [0.25 * s, 0.4, 0]);
    part(ball(0.1), SHIRT, sh);
    part(cap(0.07, 0.2), covered ? SHIRT : SKIN, sh, [0, -0.17, 0]);
    const el = pivot(sh, [0, -0.34, 0]);
    part(cap(0.065, 0.2), covered ? SHIRT : SKIN, el, [0, -0.14, 0]);
    const hand = part(ball(0.1), SKIN, el, [0, -0.32, 0]);
    arms[s] = { sh, el, hand };
    const th = pivot(hips, [0.12 * s, -0.04, 0]);
    const long = character !== "pria";
    part(cap(0.095, 0.22), long ? PANTS : SKIN, th, [0, -0.22, 0]);
    part(cap(0.12, 0.04), PANTS, th, [0, -0.06, 0]);
    const kn = pivot(th, [0, -0.45, 0]);
    part(cap(0.085, 0.24), long ? PANTS : SKIN, kn, [0, -0.2, 0]);
    const ft = pivot(kn, [0, -0.45, 0]);
    part(ball(0.12), SHOE, ft, [0, 0.02, 0.06]).scale.set(1, 0.7, 1.5);
    part(cap(0.03, 0.18), SOLE, ft, [0, -0.04, 0.06], false).rotation.x = Math.PI / 2;
    legs[s] = { th, kn, ft };
  }
  return { root, hips, torso, head, headTop, arms, legs };
}

interface Pose { thigh: number; knee: number; lean: number; armX: number; armZ: number; elZ: number; spread?: number; look?: number; swing?: number }
const STAND: Pose = { thigh: 0, knee: 0, lean: 0, armX: 0, armZ: 0.12, elZ: 0.1 };
const SQUAT: Pose = { thigh: -1.25, knee: 2.0, lean: 0.45, armX: -0.9, armZ: 0.55, elZ: 0.4, look: -0.2 };
const PRESS: Pose = { thigh: 0, knee: 0, lean: -0.05, armX: 0, armZ: 2.55, elZ: 0.45, spread: 0.14, look: -0.35 };
const lerp = (a: number, b: number, x: number) => a + (b - a) * x;
function mix(a: Pose, b: Pose, x: number): Pose {
  const o = {} as Record<string, number>;
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof Pose>) o[k] = lerp(a[k] ?? 0, b[k] ?? 0, x);
  return o as unknown as Pose;
}
function setPose(l: Lifter, p: Pose) {
  const swing = p.swing ?? 0;
  for (const s of [-1, 1] as const) {
    const L = l.legs[s], A = l.arms[s];
    const thX = p.thigh + swing * s;
    L.th.rotation.set(thX, 0, (p.spread ?? 0) * s);
    L.kn.rotation.x = p.knee + Math.max(0, swing * s * 0.8);
    L.ft.rotation.x = -(thX + L.kn.rotation.x);
    A.sh.rotation.set(p.armX - swing * s * 0.9, 0, p.armZ * s);
    A.el.rotation.set(0, 0, p.elZ * s);
  }
  l.torso.rotation.x = p.lean;
  l.head.rotation.x = p.look ?? 0;
  // Keep the feet on the floor.
  l.hips.position.y = 0.45 * Math.cos(p.thigh) + 0.45 * Math.cos(p.thigh + p.knee) + 0.06 - (p.spread ?? 0) * 0.05;
  l.hips.position.z = -(0.45 * Math.sin(-p.thigh) - 0.45 * Math.sin(p.thigh + p.knee)) * 0.5;
}

// ---------------------------------------------------------------- stage

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const backOut = (x: number) => 1 + 2.9 * Math.pow(x - 1, 3) + 1.9 * Math.pow(x - 1, 2);

export interface Stage {
  /** Draws the 3D scene at `t` and returns its canvas (transparent background). */
  render(opts: { t: number; animal: AnimalName; character: LifterCharacter; skinTone: SkinTone }): HTMLCanvasElement;
  /** Where the lifted animal is on that canvas, after render(). */
  animalPoint(): { x: number; y: number };
  dispose(): void;
}

/** Throws when WebGL isn't available; callers fall back to the 2D story. */
export function createStage(width: number, height: number, opts: { shadows?: boolean } = {}): Stage {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(width, height, false);
  renderer.shadowMap.enabled = opts.shadows !== false;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 100);
  scene.add(new THREE.HemisphereLight(0xdbe8ff, 0x1a2340, 1.5));
  const sun = new THREE.DirectionalLight(0xffffff, 2.4);
  sun.position.set(3, 7, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 7, bottom: -2, near: 1, far: 20 });
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0x60a5fa, 1.6);
  rim.position.set(-4, 3, -4);
  scene.add(rim);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(4.2, 64), new THREE.ShadowMaterial({ opacity: 0.38 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.001;
  floor.receiveShadow = true;
  scene.add(floor);
  const plat = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.75, 0.12, 64), new THREE.MeshToonMaterial({ color: 0x1e3a8a, gradientMap: ramp }));
  plat.position.y = -0.06;
  plat.receiveShadow = true;
  scene.add(plat);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.7, 0.035, 8, 96), new THREE.MeshBasicMaterial({ color: 0x60a5fa }));
  ring.rotation.x = Math.PI / 2;
  scene.add(ring);

  let lifterKey = "";
  let lifter: Lifter | null = null;
  let animalKey = "";
  let animal: Animal | null = null;
  const point = new THREE.Vector3();
  const v = new THREE.Vector3();
  const hands = new THREE.Vector3();
  const handsL = new THREE.Vector3();
  const top = new THREE.Vector3();

  return {
    render({ t, animal: name, character, skinTone }) {
      const lk = `${character}-${skinTone}`;
      if (lk !== lifterKey) {
        if (lifter) scene.remove(lifter.root);
        lifter = buildLifter(character, skinTone);
        scene.add(lifter.root);
        lifterKey = lk;
      }
      if (name !== animalKey) {
        if (animal) scene.remove(animal.root);
        animal = (ANIMALS[name] ?? ANIMALS.badak)();
        scene.add(animal.root);
        animalKey = name;
      }
      const L = lifter!, A = animal!;

      // The animal comes in from the right (3.6–5.0 s).
      const rin = easeOut(seg(t, 3.6, 5.0));
      const moving = t < 5.0;
      let ax = lerp(4.8, 0.15, rin), ay = 0, az = -0.55, arot = 0;
      A.legs.forEach((leg, i) => (leg.rotation.z = moving ? Math.sin(t * 16) * 0.45 * (i % 3 === 0 ? 1 : -1) : 0));
      A.body.position.y = moving ? Math.abs(Math.sin(t * 16)) * 0.06 : 0;
      if (A.flops) A.body.rotation.z = moving ? Math.sin(t * 10) * 0.08 : 0;
      A.fins?.forEach((f, i) => (f.rotation.x = Math.sin(t * 8 + i) * 0.4));
      if (A.tail) A.tail.rotation.y = Math.sin(t * 7) * 0.3;

      // The lifter walks in from the left (4.0–5.2 s), squats, presses.
      const lin = easeInOut(seg(t, 4.0, 5.2));
      L.root.position.set(lerp(-3.6, 0, lin), 0, 0.55);
      L.root.rotation.y = t < 5.2 ? 0.9 * (1 - seg(t, 4.9, 5.2)) : 0;
      let pose: Pose = { ...STAND, swing: t > 4.0 && t < 5.2 ? Math.sin(t * 14) * 0.55 : 0 };
      if (t >= 5.3) pose = mix(STAND, SQUAT, easeInOut(seg(t, 5.3, 5.75)));
      if (t >= 5.95) pose = mix(SQUAT, PRESS, easeOut(seg(t, 5.95, 6.7)));
      setPose(L, pose);
      L.root.updateMatrixWorld(true);

      // Up it goes with the press, resting on the hands (above the head).
      const up = easeOut(seg(t, 5.95, 6.7));
      L.arms[1].hand.getWorldPosition(hands);
      L.arms[-1].hand.getWorldPosition(handsL);
      L.headTop.getWorldPosition(top);
      const rest = Math.max((hands.y + handsL.y) / 2 + 0.08, top.y + 0.05);
      if (t >= 5.95) {
        ax = lerp(0.15, L.root.position.x, up);
        az = lerp(-0.55, 0.45, up);
        ay = lerp(0, rest - A.belly, up) + Math.sin(up * Math.PI) * 0.12;
        arot = Math.sin(up * Math.PI) * 0.25;
        A.legs.forEach((leg, i) => (leg.rotation.z = Math.sin(t * 9 + i) * 0.35 * up));
      }
      const bounce = t > 6.7 ? Math.sin((t - 6.7) * 5) * 0.035 * (1 - seg(t, 6.7, 10) * 0.6) : 0;
      A.root.position.set(ax, ay + bounce, az);
      A.root.rotation.set(0, 0, arot);
      if (t > 6.7) L.hips.position.y += bounce * 0.5;

      // Camera: a slow orbit, framing the whole stack once it's up.
      const stack = rest + (A.height - A.belly);
      const ang = lerp(0.42, -0.32, easeInOut(seg(t, 3.4, 9.5)));
      const frameUp = easeInOut(seg(t, 5.5, 6.6));
      const dist = lerp(7.4, Math.max(8.4, (stack + 1.0) / 0.55), frameUp);
      const lookY = lerp(0.95, stack / 2 + 0.15, frameUp);
      camera.position.set(Math.sin(ang) * dist, lookY + 0.7, Math.cos(ang) * dist);
      camera.lookAt(0, lookY, 0);
      renderer.render(scene, camera);

      point.set(A.root.position.x, A.root.position.y + (A.belly + A.height) / 2, A.root.position.z);
      return canvas;
    },
    animalPoint() {
      v.copy(point).project(camera);
      return { x: (v.x * 0.5 + 0.5) * width, y: (-v.y * 0.5 + 0.5) * height };
    },
    dispose() {
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}

// ---------------------------------------------------------------- the story frame

export const STORY3D_DURATION = 9;
const GY = 880;
const GH = 860;

/** The stage the story frame draws into. */
export const createStoryStage = () => createStage(STORY_WIDTH, GH);

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, a: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const rr = i % 2 ? r * 0.38 : r;
    const an = (Math.PI / 4) * i;
    ctx.lineTo(Math.cos(an) * rr, Math.sin(an) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * The whole 9:16 story at `t` seconds: header, count-up, what was lifted,
 * then the 3D lift, the ×N badge, "Setara mengangkat …" and the logo.
 * The last frame is the shared image.
 */
export function drawVolumeFrame3d(ctx: CanvasRenderingContext2D, assets: VolumeStoryAssets, stage: Stage, data: VolumeStoryData, t: number) {
  const W = STORY_WIDTH, H = STORY_HEIGHT, cx = W / 2;
  const volume = totalVolume(data.sets);
  const eq = pickEquivalent(volume);
  const D = (w: number, s: number) => `${w} ${s}px ${assets.displayFont}`;
  const B = (w: number, s: number) => `${w} ${s}px ${assets.bodyFont}`;
  const text = (s: string, x: number, y: number, font: string, color: string, align: CanvasTextAlign = "center", spacing = 0) => {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.letterSpacing = `${spacing}px`;
    ctx.fillText(s, x, y);
    ctx.letterSpacing = "0px";
  };
  ctx.textBaseline = "alphabetic";

  // Background: deep Olympus blue, a glow behind the stage, soft rays.
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#0a1230");
  g.addColorStop(0.45, "#11245f");
  g.addColorStop(1, "#070b18");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(cx, GY + GH * 0.55, 40, cx, GY + GH * 0.55, 620);
  glow.addColorStop(0, "rgba(96,165,250,0.35)");
  glow.addColorStop(1, "rgba(96,165,250,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, GY - 200, W, GH + 400);
  ctx.save();
  ctx.globalAlpha = 0.07 + 0.03 * Math.sin(t * 2);
  ctx.translate(cx, GY - 120);
  ctx.fillStyle = "#93c5fd";
  for (let i = 0; i < 9; i++) {
    ctx.rotate(Math.PI / 9);
    ctx.fillRect(-8, 0, 16, 1400);
  }
  ctx.restore();

  // Header
  const a0 = easeOut(seg(t, 0, 0.5));
  const chip = data.prLabel ? "🏆 REKOR PRIBADI BARU" : "🎉 GERAKAN SELESAI";
  ctx.globalAlpha = a0;
  ctx.font = D(600, 34);
  ctx.letterSpacing = "3px";
  const chipW = ctx.measureText(chip).width + 90;
  ctx.letterSpacing = "0px";
  roundRect(ctx, cx - chipW / 2, 92 - 30 * (1 - a0), chipW, 70, 35);
  ctx.fillStyle = data.prLabel ? "rgba(250,204,21,0.18)" : "rgba(96,165,250,0.18)";
  ctx.fill();
  ctx.strokeStyle = data.prLabel ? "rgba(253,224,71,0.6)" : "rgba(147,197,253,0.55)";
  ctx.lineWidth = 2;
  ctx.stroke();
  text(chip, cx, 140 - 30 * (1 - a0), D(600, 34), data.prLabel ? "#fde68a" : "#bfdbfe", "center", 3);
  const name = data.memberName.toUpperCase();
  ctx.letterSpacing = "6px";
  const nameSize = fitText(ctx, name, (s) => D(600, s), 46, W - 160);
  ctx.letterSpacing = "0px";
  text(name, cx, 230, D(600, nameSize), "rgba(255,255,255,0.85)", "center", 6);
  const sub = data.date
    ? `${data.exerciseName} · ${new Date(data.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}`.toUpperCase()
    : data.exerciseName.toUpperCase();
  ctx.letterSpacing = "4px";
  const subSize = fitText(ctx, sub, (s) => B(500, s), 28, W - 160);
  ctx.letterSpacing = "0px";
  text(sub, cx, 278, B(500, subSize), "rgba(191,219,254,0.7)", "center", 4);
  ctx.globalAlpha = 1;

  // Total volume counting up
  const k = easeOut(seg(t, 0.5, 2.2));
  ctx.globalAlpha = seg(t, 0.4, 0.8);
  const num = k >= 1 ? formatKg(volume) : Math.round(volume * k).toLocaleString("id-ID");
  const numSize = fitText(ctx, formatKg(volume), (s) => D(700, s), 200, W - 330);
  ctx.font = D(700, numSize);
  const nw = ctx.measureText(num).width;
  ctx.font = D(600, 76);
  const kw = ctx.measureText(" KG").width;
  const x0 = cx - (nw + kw) / 2;
  const pop = t > 2.2 ? 1 + 0.06 * Math.sin(seg(t, 2.2, 2.6) * Math.PI) : 1;
  ctx.save();
  ctx.translate(cx, 470);
  ctx.scale(pop, pop);
  ctx.translate(-cx, -470);
  ctx.shadowColor = "rgba(96,165,250,0.6)";
  ctx.shadowBlur = 40;
  text(num, x0, 500, D(700, numSize), COLORS.white, "left");
  ctx.shadowBlur = 0;
  text(" KG", x0 + nw, 500, D(600, 76), "#93c5fd", "left");
  ctx.restore();
  text("TOTAL VOLUME", cx, 560, D(600, 34), "#93c5fd", "center", 8);
  text(storySummary(data.sets), cx, 612, B(400, 30), "rgba(226,232,240,0.75)");
  ctx.globalAlpha = 1;

  // What was lifted: movements (a whole day) or sets, heaviest first.
  let rowsTop = 660;
  if (data.prLabel) {
    const p = backOut(seg(t, 2.0, 2.4));
    if (p > 0) {
      ctx.save();
      ctx.globalAlpha = clamp01(p);
      ctx.translate(cx, 676);
      ctx.scale(p, p);
      ctx.font = D(700, 32);
      const pw = ctx.measureText(data.prLabel).width + 60;
      ctx.fillStyle = "#facc15";
      roundRect(ctx, -pw / 2, -26, pw, 52, 26);
      ctx.fill();
      ctx.textBaseline = "middle";
      text(data.prLabel, 0, 2, D(700, 32), "#1e1b4b");
      ctx.textBaseline = "alphabetic";
      ctx.restore();
    }
    rowsTop = 722;
  }
  const lines = data.lines?.length ? [...data.lines].sort((x, y) => y.kg - x.kg) : null;
  const max = data.prLabel ? 3 : 4;
  const rows: [string, string][] = lines
    ? lines.slice(0, max).map((l) => [l.name, `${formatKg(l.kg)} kg`])
    : data.sets.slice(0, max).map((s, i) => [`Set ${i + 1}`, `${formatKg(s.weight)} kg × ${s.reps}`]);
  rows.forEach(([label, value], i) => {
    const p = easeOut(seg(t, 2.3 + i * 0.28, 2.75 + i * 0.28));
    if (p <= 0) return;
    const y = rowsTop + i * 62;
    const dx = (1 - p) * -120;
    ctx.globalAlpha = p;
    roundRect(ctx, 120 + dx, y, 840, 52, 14);
    ctx.fillStyle = "rgba(15,23,42,0.55)";
    ctx.fill();
    ctx.fillStyle = "#60a5fa";
    roundRect(ctx, 120 + dx, y, 8, 52, 4);
    ctx.fill();
    ctx.font = B(500, 30);
    ctx.fillStyle = "#e2e8f0";
    ctx.textAlign = "left";
    ctx.fillText(label, 150 + dx, y + 36, 560);
    text(value, 935 + dx, y + 36, D(700, 32), COLORS.white, "right", 1);
  });
  const count = lines ? lines.length : data.sets.length;
  if (count > rows.length) {
    ctx.globalAlpha = easeOut(seg(t, 2.3 + rows.length * 0.28, 2.75 + rows.length * 0.28));
    text(`+${count - rows.length} ${lines ? "gerakan" : "set"} lagi`, cx, rowsTop + rows.length * 62 + 34, B(500, 26), "rgba(191,219,254,0.7)");
  }
  ctx.globalAlpha = 1;

  // The 3D lift, with a soft bottom edge.
  const art = stage.render({ t, animal: eq.name, character: data.character ?? "pria", skinTone: data.skinTone ?? DEFAULT_SKIN_TONE });
  ctx.globalAlpha = easeOut(seg(t, 3.2, 3.8));
  ctx.drawImage(art, 0, GY);
  ctx.globalAlpha = 1;
  const fade = ctx.createLinearGradient(0, GY + GH - 110, 0, GY + GH);
  fade.addColorStop(0, "rgba(8,13,30,0)");
  fade.addColorStop(1, "rgba(8,13,30,1)");
  ctx.fillStyle = fade;
  ctx.fillRect(0, GY + GH - 110, W, 110);
  ctx.fillStyle = "rgb(8,13,30)";
  ctx.fillRect(0, GY + GH, W, H - GY - GH);

  // Sparkles and the ×N badge once it's up.
  if (t > 6.6) {
    const pt = stage.animalPoint();
    const sx = pt.x, sy = GY + pt.y;
    const sp = seg(t, 6.6, 7.6);
    ctx.fillStyle = "#fde68a";
    for (let i = 0; i < 12; i++) {
      const an = (Math.PI * 2 * i) / 12 + t * 0.6;
      const rr = 150 + 230 * easeOut(sp) + 18 * Math.sin(t * 3 + i);
      const tw = 0.5 + 0.5 * Math.sin(t * 6 + i * 1.7);
      ctx.globalAlpha = clamp01(1.4 - sp * 0.6) * tw;
      star(ctx, sx + Math.cos(an) * rr, Math.max(GY + 40, sy + Math.sin(an) * rr * 0.55), 10 + 10 * tw, t + i);
    }
    ctx.globalAlpha = 1;
    const b = backOut(seg(t, 6.9, 7.4));
    if (b > 0) {
      ctx.save();
      ctx.translate(Math.min(W - 110, sx + 310), Math.max(GY + 110, sy - 40));
      ctx.scale(b, b);
      ctx.rotate(-0.12);
      ctx.beginPath();
      ctx.arc(0, 0, 92, 0, Math.PI * 2);
      ctx.fillStyle = "#facc15";
      ctx.shadowColor = "rgba(250,204,21,0.6)";
      ctx.shadowBlur = 40;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.lineWidth = 6;
      ctx.strokeStyle = "#fff7d6";
      ctx.stroke();
      const label = `×${formatKg(eq.factor)}`;
      const ls = fitText(ctx, label, (s) => D(700, s), 68, 150);
      text(label, 0, ls * 0.33, D(700, ls), "#1e1b4b");
      ctx.restore();
    }
  }

  // "Setara mengangkat 1,3× badak"
  const ca = easeOut(seg(t, 7.3, 7.9));
  if (ca > 0) {
    ctx.globalAlpha = ca;
    const y = 1800 + (1 - ca) * 30;
    const lead = "Setara mengangkat ";
    const what = `${formatKg(eq.factor)}× ${eq.name}`;
    ctx.font = B(500, 46);
    const w1 = ctx.measureText(lead).width;
    ctx.font = B(800, 50);
    const w2 = ctx.measureText(what).width;
    const sx = cx - (w1 + w2) / 2;
    text(lead, sx, y, B(500, 46), "#e2e8f0", "left");
    text(what, sx + w1, y, B(800, 50), "#facc15", "left");
    ctx.globalAlpha = 1;
  }
  const la = easeOut(seg(t, 8.2, 8.8));
  if (la > 0) {
    ctx.globalAlpha = la;
    if (assets.logo) {
      const lh = 54;
      const lw = (assets.logo.naturalWidth / assets.logo.naturalHeight) * lh;
      ctx.drawImage(assets.logo, cx - lw / 2, 1838, lw, lh);
    } else text("OLYMPUS", cx, 1885, D(700, 44), COLORS.white, "center", 8);
    ctx.globalAlpha = 1;
  }
}

/** The lifter holding the animal overhead, for the still share card (transparent). */
export function renderLiftStill(opts: { animal: AnimalName; character: LifterCharacter; skinTone: SkinTone; size: number }): HTMLCanvasElement {
  const stage = createStage(opts.size, opts.size);
  try {
    const art = stage.render({ t: 8.5, animal: opts.animal, character: opts.character, skinTone: opts.skinTone });
    const out = document.createElement("canvas");
    out.width = out.height = opts.size;
    out.getContext("2d")!.drawImage(art, 0, 0);
    return out;
  } finally {
    stage.dispose();
  }
}
