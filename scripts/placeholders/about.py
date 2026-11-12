"""Demo placeholder images for the About us page (Back Market layout).
Run: python scripts/placeholders/about.py   -> writes public/about/demo/*.webp
Replace any file with a real image of the same name and size when ready."""
import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parents[2] / 'public' / 'about' / 'demo'
OUT.mkdir(parents=True, exist_ok=True)

def font(size, bold=False):
    names = ['DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf', 'arialbd.ttf' if bold else 'arial.ttf']
    for root in ['/usr/share/fonts/truetype/dejavu', 'C:/Windows/Fonts']:
        for n in names:
            p = os.path.join(root, n)
            if os.path.exists(p):
                return ImageFont.truetype(p, size)
    return ImageFont.load_default()

BG, LINE, INK, SUB = (241, 241, 239), (214, 214, 210), (60, 60, 58), (125, 125, 120)

def center(d, W, y, txt, f, fill):
    d.text(((W - d.textlength(txt, font=f)) / 2, y), txt, fill=fill, font=f)

def make(name, W, H, title, kind='photo'):
    im = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(im)
    pad = max(8, W // 60)
    d.rectangle([pad, pad, W - pad - 1, H - pad - 1], outline=LINE, width=2)
    big, small = font(max(18, W // 20), True), font(max(12, W // 42))
    if kind == 'portrait':  # head + shoulders silhouette
        cx, r = W // 2, H // 7
        d.ellipse([cx - r, H // 4 - r // 2, cx + r, H // 4 + r * 3 // 2], fill=LINE)
        d.pieslice([cx - r * 2.4, H // 2, cx + r * 2.4, H // 2 + r * 4.4], 180, 360, fill=LINE)
        center(d, W, int(H * 0.78), title, font(max(16, W // 22), True), INK)
    elif kind == 'stat':
        center(d, W, H // 2 - W // 6, title, font(W // 5, True), INK)
        center(d, W, H // 2 + W // 12, 'Demo stat', small, SUB)
    elif kind == 'logo':
        center(d, W, H // 2 - H // 6, title.upper(), font(max(18, H // 6), True), INK)
    else:
        center(d, W, H // 2 - W // 18, title, big, INK)
    if kind != 'stat':
        center(d, W, H - pad - max(14, W // 30) - 6, f'Demo · {W}×{H}', small, SUB)
    im.save(OUT / f'{name}.webp', 'WEBP', quality=80)

# Stat cards (3), square
for i, v in enumerate(['00%', '0,000', '00'], 1):
    make(f'stat-{i}', 600, 600, v, 'stat')
# Image + text rows (content-media), 4:3
for slug, t in [('commitment-1', 'Commitment 1'), ('commitment-2', 'Commitment 2'), ('commitment-3', 'Commitment 3'),
                ('impact-report', 'Our impact report'), ('certification', 'Certification'),
                ('press-kit', 'Press kit'), ('careers', 'Work at Ecombio')]:
    make(slug, 1200, 900, t)
# Latest news + industry insights cards, 16:9
for i in range(1, 7):
    make(f'news-{i}', 800, 450, f'News {i}')
for i in range(1, 6):
    make(f'insight-{i}', 800, 450, f'Article {i}')
# As seen in (outlet logos), investors, partners: 2:1 logos
for i in range(1, 9):
    make(f'outlet-{i}', 400, 200, f'Outlet {i}', 'logo')
for i in range(1, 8):
    make(f'investor-{i}', 400, 200, f'Investor {i}', 'logo')
for i in range(1, 5):
    make(f'partner-{i}', 400, 200, f'Partner {i}', 'logo')
# Leadership team + founders portraits (Back Market uses 448x360)
for i in range(1, 9):
    make(f'leader-{i}', 448, 360, f'Leader {i}', 'portrait')
for i in range(1, 4):
    make(f'founder-{i}', 448, 360, f'Founder {i}', 'portrait')

print(f'{len(list(OUT.glob("*.webp")))} images in {OUT}')
