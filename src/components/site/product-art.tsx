import Image from "next/image";
import { cn } from "@/lib/cn";
import { IngredientArt } from "@/components/site/line-art";

export function ProductArt({ slug, className }: { slug: string; className?: string }) {
  return <IngredientArt slug={slug} className={className} />;
}

const PHOTOS: Record<string, string> = {
  "groundnut-chikki": "Groundnut chikki cut into squares in a cream bowl",
  "dry-fruit-chikki": "Dry fruit chikki with almonds, cashews and pistachios",
  "coconut-chikki": "Coconut and sesame chikki cut into squares in a cream bowl",
};

export function ProductPhoto({
  slug,
  className,
  sizes = "(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 46vw",
  priority = false,
}: {
  slug: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const alt = PHOTOS[slug];
  if (!alt) return <ProductArt slug={slug} className={className} />;
  return (
    <Image
      src={`/products/${slug}.jpg`}
      alt={alt}
      fill
      priority={priority}
      sizes={sizes}
      className={cn("object-cover", className)}
    />
  );
}
