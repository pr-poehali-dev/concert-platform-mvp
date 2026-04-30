import { useState, useEffect } from "react";
import SEOHead, { SEO_PAGES } from "@/components/SEOHead";
import { SLIDES } from "@/components/investor/InvestorShared";
import InvestorNavigation from "@/components/investor/InvestorNavigation";
import InvestorSlidesPart1 from "@/components/investor/InvestorSlidesPart1";
import InvestorSlidesPart2 from "@/components/investor/InvestorSlidesPart2";

export default function InvestorPresentationPage() {
  const [current, setCurrent] = useState(0);
  const total = SLIDES.length;

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (["ArrowRight", "ArrowDown", " "].includes(e.key)) {
        e.preventDefault();
        setCurrent(c => Math.min(c + 1, total - 1));
      }
      if (["ArrowLeft", "ArrowUp"].includes(e.key)) {
        e.preventDefault();
        setCurrent(c => Math.max(c - 1, 0));
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [total]);

  const goTo = (i: number) => {
    document.getElementById(`inv-slide-${i}`)?.scrollIntoView({ behavior: "smooth" });
    setCurrent(i);
  };

  useEffect(() => {
    document.getElementById(`inv-slide-${current}`)?.scrollIntoView({ behavior: "smooth" });
  }, [current]);

  return (
    <>
    <SEOHead {...SEO_PAGES.investor} />
    <div className="bg-[#04060e] text-white font-golos">

      <InvestorNavigation current={current} total={total} goTo={goTo} />

      <InvestorSlidesPart1 />
      <InvestorSlidesPart2 />

    </div>
    </>
  );
}
