import { useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const interactiveSelector = [
  'button',
  'a[href]',
].join(',');

const cardSelector = [
  'a.group',
  '.group.cursor-pointer',
  'section a[href*="/allopresta/"]',
  'section a[href*="/espace-numerique/"]',
  'section a[href*="/project-center/"]',
  '[class*="rounded-[22px]"]',
  '[class*="rounded-[24px]"]',
  '[class*="rounded-[26px]"]',
  '[class*="rounded-[28px]"]',
  '[class*="rounded-[30px]"]',
].join(',');

export function useGsapRouteAnimations(
  rootRef: React.RefObject<HTMLElement | null>,
  dependency: string
) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const cleanups: Array<() => void> = [];

    const ctx = gsap.context(() => {
      const sections = gsap.utils.toArray<HTMLElement>('section', root).filter(
        (section) => !section.closest('nav') && !section.closest('footer')
      );
      const heroSection = sections[0];

      gsap.fromTo(
        root,
        { autoAlpha: 0, y: 14 },
        { autoAlpha: 1, y: 0, duration: 0.55, ease: 'power3.out' }
      );

      if (heroSection) {
        const heroImage = heroSection.querySelector('img');
        if (heroImage) {
          gsap.fromTo(
            heroImage,
            { scale: 1.08, autoAlpha: 0.25 },
            { scale: 1, autoAlpha: Number(gsap.getProperty(heroImage, 'opacity')) || 0.45, duration: 1.4, ease: 'power2.out' }
          );

          gsap.to(heroImage, {
            yPercent: 8,
            ease: 'none',
            scrollTrigger: {
              trigger: heroSection,
              start: 'top top',
              end: 'bottom top',
              scrub: true,
            },
          });
        }
      }

      const heroItems = heroSection?.querySelectorAll(
        'p, h1, h2, h3, a, button, input, [class*="grid"] > div'
      ) || [];

      if (heroItems.length) {
        gsap.fromTo(
          heroItems,
          { autoAlpha: 0, y: 34, filter: 'blur(8px)' },
          {
            autoAlpha: 1,
            y: 0,
            filter: 'blur(0px)',
            duration: 0.85,
            stagger: 0.075,
            ease: 'power3.out',
            delay: 0.08,
          }
        );
      }

      sections.slice(1).forEach((section) => {
        const directBlocks = Array.from(section.children).filter(
          (child) =>
            child instanceof HTMLElement &&
            !child.className.toString().includes('absolute') &&
            !child.className.toString().includes('fixed')
        );
        const sectionTitleItems = section.querySelectorAll('h2, h3, p[class*="tracking"], p[class*="leading"]');
        const targets = directBlocks.length ? directBlocks : Array.from(sectionTitleItems);
        if (!targets.length) return;

        gsap.fromTo(
          targets,
          { autoAlpha: 0, y: 42, filter: 'blur(6px)' },
          {
            autoAlpha: 1,
            y: 0,
            filter: 'blur(0px)',
            duration: 0.8,
            stagger: 0.08,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: section,
              start: 'top 82%',
              once: true,
            },
          }
        );
      });

      const sectionImages = gsap.utils.toArray<HTMLImageElement>('section:not(:first-child) img', root);
      sectionImages.forEach((image) => {
        if (image.closest('nav') || image.closest('footer')) return;

        gsap.fromTo(
          image,
          { scale: 1.08 },
          {
            scale: 1,
            duration: 1.1,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: image,
              start: 'top 88%',
              once: true,
            },
          }
        );
      });

      const cards = gsap.utils.toArray<HTMLElement>(cardSelector, root);
      cards.forEach((card) => {
        if (card.closest('nav') || card.closest('footer')) return;

        gsap.fromTo(
          card,
          { y: 28, scale: 0.985 },
          {
            y: 0,
            scale: 1,
            duration: 0.65,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: card,
              start: 'top 90%',
              once: true,
            },
          }
        );
      });

      const interactiveItems = gsap.utils.toArray<HTMLElement>(interactiveSelector, root);
      interactiveItems.forEach((item) => {
        if (item.closest('nav') || item.closest('footer')) return;

        const enter = () => gsap.to(item, { y: -2, scale: 1.015, duration: 0.22, ease: 'power2.out' });
        const leave = () => gsap.to(item, { y: 0, scale: 1, duration: 0.22, ease: 'power2.out' });

        item.addEventListener('mouseenter', enter);
        item.addEventListener('mouseleave', leave);

        cleanups.push(() => {
          item.removeEventListener('mouseenter', enter);
          item.removeEventListener('mouseleave', leave);
        });
      });
    }, root);

    ScrollTrigger.refresh();

    return () => {
      cleanups.forEach((cleanup) => cleanup());
      ctx.revert();
    };
  }, [rootRef, dependency]);
}
