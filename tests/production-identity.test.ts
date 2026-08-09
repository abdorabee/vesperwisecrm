import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { describe, expect, test } from "vitest";
import manifest from "../src/app/manifest";
import { createVesperWiseMarkSvg } from "../src/lib/brand-icon";

function countBrandPixels(data: Buffer): { dark: number; lime: number; white: number } {
  const counts = { dark: 0, lime: 0, white: 0 };
  for (let index = 0; index < data.length; index += 3) {
    const [red, green, blue] = [data[index], data[index + 1], data[index + 2]];
    if (red < 30 && green < 30 && blue < 30) counts.dark += 1;
    if (red > 120 && green > 160 && blue < 100) counts.lime += 1;
    if (red > 235 && green > 235 && blue > 235) counts.white += 1;
  }
  return counts;
}

describe("production identity", () => {
  test("the VW mark remains recognizable at favicon size", async () => {
    const { data, info } = await sharp(Buffer.from(createVesperWiseMarkSvg()))
      .resize(16, 16)
      .flatten({ background: "#090a08" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    expect(info).toMatchObject({ width: 16, height: 16, channels: 3 });
    const pixels = countBrandPixels(data);
    expect(pixels.dark).toBeGreaterThan(150);
    expect(pixels.lime).toBeGreaterThan(20);
    expect(pixels.white).toBe(0);
  });

  test("ships matching production icon sizes without the old white Vercel mark", async () => {
    const assets = [
      ["public/icon-192.png", 192],
      ["public/icon-512.png", 512],
      ["public/icon-512-maskable.png", 512],
      ["public/apple-touch-icon.png", 180],
    ] as const;

    for (const [path, size] of assets) {
      const image = sharp(await readFile(path));
      await expect(image.metadata()).resolves.toMatchObject({ width: size, height: size });
      const raw = await image.resize(16, 16).removeAlpha().raw().toBuffer();
      expect(countBrandPixels(raw).white).toBe(0);
      expect(countBrandPixels(raw).lime).toBeGreaterThan(20);
    }
  });

  test("uses the production name and light-default PWA chrome", () => {
    expect(manifest()).toMatchObject({
      name: "VesperWise CRM",
      short_name: "VesperWise",
      background_color: "#f7f7f2",
      theme_color: "#f7f7f2",
    });
  });
});
