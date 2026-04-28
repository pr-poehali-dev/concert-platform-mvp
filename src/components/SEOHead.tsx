import { useEffect } from "react";

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  ogType?: string;
  canonical?: string;
  noindex?: boolean;
}

const BASE_URL = "https://concert-platform-mvp.poehali.dev";
const DEFAULT_OG_IMAGE = "https://cdn.poehali.dev/projects/1ed8ea58-594e-40fe-8962-42d12ff34e0f/files/c969ae71-7a9a-4f65-b744-3969d9375dbb.jpg";

export default function SEOHead({
  title,
  description,
  keywords,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = "website",
  canonical,
  noindex = false,
}: SEOHeadProps) {
  useEffect(() => {
    const fullTitle = title
      ? `${title} — GLOBAL LINK`
      : "GLOBAL LINK — платформа для организаторов концертов и площадок";

    // Title
    document.title = fullTitle;

    // Функция обновления или создания мета-тега
    const setMeta = (selector: string, attr: string, value: string) => {
      let el = document.querySelector(selector) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        if (selector.startsWith("[property")) {
          el.setAttribute("property", selector.slice(10, -2));
        } else if (selector.startsWith("[name")) {
          el.setAttribute("name", selector.slice(6, -2));
        }
        document.head.appendChild(el);
      }
      el.setAttribute(attr, value);
    };

    // Canonical
    const canonicalHref = canonical ? `${BASE_URL}${canonical}` : BASE_URL + "/";
    let canonicalEl = document.querySelector("link[rel='canonical']") as HTMLLinkElement | null;
    if (!canonicalEl) {
      canonicalEl = document.createElement("link");
      canonicalEl.rel = "canonical";
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.href = canonicalHref;

    // Robots
    if (noindex) {
      setMeta("[name='robots']", "content", "noindex, nofollow");
    } else {
      setMeta("[name='robots']", "content", "index, follow, max-snippet:-1, max-image-preview:large");
    }

    // Description
    if (description) {
      setMeta("[name='description']", "content", description);
      setMeta("[property='og:description']", "content", description);
      setMeta("[name='twitter:description']", "content", description);
    }

    // Keywords
    if (keywords) {
      setMeta("[name='keywords']", "content", keywords);
    }

    // OG
    setMeta("[property='og:title']", "content", fullTitle);
    setMeta("[property='og:type']", "content", ogType);
    setMeta("[property='og:url']", "content", canonicalHref);
    setMeta("[property='og:image']", "content", ogImage);
    setMeta("[name='twitter:title']", "content", fullTitle);
    setMeta("[name='twitter:image']", "content", ogImage);
    setMeta("[name='twitter:card']", "content", "summary_large_image");

  }, [title, description, keywords, ogImage, ogType, canonical, noindex]);

  return null;
}

// ── Пресеты для каждой страницы ─────────────────────────────────────────────
export const SEO_PAGES = {
  home: {
    title: undefined,
    description: "Организуйте концерты и туры по всей России. 500+ площадок, ЭДО с подписью, финансы и P&L, CRM, логистика команды — всё в одном сервисе.",
    keywords: "организация концертов, аренда концертной площадки, тур-менеджмент, концертный зал, бронирование площадки",
    canonical: "/",
  },
  presentation: {
    title: "Презентация платформы",
    description: "15 слайдов о возможностях GLOBAL LINK — поиск площадок, ЭДО, финансы, CRM, логистика и синхронизация билетов.",
    canonical: "/presentation",
  },
  investor: {
    title: "Инвестиционная презентация",
    description: "GLOBAL LINK — Pre-seed раунд. Рынок ₽48 млрд, готовый MVP, 500+ площадок. Инвестиционный запрос ₽30 млн.",
    canonical: "/investor",
    noindex: true, // закрываем от индексации — только для инвесторов
  },
  privacy: {
    title: "Политика конфиденциальности",
    description: "Политика конфиденциальности и обработки персональных данных GLOBAL LINK.",
    canonical: "/privacy",
  },
  login: {
    title: "Войти в систему",
    description: "Войдите в личный кабинет GLOBAL LINK — платформы для организаторов концертов.",
    canonical: "/login",
    noindex: true,
  },
} as const;
