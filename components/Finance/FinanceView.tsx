
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
  const [selectedInitiativeId, setSelectedInitiativeId] = useState<string>(() => localStorage.getItem('finance_selected_initiative') || '');

  useEffect(() => { localStorage.setItem('finance_selected_initiative', selectedInitiativeId); }, [selectedInitiativeId]);

  const initiatives = useMemo(() => workItems.filter(i => i.type === ItemType.INITIATIVE), [workItems]);

  const costItems = useMemo(() => {
    let items = workItems.filter(item => {
      const val = Number((item as any).costValue) || 0;
      return val > 0 || (item as any).costItem;
    });
    if (selectedInitiativeId) {
      items = items.filter(item => item.parentId === selectedInitiativeId || item.workstreamId === selectedInitiativeId);
    }
    return items;
  }, [workItems, selectedInitiativeId]);

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
    if (val >= 1000) return `R$ ${(val / 1000).toFixed(1)}K`;
    return `R$ ${val.toFixed(0)}`;
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden p-4 lg:p-6 font-sans">
      <header className="mb-6 flex flex-col gap-6">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-black text-slate-800 uppercase tracking-tighter">Roadmap de Custos</h1>
            <p className="text-[10px] lg:text-xs font-bold text-slate-400 uppercase tracking-widest">Gestão de Investimentos</p>
          </div>
          
          <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm w-full lg:w-auto">
            <select 
              className="bg-transparent text-xs font-bold text-slate-700 outline-none w-full lg:min-w-[200px] cursor-pointer"
              value={selectedInitiativeId}
              onChange={(e) => setSelectedInitiativeId(e.target.value)}
            >
              <option value="">TODOS OS PROJETOS</option>
              {initiatives.map(init => <option key={init.id} value={init.id}>{init.title}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          {[
            { label: 'Total', value: formatCurrency(stats.total), icon: DollarSign, bg: 'bg-blue-50', text: 'text-blue-600' },
            { label: 'Pedidos', value: `${Math.round(stats.orderPercentage)}%`, icon: CreditCard, bg: 'bg-emerald-50', text: 'text-emerald-600' },
            { label: 'CAPEX', value: formatCurrency(stats.capex), icon: TrendingUp, bg: 'bg-cyan-50', text: 'text-cyan-600' },
            { label: 'Itens', value: stats.count, icon: PieChart, bg: 'bg-slate-50', text: 'text-slate-600' }
          ].map((stat, i) => (
            <div key={i} className="bg-white p-3 lg:p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
              <div className={`p-2 rounded-xl ${stat.bg} ${stat.text} shrink-0`}>
                <stat.icon size={18} />
              </div>
              <div className="overflow-hidden">
                <p className="text-[8px] lg:text-[10px] font-black text-slate-400 uppercase tracking-wider truncate">{stat.label}</p>
                <p className="text-sm lg:text-xl font-black text-slate-800 truncate">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      </header>

      <div className="flex-1 relative flex flex-col justify-end overflow-x-auto custom-scrollbar pb-6">
        <div className="relative min-w-[1000px] flex items-end justify-around pb-4 pt-40">
          <div className="absolute bottom-10 left-0 right-0 h-px bg-slate-200 -z-20" />

          {MONTHS.map((month) => {
            const monthItems = itemsByMonth[month];
            return (
              <div key={month} className="relative flex flex-col items-center group w-full">
                <div className="absolute bottom-full w-px h-[600px] bg-slate-200/40 border-l border-dashed border-slate-300 -z-10" />
                <div className="absolute bottom-16 flex flex-col-reverse items-center gap-6 w-full px-1 max-h-[400px] overflow-visible">
                  {monthItems.map((item, idx) => (
                    <div 
                      key={item.id}
                      onClick={() => setSelectedItemId(item.id)}
                      className="w-full max-w-[120px] flex flex-col items-center cursor-pointer transform hover:-translate-y-2 transition-all animate-in slide-in-from-bottom-6 duration-500"
                    >
                      <div className="text-[9px] font-black text-slate-900 mb-1 bg-white px-2 py-0.5 rounded-full shadow-sm border border-slate-100">
                        {formatCurrency(Number((item as any).costValue) || 0)}
                      </div>
                      <div className={`w-8 h-1 rounded-full mb-1 ${COST_THEMES[((item as any).costType as keyof typeof COST_THEMES) || 'OUTROS'].bar} shadow-sm ring-2 ring-white`} />
                      <div className="text-center p-2 rounded-xl border border-slate-200 bg-white shadow-sm w-full group-hover:border-blue-300">
                        <p className="text-[9px] font-black text-slate-800 leading-tight uppercase line-clamp-1">
                          {(item as any).costItem || item.title}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="w-12 h-12 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-black shadow-lg ring-4 ring-white group-hover:bg-blue-600 transition-all z-20">
                  {month}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedItemId && (
        <ItemPanel item={workItems.find(i => i.id === selectedItemId)!} onClose={() => setSelectedItemId(null)} />
      )}
    </div>
  );
};

export default FinanceView;
