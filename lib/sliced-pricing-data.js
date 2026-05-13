// Pre-sliced Orca references used by the public configurator.
// Source study: sapata-lisa-redonda, OrcaSlicer 2.3.2, Bambu A1 0.4, Generic TPU.

export const slicedPricingReferences = [
  reference("SLR-SF-D16-H3", "sem_furo", 16, 3, 0, 0.5, 3),
  reference("SLR-SF-D20-H3", "sem_furo", 20, 3, 0, 0.8, 3),
  reference("SLR-SF-D24-H4", "sem_furo", 24, 4, 0, 1.2, 5),
  reference("SLR-SF-D28-H4", "sem_furo", 28, 4, 0, 1.6, 6),
  reference("SLR-SF-D32-H5", "sem_furo", 32, 5, 0, 2.3, 8),
  reference("SLR-SF-D36-H5", "sem_furo", 36, 5, 0, 2.9, 9),
  reference("SLR-SF-D40-H6", "sem_furo", 40, 6, 0, 3.9, 12),
  reference("SLR-SF-D45-H6", "sem_furo", 45, 6, 0, 4.9, 14),
  reference("SLR-SF-D50-H8", "sem_furo", 50, 8, 0, 7, 20),
  reference("SLR-SF-D60-H8", "sem_furo", 60, 8, 0, 10, 27),
  reference("SLR-CF-D30-H4-F4", "com_furo", 30, 4, 4, 1.9, 6),
  reference("SLR-CF-D40-H5-F5", "com_furo", 40, 5, 5, 3.6, 11),
  reference("SLR-CF-D50-H6-F6", "com_furo", 50, 6, 6, 6, 17),
  reference("SLR-CF-D60-H8-F8", "com_furo", 60, 8, 8, 10, 27)
];

function reference(sampleId, variantSlug, diametro, altura, diametroFuro, materialGrams, printMinutes) {
  return {
    familySlug: "sapata-lisa-redonda",
    variantSlug,
    sampleId,
    siteCategorySlug: "sapata-base-lisa",
    siteFormatSlug: "redonda",
    dimensions: {
      diametro,
      altura,
      diametroFuro
    },
    quantity: 1,
    modelFile: `sapata-lisa-redonda__${sampleId}.3mf`,
    gcodeFile: `sapata-lisa-redonda__${sampleId}.gcode`,
    materialGrams,
    printMinutes,
    orcaVersion: "2.3.2",
    profileId: "bambu-a1-0.4-generic-tpu",
    slicedAt: "2026-05-07T02:13:52.000Z"
  };
}
