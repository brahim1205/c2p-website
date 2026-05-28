import { useEffect } from 'react';

const SITE_URL = 'https://c2p.sn';
const DEFAULT_IMAGE = `${SITE_URL}/images/home/hero.jpg`;

type PageMeta = {
  title: string;
  description: string;
  path: string;
  image?: string;
};

function setMeta(selector: string, attribute: 'content' | 'href', value: string) {
  const element = document.head.querySelector(selector);
  if (element) {
    element.setAttribute(attribute, value);
  }
}

export function usePageMeta({ title, description, path, image = DEFAULT_IMAGE }: PageMeta) {
  useEffect(() => {
    const url = `${SITE_URL}${path}`;
    document.title = title;
    setMeta('meta[name="description"]', 'content', description);
    setMeta('link[rel="canonical"]', 'href', url);
    setMeta('meta[property="og:title"]', 'content', title);
    setMeta('meta[property="og:description"]', 'content', description);
    setMeta('meta[property="og:url"]', 'content', url);
    setMeta('meta[property="og:image"]', 'content', image);
    setMeta('meta[name="twitter:title"]', 'content', title);
    setMeta('meta[name="twitter:description"]', 'content', description);
    setMeta('meta[name="twitter:image"]', 'content', image);
  }, [description, image, path, title]);
}
