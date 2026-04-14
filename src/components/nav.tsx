"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";

export function Nav() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const links = [
    { href: "/", label: "Home" },
    { href: "/generate", label: "Generate" },
    { href: "/profile", label: "Profile" },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <nav
      className="sticky top-0 z-50 border-b backdrop-blur-md"
      style={{
        borderColor: "var(--border)",
        background: "color-mix(in srgb, var(--bg) 85%, transparent)",
      }}
    >
      <div className="max-w-[720px] mx-auto px-6 flex items-center justify-between h-12">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="font-serif text-lg tracking-tight hover:text-[var(--accent)] transition-colors"
          >
            IE
          </Link>
          <div className="flex items-center gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-1.5 rounded-md text-sm transition-colors"
                style={{
                  color: isActive(link.href) ? "var(--accent)" : "var(--text2)",
                  background: isActive(link.href) ? "var(--accent-light)" : "transparent",
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Auth */}
        <div>
          {status === "loading" ? (
            <div className="w-7 h-7 rounded-full bg-[var(--bg2)]" />
          ) : !session?.user ? (
            <button
              onClick={() => signIn()}
              className="text-sm px-3 py-1.5 rounded-md border border-[var(--border)] hover:bg-[var(--bg2)] transition-colors"
            >
              Sign in
            </button>
          ) : (
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 rounded-full hover:ring-2 ring-[var(--accent-med)] transition-all"
              >
                {session.user.image ? (
                  <img
                    src={session.user.image}
                    alt=""
                    className="w-7 h-7 rounded-full"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[var(--accent)] flex items-center justify-center text-white text-xs font-medium">
                    {session.user.name?.[0]?.toUpperCase() || "?"}
                  </div>
                )}
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-[var(--border)] bg-[var(--bg)] shadow-lg py-1 z-50">
                  <div className="px-4 py-2 border-b border-[var(--border)]">
                    <p className="text-sm font-medium truncate">{session.user.name}</p>
                    <p className="text-xs text-[var(--text3)] truncate">{session.user.email}</p>
                  </div>
                  <button
                    onClick={() => signOut()}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--bg2)] transition-colors text-[var(--text2)]"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
