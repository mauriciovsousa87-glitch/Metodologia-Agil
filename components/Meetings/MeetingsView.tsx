
import React, { useState, useMemo, useEffect } from 'react';
import { 
  FileText, Plus, Clock, MapPin, Users, Target, CheckSquare, 
  Brain, Download, Trash2, ChevronDown, 
  ChevronUp, AlertCircle, TrendingUp, Save, X, Loader2, Calendar, LayoutGrid, Info, MessageSquare, Database
} from 'lucide-react';
import { useAgile } from '../../store';
import { 
  Meeting, MeetingParticipant, MeetingAgendaItem, 
  MeetingDecision, Action5W2H 
} from '../../types';
import { GoogleGenAI } from "@google/genai";

// Componente de Textarea Otimizado para evitar lag de rede
const SafeTextarea: React.FC<{
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}> = ({ value, onChange, placeholder, className }) => {
  const [localValue, setLocalValue] = useState(value);

  // Sincroniza o valor local se o valor externo mudar (ex: carregamento inicial)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <textarea
      className={className}
      placeholder={placeholder}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={() => {
        if (localValue !== value) {
          onChange(localValue);
        }
      }}
    />
  );
};

// Componente de Input Otimizado
const SafeInput: React.FC<{
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  type?: string;
}> = ({ value, onChange, placeholder, className, type = "text" }) => {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <input
      type={type}
      className={className}
      placeholder={placeholder}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={() => {
        if (localValue !== value) {
          onChange(localValue);
        }
      }}
    />
  );
};

const MeetingsView: React.FC = () => {
  const { meetings, users, addMeeting, updateMeeting, deleteMeeting, configured } = useAgile();
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  const selectedMeeting = useMemo(() => 
    meetings.find(m => String(m.id) === String(selectedMeetingId)), 
    [meetings, selectedMeetingId]
  );

  const handleNewMeeting = async () => {
    if (isCreating) return;
    setDbError(null);
    
    if (!configured) {
      alert("Configuração do Supabase não detectada.");
      return;
    }

    setIsCreating(true);
    try {
      const newMeeting: Partial<Meeting> = {
        title: "Reunião de Alinhamento " + new Date().toLocaleDateString('pt-BR'),
        date: new Date().toISOString().split('T')[0],
        startTime: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        endTime: "",
        type: "Weekly",
        location: "Sala de Reuniões",
        facilitatorId: users[0]?.id || "",
        secretaryId: users[0]?.id || "",
        participants: [],
        agenda: [],
        decisions: [],
        actions: [],
        createdAt: new Date().toISOString()
      };
      
      const createdId = await addMeeting(newMeeting);
      if (createdId) {
        setSelectedMeetingId(createdId);
      } else {
        setDbError("A tabela 'meetings' não foi encontrada no banco de dados.");
      }
    } catch (err: any) {
      console.error("Erro na criação:", err);
      setDbError("Erro de conexão: " + (err.message || "Tabela não encontrada"));
    } finally {
      setIsCreating(false);
    }
  };

  const generateAISummary = async (meeting: Meeting) => {
    if (!meeting) return;
    setIsGeneratingAI(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `
        Aja como um Agile Coach e gere um Resumo Executivo profissional para esta ata de reunião:
        Título: ${meeting.title}
        Pauta/Discussão: ${JSON.stringify(meeting.agenda.map(a => ({ tópico: a.topic, notas: a.discussion })))}
        Decisões: ${JSON.stringify(meeting.decisions.map(d => d.text))}
        Ações: ${JSON.stringify(meeting.actions.map(a => a.what))}
        
        Gere um texto estruturado, em português, formato corporativo, curto e direto.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });

      if (response.text) {
        await updateMeeting(meeting.id, { aiSummary: response.text });
      }
    } catch (error) {
      console.error("Erro IA:", error);
      alert("Falha ao conectar com a IA.");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  if (dbError) {
    return (
      <div className="h-full flex items-center justify-center p-8 bg-slate-50 animate-in fade-in duration-500">
        <div className="max-w-md w-full bg-white p-10 rounded-[3rem] shadow-2xl border-2 border-red-100 text-center space-y-6">
           <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500">
             <Database size={40} />
           </div>
           <div>
             <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Tabela não encontrada</h2>
             <p className="text-slate-500 text-sm mt-2 leading-relaxed">
               O sistema tentou acessar a tabela <strong>'meetings'</strong>, mas ela ainda não existe no seu Supabase.
             </p>
           </div>
           <div className="bg-slate-900 p-4 rounded-2xl text-left">
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Comando SQL Necessário:</p>
              <code className="text-[10px] text-slate-300 font-mono break-all block">
                CREATE TABLE meetings (id uuid PRIMARY KEY, title text, ...);
              </code>
           </div>
           <button 
             onClick={() => setDbError(null)}
             className="w-full py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
           >
             Tentar Novamente
           </button>
        </div>
      </div>
    );
  }

  if (selectedMeetingId) {
    if (!selectedMeeting) {
      return (
        <div className="h-full flex flex-col items-center justify-center bg-slate-50 gap-4">
           <Loader2 size={40} className="animate-spin text-blue-600" />
           <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Sincronizando documento...</p>
        </div>
      );
    }

    return (
      <MeetingDetail 
        meeting={selectedMeeting} 
        users={users}
        onBack={() => setSelectedMeetingId(null)}
        onUpdate={(updates) => updateMeeting(selectedMeeting.id, updates)}
        onGenerateAI={() => generateAISummary(selectedMeeting)}
        isGeneratingAI={isGeneratingAI}
        onDelete={() => {
          if (confirm("Deseja excluir permanentemente esta ata?")) {
            deleteMeeting(selectedMeeting.id);
            setSelectedMeetingId(null);
          }
        }}
      />
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none">Ata de Reunião</h1>
          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
            <Clock size={16} /> Governança e histórico de decisões industriais
          </p>
        </div>
        <button 
          onClick={handleNewMeeting}
          disabled={isCreating}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-5 rounded-[2rem] flex items-center justify-center gap-3 font-black text-sm shadow-2xl active:scale-95 transition-all uppercase tracking-widest disabled:opacity-50"
        >
          {isCreating ? <Loader2 className="animate-spin" size={24} /> : <Plus size={24} strokeWidth={3} />}
          Nova Ata de Reunião
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {meetings.length === 0 ? (
          <div className="col-span-full py-40 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
              <FileText size={48} />
            </div>
            <p className="text-2xl font-black text-slate-300 uppercase tracking-tighter">Nenhuma ata registrada ainda</p>
            <p className="text-slate-400 text-sm mt-2">Clique em "Nova Ata" para abrir o editor e iniciar o registro.</p>
          </div>
        ) : (
          meetings.map(meeting => {
            const meetingDate = new Date(meeting.date + 'T12:00:00');
            const day = meetingDate.getDate();
            const month = meetingDate.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase();
            const actionsDone = meeting.actions?.filter(a => a.completed).length || 0;
            const totalActions = meeting.actions?.length || 0;
            const prog = totalActions > 0 ? Math.round((actionsDone / totalActions) * 100) : 0;

            return (
              <div 
                key={meeting.id} 
                onClick={() => setSelectedMeetingId(meeting.id)}
                className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-2xl transition-all cursor-pointer group relative overflow-hidden flex flex-col h-full hover:-translate-y-1"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex flex-col items-center bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl group-hover:bg-blue-600 transition-colors">
                     <span className="text-2xl font-black leading-none">{day}</span>
                     <span className="text-[10px] font-black tracking-widest opacity-60">{month}</span>
                  </div>
                  <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                    meeting.type === 'Kaizen' ? 'bg-orange-100 text-orange-600' :
                    meeting.type === 'Estratégica' ? 'bg-purple-100 text-purple-600' :
                    'bg-blue-100 text-blue-600'
                  }`}>
                    {meeting.type}
                  </span>
                </div>

                <h3 className="text-xl font-black text-slate-800 uppercase leading-tight mb-4 group-hover:text-blue-600 transition-colors flex-1">{meeting.title}</h3>
                
                <div className="space-y-3 mb-8">
                   <div className="flex items-center gap-2 text-slate-400">
                      <MapPin size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-tight truncate">{meeting.location || 'Não informado'}</span>
                   </div>
                   <div className="flex items-center gap-2 text-slate-400">
                      <Users size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-tight">{meeting.participants?.length || 0} Participantes</span>
                   </div>
                </div>

                <div className="border-t pt-6 mt-auto">
                  <div className="flex justify-between items-center mb-2">
                     <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Execução das Ações</span>
                     <span className="text-[10px] font-black text-blue-600">{prog}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                     <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${prog}%` }} />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

interface MeetingDetailProps {
  meeting: Meeting;
  users: any[];
  onBack: () => void;
  onUpdate: (updates: Partial<Meeting>) => void;
  onDelete: () => void;
  onGenerateAI: () => void;
  isGeneratingAI: boolean;
}

const MeetingDetail: React.FC<MeetingDetailProps> = ({ 
  meeting, users, onBack, onUpdate, onDelete, onGenerateAI, isGeneratingAI 
}) => {
  const [activeSection, setActiveSection] = useState<string | null>("header");

  const addParticipant = () => {
    const newP: MeetingParticipant = { userId: users[0]?.id || "", role: "Integrante", present: true };
    onUpdate({ participants: [...(meeting.participants || []), newP] });
  };

  const addAgendaItem = () => {
    const newItem: MeetingAgendaItem = { 
      id: Math.random().toString(36).substr(2, 9), 
      topic: "Novo Tópico", 
      priority: "Média", 
      discussion: "" 
    };
    onUpdate({ agenda: [...(meeting.agenda || []), newItem] });
  };

  const addDecision = () => {
    const newD: MeetingDecision = { 
      id: Math.random().toString(36).substr(2, 9), 
      text: "Nova Decisão Tomada", 
      impact: "Médio", 
      status: "Planejado" 
    };
    onUpdate({ decisions: [...(meeting.decisions || []), newD] });
  };

  const addAction = () => {
    const newA: Action5W2H = {
      id: Math.random().toString(36).substr(2, 9),
      what: "Nova Ação Industrial",
      why: "Gatilho de necessidade",
      who: "",
      when: new Date().toISOString().split('T')[0],
      where: "Local da execução",
      how: "Método de execução",
      cost: 0,
      completed: false
    };
    onUpdate({ actions: [...(meeting.actions || []), newA] });
  };

  const actionStats = useMemo(() => {
    const stats: Record<string, { total: number; completed: number }> = {};
    (meeting.actions || []).forEach(action => {
      const who = action.who || "Sem Responsável";
      if (!stats[who]) stats[who] = { total: 0, completed: 0 };
      stats[who].total++;
      if (action.completed) stats[who].completed++;
    });
    return stats;
  }, [meeting.actions]);

  const progress = meeting.actions?.length > 0 
    ? Math.round((meeting.actions.filter(a => a.completed).length / meeting.actions.length) * 100)
    : 0;

  return (
    <div className="bg-slate-50 min-h-full pb-60 animate-in slide-in-from-bottom-6 duration-500">
      {/* HEADER DO EDITOR */}
      <div className="sticky top-0 bg-white border-b border-slate-200 px-8 py-6 z-[200] flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-6">
           <button onClick={onBack} className="p-3 hover:bg-slate-100 rounded-2xl text-slate-400 transition-all active:scale-90" title="Voltar"><X size={24} /></button>
           <div>
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-1">Registro de Ata</p>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">{meeting.title}</h2>
           </div>
        </div>
        <div className="flex items-center gap-4">
           <button onClick={onDelete} className="p-3 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all" title="Excluir"><Trash2 size={20} /></button>
           <button onClick={onBack} className="bg-slate-900 text-white px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all flex items-center gap-2">
             <Save size={16} /> Salvar e Sair
           </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6 lg:p-12 space-y-8">
        
        {/* DASH DE RESUMO IA */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col justify-center">
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Maturidade do Plano</span>
               <div className="flex items-end gap-3">
                  <span className="text-5xl font-black text-blue-600 tracking-tighter leading-none">{progress}%</span>
                  <span className="text-[10px] font-bold text-slate-300 mb-1 uppercase">Ações</span>
               </div>
               <div className="h-2 bg-slate-100 rounded-full overflow-hidden mt-6">
                  <div className="h-full bg-blue-600 transition-all duration-1000 shadow-[0_0_15px_rgba(37,99,235,0.4)]" style={{ width: `${progress}%` }} />
               </div>
            </div>
            
            <div className="md:col-span-2 bg-slate-900 rounded-[3rem] p-8 text-white relative overflow-hidden group">
               <Brain size={160} className="absolute -right-10 -top-10 opacity-10 group-hover:scale-110 transition-transform" />
               <div className="relative z-10 flex flex-col h-full justify-between">
                  <div className="flex justify-between items-start mb-6">
                     <div>
                        <h4 className="text-xl font-black uppercase tracking-tighter">Insights da IA</h4>
                        <p className="text-blue-300 text-[10px] font-black uppercase tracking-widest mt-1">Consolidação automática dos pontos chave</p>
                     </div>
                     <button 
                        disabled={isGeneratingAI}
                        onClick={onGenerateAI}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl shadow-2xl active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
                     >
                        {isGeneratingAI ? <Loader2 size={16} className="animate-spin" /> : <Brain size={18} />}
                        <span className="text-[9px] font-black uppercase tracking-widest">{isGeneratingAI ? 'Analisando...' : 'GERAR RESUMO'}</span>
                     </button>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 min-h-[100px]">
                     {meeting.aiSummary ? (
                       <div className="text-xs text-slate-300 leading-relaxed font-medium whitespace-pre-wrap">{meeting.aiSummary}</div>
                     ) : (
                       <p className="text-xs text-slate-500 italic text-center py-6">O resumo executivo será exibido aqui após o processamento da IA.</p>
                     )}
                  </div>
               </div>
            </div>
        </div>

        {/* SEÇÕES DO DOCUMENTO */}
        <Section title="1. Cabeçalho" icon={LayoutGrid} isOpen={activeSection === "header"} onToggle={() => setActiveSection(activeSection === "header" ? null : "header")}>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field label="Título da Reunião">
                 <SafeInput 
                   className="w-full bg-transparent font-black text-slate-800 text-xl outline-none border-b-2 border-transparent focus:border-blue-200 transition-all uppercase" 
                   value={meeting.title} 
                   onChange={val => onUpdate({ title: val })} 
                 />
              </Field>
              <Field label="Tipo / Categoria">
                 <select className="w-full bg-transparent font-bold text-slate-800 appearance-none uppercase tracking-widest text-[11px]" value={meeting.type} onChange={e => onUpdate({ type: e.target.value as any })}>
                    <option value="Daily">Daily Sync</option>
                    <option value="Weekly">Weekly Review</option>
                    <option value="Kaizen">Improvement / Kaizen</option>
                    <option value="Estratégica">Alinhamento Estratégico</option>
                    <option value="Outro">Outro</option>
                 </select>
              </Field>
              <div className="grid grid-cols-3 gap-4 col-span-1 md:col-span-2">
                 <Field label="Data"><input type="date" className="w-full bg-transparent font-bold text-slate-800" value={meeting.date} onChange={e => onUpdate({ date: e.target.value })} /></Field>
                 <Field label="Hora Início"><input type="time" className="w-full bg-transparent font-bold text-slate-800" value={meeting.startTime} onChange={e => onUpdate({ startTime: e.target.value })} /></Field>
                 <Field label="Hora Fim"><input type="time" className="w-full bg-transparent font-bold text-slate-800" value={meeting.endTime} onChange={e => onUpdate({ endTime: e.target.value })} /></Field>
              </div>
              <Field label="Local / Sala">
                <SafeInput 
                  className="w-full bg-transparent font-bold text-slate-800" 
                  value={meeting.location} 
                  onChange={val => onUpdate({ location: val })} 
                  placeholder="Ex: Sala de Comando / Teams" 
                />
              </Field>
              <Field label="Facilitador">
                 <select className="w-full bg-transparent font-bold text-slate-800" value={meeting.facilitatorId} onChange={e => onUpdate({ facilitatorId: e.target.value })}>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                 </select>
              </Field>
           </div>
        </Section>

        <Section title="2. Participantes" icon={Users} isOpen={activeSection === "participants"} onToggle={() => setActiveSection(activeSection === "participants" ? null : "participants")}>
           <div className="space-y-3">
              {(meeting.participants || []).map((p, i) => (
                <div key={i} className="flex items-center gap-4 p-4 bg-slate-50 rounded-[1.5rem] border border-slate-100 group transition-all hover:bg-white hover:shadow-md">
                   <select className="bg-transparent font-black text-[11px] uppercase flex-1 text-slate-700 outline-none" value={p.userId} onChange={e => {
                     const list = [...meeting.participants];
                     list[i].userId = e.target.value;
                     onUpdate({ participants: list });
                   }}>
                      {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                   </select>
                   <SafeInput 
                     className="bg-white px-3 py-1 rounded-lg text-[9px] font-black uppercase text-slate-400 w-32 border border-slate-200" 
                     placeholder="FUNÇÃO" 
                     value={p.role} 
                     onChange={val => {
                       const list = [...meeting.participants];
                       list[i].role = val;
                       onUpdate({ participants: list });
                     }} 
                   />
                   <button onClick={() => {
                     const list = [...meeting.participants];
                     list[i].present = !list[i].present;
                     onUpdate({ participants: list });
                   }} className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${p.present ? 'bg-emerald-100 text-emerald-600 border-emerald-200' : 'bg-slate-200 text-slate-400 border-slate-300'}`}>
                     {p.present ? "Presente" : "Ausente"}
                   </button>
                   <button onClick={() => {
                     onUpdate({ participants: meeting.participants.filter((_, idx) => idx !== i) });
                   }} className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><X size={18}/></button>
                </div>
              ))}
              <button onClick={addParticipant} className="w-full py-6 border-2 border-dashed border-slate-200 rounded-[1.5rem] text-[10px] font-black text-slate-400 hover:bg-white hover:border-blue-400 hover:text-blue-600 transition-all uppercase tracking-[0.3em] flex items-center justify-center gap-3">
                <Plus size={20} /> Adicionar Participante
              </button>
           </div>
        </Section>

        <Section title="3. Pauta e Discussões" icon={Target} isOpen={activeSection === "agenda"} onToggle={() => setActiveSection(activeSection === "agenda" ? null : "agenda")}>
            <div className="space-y-8">
               {(meeting.agenda || []).map((item, i) => (
                 <div key={item.id} className="p-8 bg-white rounded-[2.5rem] border border-slate-200 relative group shadow-sm hover:shadow-xl transition-all">
                    <button onClick={() => onUpdate({ agenda: meeting.agenda.filter(x => x.id !== item.id) })} className="absolute top-6 right-6 text-slate-300 hover:text-red-500 transition-all active:scale-90"><Trash2 size={20}/></button>
                    <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
                       <SafeInput 
                         className="text-xl font-black text-slate-800 uppercase flex-1 bg-transparent outline-none border-b border-transparent focus:border-blue-400 transition-all" 
                         value={item.topic} 
                         onChange={val => {
                           const list = [...meeting.agenda]; list[i].topic = val; onUpdate({ agenda: list });
                         }} 
                         placeholder="TÓPICO DA DISCUSSÃO" 
                       />
                       <select className={`text-[10px] font-black uppercase px-4 py-2 rounded-xl border-2 transition-all ${item.priority === 'Alta' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`} value={item.priority} onChange={e => {
                         const list = [...meeting.agenda]; list[i].priority = e.target.value as any; onUpdate({ agenda: list });
                       }}>
                          <option value="Alta">Prioridade Alta</option>
                          <option value="Média">Prioridade Média</option>
                          <option value="Baixa">Prioridade Baixa</option>
                       </select>
                    </div>
                    {/* CAMPO OTIMIZADO - DISCUSSÃO */}
                    <SafeTextarea 
                      className="w-full bg-slate-50 border border-slate-100 rounded-3xl p-6 text-sm font-medium text-slate-700 outline-none focus:bg-white focus:ring-2 ring-blue-50 min-h-[140px] transition-all" 
                      placeholder="Registro detalhado da discussão..." 
                      value={item.discussion} 
                      onChange={val => {
                        const list = [...meeting.agenda]; 
                        list[i].discussion = val; 
                        onUpdate({ agenda: list });
                      }} 
                    />
                 </div>
               ))}
               <button onClick={addAgendaItem} className="w-full py-8 border-2 border-dashed border-slate-200 rounded-[2.5rem] text-[10px] font-black text-slate-400 hover:bg-white hover:text-blue-600 hover:border-blue-400 transition-all uppercase tracking-[0.4em] flex items-center justify-center gap-3">
                 <Plus size={24} /> Novo Tópico na Pauta
               </button>
            </div>
        </Section>

        <Section title="4. Decisões" icon={CheckSquare} isOpen={activeSection === "decisions"} onToggle={() => setActiveSection(activeSection === "decisions" ? null : "decisions")}>
           <div className="space-y-4">
              {(meeting.decisions || []).map((d, i) => (
                <div key={d.id} className="flex flex-col md:flex-row md:items-center gap-4 p-6 bg-white rounded-3xl border border-slate-200 shadow-sm transition-all hover:shadow-lg group">
                   <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <CheckSquare size={20} />
                   </div>
                   <SafeInput 
                     className="flex-1 text-[13px] font-black text-slate-700 bg-transparent uppercase outline-none focus:text-blue-600" 
                     value={d.text} 
                     onChange={val => {
                       const list = [...meeting.decisions]; list[i].text = val; onUpdate({ decisions: list });
                     }} 
                     placeholder="QUAL FOI A DECISÃO TOMADA?" 
                   />
                   <button onClick={() => onUpdate({ decisions: meeting.decisions.filter(x => x.id !== d.id) })} className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><X size={20}/></button>
                </div>
              ))}
              <button onClick={addDecision} className="w-full py-6 border-2 border-dashed border-slate-200 rounded-[1.5rem] text-[10px] font-black text-slate-400 hover:bg-white hover:text-emerald-600 hover:border-emerald-400 transition-all uppercase tracking-[0.3em] flex items-center justify-center gap-3">
                 <Plus size={20} /> Registrar Decisão
              </button>
           </div>
        </Section>

        <Section title="5. Plano de Ação 5W2H" icon={AlertCircle} isOpen={activeSection === "actions"} onToggle={() => setActiveSection(activeSection === "actions" ? null : "actions")}>
           <div className="space-y-8">
              {(meeting.actions || []).map((a, i) => (
                <div key={a.id} className={`p-8 bg-white rounded-[2.5rem] border-2 transition-all shadow-sm ${a.completed ? 'border-emerald-200 bg-emerald-50/10' : 'border-slate-100 hover:shadow-2xl hover:border-blue-200'}`}>
                   <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-4">
                         <button onClick={() => {
                            const list = [...meeting.actions]; list[i].completed = !list[i].completed; onUpdate({ actions: list });
                         }} className={`w-12 h-12 rounded-[1rem] flex items-center justify-center transition-all shadow-lg ${a.completed ? 'bg-emerald-500 text-white scale-110' : 'bg-slate-100 text-slate-300 border border-slate-200 hover:scale-110'}`}>
                            <CheckSquare size={24} />
                         </button>
                         <SafeInput 
                           className="text-xl font-black text-slate-800 uppercase bg-transparent outline-none focus:text-blue-600" 
                           placeholder="AÇÃO A SER EXECUTADA" 
                           value={a.what} 
                           onChange={val => {
                             const list = [...meeting.actions]; list[i].what = val; onUpdate({ actions: list });
                           }} 
                         />
                      </div>
                      <button onClick={() => onUpdate({ actions: meeting.actions.filter(x => x.id !== a.id) })} className="p-2 text-slate-300 hover:text-red-500 transition-all active:scale-90"><Trash2 size={20}/></button>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">QUEM? (Responsável)</label>
                        <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-[11px] font-black uppercase text-slate-700 outline-none focus:border-blue-400 transition-all" value={a.who} onChange={e => {
                          const list = [...meeting.actions]; list[i].who = e.target.value; onUpdate({ actions: list });
                        }}>
                          <option value="">Selecione...</option>
                          {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">QUANDO? (Prazo)</label>
                        <input type="date" className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-[11px] font-black text-slate-700 outline-none focus:border-blue-400 transition-all" value={a.when} onChange={e => {
                           const list = [...meeting.actions]; list[i].when = e.target.value; onUpdate({ actions: list });
                        }} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">COMO? (Plano)</label>
                        <SafeInput 
                          className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-[11px] font-black uppercase text-slate-700 outline-none focus:border-blue-400 transition-all" 
                          value={a.how} 
                          onChange={val => {
                            const list = [...meeting.actions]; list[i].how = val; onUpdate({ actions: list });
                          }} 
                        />
                      </div>
                   </div>
                </div>
              ))}
              <button onClick={addAction} className="w-full py-10 border-2 border-dashed border-slate-200 rounded-[2.5rem] text-[11px] font-black text-slate-400 hover:bg-white hover:text-blue-600 hover:border-blue-400 transition-all uppercase tracking-[0.5em] flex items-center justify-center gap-4">
                 <Plus size={28} /> Gerar Ação 5W2H
              </button>
           </div>
        </Section>
      </div>
    </div>
  );
};

const Section: React.FC<{ title: string; icon: any; children: React.ReactNode; isOpen: boolean; onToggle: () => void }> = ({ 
  title, icon: Icon, children, isOpen, onToggle 
}) => (
  <div className={`bg-white rounded-[3rem] border shadow-sm transition-all overflow-hidden ${isOpen ? 'border-blue-100 ring-4 ring-blue-50/50' : 'border-slate-100'}`}>
    <button onClick={onToggle} className="w-full px-10 py-8 flex items-center justify-between hover:bg-slate-50 transition-colors">
       <div className="flex items-center gap-6">
          <div className={`p-4 rounded-2xl shadow-lg transition-all ${isOpen ? 'bg-blue-600 text-white scale-110' : 'bg-slate-900 text-white'}`}>
             <Icon size={24} />
          </div>
          <h3 className={`text-lg font-black uppercase tracking-tighter transition-all ${isOpen ? 'text-blue-600' : 'text-slate-800'}`}>{title}</h3>
       </div>
       {isOpen ? <ChevronUp size={24} className="text-blue-300" /> : <ChevronDown size={24} className="text-slate-300" />}
    </button>
    {isOpen && <div className="p-10 pt-4 animate-in fade-in duration-300">{children}</div>}
  </div>
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 shadow-inner group transition-all hover:bg-white hover:border-blue-100">
    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 block group-hover:text-blue-400 transition-all">{label}</label>
    {children}
  </div>
);

export default MeetingsView;
