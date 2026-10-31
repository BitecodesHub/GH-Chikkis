import { getSessionContext } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { MediaUploadError, storeImageUpload } from "@/lib/media";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const context = await getSessionContext();
  if (!context) {
    return Response.json({ error: "Sign in again to upload images." }, { status: 401 });
  }
  if (!hasPermission(context.user, "catalogue.manage")) {
    return Response.json(
      { error: "You do not have permission to upload catalogue images." },
      { status: 403 },
    );
  }

  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== new URL(request.url).host) {
        return Response.json({ error: "Request blocked." }, { status: 403 });
      }
    } catch {
      return Response.json({ error: "Request blocked." }, { status: 403 });
    }
  }

  const limit = await rateLimit({
    scope: "media:upload",
    identifier: context.user.id,
    limit: 40,
    windowSeconds: 3600,
  });
  if (!limit.allowed) {
    return Response.json(
      { error: "Too many uploads in the last hour. Try again later." },
      { status: 429 },
    );
  }

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > 7 * 1024 * 1024) {
    return Response.json({ error: "Images must be 6 MB or smaller." }, { status: 413 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "The upload could not be read." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "Choose an image to upload." }, { status: 400 });
  }
  const alt = typeof formData.get("alt") === "string" ? String(formData.get("alt")) : "";

  try {
    const asset = await storeImageUpload(file, {
      alt,
      uploadedBy: context.user.id,
    });
    return Response.json({ asset }, { status: 201 });
  } catch (error) {
    if (error instanceof MediaUploadError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error("Media upload failed", error);
    return Response.json(
      { error: "The image could not be uploaded. Try again." },
      { status: 500 },
    );
  }
}
