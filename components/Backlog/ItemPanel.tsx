
import React, { useState, useRef } from 'react';
import { 
  X, Trash2, ListTodo, LogOut, ArrowRightCircle, ChevronRight, 
  Calendar, AlertCircle, AlertTriangle, Image as ImageIcon, 
  Film, Paperclip, Upload, Play, Maximize2, Download, BarChart2 
} from 'lucide-react';
import { WorkItem, ItemPriority, ItemStatus, Attachment } from '../../types';
import { useAgile } from '../../store';

interface ItemPanelProps {
  item: WorkItem;
  onClose: () => void;
}

const ItemPanel: React.FC<ItemPanelProps> = ({ item, onClose }) => {
  const { updateWorkItem, deleteWorkItem, users, sprints, uploadAttachment } = useAgile();
  const [isMovingSprint, setIsMovingSprint] = useState(false);
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
      for (let i = 0; i < files.length; i++) {
        await uploadAttachment(item.id, files[i]);
      }
      setIsUploading(false);
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

  const handleMoveToSprint = (sprintId: string) => {
    handleUpdate({ sprintId });
    setIsMovingSprint(false);
    onClose();
  };

  const availableFutureSprints = sprints.filter(s => s.id !== item.sprintId && s.status !== 'Encerrada');

  return (
    <>
      <div className="fixed inset-y-0 right-0 w-[550px] bg-white shadow-2xl z-[500] border-l border-gray-200 flex flex-col transform transition-transform animate-in slide-in-from-right duration-300 outline-none">
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

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
          <section>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Título do Trabalho</label>
            <textarea 
              rows={2}
              className="w-full text-xl font-black text-slate-900 bg-transparent hover:bg-slate-50 focus:bg-white p-2 rounded-xl transition-all outline-none resize-none leading-tight"
              value={item.title}
              onChange={(e) => handleUpdate({ title: e.target.value })}
            />
          </section>

          <div className="grid grid-cols-2 gap-6 py-6 border-y border-slate-100">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</label>
              <select className="w-full text-sm font-bold border-2 border-slate-100 rounded-xl p-3 bg-slate-50" value={item.status} onChange={(e) => handleUpdate({ status: e.target.value as any })}>
                {Object.values(ItemStatus).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prioridade</label>
              <select className="w-full text-sm font-bold border-2 border-slate-100 rounded-xl p-3 bg-slate-50" value={item.priority} onChange={(e) => handleUpdate({ priority: e.target.value as any })}>
                {Object.values(ItemPriority).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsável</label>
              <select className="w-full text-sm font-bold border-2 border-slate-100 rounded-xl p-3 bg-slate-50" value={item.assigneeId} onChange={(e) => handleUpdate({ assigneeId: e.target.value })}>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Esforço</label>
              <input type="number" className="w-full text-sm font-bold border-2 border-slate-100 rounded-xl p-3 bg-slate-50" value={item.effort} onChange={(e) => handleUpdate({ effort: Number(e.target.value) })} />
            </div>
          </div>

          <section className="space-y-4">
             <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <Paperclip size={16} className="text-orange-500" /> Anexos e Evidências
                </h3>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-black transition-all"
                >
                  {isUploading ? 'CARREGANDO...' : <><Upload size={14} /> SUBIR ARQUIVO</>}
                </button>
                <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileSelect} />
             </div>

             <div className="grid grid-cols-2 gap-4">
                {(item.attachments || []).map((att) => (
                  <div key={att.id} onClick={() => setPreviewAttachment(att)} className="group relative rounded-2xl border-2 border-slate-100 overflow-hidden bg-slate-50 cursor-zoom-in">
                    <div className="aspect-video w-full flex items-center justify-center bg-black/5">
                      {att.type.startsWith('image') ? (
                        <img src={att.url} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-slate-400">
                          <Paperclip size={32} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Documento</span>
                        </div>
                      )}
                      <button onClick={(e) => removeAttachment(e, att.id)} className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="p-2 bg-white border-t text-[10px] font-bold text-slate-500 truncate">{att.name}</div>
                  </div>
                ))}
             </div>
          </section>
        </div>

        <div className="p-8 border-t bg-slate-50 flex gap-4">
          <button onClick={handleDelete} className={`flex-1 py-4 rounded-2xl text-xs font-black transition-all ${isConfirmingDelete ? 'bg-red-600 text-white' : 'bg-white text-red-600 border border-red-100'}`}>
            {isConfirmingDelete ? 'CONFIRMAR EXCLUSÃO' : 'EXCLUIR ITEM'}
          </button>
          <button onClick={onClose} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black">FECHAR</button>
        </div>
      </div>

      {previewAttachment && (
        <div className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-md flex items-center justify-center p-10" onClick={() => setPreviewAttachment(null)}>
          <div className="absolute top-6 right-6 flex gap-4">
             <a href={previewAttachment.url} download target="_blank" className="p-3 bg-white/20 text-white rounded-full hover:bg-white/30"><Download size={24}/></a>
             <button onClick={() => setPreviewAttachment(null)} className="p-3 bg-white/20 text-white rounded-full hover:bg-white/30"><X size={24}/></button>
          </div>
          {previewAttachment.type.startsWith('image') ? (
            <img src={previewAttachment.url} className="max-w-full max-h-full object-contain shadow-2xl" />
          ) : (
            <iframe src={previewAttachment.url} className="w-full h-full rounded-lg" />
          )}
        </div>
      )}
    </>
  );
};

export default ItemPanel;
