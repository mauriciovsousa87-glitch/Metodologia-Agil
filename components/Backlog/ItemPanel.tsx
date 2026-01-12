
import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Trash2, ListTodo, Calendar, AlertCircle, AlertTriangle, 
  Upload, Download, Paperclip, ChevronRight, Lock, Unlock, AlignLeft, Loader2, ExternalLink, Tag, Target, Zap, DollarSign, ShoppingCart, FileText, CreditCard
} from 'lucide-react';
import { WorkItem, ItemPriority, ItemStatus, Attachment } from '../../types';
import { useAgile } from '../../store';

interface ItemPanelProps {
  item: WorkItem;
  onClose: () => void;
}

const ItemPanel: React.FC<ItemPanelProps> = ({ item, onClose }) => {
  const { updateWorkItem, deleteWorkItem, users, sprints, uploadAttachment } = useAgile();
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados Locais para digitação fluida
  const [localTitle, setLocalTitle] = useState(item.title);
  const [localKpi, setLocalKpi] = useState(item.kpi || '');
  const [localKpiImpact, setLocalKpiImpact] = useState(item.kpiImpact || '');
  const [localDescription, setLocalDescription] = useState(item.description || '');
  const [localStartDate, setLocalStartDate] = useState(item.startDate || '');
  const [localEndDate, setLocalEndDate] = useState(item.endDate || '');
  const [localSprintId, setLocalSprintId] = useState(item.sprintId || '');

  // NOVOS ESTADOS PARA GESTÃO DE CUSTO
  const [localCostItem, setLocalCostItem] = useState((item as any).costItem || '');
  const [localCostType, setLocalCostType] = useState((item as any).costType || 'OPEX');
  const [localRequestNum, setLocalRequestNum] = useState((item as any).requestNum || '');
  const [localOrderNum, setLocalOrderNum] = useState((item as any).orderNum || '');
  const [localBillingStatus, setLocalBillingStatus] = useState((item as any).billingStatus || 'Em aberto');
  const [localCostValue, setLocalCostValue] = useState((item as any).costValue || 0);

  useEffect(() => {
    setLocalTitle(item.title);
    setLocalKpi(item.kpi || '');
    setLocalKpiImpact(item.kpiImpact || '');
    setLocalDescription(item.description || '');
    setLocalStartDate(item.startDate || '');
    setLocalEndDate(item.endDate || '');
    setLocalSprintId(item.sprintId || '');
    
    // Reset de custos ao mudar item
    setLocalCostItem((item as any).costItem || '');
    setLocalCostType((item as any).costType || 'OPEX');
    setLocalRequestNum((item as any).requestNum || '');
    setLocalOrderNum((item as any).orderNum || '');
    setLocalBillingStatus((item as any).billingStatus || 'Em aberto');
    setLocalCostValue((item as any).costValue || 0);
  }, [item.id, item.sprintId]);

  // AUTO-SAVE COM LOGICA DE COMPARACAO RIGOROSA (Preservando funcionalidade anterior)
  useEffect(() => {
    const timer = setTimeout(() => {
      const updates: any = {};
      
      if (localTitle !== item.title) updates.title = localTitle;
      if (localKpi !== (item.kpi || '')) updates.kpi = localKpi;
      if (localKpiImpact !== (item.kpiImpact || '')) updates.kpiImpact = localKpiImpact;
      if (localDescription !== (item.description || '')) updates.description = localDescription;
      if (localStartDate !== (item.startDate || '')) updates.startDate = localStartDate || null;
      if (localEndDate !== (item.endDate || '')) updates.endDate = localEndDate || null;
      
      if (localSprintId !== (item.sprintId || '')) {
        updates.sprintId = localSprintId ? String(localSprintId) : null;
      }

      // Sincronização de campos de custo
      if (localCostItem !== ((item as any).costItem || '')) updates.costItem = localCostItem;
      if (localCostType !== ((item as any).costType || 'OPEX')) updates.costType = localCostType;
      if (localRequestNum !== ((item as any).requestNum || '')) updates.requestNum = localRequestNum;
      if (localOrderNum !== ((item as any).orderNum || '')) updates.orderNum = localOrderNum;
      if (localBillingStatus !== ((item as any).billingStatus || 'Em aberto')) updates.billingStatus = localBillingStatus;
      if (Number(localCostValue) !== Number((item as any).costValue || 0)) updates.costValue = Number(localCostValue);

      if (Object.keys(updates).length > 0) {
        updateWorkItem(item.id, updates);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [
    localTitle, localKpi, localKpiImpact, localDescription, localStartDate, localEndDate, localSprintId,
    localCostItem, localCostType, localRequestNum, localOrderNum, localBillingStatus, localCostValue
  ]);

  const handleUpdate = (updates: Partial<WorkItem>) => {
    updateWorkItem(item.id, updates);
  };

  const handleClose = () => {
    onClose();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setIsUploading(true);
      try {
        for (let i = 0; i < files.length; i++) {
          await uploadAttachment(item.id, files[i]);
        }
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const files = e.clipboardData.files;
    if (files && files.length > 0) {
      e.preventDefault();
      setIsUploading(true);
      try {
        await uploadAttachment(item.id, files[0]);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const removeAttachment = (e: React.MouseEvent, attId: string) => {
    e.stopPropagation();
    const filtered = (item.attachments || []).filter(a => a.id !== attId);
    handleUpdate({ attachments: filtered } as any);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isConfirmingDelete) {
      await deleteWorkItem(item.id);
      onClose();
    } else {
      setIsConfirmingDelete(true);
      setTimeout(() => setIsConfirmingDelete(false), 4000);
    }
  };

  return (
    <>
      <div className="fixed inset-y-0 right-0 w-[580px] bg-white shadow-2xl z-[500] border-l border-gray-200 flex flex-col transform transition-transform animate-in slide-in-from-right duration-300">
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100 bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs font-black text-slate-400 font-mono tracking-tighter">{item.id}</span>
            <div className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-white border-2 border-slate-200 text-slate-600">
              {item.type}
            </div>
          </div>
          <button onClick={handleClose} className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-10">
          {/* Sessão de Título */}
          <section>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Título do Trabalho</label>
            <textarea 
              rows={2}
              className="w-full text-2xl font-black text-slate-900 bg-transparent hover:bg-slate-50 focus:bg-white p-2 rounded-xl transition-all outline-none resize-none border-2 border-transparent focus:border-blue-100"
              value={localTitle}
              onChange={(e) => setLocalTitle(e.target.value)}
            />
          </section>

          {/* Grid de Informações Principais */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 p-6 bg-slate-50 rounded-3xl border border-slate-100">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</label>
              <select className="w-full text-sm font-bold border-2 border-slate-200 rounded-xl p-2.5 bg-white shadow-sm" value={item.status} onChange={(e) => handleUpdate({ status: e.target.value as any })}>
                {Object.values(ItemStatus).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prioridade</label>
              <select className="w-full text-sm font-bold border-2 border-slate-200 rounded-xl p-2.5 bg-white shadow-sm" value={item.priority} onChange={(e) => handleUpdate({ priority: e.target.value as any })}>
                {Object.values(ItemPriority).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsável</label>
              <select className="w-full text-sm font-bold border-2 border-slate-200 rounded-xl p-2.5 bg-white shadow-sm" value={item.assigneeId || ''} onChange={(e) => handleUpdate({ assigneeId: e.target.value })}>
                <option value="">Não atribuído</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sprint Alvo</label>
              <select 
                className="w-full text-sm font-bold border-2 border-slate-200 rounded-xl p-2.5 bg-white shadow-sm ring-2 ring-blue-500/20" 
                value={localSprintId} 
                onChange={(e) => setLocalSprintId(e.target.value)}
              >
                <option value="">Nenhuma Sprint</option>
                {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <Calendar size={12} className="text-blue-500" /> Data Início
              </label>
              <input 
                type="date" 
                className="w-full text-sm font-bold border-2 border-slate-200 rounded-xl p-2.5 bg-white shadow-sm outline-none focus:border-blue-400" 
                value={localStartDate} 
                onChange={(e) => setLocalStartDate(e.target.value)} 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <Calendar size={12} className="text-red-500" /> Data Fim
              </label>
              <input 
                type="date" 
                className="w-full text-sm font-bold border-2 border-slate-200 rounded-xl p-2.5 bg-white shadow-sm outline-none focus:border-blue-400" 
                value={localEndDate} 
                onChange={(e) => setLocalEndDate(e.target.value)} 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Indicador (KPI)</label>
              <input 
                type="text" 
                className="w-full text-sm font-bold border-2 border-slate-200 rounded-xl p-2.5 bg-white shadow-sm" 
                value={localKpi} 
                onChange={(e) => setLocalKpi(e.target.value)} 
                placeholder="Ex: % Eficiência" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Esforço (Pts)</label>
              <input type="number" className="w-full text-sm font-bold border-2 border-slate-200 rounded-xl p-2.5 bg-white shadow-sm" value={item.effort} onChange={(e) => handleUpdate({ effort: Number(e.target.value) })} />
            </div>

            <div className="col-span-2 space-y-1.5 mt-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <Zap size={12} className="text-orange-500" /> Impacto no KPI
              </label>
              <input 
                type="text" 
                className="w-full text-sm font-bold border-2 border-slate-200 rounded-xl p-3 bg-white shadow-sm" 
                value={localKpiImpact} 
                onChange={(e) => setLocalKpiImpact(e.target.value)} 
                placeholder="Descreva o impacto mensurável..." 
              />
            </div>
          </div>

          {/* GESTÃO DE CUSTO - NOVO MÓDULO SOLICITADO */}
          <section className="space-y-4">
            <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <DollarSign size={16} className="text-emerald-500" /> Gestão de Custos e Aquisições
            </h3>
            
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 p-6 bg-emerald-50/50 rounded-3xl border border-emerald-100">
              <div className="col-span-2 space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <ShoppingCart size={12} /> Item para Compra / Serviço
                </label>
                <input 
                  type="text" 
                  className="w-full text-sm font-bold border-2 border-slate-200 rounded-xl p-2.5 bg-white shadow-sm focus:border-emerald-400 outline-none" 
                  value={localCostItem} 
                  onChange={(e) => setLocalCostItem(e.target.value)} 
                  placeholder="Ex: Licença de software, Hardware, Consultoria..." 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo de Aplicação</label>
                <select 
                  className="w-full text-sm font-bold border-2 border-slate-200 rounded-xl p-2.5 bg-white shadow-sm outline-none focus:border-emerald-400" 
                  value={localCostType} 
                  onChange={(e) => setLocalCostType(e.target.value)}
                >
                  <option value="OPEX">OPEX (Despesa Operacional)</option>
                  <option value="CAPEX">CAPEX (Investimento)</option>
                  <option value="SEVIM">SEVIM</option>
                  <option value="OUTROS">Outros</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor Estimado (R$)</label>
                <input 
                  type="number" 
                  className="w-full text-sm font-bold border-2 border-slate-200 rounded-xl p-2.5 bg-white shadow-sm outline-none focus:border-emerald-400" 
                  value={localCostValue} 
                  onChange={(e) => setLocalCostValue(e.target.value)} 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <FileText size={12} /> Nº Requisição (RC)
                </label>
                <input 
                  type="text" 
                  className="w-full text-sm font-bold border-2 border-slate-200 rounded-xl p-2.5 bg-white shadow-sm outline-none focus:border-emerald-400" 
                  value={localRequestNum} 
                  onChange={(e) => setLocalRequestNum(e.target.value)} 
                  placeholder="Ex: RC-2025-001"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <CreditCard size={12} /> Nº Pedido (PO)
                </label>
                <input 
                  type="text" 
                  className="w-full text-sm font-bold border-2 border-slate-200 rounded-xl p-2.5 bg-white shadow-sm outline-none focus:border-emerald-400" 
                  value={localOrderNum} 
                  onChange={(e) => setLocalOrderNum(e.target.value)} 
                  placeholder="Ex: PO-12345"
                />
              </div>

              <div className="col-span-2 space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status do Pedido / Faturamento</label>
                <select 
                  className="w-full text-sm font-bold border-2 border-slate-200 rounded-xl p-2.5 bg-white shadow-sm outline-none focus:border-emerald-400" 
                  value={localBillingStatus} 
                  onChange={(e) => setLocalBillingStatus(e.target.value)}
                >
                  <option value="Em aberto">Em aberto</option>
                  <option value="Aguardando Aprovação">Aguardando Aprovação</option>
                  <option value="Pedido Emitido">Pedido Emitido</option>
                  <option value="Faturado">Faturado / Concluído</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
              </div>
            </div>
          </section>

          {/* Detalhamento */}
          <section>
            <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
              <AlignLeft size={16} className="text-slate-400" /> Detalhamento
            </h3>
            <textarea 
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-6 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:bg-white min-h-[180px] transition-all"
              placeholder="Descreva as especificações..."
              value={localDescription}
              onPaste={handlePaste}
              onChange={(e) => setLocalDescription(e.target.value)}
            />
          </section>

          {/* Anexos */}
          <section className="space-y-4">
             <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <Paperclip size={16} className="text-orange-500" /> Anexos e Evidências
                </h3>
                <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black border border-slate-200">
                  {isUploading ? <Loader2 size={14} className="animate-spin" /> : <><Upload size={14} /> SUBIR</>}
                </button>
                <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileSelect} />
             </div>
             <div className="grid grid-cols-2 gap-4">
                {(item.attachments || []).map((att) => (
                  <div key={att.id} onClick={() => setPreviewAttachment(att)} className="group relative rounded-2xl border-2 border-slate-100 overflow-hidden bg-slate-50 cursor-zoom-in shadow-sm hover:shadow-md transition-all">
                    <div className="aspect-video w-full flex items-center justify-center">
                      {att.type.startsWith('image') ? <img src={att.url} className="w-full h-full object-cover" /> : <Paperclip size={32} className="text-slate-400" />}
                      <button onClick={(e) => removeAttachment(e, att.id)} className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
             </div>
          </section>
        </div>

        <div className="p-8 border-t bg-slate-50 flex gap-4 shrink-0">
          <button onClick={handleDelete} className={`flex-1 py-4 rounded-2xl text-xs font-black transition-all ${isConfirmingDelete ? 'bg-red-600 text-white animate-pulse' : 'bg-white text-red-600 border-2 border-red-100 hover:bg-red-50'}`}>
            {isConfirmingDelete ? 'CONFIRMAR EXCLUSÃO' : 'EXCLUIR ITEM'}
          </button>
          <button onClick={handleClose} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black shadow-xl active:scale-95 transition-all">FECHAR PAINEL</button>
        </div>
      </div>

      {previewAttachment && (
        <div className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-md flex items-center justify-center p-10 animate-in fade-in" onClick={() => setPreviewAttachment(null)}>
          <img src={previewAttachment.url} className="max-w-full max-h-full object-contain shadow-2xl animate-in zoom-in-95" />
        </div>
      )}
    </>
  );
};

export default ItemPanel;
