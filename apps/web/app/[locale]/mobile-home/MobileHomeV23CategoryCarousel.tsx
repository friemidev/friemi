"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import { withLocale } from "@/lib/routes";
import { cn } from "@/lib/utils";

type MobileHomeV23Category = {
  category: string;
  image: string;
  label: string;
};

type MobileHomeV23CategoryCarouselProps = {
  categories: MobileHomeV23Category[];
  locale: string;
};

const categoriesPerPage = 3;

export function MobileHomeV23CategoryCarousel({
  categories,
  locale,
}: MobileHomeV23CategoryCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [activePage, setActivePage] = useState(0);
  const categoryPages = useMemo(
    () =>
      Array.from({ length: Math.ceil(categories.length / categoriesPerPage) }, (_, index) =>
        categories.slice(
          index * categoriesPerPage,
          index * categoriesPerPage + categoriesPerPage,
        ),
      ),
    [categories],
  );

  const updateActivePage = useCallback(() => {
    const scroller = scrollerRef.current;

    if (!scroller || scroller.clientWidth === 0) {
      return;
    }

    const nextPage = Math.min(
      categoryPages.length - 1,
      Math.max(0, Math.round(scroller.scrollLeft / scroller.clientWidth)),
    );

    setActivePage(nextPage);
  }, [categoryPages.length]);

  const scrollToPage = useCallback((pageIndex: number) => {
    const scroller = scrollerRef.current;

    if (!scroller) {
      return;
    }

    scroller.scrollTo({
      behavior: "smooth",
      left: pageIndex * scroller.clientWidth,
    });
    setActivePage(pageIndex);
  }, []);

  return (
    <div className="-mx-5 mt-4 overflow-hidden bg-white">
      <div
        className="flex snap-x snap-mandatory overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onScroll={updateActivePage}
        ref={scrollerRef}
      >
        {categoryPages.map((page, pageIndex) => (
          <div
            key={`category-page-${pageIndex}`}
            className="grid min-w-full snap-start grid-cols-3 gap-2.5 px-5"
          >
            {page.map((item) => (
              <Link
                key={`${item.category}-${item.label}`}
                href={withLocale(
                  locale,
                  `/lobby?tab=nearby&category=${item.category}`,
                )}
                className="group flex h-[7.35rem] min-w-0 flex-col items-center justify-end overflow-hidden rounded-[1rem] bg-white"
                aria-label={item.label}
              >
                <Image
                  src={`/illustrations/png/${item.image}`}
                  alt=""
                  width={150}
                  height={120}
                  className="h-[5.85rem] w-full object-contain transition duration-300 group-active:scale-95"
                />
                <span className="-mt-1 max-w-full truncate px-1 text-[11px] font-extrabold text-[#123D31]">
                  {item.label}
                </span>
              </Link>
            ))}
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-1.5 pb-2 pt-1">
        {categoryPages.map((_, index) => (
          <button
            aria-label={`Go to category page ${index + 1}`}
            aria-current={activePage === index ? "true" : undefined}
            className={cn(
              "h-2 rounded-full transition-all duration-200",
              activePage === index ? "w-4 bg-[#9F9E95]" : "w-2 bg-[#D9D9D2]",
            )}
            key={`category-dot-${index}`}
            onClick={() => scrollToPage(index)}
            type="button"
          />
        ))}
      </div>
    </div>
  );
}
