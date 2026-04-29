"use client";

import { useEffect, useRef } from "react";
import { Application, Container, Graphics } from "pixi.js";

const SCENE_W = 1200;
const SCENE_H = 760;

export function GuildCenterPixiScene() {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const hostNode = hostRef.current;
    if (!hostNode) return;
    const mountTarget = hostNode;

    let alive = true;
    let initialized = false;
    let layoutFn: (() => void) | null = null;
    const app = new Application();

    async function mount() {
      await app.init({
        antialias: false,
        backgroundAlpha: 0,
        resizeTo: mountTarget,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
      });

      if (!alive) return;
      initialized = true;
      mountTarget.appendChild(app.canvas);

      const world = new Container();
      app.stage.addChild(world);

      const root = new Graphics();
      world.addChild(root);

      root.rect(0, 0, SCENE_W, SCENE_H).fill(0xd3452a);
      root.rect(86, 122, SCENE_W - 172, 374).fill(0x231511);
      root.rect(86, 130, SCENE_W - 172, 10).fill(0xa46b3f);
      root.rect(102, 154, SCENE_W - 204, 188).fill(0x2e1a14);

      root.rect(86, 342, SCENE_W - 172, 16).fill(0x8f5a33);
      root.rect(66, 352, SCENE_W - 132, 34).fill(0x9f6438);
      root.rect(50, 386, SCENE_W - 100, 18).fill(0x6f4125);

      for (let i = 0; i < 4; i += 1) {
        const x = 152 + i * 244;
        root.rect(x, 432, 76, 122).fill(0x7d4b2c);
        root.rect(x + 10, 426, 56, 18).fill(0x955d36);
        root.rect(x + 16, 554, 10, 78).fill(0x5b351f);
        root.rect(x + 50, 554, 10, 78).fill(0x5b351f);
        root.rect(x + 18, 516, 40, 16).fill(0x6f4125);
      }

      root.rect(74, 242, 56, 96).fill(0xd5a067);
      root.rect(78, 234, 48, 14).fill(0x9b6037);
      root.rect(92, 182, 20, 56).fill(0x437d3f);
      root.circle(92, 176, 20).fill(0x5dac56);
      root.circle(108, 166, 16).fill(0x77bf71);
      root.circle(120, 184, 14).fill(0x4f9851);

      for (let i = 0; i < 12; i += 1) {
        const bx = 174 + i * 60;
        const bw = (i % 3 === 0 ? 16 : 12);
        const bh = 36 + (i % 3) * 6;
        const by = 294 - bh;
        const color = i % 4 === 0 ? 0x6cc7ff : i % 4 === 1 ? 0xffcc6c : i % 4 === 2 ? 0x7ae077 : 0xff7f69;
        root.rect(bx, by, bw, bh).fill(color);
      }

      const wizard = new Container();
      wizard.position.set(535, 248);
      world.addChild(wizard);

      const g = new Graphics();
      wizard.addChild(g);

      const unit = 8;
      const px = (x: number, y: number, w: number, h: number, color: number) => {
        g.rect(x * unit, y * unit, w * unit, h * unit).fill(color);
      };

      // palette
      const k = 0x0d0d0d; // outline
      const blueDark = 0x1e3d70;
      const blueMid = 0x2e5f9f;
      const skin = 0xf0d4ac;
      const white = 0xf4f4f2;
      const gray = 0x8f8e8a;
      const black = 0x101010;
      const purple = 0x8e53cf;
      const cyan = 0x58cff7;
      const red = 0xe33d5c;
      const green = 0x49a45f;
      const brown = 0x70411f;
      const football = 0x8a4d24;
      const lace = 0xf5e9d1;

      // Hat silhouette + brim
      px(3, 0, 4, 1, k);
      px(2, 1, 7, 1, k);
      px(1, 2, 10, 1, k);
      px(1, 3, 2, 1, k);
      px(4, 3, 8, 1, k);
      px(0, 4, 12, 1, k);
      px(0, 5, 3, 1, k);
      px(5, 5, 8, 1, k);
      px(1, 6, 12, 1, k);

      px(3, 1, 4, 1, blueMid);
      px(2, 2, 7, 1, blueMid);
      px(5, 3, 5, 1, blueMid);
      px(1, 4, 10, 1, blueDark);
      px(6, 5, 6, 1, blueDark);
      px(2, 6, 10, 1, blueMid);

      // Hat details
      px(6, 0, 1, 1, red);
      px(8, 2, 1, 1, cyan);
      px(9, 5, 2, 1, purple);
      px(11, 4, 1, 2, green);

      // Face + eyes
      px(5, 7, 4, 4, k);
      px(6, 8, 2, 2, skin);
      px(5, 9, 1, 1, skin);
      px(8, 9, 1, 1, skin);
      px(6, 9, 1, 1, k);
      px(7, 9, 1, 1, k);

      // Long beard (tapered)
      px(4, 11, 6, 1, k);
      px(5, 12, 4, 1, white);
      px(4, 13, 6, 1, white);
      px(4, 14, 6, 1, white);
      px(4, 15, 6, 1, white);
      px(5, 16, 4, 1, white);
      px(5, 17, 4, 1, white);
      px(5, 18, 4, 1, white);
      px(6, 19, 2, 1, white);
      px(6, 20, 2, 1, white);
      px(6, 21, 2, 1, white);
      px(6, 22, 2, 1, white);
      px(5, 18, 1, 1, k);
      px(8, 18, 1, 1, k);
      px(6, 22, 2, 1, k);

      // Referee-striped outfit / robe
      px(3, 13, 1, 8, blueMid); // left outer robe
      px(10, 13, 1, 8, blueMid); // right outer robe
      px(4, 13, 6, 9, k); // body outline
      px(5, 14, 4, 7, white); // base tunic
      px(5, 14, 1, 7, black); // stripe 1
      px(7, 14, 1, 7, black); // stripe 2
      px(8, 14, 1, 7, gray); // side shade
      px(5, 21, 4, 1, black); // hem/belt
      px(4, 22, 6, 1, black); // robe bottom

      // Left arm + hand + football
      px(1, 12, 2, 1, blueDark);
      px(0, 13, 2, 2, k);
      px(2, 13, 1, 1, skin);
      px(0, 15, 3, 1, football);
      px(1, 15, 1, 1, lace);

      // Staff + hand
      px(11, 11, 1, 12, brown);
      px(12, 11, 1, 12, k);
      px(10, 14, 1, 2, skin);
      px(10, 13, 1, 1, k);

      function layout() {
        const w = app.renderer.width;
        const h = app.renderer.height;
        const scale = Math.min(w / SCENE_W, h / SCENE_H);
        world.scale.set(scale);
        world.x = Math.round((w - SCENE_W * scale) * 0.5);
        world.y = Math.round((h - SCENE_H * scale) * 0.5);
      }

      layout();
      layoutFn = layout;
      app.renderer.on("resize", layout);
    }

    mount().catch(() => {
      // Keep dev surface resilient: failing to initialize scene should not crash the page.
    });

    return () => {
      alive = false;
      if (!initialized) return;
      if (layoutFn) {
        app.renderer.off("resize", layoutFn);
      }
      app.destroy();
    };
  }, []);

  return <div className="guild-center-pixi-scene" ref={hostRef} aria-hidden="true" />;
}
