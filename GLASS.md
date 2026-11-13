# Glass fork of Better Blur DX

This branch (`glass`) is a fork of [Better Blur DX](https://github.com/xarblu/kwin-effects-better-blur-dx)
v2.6.0 that adds a glass look: a lens-style refraction mode, rim lighting, separate blur for docks and panels,
and dimming of bright backdrops so light text stays readable.

It installs under its own plugin id, `better_blur_dx_local`, so it can sit next to an upstream install.
Enable only one blur effect at a time.

For a ready-made setup (effect + matching WhiteSur theme files + light/dark switching) see
[plasma-liquid-glass](https://github.com/artyommargaryan/plasma-liquid-glass).

## What the fork adds

| kwinrc key (`[Effect-better-blur-dx]`) | Meaning |
|---|---|
| `RefractionMode=2` | Glass lens mode (convex bezel around the edge of each blurred surface) |
| `GlassIor`, `GlassProfile` | Lens strength and bezel cross-section |
| `RimStrength`, `RimWidth`, `RimLightAngle`, `RimDirectionality`, `RimBackStrength` | Thin rim light, lit from one direction with a weaker reflection opposite |
| `InnerShade`, `InnerShadeRadius` | Soft inner shading |
| `DockBlurStrength` | Blur strength for docks and panels only (0 = same as `BlurStrength`) |
| `GlassCornerRadius`, `DockCornerRadius` | Corner radius in px for popups/windows and for docks (0 = fall back to the measured shape) |
| `MenuCornerRadius` | Application menus (Kvantum and similar) ask for a stepped blur shape with small corners. If > 0, the glass behind them is cut to a smooth rounded rectangle of this radius; the menu theme must draw its frame with the same radius. This includes global-menu popups; tooltips and Plasma’s own larger-cornered popups are not touched. 0 = off |
| `MenuEdgeLine` | Strength (percent) of a thin, even light line along the edge of menus cut to `MenuCornerRadius`; the directional rim leaves two corners unlit, this line runs all the way round. 0 = off |
| `GlassLumaCeiling` | Percent; bright backdrops are rolled off to this level (100 = off) |

The effect also measures each corner of a blurred surface, so square corners stay square and surfaces with a
clearly different radius (tooltips, menus) use their own.

All of these have sliders: System Settings → Desktop Effects → Better Blur DX (local build) → configure → Glass tab.

## Build and install

Dependencies are the same as upstream (see README.md). Then:

    cmake -B build -DCMAKE_INSTALL_PREFIX=/usr -DCMAKE_BUILD_TYPE=Release
    cmake --build build -j"$(nproc)"
    sudo cmake --install build

Enable it and switch the stock blur off:

    kwriteconfig6 --file kwinrc --group Plugins --key better_blur_dx_localEnabled true
    kwriteconfig6 --file kwinrc --group Plugins --key blurEnabled false
    qdbus-qt6 org.kde.KWin /KWin reconfigure

A KWin effect only loads into the exact KWin version it was built against, so **rebuild after every KWin update**.
After reinstalling over a loaded copy, log out and back in.

Apply a setting changed with `kwriteconfig6` without a relogin:

    qdbus-qt6 org.kde.KWin /KWin reconfigure
    qdbus-qt6 org.kde.KWin /Effects org.kde.kwin.Effects.reconfigureEffect better_blur_dx_local

## Status

Developed and tested on one machine: Fedora 44, Plasma/KWin 6.8.2, Wayland. X11 is untested.

## Credits

- [Better Blur DX](https://github.com/xarblu/kwin-effects-better-blur-dx) by xarblu and contributors (GPL-3.0), the base of this fork.
- The lens (Snell's-law refraction through a rounded bezel) and rim light are adapted from
  [liquid-glass](https://github.com/ryohsuke1231/liquid-glass) (MIT) and [hyprglass](https://github.com/hyprnux/hyprglass) (BSD-3-Clause).

Licence: GPL-3.0, same as upstream.
