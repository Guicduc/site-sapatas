"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";

const AUTOPLAY_INTERVAL = 5600;

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
  const [isPaused, setIsPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const labelId = useId();
  const isCarousel = safeImages.length > 1;
  const activeImage = safeImages[activeIndex] || safeImages[0];

  useEffect(() => {
    setActiveIndex((current) => Math.min(current, Math.max(safeImages.length - 1, 0)));
  }, [safeImages.length]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updateMotionPreference();
    mediaQuery.addEventListener?.("change", updateMotionPreference);

    return () => mediaQuery.removeEventListener?.("change", updateMotionPreference);
  }, []);

  useEffect(() => {
    if (!isCarousel || prefersReducedMotion || isPaused || isHovered || isFocused) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % safeImages.length);
    }, AUTOPLAY_INTERVAL);

    return () => window.clearInterval(timer);
  }, [isCarousel, prefersReducedMotion, isPaused, isHovered, isFocused, safeImages.length]);

  const selectImage = useCallback(
    (nextIndex) => {
      setActiveIndex((current) => {
        const normalizedIndex = (nextIndex + safeImages.length) % safeImages.length;
        return normalizedIndex === current ? current : normalizedIndex;
      });
      setIsPaused(true);
    },
    [safeImages.length]
  );

  function handleFocus(event) {
    setIsFocused(true);
    event.currentTarget.dataset.focusWithin = "true";
  }

  function handleBlur(event) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsFocused(false);
      delete event.currentTarget.dataset.focusWithin;
    }
  }

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
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={handleFocus}
      onBlur={handleBlur}
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
      </div>

      <figcaption id={labelId} className="product-image-carousel__caption">
        {getImageLabel(activeImage)}
      </figcaption>

      {isCarousel && (
        <div className="product-image-carousel__controls" aria-describedby={labelId}>
          <button
            className="product-image-carousel__control"
            type="button"
            aria-label="Foto anterior"
            onClick={() => selectImage(activeIndex - 1)}
          >
            <span aria-hidden="true">←</span>
          </button>

          <div className="product-image-carousel__dots" role="tablist" aria-label="Selecionar foto">
            {safeImages.map((image, index) => (
              <button
                className="product-image-carousel__dot"
                key={image.src}
                type="button"
                role="tab"
                aria-label={`Ver ${getImageLabel(image)}`}
                aria-selected={index === activeIndex}
                onClick={() => selectImage(index)}
              />
            ))}
          </div>

          <button
            className="product-image-carousel__control"
            type="button"
            aria-label="Próxima foto"
            onClick={() => selectImage(activeIndex + 1)}
          >
            <span aria-hidden="true">→</span>
          </button>

          <button
            className="product-image-carousel__pause"
            type="button"
            aria-pressed={isPaused || prefersReducedMotion}
            disabled={prefersReducedMotion}
            onClick={() => setIsPaused((current) => !current)}
          >
            {prefersReducedMotion
              ? "Fotos sem autoplay"
              : isPaused
                ? "Reproduzir fotos"
                : "Pausar fotos"}
          </button>

          <span className="visually-hidden" aria-live={isPaused ? "polite" : "off"}>
            Foto {activeIndex + 1} de {safeImages.length}: {getImageLabel(activeImage)}
          </span>
        </div>
      )}
    </figure>
  );
}
