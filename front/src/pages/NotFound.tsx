import { Link } from 'react-router-dom';
import BrandLogo from '@/components/base/BrandLogo';

export default function NotFound() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#090909] px-4 py-24 text-white sm:px-6 lg:px-8">
      <div className="absolute inset-0">
        <img src="/images/home/hero.jpg" alt="" className="h-full w-full object-cover object-center opacity-24" />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(6,6,6,0.98)_0%,rgba(9,9,9,0.88)_48%,rgba(9,9,9,0.76)_100%)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(213,180,111,0.22),transparent_28%),radial-gradient(circle_at_82%_58%,rgba(255,255,255,0.08),transparent_28%)]"></div>
      <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#090909] to-transparent"></div>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-12rem)] max-w-5xl items-center justify-center text-center">
        <section>
          <BrandLogo
            to="/"
            className="inline-flex items-center justify-center"
            imageClassName="h-12 w-auto object-contain"
          />
          <div className="mt-10 flex items-center justify-center gap-4">
            <div className="h-px w-16 bg-[#d5b46f]"></div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/48">Page introuvable</p>
            <div className="h-px w-16 bg-[#d5b46f]"></div>
          </div>
          <h1 className="mt-7 text-[8rem] font-black leading-none text-white/10 sm:text-[12rem] lg:text-[16rem]">
            404
          </h1>

          <div className="-mt-4 flex justify-center sm:-mt-8">
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-full bg-[#d5b46f] px-7 py-4 text-sm font-semibold text-[#111] transition hover:bg-white"
            >
              <i className="ri-home-line mr-2"></i>
              Accueil C2P
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
