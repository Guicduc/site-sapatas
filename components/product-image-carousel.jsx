"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

// Largura real dos cards do catalogo (grid auto-fill de colunas >= 340px, conteudo ate 1500px).
export const PRODUCT_CARD_IMAGE_SIZES = "(max-width: 720px) 100vw, (max-width: 1100px) 50vw, 400px";

function getImageLabel(image) {
  return image?.label || image?.title || "Foto do produto";
}

function getNeighborIndexes(index, length) {
  return [index, (index + 1) % length, (index - 1 + length) % length];
}

export function ProductImageCarousel({
  images,
  label = "Fotos do produto",
  aspectRatio = "1.55 / 1",
  className = "",
  sizes = PRODUCT_CARD_IMAGE_SIZES,
  priority = false
}) {
  const safeImages = useMemo(() => {
    if (!Array.isArray(images)) {
      return [];
    }

    const seen = new Set();

    return images.filter((image) => {
      if (!image?.src || seen.has(image.src)) {
        return false;
      }

      seen.add(image.src);
      return true;
    });
  }, [images]);
  const [activeIndex, setActiveIndex] = useState(0);
  // As fotos ficam sobrepostas no mesmo viewport, entao `loading="lazy"` nao as adiaria:
  // so a foto ativa e montada; as vizinhas entram quando o usuario aponta, foca ou navega.
  const [mountedIndexes, setMountedIndexes] = useState(() => new Set([0]));
  const isCarousel = safeImages.length > 1;
  const activeImage = safeImages[activeIndex] || safeImages[0];

  useEffect(() => {
    setActiveIndex((current) => Math.min(current, Math.max(safeImages.length - 1, 0)));
  }, [safeImages.length]);

  const mountAround = useCallback(
    (index) => {
      if (safeImages.length < 2) {
        return;
      }

      const wanted = getNeighborIndexes(index, safeImages.length);

      setMountedIndexes((current) => {
        if (wanted.every((item) => current.has(item))) {
          return current;
        }

        return new Set([...current, ...wanted]);
      });
    },
    [safeImages.length]
  );

  const selectImage = useCallback(
    (nextIndex) => {
      const normalizedIndex = (nextIndex + safeImages.length) % safeImages.length;

      mountAround(normalizedIndex);
      setActiveIndex(normalizedIndex);
    },
    [mountAround, safeImages.length]
  );

  if (!activeImage) {
    return null;
  }

  const warmNeighbors = isCarousel ? () => mountAround(activeIndex) : undefined;

  return (
    <figure
      className={`product-image-carousel${className ? ` ${className}` : ""}`}
      style={{ "--product-image-carousel-aspect-ratio": aspectRatio }}
      role={isCarousel ? "region" : undefined}
      aria-roledescription={isCarousel ? "carrossel" : undefined}
      aria-label={isCarousel ? label : undefined}
      onPointerEnter={warmNeighbors}
      onFocus={warmNeighbors}
    >
      <div className="product-image-carousel__viewport">
        {safeImages.map((image, index) => {
          const isActive = index === activeIndex;
          const isLcpCandidate = priority && index === 0;

          if (!isActive && !mountedIndexes.has(index)) {
            return null;
          }

          return (
            <Image
              className={`product-image-carousel__image${isActive ? " is-active" : ""}`}
              key={image.src}
              src={image.src}
              alt={image.alt || getImageLabel(image)}
              aria-hidden={isActive ? undefined : "true"}
              fill
              sizes={sizes}
              preload={isLcpCandidate}
              fetchPriority={isLcpCandidate ? "high" : undefined}
              loading={isLcpCandidate ? undefined : "lazy"}
            />
          );
        })}

        {isCarousel && (
          <div className="product-image-carousel__controls">
            <button
              className="product-image-carousel__control"
              type="button"
              aria-label="Foto anterior"
              onClick={() => selectImage(activeIndex - 1)}
            >
              <span aria-hidden="true">←</span>
            </button>

            <button
              className="product-image-carousel__control"
              type="button"
              aria-label="Próxima foto"
              onClick={() => selectImage(activeIndex + 1)}
            >
              <span aria-hidden="true">→</span>
            </button>
          </div>
        )}
      </div>

      {isCarousel && (
        <span className="visually-hidden" aria-live="polite">
          Foto {activeIndex + 1} de {safeImages.length}: {getImageLabel(activeImage)}
        </span>
      )}
    </figure>
  );
}
