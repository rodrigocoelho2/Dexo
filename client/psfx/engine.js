/* Move animations for the battle screen.
   A small stand-in for Pokémon Showdown's BattleScene (pokemon-showdown-client, battle-animations.ts, MIT)
   so its per-move animation scripts (CC0) and effect sprites (fx/, CC0 except icicle/lightning: CC-BY-SA 3.0,
   rocks: GPLv3) run on our own top screen. Showdown places things in a 3D-ish space (x left/right, y up/down,
   z from the player (0) to the opponent (200)); pos() maps that space onto the two sprites we draw.
   Needs jQuery (for its animation queues) and PSAnims (the bundled animation tables). */
(function () {
  'use strict';
  const $ = window.jQuery;
  Object.assign($.easing, {
    ballisticUp: x => -3 * x * x + 4 * x,
    ballisticDown: x => { x = 1 - x; return 1 - (-3 * x * x + 4 * x); },
    quadUp: x => { x = 1 - x; return 1 - x * x; },
    quadDown: x => x * x,
  });

  class FXSprite {
    constructor(scene, img, isFront) {
      this.scene = scene; this.img = img; this.$el = $(img); this.isFrontSprite = isFront;
      this.x = 0; this.y = 0; this.z = isFront ? 200 : 0; this.isMissedPokemon = false;
      const nw = parseFloat(getComputedStyle(img).getPropertyValue('--nw')) || img.naturalWidth || 64;
      const ratio = img.naturalWidth ? img.naturalHeight / img.naturalWidth : 1;
      this.sp = { url: img.currentSrc || img.src, w: nw, h: nw * ratio };
    }
    behind(o) { return this.z + (this.isFrontSprite ? 1 : -1) * o; }
    leftof(o) { return this.x + (this.isFrontSprite ? 1 : -1) * o; }
    behindx(o) { return this.x + (this.isFrontSprite ? 1 : -1) * o; }
    behindy(o) { return this.y + (this.isFrontSprite ? -1 : 1) * o; }
    delay(t) { this.$el.delay(t); return this; }
    prepare() {
      const r = this.img.getBoundingClientRect(), s = this.scene.root.getBoundingClientRect();
      this.rest = { cx: r.left - s.left + r.width / 2, cy: r.top - s.top + r.height / 2, w: r.width };
      this.$el.css({ position: 'relative', left: 0, top: 0, width: r.width + 'px', opacity: 1 });
    }
    anim(end, transition) {
      end = { x: this.x, y: this.y, z: this.z, scale: 1, opacity: 1, time: 500, ...end };
      const sc = this.scene, c = sc.center(end), c0 = sc.center({ x: this.x, y: this.y, z: this.z });
      const props = {
        left: c.cx - c0.cx, top: c.cy - c0.cy,
        width: this.rest.w * (c.scale / c0.scale) * (end.xscale ?? end.scale),
        opacity: end.opacity,
      };
      if (end.time === 0) { this.$el.css(props); return this; }
      const ease = FXScene.easings(transition, c.cy, c0.cy, end.z);
      this.$el.animate({ left: [props.left, ease.left], top: [props.top, ease.top], width: [props.width, ease.width], opacity: [props.opacity, 'linear'] }, end.time);
      return this;
    }
    reset() { this.$el.stop(true, true).css({ position: '', left: '', top: '', width: '', opacity: '' }); }
  }

  class FXScene {
    constructor(root, fxRoot) {
      this.root = root; this.fxRoot = fxRoot; this.timeOffset = 0; this.active = $(); this.busy = false;
      this.$bg = $('<div class="psfx-bg" aria-hidden="true"></div>').prependTo(root);
      this.$fx = $('<div class="psfx-fx" aria-hidden="true"></div>').appendTo(root);
    }
    static easings(transition, top, oldTop, z) {
      const m = { left: 'linear', top: 'linear', width: 'linear' };
      if (transition === 'ballistic') m.top = top < oldTop ? 'ballisticUp' : 'ballisticDown';
      if (transition === 'ballisticUnder') m.top = top < oldTop ? 'ballisticDown' : 'ballisticUp';
      if (transition === 'ballistic2') m.top = top < oldTop ? 'quadUp' : 'quadDown';
      if (transition === 'ballistic2Back' || transition === 'ballistic2back') m.top = z > 0 ? 'quadUp' : 'quadDown';
      if (transition === 'ballistic2Under') m.top = top < oldTop ? 'quadDown' : 'quadUp';
      if (transition === 'swing') m.left = m.top = m.width = 'swing';
      if (transition === 'accel') m.left = m.top = m.width = 'quadDown';
      if (transition === 'decel') m.left = m.top = m.width = 'quadUp';
      return m;
    }
    /** Screen point and scale for a Showdown location, from the two sprite anchors. */
    center(loc) {
      const t = (loc.z || 0) / 200, A = this.a0, B = this.a1;
      let scale = this.s0 + (this.s1 - this.s0) * t;
      if (scale < this.s1 * 0.1) scale = this.s1 * 0.1;
      return { cx: A.cx + (B.cx - A.cx) * t + (loc.x || 0) * scale, cy: A.cy + (B.cy - A.cy) * t - (loc.y || 0) * scale, scale };
    }
    pos(loc, obj) {
      loc = { x: 0, y: 0, z: 0, scale: 1, opacity: 1, ...loc };
      if (!loc.xscale && loc.xscale !== 0) loc.xscale = loc.scale;
      if (!loc.yscale && loc.yscale !== 0) loc.yscale = loc.scale;
      const c = this.center(loc);
      const width = Math.floor(obj.w * c.scale * loc.xscale), height = Math.floor(obj.h * c.scale * loc.yscale);
      const hoffset = Math.floor((obj.h - (obj.y || 0) * 2) * c.scale * loc.yscale);
      const p = { left: Math.floor(c.cx - width / 2), top: Math.floor(c.cy - hoffset / 2), width, height, opacity: loc.opacity };
      if (loc.display) p.display = loc.display;
      return p;
    }
    posT(loc, obj, transition, oldLoc) {
      const p = this.pos(loc, obj), o = oldLoc ? this.pos(oldLoc, obj) : p;
      const m = FXScene.easings(transition, p.top, o.top, loc.z);
      return { left: [p.left, m.left], top: [p.top, m.top], width: [p.width, m.width], height: [p.height, m.width], opacity: [p.opacity, 'linear'] };
    }
    effect(name) {
      if (typeof name !== 'string') return name;
      const e = window.PSAnims.BattleEffects[name];
      if (!e) return { url: '', w: 0, h: 0 };
      if (e.url && !e._resolved) { e.url = this.fxRoot(e.url); e._resolved = true; }
      return e;
    }
    wait(t) { this.timeOffset += t; }
    waitFor($e) { this.active = this.active.add($e); }
    showEffect(effect, start, end, transition, after, css) {
      const e = this.effect(effect);
      let $e = e.rawHTML ? $(e.rawHTML) : $('<img alt="" style="display:block;position:absolute">').attr('src', e.url);
      $e.css({ position: 'absolute', display: 'block' });
      this.$fx.append($e);
      if (css) $e.css(css);
      return this.animateEffect($e, e, start, end, transition, after);
    }
    animateEffect($e, effect, start, end, transition, after) {
      effect = this.effect(effect);
      start = { ...start }; end = { ...end };
      if (!start.time) start.time = 0;
      if (!end.time) end.time = start.time + 500;
      start.time += this.timeOffset; end.time += this.timeOffset;
      if (!end.scale && end.scale !== 0 && start.scale) end.scale = start.scale;
      if (!end.xscale && end.xscale !== 0 && start.xscale) end.xscale = start.xscale;
      if (!end.yscale && end.yscale !== 0 && start.yscale) end.yscale = start.yscale;
      end = { ...start, ...end };
      const sp = this.pos(start, effect), ep = this.posT(end, effect, transition, start);
      if (start.time) { $e.css({ ...sp, opacity: 0 }); $e.delay(start.time).animate({ opacity: sp.opacity }, 1); }
      else $e.css(sp);
      $e.animate(ep, end.time - start.time);
      if (after === 'fade') $e.animate({ opacity: 0 }, 100);
      if (after === 'explode') {
        if (end.scale) end.scale *= 3; if (end.xscale) end.xscale *= 3; if (end.yscale) end.yscale *= 3;
        end.opacity = 0; $e.animate(this.pos(end, effect), 200);
      }
      this.waitFor($e);
      return $e;
    }
    backgroundEffect(bg, duration, opacity = 1, delay = 0) {
      bg = String(bg).replace(/url\(['"]?(?:[^'")]*\/)?fx\/([^'")]+)['"]?\)/g, (m, f) => `url('${this.fxRoot(f)}')`);
      if (/^linear-gradient\([^)]*$/.test(bg)) bg += ')';   // a few scripts leave the bracket open
      const $e = $('<div class="psfx-bgfx"></div>').css({ background: bg, opacity: 0 });
      this.$bg.append($e);
      $e.delay(delay + this.timeOffset).animate({ opacity }, 250).delay(Math.max(0, duration - 250)).animate({ opacity: 0 }, 250);
      this.waitFor($e);
    }
    /** Plays one move. o = { meImg, foeImg, attacker: 'me'|'foe', self: bool } (images may be missing when fainted). */
    async run(moveId, o) {
      const anims = window.PSAnims && window.PSAnims.BattleMoveAnims;
      if (!anims) return;
      const entry = anims[moveId] || anims.tackle;
      const me = o.meImg && o.meImg.isConnected ? new FXSprite(this, o.meImg, false) : null;
      const foe = o.foeImg && o.foeImg.isConnected ? new FXSprite(this, o.foeImg, true) : null;
      const A = o.attacker === 'foe' ? foe : me;
      if (!A) return;
      const D = o.self ? A : (o.attacker === 'foe' ? me : foe) || A;
      [me, foe].forEach(s => s && s.prepare());
      const box = this.root.getBoundingClientRect();
      const fallback = (front) => ({ cx: box.width * (front ? .71 : .25), cy: box.height * (front ? .36 : .66), w: box.width * .2 });
      this.a0 = me ? me.rest : fallback(false); this.a1 = foe ? foe.rest : fallback(true);
      this.s1 = box.width / 256; this.s0 = this.s1 * 1.4;
      this.timeOffset = 0; this.active = $(); this.$fx.empty(); this.$bg.empty();
      try { entry.anim(this, [A, D]); } catch (e) { console.warn('move animation failed', moveId, e); }
      let all = this.active; [me, foe].forEach(s => { if (s) all = all.add(s.$el); });
      await Promise.race([new Promise(r => all.promise().done(r)), new Promise(r => setTimeout(r, 4500))]);
      all.stop(true, true);
      this.$fx.empty(); this.$bg.empty(); [me, foe].forEach(s => s && s.reset());
    }
  }
  window.PSFX = { FXScene };
})();
