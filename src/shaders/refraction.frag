uniform sampler2D texUnit;
uniform mat4 colorMatrix;
uniform float offset;
uniform vec2 halfpixel;

uniform vec2 refractionRectSize;
uniform float refractionEdgeSizePixels;
uniform float refractionCornerRadiusPixels;
uniform float refractionStrength;
uniform float refractionNormalPow;
uniform float refractionRGBFringing;
uniform int refractionTextureRepeatMode;
uniform int refractionMode; // 0: Basic, 1: Concave, 2: Glass (Snell's law)

// Glass: lens profile (mode 2) and lighting (all modes)
uniform float glassIor;                    // index of refraction, ~1.5
uniform vec4 glassCornerMask;              // 1 = rounded, 0 = square; (top-left, top-right, bottom-left, bottom-right)
uniform float glassProfile;                // superellipse exponent of the bezel cross-section
uniform float glassRimStrength;            // 0 disables the rim light
uniform float glassRimWidthPixels;
uniform vec2 glassLightDir;                // unit vector towards the light, y down
uniform float glassRimDirectionality;
uniform float glassRimBackStrength;        // reflected rim on the side facing away from the light
uniform float glassInnerShade;             // 0 disables the inner shading
uniform float glassInnerShadeRadiusPixels;

varying vec2 uv;

vec2 applyTextureRepeatMode(vec2 coord)
{
    if (refractionTextureRepeatMode == 0) {
        return clamp(coord, 0.0, 1.0);
    } else if (refractionTextureRepeatMode == 1) {
        // flip on both axes
        vec2 flip = mod(coord, 2.0);

        vec2 result = coord;
        if (flip.x > 1.0) {
            result.x = 1.0 - mod(coord.x, 1.0);
        } else {
            result.x = mod(coord.x, 1.0);
        }

        if (flip.y > 1.0) {
            result.y = 1.0 - mod(coord.y, 1.0);
        } else {
            result.y = mod(coord.y, 1.0);
        }

        return result;
    }
    return coord;
}

// Concave lens-style radial mapping around the rect center, shaped by distance to edge
vec2 concaveLensCoord(vec2 uv, float strength, float fringing, float dist, vec2 halfRefractionRectSize)
{
    // Edge proximity: 0 in the deep interior, 1 near the rounded rectangle edge
    float edgeProximity = clamp(1.0 + dist / refractionEdgeSizePixels, 0.0, 1.0);
    float shaped = sin(pow(edgeProximity, refractionNormalPow) * 1.57079632679);

    vec2 fromCenter = uv - vec2(0.5);

    float scaleR = 1.0 - shaped * strength * (1.0 + fringing);
    float scaleG = 1.0 - shaped * strength;
    float scaleB = 1.0 - shaped * strength * (1.0 - fringing);

    // Return per-channel lens coords packed in vec2 three times via caller
    // Caller samples each channel separately with the right scale
    // Here we just return the green channel scale as a convenience; R and B will be built in caller
    return vec2(0.5) + fromCenter * scaleG;
}

// source: https://iquilezles.org/articles/distfunctions2d/
// https://www.shadertoy.com/view/4llXD7
float roundedRectangleDist(vec2 p, vec2 b, float r)
{
    vec2 q = abs(p) - b + r;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}

// Outward unit normal of the rounded rectangle outline at p
vec2 roundedRectangleNormal(vec2 p, vec2 b, float r)
{
    const float h = 1.0;
    vec2 gradient = vec2(
        roundedRectangleDist(p + vec2(h, 0.0), b, r) - roundedRectangleDist(p - vec2(h, 0.0), b, r),
        roundedRectangleDist(p + vec2(0.0, h), b, r) - roundedRectangleDist(p - vec2(0.0, h), b, r)
    );
    return length(gradient) > 1e-6 ? normalize(gradient) : vec2(0.0);
}

void main(void)
{
    vec2 offsets[8] = vec2[](
        vec2(-halfpixel.x * 2.0, 0.0),
        vec2(-halfpixel.x, halfpixel.y),
        vec2(0.0, halfpixel.y * 2.0),
        vec2(halfpixel.x, halfpixel.y),
        vec2(halfpixel.x * 2.0, 0.0),
        vec2(halfpixel.x, -halfpixel.y),
        vec2(0.0, -halfpixel.y * 2.0),
        vec2(-halfpixel.x, -halfpixel.y)
    );
    float weights[8] = float[](1.0, 2.0, 1.0, 2.0, 1.0, 2.0, 1.0, 2.0);
    float weightSum = 12.0;
    vec4 sum = vec4(0, 0, 0, 0);

    vec2 halfRefractionRectSize = 0.5 * refractionRectSize;
    vec2 position = uv * refractionRectSize - halfRefractionRectSize.xy;
    float cornerR = min(refractionCornerRadiusPixels, min(halfRefractionRectSize.x, halfRefractionRectSize.y));
    // per-corner: Plasma popups that touch a screen edge or a panel have square corners there
    // (uv.y = 1 is the top edge)
    cornerR *= position.y > 0.0
        ? (position.x < 0.0 ? glassCornerMask.x : glassCornerMask.y)
        : (position.x < 0.0 ? glassCornerMask.z : glassCornerMask.w);
    float distConcave = roundedRectangleDist(position, halfRefractionRectSize, cornerR);
    float distBulge = roundedRectangleDist(position, halfRefractionRectSize, refractionEdgeSizePixels);

    // Different refraction behavior depending on mode
    if (refractionMode == 1) {
        // Concave: lens-like radial mapping with RGB fringing
        float fringing = refractionRGBFringing * 0.3;
        float baseStrength = 0.2 * refractionStrength;

        // Edge proximity shaping
        float edgeProximity = clamp(1.0 + distConcave / refractionEdgeSizePixels, 0.0, 1.0);
        float shaped = sin(pow(edgeProximity, refractionNormalPow) * 1.57079632679);

        vec2 fromCenter = uv - vec2(0.5);
        float scaleR = 1.0 - shaped * baseStrength * (1.0 + fringing);
        float scaleG = 1.0 - shaped * baseStrength;
        float scaleB = 1.0 - shaped * baseStrength * (1.0 - fringing);

        vec2 coordR = applyTextureRepeatMode(vec2(0.5) + fromCenter * scaleR);
        vec2 coordG = applyTextureRepeatMode(vec2(0.5) + fromCenter * scaleG);
        vec2 coordB = applyTextureRepeatMode(vec2(0.5) + fromCenter * scaleB);

        for (int i = 0; i < 8; ++i) {
            vec2 off = offsets[i] * offset;
            sum.r += texture2D(texUnit, coordR + off).r * weights[i];
            sum.g += texture2D(texUnit, coordG + off).g * weights[i];
            sum.b += texture2D(texUnit, coordB + off).b * weights[i];
            sum.a += texture2D(texUnit, coordG + off).a * weights[i];
        }

        sum /= weightSum;
    } else if (refractionMode == 2) {
        // Glass: the rim is a convex bezel with a superellipse cross-section,
        //   h(t) = (1 - (1 - t)^n)^(1/n),  t = 0 at the edge, 1 at the end of the band.
        // A ray looking straight into the screen is refracted at that surface
        // (Snell's law), which shifts where the background is sampled. The flat
        // interior (t >= 1) has zero slope and stays undistorted.
        float band = max(refractionEdgeSizePixels, 1.0);
        float t = clamp(-distConcave / band, 0.0, 1.0);
        float n = max(glassProfile, 1.01);
        float inv = 1.0 - t;
        float inner = max(1.0 - pow(inv, n), 1e-4);
        float slope = min(pow(inv, n - 1.0) * pow(inner, 1.0 / n - 1.0), 8.0);

        vec2 outward = roundedRectangleNormal(position, halfRefractionRectSize, cornerR);
        vec3 surfaceNormal = normalize(vec3(outward * slope, 1.0));
        vec3 refracted = refract(vec3(0.0, 0.0, -1.0), surfaceNormal, 1.0 / max(glassIor, 1.001));

        // glass thickness scales with the band, so the lens keeps its shape at any size
        vec2 shiftPixels = (refracted.xy / max(-refracted.z, 0.15)) * band * refractionStrength * 2.0;
        float maxShift = 0.45 * min(refractionRectSize.x, refractionRectSize.y);
        float shiftLength = length(shiftPixels);
        if (shiftLength > maxShift) {
            shiftPixels *= maxShift / shiftLength;
        }
        vec2 shift = shiftPixels / refractionRectSize;

        float fringing = refractionRGBFringing * 0.3;
        vec2 coordR = applyTextureRepeatMode(uv + shift * (1.0 + fringing));
        vec2 coordG = applyTextureRepeatMode(uv + shift);
        vec2 coordB = applyTextureRepeatMode(uv + shift * (1.0 - fringing));

        for (int i = 0; i < 8; ++i) {
            vec2 off = offsets[i] * offset;
            sum.r += texture2D(texUnit, coordR + off).r * weights[i];
            sum.g += texture2D(texUnit, coordG + off).g * weights[i];
            sum.b += texture2D(texUnit, coordB + off).b * weights[i];
            sum.a += texture2D(texUnit, coordG + off).a * weights[i];
        }

        sum /= weightSum;
    } else {
        // Basic: convex/bulge-like along inward normal from the rounded-rect edge
        float concaveFactor = pow(clamp(1.0 + distBulge / refractionEdgeSizePixels, 0.0, 1.0), refractionNormalPow);

        // Initial 2D normal
        const float h = 1.0;
        vec2 gradient = vec2(
            roundedRectangleDist(position + vec2(h, 0), halfRefractionRectSize, refractionEdgeSizePixels) - roundedRectangleDist(position - vec2(h, 0), halfRefractionRectSize, refractionEdgeSizePixels),
            roundedRectangleDist(position + vec2(0, h), halfRefractionRectSize, refractionEdgeSizePixels) - roundedRectangleDist(position - vec2(0, h), halfRefractionRectSize, refractionEdgeSizePixels)
        );

        vec2 normal = length(gradient) > 1e-6 ? -normalize(gradient) : vec2(0.0, 1.0);

        float finalStrength = 0.2 * concaveFactor * refractionStrength;

        // Different refraction offsets for each color channel
        float fringingFactor = refractionRGBFringing * 0.3;
        vec2 refractOffsetR = normal.xy * (finalStrength * (1.0 + fringingFactor)); // Red bends most
        vec2 refractOffsetG = normal.xy * finalStrength;
        vec2 refractOffsetB = normal.xy * (finalStrength * (1.0 - fringingFactor)); // Blue bends least

        vec2 coordR = applyTextureRepeatMode(uv - refractOffsetR);
        vec2 coordG = applyTextureRepeatMode(uv - refractOffsetG);
        vec2 coordB = applyTextureRepeatMode(uv - refractOffsetB);

        for (int i = 0; i < 8; ++i) {
            vec2 off = offsets[i] * offset;
            sum.r += texture2D(texUnit, coordR + off).r * weights[i];
            sum.g += texture2D(texUnit, coordG + off).g * weights[i];
            sum.b += texture2D(texUnit, coordB + off).b * weights[i];
            sum.a += texture2D(texUnit, coordG + off).a * weights[i];
        }

        sum /= weightSum;
    }

    vec4 color = sum * colorMatrix;

    // Lighting: a thin rim lit from glassLightDir with a weaker reflection on the
    // far side, plus a soft shade just inside the edges the light does not reach.
    if (glassRimStrength > 0.0 || glassInnerShade > 0.0) {
        float depth = -distConcave; // pixels inside the outline
        vec2 outward = roundedRectangleNormal(position, halfRefractionRectSize, cornerR);
        float facing = dot(outward, glassLightDir);
        float lit = pow(max(facing, 0.0), glassRimDirectionality)
                  + glassRimBackStrength * pow(max(-facing, 0.0), glassRimDirectionality);
        lit = clamp(lit, 0.0, 1.0);

        float inside = step(0.0, depth);
        float rimBand = (1.0 - smoothstep(0.0, max(glassRimWidthPixels, 0.001), depth)) * inside;
        float shadeBand = (1.0 - smoothstep(0.0, max(glassInnerShadeRadiusPixels, 0.001), depth)) * inside;

        color.rgb *= 1.0 - shadeBand * glassInnerShade * (1.0 - lit);
        color.rgb += vec3(rimBand * lit * glassRimStrength) * color.a;
    }

    gl_FragColor = color;
}
