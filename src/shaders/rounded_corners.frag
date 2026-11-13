#extension GL_OES_standard_derivatives : enable

#include "sdf.glsl"

uniform sampler2D texUnit;
uniform float modulation;
uniform vec4 box;
uniform vec4 cornerRadius;
uniform float edgeLine;

varying vec2 uv;
varying vec2 vertex;

void main(void)
{
    vec4 fragColor = texture2D(texUnit, uv);

    float f = sdfRoundedBox(vertex, box.xy, box.zw, cornerRadius);
    float df = fwidth(f);
    float alpha = clamp(0.5 - f / df, 0.0, 1.0);

    // local fork: thin even light line just inside the edge (f is the distance to it, negative inside)
    float line = edgeLine * clamp(1.5 + f, 0.0, 1.0);
    fragColor.rgb = mix(fragColor.rgb, vec3(1.0), line);

    gl_FragColor = vec4(fragColor.rgb, modulation * alpha);
}
