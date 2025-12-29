
import React, { useState, useRef } from 'react';
import { 
  X, Trash2, ListTodo, Calendar, AlertCircle, AlertTriangle, 
  Upload, Download, Paperclip, ChevronRight, Lock, Unlock, AlignLeft, Loader2, ExternalLink, Tag
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

  const handleUpdate = (updates: Partial<WorkItem>) => {
    updateWorkItem(item.id, updates);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setIsUploading(true);
      try {
        for (let i = 0; i < files.length; i++) {
          await uploadAttachment(item.id, files[i]);
        }
      } catch (err) {
        console.error("Erro no upload de arquivo:", err);
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    const files = clipboardData.files;
    const items = clipboardData.items;
    
    let fileToUpload: File | null = null;

    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        if (files[i].type.startsWith('image/')) {
          fileToUpload = files[i];
          break;
        }
      }
    }

    if (!fileToUpload && items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            fileToUpload = new File([blob], `paste-${Date.now()}.png`, { type: blob.type });
            break;
          }
        }
      }
    }

    if (fileToUpload) {
      e.preventDefault();
      setIsUploading(true);
      try {
        await uploadAttachment(item.id, fileToUpload);
      } catch (err) {
        console.error("Erro ao processar imagem colada:", err);
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
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-10">
          <section>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Título do Trabalho</label>
            <textarea 
              rows={2}
              className="w-full text-2xl font-black text-slate-900 bg-transparent hover:bg-slate-50 focus:bg-white p-2 rounded-xl transition-all outline-none resize-none border-2 border-transparent focus:border-blue-100"
              value={item.title}
              onChange={(e) => handleUpdate({ title: e.target.value })}
            />
          </section>

          <div className="grid grid-cols-2 gap-4 p-5 bg-slate-50 rounded-3xl border border-slate-100">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">Status</label>
              <select className="w-full text-sm font-bold border-2 border-slate-200 rounded-xl p-2.5 bg-white shadow-sm" value={item.status} onChange={(e) => handleUpdate({ status: e.target.value as any })}>
                {Object.values(ItemStatus).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">Prioridade</label>
              <select className="w-full text-sm font-bold border-2 border-slate-200 rounded-xl p-2.5 bg-white shadow-sm" value={item.priority} onChange={(e) => handleUpdate({ priority: e.target.value as any })}>
                {Object.values(ItemPriority).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">Responsável</label>
              <select className="w-full text-sm font-bold border-2 border-slate-200 rounded-xl p-2.5 bg-white shadow-sm" value={item.assigneeId} onChange={(e) => handleUpdate({ assigneeId: e.target.value })}>
                <option value="">Não atribuído</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">Sprint Alvo</label>
              <select className="w-full text-sm font-bold border-2 border-slate-200 rounded-xl p-2.5 bg-white shadow-sm" value={item.sprintId || ''} onChange={(e) => handleUpdate({ sprintId: e.target.value || undefined })}>
                <option value="">Fora de Sprints</option>
                {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">Esforço (Fibonacci)</label>
              <input type="number" className="w-full text-sm font-bold border-2 border-slate-200 rounded-xl p-2.5 bg-white shadow-sm" value={item.effort} onChange={(e) => handleUpdate({ effort: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              {/* Espaçador para alinhar datas na linha de baixo */}
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">Data de Início</label>
              <input type="date" className="w-full text-sm font-bold border-2 border-slate-200 rounded-xl p-2.5 bg-white shadow-sm" value={item.startDate || ''} onChange={(e) => handleUpdate({ startDate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">Data de Término</label>
              <input type="date" className="w-full text-sm font-bold border-2 border-slate-200 rounded-xl p-2.5 bg-white shadow-sm" value={item.endDate || ''} onChange={(e) => handleUpdate({ endDate: e.target.value })} />
            </div>
          </div>

          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <AlignLeft size={16} className="text-slate-400" /> Detalhamento
              </h3>
              <div className="text-[9px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 animate-pulse uppercase tracking-widest">
                Ctrl + V Habilitado
              </div>
            </div>
            <div className="relative">
              <textarea 
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-6 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:bg-white min-h-[180px] transition-all"
                placeholder="Descreva as especificações... Você também pode colar imagens aqui."
                value={item.description || ""}
                onPaste={handlePaste}
                onChange={(e) => handleUpdate({ description: e.target.value })}
              />
              {isUploading && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] rounded-2xl flex flex-col items-center justify-center animate-in fade-in z-20">
                  <Loader2 size={32} className="text-blue-600 animate-spin mb-2" />
                  <span className="text-[10px] font-black text-blue-600 uppercase">Processando upload...</span>
                </div>
              )}
            </div>
          </section>

          <section className="space-y-4">
             <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <Paperclip size={16} className="text-orange-500" /> Anexos e Evidências
                </h3>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black transition-all border border-slate-200"
                >
                  {isUploading ? <Loader2 size={14} className="animate-spin" /> : <><Upload size={14} /> SUBIR ARQUIVO</>}
                </button>
                <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileSelect} />
             </div>

             <div className="grid grid-cols-2 gap-4">
                {(item.attachments || []).map((att) => (
                  <div key={att.id} onClick={() => setPreviewAttachment(att)} className="group relative rounded-2xl border-2 border-slate-100 overflow-hidden bg-slate-50 cursor-zoom-in shadow-sm hover:shadow-md transition-all">
                    <div className="aspect-video w-full flex items-center justify-center bg-black/5">
                      {att.type.startsWith('image') ? (
                        <img src={att.url} className="w-full h-full object-cover" alt={att.name} />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-slate-400">
                          <Paperclip size={32} />
                          <span className="text-[10px] font-black uppercase tracking-widest">
                            {att.type.includes('pdf') ? 'DOCUMENTO PDF' : 'ARQUIVO'}
                          </span>
                        </div>
                      )}
                      <button onClick={(e) => {e.stopPropagation(); removeAttachment(e, att.id)}} className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="p-2.5 bg-white border-t text-[10px] font-bold text-slate-500 truncate flex items-center justify-between">
                      <span className="truncate">{att.name}</span>
                      {att.type.includes('pdf') && <ExternalLink size={10} />}
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
          <button onClick={onClose} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black shadow-xl active:scale-95 transition-all">FECHAR DETALHES</button>
        </div>
      </div>

      {previewAttachment && (
        <div className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-10 animate-in fade-in" onClick={() => setPreviewAttachment(null)}>
          <div className="absolute top-6 right-6 flex gap-4 z-50">
             <a href={previewAttachment.url} download target="_blank" onClick={(e) => e.stopPropagation()} className="p-3 bg-white/20 text-white rounded-full hover:bg-white/30 transition-all"><Download size={24}/></a>
             <button onClick={() => setPreviewAttachment(null)} className="p-3 bg-white/20 text-white rounded-full hover:bg-white/30 transition-all"><X size={24}/></button>
          </div>
          
          <div className="w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            {previewAttachment.type.startsWith('image') ? (
              <img src={previewAttachment.url} className="max-w-full max-h-full object-contain shadow-2xl animate-in zoom-in-95 duration-300" alt="Preview" />
            ) : (
              <div className="bg-white rounded-3xl overflow-hidden w-full h-full max-w-6xl shadow-2xl flex flex-col">
                <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
                  <span className="text-sm font-black text-slate-800 uppercase tracking-widest">{previewAttachment.name}</span>
                  <a href={previewAttachment.url} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
                    Abrir em nova aba <ExternalLink size={12} />
                  </a>
                </div>
                <iframe 
                  src={`${previewAttachment.url}#toolbar=0`} 
                  className="flex-1 w-full border-none" 
                  title="Document Preview"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ItemPanel;
