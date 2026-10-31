import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getDb } from "./db";
import { nowIso } from "./dates";
import { cloudinaryConfigured, env } from "./env";
import { cleanSingleLine } from "./text";
import type { MediaAsset } from "./types";

const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;
const CLOUDINARY_FOLDER = "gh-chikkis";

const ALLOWED_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

interface MediaAssetDoc {
  _id: string;
  url: string;
  publicId?: string;
  alt: string;
  type: "image" | "video";
  width?: number;
  height?: number;
  uploadedBy: string;
  createdAt: string;
}

export class MediaUploadError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "MediaUploadError";
    this.status = status;
  }
}

function mapMediaAsset(doc: MediaAssetDoc): MediaAsset {
  return {
    id: doc._id,
    url: doc.url,
    publicId: doc.publicId,
    alt: doc.alt,
    type: doc.type,
    width: doc.width,
    height: doc.height,
  };
}

function cloudinarySignature(timestamp: number): { signature: string; timestamp: number } {
  const params = `folder=${CLOUDINARY_FOLDER}&timestamp=${timestamp}`;
  const signature = createHash("sha1")
    .update(`${params}${env.cloudinary.apiSecret}`)
    .digest("hex");
  return { signature, timestamp };
}

async function uploadToCloudinary(
  file: File,
  buffer: Buffer,
  extension: string,
): Promise<{ url: string; publicId: string }> {
  const { signature, timestamp } = cloudinarySignature(Math.floor(Date.now() / 1000));
  const body = new FormData();
  body.append(
    "file",
    new Blob([new Uint8Array(buffer)], { type: file.type }),
    file.name || `upload.${extension}`,
  );
  body.append("api_key", env.cloudinary.apiKey);
  body.append("timestamp", String(timestamp));
  body.append("folder", CLOUDINARY_FOLDER);
  body.append("signature", signature);

  let response: Response;
  try {
    response = await fetch(
      `https://api.cloudinary.com/v1_1/${env.cloudinary.cloudName}/image/upload`,
      { method: "POST", body, cache: "no-store" },
    );
  } catch {
    throw new MediaUploadError("Image storage could not be reached. Try again.", 502);
  }
  const payload = (await response.json().catch(() => null)) as
    | { secure_url?: string; public_id?: string }
    | null;
  if (!response.ok || !payload?.secure_url || !payload.public_id) {
    throw new MediaUploadError("The image could not be uploaded. Try again.", 502);
  }
  return { url: payload.secure_url, publicId: payload.public_id };
}

async function uploadToLocalDisk(
  buffer: Buffer,
  extension: string,
): Promise<{ url: string }> {
  if (env.isProduction) {
    throw new MediaUploadError(
      "Image storage is not configured. Set the Cloudinary environment variables.",
      503,
    );
  }
  const directory = path.join(process.cwd(), "public", "uploads");
  await mkdir(directory, { recursive: true });
  const filename = `${randomUUID()}.${extension}`;
  await writeFile(path.join(directory, filename), buffer);
  return { url: `/uploads/${filename}` };
}

export async function storeImageUpload(
  file: File,
  input: { alt: string; uploadedBy: string },
): Promise<MediaAsset> {
  const extension = ALLOWED_EXTENSIONS[file.type];
  if (!extension) {
    throw new MediaUploadError("Use a JPG, PNG, WebP or AVIF image.");
  }
  if (file.size <= 0) {
    throw new MediaUploadError("The selected file is empty.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new MediaUploadError("Images must be 6 MB or smaller.");
  }
  const alt = cleanSingleLine(input.alt, 240);
  if (alt.length < 2) {
    throw new MediaUploadError("Add a short description of the image (alt text).");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const stored: { url: string; publicId?: string } = cloudinaryConfigured
    ? await uploadToCloudinary(file, buffer, extension)
    : await uploadToLocalDisk(buffer, extension);

  const doc: MediaAssetDoc = {
    _id: randomUUID(),
    url: stored.url,
    alt,
    type: "image",
    uploadedBy: input.uploadedBy,
    createdAt: nowIso(),
  };
  if (stored.publicId) doc.publicId = stored.publicId;

  const db = await getDb();
  await db.collection<MediaAssetDoc>("media_assets").insertOne(doc);
  return mapMediaAsset(doc);
}

export async function listMediaAssets(limit = 48): Promise<MediaAsset[]> {
  const db = await getDb();
  const docs = await db
    .collection<MediaAssetDoc>("media_assets")
    .find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
  return docs.map(mapMediaAsset);
}

export async function getMediaAsset(id: string): Promise<MediaAsset | null> {
  const db = await getDb();
  const doc = await db.collection<MediaAssetDoc>("media_assets").findOne({ _id: id });
  return doc ? mapMediaAsset(doc) : null;
}

export async function getMediaAssets(ids: string[]): Promise<MediaAsset[]> {
  const unique = [...new Set(ids)].slice(0, 12);
  if (unique.length === 0) return [];
  const db = await getDb();
  const docs = await db
    .collection<MediaAssetDoc>("media_assets")
    .find({ _id: { $in: unique } })
    .toArray();
  const byId = new Map(docs.map((doc) => [doc._id, mapMediaAsset(doc)]));
  return ids
    .map((id) => byId.get(id))
    .filter((asset): asset is MediaAsset => Boolean(asset));
}
