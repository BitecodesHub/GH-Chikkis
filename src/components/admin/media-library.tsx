"use client";

import Image from "next/image";
import { useState } from "react";
import type { MediaAsset } from "@/lib/types";
import { MediaUploader } from "./media-uploader";

export function MediaLibrary({
  assets,
  usage,
}: {
  assets: MediaAsset[];
  usage: Record<string, number>;
}) {
  const [library, setLibrary] = useState(assets);

  return (
    <section className="surface" aria-labelledby="media-library">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h2 id="media-library" className="font-[family-name:var(--font-display)] text-xl">
            Media library
          </h2>
          <p className="mt-0.5 text-[0.8125rem] text-ink-muted">
            Photographs uploaded here can be selected on any variety.
          </p>
        </div>
        <span className="meta">{library.length} images</span>
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div>
          {library.length === 0 ? (
            <div className="rounded-sm border border-dashed border-line-strong px-5 py-10 text-center">
              <p className="text-[0.9375rem] font-medium">No photographs yet.</p>
              <p className="mt-1 text-[0.875rem] text-ink-muted">
                Until an image is added, products use the illustrated artwork.
              </p>
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {library.map((asset) => (
                <li key={asset.id}>
                  <figure>
                    <div className="relative aspect-square overflow-hidden border border-line bg-paper-deep">
                      <Image
                        src={asset.url}
                        alt={asset.alt}
                        fill
                        sizes="(min-width: 1280px) 16vw, (min-width: 640px) 25vw, 40vw"
                        className="object-cover"
                      />
                    </div>
                    <figcaption className="mt-2">
                      <p className="line-clamp-2 text-[0.8125rem] leading-snug text-ink-soft">
                        {asset.alt}
                      </p>
                      <p className="mt-1 text-[0.75rem] text-ink-muted">
                        {usage[asset.id]
                          ? `Used on ${usage[asset.id]} ${usage[asset.id] === 1 ? "variety" : "varieties"}`
                          : "Not used yet"}
                      </p>
                    </figcaption>
                  </figure>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-line pt-5 lg:border-t-0 lg:border-l lg:pl-5 lg:pt-0">
          <MediaUploader
            onUploaded={(asset) => setLibrary((current) => [asset, ...current])}
          />
        </div>
      </div>
    </section>
  );
}
