import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { createCanvas } = require("../../node_modules/@napi-rs/canvas");

const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "resources");
mkdirSync(outDir, { recursive: true });

function drawIcon(size, { splash = false } = {}) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, size, size);

  const inset = splash ? size * 0.28 : size * 0.12;
  const box = size - inset * 2;
  const r = box * 0.22;

  ctx.fillStyle = "#f59e0b";
  ctx.beginPath();
  ctx.roundRect(inset, inset, box, box, r);
  ctx.fill();

  ctx.fillStyle = "#fffcf7";
  ctx.beginPath();
  ctx.roundRect(inset + box * 0.1, inset + box * 0.1, box * 0.8, box * 0.8, r * 0.7);
  ctx.fill();

  ctx.fillStyle = "#4f7d6b";
  ctx.font = `900 ${Math.round(box * 0.5)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("A", size / 2, size * 0.54);
  return canvas.toBuffer("image/png");
}

writeFileSync(join(outDir, "icon.png"), drawIcon(1024));
writeFileSync(join(outDir, "splash.png"), drawIcon(2732, { splash: true }));

const androidRes = join(outDir, "..", "android", "app", "src", "main", "res");
const launchers = [
  ["mipmap-mdpi", 48],
  ["mipmap-hdpi", 72],
  ["mipmap-xhdpi", 96],
  ["mipmap-xxhdpi", 144],
  ["mipmap-xxxhdpi", 192],
];
const foregrounds = [
  ["mipmap-mdpi", 108],
  ["mipmap-hdpi", 162],
  ["mipmap-xhdpi", 216],
  ["mipmap-xxhdpi", 324],
  ["mipmap-xxxhdpi", 432],
];

if (existsSync(androidRes)) {
    for (const [folder, size] of launchers) {
      const png = drawIcon(size);
      writeFileSync(join(androidRes, folder, "ic_launcher.png"), png);
      writeFileSync(join(androidRes, folder, "ic_launcher_round.png"), png);
    }
    for (const [folder, size] of foregrounds) {
      writeFileSync(
        join(androidRes, folder, "ic_launcher_foreground.png"),
        drawIcon(size, { splash: true }),
      );
    }
    writeFileSync(join(androidRes, "drawable", "splash.png"), drawIcon(512, { splash: true }));
    console.log("updated android launcher icons");
  }

console.log("wrote apk/resources/icon.png and splash.png");
