/**
 * Orchestration des animations du site.
 * - Lenis : défilement lissé (uniquement souris/trackpad, désactivé si réduction des animations)
 * - GSAP ScrollTrigger : apparitions, hero, arbre de vie dessiné au scroll
 * - Header, menu mobile, barre de réservation
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const isDesktop = () => window.matchMedia('(min-width: 64em)').matches;
/** Avancement du film de l'arbre (0 → 1), mis à jour au scroll */
let filmProgress = 0;

/* ------------------------------------------------------------------ */
/* Défilement lissé (Lenis) — chargé à la demande                      */
/* ------------------------------------------------------------------ */
async function setupSmoothScroll() {
  if (reduceMotion || !finePointer) return;
  const { default: Lenis } = await import('lenis');
  const lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.95, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  document.addEventListener('menu:open', () => lenis.stop());
  document.addEventListener('menu:close', () => lenis.start());
  // Ancres internes
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"], a[href^="/#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const hash = a.getAttribute('href')!.replace(/^\//, '');
      if (hash.length < 2 || (a.getAttribute('href')!.startsWith('/#') && location.pathname !== '/')) return;
      const target = document.querySelector(hash);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target as HTMLElement, { offset: -40, duration: 1.4 });
      history.pushState(null, '', hash);
    });
  });
}

/* ------------------------------------------------------------------ */
/* Header : s'allège au scroll, se cache en descendant, revient en montant */
/* ------------------------------------------------------------------ */
function setupHeader() {
  const header = document.querySelector<HTMLElement>('[data-header]');
  if (!header) return;
  let last = 0;
  const update = () => {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 24);
    if (!document.body.classList.contains('menu-open')) {
      header.classList.toggle('is-hidden', y > last && y > 320);
    }
    last = y;
  };
  update();
  window.addEventListener('scroll', update, { passive: true });
}

/* ------------------------------------------------------------------ */
/* Menu mobile plein écran                                             */
/* ------------------------------------------------------------------ */
function setupMenu() {
  const toggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const menu = document.querySelector<HTMLElement>('[data-menu]');
  if (!toggle || !menu) return;
  const open = () => {
    menu.hidden = false;
    requestAnimationFrame(() => menu.classList.add('is-open'));
    toggle.setAttribute('aria-expanded', 'true');
    document.body.classList.add('menu-open');
    document.dispatchEvent(new CustomEvent('menu:open'));
  };
  const close = () => {
    menu.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
    document.dispatchEvent(new CustomEvent('menu:close'));
    const done = () => { menu.hidden = true; menu.removeEventListener('transitionend', done); };
    reduceMotion ? (menu.hidden = true) : menu.addEventListener('transitionend', done);
    toggle.focus();
  };
  toggle.addEventListener('click', () => (toggle.getAttribute('aria-expanded') === 'true' ? close() : open()));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) close(); });
  menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => close()));
}

/* ------------------------------------------------------------------ */
/* Barre de réservation mobile : se cache devant le pied de page       */
/* ------------------------------------------------------------------ */
function setupBookingBar() {
  const bar = document.querySelector<HTMLElement>('[data-booking-bar]');
  const footer = document.getElementById('pied-de-page');
  if (!bar || !footer) return;
  // Cachée tant que le bouton du haut de page est visible, et devant le pied de page
  let nearFooter = false;
  const update = () => bar.classList.toggle('is-hidden', nearFooter || window.scrollY < window.innerHeight * 0.55);
  ScrollTrigger.create({
    trigger: footer,
    start: 'top 85%',
    onEnter: () => { nearFooter = true; update(); },
    onLeaveBack: () => { nearFooter = false; update(); },
  });
  update();
  window.addEventListener('scroll', update, { passive: true });
}

/* ------------------------------------------------------------------ */
/* Apparitions : [data-reveal] et titres découpés [data-split]         */
/* ------------------------------------------------------------------ */
function splitWords(el: HTMLElement) {
  if (el.dataset.splitDone) return;
  el.dataset.splitDone = 'true';
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const frag = document.createDocumentFragment();
      let text = node.textContent ?? '';
      // Ponctuation collée à un élément précédent (ex. </em>,) : on la rattache au dernier mot
      const prev = node.previousSibling as HTMLElement | null;
      const lead = text.match(/^[,.;:!?»)…]+/);
      if (lead && prev && prev.nodeType === Node.ELEMENT_NODE) {
        const lastWord = prev.querySelectorAll('.word > span');
        if (lastWord.length) { lastWord[lastWord.length - 1].textContent += lead[0]; text = text.slice(lead[0].length); }
      }
      const parts = text.split(/(\s+)/);
      parts.forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
        const w = document.createElement('span'); w.className = 'word';
        const inner = document.createElement('span'); inner.textContent = part;
        w.appendChild(inner); frag.appendChild(w);
      });
      node.parentNode?.replaceChild(frag, node);
    } else if (node.nodeType === Node.ELEMENT_NODE && !(node as HTMLElement).classList.contains('word')) {
      Array.from(node.childNodes).forEach(walk);
    }
  };
  Array.from(el.childNodes).forEach(walk);
}

function setupReveals() {
  const reveals = gsap.utils.toArray<HTMLElement>('[data-reveal]');
  const splits = gsap.utils.toArray<HTMLElement>('[data-split]');
  if (reduceMotion) {
    reveals.forEach((el) => el.classList.add('is-visible'));
    splits.forEach((el) => { el.dataset.splitDone = 'true'; el.classList.add('is-visible'); });
    return;
  }
  splits.forEach(splitWords);
  reveals.forEach((el) => {
    const delay = Number(el.dataset.reveal || 0);
    gsap.fromTo(
      el,
      { autoAlpha: 0, y: 28 },
      {
        autoAlpha: 1, y: 0, duration: 1.1, delay, ease: 'power3.out', overwrite: 'auto',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        onStart: () => el.classList.add('is-visible'),
      },
    );
  });
  splits.forEach((el) => {
    const words = el.querySelectorAll<HTMLElement>('.word > span');
    gsap.fromTo(
      words,
      { yPercent: 110, y: 0 },
      {
        yPercent: 0, y: 0, duration: 1.2, ease: 'power4.out', stagger: 0.045,
        scrollTrigger: { trigger: el, start: 'top 85%', once: true },
        onStart: () => el.classList.add('is-visible'),
      },
    );
  });
}

/* ------------------------------------------------------------------ */
/* Film de l'arbre de vie : une image par position de scroll            */
/* ------------------------------------------------------------------ */
function setupFilm() {
  const el = document.querySelector<HTMLElement>('[data-film]');
  if (!el) return;
  const canvas = el.querySelector<HTMLCanvasElement>('[data-film-canvas]')!;
  const ctx = canvas.getContext('2d', { alpha: false })!;
  const bar = document.querySelector<HTMLElement>('[data-film-bar]');
  const count = Number(el.dataset.count || 0);
  if (!count) return;
  const dir = window.innerWidth < 768 ? el.dataset.mobile : el.dataset.desktop;
  const url = (i: number) => `${dir}/f-${String(i + 1).padStart(4, '0')}.${el.dataset.ext}`;
  const frames: (HTMLImageElement | null)[] = new Array(count).fill(null);
  const state = { frame: 0 };
  let last = -1;

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
    last = -1; draw();
  };
  const nearest = (i: number) => {
    for (let d = 0; d < count; d++) {
      if (frames[i - d]) return frames[i - d]!;
      if (frames[i + d]) return frames[i + d]!;
    }
    return null;
  };
  function draw() {
    const i = Math.round(state.frame);
    const img = nearest(i);
    if (!img) return;
    if (i === last && frames[i]) return;
    last = frames[i] ? i : -1;
    const cw = canvas.width, ch = canvas.height;
    const s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    const w = img.naturalWidth * s, h = img.naturalHeight * s;
    ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
  }
  const load = (i: number) => new Promise<void>((res) => {
    if (frames[i]) return res();
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => { frames[i] = img; if (Math.abs(i - state.frame) < 6) { last = -1; draw(); } res(); };
    img.onerror = () => res();
    img.src = url(i);
  });

  window.addEventListener('resize', resize);
  resize();

  if (reduceMotion) { load(count - 1).then(() => { state.frame = count - 1; draw(); }); return; }

  // Chargement progressif : d'abord une image sur 8, puis on affine.
  const order: number[] = [];
  const seen = new Set<number>();
  [8, 4, 2, 1].forEach((step) => { for (let i = 0; i < count; i += step) if (!seen.has(i)) { seen.add(i); order.push(i); } });
  load(0).then(async () => {
    draw();
    el.classList.add('is-ready');
    let k = 0;
    const worker = async () => { while (k < order.length) await load(order[k++]); };
    await Promise.all(Array.from({ length: 6 }, worker));
  });

  // Chapitres : chaque repère [data-film-mark="0.25"] fixe l'instant du film atteint
  // quand il arrive au centre de l'écran. Entre deux repères, on interpole.
  const main = document.querySelector<HTMLElement>('main')!;
  let marks: { y: number; f: number }[] = [];
  const measure = () => {
    const vh = window.innerHeight;
    const top = main.getBoundingClientRect().top + window.scrollY;
    marks = [{ y: top, f: 0 }];
    document.querySelectorAll<HTMLElement>('[data-film-mark]').forEach((m) => {
      marks.push({ y: m.getBoundingClientRect().top + window.scrollY - vh / 2, f: Number(m.dataset.filmMark) });
    });
    marks.push({ y: top + main.offsetHeight - vh, f: 1 });
    marks.sort((p, q) => p.y - q.y);
  };
  const progressAt = (y: number) => {
    if (y <= marks[0].y) return marks[0].f;
    for (let k = 1; k < marks.length; k++) {
      if (y <= marks[k].y) {
        const p = marks[k - 1], q = marks[k];
        return p.f + ((y - p.y) / Math.max(1, q.y - p.y)) * (q.f - p.f);
      }
    }
    return 1;
  };
  const onScroll = () => {
    const pr = progressAt(window.scrollY);
    gsap.to(state, { frame: pr * (count - 1), duration: 0.7, ease: 'power2.out', overwrite: true, onUpdate: draw });
    if (bar) bar.style.transform = `scaleY(${pr})`;
    filmProgress = pr;
    document.dispatchEvent(new CustomEvent('film:progress', { detail: pr }));
  };
  measure(); onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  ScrollTrigger.addEventListener('refresh', () => { measure(); onScroll(); });

  // Chaque scène se révèle quand elle arrive au centre de l'écran
  gsap.utils.toArray<HTMLElement>('[data-scene]').forEach((scene) => {
    if (scene.dataset.scene === 'branch') return; // animées à part (setupBranches)
    const inner = scene.querySelector('[data-scene-inner]');
    if (!inner) return;
    gsap.fromTo(inner, { autoAlpha: 0, y: 60 }, {
      autoAlpha: 1, y: 0, ease: 'power2.out',
      scrollTrigger: { trigger: scene, start: 'top 80%', end: 'top 35%', scrub: 0.6 },
    });
    if (scene.dataset.scene !== 'stay') {
      gsap.fromTo(inner, { autoAlpha: 1 }, {
        autoAlpha: 0, y: -40, ease: 'power1.in', immediateRender: false,
        scrollTrigger: { trigger: scene, start: 'bottom 55%', end: 'bottom 15%', scrub: 0.6 },
      });
    }
  });
}

/* ------------------------------------------------------------------ */
/* Branches : un trait oblique s'allonge avec le scroll, puis ouvre le  */
/* cadre par son coin ; tout se replie en sens inverse en avançant.     */
/* Aucune étape figée : chaque pixel de scroll fait avancer l'ouverture. */
/* ------------------------------------------------------------------ */
function setupBranches() {
  if (reduceMotion) return;
  gsap.utils.toArray<HTMLElement>('[data-branch]').forEach((scene) => {
    const trace = scene.querySelector<HTMLElement>('[data-branch-line]');
    const dot = scene.querySelector('[data-branch-dot]');
    const frame = scene.querySelector<HTMLElement>('[data-branch-frame]');
    const items = scene.querySelectorAll('[data-branch-item]');
    if (!trace || !dot || !frame) return;
    const fromRight = !!scene.querySelector('.branch--from-right');
    const st = { line: 0, open: 0 };
    const setClip = (el: HTMLElement, v: string) => { el.style.clipPath = v; el.style.setProperty('-webkit-clip-path', v); };
    const draw = () => {
      // Le trait se découvre depuis son point de départ (le conteneur est déjà retourné en miroir côté droit)
      const l = (1 - st.line) * 100;
      setClip(trace, `inset(-6px ${l}% ${l}% -6px)`);
      // Le cadre s'ouvre depuis le coin où arrive le trait (haut-gauche, ou haut-droit en miroir)
      const r = (1 - st.open) * 100;
      setClip(frame, fromRight ? `inset(0% 0% ${r}% ${r}%)` : `inset(0% ${r}% ${r}% 0%)`);
    };
    gsap.set(dot, { scale: 0 });
    gsap.set(items, { autoAlpha: 0, y: 14 });
    draw();
    gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: scene, start: 'top 12%', end: 'bottom 96%', scrub: 0.4 },
    })
      // — ouverture —
      .to(dot, { scale: 1, duration: 0.03 }, 0)
      .to(st, { line: 1, duration: 0.17, onUpdate: draw }, 0.02)                 // le trait s'allonge
      .to(st, { open: 1, duration: 0.19, onUpdate: draw }, 0.19)                 // le cadre s'ouvre depuis le coin
      .to(items, { autoAlpha: 1, y: 0, duration: 0.06, stagger: 0.025 }, 0.33)  // les informations se déploient
      // — fermeture, plus on avance dans l'arbre —
      .to(items, { autoAlpha: 0, y: -10, duration: 0.045, stagger: { each: 0.015, from: 'end' } }, 0.6)
      .to(st, { open: 0, duration: 0.17, onUpdate: draw }, 0.69)
      .to(st, { line: 0, duration: 0.11, onUpdate: draw }, 0.86)
      .to(dot, { scale: 0, duration: 0.02 }, 0.97)
      .to({}, { duration: 0.01 }, 0.99);
  });
}

/* ------------------------------------------------------------------ */
/* Arbre de vie : se dessine avec le scroll                            */
/* ------------------------------------------------------------------ */
function setupTree() {
  const tree = document.querySelector<HTMLElement>('[data-tree]');
  if (!tree) return;
  const roots = tree.querySelectorAll('[data-draw="root"]');
  const trunk = tree.querySelectorAll('[data-draw="trunk"]');
  const branches = tree.querySelectorAll('[data-draw="branch"]');
  const twigs = tree.querySelectorAll('[data-draw="twig"]');
  const tips = tree.querySelectorAll('[data-tip]');
  const leaves = tree.querySelectorAll('[data-leaf]');
  const labels = tree.querySelectorAll('[data-tree-label]');
  const rootLabel = tree.querySelector('[data-tree-rootlabel]');
  const ground = tree.querySelector('[data-tree-ground]');

  if (reduceMotion) {
    gsap.set([roots, trunk, branches, twigs], { strokeDashoffset: 0 });
    gsap.set([tips, leaves, labels, rootLabel], { autoAlpha: 1, y: 0, scale: 1 });
    return;
  }

  const desktop = isDesktop();
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: tree.querySelector('[data-tree-pin]'),
      start: desktop ? 'top top+=40' : 'top 70%',
      end: desktop ? '+=180%' : 'bottom 60%',
      scrub: desktop ? 0.8 : 0.5,
      pin: desktop,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    },
  });

  tl.set(ground, { opacity: 0 })
    .to(ground, { opacity: 1, duration: 0.6 }, 0)
    .to(roots, { strokeDashoffset: 0, duration: 1.2, stagger: 0.08 }, 0)
    .to(rootLabel, { autoAlpha: 1, duration: 0.6 }, 0.9)
    .to(trunk, { strokeDashoffset: 0, duration: 1.4 }, 0.6)
    .to(branches, { strokeDashoffset: 0, duration: 1.6, stagger: 0.18 }, 1.5)
    .to(twigs, { strokeDashoffset: 0, duration: 0.8, stagger: 0.05 }, 2.4)
    .to(tips, { autoAlpha: 1, duration: 0.3, stagger: 0.1 }, 3.0)
    .fromTo(leaves, { autoAlpha: 0, scale: 0, svgOrigin: '0 0' }, { autoAlpha: 1, scale: 1, svgOrigin: '0 0', duration: 1.4, stagger: { each: 0.012, from: 'random' }, ease: 'back.out(2)' }, 2.6)
    .fromTo(labels, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.12, ease: 'power2.out' }, 3.4);

  // Souffle permanent des feuilles une fois l'arbre révélé (hors scrub)
  const breathe = gsap.to(leaves, {
    rotation: 5, svgOrigin: '0 0', duration: 3.2, yoyo: true, repeat: -1, ease: 'sine.inOut',
    stagger: { each: 0.05, from: 'random' }, paused: true,
  });
  ScrollTrigger.create({ trigger: tree, start: 'top 60%', end: 'bottom top', onToggle: (s) => (s.isActive ? breathe.play() : breathe.pause()) });
}

/* ------------------------------------------------------------------ */
/* Parallaxe douce des médias [data-parallax]                           */
/* ------------------------------------------------------------------ */
function setupParallax() {
  if (reduceMotion) return;
  gsap.utils.toArray<HTMLElement>('[data-parallax]').forEach((el) => {
    const amount = Number(el.dataset.parallax || 12);
    gsap.fromTo(el, { yPercent: -amount / 2 }, { yPercent: amount / 2, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
}

/* ------------------------------------------------------------------ */
/* Compteurs horizontaux / séquences épinglées (pages intérieures)      */
/* ------------------------------------------------------------------ */
function setupSteps() {
  if (reduceMotion) return;
  gsap.utils.toArray<HTMLElement>('[data-steps]').forEach((wrap) => {
    const items = wrap.querySelectorAll('[data-step]');
    const line = wrap.querySelector('[data-step-line]');
    if (line) gsap.fromTo(line, { scaleY: 0 }, { scaleY: 1, transformOrigin: 'top', ease: 'none', scrollTrigger: { trigger: wrap, start: 'top 70%', end: 'bottom 60%', scrub: true } });
    items.forEach((it) => {
      gsap.fromTo(it, { autoAlpha: 0.25, x: -8 }, { autoAlpha: 1, x: 0, duration: 0.8, ease: 'power2.out', scrollTrigger: { trigger: it, start: 'top 72%', toggleActions: 'play none none reverse' } });
    });
  });
}

/* ------------------------------------------------------------------ */
/* Accordéons FAQ                                                      */
/* ------------------------------------------------------------------ */
function setupFaq() {
  document.querySelectorAll<HTMLDetailsElement>('details[data-faq]').forEach((d) => {
    d.addEventListener('toggle', () => {
      if (!d.open) return;
      d.parentElement?.querySelectorAll<HTMLDetailsElement>('details[data-faq]').forEach((o) => { if (o !== d) o.open = false; });
    });
  });
}

/* ------------------------------------------------------------------ */
/* Ambiance sonore (optionnelle, jamais automatique)                   */
/* Musique + trois ambiances dont le volume suit le film :             */
/* vent léger loin de l'arbre, feuillage dans l'arbre, gouttes à l'eau */
/* ------------------------------------------------------------------ */
type Layer = { el: HTMLAudioElement; max: number; curve: [number, number][] };
/** Interpolation linéaire par points [avancement du film, volume 0–1] */
const curveAt = (curve: [number, number][], p: number) => {
  if (p <= curve[0][0]) return curve[0][1];
  for (let k = 1; k < curve.length; k++) {
    if (p <= curve[k][0]) {
      const [x0, y0] = curve[k - 1], [x1, y1] = curve[k];
      return y0 + ((p - x0) / (x1 - x0)) * (y1 - y0);
    }
  }
  return curve[curve.length - 1][1];
};
const SOUND_CURVES: Record<string, { max: number; curve: [number, number][] }> = {
  vent: { max: 0.65, curve: [[0, 1], [0.08, 1], [0.19, 0], [1, 0]] },
  feuillage: { max: 0.42, curve: [[0, 0], [0.08, 0], [0.17, 1], [0.58, 1], [0.68, 0.3], [0.8, 0], [1, 0]] },
  gouttes: { max: 0.6, curve: [[0, 0], [0.7, 0], [0.82, 1], [1, 1]] },
};
function setupSound() {
  const btn = document.querySelector<HTMLButtonElement>('[data-sound-toggle]');
  if (!btn) return;
  const src = btn.dataset.src;
  if (!src) { btn.hidden = true; return; }
  let music: HTMLAudioElement | null = null;
  let layers: Layer[] = [];
  let on = false;
  const label = btn.querySelector('[data-sound-label]');
  const setState = (v: boolean) => {
    on = v;
    btn.setAttribute('aria-pressed', String(v));
    if (label) label.textContent = v ? 'Couper le son' : 'Ambiance sonore';
  };
  const make = (url: string) => { const a = new Audio(url); a.loop = true; a.volume = 0; a.preload = 'auto'; return a; };
  const mix = (dur = 0.8) => {
    if (!on) return;
    layers.forEach((l) => gsap.to(l.el, { volume: curveAt(l.curve, filmProgress) * l.max, duration: dur, overwrite: true }));
  };
  const all = () => [music, ...layers.map((l) => l.el)].filter(Boolean) as HTMLAudioElement[];
  const start = async () => {
    if (on) return true;
    if (!music) {
      music = make(src);
      const names = (btn.dataset.layers || '').split(',').filter(Boolean);
      layers = names.map((n) => ({ el: make(`/media/sons/${n}.mp3`), ...SOUND_CURVES[n] }));
    }
    try {
      await music.play();
    } catch {
      return false; // lecture refusée par le navigateur : on réessaiera au prochain geste
    }
    layers.forEach((l) => l.el.play().catch(() => {}));
    setState(true);
    gsap.to(music, { volume: 0.4, duration: 2.5, overwrite: true });
    mix(2.5);
    return true;
  };
  const stop = () => {
    setState(false);
    all().forEach((a) => gsap.to(a, { volume: 0, duration: 1.2, overwrite: true, onComplete: () => a.pause() }));
  };

  // Bouton : allumer / couper. Si la personne coupe, on ne relance plus tout seul.
  btn.addEventListener('click', async () => {
    if (on) {
      stop();
      try { sessionStorage.setItem('son-coupe', '1'); } catch { /* stockage indisponible */ }
    } else {
      try { sessionStorage.removeItem('son-coupe'); } catch { /* stockage indisponible */ }
      await start();
    }
  });

  // Démarrage au premier défilement. Les navigateurs n'autorisent le son qu'après un « vrai » geste
  // (toucher, clic, touche) : la molette seule ne suffit pas toujours, on réessaie donc à chaque geste.
  let off = false;
  try { off = sessionStorage.getItem('son-coupe') === '1'; } catch { /* stockage indisponible */ }
  if (!off) {
    const events = ['scroll', 'wheel', 'touchend', 'pointerdown', 'keydown'] as const;
    const tryStart = async () => {
      if (on) return done();
      if (await start()) done();
    };
    const done = () => events.forEach((e) => window.removeEventListener(e, tryStart, true));
    events.forEach((e) => window.addEventListener(e, tryStart, { capture: true, passive: true }));
  }

  document.addEventListener('film:progress', () => mix());
  let wasOn = false;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      wasOn = on;
      if (on) { setState(false); all().forEach((a) => a.pause()); }
    } else if (wasOn) {
      wasOn = false;
      start();
    }
  });
}

/* ------------------------------------------------------------------ */
function init() {
  setupHeader();
  setupMenu();
  setupSmoothScroll();
  setupFilm();
  setupBranches();
  setupReveals();
  setupTree();
  setupParallax();
  setupSteps();
  setupFaq();
  setupBookingBar();
  setupSound();
  // Les polices peuvent changer la hauteur des titres : on recalcule.
  (document as Document & { fonts?: FontFaceSet }).fonts?.ready.then(() => ScrollTrigger.refresh());
  window.addEventListener('load', () => ScrollTrigger.refresh());
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
