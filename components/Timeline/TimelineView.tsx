
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useAgile } from '../../store';
import { WorkItem, ItemType, ItemStatus } from '../../types';
import { Calendar, Info, Target, Package, ListTodo, CheckCircle2, TrendingUp, Search, X, ChevronDown, MessageCircle, Download, Loader2, Camera, Flag } from 'lucide-react';
import ItemPanel from '../Backlog/ItemPanel';

declare var html2canvas: any;

const TimelineView: React.FC = () => {
  const { workItems, users } = useAgile();
  const [selectedInitiativeId, setSelectedInitiativeId] = useState<string>(() => {
    return localStorage.getItem('timeline_selected_initiative') || '';
  });
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('timeline_selected_initiative', selectedInitiativeId);
  }, [selectedInitiativeId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initiatives = useMemo(() => {
    return workItems.filter(i => i.type === ItemType.INITIATIVE);
  }, [workItems]);

  const filteredInitiatives = useMemo(() => {
    if (!searchTerm) return initiatives;
    return initiatives.filter(i => 
      i.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      i.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [initiatives, searchTerm]);

  const selectedInitiative = useMemo(() => 
    initiatives.find(i => i.id === selectedInitiativeId), 
    [initiatives, selectedInitiativeId]
  );

  const { timelineItems, progress } = useMemo(() => {
    if (!selectedInitiativeId || !selectedInitiative) return { timelineItems: [], progress: 0 };

    // Buscar todos os filhos (Entregas, Tarefas, Bugs)
    const children = workItems.filter(item => {
      if (item.id === selectedInitiativeId) return false;
      const isChild = item.parentId === selectedInitiativeId;
      const isGrandChild = workItems.some(p => p.id === item.parentId && p.parentId === selectedInitiativeId);
      
      return (isChild || isGrandChild) && 
             (item.type === ItemType.DELIVERY || item.type === ItemType.TASK || item.type === ItemType.BUG) &&
             item.endDate;
    });

    // Adicionar a própria iniciativa como o marco final (Deadline)
    const itemsWithInitiative = [...children];
    if (selectedInitiative.endDate) {
      itemsWithInitiative.push(selectedInitiative);
    }

    // Ordenar cronologicamente
    const sorted = itemsWithInitiative.sort((a, b) => {
      const dateA = new Date(a.endDate! + 'T12:00:00Z').getTime();
      const dateB = new Date(b.endDate! + 'T12:00:00Z').getTime();
      
      // Se datas forem iguais, colocar a iniciativa por último
      if (dateA === dateB) {
        if (a.type === ItemType.INITIATIVE) return 1;
        if (b.type === ItemType.INITIATIVE) return -1;
      }
      return dateA - dateB;
    });
    
    const closed = children.filter(i => i.status === ItemStatus.CLOSED).length;
    const total = children.length;
    const calculatedProgress = total > 0 ? Math.round((closed / total) * 100) : 0;

    return { timelineItems: sorted, progress: calculatedProgress };
  }, [workItems, selectedInitiativeId, selectedInitiative]);

  const handleExportAsImage = async () => {
    if (!timelineRef.current || !selectedInitiative) return;
    
    setIsExporting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));

      const canvas = await html2canvas(timelineRef.current, {
        backgroundColor: '#f8fafc',
        scale: 2,
        logging: false,
        useCORS: true
      });

      const image = canvas.toDataURL("image/png");
      const link = document.createElement('a');
      link.href = image;
      link.download = `TIMELINE_${selectedInitiative.id}_${selectedInitiative.title.replace(/\s/g, '_')}.png`;
      link.click();
      
      const message = encodeURIComponent(`Olá! Segue o status atualizado da Iniciativa: ${selectedInitiative.title}\n📊 Progresso: ${progress}%`);
      window.open(`https://wa.me/?text=${message}`, '_blank');

      alert("Imagem gerada com sucesso!");
    } catch (err) {
      console.error("Falha ao exportar imagem:", err);
      alert("Erro ao gerar a imagem.");
    } finally {
      setIsExporting(false);
    }
  };

  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00Z');
    return {
      day: date.getUTCDate(),
      month: date.toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' }).toUpperCase()
    };
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden font-sans">
      <header className="bg-white border-b border-slate-200 p-6 lg:px-10 shrink-0 shadow-sm z-[100]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">Status da Iniciativa</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Visão cronológica e meta final</p>
            </div>
            {selectedInitiativeId && (
              <button 
                onClick={handleExportAsImage}
                disabled={isExporting}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black shadow-lg hover:bg-emerald-700 transition-all active:scale-95 uppercase tracking-tight ml-4 disabled:opacity-50"
              >
                {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                {isExporting ? 'Processando...' : 'Print para WhatsApp'}
              </button>
            )}
          </div>

          <div className="flex flex-1 max-w-2xl items-center gap-6">
            <div className="flex-1">
              <div className="flex justify-between items-end mb-2">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                  <TrendingUp size={12} className="text-emerald-500" /> Saúde do Projeto
                </span>
                <span className="text-lg font-black text-slate-900 tracking-tighter">{progress}%</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200 p-0.5">
                <div 
                  className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full transition-all duration-1000 ease-out shadow-inner"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="h-10 w-px bg-slate-200 hidden lg:block" />

            {/* BUSCA DE INICIATIVA */}
            <div className="relative w-full lg:w-72" ref={searchRef}>
              <div 
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 shadow-sm cursor-pointer hover:bg-slate-100 transition-all"
              >
                <Target size={16} className={selectedInitiativeId ? "text-blue-500" : "text-slate-400"} />
                <span className="flex-1 text-xs font-black text-slate-700 truncate uppercase">
                  {selectedInitiative ? selectedInitiative.title : 'Escolher Iniciativa...'}
                </span>
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${isSearchOpen ? 'rotate-180' : ''}`} />
              </div>

              {isSearchOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[200] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-3 border-b border-slate-100 bg-slate-50">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        autoFocus
                        type="text" 
                        placeholder="DIGITE PARA FILTRAR..." 
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 uppercase"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto custom-scrollbar">
                    {filteredInitiatives.map(init => (
                      <div 
                        key={init.id} 
                        onClick={() => {
                          setSelectedInitiativeId(init.id);
                          setIsSearchOpen(false);
                          setSearchTerm('');
                        }}
                        className={`p-3 border-b border-slate-50 cursor-pointer hover:bg-blue-50 transition-colors ${selectedInitiativeId === init.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''}`}
                      >
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{init.id}</p>
                        <p className="text-xs font-bold text-slate-800 uppercase mt-0.5">{init.title}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div ref={timelineRef} className="flex-1 flex flex-col justify-center items-center px-4 lg:px-12 py-10 relative overflow-hidden capture-area">
        {!selectedInitiativeId ? (
          <div className="flex flex-col items-center justify-center opacity-20 pointer-events-none gap-4">
            <Calendar size={100} strokeWidth={1} />
            <p className="text-xl font-black uppercase tracking-tighter text-center">Selecione uma iniciativa<br/>para mapear o cronograma</p>
          </div>
        ) : timelineItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center opacity-20 pointer-events-none gap-4">
            <Info size={100} strokeWidth={1} />
            <p className="text-xl font-black uppercase tracking-tighter text-center">Nenhum marco com data definido</p>
          </div>
        ) : (
          <div className="w-full max-w-7xl relative flex flex-col items-center">
            {/* Título Visível no Print */}
            <div className="hidden block-for-capture mb-12 text-center">
               <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">{selectedInitiative.title}</h2>
               <div className="flex items-center justify-center gap-4 mt-2">
                  <p className="text-sm font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-lg">Progresso: {progress}%</p>
                  <p className="text-sm font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-lg">Deadline: {selectedInitiative.endDate ? new Date(selectedInitiative.endDate + 'T12:00:00Z').toLocaleDateString('pt-BR') : 'A Definir'}</p>
               </div>
            </div>

            <div className="absolute top-1/2 left-0 right-0 h-1.5 bg-slate-200 -translate-y-1/2 rounded-full z-0 overflow-hidden">
               <div 
                 className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-1000"
                 style={{ width: `${progress}%` }}
               />
            </div>

            <div className="w-full flex justify-between items-center relative z-10">
              {timelineItems.map((item, idx) => {
                const date = formatDateLabel(item.endDate!);
                const isInitiative = item.type === ItemType.INITIATIVE;
                const isDelivery = item.type === ItemType.DELIVERY;
                const isClosed = item.status === ItemStatus.CLOSED;
                const isOdd = idx % 2 === 0;

                return (
                  <div 
                    key={item.id} 
                    className="flex flex-col items-center relative"
                    style={{ width: `${100 / timelineItems.length}%` }}
                  >
                    <div 
                      className={`absolute w-px bg-slate-200 transition-all duration-500 ${isClosed || isInitiative ? 'bg-blue-400' : ''}`}
                      style={{ 
                        height: isInitiative ? '140px' : isDelivery ? '100px' : '60px',
                        bottom: isOdd ? '100%' : 'auto',
                        top: !isOdd ? '100%' : 'auto'
                      }} 
                    />

                    <div 
                      onClick={() => setSelectedItemId(item.id)}
                      className={`
                        absolute flex flex-col items-center transition-all cursor-pointer group
                        ${isOdd ? (isInitiative ? 'bottom-[160px]' : 'bottom-[120px]') : (isInitiative ? 'top-[120px]' : 'top-[80px]')}
                      `}
                    >
                      <div className="text-center mb-2 transform group-hover:-translate-y-1 transition-transform">
                        <span className={`block text-xl font-black leading-none ${isInitiative ? 'text-emerald-600' : 'text-slate-800'}`}>{date.day}</span>
                        <span className="block text-[8px] font-black text-slate-500 uppercase">{date.month}</span>
                      </div>
                      
                      <div className={`
                        w-36 p-3 rounded-2xl border-2 transition-all shadow-sm bg-white text-center
                        ${isInitiative ? 'border-emerald-500 shadow-emerald-100' : isClosed ? 'border-emerald-100' : 'border-slate-100'}
                        group-hover:border-blue-400 group-hover:shadow-lg
                      `}>
                         <p className={`text-[8px] font-black uppercase mb-1 tracking-wider ${isInitiative ? 'text-emerald-600' : isDelivery ? 'text-blue-600' : 'text-slate-400'}`}>
                          {isInitiative ? '🏁 PRAZO PROJETO' : item.type}
                        </p>
                        <h4 className={`text-[10px] font-black leading-tight uppercase line-clamp-2 ${isInitiative ? 'text-emerald-700' : 'text-slate-700'}`}>
                          {item.title}
                        </h4>
                      </div>
                    </div>

                    <div 
                      onClick={() => setSelectedItemId(item.id)}
                      className={`
                        w-12 h-12 rounded-full flex items-center justify-center cursor-pointer transition-all relative z-20
                        ring-4 ring-slate-50 group
                        ${isInitiative ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-200 scale-125' : 
                          isDelivery ? 'bg-slate-900 text-white' : 'bg-white border-2 border-slate-300 text-slate-400'}
                        ${isClosed && !isInitiative ? 'bg-blue-600 border-blue-600 text-white ring-blue-50 shadow-lg shadow-blue-200/50 scale-110' : ''}
                        hover:scale-125
                      `}
                    >
                      {isInitiative ? <Flag size={20} /> : isDelivery ? <Package size={18} /> : <ListTodo size={16} />}
                      
                      {isClosed && (
                        <div className="absolute -top-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 border-2 border-white shadow-sm">
                          <CheckCircle2 size={10} strokeWidth={4} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <footer className="bg-white border-t border-slate-100 p-6 shrink-0 flex flex-wrap justify-center gap-8">
        <div className="flex items-center gap-3">
           <div className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center text-white"><Flag size={10}/></div>
           <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Deadline Final</span>
        </div>
        <div className="flex items-center gap-3">
           <div className="w-4 h-4 rounded-full bg-slate-900 border-2 border-white shadow-sm" />
           <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Entrega Estratégica</span>
        </div>
        <div className="flex items-center gap-3">
           <div className="w-4 h-4 rounded-full border-2 border-slate-300 bg-white" />
           <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tarefa / Bug</span>
        </div>
        <div className="w-px h-4 bg-slate-200" />
        <div className="flex items-center gap-2 text-slate-400">
          <Info size={14} />
          <span className="text-[10px] font-bold uppercase tracking-tighter">A Iniciativa selecionada marca o fim da Linha do Tempo</span>
        </div>
      </footer>

      {selectedItemId && (
        <ItemPanel 
          item={workItems.find(i => i.id === selectedItemId)!} 
          onClose={() => setSelectedItemId(null)} 
        />
      )}
    </div>
  );
};

export default TimelineView;
