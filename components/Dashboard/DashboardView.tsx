
import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { 
  TrendingUp, CheckCircle2, AlertTriangle, Users, 
  Target, Activity, Clock, Filter
} from 'lucide-react';
import { useAgile } from '../../store';
import { ItemStatus, ItemType } from '../../types';

const DashboardView: React.FC = () => {
  const { workItems, sprints, workstreams, users } = useAgile();

  // Metrics Logic
  const statusData = [
    { name: 'Novo', value: workItems.filter(i => i.status === ItemStatus.NEW).length, color: '#94a3b8' },
    { name: 'Ativo', value: workItems.filter(i => i.status === ItemStatus.ACTIVE).length, color: '#3b82f6' },
    { name: 'Resolvido', value: workItems.filter(i => i.status === ItemStatus.RESOLVED).length, color: '#f59e0b' },
    { name: 'Fechado', value: workItems.filter(i => i.status === ItemStatus.CLOSED).length, color: '#10b981' },
  ];

  const velocityData = sprints.map(s => {
    const items = workItems.filter(i => i.sprintId === s.id);
    return {
      name: s.name,
      planejado: items.reduce((acc, curr) => acc + curr.effort, 0),
      entregue: items.filter(i => i.status === ItemStatus.CLOSED).reduce((acc, curr) => acc + curr.effort, 0),
    };
  });

  const itemsByAssignee = users.map(u => ({
    name: u.name,
    total: workItems.filter(i => i.assigneeId === u.id).length,
    concluidos: workItems.filter(i => i.assigneeId === u.id && i.status === ItemStatus.CLOSED).length,
  }));

  const blockedItems = workItems.filter(i => i.blocked);

  return (
    <div className="p-8 space-y-8 bg-gray-50 min-h-full">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Painel de Indicadores</h1>
          <p className="text-gray-500 text-sm">Visão consolidada de performance e andamento</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-white border p-2 rounded-lg text-gray-600 hover:bg-gray-50 shadow-sm"><Filter size={20}/></button>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md hover:bg-blue-700 transition-all">Exportar PDF</button>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total de Itens', value: workItems.length, icon: Activity, color: 'blue' },
          { label: 'Sprints Ativas', value: sprints.filter(s => s.status === 'Ativa').length, icon: Target, color: 'green' },
          { label: 'Itens Bloqueados', value: blockedItems.length, icon: AlertTriangle, color: 'red' },
          { label: 'Taxa de Entrega', value: `${Math.round((workItems.filter(i => i.status === ItemStatus.CLOSED).length / workItems.length) * 100)}%`, icon: CheckCircle2, color: 'purple' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group hover:shadow-md transition-all">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <h3 className="text-2xl font-extrabold text-gray-800">{stat.value}</h3>
            </div>
            <div className={`p-3 rounded-xl bg-${stat.color}-50 text-${stat.color}-600 group-hover:scale-110 transition-transform`}>
              <stat.icon size={24} />
            </div>
          </div>
        ))}
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-8 flex items-center gap-2">
            <TrendingUp size={20} className="text-blue-500" /> Velocity (Entrega por Sprint)
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={velocityData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={12} axisLine={false} tickLine={false} />
                <YAxis fontSize={12} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Legend verticalAlign="top" height={36}/>
                <Bar dataKey="planejado" fill="#e2e8f0" radius={[4, 4, 0, 0]} name="Planejado (pts)" />
                <Bar dataKey="entregue" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Entregue (pts)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-8 flex items-center gap-2">
             <Activity size={20} className="text-blue-500" /> Distribuição de Status
          </h3>
          <div className="h-[300px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend layout="vertical" align="right" verticalAlign="middle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-6">Carga por Responsável</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={itemsByAssignee}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" fontSize={12} axisLine={false} />
                <YAxis dataKey="name" type="category" fontSize={12} axisLine={false} width={100} />
                <Tooltip />
                <Bar dataKey="total" fill="#93c5fd" radius={[0, 4, 4, 0]} name="Total de Itens" />
                <Bar dataKey="concluidos" fill="#10b981" radius={[0, 4, 4, 0]} name="Concluídos" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-6">Top Blockers</h3>
          <div className="space-y-4">
            {blockedItems.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Nenhum item bloqueado no momento.</p>
            ) : (
              blockedItems.map(item => (
                <div key={item.id} className="p-4 bg-red-50 rounded-xl border border-red-100 group cursor-pointer hover:bg-red-100 transition-all">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-red-700 uppercase">BLOQUEADO - {item.id}</span>
                    <Clock size={12} className="text-red-400" />
                  </div>
                  <h4 className="text-sm font-bold text-gray-800 group-hover:text-red-700">{item.title}</h4>
                  <p className="text-xs text-red-600 mt-1">{item.blockReason || 'Motivo não especificado'}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
