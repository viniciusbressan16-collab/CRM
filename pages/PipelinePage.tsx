import React, { useEffect, useState, useMemo } from 'react';
import Header from '../components/Header';
import Layout from '../components/Layout';
import KanbanCard from '../components/KanbanCard';
import NewDealModal from '../components/NewDealModal';
import ImportDealsModal from '../components/ImportDealsModal';
import EmptyState from '../components/ui/EmptyState';
import PipelineListView from '../components/PipelineListView';
import { View } from '../App';
import { supabase } from '../lib/supabaseClient';
import { Database } from '../types/supabase';
import { useAuth } from '../context/AuthContext';
import { hasPermission, PERMISSIONS } from '../utils/roles';
import {
  DndContext,
  closestCorners,
  rectIntersection,
  pointerWithin,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects,
  DropAnimation,
  MeasuringStrategy,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  arrayMove,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type Deal = Database['public']['Tables']['deals']['Row'];
type PipelineElement = Database['public']['Tables']['pipelines']['Row'];
type DealWithAssignee = Deal & {
  assignee: {
    name: string;
    avatar_url: string | null;
  } | null;
};

interface PipelinePageProps {
  onNavigate: (view: View, dealId?: string) => void;
  activePage: View;
}

interface PipelineStats {
  pipelineValue: number;
  activeProposals: number;
  recoveredCredits: number;
}

// --- Helper Components ---

const SortableDealCard = React.memo(({ deal, getTagColor, onEdit, onDelete, onNavigate, onCompleteTask, showDetails }: { deal: DealWithAssignee, getTagColor: (t: string) => string, onEdit: () => void, onDelete: () => void, onNavigate: (view: View, id?: string) => void, onCompleteTask: (id: string) => void, showDetails: boolean }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: deal.id, data: { ...deal } });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="touch-none">
      <KanbanCard
        tag={deal.tag || 'Novo'}
        tagColor={getTagColor(deal.tag || '')}
        title={deal.client_name || deal.title}
        value={(deal as any).nextTask || new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(deal.value || 0)}
        avatar={(deal as any).assignee?.avatar_url}
        assigneeName={(deal as any).assignee?.name}
        time="Hoje"
        progress={deal.progress}
        status={deal.status === 'active' ? undefined : deal.status}
        onEdit={onEdit}
        onDelete={onDelete}
        onClick={() => onNavigate('client', deal.id)}
        showDetails={showDetails}
        cnpj={deal.cnpj}
        contactName={deal.contact_name}
        email={deal.email}
        phone={deal.phone}
        phoneSecondary={(deal as any).phone_secondary}
      />
    </div>
  );
}, (prev, next) => {
  return prev.deal.id === next.deal.id &&
    prev.deal.pipeline_id === next.deal.pipeline_id &&
    prev.deal.progress === next.deal.progress &&
    (prev.deal as any).nextTask === (next.deal as any).nextTask &&
    prev.deal.value === next.deal.value &&
    prev.deal.updated_at === next.deal.updated_at &&
    prev.showDetails === next.showDetails;
});

function PipelineColumn({ column, deals, calculateTotal, getTagColor, handleOpenModal, handleDeleteDeal, onEditColumn, onDeleteColumn, onNavigate, canManageColumns, onCompleteTask, showDetails }: any) {
  // Sortable hook for the COLUMN itself
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: column.id,
    data: {
      type: 'COLUMN',
      column
    }
  });

  // Droppable hook for the internal deal list (so we can drop deals into empty columns)
  const { setNodeRef: setDroppableRef } = useDroppable({
    id: column.id,
    data: {
      type: 'COLUMN_DROPPABLE',
      column
    }
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="snap-start flex-shrink-0 pb-4 flex-1 flex flex-col w-80 min-w-[320px] h-[600px] lg:h-full relative group bg-gray-50/50 dark:bg-black/20 rounded-xl border border-transparent hover:border-gray-200 dark:hover:border-white/5 transition-colors"
    >
      {/* Column Header - Minimalist & Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="flex items-center justify-between mb-2 px-1 py-3 cursor-grab active:cursor-grabbing group/header"
      >
        <div className="flex items-center gap-3">
          <div className={`w-1.5 h-1.5 rounded-full bg-primary/40 group-hover/header:bg-primary transition-colors`}></div>
          <h3 className="font-outfit font-bold text-gray-600 dark:text-gray-300 uppercase tracking-widest text-xs select-none group-hover/header:text-primary transition-colors">{column.name}</h3>
          <span className="text-[10px] font-medium text-gray-400 bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded">{deals.length}</span>
        </div>

        <div className="flex items-center gap-2" onPointerDown={(e) => e.stopPropagation()}>
          {canManageColumns && (
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded text-gray-400 hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
              >
                <span className="material-symbols-outlined text-[16px]">more_horiz</span>
              </button>
              {/* Menu content ... */}
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)}></div>
                  <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 py-1">
                    <button onClick={() => { setShowMenu(false); onEditColumn(column); }} className="w-full text-left px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[14px]">edit</span> Editar
                    </button>
                    <button onClick={() => { setShowMenu(false); onDeleteColumn(column.id); }} className="w-full text-left px-4 py-2 text-xs font-medium text-red-600 hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[14px]">delete</span> Excluir
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div ref={setDroppableRef} className="flex-1 overflow-y-auto px-2 custom-scrollbar pb-2 flex flex-col">
        {/* Stats Card - Compact & Elegant */}
        <div className="glass-panel mb-3 shrink-0 p-3 rounded-lg border border-primary/10 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">Total</span>
          <span className="text-sm font-bold text-primary">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calculateTotal(column.id))}</span>
        </div>

        <SortableContext
          items={deals.map((d: any) => d.id)}
          strategy={verticalListSortingStrategy}
          id={column.id}
        >
          <div className="min-h-[10px] pb-4 flex flex-col gap-3">
            {deals.length === 0 ? (
              <EmptyState
                title="Sem oportunidades"
                description="Arraste cards para cá ou crie um novo."
                icon="drag_indicator"
                className="py-8 opacity-60 hover:opacity-100 transition-opacity duration-300 scale-90"
              />
            ) : (
              deals.map((deal: any) => (
                <SortableDealCard
                  key={deal.id}
                  deal={deal}
                  getTagColor={getTagColor}
                  onEdit={() => handleOpenModal(deal)}
                  onDelete={() => handleDeleteDeal(deal.id)}
                  onNavigate={onNavigate}
                  onCompleteTask={onCompleteTask}
                  showDetails={showDetails}
                />
              ))
            )}
            <button
              onClick={() => handleOpenModal(undefined, column.id)}
              className="w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-400 hover:text-primary hover:border-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2 mt-2 shrink-0 z-10 relative"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              <span className="font-bold text-sm">Nova Oportunidade</span>
            </button>
          </div>
        </SortableContext>
      </div>
    </div>
  );
}

// --- Main Page Component ---

// ... imports
import FilterModal, { FilterState } from '../components/FilterModal';

// ... PipelineStats interface ....

// ... inside PipelinePage Component ...
export default function PipelinePage({ onNavigate, activePage }: PipelinePageProps) {
  const { profile } = useAuth();
  const canManageColumns = hasPermission(profile?.role, PERMISSIONS.MANAGE_CRM_COLUMNS);
  // ... existing states ...
  const [columns, setColumns] = useState<PipelineElement[]>([]);
  const [deals, setDeals] = useState<DealWithAssignee[]>([]);
  // const [stats, setStats] = useState<PipelineStats>({ ... }); // Removed specific state for dynamic calculation
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [showDetails, setShowDetails] = useState(false);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Partial<Deal> | undefined>(undefined);

  // Column Management States
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<PipelineElement | null>(null);
  const [columnNameInput, setColumnNameInput] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // DnD State
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<'COLUMN' | 'DEAL' | null>(null);
  const activeDeal = useMemo(() => deals.find(d => d.id === activeId), [activeId, deals]);
  const activeColumn = useMemo(() => columns.find(c => c.id === activeId), [activeId, columns]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Filter & Search State
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Default filter state
  const defaultFilters: FilterState = {
    tags: [],
    assigneeIds: [],
    status: ['active'],
    minValue: '',
    maxValue: '',
    startDate: '',
    endDate: ''
  };

  // Initialize filters from localStorage or default
  const [filters, setFilters] = useState<FilterState>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pipeline_filters');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Migrate old assigneeId to assigneeIds array if needed
          if (parsed.assigneeId && !parsed.assigneeIds) {
            parsed.assigneeIds = [parsed.assigneeId];
            delete parsed.assigneeId;
          }
          // Ensure all required fields exist
          return { ...defaultFilters, ...parsed };
        } catch (e) {
          console.error('Error parsing saved filters:', e);
        }
      }
    }
    return defaultFilters;
  });

  // Persist filters to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('pipeline_filters', JSON.stringify(filters));
  }, [filters]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.tags.length > 0) count++;
    if (filters.assigneeIds.length > 0) count++;
    if (filters.status.length > 0 && (filters.status.length !== 1 || filters.status[0] !== 'active')) count++; // Only count if not default
    if (filters.minValue) count++;
    if (filters.maxValue) count++;
    if (filters.startDate) count++;
    if (filters.endDate) count++;
    return count;
  }, [filters]);

  useEffect(() => {
    fetchPipelineData();
  }, []);

  const fetchPipelineData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);

      // Parallelize independent fetches
      const [pipelinesResult, dealsResult] = await Promise.all([
        supabase.from('pipelines').select('*').order('order_index'),
        supabase.from('deals').select(`*, assignee:profiles(name, avatar_url)`),
      ]);

      if (pipelinesResult.error) throw pipelinesResult.error;
      if (dealsResult.error) throw dealsResult.error;

      const pipelinesData = pipelinesResult.data;
      const dealsData = dealsResult.data;

      const allDeals = (dealsData as any[]) || [];
      const activeDeals = allDeals.filter(d => d.status === 'active');

      const columnsList = pipelinesData || [];
      const totalColumns = columnsList.length;

      // Fetch tasks separately to ensure stability
      let dealTasks: any[] = [];
      const dealIds = allDeals.map(d => d.id);

      if (dealIds.length > 0) {
        const { data: tasksData, error: tasksError } = await supabase
          .from('deal_tasks')
          .select('id, deal_id, title, is_completed, due_date')
          .in('deal_id', dealIds)
          .eq('is_completed', false);

        if (!tasksError) {
          dealTasks = tasksData || [];
        } else {
          console.error('Error fetching deal tasks:', tasksError);
        }
      }

      // Calculate progress and attach next task
      const dealsWithProgress = allDeals.map(deal => {
        const columnIndex = columnsList.findIndex(c => c.id === deal.pipeline_id);
        const progress = totalColumns > 0 && columnIndex >= 0
          ? Math.round(((columnIndex + 1) / totalColumns) * 100)
          : 0;

        // Find next task from separate fetched list
        const tasks = dealTasks.filter(t => t.deal_id === deal.id);

        // Sort by due date (ascending)
        tasks.sort((a: any, b: any) => {
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        });

        const nextTask = tasks.length > 0
          ? {
            id: tasks[0].id,
            title: tasks[0].title,
            onComplete: (taskId: string) => handleCompleteTask(taskId)
          }
          : 'Sem tarefas pendentes';

        return { ...deal, progress, nextTask };
      });

      setColumns(columnsList);
      setDeals(dealsWithProgress);

      const pipelineValue = activeDeals.reduce((acc, deal) => acc + (deal.value || 0), 0);
      const recoveredCredits = allDeals
        .filter(d => d.status === 'won')
        .reduce((acc, deal) => acc + (deal.recovered_value || 0), 0);

      // Stats are now calculated dynamically
      // setStats({ ... });

    } catch (error) {
      console.error('Error fetching pipeline data:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // --- Filtering Logic ---
  const filteredDeals = useMemo(() => {
    return deals.filter(deal => {
      // Search Term Filter
      if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();
        const matchesMain =
          deal.client_name?.toLowerCase().includes(searchLower) ||
          deal.contact_name?.toLowerCase().includes(searchLower) ||
          deal.cnpj?.toLowerCase().includes(searchLower) ||
          deal.email?.toLowerCase().includes(searchLower) ||
          deal.title?.toLowerCase().includes(searchLower);

        // Search in custom fields
        let matchesCustom = false;
        if (deal.custom_fields && typeof deal.custom_fields === 'object' && !Array.isArray(deal.custom_fields)) {
          matchesCustom = Object.values(deal.custom_fields).some(val =>
            String(val).toLowerCase().includes(searchLower)
          );
        }

        if (!matchesMain && !matchesCustom) return false;
      }

      // Status Filter (Default 'active')
      if (filters.status.length > 0 && !filters.status.includes(deal.status)) return false;

      // Tag Filter
      if (filters.tags.length > 0 && (!deal.tag || !filters.tags.includes(deal.tag))) return false;

      // Assignee Filter
      if (filters.assigneeIds.length > 0 && (!deal.assignee_id || !filters.assigneeIds.includes(deal.assignee_id))) return false;

      // Value Range Filter
      if (filters.minValue && (deal.value || 0) < parseFloat(filters.minValue)) return false;
      if (filters.maxValue && (deal.value || 0) > parseFloat(filters.maxValue)) return false;

      // Date Range Filter
      if (filters.startDate) {
        const dealDate = new Date(deal.created_at || '').setHours(0, 0, 0, 0);
        const filterStart = new Date(filters.startDate).setHours(0, 0, 0, 0);
        if (dealDate < filterStart) return false;
      }
      if (filters.endDate) {
        const dealDate = new Date(deal.created_at || '').setHours(0, 0, 0, 0);
        const filterEnd = new Date(filters.endDate).setHours(0, 0, 0, 0);
        if (dealDate > filterEnd) return false;
      }

      return true;
    });
  }, [deals, filters, searchTerm]);

  // Extract all unique custom field keys globally
  const globalCustomKeys = useMemo(() => {
    const keys = new Set<string>();
    deals.forEach(deal => {
      if (deal.custom_fields && typeof deal.custom_fields === 'object' && !Array.isArray(deal.custom_fields)) {
        Object.keys(deal.custom_fields).forEach(k => keys.add(k));
      }
    });
    return Array.from(keys);
  }, [deals]);

  const getColumnDeals = (pipelineId: string) => {
    return filteredDeals.filter(deal => deal.pipeline_id === pipelineId);
  };

  // ... other handlers ...
  // Update calculateColumnTotal to use filteredDeals if you want the totals to reflect filters.
  // Generally, Kanban totals usually reflect visible items. 

  const calculateColumnTotal = (pipelineId: string) => {
    const columnDeals = getColumnDeals(pipelineId);
    return columnDeals.reduce((sum, deal) => sum + (deal.value || 0), 0);
  };

  // --- Column Actions ---
  const handleAddColumn = () => {
    setEditingColumn(null);
    setColumnNameInput('');
    setIsColumnModalOpen(true);
  };

  const handleEditColumn = (column: PipelineElement) => {
    setEditingColumn(column);
    setColumnNameInput(column.name);
    setIsColumnModalOpen(true);
  };

  const handleDeleteColumn = async (columnId: string) => {
    const columnDeals = getColumnDeals(columnId);
    if (columnDeals.length > 0) {
      alert('Não é possível excluir uma coluna com leads. Mova ou exclua os leads primeiro.');
      return;
    }
    if (!confirm('Tem certeza que deseja excluir esta coluna?')) return;

    try {
      const { error } = await supabase.from('pipelines').delete().eq('id', columnId);
      if (error) throw error;
      setColumns(prev => prev.filter(c => c.id !== columnId));
    } catch (error) {
      console.error('Error deleting column:', error);
      alert('Erro ao excluir coluna.');
    }
  };

  const handleSaveColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!columnNameInput.trim()) return;

    try {
      if (editingColumn) {
        // Edit
        const { error } = await supabase
          .from('pipelines')
          .update({ name: columnNameInput })
          .eq('id', editingColumn.id);
        if (error) throw error;
        setColumns(prev => prev.map(c => c.id === editingColumn.id ? { ...c, name: columnNameInput } : c));
      } else {
        // Add
        const newOrderIndex = columns.length > 0 ? Math.max(...columns.map(c => c.order_index)) + 1 : 0;
        const { data, error } = await supabase
          .from('pipelines')
          .insert({ name: columnNameInput, order_index: newOrderIndex })
          .select()
          .single();
        if (error) throw error;
        if (data) setColumns(prev => [...prev, data]);
      }
      setIsColumnModalOpen(false);
    } catch (error) {
      console.error('Error saving column:', error);
      alert('Erro ao salvar coluna.');
    }
  };


  // --- Deal Actions ---
  const handleOpenModal = (deal?: Deal, pipelineId?: string) => {
    setSelectedDeal(deal || (pipelineId ? { pipeline_id: pipelineId } : undefined));
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedDeal(undefined);
  };

  const handleSaveDeal = async (dealData: Partial<Deal>) => {
    try {
      let savedDeal: DealWithAssignee | null = null;
      let dealToSave = { ...dealData };
      if (!dealToSave.pipeline_id && !dealToSave.id) {
        dealToSave.pipeline_id = columns[0]?.id;
      }

      if (dealData.id) {
        // Update
        const { data, error } = await supabase
          .from('deals')
          .update(dealToSave)
          .eq('id', dealData.id)
          .select(`*, assignee:profiles(name, avatar_url)`)
          .single();

        if (error) throw error;
        savedDeal = data as any;
        setDeals(prev => prev.map(d => d.id === savedDeal!.id ? savedDeal! : d));
      } else {
        // Create
        const { data, error } = await supabase
          .from('deals')
          .insert(dealToSave as any)
          .select(`*, assignee:profiles(name, avatar_url)`)
          .single();

        if (error) throw error;
        savedDeal = data as any;
        setDeals(prev => [...prev, savedDeal!]);
      }
      fetchPipelineData(true); // silent refetch
    } catch (error) {
      console.error('Error saving deal:', error);
      alert('Erro ao salvar.');
    }
  };

  const handleDeleteDeal = async (dealId: string) => {
    const originalDeals = [...deals];
    setDeals(prev => prev.filter(d => d.id !== dealId));

    try {
      const { error } = await supabase
        .from('deals')
        .delete()
        .eq('id', dealId);

      if (error) throw error;
      fetchPipelineData(true);
    } catch (error) {
      console.error('Error deleting deal:', error);
      alert('Erro ao excluir.');
      setDeals(originalDeals);
    }
  };

  // DnD Handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    if (event.active.data.current?.type === 'COLUMN') {
      setActiveType('COLUMN');
    } else {
      setActiveType('DEAL');
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    // If dragging a column
    if (activeType === 'COLUMN') return; // Handled in DragEnd

    // Find the deals
    const activeDeal = deals.find(d => d.id === activeId);
    if (!activeDeal) return; // Should not happen if type check works

    // We only care if we are dragging a deal
    if (activeType !== 'DEAL') return;

    const activeColumnId = activeDeal.pipeline_id;

    // Determine overColumnId
    let overColumnId: string | null = null;

    // If over a column (the droppable/sortable container)
    // Note: We changed keys in PipelineColumn. The container might use the column ID.
    // Check if over.id is a column ID
    const isOverColumn = columns.some(c => c.id === overId);

    if (isOverColumn) {
      overColumnId = overId as string;
    } else {
      // If over another deal
      const overDeal = deals.find(d => d.id === overId);
      if (overDeal) {
        overColumnId = overDeal.pipeline_id;
      }
    }

    if (!overColumnId) return;

    if (activeColumnId !== overColumnId) {
      setDeals((items) => {
        return items.map(item => {
          if (item.id === activeId) {
            return { ...item, pipeline_id: overColumnId! };
          }
          return item;
        });
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const activeId = active.id;
    const overId = over?.id;

    if (!activeId || !overId) {
      setActiveId(null);
      setActiveType(null);
      return;
    }

    // --- Handling Column Reorder ---
    if (activeType === 'COLUMN') {
      if (activeId !== overId) {
        const oldIndex = columns.findIndex(c => c.id === activeId);
        const newIndex = columns.findIndex(c => c.id === overId);

        if (oldIndex !== -1 && newIndex !== -1) {
          const newColumns = arrayMove(columns, oldIndex, newIndex);
          setColumns(newColumns);

          // Persist the new order (Optimistic - Fire & Forget)
          const updates = newColumns.map((col, index) => ({
            id: col.id,
            name: col.name,
            order_index: index
          }));

          supabase
            .from('pipelines')
            .upsert(updates, { onConflict: 'id' })
            .then(({ error }) => {
              if (error) {
                console.error("Failed to save column order", error);
                fetchPipelineData(true); // Revert on error
              }
            });
        }
      }
      setActiveId(null);
      setActiveType(null);
      return;
    }

    // --- Handling Deal Reorder ---
    const currentDeal = deals.find(d => d.id === activeId);

    if (currentDeal) {
      // Calculate new progress locally
      const columnIndex = columns.findIndex(c => c.id === currentDeal.pipeline_id);
      const totalColumns = columns.length;
      const newProgress = totalColumns > 0 && columnIndex >= 0
        ? Math.round(((columnIndex + 1) / totalColumns) * 100)
        : 0;

      // Update local state if progress changed (pipeline_id already updated by DragOver)
      if (currentDeal.progress !== newProgress) {
        setDeals(prev => prev.map(d => d.id === activeId ? { ...d, progress: newProgress } : d));
      }

      // Save to server (Optimistic - Fire & Forget)
      supabase
        .from('deals')
        .update({ pipeline_id: currentDeal.pipeline_id })
        .eq('id', currentDeal.id)
        .then(({ error }) => {
          if (error) {
            console.error('Error saving drag:', error);
            fetchPipelineData(true); // Revert on error
          }
        });
    }

    setActiveId(null);
    setActiveType(null);
  };

  const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '0.4',
        },
      },
    }),
    duration: 200,
    easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
  };

  const getTagColor = (tag: string) => {
    const map: Record<string, string> = {
      'ICMS': 'blue',
      'PIS/COFINS': 'purple',
      'Urgente': 'red',
      'Consultoria': 'gray',
      'Simples Nac.': 'green',
      'Planejamento': 'orange'
    };
    return map[tag] || 'blue';
  };

  const formatBRL = (val: number) => {
    if (val >= 1000000) return `R$ ${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `R$ ${(val / 1000).toFixed(0)}k`;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const handleBatchUpdate = async (dealIds: string[], updates: Partial<Deal>) => {
    try {
      const { error } = await supabase
        .from('deals')
        .update(updates)
        .in('id', dealIds);

      if (error) throw error;

      fetchPipelineData(true);
    } catch (error) {
      console.error('Error batch updating deals:', error);
      alert('Erro ao atualizar oportunidades em massa.');
    }
  };

  const handleImportDeals = async (importedData: any[]) => {
    try {
      if (columns.length === 0) {
        alert('Crie ao menos uma fase no pipeline antes de importar.');
        return;
      }

      const firstColumnId = columns[0].id;

      const dealsToInsert = importedData.map(row => ({
        client_name: row.client_name,
        contact_name: row.contact_name || null,
        title: row.client_name ? `${row.client_name}` : 'Nova Oportunidade',
        value: Number(row.value) || 0,
        phone: row.phone || null,
        phone_secondary: row.phone_secondary || null,
        email: row.email || null,
        cnpj: row.cnpj || null,
        tag: row.tag || 'Novo',
        assignee_id: row.assignee_id || null,
        pipeline_id: firstColumnId,
        status: 'active',
        avatar_color: ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500'][Math.floor(Math.random() * 4)]
      }));

      const { error } = await supabase.from('deals').insert(dealsToInsert);

      if (error) throw error;

      fetchPipelineData();
      alert(`${dealsToInsert.length} oportunidades importadas com sucesso!`);

    } catch (error) {
      console.error('Error importing deals:', error);
      alert('Erro ao processar importação.');
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('deal_tasks')
        .update({ is_completed: true })
        .eq('id', taskId);

      if (error) throw error;

      // Optimistic update or refetch
      // For simplicity and correctness, we refetch to update the "Next Task" logic
      fetchPipelineData(true);
    } catch (error) {
      console.error('Error completing task:', error);
      alert('Erro ao concluir tarefa.');
    }
  };


  return (
    <Layout onNavigate={onNavigate} activePage={activePage}>
      <div className="flex flex-col min-h-screen lg:h-full bg-transparent">
        <Header
          title="Pipeline de Vendas"
          description="Gerencie suas oportunidades e acompanhe o progresso."
          onNavigate={onNavigate}
        >
          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative w-64 hidden md:block">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>
              <input
                type="text"
                placeholder="Buscar lead ou informação..."
                className="w-full h-10 !pl-12 pr-4 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-slate-700 dark:text-white transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              )}
            </div>

            {/* Filter Button */}
            <button
              className={`bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-700 text-text-main-light dark:text-text-main-dark hover:bg-gray-50 dark:hover:bg-white/5 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${activeFiltersCount > 0 ? 'ring-2 ring-primary/50' : ''}`}
              onClick={() => setIsFilterModalOpen(true)}
            >
              <div className="relative">
                <span className="material-symbols-outlined text-[20px]">filter_list</span>
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-primary text-white text-[10px] font-bold size-4 rounded-full flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </div>
              <span className="hidden sm:inline">Filtros</span>
            </button>

            {/* Import Button */}
            <button
              className="bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-700 text-text-main-light dark:text-text-main-dark hover:bg-gray-50 dark:hover:bg-white/5 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all"
              onClick={() => setIsImportModalOpen(true)}
            >
              <span className="material-symbols-outlined text-[20px]">upload_file</span>
              <span className="hidden sm:inline">Importar</span>
            </button>

            {/* Toggle Details */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className={`p-2 rounded-lg transition-all border border-gray-200 dark:border-gray-700 ${showDetails ? 'bg-primary/10 text-primary border-primary/30' : 'bg-surface-light dark:bg-surface-dark text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
              title={showDetails ? "Ocultar Detalhes" : "Mostrar Detalhes"}
            >
              <span className="material-symbols-outlined text-[20px]">list_alt</span>
            </button>

            {/* View Mode Toggle */}
            <div className="bg-gray-100 dark:bg-surface-dark rounded-lg p-1 flex items-center mr-2 border border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setViewMode('kanban')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'kanban' ? 'bg-white dark:bg-white/10 shadow-sm text-primary' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                title="Visualização Kanban"
              >
                <span className="material-symbols-outlined text-[20px]">view_kanban</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-white/10 shadow-sm text-primary' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                title="Visualização em Lista"
              >
                <span className="material-symbols-outlined text-[20px]">table_rows</span>
              </button>
            </div>

            {/* Add Column Button */}
            {canManageColumns && (
              <button
                className="bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-700 text-text-main-light dark:text-text-main-dark hover:bg-gray-50 dark:hover:bg-white/5 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
                onClick={handleAddColumn}
              >
                <span className="material-symbols-outlined text-[20px]">view_column</span>
                <span className="hidden sm:inline">Nova Coluna</span>
              </button>
            )}

            {/* Add Deal Button */}
            <button
              className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-primary/20 transition-all hover:scale-105 hover:shadow-primary/40 active:scale-95"
              onClick={() => handleOpenModal()}
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              <span className="hidden sm:inline">Nova Oportunidade</span>
            </button>
          </div>
        </Header>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-6 py-6 shrink-0">
          {[
            {
              label: 'Valor em Pipeline',
              value: formatBRL(filteredDeals.reduce((acc, deal) => acc + (deal.value || 0), 0)),
              trend: 'somatório visível',
              icon: 'savings',
              color: 'blue'
            },
            {
              label: 'Propostas Ativas',
              value: `${filteredDeals.length}`,
              trend: 'vivas na tela',
              icon: 'description',
              color: 'purple'
            },
            {
              label: 'Créditos Recuperados',
              value: formatBRL(filteredDeals.reduce((acc, deal) => acc + (deal.recovered_value || 0), 0)),
              trend: 'somatório visível',
              icon: 'check_circle',
              color: 'green'
            },
          ].map((stat, i) => (
            <div key={i} className="glass-card p-4 rounded-xl flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</h3>
                <p className={`text-xs font-medium flex items-center mt-1 text-gray-500 dark:text-gray-400`}>
                  <span className="material-symbols-outlined text-[14px] mr-1">trending_up</span>
                  {stat.trend}
                </p>
              </div>
              <div className={`p-2 rounded-lg text-${stat.color}-600 bg-${stat.color}-50 dark:bg-${stat.color}-900/20`}>
                <span className="material-symbols-outlined">{stat.icon}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Kanban Board Container with Snap Scroll */}
        <div className="flex-1 overflow-x-auto overflow-y-auto lg:overflow-y-hidden px-4 md:px-6 pb-6 custom-scrollbar">
          {loading ? (
            <div className="flex h-full items-center justify-center text-gray-500">Carregando pipeline...</div>
          ) : viewMode === 'list' ? (
            <PipelineListView
              deals={filteredDeals}
              columns={columns}
              onNavigate={onNavigate}
              onEdit={(deal) => handleOpenModal(deal)}
              onBatchUpdate={handleBatchUpdate}
              getTagColor={getTagColor}
            />
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={pointerWithin}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              measuring={{
                droppable: {
                  strategy: MeasuringStrategy.Always,
                },
              }}
            >
              <div className="flex h-full gap-6 min-w-max">
                <SortableContext
                  items={columns.map(c => c.id)}
                  strategy={horizontalListSortingStrategy}
                >
                  {columns.map((column) => (
                    <PipelineColumn
                      key={column.id}
                      column={column}
                      deals={getColumnDeals(column.id)}
                      calculateTotal={calculateColumnTotal}
                      getTagColor={getTagColor}
                      handleOpenModal={handleOpenModal}
                      handleDeleteDeal={handleDeleteDeal}
                      onEditColumn={handleEditColumn}
                      onDeleteColumn={handleDeleteColumn}
                      onNavigate={onNavigate}
                      canManageColumns={canManageColumns}
                      onCompleteTask={handleCompleteTask}
                      showDetails={showDetails}
                    />
                  ))}
                </SortableContext>

                {/* Add Column Button (Inline) - Snap aligned too */}
                {canManageColumns && (
                  <div className="w-80 h-full flex items-start justify-center pt-10 opacity-50 hover:opacity-100 transition-opacity snap-start flex-shrink-0">
                    <button onClick={handleAddColumn} className="flex items-center gap-2 text-gray-500 hover:text-primary">
                      <span className="material-symbols-outlined text-[24px]">add_circle</span>
                      <span className="font-medium">Adicionar Fase</span>
                    </button>
                  </div>
                )}

              </div>
              <DragOverlay dropAnimation={dropAnimation}>
                {activeType === 'COLUMN' && activeColumn ? (
                  <div className="w-80 h-[600px] bg-gray-100 dark:bg-surface-dark rounded-xl border border-primary/50 opacity-90 shadow-2xl flex flex-col p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-gray-900 dark:text-white uppercase tracking-wider text-sm">{activeColumn.name}</h3>
                    </div>
                    <div className="text-sm text-gray-500">Movendo coluna...</div>
                  </div>
                ) : activeDeal ? (
                  <div className="w-80">
                    <KanbanCard
                      tag={activeDeal.tag || 'Novo'}
                      tagColor={getTagColor(activeDeal.tag || '')}
                      title={activeDeal.client_name || activeDeal.title}
                      value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(activeDeal.value || 0)}
                      avatar={(activeDeal as any).assignee?.avatar_url}
                      assigneeName={(activeDeal as any).assignee?.name}
                      time="Hoje"
                      progress={activeDeal.progress}
                      status={activeDeal.status === 'active' ? undefined : activeDeal.status}
                      onEdit={() => { }}
                      onDelete={() => { }}
                      onClick={() => { }}
                      phoneSecondary={(activeDeal as any).phone_secondary}
                    />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>


        <NewDealModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSaveDeal}
          initialData={selectedDeal}
          knownCustomKeys={globalCustomKeys}
        />

        <FilterModal
          isOpen={isFilterModalOpen}
          onClose={() => setIsFilterModalOpen(false)}
          currentFilters={filters}
          onApplyFilters={setFilters}
          onClearFilters={() => setFilters({
            tags: [],
            assigneeIds: [],
            status: ['active'],
            minValue: '',
            maxValue: '',
            startDate: '',
            endDate: ''
          })}
        />

        <ImportDealsModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onImport={handleImportDeals}
        />

        {/* Column Modal */}
        {
          isColumnModalOpen && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
              <div className="bg-white dark:bg-surface-dark p-6 rounded-lg w-full max-w-sm shadow-xl">
                <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
                  {editingColumn ? 'Editar Coluna' : 'Nova Coluna'}
                </h3>
                <form onSubmit={handleSaveColumn}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome da Fase</label>
                    <input
                      type="text"
                      value={columnNameInput}
                      onChange={(e) => setColumnNameInput(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-white placeholder:text-gray-500"
                      placeholder="Ex: Negociação"
                      autoFocus
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsColumnModalOpen(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-md"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-bold text-white bg-primary hover:bg-primary/90 rounded-md"
                    >
                      Salvar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )
        }

      </div >
    </Layout >
  );
}