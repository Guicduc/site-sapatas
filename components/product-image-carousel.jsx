"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

function getImageLabel(image) {
  return image?.label || image?.title || "Foto do produto";
}

export function ProductImageCarousel({
  images,
  label = "Fotos do produto",
  aspectRatio = "1.55 / 1",
  className = ""
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
  const isCarousel = safeImages.length > 1;
  const activeImage = safeImages[activeIndex] || safeImages[0];

  useEffect(() => {
    setActiveIndex((current) => Math.min(current, Math.max(safeImages.length - 1, 0)));
  }, [safeImages.length]);

  const selectImage = useCallback(
    (nextIndex) => {
      setActiveIndex((current) => {
        const normalizedIndex = (nextIndex + safeImages.length) % safeImages.length;
        return normalizedIndex === current ? current : normalizedIndex;
      });
    },
    [safeImages.length]
  );

  if (!activeImage) {
    return null;
  }

  return (
    <figure
      className={`product-image-carousel${className ? ` ${className}` : ""}`}
      style={{ "--product-image-carousel-aspect-ratio": aspectRatio }}
      role={isCarousel ? "region" : undefined}
      aria-roledescription={isCarousel ? "carrossel" : undefined}
      aria-label={isCarousel ? label : undefined}
    >
      <div className="product-image-carousel__viewport">
        {safeImages.map((image, index) => {
          const isActive = index === activeIndex;

          return (
            <img
              className={`product-image-carousel__image${isActive ? " is-active" : ""}`}
              key={image.src}
              src={image.src}
              alt={isActive ? image.alt : ""}
              aria-hidden={isActive ? undefined : "true"}
              loading={index === 0 ? "eager" : "lazy"}
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
