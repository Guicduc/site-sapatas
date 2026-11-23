// Consulta unica de /api/demo-session no navegador, compartilhada pelos carregadores de
// medicao e de anuncios. Falha na consulta conta como demonstracao (nao mede).
let pending = null;

export function fetchDemoSessionActive() {
  if (!pending) {
    pending = fetch("/api/demo-session", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => payload?.active === true)
      .catch(() => {
        pending = null;
        return true;
      });
  }

  return pending;
}
