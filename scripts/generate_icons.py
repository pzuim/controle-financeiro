"""Gera os ícones PNG do app em public/icons/ (requer Pillow: pip install pillow).

Desenho próprio e genérico: dois cartões brancos sobre fundo laranja.
Uso: npm run icons
"""

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "icons"
SS = 4  # supersampling para bordas suaves
BASE = 512


def gradient(size: int, top_left: tuple[int, int, int], bottom_right: tuple[int, int, int]) -> Image.Image:
    img = Image.new("RGB", (size, size))
    px = img.load()
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * (size - 1))
            px[x, y] = tuple(round(a + (b - a) * t) for a, b in zip(top_left, bottom_right))
    return img


def card_layer(size: int, w: int, h: int, fill: tuple[int, int, int, int], stripe: tuple[int, int, int, int] | None) -> Image.Image:
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    x0, y0 = (size - w) // 2, (size - h) // 2
    r = int(h * 0.14)
    d.rounded_rectangle((x0, y0, x0 + w, y0 + h), radius=r, fill=fill)
    if stripe:
        # Faixa superior e duas linhas de "texto" abstratas.
        d.rectangle((x0, y0 + int(h * 0.2), x0 + w, y0 + int(h * 0.36)), fill=stripe)
        lh = int(h * 0.09)
        ly = y0 + int(h * 0.66)
        d.rounded_rectangle((x0 + int(w * 0.1), ly, x0 + int(w * 0.48), ly + lh), radius=lh // 2, fill=(255, 176, 120, 255))
        d.rounded_rectangle((x0 + int(w * 0.56), ly, x0 + int(w * 0.72), ly + lh), radius=lh // 2, fill=(255, 210, 178, 255))
    return layer


def render(size_px: int, rounded: bool) -> Image.Image:
    s = BASE * SS
    bg = gradient(s // 8, (255, 128, 0), (230, 70, 12)).resize((s, s), Image.BILINEAR).convert("RGBA")

    back = card_layer(s, int(s * 0.46), int(s * 0.30), (255, 255, 255, 110), None)
    back = back.rotate(14, resample=Image.BICUBIC, center=(s / 2, s / 2), translate=(-int(s * 0.05), -int(s * 0.07)))
    front = card_layer(s, int(s * 0.50), int(s * 0.32), (255, 255, 255, 255), (242, 82, 10, 235))
    front = front.rotate(-6, resample=Image.BICUBIC, center=(s / 2, s / 2), translate=(int(s * 0.03), int(s * 0.06)))

    img = Image.alpha_composite(bg, back)
    img = Image.alpha_composite(img, front)

    if rounded:
        mask = Image.new("L", (s, s), 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, s - 1, s - 1), radius=int(s * 0.22), fill=255)
        out = Image.new("RGBA", (s, s), (0, 0, 0, 0))
        out.paste(img, (0, 0), mask)
        img = out

    return img.resize((size_px, size_px), Image.LANCZOS)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    render(512, rounded=True).save(OUT / "icon-512.png", optimize=True)
    render(192, rounded=True).save(OUT / "icon-192.png", optimize=True)
    # Ícone "maskable": fundo até a borda; o Android recorta no formato do sistema.
    render(512, rounded=False).save(OUT / "icon-maskable-512.png", optimize=True)
    render(180, rounded=False).convert("RGB").save(OUT / "apple-touch-icon.png", optimize=True)
    print(f"Ícones gerados em {OUT}")


if __name__ == "__main__":
    main()
