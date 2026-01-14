
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

const FinanceView: React.FC = () => {
  const { workItems } = useAgile();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedParentId, setSelectedParentId] = useState<string>(() => localStorage.getItem('finance_selected_parent') || '');

  useEffect(() => { 
    localStorage.setItem('finance_selected_parent', selectedParentId); 
  }, [selectedParentId]);

  // Lista consolidada de Frentes e Iniciativas para o seletor
  const filterOptions = useMemo(() => {
    return workItems.filter(i => i.type === ItemType.WORKSTREAM || i.type === ItemType.INITIATIVE)
      .sort((a, b) => a.type.localeCompare(b.type));
  }, [workItems]);

  const costItems = useMemo(() => {
    // 1. Primeiro pegamos todos os itens que têm valor financeiro
    const itemsWithCost = workItems.filter(item => {
      const val = Number((item as any).costValue) || 0;
      return val > 0 || (item as any).costItem;
    });

    if (!selectedParentId) return itemsWithCost;

    // 2. Lógica de filtro hierárquico
    return itemsWithCost.filter(item => {
      // Caso direto: o item é filho direto da seleção
      if (item.parentId === selectedParentId || item.workstreamId === selectedParentId) return true;
      
      // Caso indireto (avô): o pai deste item tem como pai a seleção
      const parent = workItems.find(p => p.id === item.parentId);
      if (parent && (parent.parentId === selectedParentId || parent.workstreamId === selectedParentId)) return true;

      // Caso bisavô (para tarefas profundas):
      if (parent) {
        const grandParent = workItems.find(gp => gp.id === parent.parentId);
        if (grandParent && (grandParent.parentId === selectedParentId || grandParent.workstreamId === selectedParentId)) return true;
      }

      return false;
    });
  }, [workItems, selectedParentId]);

  const stats = useMemo(() => {
    const total = costItems.reduce((acc, curr) => acc + (Number((curr as any).costValue) || 0), 0);
    const orderItems = costItems.filter(i => ['Pedido Emitido', 'Faturado'].includes((i as any).billingStatus));
    const orderPercentage = costItems.length > 0 ? (orderItems.length / costItems.length) * 100 : 0;
    const capex = costItems.filter(i => (i as any).costType === 'CAPEX').reduce((acc, curr) => acc + (Number((curr as any).costValue) || 0), 0);
    return { total, orderPercentage, capex, count: costItems.length };
  }, [costItems]);

  const itemsByMonth = useMemo(() => {
    const map: Record<string, WorkItem[]> = {};
    MONTHS.forEach(m => map[m] = []);
    costItems.forEach(item => {
      const dateStr = item.endDate || item.startDate;
      if (dateStr) {
        const date = new Date(dateStr + 'T12:00:00');
        const monthIndex = date.getMonth();
        if (monthIndex >= 0 && monthIndex <= 11) map[MONTHS[monthIndex]].push(item);
      }
    });
    return map;
  }, [costItems]);

  const formatCurrency = (val: number) => {
    if (val >= 1000000) return `R$ ${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `R$ ${(val / 1000).toFixed(1)}K`;
    return `R$ ${val.toFixed(0)}`;
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden p-4 lg:p-6 font-sans">
      <header className="mb-6 flex flex-col gap-6">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-black text-slate-800 uppercase tracking-tighter">Roadmap de Custos</h1>
            <p className="text-[10px] lg:text-xs font-bold text-slate-400 uppercase tracking-widest">Fluxo de Caixa por Cronograma</p>
          </div>
          
          <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm w-full lg:w-auto">
            <Filter size={14} className="text-slate-400 ml-2" />
            <select 
              className="bg-transparent text-xs font-black text-slate-700 outline-none w-full lg:min-w-[280px] cursor-pointer py-1"
              value={selectedParentId}
              onChange={(e) => setSelectedParentId(e.target.value)}
            >
              <option value="">TODOS OS INVESTIMENTOS</option>
              {filterOptions.map(opt => (
                <option key={opt.id} value={opt.id}>
                  {opt.type === ItemType.WORKSTREAM ? 'FT: ' : 'IN: '} {opt.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          {[
            { label: 'Orcamento Total', value: formatCurrency(stats.total), icon: DollarSign, bg: 'bg-blue-600', text: 'text-white' },
            { label: 'Pedidos Emitidos', value: `${Math.round(stats.orderPercentage)}%`, icon: CreditCard, bg: 'bg-white', text: 'text-emerald-600' },
            { label: 'Investimento CAPEX', value: formatCurrency(stats.capex), icon: TrendingUp, bg: 'bg-white', text: 'text-cyan-600' },
            { label: 'Qtd Itens Custo', value: stats.count, icon: PieChart, bg: 'bg-white', text: 'text-slate-600' }
          ].map((stat, i) => (
            <div key={i} className={`p-3 lg:p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 transition-all ${stat.bg === 'bg-white' ? 'bg-white' : stat.bg}`}>
              <div className={`p-2 rounded-xl ${stat.bg === 'bg-white' ? 'bg-slate-50' : 'bg-white/20'} ${stat.text} shrink-0`}>
                <stat.icon size={18} />
              </div>
              <div className="overflow-hidden">
                <p className={`text-[8px] lg:text-[10px] font-black uppercase tracking-wider truncate ${stat.bg === 'bg-white' ? 'text-slate-400' : 'text-blue-100'}`}>{stat.label}</p>
                <p className={`text-sm lg:text-xl font-black truncate ${stat.bg === 'bg-white' ? 'text-slate-800' : 'text-white'}`}>{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      </header>

      <div className="flex-1 relative flex flex-col justify-end overflow-x-auto custom-scrollbar pb-6">
        <div className="relative min-w-[1200px] flex items-end justify-around pb-4 pt-48 px-10">
          <div className="absolute bottom-10 left-0 right-0 h-px bg-slate-200 -z-20" />

          {MONTHS.map((month) => {
            const monthItems = itemsByMonth[month];
            const monthTotal = monthItems.reduce((acc, curr) => acc + (Number((curr as any).costValue) || 0), 0);

            return (
              <div key={month} className="relative flex flex-col items-center group w-full">
                {/* Linha vertical de grid */}
                <div className="absolute bottom-full w-px h-[600px] bg-slate-200/40 border-l border-dashed border-slate-300 -z-10" />
                
                {/* Itens empilhados */}
                <div className="absolute bottom-20 flex flex-col-reverse items-center gap-2 w-full px-2 max-h-[500px] overflow-visible">
                  {monthItems.map((item) => (
                    <div 
                      key={item.id}
                      onClick={() => setSelectedItemId(item.id)}
                      className="w-full flex flex-col items-center cursor-pointer group/item"
                    >
                      <div className="opacity-0 group-hover/item:opacity-100 transition-opacity mb-1 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full whitespace-nowrap z-50">
                        {item.title}
                      </div>
                      <div 
                        className={`w-full h-2 rounded-full mb-1 ${COST_THEMES[((item as any).costType as keyof typeof COST_THEMES) || 'OUTROS'].bar} shadow-sm ring-1 ring-white hover:scale-y-150 transition-transform`} 
                        title={`${item.title}: ${formatCurrency(Number((item as any).costValue) || 0)}`}
                      />
                    </div>
                  ))}

                  {monthTotal > 0 && (
                    <div className="mb-2 text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100 shadow-sm">
                      {formatCurrency(monthTotal)}
                    </div>
                  )}
                </div>

                {/* Marcador do Mês */}
                <div className="w-14 h-14 rounded-full bg-white border-2 border-slate-200 text-slate-400 flex flex-col items-center justify-center shadow-sm group-hover:border-blue-500 group-hover:text-blue-600 transition-all z-20 bg-white">
                  <span className="text-[10px] font-black">{month}</span>
                  <span className="text-[7px] font-bold opacity-60">2025</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <footer className="bg-white border-t border-slate-100 p-4 shrink-0 flex justify-center gap-6">
        {Object.entries(COST_THEMES).map(([key, theme]) => (
          <div key={key} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${theme.bar}`} />
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{key}</span>
          </div>
        ))}
      </footer>

      {selectedItemId && (
        <ItemPanel item={workItems.find(i => i.id === selectedItemId)!} onClose={() => setSelectedItemId(null)} />
      )}
    </div>
  );
};

export default FinanceView;
