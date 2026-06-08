# Exegfx design notes

Working notes for building a 4KB executable graphics piece on top of Blossom.

## Lessons from "The Firefly Effect" (iapafoto, Revision 2025)

Source: https://github.com/iapafoto/g4k_TheFireflyEffect — built on a Nebula4k/Blossom fork. Useful as a calibration point for what a competitive 4KB piece looks like in 2025.

### Scope
- **Single `draw.frag` of ~700 lines** before minification. That's the realistic ceiling for a competitive 4KB shader after Shader Minifier + Crinkler.
- One scene, three objects (frog, crocodile, firefly), staged near water with a sky background. Naturalistic + cinematic.

### What carries the image
- **A glowing focal element** (the firefly) anchors the composition, justifies volumetric scattering, and lights the rest of the scene. Cheap to model, huge visual return.
- **Smooth-min'd organic anatomy.** Creatures are built from primitive blocks (boxes, ellipsoids, capsules) blended with a `smm` smooth-min operator. No mesh, no per-vertex data — just SDF surgery.
- **Procedural detail via noise families.** Perlin 3D, fbm, voronoi (used for scales/pores), and a "wortex" `wnoise` using magic-angle rotations. Surface micro-detail without textures.

### Rendering techniques worth borrowing
- **Mini path tracer with ~3 bounces.** Gaussian-perturbed reflection rays — enough for plausible GI on close-ups without full unbiased tracing.
- **Per-material reflectivity as a bit-packed hex LUT**: `(0x00731110 >> (4*m)) & 0xF` indexes 8 materials in one 32-bit constant. Saves bytes vs an array.
- **Two directional lights with soft shadows + multi-sample AO + Phong specular + rim light.** Standard kit, but tuned.
- **Random-aperture depth-of-field** gives the macro-photography feel that makes 4KB look "photographed" rather than "rendered".
- **Volumetric halo + distance fog + accumulation vignette.** Cheap atmosphere, big payoff.

### Practical takeaways for our piece
- Budget **~500–700 lines of GLSL** post-minification target.
- Plan around **one focal light source** — preferably warm, preferably central. It earns its bytes in volumetrics, composition, and shading direction.
- **One hero object** is usually right at 4KB; secondary objects only if they share material/SDF code.
- **No textures.** Everything procedural. Plan a noise function early and reuse it across surfaces.
- **Material LUT trick** is reusable: pack roughness/reflectivity/emission selectors into a small constant.
- Don't ship until you've checked Crinkler's compressed size against 4096 bytes, not the uncompressed `.exe` — compressibility matters more than line count.
