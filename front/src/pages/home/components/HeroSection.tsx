import { Link } from 'react-router-dom';
import { useEffect, useState, useCallback, useRef } from 'react';

const slides = [
  {
    image: '/images/home/hero.jpg',
    tagline: 'Votre carrière, notre mission'
  },
  {
    image: '/images/home/global.jpg',
    tagline: 'Formations de qualité, résultats concrets'
  },
  {
    image: '/images/home/venture.jpg',
    tagline: "De l'idée à l'entreprise"
  }
];

const typeTexts = [
  'Formations',
  'Services',
  'Projets',
  'Carrières'
];

function FloatingElement({ delay, size, top, left, color }: { delay: number; size: number; top: string; left: string; color: string }) {
  return (
    <div
      className="absolute rounded-full opacity-20 pointer-events-none animate-float-slow"
      style={{
        width: size,
        height: size,
        top,
        left,
        background: color,
        animationDelay: `${delay}s`,
        filter: 'blur(1px)',
      }}
    />
  );
}

function AnimatedCounter({ end, suffix, label }: { end: number; suffix: string; label: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const duration = 2000;
          const startTime = performance.now();
          const animate = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 4);
            setCount(Math.floor(ease * end));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [end]);

  return (
    <div ref={ref} className="text-center group cursor-default">
      <div className="text-white font-bold text-2xl sm:text-3xl lg:text-5xl transition-transform duration-300 group-hover:scale-110">
        {count.toLocaleString('fr-FR')}{suffix}
      </div>
      <div className="text-white/60 text-[10px] sm:text-xs lg:text-sm mt-1 sm:mt-2 font-medium tracking-wide uppercase">{label}</div>
    </div>
  );
}

export default function HeroSection() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [typedText, setTypedText] = useState('');
  const [typeIndex, setTypeIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // Mouse parallax
  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };
    window.addEventListener('mousemove', handleMouse);
    return () => window.removeEventListener('mousemove', handleMouse);
  }, []);

  // Typewriter effect
  useEffect(() => {
    const currentWord = typeTexts[typeIndex];
    const typeSpeed = isDeleting ? 50 : 120;
    const pauseTime = 2000;

    const timer = setTimeout(() => {
      if (!isDeleting && typedText === currentWord) {
        setTimeout(() => setIsDeleting(true), pauseTime);
        return;
      }
      if (isDeleting && typedText === '') {
        setIsDeleting(false);
        setTypeIndex((prev) => (prev + 1) % typeTexts.length);
        return;
      }

      setTypedText((prev) =>
        isDeleting
          ? currentWord.slice(0, prev.length - 1)
          : currentWord.slice(0, prev.length + 1)
      );
    }, typeSpeed);

    return () => clearTimeout(timer);
  }, [typedText, isDeleting, typeIndex]);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  }, []);

  useEffect(() => {
    const interval = setInterval(nextSlide, 8000);
    return () => clearInterval(interval);
  }, [nextSlide]);

  return (
    <section className="relative h-screen w-full overflow-hidden">
      {/* Background Slideshow with subtle parallax */}
      {slides.map((slide, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-[1500ms] ease-in-out ${
            currentSlide === index ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            transform: `translate(${mousePos.x * 0.1}px, ${mousePos.y * 0.1}px) scale(1.02)`,
            transition: 'transform 0.3s ease-out, opacity 1.5s ease-in-out',
          }}
        >
          <img
            src={slide.image}
            alt="C2P"
            className="w-full h-full object-cover object-center"
          />
        </div>
      ))}

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#06053a]/70 via-[#06053a]/50 to-black/60"></div>

      {/* Animated decorative accents */}
      <div
        className="absolute top-[15%] right-[10%] w-[500px] h-[500px] rounded-full pointer-events-none animate-pulse-glow"
        style={{
          background: 'radial-gradient(circle, rgba(95,166,243,0.12) 0%, transparent 70%)',
          transform: `translate(${mousePos.x * -0.2}px, ${mousePos.y * -0.2}px)`,
          transition: 'transform 0.3s ease-out',
        }}
      />
      <div
        className="absolute bottom-[20%] left-[5%] w-[400px] h-[400px] rounded-full pointer-events-none animate-pulse-glow"
        style={{
          background: 'radial-gradient(circle, rgba(95,166,243,0.08) 0%, transparent 70%)',
          animationDelay: '2s',
          transform: `translate(${mousePos.x * -0.15}px, ${mousePos.y * -0.15}px)`,
          transition: 'transform 0.3s ease-out',
        }}
      />

      {/* Floating particles - hidden on mobile */}
      <div className="hidden sm:block">
        <FloatingElement delay={0} size={8} top="20%" left="15%" color="rgba(95,166,243,0.4)" />
        <FloatingElement delay={1.5} size={6} top="40%" left="80%" color="rgba(255,255,255,0.3)" />
        <FloatingElement delay={3} size={10} top="60%" left="25%" color="rgba(95,166,243,0.3)" />
        <FloatingElement delay={2} size={5} top="30%" left="60%" color="rgba(255,255,255,0.25)" />
        <FloatingElement delay={4} size={7} top="75%" left="70%" color="rgba(95,166,243,0.35)" />
        <FloatingElement delay={1} size={4} top="15%" left="45%" color="rgba(255,255,255,0.2)" />
      </div>

      {/* Hero Content */}
      <div className="relative z-10 h-full flex items-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto w-full">
          {/* Tagline Badge */}
          <div
            className={`mb-6 transition-all duration-1000 delay-200 ease-out ${
              isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            <span className="inline-flex items-center gap-2 bg-[#5fa6f3]/20 backdrop-blur-sm border border-[#5fa6f3]/30 text-[#5fa6f3] px-4 py-2.5 rounded-full text-sm font-medium">
              <span className="w-2 h-2 bg-[#5fa6f3] rounded-full animate-pulse"></span>
              {slides[currentSlide].tagline}
            </span>
          </div>

          {/* Main Title with typewriter */}
          <div
            className={`mb-6 transition-all duration-1000 ease-out ${
              isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <h1 className="text-white font-bold text-4xl sm:text-5xl lg:text-7xl leading-tight">
              Développez Votre<br />
              <span className="inline-flex items-baseline gap-3 flex-wrap">
                <span className="text-[#5fa6f3] relative">
                  {typedText}
                  <span className="absolute -right-1 top-0 h-full w-[3px] bg-[#5fa6f3] animate-pulse"></span>
                </span>
              </span>
            </h1>
          </div>

          <p
            className={`text-white/80 text-lg lg:text-xl max-w-2xl mb-10 leading-relaxed transition-all duration-1000 delay-300 ease-out ${
              isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            Le Centre de Développement et de Prestations Professionnels vous accompagne dans votre parcours à travers trois piliers : marketplace de services, formation continue et incubation de projets.
          </p>

          {/* CTA Buttons */}
          <div
            className={`flex flex-col sm:flex-row gap-4 mb-16 transition-all duration-1000 delay-500 ease-out ${
              isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <Link
              to="/auth/register"
              className="group inline-flex items-center justify-center gap-3 bg-[#5fa6f3] text-white px-8 py-4 rounded-xl font-semibold text-base hover:bg-[#27346b] hover:scale-105 active:scale-95 transition-all duration-300 whitespace-nowrap shadow-lg shadow-[#5fa6f3]/30 hover:shadow-[#5fa6f3]/50"
            >
              <span>Commencer maintenant</span>
              <div className="w-5 h-5 flex items-center justify-center transition-transform duration-300 group-hover:translate-x-1">
                <i className="ri-arrow-right-line"></i>
              </div>
            </Link>
            <Link
              to="/espace-numerique"
              className="group inline-flex items-center justify-center gap-3 bg-white/10 backdrop-blur-sm border border-white/30 text-white px-8 py-4 rounded-xl font-semibold text-base hover:bg-white/20 hover:border-white/50 hover:scale-105 active:scale-95 transition-all duration-300 whitespace-nowrap"
            >
              <span>Explorer les formations</span>
              <div className="w-5 h-5 flex items-center justify-center transition-transform duration-300 group-hover:translate-x-1">
                <i className="ri-compass-3-line"></i>
              </div>
            </Link>
          </div>

          {/* Stats Row with animated counters */}
          <div
            className={`flex flex-wrap gap-6 sm:gap-8 lg:gap-16 transition-all duration-1000 delay-700 ease-out ${
              isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <AnimatedCounter end={2500} suffix="+" label="Professionnels" />
            <AnimatedCounter end={150} suffix="+" label="Projets incubés" />
            <AnimatedCounter end={95} suffix="%" label="Satisfaction" />
            <AnimatedCounter end={1200} suffix="+" label="Prestataires" />
          </div>
        </div>
      </div>

      {/* Slide Indicators */}
      <div className="absolute bottom-8 right-8 z-20 flex items-center gap-3">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              currentSlide === index ? 'w-10 bg-[#5fa6f3]' : 'w-4 bg-white/40 hover:bg-white/60'
            }`}
          />
        ))}
      </div>

      {/* Scroll indicator */}
      <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 z-20 transition-all duration-1000 delay-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
        <a
          href="#services"
          className="flex flex-col items-center gap-2 text-white/50 hover:text-white transition-colors group"
        >
          <span className="text-xs tracking-wider uppercase group-hover:tracking-widest transition-all">Découvrir</span>
          <div className="w-6 h-10 border border-white/30 rounded-full flex items-start justify-center p-1.5 group-hover:border-white/60 transition-colors">
            <div className="w-1.5 h-3 bg-white/70 rounded-full animate-bounce group-hover:bg-white"></div>
          </div>
        </a>
      </div>
    </section>
  );
}
