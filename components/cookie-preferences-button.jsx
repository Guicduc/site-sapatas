"use client";

import { COOKIE_PREFERENCES_OPEN_EVENT } from "@/lib/cookie-consent";

export function CookiePreferencesButton() {
  function openPreferences() {
    window.dispatchEvent(new Event(COOKIE_PREFERENCES_OPEN_EVENT));
  }

  return (
    <button className="footer-link-button" type="button" onClick={openPreferences}>
      Preferências de cookies
    </button>
  );
}
