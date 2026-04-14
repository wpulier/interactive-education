"use client";

import React, { useMemo, useState, useRef, useCallback, useEffect } from "react";
import { transform } from "sucrase";

interface DynamicLessonProps {
  code: string;
}

/**
 * Detects whether lesson code is a self-contained HTML artifact or legacy TSX.
 */
function isHtmlArtifact(code: string): boolean {
  const trimmed = code.trimStart();
  return trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html") || trimmed.startsWith("<!doctype");
}

/**
 * Renders an HTML artifact in a sandboxed iframe with auto-resize.
 */
function HtmlArtifactRenderer({ code }: { code: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(600);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === "lesson-resize" && typeof e.data.height === "number") {
        setHeight(e.data.height);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Inject resize observer script into the HTML if not already present
  const htmlWithResize = useMemo(() => {
    if (code.includes("lesson-resize")) return code;
    const resizeScript = `
<script>
(function() {
  function postHeight() {
    var h = document.documentElement.scrollHeight;
    window.parent.postMessage({ type: 'lesson-resize', height: h }, '*');
  }
  new ResizeObserver(postHeight).observe(document.body);
  window.addEventListener('load', function() { setTimeout(postHeight, 100); });
  postHeight();
})();
</script>`;
    // Insert before </body> or at end
    if (code.includes("</body>")) {
      return code.replace("</body>", resizeScript + "</body>");
    }
    return code + resizeScript;
  }, [code]);

  return (
    <iframe
      ref={iframeRef}
      srcDoc={htmlWithResize}
      sandbox="allow-scripts allow-same-origin"
      style={{
        width: "100%",
        height: `${height}px`,
        border: "none",
        overflow: "hidden",
        display: "block",
      }}
      title="Lesson content"
    />
  );
}

/**
 * Legacy renderer for TSX lessons stored before the HTML artifact format.
 * Uses Sucrase to compile TSX at runtime.
 */
function LegacyTsxRenderer({ code }: { code: string }) {
  const [error, setError] = useState<string | null>(null);

  const Component = useMemo(() => {
    try {
      // Strip "use client" directive
      let cleanCode = code.replace(/^"use client";\s*/m, "").replace(/^'use client';\s*/m, "");

      // Strip import statements BEFORE Sucrase — we inject globals manually
      cleanCode = cleanCode.replace(/^import\s+.*?from\s+['"].*?['"];?\s*$/gm, "");

      // Transform TSX → CJS JS
      const result = transform(cleanCode, {
        transforms: ["typescript", "jsx", "imports"],
        jsxRuntime: "classic",
        production: true,
      });

      const fn = new Function(
        "React",
        "useState",
        "useRef",
        "useCallback",
        "useEffect",
        "useMemo",
        `var exports = {}; var module = { exports: exports };
        ${result.code}
        return exports.default || module.exports.default || module.exports;`
      );

      const Comp = fn(React, useState, useRef, useCallback, useEffect, useMemo);
      if (!Comp || typeof Comp !== "function") {
        setError("Could not find a component to render");
        return null;
      }

      setError(null);
      return Comp;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to compile lesson";
      setError(msg);
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

export default function DynamicLesson({ code }: DynamicLessonProps) {
  if (isHtmlArtifact(code)) {
    return <HtmlArtifactRenderer code={code} />;
  }
  return <LegacyTsxRenderer code={code} />;
}
