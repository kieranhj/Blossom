/* framework header */
#version 430
layout(location = 0) out vec4 fragColor;
layout(location = 0) uniform vec4 iResolution;
layout(location = 1) uniform int iFrame;




/* tide pool — step 4: partly-emerged anemone + wavy refractive water */

const float pi = acos(-1.);
const float WATER_LEVEL = 0.20;

// === hashes ===
float seed;
float hash() {
	float p = fract((seed++) * .1031);
	p += p * (p + 19.19) * 3.;
	return fract((p + p) * p);
}
vec2 hash2() { return vec2(hash(), hash()); }

float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float h3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }

float vnoise(vec2 p) {
	vec2 i = floor(p), f = fract(p);
	f = f * f * (3. - 2. * f);
	return mix(
		mix(h2(i),               h2(i + vec2(1, 0)), f.x),
		mix(h2(i + vec2(0, 1)),  h2(i + vec2(1, 1)), f.x),
		f.y);
}

float vnoise3(vec3 p) {
	vec3 i = floor(p), f = fract(p);
	f = f * f * (3. - 2. * f);
	return mix(
		mix(mix(h3(i),                  h3(i + vec3(1, 0, 0)), f.x),
		    mix(h3(i + vec3(0, 1, 0)),  h3(i + vec3(1, 1, 0)), f.x), f.y),
		mix(mix(h3(i + vec3(0, 0, 1)),  h3(i + vec3(1, 0, 1)), f.x),
		    mix(h3(i + vec3(0, 1, 1)),  h3(i + vec3(1, 1, 1)), f.x), f.y),
		f.z);
}

float fbm(vec2 p) {
	float v = 0., a = 0.5;
	for (int i = 0; i < 4; ++i) {
		v += a * vnoise(p);
		p = p * 2.13 + 4.7;
		a *= 0.5;
	}
	return v;
}


// === SDF primitives ===
float sdEllipsoid(vec3 p, vec3 r) {
	float k0 = length(p / r);
	float k1 = length(p / (r * r));
	return k0 * (k0 - 1.) / k1;
}

float sdSegment(vec3 p, vec3 a, vec3 b, float ra, float rb) {
	vec3 pa = p - a, ba = b - a;
	float h = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.);
	return length(pa - ba * h) - mix(ra, rb, h);
}

float smin(float a, float b, float k) {
	float h = max(k - abs(a - b), 0.) / k;
	return min(a, b) - h * h * k * 0.25;
}


// === scene elements ===
vec2 minM(vec2 a, vec2 b) { return a.x < b.x ? a : b; }

float hi(float n) { return fract(sin(n * 12.9898) * 43758.5453); }

vec2 anemone(vec3 p) {
	float body = sdEllipsoid(p - vec3(0, 0.18, 0), vec3(0.46, 0.36, 0.46));
	vec3 crown = vec3(0, 0.46, 0);

	const int N = 16;
	float allTent = 1e9;
	for (int i = 0; i < N; ++i) {
		float fi = float(i);
		float a = fi * 2. * pi / float(N) + 0.10 * hi(fi);
		vec3 outDir = vec3(cos(a), 0., sin(a));

		float rise   = 0.22 + 0.08 * hi(fi + 11.);
		float reach  = 0.90 + 0.18 * hi(fi + 37.);
		float thick  = 0.040 + 0.010 * hi(fi + 53.);
		float tipDip = -0.04 - 0.06 * hi(fi + 67.);

		vec3 p0 = crown;
		vec3 p1 = crown + outDir * 0.30 * reach + vec3(0, rise * 0.65, 0);
		vec3 p2 = p1    + outDir * 0.32 * reach + vec3(0, rise * 0.20, 0);
		vec3 p3 = p2    + outDir * 0.32 * reach + vec3(0, tipDip,      0);

		float s1 = sdSegment(p, p0, p1, thick,         thick * 0.85);
		float s2 = sdSegment(p, p1, p2, thick * 0.85,  thick * 0.55);
		float s3 = sdSegment(p, p2, p3, thick * 0.55,  thick * 0.10);

		float t = smin(smin(s1, s2, 0.06), s3, 0.05);
		allTent = smin(allTent, t, 0.04);
	}

	float crownBlend = smin(body, allTent, 0.08);
	return vec2(crownBlend, allTent < body ? 3. : 2.);
}

float substrateHeight(vec2 xz) {
	return 0.18 * fbm(xz * 0.7) + 0.04 * fbm(xz * 4.5) - 0.06;
}

float sdSubstrate(vec3 p) {
	return (p.y - substrateHeight(p.xz)) * 0.55;
}

float sdPebble(vec3 p, vec3 c, float rx, float ry) {
	vec3 q = (p - c) / vec3(rx, ry, rx);
	float bump = (vnoise3((p - c) * 14.) - 0.5) * 0.012;
	return (length(q) - 1.0) * min(rx, ry) * 0.75 + bump;
}

// water surface: sum of sines + fbm bump
float waveHeight(vec2 q) {
	float w = 0.015 * (sin(q.x * 4.5 + q.y * 2.8) + sin(q.x * 3.1 - q.y * 5.2));
	w += 0.010 * fbm(q * 3.5);
	return w;
}

float sdWater(vec3 p) {
	return (p.y - WATER_LEVEL - waveHeight(p.xz)) * 0.55;
}


// scene: returns (distance, materialId)
// 0 = water, 1 = rock, 2 = anemone body, 3 = tentacle, 4 = pebble
vec2 sceneFull(vec3 p) {
	vec2 ground = vec2(sdSubstrate(p), 1.);
	vec2 pebble = vec2(sdPebble(p, vec3(0.75, 0.06, -0.20), 0.18, 0.12), 4.);
	vec2 water  = vec2(sdWater(p), 0.);
	return minM(minM(minM(ground, pebble), anemone(p)), water);
}

// underwater-only scene (no water surface — used after refracting through it)
vec2 sceneNoWater(vec3 p) {
	vec2 ground = vec2(sdSubstrate(p), 1.);
	vec2 pebble = vec2(sdPebble(p, vec3(0.75, 0.06, -0.20), 0.18, 0.12), 4.);
	return minM(minM(ground, pebble), anemone(p));
}


// === raymarch ===
vec2 march(vec3 ro, vec3 rd, bool withWater) {
	float t = 0.;
	vec2 h = vec2(1e9, -1);
	for (int i = 0; i < 96; ++i) {
		vec3 p = ro + rd * t;
		h = withWater ? sceneFull(p) : sceneNoWater(p);
		if (abs(h.x) < 0.001 || t > 30.) break;
		t += h.x;
	}
	return vec2(t, h.y);
}

vec3 calcNormal(vec3 p, bool withWater) {
	vec2 e = vec2(0.001, 0);
	return normalize(vec3(
		(withWater ? sceneFull(p + e.xyy).x : sceneNoWater(p + e.xyy).x) -
		(withWater ? sceneFull(p - e.xyy).x : sceneNoWater(p - e.xyy).x),
		(withWater ? sceneFull(p + e.yxy).x : sceneNoWater(p + e.yxy).x) -
		(withWater ? sceneFull(p - e.yxy).x : sceneNoWater(p - e.yxy).x),
		(withWater ? sceneFull(p + e.yyx).x : sceneNoWater(p + e.yyx).x) -
		(withWater ? sceneFull(p - e.yyx).x : sceneNoWater(p - e.yyx).x)
	));
}


// === shading ===
const vec3 SUN_DIR = normalize(vec3(-0.75, 0.55, -0.2));
const vec3 SUN_COL = vec3(1.05, 0.55, 0.22);

vec3 skyColor(vec3 dir) {
	vec3 horizon = vec3(0.62, 0.32, 0.18);
	vec3 zenith  = vec3(0.06, 0.08, 0.15);
	float t = clamp(dir.y * 1.2 + 0.1, 0., 1.);
	vec3 sky = mix(horizon, zenith, t);
	// sun disc / haze toward SUN_DIR
	float sd = max(0., dot(dir, SUN_DIR));
	sky += SUN_COL * (pow(sd, 32.) * 1.5 + pow(sd, 4.) * 0.18);
	return sky;
}

// soft shadow trace (iq) toward light direction — uses underwater scene to avoid water self-occlusion
float softShadow(vec3 ro, vec3 rd) {
	float res = 1.0;
	float t = 0.02;
	for (int i = 0; i < 28; ++i) {
		float d = sceneNoWater(ro + rd * t).x;
		if (d < 0.0008) return 0.;
		res = min(res, 10. * d / t);
		t += clamp(d, 0.01, 0.25);
		if (t > 4.) break;
	}
	return clamp(res, 0., 1.);
}

// caustics: sample wave-surface Laplacian above this point (peaks = focused light)
float causticAt(vec2 q) {
	float eps = 0.030;
	float h0  = waveHeight(q);
	float hx1 = waveHeight(q + vec2(eps, 0));
	float hx2 = waveHeight(q - vec2(eps, 0));
	float hz1 = waveHeight(q + vec2(0, eps));
	float hz2 = waveHeight(q - vec2(0, eps));
	float lap = (hx1 + hx2 + hz1 + hz2 - 4. * h0) / (eps * eps);
	return max(0., -lap * 0.6);
}

vec3 shadeSurface(vec3 pos, vec3 n, int mat, vec3 viewDir, bool underwater) {
	float ndotl = dot(n, SUN_DIR);
	float diff = max(0., ndotl);
	float skyTerm = 0.5 + 0.5 * dot(n, vec3(0, 1, 0));

	vec3 albedo;
	float specStrength = 0.;
	float specPower = 32.;
	float sssAmt = 0.;

	if (mat == 1) {
		// rock — fbm modulated brown
		float ng = fbm(pos.xz * 6.);
		albedo = mix(vec3(0.20, 0.16, 0.13), vec3(0.36, 0.30, 0.24), ng);
		specStrength = 0.0;
	} else if (mat == 2) {
		// anemone body — soft red with subtle radial lobes
		float phi = atan(pos.x, pos.z);
		float lobes = 0.5 + 0.5 * cos(phi * 10.);
		albedo = mix(vec3(0.42, 0.10, 0.13), vec3(0.62, 0.18, 0.20), lobes);
		specStrength = 0.4;
		sssAmt = 0.20;
	} else if (mat == 3) {
		// tentacle — gradient from base (deep red) to tip (warm orange), with SSS
		// "tipness" = how far from crown along xz, with slight y bias
		float tipness = clamp(length(pos.xz) * 0.95 + (0.46 - pos.y) * 0.6, 0., 1.);
		vec3 tentBase = vec3(0.50, 0.13, 0.16);
		vec3 tentTip  = vec3(1.05, 0.55, 0.32);
		albedo = mix(tentBase, tentTip, smoothstep(0., 1., tipness));
		specStrength = 0.6;
		sssAmt = 0.55;
	} else if (mat == 4) {
		// pebble — darker rock, glossy when wet
		float ng = vnoise3(pos * 6.);
		albedo = mix(vec3(0.18, 0.16, 0.15), vec3(0.30, 0.25, 0.21), ng);
		specStrength = underwater ? 0.5 : 0.25;
		specPower = 48.;
	} else {
		albedo = vec3(0.5);
	}

	float sh = softShadow(pos + n * 0.002, SUN_DIR);

	// caustic boost on underwater surfaces
	float caust = underwater ? causticAt(pos.xz) * sh * (0.4 + 0.6 * diff) : 0.;

	// SSS-fake: light wraps around to back-lit side (tentacles & body)
	float sss = sssAmt * pow(max(0., -ndotl) * 0.5 + 0.5, 2.0) * sh;

	vec3 fillCol = vec3(0.18, 0.28, 0.42);
	vec3 lit = albedo * (SUN_COL * (diff * sh + sss * 0.7) + fillCol * skyTerm * 0.55)
	         + SUN_COL * caust * 0.5;

	if (specStrength > 0.) {
		vec3 h = normalize(SUN_DIR - viewDir);
		float spec = pow(max(0., dot(n, h)), specPower) * sh * specStrength;
		lit += SUN_COL * spec;
	}
	return lit;
}

// apply underwater absorption + scattering toward deep-water teal
vec3 underwaterTint(vec3 c, float dist) {
	vec3 extinction = vec3(1.6, 0.7, 0.55);
	vec3 deepCol = vec3(0.04, 0.10, 0.13);
	float t = 1.0 - exp(-dist * 1.3);
	return mix(c * exp(-extinction * dist), deepCol, t * 0.55);
}


void main() {
	seed = float((iFrame * 73856093 ^ int(gl_FragCoord.x) * 19349663 ^ int(gl_FragCoord.y) * 83492791) % 38069);

	vec2 uv = (gl_FragCoord.xy + hash2() - .5) / iResolution.xy - .5;
	uv.x *= iResolution.z;

	vec3 cam = vec3(0.25, 0.55, -1.9);
	vec3 target = vec3(0.10, 0.32, 0.05);
	vec3 fwd = normalize(target - cam);
	vec3 right = normalize(cross(fwd, vec3(0, 1, 0)));
	vec3 up = cross(right, fwd);
	vec3 baseDir = normalize(fwd + uv.x * right + uv.y * up);

	// depth-of-field: jitter the ray origin within an aperture; rays converge at focal plane
	float focalDist = length(target - cam);
	vec3 focalPt = cam + baseDir * focalDist;
	vec2 ap = hash2() - 0.5;
	ap = (length(ap) > 0.5 ? ap / (2. * length(ap)) : ap) * 0.045;
	vec3 camDof = cam + right * ap.x + up * ap.y;
	vec3 dir = normalize(focalPt - camDof);

	// primary trace (full scene including water)
	vec2 hit = march(camDof, dir, true);
	float t = hit.x;
	int mat = int(hit.y + 0.5);

	vec3 color;

	if (t >= 30.) {
		color = skyColor(dir);
	} else if (mat == 0) {
		// hit water surface — Fresnel mix of sky reflection and refracted underwater scene
		vec3 wpos = camDof + dir * t;
		vec3 wn = calcNormal(wpos, true);
		// surface-normal sanity: ensure pointing up against the camera
		if (dot(wn, -dir) < 0.) wn = -wn;

		float cosi = clamp(-dot(dir, wn), 0., 1.);
		float r0 = 0.02;
		float fres = r0 + (1. - r0) * pow(1. - cosi, 5.);

		// reflection ray: sample sky (sky function already includes sunset glitter via SUN_DIR)
		vec3 rdir = reflect(dir, wn);
		vec3 refl = skyColor(rdir);

		// refraction ray: trace through water to substrate / underwater objects
		vec3 tdir = refract(dir, wn, 1. / 1.33);
		vec3 refr;
		if (length(tdir) < 0.001) {
			refr = refl;
		} else {
			vec3 ro2 = wpos + tdir * 0.002;
			vec2 hit2 = march(ro2, tdir, false);
			if (hit2.x >= 30.) {
				refr = vec3(0.03, 0.08, 0.10);
			} else {
				vec3 p2 = ro2 + tdir * hit2.x;
				vec3 n2 = calcNormal(p2, false);
				int m2 = int(hit2.y + 0.5);
				refr = shadeSurface(p2, n2, m2, tdir, true);
				refr = underwaterTint(refr, hit2.x);
			}
		}

		color = mix(refr, refl, fres);
	} else {
		vec3 pos = camDof + dir * t;
		vec3 n = calcNormal(pos, true);
		bool underwater = pos.y < WATER_LEVEL + waveHeight(pos.xz);
		color = shadeSurface(pos, n, mat, dir, underwater);
	}

	fragColor = vec4(color, 1);
}
