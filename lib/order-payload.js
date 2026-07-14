export function buildConfiguratorOrderPayload({
  customer,
  shippingAddress,
  couponCode,
  items
}) {
  return {
    source: "configurator",
    customer,
    shippingAddress,
    couponCode,
    notes: "",
    items: (items || []).map(({ measurementSystem: _measurementSystem, ...item }) => ({
      ...item,
      values: { ...(item.values || {}) }
    }))
  };
}
