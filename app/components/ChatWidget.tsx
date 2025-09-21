"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    Intercom?: (...args: unknown[]) => void;
  }
}

const INTERCOM_APP_ID = process.env.NEXT_PUBLIC_INTERCOM_APP_ID;

export function ChatWidget() {
  useEffect(() => {
    if (!INTERCOM_APP_ID || typeof window === "undefined" || window.Intercom) {
      return;
    }

    (function () {
      const w = window as typeof window & { Intercom?: (...args: unknown[]) => void };
      const ic = w.Intercom;
      if (typeof ic === "function") {
        ic("reattach_activator");
        ic("update", {});
        return;
      }

      const d = document;
      const i = function (...args: unknown[]) {
        (i as unknown as { q: unknown[][] }).q.push(args);
      } as unknown as ((...args: unknown[]) => void) & { q: unknown[][] };
      i.q = [];
      (w as unknown as { Intercom: typeof i }).Intercom = i;
      const l = function () {
        const s = d.createElement("script");
        s.type = "text/javascript";
        s.async = true;
        s.src = `https://widget.intercom.io/widget/${INTERCOM_APP_ID}`;
        const x = d.getElementsByTagName("script")[0];
        x?.parentNode?.insertBefore(s, x);
      };
      if (d.readyState === "complete") {
        l();
      } else {
        window.addEventListener("load", l, false);
      }
    })();

    const intercom = (window as unknown as { Intercom?: (...args: unknown[]) => void }).Intercom;
    if (typeof intercom === "function") {
      intercom("boot", {
        app_id: INTERCOM_APP_ID,
      });
    }

    return () => {
      const active = (window as unknown as { Intercom?: (...args: unknown[]) => void }).Intercom;
      if (typeof active === "function") {
        active("shutdown");
      }
      delete (window as unknown as { Intercom?: unknown }).Intercom;
    };
  }, []);

  return null;
}

export default ChatWidget;
