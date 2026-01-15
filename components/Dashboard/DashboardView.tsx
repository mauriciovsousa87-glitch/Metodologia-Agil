
import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { 
  TrendingUp, CheckCircle2, AlertTriangle, Users, 
  Target, Activity, Filter, Database, Search, AlertCircle, FileWarning, X, DollarSign, Layers
} from 'lucide-react';
import { useAgile } from '../../store';
import { ItemStatus, ItemType } from '../../types';
import ItemPanel from '../Backlog/ItemPanel';

type QualityFilter = 'all' | 'assignee' | 'date' | 'effort' | 'sprint';

const DashboardView: React.FC = () => {
  const { workItems, sprints, users } = useAgile();
  const [activeTab, setActiveTab] = useState<'gerencial' | 'preenchimento'>('gerencial');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [qualityFilter, setQualityFilter] = useState<QualityFilter>('all');

  // --- LÓGICA DASHBOARD GERENCIAL ---
  
  // 1. Métricas dos Cards
  const iniciativas = workItems.filter(i => i.type === ItemType.INITIATIVE);
  const totalIniciativas = iniciativas.length;
  const iniciativasConcluidas = iniciativas.filter(i => i.status === ItemStatus.CLOSED).length;
  const percentualIniciativas = totalIniciativas > 0 ? Math.round((iniciativasConcluidas / totalIniciativas) * 100) : 0;
  
  const investimentoTotal = workItems.reduce((acc, curr) => acc + (Number((curr as any).costValue) || 0), 0);
  const taxaEntregaGeral = workItems.length > 0 ? Math.round((workItems.filter(i => i.status === ItemStatus.CLOSED).length / workItems.length) * 100) : 0;

  // 2. Gráfico Mensal (Tarefas Planejadas vs Concluídas)
  const monthlyData = useMemo(() => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const currentYear = new Date().getFullYear();
    
    return months.map((month, index) => {
      const tasksInMonth = workItems.filter(i => {
        if (!i.endDate || (i.type !== ItemType.TASK && i.type !== ItemType.BUG)) return false;
        const date = new Date(i.endDate + 'T12:00:00');
        return date.getMonth() === index && date.getFullYear() === currentYear;
      });

      return {
        name: month,
        planejado: tasksInMonth.length,
        concluido: tasksInMonth.filter(i => i.status === ItemStatus.CLOSED).length
      };
    });
  }, [workItems]);

  // 3. Gráfico de Tarefas por Colaborador
  const collaboratorData = useMemo(() => {
    return users.map(user => {
      const userTasks = workItems.filter(i => i.assigneeId === user.id && (i.type === ItemType.TASK || i.type === ItemType.BUG));
      return {
        name: user.name.split(' ')[0],
        total: userTasks.length,
        concluido: userTasks.filter(i => i.status === ItemStatus.CLOSED).length
      };
    }).sort((a, b) => b.total - a.total).slice(0, 8);
  }, [users, workItems]);

  const statusData = [
    { name: 'Novo', value: workItems.filter(i => i.status === ItemStatus.NEW).length, color: '#94a3b8' },
    { name: 'Em andamento', value: workItems.filter(i => i.status === ItemStatus.IN_PROGRESS).length, color: '#f59e0b' },
    { name: 'Concluído', value: workItems.filter(i => i.status === ItemStatus.CLOSED).length, color: '#10b981' },
  ];

  // --- LÓGICA DASHBOARD DE PREENCHIMENTO ---
  const itemsMissingAssignee = workItems.filter(i => !i.assigneeId);
  const itemsMissingDates = workItems.filter(i => !i.endDate);
  const itemsMissingEffort = workItems.filter(i => (i.type === ItemType.TASK || i.type === ItemType.BUG) && !i.effort);
  const itemsMissingSprint = workItems.filter(i => (i.type === ItemType.TASK || i.type === ItemType.BUG) && !i.sprintId);

  const qualityStats = [
    { id: 'assignee' as QualityFilter, label: 'Sem Responsável', count: itemsMissingAssignee.length, icon: Users, color: 'text-amber-600', bg: 'bg-amber-50', activeBorder: 'border-amber-400', activeShadow: 'shadow-amber-100' },
    { id: 'date' as QualityFilter, label: 'Sem Data Fim', count: itemsMissingDates.length, icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50', activeBorder: 'border-orange-400', activeShadow: 'shadow-orange-100' },
    { id: 'effort' as QualityFilter, label: 'Esforço Zero', count: itemsMissingEffort.length, icon: Database, color: 'text-red-600', bg: 'bg-red-50', activeBorder: 'border-red-400', activeShadow: 'shadow-red-100' },
    { id: 'sprint' as QualityFilter, label: 'Fora de Sprints', count: itemsMissingSprint.length, icon: Target, color: 'text-blue-600', bg: 'bg-blue-50', activeBorder: 'border-blue-400', activeShadow: 'shadow-blue-100' },
  ];

  const filteredIncompleteItems = useMemo(() => {
    return workItems.filter(i => {
      const hasIssue = !i.assigneeId || !i.endDate || ((i.type === ItemType.TASK || i.type === ItemType.BUG) && !i.effort) || ((i.type === ItemType.TASK || i.type === ItemType.BUG) && !i.sprintId);
      if (!hasIssue) return false;

      if (qualityFilter === 'all') return true;
      if (qualityFilter === 'assignee') return !i.assigneeId;
      if (qualityFilter === 'date') return !i.endDate;
      if (qualityFilter === 'effort') return (i.type === ItemType.TASK || i.type === ItemType.BUG) && !i.effort;
      if (qualityFilter === 'sprint') return (i.type === ItemType.TASK || i.type === ItemType.BUG) && !i.sprintId;
      return true;
    });
  }, [workItems, qualityFilter]);

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-hidden">
      {/* HEADER COM ABAS */}
      <header className="bg-white border-b px-8 py-6 shrink-0 shadow-sm z-10">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Dashboards</h1>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Análise de Performance e Qualidade</p>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button 
              onClick={() => setActiveTab('gerencial')}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-2 ${activeTab === 'gerencial' ? 'bg-white shadow-md text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <TrendingUp size={14} /> Gerencial
            </button>
            <button 
              onClick={() => setActiveTab('preenchimento')}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-2 ${activeTab === 'preenchimento' ? 'bg-white shadow-md text-orange-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <FileWarning size={14} /> Preenchimento
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        {activeTab === 'gerencial' ? (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Stats Cards Gerenciais Reformulados */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Total de Iniciativas', value: totalIniciativas, icon: Layers, color: 'blue' },
                { label: '% Execução Iniciativas', value: `${percentualIniciativas}%`, icon: CheckCircle2, color: 'emerald' },
                { label: 'Investimento Total', value: formatBRL(investimentoTotal), icon: DollarSign, color: 'amber' },
                { label: 'Taxa de Entrega (Geral)', value: `${taxaEntregaGeral}%`, icon: TrendingUp, color: 'purple' },
              ].map((stat, i) => (
                <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-md transition-all">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                    <h3 className={`text-xl font-black tracking-tighter ${stat.color === 'amber' ? 'text-slate-800 text-lg' : 'text-slate-800 text-2xl'}`}>{stat.value}</h3>
                  </div>
                  <div className={`p-3 rounded-xl bg-slate-50 group-hover:bg-blue-50 transition-colors`}>
                    <stat.icon size={24} className="text-slate-400 group-hover:text-blue-600" />
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Gráfico Mensal de Tarefas */}
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                <h3 className="text-sm font-black text-slate-800 uppercase mb-8 flex items-center gap-2 tracking-tighter">
                  <TrendingUp size={18} className="text-blue-500" /> Histórico Mensal de Tarefas (2025)
                </h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} fontVariant="bold" />
                      <YAxis fontSize={10} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px' }} />
                      <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}/>
                      <Bar dataKey="planejado" fill="#cbd5e1" radius={[6, 6, 0, 0]} name="Planejado" />
                      <Bar dataKey="concluido" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Concluído" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Novo Gráfico: Produtividade por Colaborador */}
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                <h3 className="text-sm font-black text-slate-800 uppercase mb-8 flex items-center gap-2 tracking-tighter">
                  <Users size={18} className="text-emerald-500" /> Tarefas por Colaborador
                </h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={collaboratorData}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" fontSize={10} axisLine={false} tickLine={false} />
                      <YAxis dataKey="name" type="category" fontSize={10} axisLine={false} tickLine={false} width={80} />
                      <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px' }} />
                      <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}/>
                      <Bar dataKey="total" fill="#e2e8f0" radius={[0, 4, 4, 0]} name="Total Atribuído" />
                      <Bar dataKey="concluido" fill="#10b981" radius={[0, 4, 4, 0]} name="Concluído" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 max-w-xl">
              <h3 className="text-sm font-black text-slate-800 uppercase mb-8 flex items-center gap-2 tracking-tighter">
                  <Activity size={18} className="text-orange-500" /> Distribuição de Status
              </h3>
              <div className="h-[250px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={8}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            {/* Mantido Dashboard de Preenchimento existente */}
            <div className="bg-orange-600 rounded-3xl p-8 text-white flex flex-col lg:flex-row items-center justify-between gap-6 shadow-xl shadow-orange-900/20">
              <div className="flex items-center gap-6 text-center lg:text-left">
                <div className="p-4 bg-white/20 rounded-2xl">
                  <FileWarning size={48} />
                </div>
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tighter">Audit de Preenchimento</h2>
                  <p className="text-orange-100 text-sm font-bold uppercase tracking-widest mt-1">Clique nos cards para filtrar as pendências</p>
                </div>
              </div>
              <div className="flex items-center gap-8">
                <div className="text-center">
                  <p className="text-4xl font-black">{workItems.filter(i => !i.assigneeId || !i.endDate || ((i.type === ItemType.TASK || i.type === ItemType.BUG) && !i.effort)).length}</p>
                  <p className="text-[10px] font-black uppercase opacity-60">Itens com Pendência</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {qualityStats.map((stat, i) => {
                const isActive = qualityFilter === stat.id;
                return (
                  <button 
                    key={i} 
                    onClick={() => setQualityFilter(isActive ? 'all' : stat.id)}
                    className={`
                      bg-white p-6 rounded-3xl border text-left transition-all flex flex-col gap-4 group cursor-pointer
                      ${isActive ? `${stat.activeBorder} ${stat.activeShadow} shadow-lg scale-105 ring-2 ring-offset-2 ring-transparent` : 'border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-1'}
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`p-2 rounded-xl ${stat.bg} ${stat.color}`}>
                        <stat.icon size={20} />
                      </div>
                      <span className={`text-2xl font-black ${isActive ? 'text-slate-900' : 'text-slate-800'}`}>{stat.count}</span>
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight">{stat.label}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Pendências Críticas</p>
                    </div>
                    {isActive && (
                      <div className="mt-auto pt-2 border-t border-slate-50 flex items-center justify-between text-[8px] font-black uppercase text-blue-600">
                        <span>Filtro Ativo</span>
                        <X size={10} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden transition-all duration-300">
               <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                 <div className="flex items-center gap-4">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
                      <Search size={18} className="text-blue-600" /> 
                      {qualityFilter === 'all' ? 'Todas as Pendências' : `Filtrado por: ${qualityStats.find(s => s.id === qualityFilter)?.label}`}
                    </h3>
                    {qualityFilter !== 'all' && (
                      <button 
                        onClick={() => setQualityFilter('all')}
                        className="px-3 py-1 bg-slate-200 text-slate-600 rounded-full text-[8px] font-black uppercase hover:bg-slate-300 transition-colors flex items-center gap-1"
                      >
                        Limpar Filtro <X size={10} />
                      </button>
                    )}
                 </div>
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Clique para editar e corrigir</span>
               </div>
               <div className="p-2 overflow-x-auto">
                 <table className="w-full text-left border-separate border-spacing-y-2">
                   <thead>
                     <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                       <th className="px-6 py-3">Item</th>
                       <th className="px-6 py-3">Tipo</th>
                       <th className="px-6 py-3">Ausência Detectada</th>
                       <th className="px-6 py-3 text-right">Ação</th>
                     </tr>
                   </thead>
                   <tbody>
                     {filteredIncompleteItems.slice(0, 50).map(item => {
                        const issues = [];
                        if (!item.assigneeId) issues.push('Dono');
                        if (!item.endDate) issues.push('Prazo');
                        if (!item.effort && (item.type === ItemType.TASK || item.type === ItemType.BUG)) issues.push('Esforço');
                        if (!item.sprintId && (item.type === ItemType.TASK || item.type === ItemType.BUG)) issues.push('Sprint');
                        if (!item.parentId && item.type === ItemType.TASK) issues.push('Vínculo Pai');

                        return (
                          <tr 
                            key={item.id} 
                            onClick={() => setSelectedItemId(item.id)}
                            className="bg-white border-y border-slate-50 hover:bg-slate-50 cursor-pointer group transition-all"
                          >
                            <td className="px-6 py-4 rounded-l-2xl border-l border-y border-slate-100">
                              <div className="flex flex-col">
                                <span className="text-[9px] font-black text-slate-400 uppercase">{item.id}</span>
                                <span className="text-xs font-bold text-slate-800 group-hover:text-blue-600">{item.title}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 border-y border-slate-100">
                               <span className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase bg-slate-100 text-slate-500 border border-slate-200">{item.type}</span>
                            </td>
                            <td className="px-6 py-4 border-y border-slate-100">
                              <div className="flex gap-1.5 flex-wrap">
                                {issues.map(iss => (
                                  <span key={iss} className="px-2 py-1 bg-red-50 text-red-600 text-[8px] font-black rounded-lg uppercase border border-red-100">{iss}</span>
                                ))}
                              </div>
                            </td>
                            <td className="px-6 py-4 rounded-r-2xl border-r border-y border-slate-100 text-right">
                               <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                                  Corrigir
                               </div>
                            </td>
                          </tr>
                        );
                     })}
                   </tbody>
                 </table>
               </div>
            </div>
          </div>
        )}
      </main>

      {selectedItemId && (
        <ItemPanel 
          item={workItems.find(i => i.id === selectedItemId)!} 
          onClose={() => setSelectedItemId(null)} 
        />
      )}
    </div>
  );
};

export default DashboardView;
