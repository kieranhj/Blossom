/* framework header */
#version 430
layout(location = 0) out vec4 fragColor;
layout(binding = 0) uniform sampler2D accumulatorTex;




void main()
{
	// readback the buffer (rgb = accumulated radiance, a = sample count)
	vec4 tex = texelFetch(accumulatorTex, ivec2(gl_FragCoord.xy), 0);
	vec3 color = tex.rgb / tex.a;

	// canvas resolution from the accumulator texture
	vec2 res = vec2(textureSize(accumulatorTex, 0));

	// soft vignette
	vec2 uv = gl_FragCoord.xy / res - 0.5;
	uv.x *= res.x / res.y;
	color *= 1. - dot(uv, uv) * 0.45;

	// filmic tone map (Reinhard-ish; cheap and stable in 4K)
	color = color / (color + vec3(1.0));

	// slight saturation push for dusk warmth
	float luma = dot(color, vec3(0.299, 0.587, 0.114));
	color = mix(vec3(luma), color, 1.18);

	// gamma
	color = pow(color, vec3(1. / 2.2));

	fragColor = vec4(color, 1);
}
