import React from 'react';
import Lottie from 'lottie-react';
// @ts-ignore
import goalAnimation from '../assets/images/GOAL Celebrate Every Win.json';

interface MessiSpinnerProps {
  text?: string;
}

export default function MessiSpinner({ text = "Cargando..." }: MessiSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center p-6 w-full">
      {/* LOTTIE ANIMATION */}
      <div className="w-36 h-36 md:w-48 md:h-48 flex items-center justify-center select-none overflow-hidden">
        <Lottie 
          animationData={goalAnimation} 
          loop={true} 
          className="w-full h-full"
        />
      </div>
      
      {/* TEXTO DE CARGA COMPACTO */}
      {text && (
        <p className="mt-4 text-xs md:text-sm font-black tracking-widest uppercase text-slate-500 animate-pulse text-center">
          {text}
        </p>
      )}
    </div>
  );
}
