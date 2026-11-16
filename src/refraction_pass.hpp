#pragma once

#include <opengl/glshader.h>

#include <QMatrix4x4>
#include <QVector2D>
#include <QVector4D>
#include <QtNumeric>

#include <memory>

namespace BBDX {

class RefractionPass {
private:
    std::unique_ptr<KWin::GLShader> m_shader;
    // contrast parameters
    int m_mvpMatrixLocation;
    int m_colorMatrixLocation;
    int m_offsetLocation;
    int m_halfpixelLocation;
    // refraction parameters
    int m_refractionRectSizeLocation;
    int m_refractionEdgeSizePixelsLocation;
    int m_refractionCornerRadiusPixelsLocation;
    int m_refractionStrengthLocation;
    int m_refractionNormalPowLocation;
    int m_refractionRGBFringingLocation;
    int m_refractionTextureRepeatModeLocation;
    int m_refractionModeLocation;

    // glass parameters (lens mode + lighting)
    int m_glassCornerMaskLocation;
    int m_glassLumaCeilingLocation;
    int m_glassShadeLocation;
    int m_glassIorLocation;
    int m_glassProfileLocation;
    int m_glassRimStrengthLocation;
    int m_glassRimWidthPixelsLocation;
    int m_glassLightDirLocation;
    int m_glassRimDirectionalityLocation;
    int m_glassRimBackStrengthLocation;
    int m_glassInnerShadeLocation;
    int m_glassInnerShadeRadiusPixelsLocation;

    bool m_enabled{false};

    // user settings
    qreal m_normalPow{};
    qreal m_strength{};
    qreal m_edgeSizePixels{};
    qreal m_cornerRadiusPixels{};
    // local fork: exact glass-mode radii (px); <= 0 means "not set"
    qreal m_glassLumaCeiling{1.0};
    qreal m_glassShadeTop{0.0};
    qreal m_glassShadeBottom{0.0};
    qreal m_glassCornerRadiusPixels{};
    qreal m_dockCornerRadiusPixels{};
    qreal m_RGBFringing{};
    int m_textureRepeatMode{};
    int m_mode{};

    qreal m_glassIor{1.5};
    qreal m_glassProfile{4.0};
    qreal m_rimStrength{};
    qreal m_rimWidthPixels{1.5};
    QVector2D m_lightDir{-0.7071f, -0.7071f};
    qreal m_rimDirectionality{1.5};
    qreal m_rimBackStrength{0.45};
    qreal m_innerShade{};
    qreal m_innerShadeRadiusPixels{12.0};

    RefractionPass() = default;

public:
    /**
     * Loads required shaders and sets up shader uniformLocations
     */
    static std::unique_ptr<RefractionPass> create();

    /**
     * reconfigure from BlurConfig
     */
    void reconfigure();

    /**
     * Check if refraction pass is enabled
     */
    bool enabled() const { return m_enabled; }

    /**
     * Push respective shader to the ShaderManager
     *
     * returns false if refraction is disabled
     */
    bool pushShader() const;

    /**
     * Set GLSL parameters
     *
     * returns false if refraction is disabled
     */
    bool setParameters(const QMatrix4x4 &projectionMatrix,
                       const QMatrix4x4 &colorMatrix,
                       const QVector2D &halfpixel,
                       const float offset,
                       const QRect &scaledBackgroundRect,
                       const bool isDock = false,
                       const QVector4D &measuredCornerRadii = QVector4D(-1.0f, -1.0f, -1.0f, -1.0f)) const;
};

} // namespace BBDX

