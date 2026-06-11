import React from 'react';
import { Award, Sparkles, Trophy, ShieldCheck, Heart } from 'lucide-react';

interface PrizesTabProps {
  prizes: { first: string; second: string; third: string };
}

export const PrizesTab: React.FC<PrizesTabProps> = ({ prizes }) => {
  return (
    <div id="prizes-tab-view" className="space-y-6 text-left max-w-4xl mx-auto">

      {/* Immersive Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 p-8 text-slate-950 shadow-lg border border-yellow-400">
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-white/20 blur-2xl"></div>
        <div className="absolute -bottom-16 -left-16 w-36 h-36 rounded-full bg-white/10 blur-xl"></div>

        <div className="relative z-10 space-y-3">
          <span className="bg-slate-950 text-yellow-405 text-yellow-400 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-slate-900/10">
            Premios Oficiales
          </span>
          <h3 className="text-2xl md:text-3xl font-black tracking-tight text-blue-950">
            ¡Podio de Ganadores BanCo!
          </h3>
          <p className="text-sm text-blue-900 max-w-2xl font-semibold leading-relaxed">
            Demostrá tus conocimientos futbolísticos pronosticando fecha a fecha. Los tres mejores clasificados al finalizar el campeonato se llevarán espectaculares premios para disfrutar en familia o con compañeros.
          </p>
        </div>
      </div>

      {/* Grid of the 3 main prizes */}
      

      <div className="bg-blue-50 border border-blue-150 p-5 rounded-2xl space-y-3">
        <h4 className="font-bold text-sm text-blue-900 flex items-center gap-1.5">
          <ShieldCheck className="h-4.5 w-4.5 text-blue-700" />
          <span>Reglamento y Condiciones de Competencia</span>
        </h4>
        <ul className="space-y-2 text-xs text-blue-805 text-blue-800 leading-relaxed list-disc list-inside">
          <li><strong>Identidad</strong>: Para poder reclamar y cobrar cualquier premio, es requisito obligatorio y excluyente tener declarado el Número de Legajo y la Gerencia real a la que pertenece el usuario dentro del sistema.</li>
          <li><strong>Puntuación</strong>: Se otorgarán <strong>3 puntos</strong> por acertar el resultado exacto ("Pleno") y <strong>1 punto</strong> si se acierta al ganador o empate errando la cantidad de goles.</li>
          <li><strong>Cierre de Carga</strong>: Los pronósticos de cada partido se bloquean estrictamente <strong>5 minutos antes</strong> de la fecha y hora programada para el pitazo inicial.</li>
          <li><strong>Transparencia</strong>: Los pronósticos de todos los compañeros se pueden auditar en tiempo real en la pestaña de <strong>Prode General</strong> una vez que el partido esté bloqueado para evitar plagios estratégicos de marcadores.</li>
          <li><strong>Desempate</strong>: En caso de empate en puntos totales al finalizar la fecha de liquidación, se considerará la cantidad de Plenos (aciertos de 3 puntos) como primer criterio de desempate.</li>
        </ul>
      </div>

    </div>
  );
};
