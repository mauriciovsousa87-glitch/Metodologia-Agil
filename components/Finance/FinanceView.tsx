
import React, { useMemo, useState, useEffect } from 'react';
import { useAgile } from '../../store';
import { WorkItem, ItemType, ItemStatus } from '../../types';
import { DollarSign, AlertTriangle, Filter, ChevronDown, CheckCircle2, Info, TrendingUp, CreditCard, PieChart } from 'lucide-react';
import ItemPanel from '../Backlog/ItemPanel';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

const COST_THEMES = {
  'CAPEX': { bar: 'bg-cyan-500', text: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-100' },
  'OPEX': { bar: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  'SEVIM': { bar: 'bg-amber-400', text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
  'OUTROS': { bar: 'bg-rose-500', text: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' }
};

const STATUS_THEMES = {
  [ItemStatus.NEW]: 'bg-slate-300',
  [ItemStatus.IN_PROGRESS]: 'bg-amber-500',
  [ItemStatus.CLOSED]: 'bg-emerald-500'
};

const FinanceView: React.FC = () => {
  const { workItems } = useAgile();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  
  const [selectedInitiativeId, setSelectedInitiativeId] = useState<string>(() => {
    return localStorage.getItem('finance_selected_initiative') || '';
  });

  useEffect(() => {
    localStorage.setItem('finance_selected_initiative', selectedInitiativeId);
  }, [selectedInitiativeId]);

  const initiatives = useMemo(() => {
    return workItems.filter(i => i.type === ItemType.INITIATIVE);
  }, [workItems]);

  const costItems = useMemo(() => {
    let items = workItems.filter(item => {
      const val = Number((item as any).costValue) || 0;
      const hasCostData = (item as any).costItem || (item as any).requestNum || (item as any).orderNum;
      return val > 0 || hasCostData;
    });
    
    if (selectedInitiativeId) {
      items = items.filter(item => {
        if (item.parentId === selectedInitiativeId) return true;
        if (item.workstreamId === selectedInitiativeId) return true;
        const parent = workItems.find(p => p.id === item.parentId);
        if (parent && (parent.parentId === selectedInitiativeId || parent.id === selectedInitiativeId)) return true;
        return false;
      });
    }
    
    return items;
  }, [workItems, selectedInitiativeId]);

  // KPIs Estratégicos
  const stats = useMemo(() => {
    const total = costItems.reduce((acc, curr) => acc + (Number((curr as any).costValue) || 0), 0);
    const orderItems = costItems.filter(i => ['Pedido Emitido', 'Faturado', 'Faturado / Concluído'].includes((i as any).billingStatus));
    const orderPercentage = costItems.length > 0 ? (orderItems.length / costItems.length) * 100 : 0;
    
    const capex = costItems.filter(i => (i as any).costType === 'CAPEX').reduce((acc, curr) => acc + (Number((curr as any).costValue) || 0), 0);
    const opex = costItems.filter(i => (i as any).costType === 'OPEX').reduce((acc, curr) => acc + (Number((curr as any).costValue) || 0), 0);
    
    return { total, orderPercentage, capex, opex, count: costItems.length };
  }, [costItems]);

  const itemsByMonth = useMemo(() => {
    const map: Record<string, WorkItem[]> = {};
    MONTHS.forEach(m => map[m] = []);
    
    costItems.forEach(item => {
      const dateStr = item.endDate || item.startDate;
      if (dateStr) {
        try {
          const date = new Date(dateStr + 'T12:00:00');
          const monthIndex = date.getMonth();
          if (monthIndex >= 0 && monthIndex <= 11) {
            map[MONTHS[monthIndex]].push(item);
          }
        } catch (e) {
          console.error("Data inválida no item:", item.id);
        }
      }
    });
    return map;
  }, [costItems]);

  const formatCurrency = (val: number) => {
    if (val >= 1000) return `R$ ${(val / 1000).toFixed(1)}K`;
    return `R$ ${val.toFixed(0)}`;
  };

  const getStatusColor = (status: ItemStatus) => {
    return STATUS_THEMES[status] || STATUS_THEMES[ItemStatus.NEW];
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden p-6 font-sans">
      <header className="mb-6 flex flex-col gap-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter leading-none">Roadmap de Custos</h1>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Visão Gerencial de Investimentos</p>
          </div>
          
          <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 px-2 border-r border-slate-100">
              <Filter size={14} className="text-blue-500" />
              <span className="text-[10px] font-black text-slate-400 uppercase">Projeto:</span>
            </div>
            <select 
              className="bg-transparent text-xs font-bold text-slate-700 outline-none min-w-[200px] cursor-pointer"
              value={selectedInitiativeId}
              onChange={(e) => setSelectedInitiativeId(e.target.value)}
            >
              <option value="">TODOS OS PROJETOS</option>
              {initiatives.map(init => (
                <option key={init.id} value={init.id}>{init.title}</option>
              ))}
            </select>
          </div>
        </div>

        {/* COCKPIT DE KPIS FINANCEIROS */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Investimento Total</p>
              <p className="text-xl font-black text-slate-800">{formatCurrency(stats.total)}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <CreditCard size={24} />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Conversão em Pedido</p>
              <div className="flex items-center gap-2">
                <p className="text-xl font-black text-slate-800">{Math.round(stats.orderPercentage)}%</p>
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                   <div className="h-full bg-emerald-500" style={{ width: `${stats.orderPercentage}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-cyan-50 text-cyan-600 rounded-2xl">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Alocação CAPEX</p>
              <p className="text-xl font-black text-slate-800">{formatCurrency(stats.capex)}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-slate-50 text-slate-600 rounded-2xl">
              <PieChart size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Itens Mapeados</p>
              <p className="text-xl font-black text-slate-800">{stats.count} <span className="text-xs font-bold text-slate-400">Tarefas</span></p>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center bg-white/50 p-2 rounded-xl border border-slate-100">
           <div className="flex gap-4">
              {Object.entries(COST_THEMES).map(([name, theme]) => (
                <div key={name} className="flex items-center gap-2">
                  <div className={`w-4 h-1.5 rounded-full ${theme.bar}`} />
                  <span className="text-[9px] font-black text-slate-500 uppercase">{name}</span>
                </div>
              ))}
           </div>
           <div className="flex gap-4 items-center">
              <div className="flex gap-3">
                {Object.entries(STATUS_THEMES).map(([status, colorClass]) => (
                  <div key={status} className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${colorClass}`} />
                    <span className="text-[9px] font-bold text-slate-600 uppercase">{status}</span>
                  </div>
                ))}
              </div>
              <div className="w-px h-3 bg-slate-200 mx-2" />
              <div className="flex items-center gap-2 text-slate-400">
                 <Info size={12} />
                 <span className="text-[9px] font-bold uppercase">Clique no item para editar</span>
              </div>
           </div>
        </div>
      </header>

      {/* TIMELINE REESTRUTURADA - FIXADA NA BASE */}
      <div className="flex-1 relative flex flex-col justify-end">
        
        {costItems.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center opacity-10 pointer-events-none">
            <DollarSign size={120} />
            <p className="text-lg font-black uppercase text-center">Aguardando dados de custo...</p>
          </div>
        )}

        <div className="relative w-full flex items-end justify-around pb-4">
          {/* Fundo da trilha temporal */}
          <div className="absolute bottom-10 left-0 right-0 h-px bg-slate-200 -z-20" />

          {MONTHS.map((month) => {
            const monthItems = itemsByMonth[month];
            
            return (
              <div key={month} className="relative flex flex-col items-center group w-full">
                {/* Guias verticais leves */}
                <div className="absolute bottom-full w-px h-[600px] bg-slate-200/40 border-l border-dashed border-slate-300 -z-10 group-hover:bg-blue-100/50 transition-colors" />

                {/* Container de Itens (Cascata vertical invertida) */}
                <div className="absolute bottom-16 flex flex-col-reverse items-center gap-6 w-full px-1 max-h-[450px] overflow-visible">
                  {monthItems.map((item, idx) => {
                    const costType = (item as any).costType || 'OUTROS';
                    const theme = COST_THEMES[costType as keyof typeof COST_THEMES] || COST_THEMES.OUTROS;
                    const isPending = (item as any).billingStatus === 'Em aberto';
                    const isBilled = ['Faturado', 'Faturado / Concluído'].includes((item as any).billingStatus);

                    return (
                      <div 
                        key={item.id}
                        onClick={() => setSelectedItemId(item.id)}
                        className="w-full max-w-[130px] flex flex-col items-center cursor-pointer transform hover:-translate-y-2 transition-all animate-in slide-in-from-bottom-6 duration-500"
                        style={{ animationDelay: `${idx * 150}ms` }}
                      >
                        <div className="text-[10px] font-black text-slate-900 mb-1 bg-white px-2 py-0.5 rounded-full shadow-sm border border-slate-100">
                          {formatCurrency(Number((item as any).costValue) || 0)}
                        </div>

                        <div className={`w-8 h-1.5 rounded-full mb-2 ${theme.bar} shadow-sm ring-2 ring-white`} />

                        <div className={`text-center p-2 rounded-xl border-2 transition-colors ${theme.bg} ${theme.border} group-hover:border-blue-300`}>
                          <div className="flex items-center justify-center gap-1.5 mb-1">
                            <div className={`w-2 h-2 rounded-full shrink-0 shadow-sm ${getStatusColor(item.status)}`} />
                            <p className="text-[9px] font-black text-slate-800 leading-tight uppercase line-clamp-1">
                              {(item as any).costItem || item.title}
                            </p>
                          </div>
                          
                          <div className="flex items-center justify-center gap-1">
                            {isPending && <AlertTriangle size={10} className="text-amber-500" />}
                            {isBilled && <CheckCircle2 size={10} className="text-emerald-500" />}
                            <span className="text-[8px] font-bold text-slate-400">{(item as any).orderNum || 'Sem PO'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ESFERA DO MÊS - ANCORADA NA BASE */}
                <div className="w-12 h-12 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-black shadow-lg ring-4 ring-white group-hover:bg-blue-600 group-hover:scale-110 transition-all z-20">
                  {month}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedItemId && (
        <ItemPanel 
          item={workItems.find(i => i.id === selectedItemId)!} 
          onClose={() => setSelectedItemId(null)} 
        />
      )}
    </div>
  );
};

export default FinanceView;
