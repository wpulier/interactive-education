"use client";

import React, { useMemo, useState, useRef, useCallback, useEffect } from "react";
import { transform } from "sucrase";

interface DynamicLessonProps {
  code: string;
}

export default function DynamicLesson({ code }: DynamicLessonProps) {
  const [error, setError] = useState<string | null>(null);

  const Component = useMemo(() => {
    try {
      // Strip "use client" directive — it's not valid in runtime eval
      let cleanCode = code.replace(/^"use client";\s*/m, "").replace(/^'use client';\s*/m, "");

      // Remove import statements — we inject React as a global
      cleanCode = cleanCode.replace(/^import\s+.*?from\s+['"].*?['"];?\s*$/gm, "");

      // Transform TSX → JS
      const result = transform(cleanCode, {
        transforms: ["typescript", "jsx"],
        jsxRuntime: "classic",
        production: true,
      });

      // Create a function that returns the component
      // Provide React and all hooks in scope
      const fn = new Function(
        "React",
        "useState",
        "useRef",
        "useCallback",
        "useEffect",
        "useMemo",
        `${result.code}

        // Find the default export
        // The transformed code should have a function declaration or assignment
        // Try to find and return it
        const __exports = {};
        try {
          // Look for "export default function X" → becomes "function X"
          const match = ${JSON.stringify(result.code)}.match(/^(?:export\\s+default\\s+)?function\\s+(\\w+)/m);
          if (match && typeof eval(match[1]) === 'function') {
            return eval(match[1]);
          }
        } catch {}
        return null;`
      );

      const Comp = fn(React, useState, useRef, useCallback, useEffect, useMemo);
      if (!Comp) {
        setError("Could not find a component to render");
        return null;
      }

      setError(null);
      return Comp;
    } catch (e: any) {
      setError(e.message || "Failed to compile lesson");
      return null;
    }
  }, [code]);

  if (error) {
    return (
      <div className="max-w-[720px] mx-auto px-6 py-10">
        <div
          className="rounded-lg p-5 text-sm"
          style={{
            background: "var(--accent-light)",
            borderLeft: "3px solid #e74c3c",
          }}
        >
          <p className="font-medium mb-2">Lesson rendering error</p>
          <pre className="text-xs overflow-x-auto whitespace-pre-wrap" style={{ color: "var(--text2)" }}>
            {error}
          </pre>
        </div>
      </div>
    );
  }

  if (!Component) {
    return (
      <div className="max-w-[720px] mx-auto px-6 py-10">
        <p className="text-sm" style={{ color: "var(--text3)" }}>
          Loading lesson...
        </p>
      </div>
    );
  }

  return <Component />;
}
