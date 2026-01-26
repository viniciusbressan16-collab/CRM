import React, { useEffect, useState } from 'react';
import Skeleton from '../components/ui/Skeleton';
import { View } from '../App';
import Layout from '../components/Layout';
import AddAppointmentModal from '../components/AddAppointmentModal';
import { supabase } from '../lib/supabaseClient';
import { Database } from '../types/supabase';

type Deal = Database['public']['Tables']['deals']['Row'];
type Pipeline = Database['public']['Tables']['pipelines']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];
type DealNote = Database['public']['Tables']['deal_notes']['Row'];
type DealTask = Database['public']['Tables']['deal_tasks']['Row'];
type DealDocument = Database['public']['Tables']['deal_documents']['Row'];
type DealHistory = Database['public']['Tables']['deal_history']['Row'];

type DealWithDetails = Deal & {
  assignee: Profile | null;
  pipeline: Pipeline | null;
};

interface AssociatedCompany {
  name: string;
  cnpj: string;
}

import Header from '../components/Header';

interface ClientDetailsPageProps {
  onNavigate: (view: View, id?: string) => void;
  dealId?: string | null;
  activePage: View;
}

import ActionMenu from '../components/ActionMenu';
import NoteItem from '../components/NoteItem';

const EditModal = ({
  editingSection,
  editFormData,
  setEditFormData,
  onClose,
  onSave,
  profiles,
  partnerships,
  onAddPartnership
}: {
  editingSection: 'client' | 'contact' | 'assignee' | 'tags' | null,
  editFormData: any,
  setEditFormData: (data: any) => void,
  onClose: () => void,
  onSave: () => void,
  profiles: Profile[],
  partnerships: string[],
  onAddPartnership: (name: string) => void
}) => {
  if (!editingSection) return null;

  const [newPartnershipName, setNewPartnershipName] = useState('');
  const [isAddingPartnership, setIsAddingPartnership] = useState(false);

  const handleCreatePartnership = () => {
    if (newPartnershipName.trim()) {
      onAddPartnership(newPartnershipName);
      setNewPartnershipName('');
      setIsAddingPartnership(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-[#0f0f0f] rounded-2xl shadow-2xl w-full max-w-md border border-white/10 relative overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Glow Effect */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>

        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">edit_square</span>
            {editingSection === 'client' && 'Editar Cliente'}
            {editingSection === 'contact' && 'Editar Contato'}
            {editingSection === 'assignee' && 'Alterar Responsável'}
            {editingSection === 'tags' && 'Editar Parceria'}
          </h3>
          <button onClick={onClose} className="size-8 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white flex items-center justify-center transition-all">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          {editingSection === 'client' && (
            <div>
              <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-2">Nome do Cliente</label>
              <input
                type="text"
                value={editFormData.client_name || ''}
                onChange={e => setEditFormData({ ...editFormData, client_name: e.target.value })}
                className="w-full rounded-lg border border-white/10 p-3 text-sm bg-black/20 text-white placeholder:text-white/20 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all"
              />
            </div>
          )}

          {editingSection === 'contact' && (
            <>
              <div>
                <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-2">Nome do Contato</label>
                <input
                  type="text"
                  value={editFormData.contact_name || ''}
                  onChange={e => setEditFormData({ ...editFormData, contact_name: e.target.value })}
                  className="w-full rounded-lg border border-white/10 p-3 text-sm bg-black/20 text-white placeholder:text-white/20 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-2">Email</label>
                <input
                  type="email"
                  value={editFormData.email || ''}
                  onChange={e => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="w-full rounded-lg border border-white/10 p-3 text-sm bg-black/20 text-white placeholder:text-white/20 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-2">Telefone</label>
                <input
                  type="tel"
                  value={editFormData.phone || ''}
                  onChange={e => setEditFormData({ ...editFormData, phone: e.target.value })}
                  className="w-full rounded-lg border border-white/10 p-3 text-sm bg-black/20 text-white placeholder:text-white/20 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all"
                />
              </div>
            </>
          )}

          {editingSection === 'assignee' && (
            <div>
              <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-2">Responsável</label>
              <select
                value={editFormData.assignee_id || ''}
                onChange={e => setEditFormData({ ...editFormData, assignee_id: e.target.value })}
                className="w-full rounded-lg border border-white/10 p-3 text-sm bg-black/20 text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none appearance-none"
              >
                <option value="" className="bg-gray-900">Selecione...</option>
                {profiles.map(profile => (
                  <option key={profile.id} value={profile.id} className="bg-gray-900">{profile.name}</option>
                ))}
              </select>
            </div>
          )}

          {editingSection === 'tags' && (
            <div>
              <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-2">Parceria</label>
              <div className="flex gap-2">
                <select
                  value={editFormData.tag || ''}
                  onChange={e => setEditFormData({ ...editFormData, tag: e.target.value })}
                  className="flex-1 rounded-lg border border-white/10 p-3 text-sm bg-black/20 text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none appearance-none"
                >
                  <option value="" className="bg-gray-900">Selecione...</option>
                  {partnerships.map(p => (
                    <option key={p} value={p} className="bg-gray-900">{p}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setIsAddingPartnership(!isAddingPartnership)}
                  className="px-4 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 text-white transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">add</span>
                </button>
              </div>

              {isAddingPartnership && (
                <div className="mt-3 flex gap-2 animate-in fade-in slide-in-from-top-1">
                  <input
                    type="text"
                    value={newPartnershipName}
                    onChange={(e) => setNewPartnershipName(e.target.value)}
                    placeholder="Nome da nova parceria"
                    className="flex-1 rounded-lg border border-white/10 p-2.5 text-xs bg-black/20 text-white focus:border-primary/50 outline-none"
                    autoFocus
                  />
                  <button
                    onClick={handleCreatePartnership}
                    className="px-4 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-hover shadow-lg shadow-primary/20"
                  >
                    Salvar
                  </button>
                </div>
              )}
            </div>
          )}


          <button onClick={onSave} className="w-full bg-primary text-white font-bold py-3.5 rounded-lg mt-2 hover:bg-primary-hover transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 group/btn">
            <span className="material-symbols-outlined text-[20px] group-hover/btn:scale-110 transition-transform">check</span>
            Salvar Alterações
          </button>
        </div>
      </div>
    </div>
  );
};

const TaskModal = ({
  isOpen,
  onClose,
  onSave,
  taskToEdit,
  profiles
}: {
  isOpen: boolean,
  onClose: () => void,
  onSave: (data: any) => void,
  taskToEdit: DealTask | null,
  profiles: Profile[]
}) => {
  const [title, setTitle] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [priority, setPriority] = useState<'baixa' | 'média' | 'alta'>('média');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      if (taskToEdit) {
        setTitle(taskToEdit.title);
        setUrgent(taskToEdit.is_urgent || false);
        setPriority((taskToEdit as any).priority || (taskToEdit.is_urgent ? 'alta' : 'média'));
        setDescription((taskToEdit as any).description || '');
        setDueDate(taskToEdit.due_date ? new Date(taskToEdit.due_date).toISOString().split('T')[0] : '');
        setAssigneeIds(taskToEdit.assignee_ids || []);
      } else {
        setTitle('');
        setUrgent(false);
        setPriority('média');
        setDescription('');
        setDueDate(new Date().toISOString().split('T')[0]);
        setAssigneeIds([]);
      }
    }
  }, [isOpen, taskToEdit]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({
      title,
      is_urgent: urgent || priority === 'alta',
      priority,
      description,
      due_date: dueDate ? new Date(dueDate + 'T12:00:00').toISOString() : null,
      assignee_ids: assigneeIds,
      assignee_id: assigneeIds[0] || null
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-[#0f0f0f] rounded-2xl shadow-2xl w-full max-w-md border border-white/10 relative overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">{taskToEdit ? 'edit_square' : 'add_task'}</span>
            {taskToEdit ? 'Editar Tarefa' : 'Nova Tarefa'}
          </h3>
          <button onClick={onClose} className="size-8 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white flex items-center justify-center transition-all">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          <div>
            <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-2">Título da Tarefa</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Enviar proposta comercial"
              className="w-full rounded-lg border border-white/10 p-3 text-sm bg-black/20 text-white placeholder:text-white/20 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-2">Descrição</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes da tarefa..."
              className="w-full rounded-lg border border-white/10 p-3 text-sm bg-black/20 text-white placeholder:text-white/20 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all resize-none h-20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-3">Prioridade</label>
            <div className="grid grid-cols-3 gap-2">
              {(['baixa', 'média', 'alta'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    setPriority(p);
                    if (p === 'alta') setUrgent(true);
                    else if (urgent) setUrgent(false);
                  }}
                  className={`py-2 rounded-lg text-xs font-bold border transition-all uppercase tracking-wider ${priority === p
                    ? p === 'alta' ? 'bg-red-500 border-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]' :
                      p === 'média' ? 'bg-amber-500 border-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)]' :
                        'bg-blue-500 border-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]'
                    : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:border-white/20'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-2">Data de Entrega</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-lg border border-white/10 p-2.5 text-xs bg-black/20 text-white focus:border-primary/50 outline-none"
              />
            </div>
            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 text-xs text-white/70 cursor-pointer hover:text-white transition-colors py-2.5">
                <input
                  type="checkbox"
                  checked={urgent}
                  onChange={(e) => {
                    setUrgent(e.target.checked);
                    if (e.target.checked) setPriority('alta');
                  }}
                  className="rounded border-white/20 bg-black/20 text-red-500 focus:ring-red-500/50"
                />
                Marcar como Urgente
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-2">Responsáveis</label>
            <div className="flex flex-wrap gap-2 p-2 rounded-lg bg-black/20 border border-white/10">
              {profiles.map(p => {
                const isSelected = assigneeIds.includes(p.id);
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      const newIds = isSelected
                        ? assigneeIds.filter(id => id !== p.id)
                        : [...assigneeIds, p.id];
                      setAssigneeIds(newIds);
                    }}
                    title={p.name || ''}
                    className={`size-8 rounded-full flex items-center justify-center cursor-pointer transition-all border-2 ${isSelected ? 'border-primary ring-2 ring-primary/30' : 'border-transparent opacity-50 hover:opacity-100 hover:border-white/20'}`}
                  >
                    {p.avatar_url ? (
                      <img src={p.avatar_url} className="w-full h-full rounded-full object-cover" alt={p.name || ''} />
                    ) : (
                      <div className="w-full h-full rounded-full bg-gray-700 flex items-center justify-center text-[10px] text-white font-bold">
                        {p.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <button onClick={handleSave} className="w-full bg-primary text-white font-bold py-3.5 rounded-lg mt-2 hover:bg-primary-hover transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 group/btn">
            <span className="material-symbols-outlined text-[20px] group-hover/btn:scale-110 transition-transform">check</span>
            {taskToEdit ? 'Salvar Alterações' : 'Adicionar Tarefa'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function ClientDetailsPage({ onNavigate, dealId, activePage }: ClientDetailsPageProps) {
  const [deal, setDeal] = useState<DealWithDetails | null>(null);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);

  // Data States
  const [notes, setNotes] = useState<DealNote[]>([]);
  const [tasks, setTasks] = useState<DealTask[]>([]);
  const [documents, setDocuments] = useState<DealDocument[]>([]);
  const [history, setHistory] = useState<DealHistory[]>([]);
  const [isApptModalOpen, setIsApptModalOpen] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskUrgent, setNewTaskUrgent] = useState(false);
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'done'>('pending');
  const [newTaskDueDate, setNewTaskDueDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newTaskAssigneeIds, setNewTaskAssigneeIds] = useState<string[]>([]);

  // Task Modal State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<DealTask | null>(null);

  // Edit Modal State (Existing)
  const [editingSection, setEditingSection] = useState<'client' | 'contact' | 'assignee' | 'tags' | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  // Fetch profiles for assignee dropdown
  const [profiles, setProfiles] = useState<Profile[]>([]);
  // Partnerships
  const [partnerships, setPartnerships] = useState<string[]>([]);

  useEffect(() => {
    if (dealId) {
      fetchDealDetails();
    } else {
      setLoading(false);
    }
  }, [dealId]);

  const fetchDealDetails = async () => {
    try {
      setLoading(true);

      // Fetch Pipelines
      const { data: pipelinesData, error: pipelinesError } = await supabase
        .from('pipelines')
        .select('*')
        .order('order_index');

      if (pipelinesError) throw pipelinesError;
      setPipelines(pipelinesData || []);

      // Fetch Profiles (for assignee edit)
      const { data: profilesData } = await supabase.from('profiles').select('*');
      if (profilesData) setProfiles(profilesData);

      // Fetch Partnerships
      fetchPartnerships();

      // Fetch Deal
      const { data: dealData, error: dealError } = await supabase
        .from('deals')
        .select(`*, assignee:profiles(*), pipeline:pipelines(*)`)
        .eq('id', dealId!)
        .single();

      if (dealError) throw dealError;
      setDeal(dealData as any);

      await Promise.all([
        fetchNotes(),
        fetchTasks(),
        fetchDocuments(),
        fetchHistory()
      ]);

    } catch (error) {
      console.error('Error fetching deal details:', error);
      alert('Erro ao carregar detalhes do lead.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPartnerships = async () => {
    const { data } = await supabase.from('partnerships').select('name').order('name');
    if (data) setPartnerships(data.map(p => p.name));
  };

  const createPartnership = async (name: string) => {
    try {
      const { error } = await supabase.from('partnerships').insert({ name });
      if (!error) {
        fetchPartnerships();
        setEditFormData({ ...editFormData, tag: name }); // Auto select
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchNotes = async () => {
    const { data, error } = await supabase.from('deal_notes').select('*').eq('deal_id', dealId!).order('created_at', { ascending: false });
    if (!error) setNotes(data || []);
  };

  const fetchTasks = async () => {
    const { data, error } = await supabase.from('deal_tasks').select('*').eq('deal_id', dealId!).order('created_at', { ascending: false });
    if (!error) setTasks(data || []);
  };

  const fetchDocuments = async () => {
    const { data, error } = await supabase.from('deal_documents').select('*').eq('deal_id', dealId!).order('created_at', { ascending: false });
    if (!error) setDocuments(data || []);
  };

  const fetchHistory = async () => {
    const { data, error } = await supabase
      .from('deal_history')
      .select(`
        *,
        profile:profiles(name, avatar_url)
      `)
      .eq('deal_id', dealId!)
      .order('created_at', { ascending: false });

    if (!error) setHistory(data || []);
  };

  // --- Handlers ---
  const addToHistory = async (action: string, description: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('deal_history').insert({
      deal_id: deal.id, // Ensure 'deal' is available in scope or use 'dealId'
      action_type: action,
      description: description,
      user_id: user?.id
    });
    fetchHistory();
  };

  // --- Handlers ---
  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    try {
      const { error } = await supabase.from('deal_notes').insert({ deal_id: dealId!, content: newNote });
      if (error) throw error;
      setNewNote('');
      fetchNotes();
      addToHistory('NOTE', 'adicionou uma nota.');
    } catch (error) {
      console.error('Error adding note:', error);
      alert('Erro ao adicionar nota.');
    }
  };

  const handleUpdateNote = async (id: string, content: string) => {
    try {
      const { error } = await supabase.from('deal_notes').update({ content }).eq('id', id);
      if (error) throw error;
      fetchNotes();
    } catch (error) {
      console.error('Error updating note:', error);
      alert('Erro ao atualizar nota.');
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (!confirm('Tem certeza?')) return;
    try {
      const { error } = await supabase.from('deal_notes').delete().eq('id', id);
      if (error) throw error;
      fetchNotes();
    } catch (error) {
      console.error('Error deleting note:', error);
      alert('Erro ao excluir nota.');
    }
  };

  const handleUpdateDeal = async (updates: any) => {
    try {
      const { error } = await supabase.from('deals').update(updates).eq('id', dealId!);
      if (error) throw error;
      await fetchDealDetails(); // Refresh all data
      setEditingSection(null);
    } catch (error) {
      console.error('Error updating deal:', error);
      alert('Erro ao atualizar oportunidade.');
    }
  };


  const handleOpenEditTask = (task: DealTask) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = async (data: any) => {
    try {
      if (editingTask) {
        // Update
        const { error } = await supabase
          .from('deal_tasks')
          .update(data)
          .eq('id', editingTask.id);
        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from('deal_tasks')
          .insert({
            ...data,
            deal_id: dealId!
          });
        if (error) throw error;
      }

      setIsTaskModalOpen(false);
      setEditingTask(null);
      fetchTasks();
      fetchHistory();
    } catch (error) {
      console.error('Error saving task:', error);
      alert('Erro ao salvar tarefa.');
    }
  };

  const handleToggleTask = async (task: DealTask) => {
    try {
      const { error } = await supabase.from('deal_tasks').update({ is_completed: !task.is_completed }).eq('id', task.id);
      if (error) throw error;
      fetchTasks();
      if (!task.is_completed) setTimeout(fetchHistory, 500);
    } catch (error) {
      console.error('Error toggling task:', error);
    }
  };

  const handleToggleUrgent = async (task: DealTask, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const newUrgency = !task.is_urgent;

    // Optimistic Update
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, is_urgent: newUrgency, priority: newUrgency ? 'alta' : 'média' } : t));

    try {
      const { error } = await supabase
        .from('deal_tasks')
        .update({
          is_urgent: newUrgency,
          priority: newUrgency ? 'alta' : 'média'
        })
        .eq('id', task.id);

      if (error) throw error;
    } catch (error) {
      console.error(error);
      alert('Erro ao atualizar urgência.');
      // Revert
      fetchTasks();
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm('Tem certeza?')) return;
    try {
      const { error } = await supabase.from('deal_tasks').delete().eq('id', id);
      if (error) throw error;
      fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Erro ao excluir tarefa.');
    }
  };


  // --- Documents & Uploads ---
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${dealId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('deal-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('deal-documents')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase.from('deal_documents').insert({
        deal_id: dealId!,
        name: file.name,
        size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
        type: fileExt || 'file',
        url: publicUrl
      });

      if (dbError) throw dbError;

      fetchDocuments();
      fetchHistory();

    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Erro ao enviar arquivo.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteDocument = async (doc: DealDocument) => {
    if (!confirm('Tem certeza?')) return;
    try {
      const { error } = await supabase.from('deal_documents').delete().eq('id', doc.id);
      if (error) throw error;
      fetchDocuments();
    } catch (error) {
      console.error('Error deleting doc:', error);
      alert('Erro ao excluir documento.');
    }
  };


  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatDateShort = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  const handleOpenEdit = (section: 'client' | 'contact' | 'assignee' | 'tags') => {
    setEditFormData(deal);
    setEditingSection(section);
  };

  const handleSaveEdit = () => {
    let updates = {};
    if (editingSection === 'client') {
      updates = { client_name: editFormData.client_name };
    } else if (editingSection === 'contact') {
      updates = {
        contact_name: editFormData.contact_name,
        email: editFormData.email,
        phone: editFormData.phone
      };
    } else if (editingSection === 'assignee') {
      updates = { assignee_id: editFormData.assignee_id };
    } else if (editingSection === 'tags') {
      updates = { tag: editFormData.tag };
    }
    handleUpdateDeal(updates);
  };


  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-background-light dark:bg-background-dark overflow-hidden">
        <div className="w-full max-w-[1440px] mx-auto p-4 md:p-8 space-y-8">
          {/* Header Skeleton */}
          <div className="flex justify-between items-center animate-fade-in-up">
            <div className="space-y-3">
              <Skeleton className="h-12 w-64 md:w-96" />
              <Skeleton className="h-4 w-48 opacity-60" />
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-10 w-32 rounded-lg" />
              <Skeleton className="h-10 w-40 rounded-lg" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
            {/* Sidebar Skeleton */}
            <div className="lg:col-span-4 xl:col-span-3 space-y-6">
              <Skeleton height={200} className="w-full delay-100 animate-fade-in-up" />
              <Skeleton height={400} className="w-full delay-200 animate-fade-in-up" />
              <Skeleton height={150} className="w-full delay-300 animate-fade-in-up" />
            </div>
            {/* Main Content Skeleton */}
            <div className="lg:col-span-8 xl:col-span-9 space-y-6">
              <Skeleton height={180} className="w-full delay-100 animate-fade-in-up" />
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <Skeleton height={500} className="w-full delay-200 animate-fade-in-up" />
                <Skeleton height={500} className="w-full delay-300 animate-fade-in-up" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-background-light dark:bg-background-dark text-text-secondary-light gap-4 animate-fade-in-up">
        <span className="material-symbols-outlined text-6xl opacity-20">search_off</span>
        <p className="text-lg font-medium">Oportunidade não encontrada.</p>
        <button
          onClick={() => onNavigate('pipeline')}
          className="text-primary hover:underline font-bold"
        >
          Voltar para o Pipeline
        </button>
      </div>
    );
  }

  const currentPipelineIndex = pipelines.findIndex(p => p.id === deal.pipeline_id);

  return (
    <Layout onNavigate={onNavigate} activePage={activePage}>
      <EditModal
        editingSection={editingSection}
        editFormData={editFormData}
        setEditFormData={setEditFormData}
        onClose={() => setEditingSection(null)}
        onSave={handleSaveEdit}
        profiles={profiles}
        partnerships={partnerships}
        onAddPartnership={createPartnership}
      />
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => { setIsTaskModalOpen(false); setEditingTask(null); }}
        onSave={handleSaveTask}
        taskToEdit={editingTask}
        profiles={profiles}
      />
      {/* Top Navbar Removed - Managed by Sidebar/Layout context if needed or just use consistent page headers */}

      <div className="flex-1 w-full max-w-[1440px] mx-auto p-4 md:p-6 lg:p-8">
        <Header
          title={deal.client_name}
          description={deal.cnpj ? `CNPJ: ${deal.cnpj} • Criado em ${formatDate(deal.created_at)}` : `Criado em ${formatDate(deal.created_at)}`}
          onNavigate={onNavigate}
          startContent={
            <div className="flex items-center gap-2 text-sm">
              <span className="text-white/50 cursor-pointer hover:text-white transition-colors" onClick={() => onNavigate('pipeline')}>
                Pipeline
              </span>
              <span className="text-white/30">/</span>
              <span className="text-white font-medium">{deal.client_name}</span>
            </div>
          }
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsApptModalOpen(true)}
              className="glass-button px-4 py-2 rounded-lg flex items-center gap-2 text-white hover:text-white group border border-white/10 hover:border-primary/50 transition-all shadow-lg shadow-black/20"
            >
              <span className="material-symbols-outlined text-[20px] text-primary group-hover:scale-110 transition-transform">calendar_add_on</span>
              <span className="text-sm font-bold">Agendar Reunião</span>
            </button>
            <button className="h-10 px-4 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-[20px]">add</span>
              Novo Projeto
            </button>
          </div>
        </Header>

        <AddAppointmentModal
          isOpen={isApptModalOpen}
          onClose={() => setIsApptModalOpen(false)}
          onSuccess={() => { }}
          initialData={{
            title: `Reunião com ${deal.client_name}`,
            description: `Reunião agendada via CRM para o cliente ${deal.client_name}.`
          }}
        />

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* Left Sidebar (Profile & Stats) */}
          <aside className="lg:col-span-4 xl:col-span-3 flex flex-col gap-6 sticky top-24">
            {/* Financial Impact Card - Stagger 1 */}
            <div className="animate-fade-in-up delay-100 bg-primary rounded-xl p-6 text-white shadow-xl shadow-primary/20 relative overflow-hidden group">
              {/* Decorative Gradient */}
              <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
              <div className="relative z-10">
                <p className="text-blue-100 text-sm font-medium mb-1">Valor Estimado</p>
                <h3 className="text-3xl font-black mb-4 tracking-tight">{formatCurrency(deal.value || 0)}</h3>
                <div className="h-px bg-white/20 w-full mb-4"></div>
                {/* Mock Honorários */}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-blue-100">Honorários (~20%)</span>
                  <span className="font-bold">{formatCurrency((deal.value || 0) * 0.2)}</span>
                </div>
              </div>
            </div>

            {/* Client Details Card - Stagger 2 */}
            <div className="animate-fade-in-up delay-200 glass-card-premium rounded-xl p-0 overflow-hidden shadow-2xl shadow-black/40 border border-white/5">
              <div className="p-6 border-b border-white/5 flex items-start justify-between gap-4 group/card relative bg-gradient-to-r from-white/[0.02] to-transparent">
                <div className="flex gap-5">
                  <div className="size-16 rounded-xl bg-gradient-to-br from-gray-800/80 to-black/80 border border-white/10 flex items-center justify-center p-3 shadow-inner">
                    <span className="material-symbols-outlined text-[32px] text-primary/80 drop-shadow-md">domain</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white tracking-tight">{deal.client_name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="flex items-center justify-center size-1.5 rounded-full bg-primary/80 animate-pulse"></span>
                      <p className="text-xs font-medium text-white/50 tracking-wide uppercase">{deal.tag || 'Sem tag'}</p>
                    </div>
                  </div>
                </div>
                <div className="opacity-0 group-hover/card:opacity-100 transition-opacity absolute top-4 right-4">
                  <ActionMenu onEdit={() => handleOpenEdit('client')} onDelete={() => { }} />
                </div>
              </div>
              <div className="p-6 flex flex-col gap-6">
                <div className="relative group/section">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-text-secondary-light uppercase tracking-wider block">Contato Principal</label>
                    <div className="opacity-0 group-hover/section:opacity-100 transition-opacity -mr-2">
                      <ActionMenu onEdit={() => handleOpenEdit('contact')} onDelete={() => { }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mb-1">
                    {/* Placeholder Avatar */}
                    <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                      {deal.contact_name ? deal.contact_name.charAt(0).toUpperCase() : 'C'}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-text-main-light dark:text-white">{deal.contact_name || 'Não informado'}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-text-secondary-light text-[20px] mt-0.5">mail</span>
                    <a className="text-sm text-text-main-light dark:text-white hover:text-primary break-all" href={`mailto:${deal.email}`}>{deal.email || '-'}</a>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-text-secondary-light text-[20px] mt-0.5">call</span>
                    <a className="text-sm text-text-main-light dark:text-white hover:text-primary" href={`tel:${deal.phone}`}>{deal.phone || '-'}</a>
                  </div>
                </div>
                {deal.assignee && (
                  <div className="pt-4 border-t border-border-light dark:border-border-dark relative group/section">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-semibold text-text-secondary-light uppercase tracking-wider block">Consultor Responsável</label>
                      <div className="opacity-0 group-hover/section:opacity-100 transition-opacity -mr-2">
                        <ActionMenu onEdit={() => handleOpenEdit('assignee')} onDelete={() => { }} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {deal.assignee.avatar_url ? (
                        <img src={deal.assignee.avatar_url} className="size-6 rounded-full" alt="Avatar" />
                      ) : (
                        <div className="size-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                          {deal.assignee.name ? deal.assignee.name.charAt(0).toUpperCase() : '?'}
                        </div>
                      )}
                      <span className="text-sm font-medium text-text-main-light dark:text-white">{deal.assignee.name}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Associated Companies Card - Stagger 3 */}
            <div className="animate-fade-in-up delay-300 glass-card-premium rounded-xl border border-white/5 p-6 shadow-xl relative group/card">
              <div className="flex justify-between items-center mb-4">
                <label className="text-[10px] font-bold text-primary/80 uppercase tracking-widest">Empresas Associadas</label>
              </div>
              <div className="space-y-3">
                {deal.associated_companies && Array.isArray(deal.associated_companies) && (deal.associated_companies as unknown as AssociatedCompany[]).length > 0 ? (
                  (deal.associated_companies as unknown as AssociatedCompany[]).map((company, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-white/5 border border-white/10">
                      <p className="text-sm font-bold text-white mb-1">{company.name}</p>
                      <p className="text-[10px] text-white/40 font-mono flex items-center gap-1">
                        <span className="material-symbols-outlined text-[10px]">corporate_fare</span>
                        {company.cnpj || 'CNPJ não informado'}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-white/30 italic">Nenhuma empresa associada</p>
                )}
              </div>
            </div>

            {/* Parceria Card - Stagger 4 */}
            <div className="animate-fade-in-up delay-500 glass-card-premium rounded-xl border border-white/5 p-6 shadow-xl relative group/card">
              <div className="flex justify-between items-center mb-4">
                <label className="text-[10px] font-bold text-primary/80 uppercase tracking-widest">Parceria Estratégica</label>
                <div className="opacity-0 group-hover/card:opacity-100 transition-opacity -mr-2">
                  <ActionMenu onEdit={() => handleOpenEdit('tags')} onDelete={() => { }} />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {deal.tag ? (
                  <span className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-bold shadow-[0_0_15px_-4px_rgba(212,175,55,0.4)] backdrop-blur-md">{deal.tag}</span>
                ) : (
                  <span className="text-xs text-white/30 italic">Nenhuma parceria definida</span>
                )}
              </div>
            </div>
          </aside>

          {/* Right Content Area */}
          <main className="lg:col-span-8 xl:col-span-9 flex flex-col gap-6">
            {/* Process Tracker based on Pipeline */}
            <div className="glass-card-premium rounded-xl border border-white/5 p-8 shadow-2xl relative overflow-hidden">
              {/* Background Glow */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>

              <div className="flex items-center justify-between mb-8">
                <h3 className="font-bold text-lg text-white tracking-tight flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">timeline</span>
                  Status do Pipeline
                </h3>
                <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider">
                  {deal.pipeline?.name}
                </div>
              </div>
              <div className="relative px-2 overflow-x-auto pb-4 custom-scrollbar">
                <div className="min-w-[600px]">
                  {/* Visual Line Background */}
                  <div className="absolute top-4 left-0 w-full h-[2px] bg-white/5 -translate-y-1/2 rounded-full"></div>
                  {/* Active Line Background */}
                  {pipelines.length > 1 && (
                    <div
                      className="absolute top-4 left-0 h-[2px] bg-gradient-to-r from-primary/50 via-primary to-primary -translate-y-1/2 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(212,175,55,0.5)]"
                      style={{ width: `${Math.max(0, Math.min(100, (currentPipelineIndex / (pipelines.length - 1)) * 100))}%` }}
                    ></div>
                  )}

                  <div className="relative flex justify-between w-full">
                    {pipelines.map((step, idx) => {
                      const isActive = idx === currentPipelineIndex;
                      const isCompleted = idx < currentPipelineIndex;
                      return (
                        <div key={step.id} className="flex flex-col items-center gap-4 cursor-pointer group w-24 relative">
                          <div className={`size-8 rounded-full flex items-center justify-center ring-4 ring-[#0a0a0a] z-10 transition-all duration-500 shadow-xl ${isCompleted ? 'bg-primary text-black' : isActive ? 'bg-black border-2 border-primary text-primary shadow-[0_0_15px_rgba(212,175,55,0.6)]' : 'bg-[#1a1a1a] text-white/30 border border-white/10'}`}>
                            {isCompleted ? <span className="material-symbols-outlined text-sm font-bold animate-in zoom-in">check</span> : <span className={`text-xs font-bold ${isActive ? 'animate-pulse' : ''}`}>{idx + 1}</span>}
                          </div>
                          <span className={`text-[10px] sm:text-xs text-center leading-relaxed transition-colors duration-300 ${isActive ? 'font-bold text-white drop-shadow-md transform scale-105' : isCompleted ? 'font-bold text-primary/80' : 'font-medium text-white/30'}`}>{step.name}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-border-light dark:border-border-dark">
              <nav aria-label="Tabs" className="flex gap-8 overflow-x-auto">
                <button className="whitespace-nowrap py-4 px-1 border-b-2 text-sm font-medium flex items-center gap-2 border-primary text-primary font-bold">
                  <span className="material-symbols-outlined text-[20px]">dashboard</span> Visão Geral
                </button>
              </nav>
            </div>


            {/* Content Columns */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Left Column: Notes & History */}
              <div className="flex flex-col gap-6">
                {/* Quick Notes Widget */}
                <div className="glass-card rounded-xl border border-white/5 p-6 shadow-xl group/notes hover:border-primary/20 transition-colors">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-white flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                        <span className="material-symbols-outlined text-[20px]">edit_note</span>
                      </div>
                      Anotações Rápidas
                    </h4>
                    <button onClick={handleAddNote} className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary hover:text-white transition-all shadow-[0_0_10px_rgba(212,175,55,0.2)]">Salvar Nota</button>
                  </div>
                  <div className="relative group/input">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-lg -z-10 opacity-0 group-hover/input:opacity-100 transition-opacity"></div>
                    <textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      className="w-full bg-black/20 border border-white/5 rounded-lg p-4 text-sm text-white placeholder:text-white/20 focus:ring-1 focus:ring-primary/50 focus:border-primary/50 resize-none h-32 transition-all backdrop-blur-sm"
                      placeholder="Digite uma nota importante sobre o cliente..."
                    ></textarea>
                  </div>

                  <div className="mt-4 flex flex-col gap-2 max-h-60 overflow-y-auto custom-scrollbar">
                    {notes.map(note => (
                      <NoteItem key={note.id} note={note} onUpdate={handleUpdateNote} onDelete={handleDeleteNote} />
                    ))}
                    {notes.length === 0 && <p className="text-xs text-center text-text-secondary-light py-2">Nenhuma nota ainda.</p>}
                  </div>
                </div>

                {/* Activity Timeline */}
                <div className="glass-card rounded-xl border border-white/5 p-8 shadow-xl flex-1 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -z-10 pointer-events-none"></div>
                  <h4 className="font-bold text-lg text-white mb-8 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">history</span>
                    Histórico Recente
                  </h4>
                  <div className="relative pl-0 ml-2 border-l border-white/10 space-y-8">
                    {history.length > 0 ? history.map((item, idx) => (
                      <div key={item.id} className="relative group pl-6">
                        {/* Timeline Dot */}
                        <div className={`absolute -left-[5px] top-1.5 size-2.5 rounded-full border-2 transition-all duration-300 ${idx === 0 ? 'bg-primary border-primary shadow-[0_0_10px_rgba(212,175,55,0.8)] scale-125' : 'bg-black border-white/20 group-hover:border-primary group-hover:bg-primary/50'}`}></div>

                        <div className="flex flex-col gap-1.5 relative">
                          <div className="flex justify-between items-start">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${idx === 0 ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-white/5 border-white/10 text-white/50'}`}>
                              {item.action_type.replace('_', ' ')}
                            </span>
                            <span className="text-xs text-white/30 font-mono">{formatDate(item.created_at)}</span>
                          </div>
                          <p className="text-sm text-white/70 leading-relaxed font-light">{item.description}</p>
                        </div>
                      </div>
                    )) : (
                      <p className="text-sm text-white/30 italic pl-6">Nenhuma atividade registrada.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Tasks & Documents */}
              <div className="flex flex-col gap-6">
                {/* Tasks Widget */}
                <div className="glass-card rounded-xl border border-white/5 p-0 shadow-xl overflow-hidden group/tasks">
                  <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                    <h4 className="font-bold text-white flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-green-500/10 text-green-500">
                        <span className="material-symbols-outlined text-[20px]">check_circle</span>
                      </div>
                      Próximas Tarefas
                    </h4>
                    <div className="flex items-center gap-4">
                      <select
                        value={taskFilter}
                        onChange={(e) => setTaskFilter(e.target.value as any)}
                        className="bg-white/5 border border-white/10 text-xs font-bold text-white/70 rounded-lg px-3 py-1.5 focus:border-primary/50 outline-none transition-all cursor-pointer uppercase tracking-wider"
                      >
                        <option value="all" className="bg-gray-900">Todas</option>
                        <option value="pending" className="bg-gray-900">Pendentes</option>
                        <option value="done" className="bg-gray-900">Concluídas</option>
                      </select>
                      <button onClick={() => setIsAddingTask(!isAddingTask)} className="size-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all">
                        <span className="material-symbols-outlined text-sm">{isAddingTask ? 'close' : 'add'}</span>
                      </button>
                    </div>
                  </div>

                  {isAddingTask && (
                    <div className="p-4 bg-white/[0.02] border-b border-white/5 animate-in slide-in-from-top-2">
                      <input
                        type="text"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder="Título da nova tarefa..."
                        className="w-full text-sm p-3 rounded-lg border border-white/10 bg-black/20 text-white placeholder:text-white/20 mb-3 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all"
                      />
                      <div className="flex gap-2 mb-3">
                        <input
                          type="date"
                          value={newTaskDueDate}
                          onChange={(e) => setNewTaskDueDate(e.target.value)}
                          className="flex-1 text-xs p-2.5 rounded-lg border border-white/10 bg-black/20 text-white focus:border-primary/50 outline-none"
                        />
                        <div className="flex-1 overflow-x-auto">
                          <div className="flex gap-2 pb-1">
                            {profiles.map(p => {
                              const isSelected = newTaskAssigneeIds.includes(p.id);
                              return (
                                <div
                                  key={p.id}
                                  onClick={() => {
                                    const newIds = isSelected
                                      ? newTaskAssigneeIds.filter(id => id !== p.id)
                                      : [...newTaskAssigneeIds, p.id];
                                    setNewTaskAssigneeIds(newIds);
                                  }}
                                  title={p.name || ''}
                                  className={`size-8 rounded-full flex items-center justify-center cursor-pointer transition-all border-2 ${isSelected ? 'border-primary ring-2 ring-primary/30' : 'border-transparent opacity-50 hover:opacity-100 hover:border-white/20'}`}
                                >
                                  {p.avatar_url ? (
                                    <img src={p.avatar_url} className="w-full h-full rounded-full object-cover" alt={p.name || ''} />
                                  ) : (
                                    <div className="w-full h-full rounded-full bg-gray-700 flex items-center justify-center text-[10px] text-white font-bold">
                                      {p.name?.charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Prioridade</label>
                          <div className="flex gap-2">
                            {(['baixa', 'média', 'alta'] as const).map((p) => (
                              <button
                                key={p}
                                onClick={() => {
                                  setNewTaskUrgent(p === 'alta');
                                  // We can't set a 'newTaskPriority' state directly yet unless we add it
                                  // but since we are modifying the submit logic, we can just use the UI state
                                }}
                                className={`flex-1 py-1.5 rounded-md text-[10px] font-bold border transition-all uppercase tracking-wider ${(p === 'alta' && newTaskUrgent) || (p === 'média' && !newTaskUrgent) // Simple fallback for now
                                  ? p === 'alta' ? 'bg-red-500/20 border-red-500/50 text-red-400' :
                                    p === 'média' ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' :
                                      'bg-blue-500/20 border-blue-500/50 text-blue-400'
                                  : 'bg-white/5 border-white/10 text-white/30 hover:bg-white/10'
                                  }`}
                              >
                                {p}
                              </button>
                            ))}
                          </div>
                        </div>
                        <button
                          onClick={() => handleSaveTask({
                            title: newTaskTitle,
                            is_urgent: newTaskUrgent,
                            priority: newTaskUrgent ? 'alta' : 'média',
                            due_date: newTaskDueDate ? new Date(newTaskDueDate + 'T12:00:00').toISOString() : null,
                            assignee_ids: newTaskAssigneeIds,
                            assignee_id: newTaskAssigneeIds[0] || null
                          }).then(() => {
                            setNewTaskTitle('');
                            setNewTaskUrgent(false);
                            setNewTaskAssigneeIds([]);
                            setIsAddingTask(false);
                          })}
                          className="text-xs bg-primary text-white px-4 py-2 rounded-lg font-bold hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all"
                        >
                          Adicionar Tarefa
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col max-h-[400px] overflow-y-auto custom-scrollbar p-2">
                    {tasks.filter((t: any) => {
                      if (taskFilter === 'all') return true;
                      if (taskFilter === 'pending') return !t.is_completed;
                      if (taskFilter === 'done') return t.is_completed;
                      return true;
                    }).map((task) => (
                      <div key={task.id} className={`relative flex items-start gap-4 p-4 rounded-lg hover:bg-white/5 transition-all cursor-pointer group/item border border-transparent hover:border-white/5 ${task.is_completed ? 'opacity-40 grayscale' : ''}`}>
                        <div className="relative pt-0.5" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={task.is_completed || false}
                            onChange={() => handleToggleTask(task)}
                            className="peer appearance-none size-5 rounded border border-white/20 bg-black/20 checked:bg-primary checked:border-primary transition-all cursor-pointer"
                          />
                          <span className="material-symbols-outlined text-[16px] text-black absolute top-0.5 left-0.5 pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity">check</span>
                        </div>

                        <div className="flex-1" onClick={() => handleOpenEditTask(task)}>
                          <span className={`text-sm font-medium text-white group-hover/item:text-primary transition-colors block ${task.is_completed ? 'line-through' : ''}`}>{task.title}</span>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${(task as any).priority === 'alta' || task.is_urgent ? 'text-red-400 border-red-500/30 bg-red-500/10' :
                              (task as any).priority === 'média' ? 'text-amber-400 border-amber-500/30 bg-amber-500/10' :
                                (task as any).priority === 'baixa' ? 'text-blue-400 border-blue-500/30 bg-blue-500/10' :
                                  'text-white/40 border-white/10 bg-white/5'
                              }`}>
                              {(task as any).priority ? (task as any).priority.toUpperCase() : formatDateShort(task.due_date)}
                            </span>
                            {(task as any).priority && (
                              <span className="text-[10px] text-white/30 font-medium">{formatDateShort(task.due_date)}</span>
                            )}
                            {task.is_completed && <span className="text-[10px] text-green-400 flex items-center gap-1"><span className="material-symbols-outlined text-[10px]">done_all</span> Concluído</span>}
                          </div>
                          <div className="flex -space-x-1 mt-2">
                            {task.assignee_ids && task.assignee_ids.map((uid: string) => {
                              const user = profiles.find(p => p.id === uid);
                              if (!user) return null;
                              return (
                                <div key={uid} className="size-5 rounded-full border border-black bg-gray-800 flex items-center justify-center text-[8px] overflow-hidden" title={user.name || ''}>
                                  {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" /> : user.name?.charAt(0).toUpperCase()}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 absolute top-4 right-4 opacity-0 group-hover/item:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => handleToggleUrgent(task, e)}
                            title={task.is_urgent ? "Remover Urgência" : "Marcar como Urgente"}
                            className={`size-8 rounded-full flex items-center justify-center transition-all ${task.is_urgent
                              ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30'
                              : 'bg-white/5 text-white/20 hover:text-white/60 hover:bg-white/10'
                              }`}
                          >
                            <span className={`material-symbols-outlined text-[18px] ${task.is_urgent ? 'animate-pulse' : ''}`}>local_fire_department</span>
                          </button>
                          <div onClick={(e) => e.preventDefault()}>
                            <ActionMenu onEdit={() => handleOpenEditTask(task)} onDelete={() => handleDeleteTask(task.id)} />
                          </div>
                        </div>
                      </div>
                    ))}
                    {tasks.length === 0 && <p className="p-8 text-sm text-center text-white/20 italic flex flex-col items-center gap-2">
                      <span className="material-symbols-outlined text-4xl opacity-50">task_alt</span>
                      Nenhuma tarefa pendente.
                    </p>}
                  </div>
                </div>

                {/* Documents Widget */}
                <div className="glass-card rounded-xl border border-white/5 p-6 shadow-xl relative group/docs hover:border-primary/20 transition-colors">
                  <div className="flex justify-between items-center mb-6">
                    <h4 className="font-bold text-white flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-500">
                        <span className="material-symbols-outlined text-[20px]">folder</span>
                      </div>
                      Documentos
                    </h4>
                    <span className="text-[10px] font-bold text-white/40 bg-white/5 px-2 py-1 rounded-md">{documents.length} arqs</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                    {documents.map(doc => (
                      <div key={doc.id} className="p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/5 hover:border-primary/30 transition-all group/item flex items-center gap-4 relative">
                        <div className={`size-12 rounded-lg ${doc.type === 'pdf' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-green-500/10 text-green-500 border border-green-500/20'} flex items-center justify-center shrink-0 shadow-lg`}>
                          <span className="material-symbols-outlined text-2xl drop-shadow-sm">{doc.type === 'pdf' ? 'picture_as_pdf' : 'table_view'}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white truncate group-hover/item:text-primary transition-colors">{doc.name}</p>
                          <p className="text-xs text-white/30 mt-0.5 font-medium">{formatDateShort(doc.created_at)} • {doc.size}</p>
                        </div>
                        <a href={doc.url || '#'} target="_blank" rel="noopener noreferrer" className="size-8 rounded-full bg-white/5 hover:bg-primary hover:text-white flex items-center justify-center text-white/50 opacity-0 group-hover/item:opacity-100 transition-all mr-2">
                          <span className="material-symbols-outlined text-[18px]">download</span>
                        </a>
                        <div className="opacity-0 group-hover/item:opacity-100 transition-opacity">
                          <ActionMenu onDelete={() => handleDeleteDocument(doc)} />
                        </div>
                      </div>
                    ))}

                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      className="hidden"
                    />

                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed border-white/10 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary/50 hover:bg-primary/[0.02] transition-all group/upload ${isUploading ? 'opacity-50 cursor-wait' : ''}`}
                    >
                      <div className="size-12 rounded-full bg-white/5 group-hover/upload:bg-primary/10 flex items-center justify-center mb-3 transition-colors">
                        {isUploading ? (
                          <span className="material-symbols-outlined animate-spin text-primary">refresh</span>
                        ) : (
                          <span className="material-symbols-outlined text-white/30 group-hover/upload:text-primary text-2xl transition-colors">cloud_upload</span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-white/50 group-hover/upload:text-white transition-colors uppercase tracking-wider">
                        {isUploading ? 'Enviando...' : 'Clique para enviar arquivos'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>


          </main>
        </div>
      </div>



    </Layout>
  );
}