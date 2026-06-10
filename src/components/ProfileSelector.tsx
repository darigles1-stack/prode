import React, { useState } from 'react';
import { Users, UserPlus, ArrowRight, Sparkles, LogIn } from 'lucide-react';
import { UserProfile } from '../types';

interface ProfileSelectorProps {
  currentUser: UserProfile | null;
  onSelectUser: (uid: string) => Promise<void>;
  onCreateUser: (name: string, email: string) => Promise<UserProfile>;
}

export const ProfileSelector: React.FC<ProfileSelectorProps> = ({
  currentUser,
  onSelectUser,
  onCreateUser
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'switch' | 'register'>('switch');

  const presetUsers = [
    { uid: "mock-user-1", name: "Lionel Messi", email: "messi@corporate.com", role: "Empleado" },
    { uid: "mock-user-2", name: "Kylian Mbappé", email: "mbappe@corporate.com", role: "Empleado" },
    { uid: "admin-darigles", name: "Darío (Admin)", email: "darigles1@gmail.com", role: "Admin Oficial" }
  ];

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError('Por favor completá nombre y correo');
      return;
    }
    if (!email.includes('@')) {
      setError('Formato de correo inválido');
      return;
    }
    setError('');
    try {
      await onCreateUser(name.trim(), email.trim());
      setName('');
      setEmail('');
    } catch {
      setError('Hubo un error al crear el usuario simulado');
    }
  };

  return (
    <div id="emulator-panel" className="bg-gradient-to-r from-teal-900 to-slate-900 text-white rounded-2xl p-5 border border-teal-500/30 shadow-lg">
      <div className="flex items-center space-x-2 mb-3">
        <Sparkles className="h-5 w-5 text-teal-400 animate-spin" />
        <h3 className="text-base font-bold text-teal-200">Consola de Simulación de Empleados</h3>
      </div>
      <p className="text-xs text-teal-100/70 mb-4 leading-relaxed">
        Dado que estás en modo preliminar, usá esta herramienta para alternar identidades y testear cómo interactúa cada rol. Podés simular pronósticos de múltiples empleados, ver su sumatoria de puntos y comprobar el Ranking.
      </p>

      {/* Tabs */}
      <div className="flex border-b border-teal-800/60 mb-4 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('switch')}
          className={`pb-2 px-3 transition-colors ${activeTab === 'switch' ? 'border-b-2 border-teal-400 text-teal-300' : 'text-slate-400 hover:text-white'}`}
        >
          Alternar Identidades
        </button>
        <button
          onClick={() => setActiveTab('register')}
          className={`pb-2 px-3 transition-colors ${activeTab === 'register' ? 'border-b-2 border-teal-400 text-teal-300' : 'text-slate-400 hover:text-white'}`}
        >
          Registrar Otro Empleado
        </button>
      </div>

      {activeTab === 'switch' ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {presetUsers.map(user => {
            const isCurrent = currentUser && currentUser.uid === user.uid;
            return (
              <button
                key={user.uid}
                onClick={() => onSelectUser(user.uid)}
                className={`p-3 text-left rounded-xl border transition-all text-xs flex flex-col justify-between ${
                  isCurrent 
                    ? 'bg-teal-950/60 border-teal-400 text-white shadow-md shadow-teal-900/10' 
                    : 'bg-slate-800/80 border-slate-700/50 hover:bg-slate-800'
                }`}
              >
                <div>
                  <div className="font-bold">{user.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">{user.email}</div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-700/40 w-full text-[10px] text-slate-400">
                  <span className={user.role.includes('Admin') ? 'text-amber-400 font-bold' : ''}>{user.role}</span>
                  {isCurrent ? (
                    <span className="text-emerald-400 font-extrabold flex items-center">
                      ACTIVO
                    </span>
                  ) : (
                    <span className="flex items-center text-teal-400">
                      Entrar <ArrowRight className="h-3 w-3 ml-0.5" />
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <form onSubmit={handleRegister} className="space-y-3 max-w-sm">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Nombre del Empleado"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-medium focus:outline-none focus:border-teal-400 focus:bg-slate-850"
            />
            <input
              type="email"
              placeholder="email@corporativo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono focus:outline-none focus:border-teal-400 focus:bg-slate-850"
            />
          </div>

          {error && <p className="text-[10px] text-rose-400 font-medium">{error}</p>}

          <button
            type="submit"
            className="bg-teal-500 hover:bg-teal-400 text-slate-900 text-xs font-bold py-1.5 px-3 rounded-lg flex items-center space-x-1"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Crear e Ingresar</span>
          </button>
        </form>
      )}

    </div>
  );
};
