
import React, { useState, useRef } from 'react';
import { AgileProvider, useAgile } from './store';
import Layout from './components/Layout';
import BacklogView from './components/Backlog/BacklogView';
import SprintView from './components/Sprints/SprintView';
import DashboardView from './components/Dashboard/DashboardView';
import GanttView from './components/Gantt/GanttView';
import { ViewType } from './types';
// Fixed missing Info import
import { Database, Terminal, Copy, Check, RefreshCw, Loader2, Shield, Settings as SettingsIcon, Camera, X, AlertTriangle, Info } from 'lucide-react';

const SetupOverlay: React.FC = () => {
  const [showSQL, setShowSQL] = useState(false);
  const [copied, setCopied] = useState(false);
  const { seedData, loading } = useAgile();

  const sqlCode = `-- CONFIGURAÇÃO DE ACESSO AO STORAGE (ARQUIVOS)

-- 1. CRIAR BALDES
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('attachments', 'attachments', true) ON CONFLICT (id) DO NOTHING;

-- 2. LIBERAR POLÍTICAS (SEM ALTER TABLE PARA EVITAR ERRO 42501)
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Acesso Publico Inserir" ON storage.objects;
    DROP POLICY IF EXISTS "Acesso Publico Selecionar" ON storage.objects;
    DROP POLICY IF EXISTS "Acesso Publico Deletar" ON storage.objects;
    DROP POLICY IF EXISTS "Acesso Publico Atualizar" ON storage.objects;

    CREATE POLICY "Acesso Publico Inserir" ON storage.objects FOR INSERT WITH CHECK (true);
    CREATE POLICY "Acesso Publico Selecionar" ON storage.objects FOR SELECT USING (true);
    CREATE POLICY "Acesso Publico Deletar" ON storage.objects FOR DELETE USING (true);
    CREATE POLICY "Acesso Publico Atualizar" ON storage.objects FOR UPDATE USING (true) WITH CHECK (true);
END $$;`;

  const copySQL = () => {
    navigator.clipboard.writeText(sqlCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900 z-[9999] flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-white rounded-[40px] shadow-2xl overflow-hidden border-8 border-slate-800 p-10 text-center space-y-6">
          <Database size={48} className="mx-auto text-blue-600" />
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Liberar Arquivos</h2>
          <p className="text-slate-500 font-bold text-sm uppercase">Copie o script abaixo para permitir upload de PDF e Imagens.</p>
          
          <div className="bg-blue-50 border-2 border-blue-100 rounded-2xl p-4 flex gap-3 text-left">
             <Info size={20} className="text-blue-500 shrink-0" />
             <p className="text-[11px] text-blue-800 font-bold uppercase leading-tight">
               Este script foi simplificado para evitar erros de "Owner" no Supabase. Execute-o no SQL Editor e recarregue a página.
             </p>
          </div>

          <div className="flex flex-col gap-3">
            <button onClick={() => setShowSQL(!showSQL)} className="w-full py-4 bg-slate-800 text-white rounded-2xl font-black text-xs uppercase hover:bg-slate-700 transition-all">
              {showSQL ? 'OCULTAR SQL' : 'VER SCRIPT DE REPARO'}
            </button>
            {showSQL && (
              <div className="relative">
                <pre className="bg-slate-900 text-slate-300 p-4 rounded-2xl text-[10px] text-left overflow-x-auto max-h-48 font-mono">
                  {sqlCode}
                </pre>
                <button onClick={copySQL} className="absolute top-2 right-2 p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all">
                  {copied ? <Check size={16}/> : <Copy size={16}/>}
                </button>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => window.location.reload()} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-blue-700 transition-all">Recarregar App</button>
              <button onClick={seedData} disabled={loading} className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-emerald-700 disabled:opacity-50 transition-all">
                {loading ? 'Criando...' : 'Ativar Admin'}
              </button>
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
            {users.length === 0 && <p className="text-center text-xs font-bold text-slate-400 py-4 uppercase tracking-widest">Nenhum membro cadastrado.</p>}
          </div>
        </section>
        <section className="bg-slate-900 rounded-[40px] p-10 text-white flex flex-col justify-center items-center text-center space-y-4 shadow-2xl">
           <Shield size={48} className="text-emerald-500" />
           <h3 className="text-xl font-black uppercase tracking-tighter">Sistema Protegido</h3>
           <p className="text-xs text-slate-400 font-bold uppercase leading-relaxed">As atualizações do banco de dados agora preservam seus dataos históricos. Você pode atualizar o código sem medo de perder seu backlog.</p>
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
  if ((!configured || isEmpty) && activeView !== 'Settings') return <SetupOverlay />;
  return <Layout activeView={activeView} onViewChange={onViewChange}>{renderContent()}</Layout>;
}

export default App;
