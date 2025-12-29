
import React, { useState, useRef } from 'react';
import { AgileProvider, useAgile } from './store';
import Layout from './components/Layout';
import BacklogView from './components/Backlog/BacklogView';
import SprintView from './components/Sprints/SprintView';
import DashboardView from './components/Dashboard/DashboardView';
import GanttView from './components/Gantt/GanttView';
import { ViewType } from './types';
import { Settings as SettingsIcon, Camera, X, Shield } from 'lucide-react';

const SettingsView: React.FC = () => {
  const { users, addUser, removeUser } = useAgile();
  const [newName, setNewName] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      await addUser(newName, avatarFile || undefined);
      setNewName(''); setAvatarFile(null); setAvatarPreview(null);
      setIsSaving(false);
    }
  };

  return (
    <div className="p-10 max-w-4xl mx-auto space-y-10">
      <header className="flex items-center gap-4">
        <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-xl"><SettingsIcon size={32} /></div>
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">Configurações</h2>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Gestão do Time</p>
        </div>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section className="bg-white rounded-3xl border-2 border-slate-100 shadow-xl overflow-hidden p-8">
          <form onSubmit={handleAdd} className="space-y-4 mb-8">
            <div className="flex items-center gap-4">
              <div onClick={() => fileInputRef.current?.click()} className="w-16 h-16 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer overflow-hidden group">
                {avatarPreview ? <img src={avatarPreview} className="w-full h-full object-cover" /> : <Camera size={24} className="text-slate-400 group-hover:scale-110 transition-transform" />}
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
              <div className="flex-1 space-y-2">
                <input type="text" placeholder="Nome do integrante..." className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-2 text-sm font-bold outline-none focus:border-blue-500" value={newName} onChange={(e) => setNewName(e.target.value)} />
                <button disabled={isSaving} type="submit" className="w-full py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md hover:bg-blue-700 active:scale-95 transition-all">
                  {isSaving ? 'Salvando...' : 'Cadastrar Membro'}
                </button>
              </div>
            </div>
          </form>
          <div className="space-y-2">
            {users.map(u => (
              <div key={u.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                <div className="flex items-center gap-3">
                  {u.avatar_url ? (
                    <img src={u.avatar_url} className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-black text-blue-700">{u.name[0]}</div>
                  )}
                  <span className="text-sm font-black text-slate-700">{u.name}</span>
                </div>
                <button onClick={() => removeUser(u.id)} className="text-slate-300 hover:text-red-500 transition-colors p-2"><X size={16} /></button>
              </div>
            ))}
          </div>
        </section>
        <section className="bg-slate-900 rounded-[40px] p-10 text-white flex flex-col justify-center items-center text-center space-y-4 shadow-2xl">
           <Shield size={48} className="text-emerald-500" />
           <h3 className="text-xl font-black uppercase tracking-tighter">Sincronização Ativa</h3>
           <p className="text-xs text-slate-400 font-bold uppercase leading-relaxed">Dados salvos em tempo real na Supabase.</p>
        </section>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>('Sprints');

  const renderContent = () => {
    switch (activeView) {
      case 'Backlog': return <BacklogView />;
      case 'Sprints': return <SprintView />;
      case 'Dashboard': return <DashboardView />;
      case 'Gantt': return <GanttView />;
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
  const { configured, users, loading } = useAgile();
  
  const isEmpty = users.length === 0 && !loading;
  if ((!configured || isEmpty) && activeView !== 'Settings') {
    return <div className="h-screen w-full flex items-center justify-center bg-slate-50 font-black uppercase text-slate-400 tracking-widest">Inicie em Settings para configurar o time...</div>;
  }
  
  return <Layout activeView={activeView} onViewChange={onViewChange}>{renderContent()}</Layout>;
}

export default App;
