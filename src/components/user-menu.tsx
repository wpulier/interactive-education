"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";

export function UserMenu() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (status === "loading") {
    return <div className="w-8 h-8 rounded-full bg-[var(--bg2)]" />;
  }

  if (!session?.user) {
    return (
      <button
        onClick={() => signIn("google")}
        className="text-sm px-4 py-2 rounded-lg border border-[var(--border)] hover:bg-[var(--bg2)] transition-colors"
      >
        Sign in
      </button>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full hover:ring-2 ring-[var(--accent-med)] transition-all"
      >
        {session.user.image ? (
          <img
            src={session.user.image}
            alt=""
            className="w-8 h-8 rounded-full"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-[var(--accent)] flex items-center justify-center text-white text-sm font-medium">
            {session.user.name?.[0]?.toUpperCase() || "?"}
          </div>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-[var(--border)] bg-[var(--bg)] shadow-lg py-1 z-50">
          <div className="px-4 py-2 border-b border-[var(--border)]">
            <p className="text-sm font-medium truncate">{session.user.name}</p>
            <p className="text-xs text-[var(--text3)] truncate">{session.user.email}</p>
          </div>
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm hover:bg-[var(--bg2)] transition-colors"
          >
            Profile
          </Link>
          <Link
            href="/generate"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm hover:bg-[var(--bg2)] transition-colors"
          >
            Generate Lessons
          </Link>
          <button
            onClick={() => signOut()}
            className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--bg2)] transition-colors text-[var(--text2)]"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
