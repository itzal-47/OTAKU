import { useState, useEffect, useCallback } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

interface OnboardingSlide {
  title: string;
  subtitle: string;
  character: string;
  background: string;
  bgAnimated?: string;
}

const slides: OnboardingSlide[] = [
  {
    title: "Bem-vindo ao OtakuKamba",
    subtitle: "A plataforma feita por angolanos, para angolanos",
    character: "🌸",
    background: "from-purple-950 via-bg to-purple-900",
    bgAnimated: "animate-pulse-slow"
  },
  {
    title: "Duelos Épicos",
    subtitle: "Escolhe a tua classe, treina o teu personagem e desafia outros otakus na arena",
    character: "⚔️",
    background: "from-red-950 via-bg to-red-900"
  },
  {
    title: "Itachi Uchiha",
    subtitle: "\"As pessoas vivem conectadas pelas escolhas que fazem...\"",
    character: "🥷",
    background: "from-gray-900 via-bg to-purple-950"
  },
  {
    title: "Goku",
    subtitle: "\"Eu sou o guerreiro mais forte do universo!\"",
    character: "🔥",
    background: "from-orange-950 via-bg to-red-900"
  },
  {
    title: "Madara Uchiha",
    subtitle: "\"O mundo é cruel. Mas também muito lindo.\"",
    character: "🌙",
    background: "from-purple-950 via-bg to-gray-900"
  },
  {
    title: "Monkey D. Luffy",
    subtitle: "\"Eu vou ser o Rei dos Piratas!\"",
    character: "🏴‍☠️",
    background: "from-red-950 via-bg to-orange-900"
  },
  {
    title: "Naruto Uzumaki",
    subtitle: "\"Eu nunca vou desistir! Essa é a minha ninja way!\"",
    character: "🌀",
    background: "from-orange-900 via-bg to-purple-950"
  },
  {
    title: "Comunidade",
    subtitle: "Feed, Stories, Grupos, Eventos - junta-te à família",
    character: "👥",
    background: "from-teal-950 via-bg to-purple-900"
  },
  {
    title: "Estás pronto?",
    subtitle: "O teu destino espera. A arena aguarda o teu nome.",
    character: "🗡️",
    background: "from-amber-950 via-bg to-red-900"
  }
];

interface OnboardingScreenProps {
  onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [fadeClass, setFadeClass] = useState('opacity-0 translate-y-4');

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeClass('opacity-100 translate-y-0');
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide(prev => {
        if (prev < slides.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (currentSlide === slides.length - 1) {
      const timer = setTimeout(() => {
        handleComplete();
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [currentSlide]);

  const handleComplete = useCallback(() => {
    setFadeClass('opacity-0 translate-y-4');
    setTimeout(() => {
      setIsVisible(false);
      onComplete();
    }, 500);
  }, [onComplete]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  if (!isVisible) return null;

  const slide = slides[currentSlide];

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center transition-all duration-700 bg-gradient-to-br ${slide.background}`}>
      {/* Animated background orbs - unique for this onboarding */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Large animated orbs */}
        <div
          className="absolute w-[600px] h-[600px] rounded-full blur-[100px] opacity-30 animate-float"
          style={{
            background: `radial-gradient(circle, rgba(var(--color-purple-rgb), 0.25) 0%, transparent 70%)`,
            left: '-20%',
            top: '-10%'
          }}
        />
        <div
          className="absolute w-[500px] h-[500px] rounded-full blur-[80px] opacity-25 animate-float"
          style={{
            background: `radial-gradient(circle, rgba(var(--color-red-rgb), 0.2) 0%, transparent 70%)`,
            right: '-15%',
            bottom: '-10%',
            animationDelay: '-4s'
          }}
        />
        <div
          className="absolute w-[400px] h-[400px] rounded-full blur-[90px] opacity-20 animate-float"
          style={{
            background: `radial-gradient(circle, rgba(var(--color-amber-rgb), 0.15) 0%, transparent 70%)`,
            left: '30%',
            bottom: '-20%',
            animationDelay: '-2s'
          }}
        />

        {/* Energy lines */}
        <div className="absolute inset-0">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="absolute h-px bg-gradient-to-r from-transparent via-white/10 to-transparent animate-energy-line"
              style={{
                width: '100%',
                top: `${10 + i * 12}%`,
                animationDelay: `${i * 0.4}s`,
                transform: `rotate(${-5 + i * 1.2}deg)`
              }}
            />
          ))}
        </div>

        {/* Floating particles */}
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/20 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`
            }}
          />
        ))}

        {/* Sparkle effect */}
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={`spark-${i}`}
            className="absolute w-2 h-2 bg-white/40 rounded-full animate-sparkle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      {/* Cinematic vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)] pointer-events-none" />

      {/* Content */}
      <div className={`relative z-10 text-center px-6 max-w-2xl mx-auto transition-all duration-700 ${fadeClass}`}>
        {/* Character emoji with glow */}
        <div className="relative inline-block mb-8">
          <div className="absolute inset-0 blur-2xl bg-white/20 scale-150" />
          <div className="relative text-8xl animate-bounce-slow">
            {slide.character}
          </div>
        </div>

        {/* Title with glow effect */}
        <h1 className="font-bebas text-5xl md:text-7xl tracking-wider text-white mb-6 leading-tight drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">
          {slide.title}
        </h1>

        {/* Subtitle */}
        <p className="text-lg md:text-xl text-white/80 font-rajdhani leading-relaxed mb-10 max-w-lg mx-auto">
          {slide.subtitle}
        </p>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? 'w-8 bg-white'
                  : index < currentSlide
                  ? 'w-2 bg-white/50'
                  : 'w-2 bg-white/20'
              }`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={prevSlide}
            disabled={currentSlide === 0}
            className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center text-white hover:bg-white/10 transition-all disabled:opacity-30"
          >
            <ChevronLeft size={20} />
          </button>

          <button
            onClick={nextSlide}
            className="px-8 py-3 bg-white text-bg rounded-xl font-rajdhani font-bold text-lg hover:bg-white/90 transition-all shadow-[0_0_30px_rgba(255,255,255,0.3)]"
          >
            {currentSlide === slides.length - 1 ? 'Começar' : 'Próximo'}
          </button>

          <button
            onClick={nextSlide}
            disabled={currentSlide === slides.length - 1}
            className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center text-white hover:bg-white/10 transition-all disabled:opacity-30"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Skip button */}
      <button
        onClick={handleComplete}
        className="absolute top-6 right-6 text-white/60 hover:text-white transition-colors flex items-center gap-2 text-sm font-rajdhani"
      >
        <X size={16} />
        Pular
      </button>

      {/* Slide counter */}
      <div className="absolute bottom-6 left-6 text-white/40 text-sm font-rajdhani">
        {currentSlide + 1} / {slides.length}
      </div>
    </div>
  );
}
