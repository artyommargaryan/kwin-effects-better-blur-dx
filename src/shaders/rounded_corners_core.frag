#version 140

#include "sdf.glsl"

uniform sampler2D texUnit;
uniform float modulation;
uniform vec4 box;
uniform vec4 cornerRadius;
uniform float edgeLine;

in vec2 uv;
in vec2 vertex;

out vec4 fragColor;

void main(void)
{
    fragColor = texture(texUnit, uv);

    float f = sdfRoundedBox(vertex, box.xy, box.zw, cornerRadius);
    float df = fwidth(f);
    float alpha = clamp(0.5 - f / df, 0.0, 1.0);

    // local fork: thin even light line just inside the edge (f is the distance to it, negative inside)
    float line = edgeLine * clamp(1.5 + f, 0.0, 1.0);
    fragColor.rgb = mix(fragColor.rgb, vec3(1.0), line);

    fragColor = vec4(fragColor.rgb, modulation * alpha);
}
