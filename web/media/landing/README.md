# Landing media

## Incoming originals

```
web/media/landing/_incoming/
  landing-bg.png      → bg-1.webp
  landing-bg-2.png    → bg-2.webp
  landing-bg-4.png    → bg-4.webp
```

## Served (slideshow)

```
web/media/landing/bg-1.webp, bg-2.webp, bg-4.webp   ← 1920×1080 cover
```

Home rotates these every **10 seconds** with a crossfade (`web/js/home.js`). Uniform dim overlay keeps motto/stats readable. `prefers-reduced-motion` keeps the first slide only.
