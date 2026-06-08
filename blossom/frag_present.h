// Generated with Shader Minifier 1.3.6 (https://github.com/laurentlb/Shader_Minifier/)
#ifndef FRAG_PRESENT_H_
# define FRAG_PRESENT_H_
# define VAR_accumulatorTex "g"
# define VAR_fragColor "v"

const char *present_frag =
 "#version 430\n"
 "layout(location=0) out vec4 v;"
 "layout(binding=0) uniform sampler2D g;"
 "void main()"
 "{"
   "vec4 d=texelFetch(g,ivec2(gl_FragCoord.xy),0);"
   "vec3 l=d.xyz/d.w;"
   "vec2 m=vec2(textureSize(g,0)),b=gl_FragCoord.xy/m-.5;"
   "b.x*=m.x/m.y;"
   "l*=1.-dot(b,b)*.45;"
   "l/=l+vec3(1);"
   "float n=dot(l,vec3(.299,.587,.114));"
   "l=mix(vec3(n),l,1.18);"
   "l=pow(l,vec3(1./2.2));"
   "v=vec4(l,1);"
 "}";

#endif // FRAG_PRESENT_H_
