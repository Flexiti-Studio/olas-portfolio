'use client';

import { useState, useEffect, useRef } from 'react';

interface ProjectGalleryProps {
  mainImage: string;
  images: string[];
  title: string;
}

export function ProjectGallery({ mainImage, images, title }: ProjectGalleryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const slideInterval = useRef<NodeJS.Timeout | null>(null);

  const galleryImages = images.length > 0 ? images : [mainImage].filter(Boolean);

  // Auto slider logic
  useEffect(() => {
    if (isOpen && isPlaying && galleryImages.length > 1) {
      slideInterval.current = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % galleryImages.length);
      }, 3000); // Change image every 3 seconds
    } else {
      if (slideInterval.current) {
        clearInterval(slideInterval.current);
      }
    }

    return () => {
      if (slideInterval.current) {
        clearInterval(slideInterval.current);
      }
    };
  }, [isOpen, isPlaying, galleryImages.length]);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlaying(false); // Pause auto-play on manual control
    setCurrentIndex((prevIndex) => (prevIndex - 1 + galleryImages.length) % galleryImages.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlaying(false); // Pause auto-play on manual control
    setCurrentIndex((prevIndex) => (prevIndex + 1) % galleryImages.length);
  };

  const selectImage = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlaying(false); // Pause auto-play on manual control
    setCurrentIndex(index);
  };

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlaying(!isPlaying);
  };

  const openGallery = () => {
    setIsOpen(true);
    setCurrentIndex(0);
    setIsPlaying(true);
  };

  const closeGallery = () => {
    setIsOpen(false);
    if (slideInterval.current) {
      clearInterval(slideInterval.current);
    }
  };

  // Close modal on escape key press or navigation on arrow keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        closeGallery();
      } else if (e.key === 'ArrowRight') {
        setIsPlaying(false);
        setCurrentIndex((prevIndex) => (prevIndex + 1) % galleryImages.length);
      } else if (e.key === 'ArrowLeft') {
        setIsPlaying(false);
        setCurrentIndex((prevIndex) => (prevIndex - 1 + galleryImages.length) % galleryImages.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, galleryImages.length]);

  return (
    <>
      {/* Main Image Clickable Container */}
      <div 
        onClick={openGallery}
        className="order-1 lg:order-2 w-full h-full min-h-[300px] lg:min-h-[400px] rounded-[2rem] overflow-hidden shadow-2xl bg-[#1a2333] relative group border border-[#e5e7eb] dark:border-[#222f49] cursor-zoom-in"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent opacity-60 z-10 pointer-events-none mix-blend-overlay"></div>
        
        {/* Gallery indicator badge */}
        <div className="absolute bottom-6 right-6 z-20 bg-black/60 backdrop-blur-md text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 border border-white/10 group-hover:scale-105 transition-transform shadow-lg">
          <span className="material-symbols-outlined text-[16px]">photo_library</span>
          <span>View Gallery ({galleryImages.length})</span>
        </div>

        {/* Hover zoom message */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 flex flex-col items-center justify-center gap-2">
          <div className="w-12 h-12 rounded-full bg-primary/80 flex items-center justify-center text-white shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300">
            <span className="material-symbols-outlined text-2xl">fullscreen</span>
          </div>
          <span className="text-white text-sm font-bold tracking-wide">Click to view Gallery</span>
        </div>

        <div 
          className="w-full h-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105" 
          style={{ backgroundImage: `url('${mainImage}')` }}
        ></div>
      </div>

      {/* Pop-up Gallery Lightbox Modal */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md p-4 md:p-8 transition-opacity duration-300"
          onClick={closeGallery}
        >
          {/* Close button top right */}
          <button 
            onClick={closeGallery}
            className="absolute top-6 right-6 z-50 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all shadow-md cursor-pointer hover:rotate-90 duration-300 border border-white/10"
            aria-label="Close Gallery"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>

          {/* Title & Stats top left */}
          <div className="absolute top-6 left-6 z-50 text-white/90 hidden md:block">
            <h3 className="text-lg font-black">{title}</h3>
            <p className="text-xs text-white/50 font-bold mt-1">
              Screenshot {currentIndex + 1} of {galleryImages.length}
            </p>
          </div>

          {/* Controls Bar at the top middle */}
          <div className="absolute top-6 z-50 flex items-center gap-4 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
            <button 
              onClick={togglePlay}
              className="text-white hover:text-primary transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">
                {isPlaying ? 'pause' : 'play_arrow'}
              </span>
              <span>{isPlaying ? 'Auto-Play On' : 'Auto-Play Paused'}</span>
            </button>
          </div>

          {/* Active Image Viewport */}
          <div 
            className="relative w-full max-w-[1100px] h-[55vh] md:h-[70vh] flex items-center justify-center select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Previous Button */}
            {galleryImages.length > 1 && (
              <button 
                onClick={handlePrev}
                className="absolute left-0 md:-left-20 z-40 p-4 rounded-2xl bg-white/5 text-white hover:bg-white/15 transition-all shadow-lg hover:-translate-x-1 cursor-pointer border border-white/5"
                aria-label="Previous Image"
              >
                <span className="material-symbols-outlined text-2xl">arrow_back_ios_new</span>
              </button>
            )}

            {/* Main Active image container */}
            <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black/40">
              <img 
                src={galleryImages[currentIndex]} 
                alt={`${title} screenshot ${currentIndex + 1}`}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Next Button */}
            {galleryImages.length > 1 && (
              <button 
                onClick={handleNext}
                className="absolute right-0 md:-right-20 z-40 p-4 rounded-2xl bg-white/5 text-white hover:bg-white/15 transition-all shadow-lg hover:translate-x-1 cursor-pointer border border-white/5"
                aria-label="Next Image"
              >
                <span className="material-symbols-outlined text-2xl">arrow_forward_ios</span>
              </button>
            )}
          </div>

          {/* Thumbnails strip or dot indicators */}
          <div 
            className="flex flex-col items-center gap-4 mt-6 max-w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Thumbnail Images */}
            {galleryImages.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto py-2 max-w-full px-4 scrollbar-none">
                {galleryImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => selectImage(idx, e)}
                    className={`relative w-16 h-10 md:w-20 md:h-12 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 cursor-pointer ${
                      idx === currentIndex ? 'border-primary scale-105 shadow-md shadow-primary/20' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Dots */}
            {galleryImages.length > 1 && (
              <div className="flex gap-2">
                {galleryImages.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => selectImage(idx, e)}
                    className={`w-2 h-2 rounded-full transition-all duration-300 cursor-pointer ${
                      idx === currentIndex ? 'bg-primary w-6' : 'bg-white/40 hover:bg-white/60'
                    }`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
