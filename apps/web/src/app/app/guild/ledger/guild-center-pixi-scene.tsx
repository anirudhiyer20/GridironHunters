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
    const app = new Application();

    async function mount() {
      await app.init({
        antialias: false,
        backgroundAlpha: 0,
        resizeTo: mountTarget,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
      });

      if (!alive) return;
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
      wizard.position.set(548, 248);
      world.addChild(wizard);

      const hat = new Graphics()
        .poly([-72, -16, -38, -74, 36, -78, 92, -44, 68, -10, -26, -6])
        .fill(0x356eb2)
        .poly([-52, -24, -30, -56, 24, -60, 70, -36, 46, -16, -16, -14])
        .fill(0x1f4577);
      wizard.addChild(hat);

      const head = new Graphics().rect(-20, -2, 40, 36).fill(0xf0d3ac);
      wizard.addChild(head);

      const eyes = new Graphics().rect(-10, 14, 6, 6).fill(0x1d1d1d).rect(4, 14, 6, 6).fill(0x1d1d1d);
      wizard.addChild(eyes);

      const robe = new Graphics()
        .poly([-60, 34, 60, 34, 72, 112, -72, 112])
        .fill(0x2f5f9c)
        .poly([-48, 42, 48, 42, 58, 102, -58, 102])
        .fill(0x1e406f);
      wizard.addChild(robe);

      const beard = new Graphics().poly([-30, 34, 30, 34, 18, 86, -18, 86]).fill(0xf5f3ed);
      wizard.addChild(beard);

      const arm = new Graphics().rect(-70, 52, 26, 18).fill(0xf0d3ac);
      wizard.addChild(arm);

      const staff = new Graphics().rect(64, 6, 10, 132).fill(0x4b311d);
      const orb = new Graphics().circle(69, 2, 16).fill(0x6ad8ff).circle(64, -3, 5).fill(0xc5f2ff);
      wizard.addChild(staff, orb);

      function layout() {
        const w = app.renderer.width;
        const h = app.renderer.height;
        const scale = Math.min(w / SCENE_W, h / SCENE_H);
        world.scale.set(scale);
        world.x = Math.round((w - SCENE_W * scale) * 0.5);
        world.y = Math.round((h - SCENE_H * scale) * 0.5);
      }

      layout();
      app.renderer.on("resize", layout);
    }

    mount();

    return () => {
      alive = false;
      app.destroy(true, { children: true });
    };
  }, []);

  return <div className="guild-center-pixi-scene" ref={hostRef} aria-hidden="true" />;
}
