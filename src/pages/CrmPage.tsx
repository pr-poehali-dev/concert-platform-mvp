import { useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";

const CRM_PAGES = ["index", "deals", "companies", "tasks", "goals", "dashboard", "reports"];

const CrmPage = () => {
  const { page } = useParams<{ page?: string }>();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const resolvedPage = page && CRM_PAGES.includes(page) ? page : "index";

  useEffect(() => {
    if (page && !CRM_PAGES.includes(page)) {
      navigate("/crm");
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = '<div style="display:flex;justify-content:center;padding:48px;"><div style="width:32px;height:32px;border:3px solid #21262d;border-top-color:#a855f7;border-radius:50%;animation:spin 0.8s linear infinite;"></div></div><style>@keyframes spin{to{transform:rotate(360deg)}}</style>';

    fetch(`/crm/${resolvedPage}.html`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then((html) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        // Inject head styles/links
        doc.head.querySelectorAll("link[rel='stylesheet']").forEach((link) => {
          if (!document.querySelector(`link[href="${(link as HTMLLinkElement).href}"]`)) {
            document.head.appendChild(link.cloneNode(true));
          }
        });

        // Set body content (without script tags — we'll run them manually)
        const bodyClone = doc.body.cloneNode(true) as HTMLElement;
        bodyClone.querySelectorAll("script").forEach((s) => s.remove());
        container.innerHTML = bodyClone.innerHTML;

        // Collect external scripts from head + body in order
        const allScripts = [
          ...Array.from(doc.head.querySelectorAll("script")),
          ...Array.from(doc.body.querySelectorAll("script")),
        ];

        const extSrcs = allScripts
          .filter((s) => (s as HTMLScriptElement).src)
          .map((s) => (s as HTMLScriptElement).src);

        const inlineCodes = allScripts
          .filter((s) => !(s as HTMLScriptElement).src && s.textContent?.trim())
          .map((s) => s.textContent || "");

        // Load external scripts sequentially (skip already loaded)
        const loadNext = (idx: number): Promise<void> => {
          if (idx >= extSrcs.length) return Promise.resolve();
          const src = extSrcs[idx];
          const already = document.querySelector(`script[data-crm="${src}"]`);
          if (already) return loadNext(idx + 1);
          return new Promise((res) => {
            const el = document.createElement("script");
            el.src = src;
            el.setAttribute("data-crm", src);
            el.onload = () => res();
            el.onerror = () => res();
            document.head.appendChild(el);
          }).then(() => loadNext(idx + 1));
        };

        loadNext(0).then(() => {
          inlineCodes.forEach((code) => {
            try {
               
              new Function(code)();
            } catch (e) {
              console.error("[CRM] script error:", e);
            }
          });
        });
      })
      .catch((e) => {
        container.innerHTML = `<div style="color:#f43f5e;padding:32px;text-align:center;font-family:sans-serif;">
          <div style="font-size:48px;margin-bottom:16px;">⚠️</div>
          <div style="font-size:16px;">Ошибка загрузки CRM</div>
          <div style="font-size:12px;color:#8b949e;margin-top:8px;">${e.message}</div>
          <button onclick="location.reload()" style="margin-top:16px;padding:8px 16px;background:#a855f7;color:#fff;border:none;border-radius:6px;cursor:pointer;">Обновить</button>
        </div>`;
      });

    // Intercept CRM internal links → React Router navigation
    const handleClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.getAttribute("href") || "";
      const match = href.match(/\/crm\/(\w+)\.html/);
      if (match) {
        e.preventDefault();
        navigate(`/crm/${match[1]}`);
      }
    };

    container.addEventListener("click", handleClick);
    return () => {
      container.removeEventListener("click", handleClick);
    };
  }, [resolvedPage, navigate, page]);

  return (
    <div
      ref={containerRef}
      style={{
        minHeight: "100vh",
        background: "#0d1117",
        color: "#f0f6fc",
      }}
    />
  );
};

export default CrmPage;
