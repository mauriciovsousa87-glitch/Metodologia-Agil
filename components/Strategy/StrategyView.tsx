
import React, { useMemo, useState, useEffect } from 'react';
import { 
  Target, TrendingUp, Zap, Users, Shield, Cpu, Beer, ChevronRight, 
  Gauge, Trophy, Heart, Droplets, GanttChartSquare, Code2, Brain, 
  Users2, ArrowRight, Network, Microscope, Rocket, GraduationCap,
  HardDrive, ChevronLast, Plus, User as UserIcon, Settings as SettingsIcon, Lightbulb, Save, X, Trash2, UserMinus,
  AlertTriangle, Settings, ChevronsRight, Boxes, Monitor, Database, Flag, Loader2
} from 'lucide-react';
import { useAgile } from '../../store';
import { User } from '../../types';

interface OrgCardProps {
  user: User;
  onAddSubordinate: (parentId: string) => void;
  onUpdate: (userId: string, updates: Partial<User>) => void;
  onRemoveFromHierarchy: (userId: string) => void;
  onDeleteUser: (userId: string) => void;
}

const OrgCard: React.FC<OrgCardProps> = ({ user, onAddSubordinate, onUpdate, onRemoveFromHierarchy, onDeleteUser }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [pos, setPos] = useState(user.position || '');
  const [showOptions, setShowOptions] = useState(false);
  const [deleteArmed, setDeleteArmed] = useState(false);

  useEffect(() => {
    if (!showOptions) setDeleteArmed(false);
  }, [showOptions]);

  const handleSave = () => {
    onUpdate(user.id, { name, position: pos });
    setIsEditing(false);
  };

  const handleArmedDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (deleteArmed) {
      onDeleteUser(user.id);
      setShowOptions(false);
      setDeleteArmed(false);
    } else {
      setDeleteArmed(true);
    }
  };

  return (
    <div className="flex flex-col items-center relative z-20">
      <div className="relative bg-white p-5 rounded-[2rem] shadow-xl border border-slate-100 w-60 transition-all hover:scale-105 hover:shadow-2xl group ring-1 ring-slate-100">
        <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-white text-[9px] font-black uppercase shadow-lg z-30 tracking-widest ${user.reportsTo ? 'bg-blue-500' : 'bg-slate-900'}`}>
           {user.reportsTo ? 'EQUIPE' : 'LIDERANÇA'}
        </div>

        <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-40">
          <button 
            onClick={(e) => { e.stopPropagation(); setShowOptions(!showOptions); }}
            className={`p-2 rounded-full transition-all shadow-sm ${showOptions ? 'bg-red-600 text-white' : 'bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50'}`}
          >
            <Settings size={14} />
          </button>
        </div>

        {showOptions && (
          <>
            <div className="fixed inset-0 z-[90]" onClick={() => setShowOptions(false)} />
            <div className="absolute top-10 right-0 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[100] p-1.5 w-52 animate-in fade-in zoom-in-95">
               {user.reportsTo && !deleteArmed && (
                 <button 
                    onClick={() => { onRemoveFromHierarchy(user.id); setShowOptions(false); }}
                    className="w-full flex items-center gap-2.5 p-3 hover:bg-orange-50 text-orange-600 rounded-xl text-[10px] font-black uppercase transition-colors text-left"
                 >
                    <UserMinus size={14} /> Soltar na raiz
                 </button>
               )}
               
               <button 
                  onClick={handleArmedDelete}
                  className={`w-full flex items-center gap-2.5 p-3 rounded-xl text-[10px] font-black uppercase transition-all text-left ${
                    deleteArmed ? 'bg-red-600 text-white animate-pulse shadow-lg' : 'hover:bg-red-50 text-red-600'
                  }`}
               >
                  {deleteArmed ? <AlertTriangle size={14} /> : <Trash2 size={14} />} 
                  {deleteArmed ? 'CLIQUE PARA CONFIRMAR' : 'Excluir Registro'}
               </button>
            </div>
          </>
        )}

        <div className="flex flex-col items-center text-center mt-3">
          <div className="w-20 h-20 rounded-3xl bg-slate-50 border border-slate-100 overflow-hidden mb-4 shadow-inner relative group-hover:ring-2 ring-blue-100 transition-all">
            {user.avatar_url ? (
              <img src={user.avatar_url} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-300 bg-blue-50/50">
                <UserIcon size={32} />
              </div>
            )}
          </div>

          {isEditing ? (
            <div className="w-full space-y-2">
              <input className="w-full bg-slate-50 border border-blue-200 rounded-xl px-3 py-2 text-[11px] font-black uppercase text-center outline-none" value={name} onChange={e => setName(e.target.value)} autoFocus />
              <input className="w-full bg-slate-50 border border-blue-200 rounded-xl px-3 py-2 text-[10px] font-bold text-slate-400 text-center outline-none" value={pos} onChange={e => setPos(e.target.value)} placeholder="CARGO" />
              <div className="flex gap-2">
                <button onClick={handleSave} className="flex-1 bg-emerald-500 text-white py-2 rounded-xl hover:bg-emerald-600 transition-colors shadow-lg"><Save size={14} className="mx-auto" /></button>
                <button onClick={() => setIsEditing(false)} className="bg-slate-200 text-slate-600 p-2 rounded-xl hover:bg-slate-300 transition-colors"><X size={14} /></button>
              </div>
            </div>
          ) : (
            <div onClick={() => setIsEditing(true)} className="cursor-text w-full">
              <h4 className="text-[13px] font-black text-slate-800 uppercase tracking-tighter leading-tight mb-1 group-hover:text-blue-600 transition-colors">{user.name}</h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]">{user.position || 'DEFINIR CARGO'}</p>
            </div>
          )}
        </div>

        <button 
          onClick={() => onAddSubordinate(user.id)}
          className="absolute -bottom-5 left-1/2 -translate-x-1/2 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-xl hover:bg-blue-700 hover:scale-110 active:scale-95 transition-all opacity-0 group-hover:opacity-100 z-50 ring-4 ring-white"
        >
          <Plus size={24} strokeWidth={3} />
        </button>
      </div>
    </div>
  );
};

const OrgNode: React.FC<{ 
  user: User; 
  allUsers: User[]; 
  onAdd: (pid: string) => void;
  onUpdate: (id: string, u: any) => void;
  onRemove: (id: string) => void;
  onDelete: (id: string) => void;
}> = ({ user, allUsers, onAdd, onUpdate, onRemove, onDelete }) => {
  const children = useMemo(() => 
    allUsers.filter(u => String(u.reportsTo) === String(user.id)), 
    [allUsers, user.id]
  );

  return (
    <div className="flex flex-col items-center">
      <OrgCard user={user} onAddSubordinate={onAdd} onUpdate={onUpdate} onRemoveFromHierarchy={onRemove} onDeleteUser={onDelete} />
      
      {children.length > 0 && (
        <div className="relative pt-16 flex justify-center">
          {/* Linha saindo do PAI para BAIXO */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[2px] h-8 bg-slate-300" />
          
          {/* Linha HORIZONTAL conectando os filhos */}
          <div className="absolute top-8 left-0 right-0 h-[2px] bg-slate-300 mx-auto" style={{ width: children.length > 1 ? `calc(100% - ${100 / children.length}%)` : '2px' }} />
          
          <div className="flex gap-12">
            {children.map(child => (
              <div key={child.id} className="relative pt-8 flex flex-col items-center">
                {/* Linha subindo do FILHO para a barra horizontal */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[2px] h-8 bg-slate-300" />
                <OrgNode 
                  user={child} 
                  allUsers={allUsers} 
                  onAdd={onAdd} 
                  onUpdate={onUpdate} 
                  onRemove={onRemove} 
                  onDelete={onDelete} 
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const SectionHeader: React.FC<{ title: string; number: string }> = ({ title, number }) => (
  <div className="relative py-16">
    <div className="absolute inset-0 flex items-center" aria-hidden="true">
      <div className="w-full border-t-2 border-slate-100"></div>
    </div>
    <div className="relative flex justify-center">
      <span className="bg-white px-8 flex items-center gap-4">
        <span className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-sm shadow-xl">{number}</span>
        <span className="text-3xl font-black text-slate-900 uppercase tracking-tighter">{title}</span>
      </span>
    </div>
  </div>
);

const StrategyView: React.FC = () => {
  const { users, updateUser, removeUser } = useAgile();
  const [showAssignModal, setShowAssignModal] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Determinar líderes raiz (quem não reporta a ninguém ou cujo líder não existe mais)
  const roots = useMemo(() => {
    return users.filter(u => !u.reportsTo || !users.some(parent => String(parent.id) === String(u.reportsTo)));
  }, [users]);

  // Possíveis subordinados (não pode ser o próprio pai e não pode criar ciclo)
  const getCandidates = (parentId: string) => {
    return users.filter(u => String(u.id) !== String(parentId));
  };

  const handleAssignSubordinate = async (childId: string) => {
    if (showAssignModal && childId) {
      setIsUpdating(true);
      try {
        await updateUser(childId, { reportsTo: showAssignModal });
      } finally {
        setIsUpdating(false);
        setShowAssignModal(null);
      }
    }
  };

  const handleRemoveFromHierarchy = async (userId: string) => {
    setIsUpdating(true);
    try {
      await updateUser(userId, { reportsTo: '' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setIsUpdating(true);
    try {
      const subordinates = users.filter(u => String(u.reportsTo) === String(userId));
      if (subordinates.length > 0) {
        await Promise.all(subordinates.map(sub => updateUser(sub.id, { reportsTo: '' })));
      }
      await removeUser(userId);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="min-h-full bg-white font-sans text-slate-900 pb-60 overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* PARTE 1, 2 e 3 MANTIDAS INTEGRALMENTE */}
        <div className="text-center mb-32">
          <SectionHeader title="Estratégia da Cervejaria" number="1" />
          <h2 className="text-6xl font-black tracking-tighter text-slate-900 mb-2">2026</h2>
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="w-16 h-1 bg-yellow-400 rounded-full" />
            <h1 className="text-4xl lg:text-5xl font-black uppercase tracking-tighter flex items-center gap-4 text-center">
              <span className="text-yellow-400 text-6xl italic">7L</span>
              SER A MELHOR CERVEJARIA <span className="text-slate-400 font-bold">DA CIA</span>
            </h1>
            <div className="w-16 h-1 bg-yellow-400 rounded-full" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-300 text-slate-800 flex items-center justify-center font-black uppercase text-[10px] tracking-widest p-4 rounded-lg">Métricas de Sucesso</div>
            <div className="bg-black text-white p-6 rounded-lg border-b-4 border-yellow-400 shadow-lg"><span className="text-[10px] font-black text-yellow-400 uppercase block mb-1">BEP</span><span className="text-xl font-black tracking-tighter">{" > "} 450 PTS</span></div>
            <div className="bg-black text-white p-6 rounded-lg border-b-4 border-yellow-400 shadow-lg"><span className="text-[10px] font-black text-yellow-400 uppercase block mb-1">Leadership Ranking</span><span className="text-xl font-black tracking-tighter">TOP 3</span></div>
            <div className="bg-black text-white p-6 rounded-lg border-b-4 border-yellow-400 shadow-lg"><span className="text-[10px] font-black text-yellow-400 uppercase block mb-1">Volume</span><span className="text-xl font-black tracking-tighter">{" > "} 1 MIO HL</span></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-2 mb-8 items-stretch">
            <div className="bg-slate-300 text-slate-800 flex items-center justify-center font-black uppercase text-[10px] tracking-widest p-4 rounded-lg">KPIs Foco</div>
            <div className="md:col-span-5 flex flex-wrap justify-center gap-4">
              {[
                { label: 'TRI + cTRI', value: '0' }, { label: 'BQI', value: '> 92' }, { label: 'TPE', value: '< 60' }, { label: 'ÁGUA', value: '< 2,30' }, { label: 'OSE', value: '> 70' },
              ].map((kpi, i) => (
                <div key={i} className="relative w-28 h-24 flex flex-col items-center justify-center text-center">
                  <div className="absolute inset-0 bg-yellow-400 clip-hexagon-balanced shadow-sm" />
                  <div className="relative z-10 px-1 font-black"><p className="text-lg tracking-tighter">{kpi.value}</p><p className="text-[9px] uppercase leading-tight">{kpi.label}</p></div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-yellow-100/50 rounded-full p-2 flex items-center justify-center border border-yellow-200 mx-auto max-w-4xl">
            <div className="bg-yellow-400 text-black px-8 py-2.5 rounded-full font-black text-[11px] uppercase flex items-center gap-3 shadow-md"><Heart size={14} fill="black" /> ENGAGEMENT {'>'} 90</div>
          </div>
        </div>

        <div className="text-center mb-32">
          <SectionHeader title="Estratégia da Engenharia & ITF" number="2" />
          <div className="relative bg-[#020617] rounded-[3rem] p-10 lg:p-14 overflow-hidden border-4 border-yellow-400 shadow-2xl">
            <div className="absolute inset-0 opacity-5 flex items-center justify-end pr-10"><Beer size={400} className="text-yellow-400" /></div>
            <div className="relative z-10 flex flex-col items-center">
              <div className="flex items-center justify-center gap-6 mb-12">
                 <span className="text-yellow-400 text-6xl font-black italic">7L</span>
                 <h2 className="text-4xl lg:text-5xl font-black text-white uppercase tracking-tighter leading-none text-center">SER A MELHOR <span className="text-yellow-400">ENGENHARIA E ITF DA CIA</span></h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 w-full">
                {[{ label: 'TPE', target: '< 60', icon: Zap }, { label: 'SURPLUS', target: '> 0,80', icon: TrendingUp }, { label: 'INDISP', target: '< 0,15', icon: Gauge }, { label: 'OBZ + VIC', target: '= 0', icon: Trophy }, { label: 'ÁGUA', target: '< 2,30', icon: Droplets }].map((kpi, i) => (
                  <div key={i} className="bg-white/10 border border-white/20 p-6 rounded-3xl flex flex-col items-center hover:bg-white/20 transition-all">
                    <div className="w-12 h-12 rounded-2xl bg-yellow-400/20 flex items-center justify-center mb-4"><kpi.icon className="text-yellow-400" size={24} /></div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{kpi.label}</span><span className="text-xl font-black text-white mt-1">{kpi.target}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mb-32">
          <SectionHeader title="Plataformas Direcionais" number="3" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-orange-500 flex items-center justify-center text-white shadow-lg mb-[-12px] z-10"><GanttChartSquare size={32} /></div>
              <div className="w-[85%] bg-orange-500 py-2.5 rounded-full text-white font-black text-[9px] uppercase text-center mb-[-10px] z-10">Solução de problemas</div>
              <div className="w-full bg-[#EAEAEA] rounded-[3rem] p-6 pt-14 flex flex-col items-center min-h-[460px]">
                <p className="text-[10px] font-black text-slate-800 uppercase mb-6 leading-tight">Projetos com <span className="underline decoration-red-500">foco</span> no sonho da Cervejaria</p>
                <div className="w-full space-y-2">
                  {[{ label: 'ÁGUA', target: '2,30', color: 'bg-[#A7C49E]', items: ['Recuperação', 'CIPs'] }, { label: 'TPE', target: '< 60', color: 'bg-[#C6C6C6]', items: ['Energia', 'Modulação'] }, { label: 'BQI > 92', target: '4,30', color: 'bg-[#F2B58A]', items: ['Fervura', 'Pressão'] }, { label: 'OSE > 70', target: '', color: 'bg-white/40', items: ['A definir'] }].map((row, idx) => (
                    <div key={idx} className={`flex flex-col gap-1 p-2 rounded-lg ${row.color} border border-slate-300/30`}>
                      <div className="flex justify-between items-center border-b border-black/10 pb-1"><span className="text-[9px] font-black leading-tight uppercase">{row.label}</span><span className="text-[8px] font-bold opacity-70 italic">{row.target}</span></div>
                      <ul className="text-left">{row.items.map((it, i) => <li key={i} className="text-[8px] font-bold leading-tight flex items-start gap-1">• {it}</li>)}</ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-orange-500 flex items-center justify-center text-white shadow-lg mb-[-12px] z-10"><Code2 size={32} /></div>
              <div className="w-[85%] bg-orange-500 py-2.5 rounded-full text-white font-black text-[9px] uppercase text-center mb-[-10px] z-10">Consistência na rotina com Tech</div>
              <div className="w-full bg-[#EAEAEA] rounded-[3rem] p-5 pt-12 flex flex-col items-center min-h-[460px] text-slate-800">
                <div className="grid grid-cols-2 gap-2 mb-4 w-full">
                  <div className="flex flex-col items-center"><span className="text-[8px] font-black uppercase mb-1">BrewNet</span><div className="bg-[#A7C49E] w-full py-2.5 rounded-full text-[8px] font-black border border-slate-300 text-center shadow-sm">GOPs e Alertas</div></div>
                  <div className="flex flex-col items-center"><span className="text-[8px] font-black uppercase mb-1 text-center">Cybersecurity</span><div className="bg-[#A7C49E] w-full py-2.5 rounded-full text-[8px] font-black border border-slate-300 text-center shadow-sm">Conectividade</div></div>
                </div>
                <div className="w-full text-center mb-4"><p className="text-[8px] font-black uppercase mb-1.5 underline decoration-yellow-500">Lab de eletrônica/servos</p><div className="grid grid-cols-2 gap-2"><div className="bg-[#A7C49E] py-2 px-1 rounded-lg text-[7px] font-black border border-slate-300 leading-tight">Preventivas e treinos</div><div className="bg-[#A7C49E] py-2 px-1 rounded-lg text-[7px] font-black border border-slate-300 leading-tight">Análise Estruturada</div></div></div>
                <div className="w-full text-center mb-4"><p className="text-[8px] font-black uppercase mb-1.5">SODA e Sensory</p><div className="grid grid-cols-2 gap-2"><div className="bg-[#A7C49E] py-2 px-1 rounded-lg text-[7px] font-black border border-slate-300 leading-tight">51% Aut. Processo</div><div className="bg-[#A7C49E] py-2 px-1 rounded-lg text-[7px] font-black border border-slate-300 leading-tight">Confiabilidade</div></div></div>
                <div className="w-full bg-white/40 p-4 rounded-2xl border border-slate-300/50"><p className="text-[9px] font-black uppercase mb-2 text-center leading-none">Lab de Materiais</p><div className="bg-[#A7C49E] py-2.5 rounded-full text-[8px] font-black uppercase text-center border border-slate-400 shadow-sm">Estratificação de peças potenciais</div></div>
              </div>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-orange-500 flex items-center justify-center text-white shadow-lg mb-[-12px] z-10"><Brain size={32} /></div>
              <div className="w-[85%] bg-orange-500 py-2.5 rounded-full text-white font-black text-[9px] uppercase text-center mb-[-10px] z-10">Autonomia</div>
              <div className="w-full bg-[#EAEAEA] rounded-[3rem] p-8 pt-16 flex flex-col items-start min-h-[460px] text-slate-800 text-left space-y-8">
                 <div><h4 className="text-[12px] font-black mb-1 leading-tight"><span className="underline decoration-red-500">Treinamento</span> Operacional</h4><p className="text-[10px] font-bold text-slate-600 italic">Pipeline técnico</p></div>
                 <div><h4 className="text-[12px] font-black mb-1 leading-tight"><span className="underline decoration-red-500">Treinamento</span> Técnico</h4><p className="text-[10px] font-bold text-slate-600 italic">Formação básica e integration</p></div>
                 <div><h4 className="text-[12px] font-black mb-1 leading-tight"><span className="underline decoration-red-500">Treinamento</span> Estratégico</h4><p className="text-[10px] font-bold text-slate-600 italic">Foco na estratégia 7L</p></div>
              </div>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-orange-500 flex items-center justify-center text-white shadow-lg mb-[-12px] z-10"><Users2 size={32} /></div>
              <div className="w-[85%] bg-orange-500 py-2.5 rounded-full text-white font-black text-[9px] uppercase text-center mb-[-10px] z-10">Comunidade e Inovação</div>
              <div className="w-full bg-[#EAEAEA] rounded-[3rem] p-8 pt-16 flex flex-col items-start min-h-[460px] text-slate-800 text-left">
                 <h4 className="text-[12px] font-black uppercase mb-6 leading-tight">INOVAÇÃO + STARTUP + UNIVERSIDADE</h4>
                 <p className="text-[12px] font-bold text-slate-700 leading-relaxed"><span className="underline decoration-red-500">Utilizar</span> Startups de Tecnologia para <span className="underline decoration-red-500">desenvolvimento</span> de soluções e <span className="underline decoration-red-500">inovação dentro</span> da Cervejaria.</p>
              </div>
            </div>
          </div>
        </div>

        {/* PARTE 4: PAPEIS E RESPONSABILIDADES - REFORMULADA E CORRIGIDA */}
        <div className="text-center">
          <SectionHeader title="Papéis e Responsabilidades" number="4" />
          <div className="relative py-24 border-t-2 border-slate-50 bg-slate-50/20 rounded-[5rem] mt-4 shadow-inner">
             {isUpdating && (
               <div className="absolute top-8 right-8 flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-full text-[10px] font-black animate-pulse z-[200]">
                 <Loader2 size={14} className="animate-spin" /> SINCRONIZANDO...
               </div>
             )}
             
             <div className="text-center mb-24">
                <div className="inline-flex items-center gap-6 bg-slate-900 text-white px-12 py-5 rounded-[2rem] shadow-2xl mb-8 border border-slate-800">
                   <Network size={32} className="text-blue-400" />
                   <h2 className="text-4xl font-black uppercase tracking-tighter leading-none">Organograma de Liderança</h2>
                </div>
                <p className="text-sm font-black text-slate-400 uppercase tracking-[0.4em]">Estrutura Hierárquica da Engenharia</p>
             </div>

             <div className="overflow-x-auto pb-40 custom-scrollbar">
               <div className="min-w-max flex justify-center px-24">
                 <div className="flex gap-28 items-start">
                   {roots.length > 0 ? (
                     roots.map(root => (
                       <OrgNode 
                         key={root.id} 
                         user={root} 
                         allUsers={users} 
                         onAdd={setShowAssignModal}
                         onUpdate={updateUser}
                         onRemove={handleRemoveFromHierarchy}
                         onDelete={handleDeleteUser}
                       />
                     ))
                   ) : (
                     <div className="text-center py-24 opacity-20 flex flex-col items-center gap-8">
                        <Users2 size={100} strokeWidth={1} />
                        <p className="text-3xl font-black uppercase tracking-tighter text-center">Nenhum líder raiz encontrado<br/>Verifique as configurações</p>
                     </div>
                   )}
                 </div>
               </div>
             </div>
          </div>
        </div>
      </div>

      {/* MODAL ATRIBUIÇÃO */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[9999] flex items-center justify-center p-6 animate-in fade-in duration-300" onClick={() => setShowAssignModal(null)}>
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
             <div className="p-8 border-b flex items-center justify-between bg-slate-50/50">
                <div>
                   <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Atribuir Subordinado</h3>
                   <p className="text-xl font-black text-slate-800 uppercase tracking-tighter">Escolher Integrante</p>
                </div>
                <button onClick={() => setShowAssignModal(null)} className="p-3 hover:bg-slate-200 rounded-2xl text-slate-400"><X size={24}/></button>
             </div>
             <div className="p-4 max-h-[400px] overflow-y-auto custom-scrollbar space-y-2 bg-white">
                {getCandidates(showAssignModal).length > 0 ? (
                  getCandidates(showAssignModal).map(u => (
                    <button key={u.id} onClick={() => handleAssignSubordinate(u.id)} className="w-full p-4 rounded-[1.5rem] hover:bg-blue-600 text-left flex items-center gap-4 transition-all group border border-slate-100 shadow-sm">
                         <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-sm font-black overflow-hidden shadow-inner group-hover:bg-white group-hover:text-blue-600 transition-all">
                            {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover" /> : u.name[0]}
                         </div>
                         <div className="flex flex-col text-left flex-1">
                            <span className="text-[12px] font-black uppercase tracking-tight text-slate-800 group-hover:text-white">{u.name}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase group-hover:text-blue-200">{u.position || 'Sem cargo definido'}</span>
                         </div>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-10 opacity-40"><AlertTriangle size={48} className="mx-auto mb-4" /><p className="text-xs font-black uppercase">Nenhum integrante disponível</p></div>
                )}
             </div>
          </div>
        </div>
      )}

      <style>{`.clip-hexagon-balanced { clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%); }`}</style>
    </div>
  );
};

export default StrategyView;
