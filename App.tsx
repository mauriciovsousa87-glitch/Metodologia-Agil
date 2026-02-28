
import React, { useState, useRef } from 'react';
import { AgileProvider, useAgile } from './store';
import Layout from './components/Layout';
import BacklogView from './components/Backlog/BacklogView';
import SprintView from './components/Sprints/SprintView';
import DashboardView from './components/Dashboard/DashboardView';
import GanttView from './components/Gantt/GanttView';
import FinanceView from './components/Finance/FinanceView';
import TimelineView from './components/Timeline/TimelineView';
import StrategyView from './components/Strategy/StrategyView';
import MeetingsView from './components/Meetings/MeetingsView';
import { ViewType, User } from './types';
import { Settings as SettingsIcon, Camera, X, Shield, Target, UserPlus, Save } from 'lucide-react';

const SettingsView: React.FC = () => {
  const { users, addUser, removeUser, updateUser } = useAgile();
  const [newName, setNewName] = useState('');
  const [newPosition, setNewPosition] = useState('');
  const [newReportsTo, setNewReportsTo] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPosition, setEditPosition] = useState('');
  const [editReportsTo, setEditReportsTo] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (event) => setAvatarPreview(event.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      setIsSaving(true);
      await addUser(newName, newPosition || undefined, newReportsTo || undefined, avatarFile || undefined);
      setNewName(''); setNewPosition(''); setNewReportsTo(''); setAvatarFile(null); setAvatarPreview(null);
      setIsSaving(false);
    }
  };

  const startEditing = (user: User) => {
    setEditingUserId(user.id);
    setEditName(user.name);
    setEditPosition(user.position || '');
    setEditReportsTo(user.reportsTo || '');
  };

  const handleUpdate = async () => {
    if (editingUserId) {
      setIsSaving(true);
      await updateUser(editingUserId, { 
        name: editName, 
        position: editPosition, 
        reportsTo: editReportsTo 
      });
      setEditingUserId(null);
      setIsSaving(false);
    }
  };

  return (
    <div className="p-10 max-w-5xl mx-auto space-y-10">
      <header className="flex items-center gap-4">
        <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-xl"><SettingsIcon size={32} /></div>
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">Configurações</h2>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Gestão do Time e Hierarquia</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-1 bg-white rounded-3xl border-2 border-slate-100 shadow-xl p-8 sticky top-10 h-fit">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
            <UserPlus size={18} className="text-blue-600" /> Novo Membro
          </h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="flex flex-col items-center gap-4 mb-4">
              <div onClick={() => fileInputRef.current?.click()} className="w-24 h-24 rounded-3xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center cursor-pointer overflow-hidden group">
                {avatarPreview ? <img src={avatarPreview} className="w-full h-full object-cover" /> : <Camera size={28} className="text-slate-300 group-hover:scale-110 transition-transform" />}
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
              <p className="text-[10px] font-black text-slate-400 uppercase">Avatar (opcional)</p>
            </div>

            <div className="space-y-3">
              <input type="text" placeholder="Nome completo" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:border-blue-500" value={newName} onChange={(e) => setNewName(e.target.value)} required />
              <input type="text" placeholder="Cargo (Ex: CEO, Gerente...)" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:border-blue-500" value={newPosition} onChange={(e) => setNewPosition(e.target.value)} />
              
              <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold outline-none cursor-pointer" value={newReportsTo} onChange={(e) => setNewReportsTo(e.target.value)}>
                <option value="">Reporta para: (Ninguém)</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>

              <button disabled={isSaving} type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg hover:bg-blue-700 active:scale-95 transition-all mt-4">
                {isSaving ? 'Cadastrando...' : 'Adicionar ao Time'}
              </button>
            </div>
          </form>
        </section>

        <section className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">Integrantes Ativos ({users.length})</h3>
          <div className="grid grid-cols-1 gap-3">
            {users.map(u => (
              <div key={u.id} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
                <div className="flex items-center gap-4 flex-1">
                  {u.avatar_url ? (
                    <img src={u.avatar_url} className="w-12 h-12 rounded-2xl object-cover shadow-sm" />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-lg font-black text-blue-700 shadow-inner">{u.name[0]}</div>
                  )}
                  
                  {editingUserId === u.id ? (
                    <div className="flex-1 grid grid-cols-1 gap-2">
                      <input type="text" className="bg-slate-50 border border-blue-200 rounded-lg px-3 py-1 text-xs font-bold" value={editName} onChange={(e) => setEditName(e.target.value)} />
                      <input type="text" className="bg-slate-50 border border-blue-200 rounded-lg px-3 py-1 text-xs font-bold" value={editPosition} onChange={(e) => setEditPosition(e.target.value)} placeholder="Cargo" />
                      <select className="bg-slate-50 border border-blue-200 rounded-lg px-3 py-1 text-xs font-bold" value={editReportsTo} onChange={(e) => setEditReportsTo(e.target.value)}>
                        <option value="">Sem superior</option>
                        {users.filter(other => other.id !== u.id).map(other => <option key={other.id} value={other.id}>{other.name}</option>)}
                      </select>
                    </div>
                  ) : (
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{u.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{u.position || 'Sem cargo'}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 ml-4">
                  {editingUserId === u.id ? (
                    <button onClick={handleUpdate} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"><Save size={18} /></button>
                  ) : (
                    <button onClick={() => startEditing(u)} className="p-2 text-slate-400 hover:text-blue-600 rounded-lg transition-colors"><SettingsIcon size={18} /></button>
                  )}
                  <button onClick={() => removeUser(u.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors rounded-lg"><X size={18} /></button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

// Triggering new build to fix Vercel sync issue - commit d551b9c was skipped by Vercel
const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>('Sprints');

  const renderContent = () => {
    switch (activeView) {
      case 'Backlog': return <BacklogView />;
      case 'Sprints': return <SprintView />;
      case 'Dashboard': return <DashboardView />;
      case 'Gantt': return <GanttView />;
      case 'Strategy': return <StrategyView />;
      case 'Finance': return <FinanceView />;
      case 'Timeline': return <TimelineView />;
      case 'Meetings': return <MeetingsView />;
      case 'Settings': return <SettingsView />;
      default: return <SprintView />;
    }
  };

  return (
    <AgileProvider>
      <AppWrapper renderContent={renderContent} activeView={activeView} onViewChange={setActiveView} />
    </AgileProvider>
  );
};

const AppWrapper: React.FC<{ renderContent: () => React.ReactNode, activeView: ViewType, onViewChange: (v: ViewType) => void }> = ({ renderContent, activeView, onViewChange }) => {
  const { configured, users, loading, error } = useAgile();
  
  if (loading) {
    return <div className="h-screen w-full flex items-center justify-center bg-slate-50 font-black uppercase text-slate-400 tracking-widest animate-pulse">Carregando dados...</div>;
  }

  if (error) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-red-50 p-10 text-center">
        <div className="bg-white p-8 rounded-[2rem] shadow-2xl border-2 border-red-100 max-w-md">
          <h2 className="text-2xl font-black text-red-600 uppercase tracking-tighter mb-4">Erro de Conexão</h2>
          <p className="text-sm font-bold text-slate-600 mb-6">{error}</p>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verifique suas chaves do Supabase nas configurações do ambiente.</p>
        </div>
      </div>
    );
  }
  
  const isEmpty = users.length === 0;
  if ((!configured || isEmpty) && activeView !== 'Settings') {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 p-10 text-center">
        <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 max-w-lg">
          <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center text-blue-600 mb-8 mx-auto">
            <UserPlus size={40} />
          </div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-4 leading-none">Time não configurado</h2>
          <p className="text-slate-500 font-medium mb-8">Parece que não há integrantes cadastrados ou a conexão com o banco de dados retornou vazia.</p>
          <button 
            onClick={() => onViewChange('Settings')}
            className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg hover:bg-blue-700 transition-all active:scale-95"
          >
            Ir para Configurações
          </button>
        </div>
      </div>
    );
  }
  
  return <Layout activeView={activeView} onViewChange={onViewChange}>{renderContent()}</Layout>;
}

export default App;
