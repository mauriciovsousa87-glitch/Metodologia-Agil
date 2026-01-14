
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

  const [localTitle, setLocalTitle] = useState(item.title);
  const [localKpi, setLocalKpi] = useState(item.kpi || '');
  const [localKpiImpact, setLocalKpiImpact] = useState(item.kpiImpact || '');
  const [localDescription, setLocalDescription] = useState(item.description || '');
  const [localStartDate, setLocalStartDate] = useState(item.startDate || '');
  const [localEndDate, setLocalEndDate] = useState(item.endDate || '');
  const [localSprintId, setLocalSprintId] = useState(item.sprintId || '');

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
    setLocalCostItem((item as any).costItem || '');
    setLocalCostType((item as any).costType || 'OPEX');
    setLocalRequestNum((item as any).requestNum || '');
    setLocalOrderNum((item as any).orderNum || '');
    setLocalBillingStatus((item as any).billingStatus || 'Em aberto');
    setLocalCostValue((item as any).costValue || 0);
  }, [item.id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const updates: any = {};
      if (localTitle !== item.title) updates.title = localTitle;
      if (localKpi !== (item.kpi || '')) updates.kpi = localKpi;
      if (localKpiImpact !== (item.kpiImpact || '')) updates.kpiImpact = localKpiImpact;
      if (localDescription !== (item.description || '')) updates.description = localDescription;
      if (localStartDate !== (item.startDate || '')) updates.startDate = localStartDate || null;
      if (localEndDate !== (item.endDate || '')) updates.endDate = localEndDate || null;
      if (localSprintId !== (item.sprintId || '')) updates.sprintId = localSprintId ? String(localSprintId) : null;
      if (localCostItem !== ((item as any).costItem || '')) updates.costItem = localCostItem;
      if (localCostType !== ((item as any).costType || 'OPEX')) updates.costType = localCostType;
      if (localRequestNum !== ((item as any).requestNum || '')) updates.requestNum = localRequestNum;
      if (localOrderNum !== ((item as any).orderNum || '')) updates.orderNum = localOrderNum;
      if (localBillingStatus !== ((item as any).billingStatus || 'Em aberto')) updates.billingStatus = localBillingStatus;
      if (Number(localCostValue) !== Number((item as any).costValue || 0)) updates.costValue = Number(localCostValue);

      if (Object.keys(updates).length > 0) updateWorkItem(item.id, updates);
    }, 800);
    return () => clearTimeout(timer);
  }, [
    localTitle, localKpi, localKpiImpact, localDescription, localStartDate, localEndDate, localSprintId,
    localCostItem, localCostType, localRequestNum, localOrderNum, localBillingStatus, localCostValue
  ]);

  const handleUpdate = (updates: Partial<WorkItem>) => updateWorkItem(item.id, updates);
  const handleClose = () => onClose();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setIsUploading(true);
      try { for (let i = 0; i < files.length; i++) await uploadAttachment(item.id, files[i]); }
      finally { setIsUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
    }
  };

  const removeAttachment = (e: React.MouseEvent, attId: string) => {
    e.stopPropagation();
    const filtered = (item.attachments || []).filter(a => a.id !== attId);
    handleUpdate({ attachments: filtered } as any);
  };

  const handleDelete = async () => {
    if (isConfirmingDelete) { await deleteWorkItem(item.id); onClose(); }
    else { setIsConfirmingDelete(true); setTimeout(() => setIsConfirmingDelete(false), 4000); }
  };

  return (
    <>
      <div className="fixed inset-y-0 right-0 w-full sm:w-[500px] lg:w-[620px] bg-white shadow-2xl z-[500] border-l border-gray-200 flex flex-col transform transition-transform animate-in slide-in-from-right duration-300">
        <div className="h-16 flex items-center justify-between px-4 lg:px-6 border-b border-gray-100 bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs font-black text-slate-400 font-mono tracking-tighter">{item.id}</span>
            <div className="px-2 py-1 rounded-md text-[9px] font-black uppercase bg-white border border-slate-200 text-slate-600">
              {item.type}
            </div>
          </div>
          <button onClick={handleClose} className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar space-y-6 lg:space-y-8">
          <section>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Título</label>
            <textarea 
              rows={2}
              className="w-full text-xl lg:text-2xl font-black text-slate-900 bg-transparent hover:bg-slate-50 focus:bg-white p-2 rounded-xl transition-all outline-none resize-none border-2 border-transparent focus:border-blue-100"
              value={localTitle}
              onChange={(e) => setLocalTitle(e.target.value)}
            />
          </section>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6 p-4 lg:p-6 bg-slate-50 rounded-3xl border border-slate-100 shadow-inner">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</label>
              <select className="w-full text-sm font-bold border-2 border-slate-200 rounded-xl p-2 bg-white" value={item.status} onChange={(e) => handleUpdate({ status: e.target.value as any })}>
                {Object.values(ItemStatus).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsável</label>
              <select className="w-full text-sm font-bold border-2 border-slate-200 rounded-xl p-2 bg-white" value={item.assigneeId || ''} onChange={(e) => handleUpdate({ assigneeId: e.target.value })}>
                <option value="">Não atribuído</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sprint / Ciclo</label>
              <select className="w-full text-sm font-bold border-2 border-slate-200 rounded-xl p-2 bg-white" value={localSprintId} onChange={(e) => setLocalSprintId(e.target.value)}>
                <option value="">Backlog Geral</option>
                {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Esforço (Pontos)</label>
              <input type="number" className="w-full text-sm font-bold border-2 border-slate-200 rounded-xl p-2 bg-white" value={item.effort} onChange={(e) => handleUpdate({ effort: Number(e.target.value) })} />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Início</label>
              <input type="date" className="w-full text-sm font-bold border-2 border-slate-200 rounded-xl p-2 bg-white" value={localStartDate} onChange={(e) => setLocalStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Fim</label>
              <input type="date" className="w-full text-sm font-bold border-2 border-slate-200 rounded-xl p-2 bg-white" value={localEndDate} onChange={(e) => setLocalEndDate(e.target.value)} />
            </div>
          </div>

          <section className="space-y-4">
            <h3 className="text-[11px] font-black text-slate-800 uppercase flex items-center gap-2">
              <DollarSign size={16} className="text-emerald-500" /> Detalhes de Custo
            </h3>
            <div className="space-y-4 p-4 lg:p-6 bg-emerald-50/30 rounded-3xl border border-emerald-100">
               <input type="text" className="w-full text-sm font-bold border-2 border-slate-100 rounded-xl p-2.5 bg-white" value={localCostItem} onChange={(e) => setLocalCostItem(e.target.value)} placeholder="Item / Serviço" />
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Valor Planejado</label>
                    <input type="number" className="w-full text-sm font-bold border-2 border-slate-100 rounded-xl p-2.5 bg-white" value={localCostValue} onChange={(e) => setLocalCostValue(e.target.value)} placeholder="R$ 0.00" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Tipo de Verba</label>
                    <select className="w-full text-sm font-bold border-2 border-slate-100 rounded-xl p-2.5 bg-white" value={localCostType} onChange={(e) => setLocalCostType(e.target.value)}>
                      <option value="OPEX">OPEX</option>
                      <option value="CAPEX">CAPEX</option>
                      <option value="SEVIM">SEVIM</option>
                      <option value="OUTROS">OUTROS</option>
                    </select>
                  </div>
               </div>
               <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase">Requisição</label>
                    <input type="text" className="w-full text-xs font-bold border border-slate-100 rounded-lg p-2 bg-white" value={localRequestNum} onChange={(e) => setLocalRequestNum(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase">Pedido</label>
                    <input type="text" className="w-full text-xs font-bold border border-slate-100 rounded-lg p-2 bg-white" value={localOrderNum} onChange={(e) => setLocalOrderNum(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase">Faturamento</label>
                    <select className="w-full text-xs font-bold border border-slate-100 rounded-lg p-2 bg-white" value={localBillingStatus} onChange={(e) => setLocalBillingStatus(e.target.value)}>
                      <option value="Em aberto">Em aberto</option>
                      <option value="Pedido Emitido">Pedido Emitido</option>
                      <option value="Faturado">Faturado</option>
                    </select>
                  </div>
               </div>
            </div>
          </section>

          <section>
            <h3 className="text-[11px] font-black text-slate-800 uppercase mb-4 flex items-center gap-2">
              <AlignLeft size={16} className="text-slate-400" /> Descrição e KPI
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase">Métrica / KPI</label>
                  <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:bg-white" value={localKpi} onChange={(e) => setLocalKpi(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase">Impacto Esperado</label>
                  <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:bg-white" value={localKpiImpact} onChange={(e) => setLocalKpiImpact(e.target.value)} />
                </div>
              </div>
              <textarea 
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 lg:p-6 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:bg-white min-h-[150px] transition-all"
                placeholder="Descreva as especificações detalhadas..."
                value={localDescription}
                onChange={(e) => setLocalDescription(e.target.value)}
              />
            </div>
          </section>

          <section className="space-y-4 pb-20">
             <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Anexos</h3>
                <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black">
                  {isUploading ? 'SUBINDO...' : 'ADICIONAR'}
                </button>
                <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileSelect} />
             </div>
             <div className="grid grid-cols-2 gap-4">
                {(item.attachments || []).map((att) => (
                  <div key={att.id} onClick={() => setPreviewAttachment(att)} className="group relative rounded-2xl border-2 border-slate-100 overflow-hidden bg-slate-50 cursor-zoom-in aspect-video">
                    {att.type.startsWith('image') ? <img src={att.url} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full"><Paperclip size={24} className="text-slate-300" /></div>}
                    <button onClick={(e) => removeAttachment(e, att.id)} className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12} /></button>
                  </div>
                ))}
             </div>
          </section>
        </div>

        <div className="p-4 lg:p-8 border-t bg-slate-50 flex gap-4 shrink-0">
          <button onClick={handleDelete} className={`flex-1 py-4 rounded-2xl text-xs font-black transition-all ${isConfirmingDelete ? 'bg-red-600 text-white animate-pulse' : 'bg-white text-red-600 border-2 border-red-100 shadow-sm'}`}>
            {isConfirmingDelete ? 'CONFIRMAR EXCLUSÃO' : 'EXCLUIR ITEM'}
          </button>
          <button onClick={handleClose} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black shadow-xl hover:bg-slate-800 transition-all">FECHAR PAINEL</button>
        </div>
      </div>

      {previewAttachment && (
        <div className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setPreviewAttachment(null)}>
          <img src={previewAttachment.url} className="max-w-full max-h-full object-contain shadow-2xl" />
        </div>
      )}
    </>
  );
};

export default ItemPanel;
