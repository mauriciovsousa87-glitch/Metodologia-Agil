
import React, { useState, useRef } from 'react';
import { AgileProvider, useAgile } from './store';
import Layout from './components/Layout';
import BacklogView from './components/Backlog/BacklogView';
import SprintView from './components/Sprints/SprintView';
import DashboardView from './components/Dashboard/DashboardView';
import GanttView from './components/Gantt/GanttView';
import { ViewType } from './types';
import { Database, Terminal, Copy, Check, RefreshCw, Loader2, Shield, UserPlus, Camera, X, Settings as SettingsIcon } from 'lucide-react';

const SetupOverlay: React.FC = () => {
  const [showSQL, setShowSQL] = useState(false);
  const [copied, setCopied] = useState(false);
  const { seedData, loading } = useAgile();

  const sqlCode = `-- 1. LIMPEZA TOTAL
DROP TABLE IF EXISTS public.work_items;
DROP TABLE IF EXISTS public.sprints;
DROP TABLE IF EXISTS public.profiles;

-- 2. CRIAR TABELAS
CREATE TABLE public.profiles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  avatar_url text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.sprints (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  start_date date,
  end_date date,
  objective text,
  status text CHECK (status IN ('Planejada', 'Ativa', 'Encerrada')),
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.work_items (
  id text PRIMARY KEY,
  type text NOT NULL,
  title text NOT NULL,
  description text,
  priority text,
  effort integer DEFAULT 0,
  assignee_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text,
  column_name text,
  sprint_id uuid REFERENCES public.sprints(id) ON DELETE SET NULL,
  workstream_id text,
  parent_id text,
  blocked boolean DEFAULT false,
  attachments jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- 3. PERMISSÕES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "p1" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "p1" ON public.sprints FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "p1" ON public.work_items FOR ALL USING (true) WITH CHECK (true);`;

  const copySQL = () => {
    navigator.clipboard.writeText(sqlCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900 z-[9999] flex items-center justify-center p-4 overflow-y-auto">
      <div className="max-w-xl w-full bg-white rounded-[40px] shadow-2xl overflow-hidden border-8 border-slate-800 animate-in zoom-in-95 duration-500 my-8">
        <div className="p-10 text-center space-y-6">
          <div className="w-20 h-20 bg-blue-100 rounded-3xl flex items-center justify-center mx-auto text-blue-600 shadow-inner border-2 border-blue-50">
            <Database size={40} strokeWidth={2.5} />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Quase lá!</h2>
            <p className="text-slate-500 font-bold text-sm uppercase tracking-widest leading-relaxed">
              O banco de dados está vazio ou as tabelas não foram criadas corretamente.
            </p>
          </div>
          
          <div className="bg-slate-50 p-6 rounded-3xl border-2 border-slate-100 text-left space-y-4">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Instruções:</p>
             <p className="text-xs font-bold text-slate-700">1. Vá no SQL Editor do Supabase.</p>
             <p className="text-xs font-bold text-slate-700">2. Copie o script abaixo (que limpa erros anteriores).</p>
             <p className="text-xs font-bold text-slate-700">3. Clique em RUN e depois em "Recarregar" aqui.</p>
          </div>

          <div className="flex flex-col gap-3">
            <button onClick={() => setShowSQL(!showSQL)} className="w-full inline-flex items-center justify-center gap-2 bg-slate-800 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-700 transition-all">
              <Terminal size={18} /> {showSQL ? 'OCULTAR SQL' : 'COPIAR SCRIPT SQL DEFINITIVO'}
            </button>
            
            {showSQL && (
              <div className="relative animate-in slide-in-from-top-4 duration-300">
                <pre className="bg-slate-900 text-slate-300 p-4 rounded-2xl text-[10px] text-left overflow-x-auto max-h-48 font-mono custom-scrollbar">
                  {sqlCode}
                </pre>
                <button onClick={copySQL} className="absolute top-2 right-2 p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white">
                  {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                </button>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => window.location.reload()} className="flex-1 inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-blue-700 transition-all">
                <RefreshCw size={18} /> Recarregar App
              </button>
              <button onClick={seedData} disabled={loading} className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-emerald-700 transition-all">
                {loading ? <Loader2 className="animate-spin" size={18}/> : 'Gerar Dados Iniciais'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

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
              <div onClick={() => fileInputRef.current?.click()} className="w-16 h-16 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer overflow-hidden">
                {avatarPreview ? <img src={avatarPreview} className="w-full h-full object-cover" /> : <Camera size={24} className="text-slate-400" />}
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
              <div className="flex-1 space-y-2">
                <input type="text" placeholder="Nome..." className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-2 text-sm font-bold outline-none focus:border-blue-500" value={newName} onChange={(e) => setNewName(e.target.value)} />
                <button disabled={isSaving} type="submit" className="w-full py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">
                  {isSaving ? 'Salvando...' : 'Cadastrar'}
                </button>
              </div>
            </div>
          </form>
          <div className="space-y-2">
            {users.map(u => (
              <div key={u.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-black">{u.name[0]}</div>
                  <span className="text-sm font-black text-slate-700">{u.name}</span>
                </div>
                <button onClick={() => removeUser(u.id)} className="text-slate-300 hover:text-red-500"><X size={16} /></button>
              </div>
            ))}
          </div>
        </section>
        <section className="bg-slate-900 rounded-[40px] p-10 text-white flex flex-col justify-center items-center text-center space-y-4">
           <Shield size={48} className="text-blue-500" />
           <h3 className="text-xl font-black uppercase tracking-tighter">Nuvem Ativa</h3>
           <p className="text-xs text-slate-400 font-bold uppercase leading-relaxed">Sincronização em tempo real habilitada.</p>
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
  const { configured, workItems, users, loading } = useAgile();
  
  // Se o banco estiver vazio, força o setup para o usuário saber que precisa rodar o SQL ou seed
  const isEmpty = workItems.length === 0 && users.length === 0 && !loading;

  if ((!configured || isEmpty) && activeView !== 'Settings') {
    return <SetupOverlay />;
  }

  return (
    <Layout activeView={activeView} onViewChange={onViewChange}>
      {renderContent()}
    </Layout>
  );
}

export default App;
