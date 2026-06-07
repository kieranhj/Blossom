// Generated with Shader Minifier 1.3.6 (https://github.com/laurentlb/Shader_Minifier/)
#ifndef FRAG_PRESENT_H_
# define FRAG_PRESENT_H_
# define VAR_accumulatorTex "b"
# define VAR_fragColor "v"

const char *present_frag =
 "#version 430\n"
 "layout(location=0) out vec4 v;"
 "layout(binding=0) uniform sampler2D b;"
 "void main()"
 "{"
   "vec4 g=texelFetch(b,ivec2(gl_FragCoord.xy),0);"
   "v=vec4(g.xyz/g.w,1);"
 "}";

#endif // FRAG_PRESENT_H_
