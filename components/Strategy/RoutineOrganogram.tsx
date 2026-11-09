import React, { useState, useEffect } from 'react';
import { 
  RotateCcw, Plus, ZoomIn, ZoomOut, Maximize2, Minimize2, 
  Trash2, X, Edit3, Check, User as UserIcon
} from 'lucide-react';
import { User } from '../../types';

export interface RoutineItem {
  id: string;
  title: string;
  assigneeName: string;
  assigneeId?: string;
  assigneeAvatar?: string;
  progress?: number;
}

export interface RoutineWorkstream {
  id: string;
  title: string;
  assigneeName: string;
  assigneeId?: string;
  assigneeAvatar?: string;
  progress?: number;
  autoProgress?: boolean;
  routines: RoutineItem[];
}

const STORAGE_KEY = 'agile_custom_routine_organogram_data_v1';

const DEFAULT_ROUTINES: RoutineWorkstream[] = [
  {
    id: 'frente-1',
    title: 'EFICIÊNCIA ENERGÉTICA',
    assigneeName: 'MAURICIO VIEIRA',
    routines: [
      {
        id: 'rot-1',
        title: 'VAPOR FLASH SL1',
        assigneeName: 'DIEGO FIGUEIREDO'
      },
      {
        id: 'rot-2',
        title: 'AGUA QUENTE BRASSAGEM',
        assigneeName: 'JOSÉ MARIA'
      },
      {
        id: 'rot-3',
        title: 'MANUTENÇÃO NAS VÁLVULAS',
        assigneeName: 'PABLO HENRIQUE'
      }
    ]
  }
];

interface RoutineOrganogramProps {
  users: User[];
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
}

export const RoutineOrganogram: React.FC<RoutineOrganogramProps> = ({
  users,
  isFullScreen = false,
  onToggleFullScreen
}) => {
  const [frentes, setFrentes] = useState<RoutineWorkstream[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Erro ao ler rotinas do localStorage:', e);
    }
    return DEFAULT_ROUTINES;
  });

  const [zoom, setZoom] = useState<number>(100);

  // Edit states for Frente
  const [editingFrente, setEditingFrente] = useState<RoutineWorkstream | null>(null);
  const [isConfirmingDeleteFrente, setIsConfirmingDeleteFrente] = useState<boolean>(false);
  
  // Edit states for Routine
  const [editingRoutine, setEditingRoutine] = useState<{ frenteId: string; routine: RoutineItem } | null>(null);
  const [isConfirmingDeleteRoutine, setIsConfirmingDeleteRoutine] = useState<boolean>(false);

  // Synchronize with localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(frentes));
    } catch (e) {
      console.error('Erro ao salvar rotinas no localStorage:', e);
    }
  }, [frentes]);

  // Helper to find avatar from users
  const resolveAvatar = (assigneeId?: string, assigneeName?: string, customAvatar?: string) => {
    if (customAvatar) return customAvatar;
    if (assigneeId) {
      const u = users.find(user => String(user.id) === String(assigneeId));
      if (u?.avatar_url) return u.avatar_url;
    }
    if (assigneeName) {
      const cleanName = assigneeName.trim().toLowerCase();
      const u = users.find(user => 
        user.name.toLowerCase().includes(cleanName) || 
        cleanName.includes(user.name.toLowerCase())
      );
      if (u?.avatar_url) return u.avatar_url;
    }
    return null;
  };

  // Add new Frente
  const handleAddFrente = () => {
    const newFrente: RoutineWorkstream = {
      id: `frente-${Date.now()}`,
      title: 'NOVA FRENTE DE ROTINA',
      assigneeName: users[0]?.name || 'RESPONSÁVEL',
      assigneeId: users[0]?.id || '',
      routines: []
    };
    setFrentes(prev => [...prev, newFrente]);
    setIsConfirmingDeleteFrente(false);
    setEditingFrente(newFrente);
  };

  // Delete Frente without window.confirm (works inside sandbox iframe)
  const handleDeleteFrente = (frenteId: string) => {
    setFrentes(prev => prev.filter(f => f.id !== frenteId));
    setEditingFrente(null);
    setIsConfirmingDeleteFrente(false);
  };

  // Save edited Frente
  const handleSaveFrente = (updated: RoutineWorkstream) => {
    setFrentes(prev => prev.map(f => (f.id === updated.id ? updated : f)));
    setEditingFrente(null);
    setIsConfirmingDeleteFrente(false);
  };

  // Add routine to a Frente
  const handleAddRoutine = (frenteId: string) => {
    const newRoutine: RoutineItem = {
      id: `rot-${Date.now()}`,
      title: 'NOVA ROTINA',
      assigneeName: users[0]?.name || 'RESPONSÁVEL',
      assigneeId: users[0]?.id || ''
    };

    setFrentes(prev => prev.map(f => {
      if (f.id === frenteId) {
        return {
          ...f,
          routines: [...f.routines, newRoutine]
        };
      }
      return f;
    }));

    setIsConfirmingDeleteRoutine(false);
    setEditingRoutine({ frenteId, routine: newRoutine });
  };

  // Delete routine without window.confirm
  const handleDeleteRoutine = (frenteId: string, routineId: string) => {
    setFrentes(prev => prev.map(f => {
      if (f.id === frenteId) {
        return {
          ...f,
          routines: f.routines.filter(r => r.id !== routineId)
        };
      }
      return f;
    }));
    setEditingRoutine(null);
    setIsConfirmingDeleteRoutine(false);
  };

  // Save edited routine
  const handleSaveRoutine = (frenteId: string, updated: RoutineItem) => {
    setFrentes(prev => prev.map(f => {
      if (f.id === frenteId) {
        return {
          ...f,
          routines: f.routines.map(r => r.id === updated.id ? updated : r)
        };
      }
      return f;
    }));
    setEditingRoutine(null);
    setIsConfirmingDeleteRoutine(false);
  };

  return (
    <div className={`w-full relative ${isFullScreen ? 'h-full flex flex-col bg-slate-950 text-white overflow-hidden select-none' : 'flex flex-col items-center'}`}>
      
      {/* CONTROLES NAS LATERAIS */}
      {isFullScreen ? (
        <>
          {/* Lateral Esquerda Flutuante (Ajuste de Tela / Zoom) */}
          <div className="absolute top-4 left-6 z-40 flex items-center gap-2.5 bg-slate-900/90 backdrop-blur-md border border-slate-800 text-white px-3.5 py-2 rounded-2xl shadow-2xl">
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Ajuste:</span>
            <button 
              onClick={() => setZoom(prev => Math.max(40, prev - 10))}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all active:scale-95"
              title="Diminuir Zoom"
            >
              <ZoomOut size={14} />
            </button>
            <input 
              type="range" 
              min="40" 
              max="150" 
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-24 sm:w-32 accent-teal-500 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer"
            />
            <button 
              onClick={() => setZoom(prev => Math.min(150, prev + 10))}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all active:scale-95"
              title="Aumentar Zoom"
            >
              <ZoomIn size={14} />
            </button>
            <button 
              onClick={() => setZoom(100)}
              className="px-2.5 py-1 text-[10px] font-black rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all uppercase"
              title="Restaurar tamanho padrão"
            >
              Reset ({zoom}%)
            </button>
          </div>

          {/* Lateral Direita Flutuante (Nova Frente e Sair da Tela Cheia) */}
          <div className="absolute top-4 right-6 z-40 flex items-center gap-2.5 bg-slate-900/90 backdrop-blur-md border border-slate-800 text-white px-3 py-2 rounded-2xl shadow-2xl">
            <button 
              onClick={handleAddFrente}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-md transition-all active:scale-95 hover:scale-105"
            >
              <Plus size={14} />
              <span>Nova Frente</span>
            </button>

            {onToggleFullScreen && (
              <button 
                onClick={onToggleFullScreen}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-md transition-all active:scale-95 hover:scale-105"
              >
                <Minimize2 size={14} />
                <span>Sair da Tela Cheia</span>
              </button>
            )}
          </div>
        </>
      ) : (
        /* Barra de Controles Embutida (quando fora da tela cheia) posicionada nas extremidades */
        <div className="w-full flex flex-wrap items-center justify-between gap-3 mb-6 px-1">
          {/* Lateral Esquerda: Ajuste de Zoom */}
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-2xl shadow-sm text-slate-700 dark:text-white">
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Ajuste de Tela:</span>
            <button 
              onClick={() => setZoom(prev => Math.max(40, prev - 10))}
              className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 transition-all"
              title="Diminuir Zoom"
            >
              <ZoomOut size={14} />
            </button>
            <input 
              type="range" 
              min="40" 
              max="150" 
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-20 sm:w-28 accent-teal-600 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
            />
            <button 
              onClick={() => setZoom(prev => Math.min(150, prev + 10))}
              className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 transition-all"
              title="Aumentar Zoom"
            >
              <ZoomIn size={14} />
            </button>
            <button 
              onClick={() => setZoom(100)}
              className="px-2 py-0.5 text-[9px] font-black rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase transition-all"
            >
              Reset ({zoom}%)
            </button>
          </div>

          {/* Lateral Direita: Ações */}
          <div className="flex items-center gap-2">
            <button 
              onClick={handleAddFrente}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm transition-all hover:scale-105"
            >
              <Plus size={14} />
              <span>Nova Frente</span>
            </button>
            {onToggleFullScreen && (
              <button 
                onClick={onToggleFullScreen}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm transition-all hover:scale-105"
              >
                <Maximize2 size={13} className="text-teal-400" />
                <span>Tela Cheia</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ORGANOGRAM CANVAS CONTAINER - Ocupa a tela inteira com as caixas */}
      <div className={`w-full overflow-auto custom-scrollbar flex justify-center ${
        isFullScreen ? 'flex-1 h-full pt-4 pb-28 px-4' : 'pb-24'
      }`}>
        <div 
          className="min-w-max flex flex-col items-center px-10 transition-all duration-300 origin-top"
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
        >
          {/* ROOT CARD: ENGENHARIA DA CERVEJARIA */}
          <div className="inline-flex items-center bg-slate-900 text-white p-4 sm:p-5 rounded-[2rem] shadow-2xl border border-slate-800 max-w-sm relative z-20 hover:scale-105 transition-transform duration-300">
            <div className="w-11 h-11 rounded-full bg-teal-600 text-white flex items-center justify-center font-black text-lg shadow-lg mr-3.5 flex-shrink-0">
              R
            </div>
            <div className="text-left pr-3">
              <h3 className="text-[13px] font-black uppercase tracking-tight leading-none mb-1">ENGENHARIA DA CERVEJARIA</h3>
              <p className="text-[9px] font-black text-teal-400 uppercase tracking-wider">Estrutura e Gestão de Rotinas</p>
            </div>
          </div>

          {/* FRENTES DE ROTINA AND ROUTINES */}
          {frentes.length > 0 ? (
            <div className="relative pt-12 flex justify-center w-full">
              {/* Linha vertical saindo do Root para baixo */}
              <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[2px] h-8 ${isFullScreen ? 'bg-slate-800' : 'bg-slate-300'}`} />
              
              {/* Linha horizontal conectando as Frentes */}
              <div 
                className={`absolute top-8 left-0 right-0 h-[2px] mx-auto ${isFullScreen ? 'bg-slate-800' : 'bg-slate-300'}`} 
                style={{ width: frentes.length > 1 ? `calc(100% - ${100 / frentes.length}%)` : '2px' }} 
              />
              
              <div className="flex gap-10 items-start">
                {frentes.map((frente) => {
                  const frenteAvatar = resolveAvatar(frente.assigneeId, frente.assigneeName, frente.assigneeAvatar);
                  const visibleRoutines = frente.routines;

                  return (
                    <div key={frente.id} className="flex flex-col items-center relative min-w-[270px]">
                      {/* Linha subindo da Frente para a barra horizontal */}
                      <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[2px] h-8 ${isFullScreen ? 'bg-slate-800' : 'bg-slate-300'}`} />
                      
                      <div className="pt-8 flex flex-col items-center w-full">
                        {/* FRENTE DE ROTINA CARD (Level 2) - Clickable to Edit */}
                        <div 
                          onClick={() => {
                            setIsConfirmingDeleteFrente(false);
                            setEditingFrente(frente);
                          }}
                          className="relative flex items-center bg-gradient-to-r from-emerald-600 via-teal-600 to-teal-700 p-4 rounded-[2.2rem] shadow-xl border border-teal-300/40 w-[270px] text-white hover:scale-105 hover:shadow-2xl transition-all duration-300 cursor-pointer relative z-20 group"
                          title="Clique para editar esta Frente de Rotina"
                        >
                          {/* Top badge pill */}
                          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-0.5 rounded-full bg-white text-teal-800 text-[8px] font-black uppercase shadow-md tracking-widest border border-teal-100 whitespace-nowrap">
                            FRENTE DE ROTINA
                          </div>

                          {/* Avatar Circle on the left */}
                          <div className="w-14 h-14 rounded-full bg-white/20 border-2 border-white/60 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-md mr-3.5 group-hover:border-white transition-all">
                            {frenteAvatar ? (
                              <img src={frenteAvatar} alt={frente.assigneeName} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-white font-black text-base">{frente.assigneeName ? frente.assigneeName[0] : 'R'}</span>
                            )}
                          </div>
                          
                          {/* Title and Assignee - Sem % de execução */}
                          <div className="flex-1 text-left min-w-0 pr-1">
                            <h4 className="text-[12px] font-black uppercase tracking-tight leading-snug truncate mb-1" title={frente.title}>
                              {frente.title}
                            </h4>
                            <p className="text-[9px] font-extrabold text-teal-100 uppercase tracking-wide truncate">
                              {frente.assigneeName || 'Sem Responsável'}
                            </p>
                          </div>

                          {/* Quick Edit icon on hover */}
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-black/30 rounded-full text-white/90">
                            <Edit3 size={11} />
                          </div>
                        </div>

                        {/* SUB-ROUTINES (Level 3) */}
                        <div className="relative pt-10 flex flex-col items-center w-full">
                          {/* Vertical connector line running through routines */}
                          <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[2px] h-full ${isFullScreen ? 'bg-slate-800' : 'bg-slate-300'}`} />

                          <div className="flex flex-col gap-6 w-full items-center relative z-10">
                            {visibleRoutines.map((routine) => {
                              const routineAvatar = resolveAvatar(routine.assigneeId, routine.assigneeName, routine.assigneeAvatar);
                              
                              return (
                                <div key={routine.id} className="relative w-full flex justify-center">
                                  {/* Routine Balloon Card - Clickable to Edit - Sem % e sem barra de progresso */}
                                  <div 
                                    onClick={() => {
                                      setIsConfirmingDeleteRoutine(false);
                                      setEditingRoutine({ frenteId: frente.id, routine });
                                    }}
                                    className={`relative flex items-center p-3.5 rounded-[1.6rem] shadow-md border w-[235px] hover:scale-105 hover:shadow-xl transition-all duration-300 cursor-pointer group ${
                                      isFullScreen 
                                        ? 'bg-slate-900 border-slate-800 text-white hover:border-teal-500/50' 
                                        : 'bg-white border-slate-100 text-slate-800 hover:border-teal-300'
                                    }`}
                                    title="Clique para editar esta Rotina"
                                  >
                                    {/* Top badge pill */}
                                    <div className="absolute -top-2.5 left-5 px-3 py-0.5 rounded-full bg-teal-600 text-white text-[7.5px] font-black uppercase tracking-widest shadow-sm">
                                      ROTINA
                                    </div>
                                    
                                    {/* Circular Avatar on the left */}
                                    <div className={`w-11 h-11 rounded-full border overflow-hidden flex-shrink-0 flex items-center justify-center shadow-inner mr-3 ${
                                      isFullScreen ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                                    }`}>
                                      {routineAvatar ? (
                                        <img src={routineAvatar} alt={routine.assigneeName} className="w-full h-full object-cover" />
                                      ) : (
                                        <span className="font-black text-xs">{routine.assigneeName ? routine.assigneeName[0] : 'R'}</span>
                                      )}
                                    </div>
                                    
                                    {/* Text on the right */}
                                    <div className="flex-1 text-left min-w-0">
                                      <h5 className={`text-[11px] font-black uppercase tracking-tight leading-tight truncate mb-1 ${
                                        isFullScreen ? 'text-slate-100' : 'text-slate-800'
                                      }`} title={routine.title}>
                                        {routine.title}
                                      </h5>
                                      
                                      <span className={`text-[8.5px] font-bold uppercase tracking-wider truncate block ${
                                        isFullScreen ? 'text-slate-400' : 'text-slate-500'
                                      }`}>
                                        {routine.assigneeName || 'Sem Responsável'}
                                      </span>
                                    </div>

                                    {/* Quick Edit icon on hover */}
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-teal-500">
                                      <Edit3 size={11} />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}

                            {/* + Adicionar Rotina Button (connected below) */}
                            <div className="relative pt-2">
                              <button 
                                onClick={() => handleAddRoutine(frente.id)}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-wider transition-all hover:scale-105 shadow-sm border border-dashed ${
                                  isFullScreen 
                                    ? 'bg-slate-900 hover:bg-slate-800 text-teal-400 border-teal-500/50 hover:border-teal-400' 
                                    : 'bg-teal-50 hover:bg-teal-100 text-teal-700 border-teal-300 hover:border-teal-400'
                                }`}
                                title="Adicionar nova rotina abaixo desta frente"
                              >
                                <Plus size={13} />
                                <span>Adicionar Rotina</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Quick Add Frente Card at the end of the line */}
                <div className="flex flex-col items-center pt-8">
                  <button
                    onClick={handleAddFrente}
                    className={`flex flex-col items-center justify-center p-6 rounded-[2.2rem] border-2 border-dashed w-[180px] h-[100px] transition-all hover:scale-105 ${
                      isFullScreen 
                        ? 'border-slate-800 hover:border-teal-500 text-slate-500 hover:text-teal-400 bg-slate-900/40' 
                        : 'border-slate-200 hover:border-teal-500 text-slate-400 hover:text-teal-600 bg-white/50'
                    }`}
                  >
                    <Plus size={24} className="mb-1" />
                    <span className="text-[10px] font-black uppercase tracking-wider">Nova Frente</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 flex flex-col items-center gap-6">
              <RotateCcw size={80} className="text-slate-300 dark:text-slate-700 stroke-1" />
              <p className="text-2xl font-black uppercase tracking-tighter text-slate-400">
                Nenhuma frente de rotina cadastrada
              </p>
              <button 
                onClick={handleAddFrente}
                className="flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg transition-all hover:scale-105"
              >
                <Plus size={16} />
                <span>Cadastrar Primeira Frente de Rotina</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: EDITAR FRENTE DE ROTINA (Sem % de execução) */}
      {editingFrente && (
        <div className="fixed inset-0 z-[20000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] shadow-2xl p-6 sm:p-8 max-w-md w-full text-slate-800 dark:text-white relative animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-black shadow-md">
                  <RotateCcw size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase tracking-tight">Editar Frente de Rotina</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Balão Principal de Nível 1</p>
                </div>
              </div>
              <button 
                onClick={() => setEditingFrente(null)}
                className="p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <div className="space-y-4 text-left">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1.5">
                  Título da Frente de Rotina
                </label>
                <input 
                  type="text" 
                  value={editingFrente.title}
                  onChange={(e) => setEditingFrente({ ...editingFrente, title: e.target.value })}
                  placeholder="Ex: EFICIÊNCIA ENERGÉTICA"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 uppercase"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1.5">
                  Selecionar Responsável da Equipe
                </label>
                <select 
                  value={editingFrente.assigneeId || ''}
                  onChange={(e) => {
                    const selId = e.target.value;
                    const foundUser = users.find(u => String(u.id) === String(selId));
                    if (foundUser) {
                      setEditingFrente({
                        ...editingFrente,
                        assigneeId: foundUser.id,
                        assigneeName: foundUser.name,
                        assigneeAvatar: foundUser.avatar_url || ''
                      });
                    } else {
                      setEditingFrente({
                        ...editingFrente,
                        assigneeId: '',
                      });
                    }
                  }}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 uppercase"
                >
                  <option value="">-- Selecionar da lista de Colaboradores --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} {u.position ? `(${u.position})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1.5">
                  Nome do Responsável (Personalizado)
                </label>
                <input 
                  type="text" 
                  value={editingFrente.assigneeName}
                  onChange={(e) => setEditingFrente({ ...editingFrente, assigneeName: e.target.value })}
                  placeholder="Ex: MAURICIO VIEIRA"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 uppercase"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1.5">
                  Foto do Responsável (URL da Imagem)
                </label>
                <div className="flex gap-3 items-center">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex-shrink-0 flex items-center justify-center">
                    {resolveAvatar(editingFrente.assigneeId, editingFrente.assigneeName, editingFrente.assigneeAvatar) ? (
                      <img 
                        src={resolveAvatar(editingFrente.assigneeId, editingFrente.assigneeName, editingFrente.assigneeAvatar)!} 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <UserIcon size={20} className="text-slate-400" />
                    )}
                  </div>
                  <input 
                    type="url" 
                    value={editingFrente.assigneeAvatar || ''}
                    onChange={(e) => setEditingFrente({ ...editingFrente, assigneeAvatar: e.target.value })}
                    placeholder="https://exemplo.com/foto.jpg"
                    className="flex-1 px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between mt-8 pt-4 border-t border-slate-100 dark:border-slate-800 gap-3">
              {isConfirmingDeleteFrente ? (
                <div className="flex items-center gap-2 animate-in fade-in duration-150">
                  <button 
                    type="button"
                    onClick={() => handleDeleteFrente(editingFrente.id)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase shadow-lg transition-all active:scale-95"
                  >
                    <Trash2 size={15} />
                    <span>Confirmar Exclusão</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsConfirmingDeleteFrente(false)}
                    className="px-3 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 text-xs font-bold uppercase transition-all"
                  >
                    Não
                  </button>
                </div>
              ) : (
                <button 
                  type="button"
                  onClick={() => setIsConfirmingDeleteFrente(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 text-xs font-black uppercase transition-all active:scale-95"
                  title="Excluir esta Frente de Rotina"
                >
                  <Trash2 size={15} />
                  <span>Excluir</span>
                </button>
              )}

              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  onClick={() => {
                    setEditingFrente(null);
                    setIsConfirmingDeleteFrente(false);
                  }}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 text-xs font-black uppercase transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="button"
                  onClick={() => handleSaveFrente(editingFrente)}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-black uppercase shadow-lg transition-all hover:scale-105"
                >
                  <Check size={16} />
                  <span>Salvar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR ROTINA (Sem % de execução) */}
      {editingRoutine && (
        <div className="fixed inset-0 z-[20000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] shadow-2xl p-6 sm:p-8 max-w-md w-full text-slate-800 dark:text-white relative animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-black shadow-md">
                  <RotateCcw size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase tracking-tight">Editar Rotina</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Balão de Rotina Operacional</p>
                </div>
              </div>
              <button 
                onClick={() => setEditingRoutine(null)}
                className="p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <div className="space-y-4 text-left">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1.5">
                  Título da Rotina
                </label>
                <input 
                  type="text" 
                  value={editingRoutine.routine.title}
                  onChange={(e) => setEditingRoutine({
                    ...editingRoutine,
                    routine: { ...editingRoutine.routine, title: e.target.value }
                  })}
                  placeholder="Ex: VAPOR FLASH SL1"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 uppercase"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1.5">
                  Selecionar Responsável da Equipe
                </label>
                <select 
                  value={editingRoutine.routine.assigneeId || ''}
                  onChange={(e) => {
                    const selId = e.target.value;
                    const foundUser = users.find(u => String(u.id) === String(selId));
                    if (foundUser) {
                      setEditingRoutine({
                        ...editingRoutine,
                        routine: {
                          ...editingRoutine.routine,
                          assigneeId: foundUser.id,
                          assigneeName: foundUser.name,
                          assigneeAvatar: foundUser.avatar_url || ''
                        }
                      });
                    } else {
                      setEditingRoutine({
                        ...editingRoutine,
                        routine: {
                          ...editingRoutine.routine,
                          assigneeId: '',
                        }
                      });
                    }
                  }}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 uppercase"
                >
                  <option value="">-- Selecionar da lista de Colaboradores --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} {u.position ? `(${u.position})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1.5">
                  Nome do Responsável (Personalizado)
                </label>
                <input 
                  type="text" 
                  value={editingRoutine.routine.assigneeName}
                  onChange={(e) => setEditingRoutine({
                    ...editingRoutine,
                    routine: { ...editingRoutine.routine, assigneeName: e.target.value }
                  })}
                  placeholder="Ex: DIEGO FIGUEIREDO"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 uppercase"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1.5">
                  Foto do Responsável (URL da Imagem)
                </label>
                <div className="flex gap-3 items-center">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex-shrink-0 flex items-center justify-center">
                    {resolveAvatar(editingRoutine.routine.assigneeId, editingRoutine.routine.assigneeName, editingRoutine.routine.assigneeAvatar) ? (
                      <img 
                        src={resolveAvatar(editingRoutine.routine.assigneeId, editingRoutine.routine.assigneeName, editingRoutine.routine.assigneeAvatar)!} 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <UserIcon size={20} className="text-slate-400" />
                    )}
                  </div>
                  <input 
                    type="url" 
                    value={editingRoutine.routine.assigneeAvatar || ''}
                    onChange={(e) => setEditingRoutine({
                      ...editingRoutine,
                      routine: { ...editingRoutine.routine, assigneeAvatar: e.target.value }
                    })}
                    placeholder="https://exemplo.com/foto.jpg"
                    className="flex-1 px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between mt-8 pt-4 border-t border-slate-100 dark:border-slate-800 gap-3">
              {isConfirmingDeleteRoutine ? (
                <div className="flex items-center gap-2 animate-in fade-in duration-150">
                  <button 
                    type="button"
                    onClick={() => handleDeleteRoutine(editingRoutine.frenteId, editingRoutine.routine.id)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase shadow-lg transition-all active:scale-95"
                  >
                    <Trash2 size={15} />
                    <span>Confirmar Exclusão</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsConfirmingDeleteRoutine(false)}
                    className="px-3 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 text-xs font-bold uppercase transition-all"
                  >
                    Não
                  </button>
                </div>
              ) : (
                <button 
                  type="button"
                  onClick={() => setIsConfirmingDeleteRoutine(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 text-xs font-black uppercase transition-all active:scale-95"
                  title="Excluir esta Rotina"
                >
                  <Trash2 size={15} />
                  <span>Excluir</span>
                </button>
              )}

              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  onClick={() => {
                    setEditingRoutine(null);
                    setIsConfirmingDeleteRoutine(false);
                  }}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 text-xs font-black uppercase transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="button"
                  onClick={() => handleSaveRoutine(editingRoutine.frenteId, editingRoutine.routine)}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-black uppercase shadow-lg transition-all hover:scale-105"
                >
                  <Check size={16} />
                  <span>Salvar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
