import { type Express, type Request, type Response } from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";

let sharp: any = null;
async function getSharp() {
  if (!sharp) {
    sharp = (await import("sharp")).default;
  }
  return sharp;
}

const CACHE_DIR = path.resolve(process.cwd(), ".image-cache");
const PUBLIC_IMAGES_DIR = path.resolve(process.cwd(), "client/public/images");

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function cacheKey(filePath: string): string {
  const stat = fs.statSync(filePath);
  const hash = crypto
    .createHash("md5")
    .update(`${filePath}:${stat.mtimeMs}`)
    .digest("hex");
  return path.join(CACHE_DIR, `${hash}.webp`);
}

export function registerImageOptimizer(app: Express) {
  app.get("/images/*", async (req: Request, res: Response, next: any) => {
    const acceptsWebP =
      req.headers["accept"]?.includes("image/webp") ?? false;

    if (!acceptsWebP) {
      return next();
    }

    const relativePath = req.path.replace(/^\/images\//, "");
    const sourcePath = path.join(PUBLIC_IMAGES_DIR, relativePath);

    if (
      !fs.existsSync(sourcePath) ||
      sourcePath.toLowerCase().endsWith(".webp")
    ) {
      return next();
    }

    const ext = path.extname(sourcePath).toLowerCase();
    if (![".jpg", ".jpeg", ".png"].includes(ext)) {
      return next();
    }

    try {
      const cached = cacheKey(sourcePath);

      if (!fs.existsSync(cached)) {
        const s = await getSharp();
        await s(sourcePath)
          .webp({ quality: 82, effort: 4 })
          .toFile(cached);
      }

      res.setHeader("Content-Type", "image/webp");
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      res.setHeader("Vary", "Accept");
      return res.sendFile(cached);
    } catch (err) {
      return next();
    }
  });
}
