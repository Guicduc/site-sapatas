// Identificadores estáveis que conectam manifestos aos renderizadores do configurador.
export const CONFIGURATOR_GEOMETRY_TYPES = Object.freeze([
  "tube-round",
  "tube-round-spherical",
  "tube-rect",
  "tube-oblong",
  "base-round",
  "base-round-screw",
  "base-rect",
  "base-rect-screw",
  "base-u"
]);

export function isKnownConfiguratorGeometry(type) {
  return CONFIGURATOR_GEOMETRY_TYPES.includes(type);
}
