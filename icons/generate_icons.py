#!/usr/bin/env python3
"""Generates the PWA app icons for the Lionheart Dashboard.

Draws a simple pulse/ECG line (generic heart-rate monitor motif, not F45
branding) on the app's own accent-blue background. Run once with:
    python3 icons/generate_icons.py
Regenerate if the design ever needs to change - these are checked-in PNGs,
not built at deploy time.
"""
from PIL import Image, ImageDraw

BLUE = (42, 120, 214)  # matches --avg-hr in index.html
WHITE = (255, 255, 255)


def draw_pulse(size):
    img = Image.new("RGB", (size, size), BLUE)
    draw = ImageDraw.Draw(img)

    # A classic ECG/pulse zigzag, centered in a safe zone so it survives
    # maskable (circular) cropping on Android.
    cx, cy = size / 2, size / 2
    w = size * 0.62
    h = size * 0.22
    x0 = cx - w / 2
    points = [
        (x0, cy),
        (x0 + w * 0.18, cy),
        (x0 + w * 0.28, cy - h * 0.9),
        (x0 + w * 0.38, cy + h * 1.1),
        (x0 + w * 0.46, cy - h * 0.3),
        (x0 + w * 0.56, cy),
        (x0 + w, cy),
    ]
    stroke = max(3, round(size * 0.045))
    draw.line(points, fill=WHITE, width=stroke, joint="curve")
    for p in (points[0], points[-1]):
        r = stroke / 2
        draw.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=WHITE)
    return img


def rounded(img, radius_pct):
    size = img.size[0]
    mask = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle([0, 0, size, size], radius=round(size * radius_pct), fill=255)
    out = Image.new("RGBA", (size, size))
    out.paste(img, (0, 0), mask)
    return out


if __name__ == "__main__":
    base = draw_pulse(512)
    base.save("icons/icon-512.png")
    base.resize((192, 192), Image.LANCZOS).save("icons/icon-192.png")

    # Apple wants a plain square (iOS applies its own corner mask).
    draw_pulse(180).save("icons/apple-touch-icon.png")

    # Maskable variant: same art, PNG already fills edge-to-edge so it's
    # safe under Android's circular/squircle crop.
    base.save("icons/icon-512-maskable.png")

    print("Wrote icon-192.png, icon-512.png, icon-512-maskable.png, apple-touch-icon.png")
