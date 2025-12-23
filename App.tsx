
import React, { useState, useRef } from 'react';
import { AgileProvider, useAgile } from './store';
import Layout from './components/Layout';
import BacklogView from './components/Backlog/BacklogView';
import SprintView from './components/Sprints/SprintView';
import DashboardView from './components/Dashboard/DashboardView';
import GanttView from './components/Gantt/GanttView';
import { ViewType } from './types';
import { Users, UserPlus, X, Shield, Settings as SettingsIcon, Info, Camera, Image as ImageIcon, Loader2, Database, ExternalLink } from 'lucide-react';

const SetupOverlay: React.FC = () => (
  <div className="fixed inset-0 bg-slate-900 z-[9999] flex items-center justify-center p-6">
    <div className="max-w-xl w-full bg-white rounded-[40px] shadow-2xl overflow-hidden border-8 border-slate-800 animate-in zoom-in-95 duration-500">
      <div className="p-10 text-center space-y-6">
        <div className="w-24 h-24 bg-blue-100 rounded-3xl flex items-center justify-center mx-auto text-blue-600 shadow-inner border-2 border-blue-50">
          <Database size={48} strokeWidth={2.5} />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Conexão Necessária</h2>
          <p className="text-slate-500 font-bold text-sm uppercase tracking-widest leading-relaxed">O sistema precisa do Supabase para persistir seus dados e arquivos.</p>
        </div>
        
        <div className="bg-slate-50 p-6 rounded-3xl border-2 border-slate-100 text-left space-y-4">
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-black shrink-0">1</div>
            <p className="text-xs font-black text-slate-700 uppercase leading-relaxed">Crie um projeto em <a href="https://supabase.com" target="_blank" className="text-blue-600 underline">supabase.com</a></p>
          </div>
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-black shrink-0">2</div>
            <p className="text-xs font-black text-slate-700 uppercase leading-relaxed">Configure as variáveis no Vercel: <code className="bg-white px-1.5 py-0.5 rounded border">SUPABASE_URL</code> e <code className="bg-white px-1.5 py-0.5 rounded border">SUPABASE_ANON_KEY</code></p>
          </div>
        </div>

        <div className="pt-4">
          <a 
            href="https://supabase.com" 
            target="_blank"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-10 py-5 rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl hover:bg-blue-700 active:scale-95 transition-all"
          >
            Ir para o Supabase <ExternalLink size={18} />
          </a>
        </div>
      </div>
      <div className="bg-slate-900 p-4 text-center">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Agile Master Enterprise v2.5</p>
      </div>
    </div>
  </div>
);

const SettingsView: React.FC = () => {
  const { users, addUser, removeUser, loading } = useAgile();
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
      setNewName('');
      setAvatarFile(null);
      setAvatarPreview(null);
      setIsSaving(false);
    }
  };

  return (
    <div className="p-10 max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex items-center gap-4">
        <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-xl">
          <SettingsIcon size={32} />
        </div>
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">Configurações Gerais</h2>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Gestão de Membros e Persistência</p>
        </div>
      </header>

      {loading && (
        <div className="flex items-center gap-3 p-4 bg-blue-50 text-blue-600 rounded-2xl font-bold text-xs uppercase tracking-widest">
           <Loader2 className="animate-spin" size={16} /> Sincronizando dados...
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section className="bg-white rounded-3xl border-2 border-slate-100 shadow-xl overflow-hidden">
          <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Membros do Time</h3>
            <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-1 rounded-md">{users.length}</span>
          </div>
          
          <div className="p-8 space-y-6">
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="flex items-center gap-4">
                <div 
                  className="w-16 h-16 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:border-blue-400 relative overflow-hidden group shadow-inner"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {avatarPreview ? (
                    <img src={avatarPreview} className="w-full h-full object-cover" />
                  ) : (
                    <Camera size={24} className="text-slate-400" />
                  )}
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                <div className="flex-1 space-y-2">
                  <input 
                    type="text" 
                    placeholder="Nome do novo membro..."
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 focus:bg-white transition-all"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                  <button disabled={isSaving} type="submit" className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95">
                    {isSaving ? <Loader2 className="animate-spin" size={14}/> : <UserPlus size={16}/>} CADASTRAR MEMBRO
                  </button>
                </div>
              </div>
            </form>

            <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar pr-2">
              {users.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 bg-slate-50 border-2 border-transparent hover:border-blue-100 rounded-2xl group transition-all">
                  <div className="flex items-center gap-3">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm" alt={user.name} />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-black">
                        {user.name[0]}
                      </div>
                    )}
                    <span className="text-sm font-black text-slate-700">{user.name}</span>
                  </div>
                  <button onClick={() => removeUser(user.id)} className="p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-slate-900 rounded-[40px] p-10 text-white flex flex-col justify-center items-center text-center space-y-4 border-b-8 border-slate-800">
           <div className="p-4 bg-blue-600 rounded-3xl shadow-xl shadow-blue-500/20">
             <Shield size={40} className="text-white" />
           </div>
           <h3 className="text-xl font-black uppercase tracking-tighter">Nuvem Enterprise</h3>
           <p className="text-xs text-slate-400 font-bold uppercase leading-relaxed max-w-xs">
             Fotos, PDFs e Planos estão protegidos no Supabase Storage e Postgres. Sincronização automática para todo o time.
           </p>
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
      <AppContent renderContent={renderContent} activeView={activeView} onViewChange={setActiveView} />
    </AgileProvider>
  );
};

const AppContent: React.FC<{ renderContent: () => React.ReactNode, activeView: ViewType, onViewChange: (v: ViewType) => void }> = ({ renderContent, activeView, onViewChange }) => {
  const { configured } = useAgile();
  
  if (!configured && activeView !== 'Settings') {
    return <SetupOverlay />;
  }

  return (
    <Layout activeView={activeView} onViewChange={onViewChange}>
      {renderContent()}
    </Layout>
  );
}

export default App;
