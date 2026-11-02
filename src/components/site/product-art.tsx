import Image from "next/image";
import { cn } from "@/lib/cn";
import { IngredientArt } from "@/components/site/line-art";

export function ProductArt({ slug, className }: { slug: string; className?: string }) {
  return <IngredientArt slug={slug} className={className} />;
}

const PHOTOS: Record<string, string> = {
  "groundnut-chikki":
    "Groundnut chikki bars stacked on a dark stone board, with a bowl of peanuts and a bowl of ghee behind",
  "white-til-chikki":
    "White til chikki bars stacked on a dark stone board, with a bowl of white sesame and a bowl of jaggery behind",
  "black-til-chikki":
    "Black til chikki bars stacked on a dark wooden board, with a bowl of black sesame behind",
  "dry-fruit-chikki":
    "Dry fruit chikki bars studded with almonds, cashews and pistachios, stacked beside a bowl of mixed nuts",
  "coconut-chikki":
    "Coconut chikki bars on a dark stone board scattered with coconut shreds, with a halved coconut behind",
  "mamra-chikki":
    "Mamra chikki — light puffed rice bars — stacked on a dark stone board, with a bowl of mamra and a bowl of ghee behind",
  "daliya-chikki":
    "Daliya chikki bars stacked on a dark stone board, with a bowl of roasted daliya and a bowl of ghee behind",
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
