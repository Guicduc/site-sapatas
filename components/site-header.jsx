"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { useCart } from "@/components/cart-provider";
import { brand, navigation } from "@/lib/site-data";

function isActive(pathname, href) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { count } = useCart();

  return (
    <header className="site-header">
      <Link className="brand-mark" href="/" onClick={() => setOpen(false)}>
        <img className="brand-mark__icon" src="/brand/traco-base-mark.svg" alt="" aria-hidden="true" />
        <span>
          <strong>{brand.name}</strong>
          <small>{brand.tagline}</small>
        </span>
      </Link>

      <button
        type="button"
        className="nav-toggle"
        aria-expanded={open}
        aria-controls="primary-navigation"
        onClick={() => setOpen((value) => !value)}
      >
        Menu
      </button>

      <nav
        id="primary-navigation"
        className={`site-nav${open ? " is-open" : ""}`}
        aria-label="Principal"
      >
        {navigation.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${isActive(pathname, item.href) ? "is-active" : ""}${
              item.href === "/carrinho" ? " cart-link" : ""
            }`}
            onClick={() => setOpen(false)}
          >
            <span>{item.label}</span>
            {item.href === "/carrinho" && <span className="cart-count">{count}</span>}
          </Link>
        ))}
      </nav>
    </header>
  );
}
