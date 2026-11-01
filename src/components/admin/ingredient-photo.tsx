import Image from "next/image";
import { cn } from "@/lib/cn";
import type { IngredientArt } from "@/lib/ingredients";

/** A fill image of the raw material, sized for the small tiles and rows it sits in. */
export function IngredientPhoto({
  art,
  sizes,
  className,
}: {
  art: IngredientArt;
  sizes: string;
  className?: string;
}) {
  return (
    <Image
      src={art.src}
      alt={art.alt}
      fill
      sizes={sizes}
      draggable={false}
      className={cn("object-cover", className)}
    />
  );
}
