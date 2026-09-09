export function getProductionHandoffHttpError(error) {
  const code = String(error?.code || "production_system_request_failed");
  const status = code === "production_system_unauthorized"
    ? 401
    : code === "production_work_not_found"
      ? 404
      : code.includes("conflict")
        || code === "production_milestone_transition_invalid"
        || code === "production_milestone_out_of_order"
        || code === "production_work_not_acknowledged"
        || code === "production_work_not_released"
        || code === "production_order_not_active"
        ? 409
        : code.endsWith("_invalid") || code === "production_work_not_eligible"
          ? 400
          : code === "production_system_disabled"
            || code === "production_system_not_active"
            || code === "production_system_not_configured"
            || code === "production_system_mode_invalid"
            || code === "production_system_requires_postgres"
            ? 503
            : 500;

  return {
    status,
    body: {
      error: status === 500 ? "production_system_request_failed" : code,
      message: status === 500
        ? "Nao foi possivel processar a integracao de producao."
        : error?.message || "Nao foi possivel processar a integracao de producao."
    }
  };
}
