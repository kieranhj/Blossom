# Tide pool at dusk — design plan

A 4KB executable graphics piece built on Blossom. See [`exegfx-notes.md`](exegfx-notes.md) for general lessons informing this plan.

## Concept

Macro/close-up looking obliquely down into a shallow rockpool just after sunset. The hero is a **sea anemone**, **partly emerged** — water line crossing its body so we see both the dry-glistening crown above and the refracted, caustic-lit base below. Warm low-angle key light from off-screen-left (last sunset glow), cool cyan sky fill from above. Wavy water surface refracts the substrate beneath; sunset reflects off the surface where Fresnel takes over.

The partly-emerged waterline is the iconic compositional hook — it gives us both an above-water and below-water region in one frame.

## Composition

- Anemone occupies ~⅓ frame, slightly off-center (rule of thirds).
- A pebble or small shell nearby for visual weight + scale cue.
- Substrate: noisy rocky heightfield filling the lower frame.
- Water line cuts diagonally across the frame; above the line, soft warm-cool sky gradient + out-of-focus larger rocks.
- DOF focal plane on the anemone's crown; tentacle tips and pebble fall slightly soft, background dissolves.

## Scene SDF breakdown

| element | primitive | notes |
|---|---|---|
| substrate | y = h(x,z) heightfield, h = fbm(x,z)*amp | one noise call, becomes the rock |
| anemone body | stretched ellipsoid centred at (0, base, 0) | scale y > scale xz, slight taper |
| tentacles | capsule, swept along a curved spline | 12–16 copies via `mod`/`rotate` around y axis, each curl angle from `hash(i)` so they're irregular |
| pebble | low-freq noise-displaced sphere | one extra primitive, sells the scale |
| water surface | y = wave(x,z), wave = sum of 2–3 sines + fbm bump on normal | refractive interface, partly emerged below the anemone crown |
| background rocks | 2–3 large smoothunion'd noise spheres at distance | only seen out-of-focus through DOF |

Total: ~6 SDF building blocks, all reusing one `noise()` and one `fbm()`.

## Lighting

- **Key:** warm low-angle directional, colour ≈ `(1.0, 0.55, 0.25)`, grazes the anemone from the left. Long soft shadow across substrate.
- **Sky fill:** cool top-down hemispheric, colour ≈ `(0.3, 0.5, 0.7)`, refracted through the water surface — its colour and direction shift on entry, producing the dusk underwater feel.
- **Caustics:** sample the key light's contribution at each underwater substrate hit by jittering the ray's exit through the wavy surface normal. Single extra trace per shading sample; accumulator handles noise.
- **No emissive subject this time** — sunset *is* the focal light, water surface is the "shimmer hook".

## Path-tracer features that earn their bytes

1. **Refraction through wavy water surface** — for both looking down at the underwater base and for sunset reflection off the surface (Fresnel).
2. **Subsurface-flavoured shading on tentacles** — fake SSS via a wrap-around dot product; light bleeds through, giving the translucent jelly look.
3. **DOF with a small aperture** — focus on anemone crown, tentacle tips and pebble drift soft.
4. **Caustic shimmer** — falls out of refraction once light is sampled correctly.
5. **Volumetric water depth fog** — exponential extinction along the underwater ray segment; distant substrate goes murky teal.

## Material LUT (4 slots, packed in one hex constant)

```
0: water         — IOR 1.33, slight cyan tint, smooth
1: rock          — rough matte, gray-brown, modulated by fbm
2: anemone body  — soft SSS, warm-red base, dim spec
3: tentacle tip  — brighter SSS, slight orange, soft spec
```

Pack roughness/IOR/SSS-strength as nibbles in one or two 32-bit constants (Firefly-style).

## Iteration order

1. **Bare scene at low spp**: substrate plane + anemone ellipsoid + 8 straight tentacles + one warm directional. No water yet. Goal: framing and silhouette work.
2. **Tentacle curl**: replace each capsule with a swept curve; vary curl per-tentacle by `hash(i)`. Goal: organic look.
3. **Substrate noise**: fbm heightfield, displace anemone base to match. Add the pebble.
4. **Water surface**: introduce refractive y=wave plane (partly emerged across anemone body); trace refracted ray under surface. Tune wave amp + IOR until the substrate looks "underwater" but readable.
5. **Lighting pass**: add cool sky fill, Fresnel on water, sunset colour grade. Caustics fall out of refraction.
6. **Surface detail**: SSS on tentacles, rock roughness/voronoi pores, slight pebble glossiness.
7. **Atmosphere**: depth fog underwater, DOF, vignette.
8. **Shrink**: minify, check Crinkler size, pack materials, eliminate dead constants, swap any constant the optimiser can't fold.

## Risks / unknowns

- **Refraction through wavy surface is the expensive part of the byte budget.** Honest two-ray refraction (camera → surface → substrate) costs maybe 30–50 lines; if it blows the budget, fall back to faking it with a screen-space normal-perturb on the substrate ray.
- **Anemone tentacle curl** must look organic with very few parameters; if hash-driven curl looks too random, fall back to a single curl function with a phase offset per tentacle.
- **Colour grading at dusk is finicky.** Budget an evening on the present-shader tonemap alone — dusk lives or dies there.
