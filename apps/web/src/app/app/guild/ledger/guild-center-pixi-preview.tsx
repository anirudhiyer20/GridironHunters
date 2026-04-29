"use client";

import { useEffect, useRef } from "react";
import { Application, Container, Graphics, Text, TextStyle, Ticker } from "pixi.js";

export function GuildCenterPixiPreview() {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let alive = true;
    const host = hostRef.current;
    if (!host) return;

    const app = new Application();
    const ticker = new Ticker();

    async function mount() {
      const hostNode = hostRef.current;
      if (!hostNode) return;

      await app.init({
        width: 360,
        height: 210,
        antialias: false,
        backgroundAlpha: 0,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
      });

      if (!alive) return;
      hostNode.appendChild(app.canvas);

      const root = new Container();
      app.stage.addChild(root);

      const bg = new Graphics()
        .rect(0, 0, 360, 210)
        .fill(0x20140c)
        .rect(4, 4, 352, 202)
        .fill(0x6f2a1f)
        .rect(12, 18, 336, 70)
        .fill(0x2a1712)
        .rect(12, 88, 336, 64)
        .fill(0x7b4b2a)
        .rect(12, 153, 336, 45)
        .fill(0x55341f);
      root.addChild(bg);

      for (let i = 0; i < 6; i += 1) {
        const bottle = new Graphics()
          .rect(36 + i * 48, 34, 10, 22)
          .fill(i % 2 === 0 ? 0x5bc3ff : 0x7cde6e);
        root.addChild(bottle);
      }

      for (let i = 0; i < 4; i += 1) {
        const stool = new Graphics()
          .rect(42 + i * 78, 162, 28, 24)
          .fill(0x8c5a35)
          .rect(46 + i * 78, 184, 4, 14)
          .fill(0x472b18)
          .rect(62 + i * 78, 184, 4, 14)
          .fill(0x472b18);
        root.addChild(stool);
      }

      const wizard = new Container();
      wizard.x = 182;
      wizard.y = 126;
      root.addChild(wizard);

      const robe = new Graphics().roundRect(-20, -8, 40, 36, 6).fill(0x315f9f);
      const head = new Graphics().rect(-9, -28, 18, 18).fill(0xeecd9f);
      const beard = new Graphics().poly([0, -8, 11, 10, -11, 10]).fill(0xf3f2ef);
      const hat = new Graphics()
        .poly([-21, -28, -6, -44, 13, -46, 23, -30, 5, -25, -10, -25])
        .fill(0x3978c0);
      const staff = new Graphics().rect(19, -18, 4, 44).fill(0x49301d);
      const orb = new Graphics().circle(26, -17, 6).fill(0x6ed6ff);

      wizard.addChild(robe, head, beard, hat, staff, orb);

      const label = new Text({
        text: "PixiJS Scene Preview",
        style: new TextStyle({
          fill: 0xfff3d1,
          fontFamily: "Courier New",
          fontSize: 12,
          fontWeight: "700",
          letterSpacing: 1,
        }),
      });
      label.x = 18;
      label.y = 9;
      root.addChild(label);

      let t = 0;
      ticker.add(() => {
        t += 0.08;
        orb.scale.set(1 + Math.sin(t) * 0.08);
        wizard.y = 126 + Math.sin(t * 0.7) * 1.5;
      });
      ticker.start();
    }

    mount();

    return () => {
      alive = false;
      ticker.stop();
      ticker.destroy();
      app.destroy(true, { children: true });
    };
  }, []);

  return (
    <div className="guild-lib-preview">
      <div className="guild-lib-preview__pixi" ref={hostRef} />
      <div className="guild-lib-preview__nes">
        <span className="nes-badge">
          <span className="is-dark">NES.css</span>
        </span>
        <button type="button" className="nes-btn is-primary">Guild Rules</button>
        <button type="button" className="nes-btn is-success">Game Rules</button>
      </div>
    </div>
  );
}
