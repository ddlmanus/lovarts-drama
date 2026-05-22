from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageOps
from psd_tools import PSDImage
from psd_tools.api.layers import PixelLayer


ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path("/Users/dudianlong/Downloads/图片节点8.png")
OUT_DIR = ROOT / "output" / "image_node_8_layers"
PSD_PATH = ROOT / "output" / "图片节点8_layered.psd"


def blank(size):
    return Image.new("L", size, 0)


def polygon_mask(size, points, blur=0, fill=255):
    mask = blank(size)
    draw = ImageDraw.Draw(mask)
    draw.polygon(points, fill=fill)
    if blur:
        mask = mask.filter(ImageFilter.GaussianBlur(blur))
    return mask


def ellipse_mask(size, box, blur=0, fill=255):
    mask = blank(size)
    draw = ImageDraw.Draw(mask)
    draw.ellipse(box, fill=fill)
    if blur:
        mask = mask.filter(ImageFilter.GaussianBlur(blur))
    return mask


def rectangle_mask(size, box, blur=0, fill=255):
    mask = blank(size)
    draw = ImageDraw.Draw(mask)
    draw.rectangle(box, fill=fill)
    if blur:
        mask = mask.filter(ImageFilter.GaussianBlur(blur))
    return mask


def combine(size, masks):
    out = blank(size)
    for mask in masks:
        out = ImageChops.lighter(out, mask)
    return out


def subtract(base, *cuts):
    out = base.copy()
    for cut in cuts:
        out = ImageChops.subtract(out, cut)
    return out


def cutout(src, mask):
    rgba = src.convert("RGBA")
    rgba.putalpha(mask)
    return rgba


def bbox_from_alpha(image):
    alpha = image.getchannel("A")
    return alpha.getbbox()


def crop_layer(image):
    bbox = bbox_from_alpha(image)
    if not bbox:
        return image, 0, 0
    return image.crop(bbox), bbox[0], bbox[1]


def save_png(name, image):
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUT_DIR / f"{name}.png"
    image.save(path)
    return path


def make_warm_glow(size):
    w, h = size
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    alpha = Image.new("L", size, 0)
    draw = ImageDraw.Draw(alpha)
    draw.ellipse((-260, -210, 680, 720), fill=125)
    draw.ellipse((680, 1220, 1700, 2260), fill=95)
    draw.polygon([(1180, 0), (1536, 0), (1536, 2048), (1320, 2048), (1080, 600)], fill=75)
    alpha = alpha.filter(ImageFilter.GaussianBlur(85))
    color = Image.new("RGBA", size, (255, 194, 112, 0))
    color.putalpha(alpha)
    return color


def make_sparkles(size):
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    specs = [
        (454, 40, 2), (510, 50, 3), (430, 606, 2), (251, 562, 2),
        (1005, 371, 2), (812, 623, 3), (1452, 583, 2), (1295, 1742, 2),
        (1167, 915, 2), (719, 835, 2), (338, 712, 3), (110, 641, 2),
    ]
    for x, y, r in specs:
        draw.ellipse((x - r, y - r, x + r, y + r), fill=(255, 246, 221, 190))
        draw.line((x - r * 4, y, x + r * 4, y), fill=(255, 246, 221, 120), width=1)
        draw.line((x, y - r * 4, x, y + r * 4), fill=(255, 246, 221, 120), width=1)
    return layer.filter(ImageFilter.GaussianBlur(0.2))


def main():
    src = Image.open(SOURCE).convert("RGB")
    size = src.size

    # Broad, soft masks hand-fitted to the supplied 1536 x 2048 composition.
    person = combine(
        size,
        [
            ellipse_mask(size, (294, 16, 1018, 812), blur=18),
            polygon_mask(size, [(380, 500), (720, 640), (1050, 1050), (940, 2048), (190, 2048), (250, 1050)], blur=28),
            polygon_mask(size, [(712, 780), (1030, 825), (1450, 1150), (1370, 1950), (770, 1620), (730, 1040)], blur=22),
            polygon_mask(size, [(870, 760), (1245, 930), (1518, 1320), (1490, 1765), (1145, 1515), (940, 1080)], blur=22),
        ],
    )
    hair = combine(
        size,
        [
            ellipse_mask(size, (328, 0, 1038, 640), blur=10),
            polygon_mask(size, [(705, 255), (1065, 465), (1285, 850), (1515, 1135), (1432, 1848), (1082, 1545), (886, 1045), (820, 650)], blur=13),
            polygon_mask(size, [(930, 595), (1370, 956), (1524, 1415), (1430, 1990), (1240, 1628), (1058, 1120), (884, 782)], blur=10),
        ],
    )
    face_skin = combine(
        size,
        [
            ellipse_mask(size, (324, 212, 732, 700), blur=10),
            polygon_mask(size, [(490, 616), (730, 630), (845, 990), (690, 1055), (530, 890), (438, 690)], blur=18),
            ellipse_mask(size, (320, 823, 910, 1186), blur=24),
        ],
    )
    dress = combine(
        size,
        [
            polygon_mask(size, [(238, 1038), (676, 830), (1010, 1000), (1080, 2048), (42, 2048), (0, 1860)], blur=16),
            polygon_mask(size, [(780, 1084), (1536, 1415), (1536, 2048), (846, 2048), (644, 1640)], blur=20),
            polygon_mask(size, [(250, 1480), (720, 1550), (790, 2048), (340, 2048)], blur=12),
        ],
    )
    jewelry = combine(
        size,
        [
            polygon_mask(size, [(801, 0), (1040, 0), (1030, 545), (840, 700), (732, 425)], blur=4),
            polygon_mask(size, [(775, 560), (908, 560), (946, 1020), (815, 1035)], blur=5),
            polygon_mask(size, [(952, 0), (1188, 90), (1235, 814), (1130, 1010), (1010, 362)], blur=4),
            ellipse_mask(size, (433, 338, 488, 395), blur=2),
        ],
    )
    right_flowers = combine(
        size,
        [
            polygon_mask(size, [(1188, 420), (1536, 400), (1536, 827), (1138, 752)], blur=12),
            polygon_mask(size, [(1180, 720), (1536, 820), (1536, 1035), (1240, 928)], blur=12),
        ],
    )
    window_arch = combine(
        size,
        [
            rectangle_mask(size, (0, 0, 172, 2048), blur=2),
            rectangle_mask(size, (0, 1172, 444, 1235), blur=3),
            polygon_mask(size, [(0, 1048), (270, 1370), (462, 2048), (0, 2048)], blur=5),
            polygon_mask(size, [(1440, 0), (1536, 0), (1536, 2048), (1454, 2048), (1392, 1090)], blur=5),
        ],
    )
    background_only = cutout(src, subtract(Image.new("L", size, 255), person, jewelry, right_flowers))

    layers = [
        ("00_full_reference_locked", src.convert("RGBA")),
        ("01_background_window_and_room", background_only),
        ("02_window_arch_foreground", cutout(src, window_arch)),
        ("03_right_flower_branch", cutout(src, right_flowers)),
        ("04_dress_and_flowing_silk", cutout(src, dress)),
        ("05_skin_face_shoulders", cutout(src, face_skin)),
        ("06_hair_mass_and_flying_strands", cutout(src, hair)),
        ("07_hairpins_earrings_gold_chains", cutout(src, jewelry)),
        ("08_warm_backlight_overlay", make_warm_glow(size)),
        ("09_small_sparkles_light_dust", make_sparkles(size)),
    ]

    PSD_PATH.parent.mkdir(parents=True, exist_ok=True)
    psd = PSDImage.new("RGB", size, color=(255, 255, 255))

    # Build bottom-to-top layer stack. All layers retain their original canvas
    # coordinates by placing cropped transparent PNGs at each crop origin.
    for name, image in layers:
        save_png(name, image)
        cropped, left, top = crop_layer(image)
        if name == "00_full_reference_locked":
            cropped, left, top = image, 0, 0
        layer = PixelLayer.frompil(cropped, psd, name=name, left=left, top=top)
        psd.append(layer)

    psd.save(PSD_PATH)
    print(PSD_PATH)
    print(OUT_DIR)


if __name__ == "__main__":
    main()
