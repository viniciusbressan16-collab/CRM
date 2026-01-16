import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { ROLE_LABELS, ROLES, UserRole, PERMISSIONS } from '../utils/roles';
import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { View } from '../App';

interface SettingsPageProps {
   onNavigate: (view: View, id?: string) => void;
   activePage: View;
}

// ... inside component ...
export default function SettingsPage({ onNavigate, activePage }: SettingsPageProps) {
   const { user: currentUser, profile: currentProfile } = useAuth();
   const [users, setUsers] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      fetchUsers();
   }, []);

   const fetchUsers = async () => {
      try {
         const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('name');
         if (error) throw error;
         setUsers(data || []);
      } catch (error) {
         console.error('Error fetching users:', error);
      } finally {
         setLoading(false);
      }
   };

   const handleDeleteUser = async (userId: string, userName: string) => {
      if (userId === currentUser?.id) {
         alert('Você não pode remover seu próprio usuário.');
         return;
      }

      if (!confirm(`Tem certeza que deseja remover o usuário "${userName}"? Esta ação não pode ser desfeita.`)) {
         return;
      }

      try {
         const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', userId);

         if (error) throw error;

         setUsers(users.filter(u => u.id !== userId));
         alert('Usuário removido com sucesso!');
      } catch (error) {
         console.error('Error deleting user:', error);
         alert('Erro ao remover usuário.');
      }
   };

   const handleUpdateRole = async (userId: string, newRole: string) => {
      try {
         const { error } = await supabase
            .from('profiles')
            .update({ role: newRole })
            .eq('id', userId);

         if (error) throw error;

         // Optimistic update
         setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
         alert('Função do usuário atualizada com sucesso!');
      } catch (error) {
         console.error('Error updating role:', error);
         alert('Erro ao atualizar função.');
      }
   };

   return (

      <Layout onNavigate={onNavigate} activePage={activePage}>
         <Header
            title="Configurações"
            description="Gerencie sua conta, equipe e preferências do sistema."
            onNavigate={onNavigate}
         />

         <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 lg:p-8 scroll-smooth custom-scrollbar">
            <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-700">

               {/* User Management Section */}
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 border-b border-white/5 pb-8">
                  <div className="lg:col-span-1">
                     <h3 className="text-lg font-bold text-white tracking-tight">Gerenciamento de Usuários</h3>
                     <p className="text-sm text-white/50 mt-1">Controle quem tem acesso ao CRM e seus níveis de permissão.</p>
                     <div className="mt-4 p-4 glass-panel rounded-lg border border-primary/20 bg-primary/5 shadow-[0_0_15px_rgba(212,175,55,0.1)]">
                        <p className="text-xs text-white/80 space-y-1">
                           <span className="block"><span className="font-bold text-primary uppercase tracking-wider text-[10px]">Seu perfil:</span> {currentProfile?.name}</span>
                           <span className="block"><span className="font-bold text-primary uppercase tracking-wider text-[10px]">Função atual:</span> {ROLE_LABELS[currentProfile?.role as UserRole] || currentProfile?.role || 'Sem função'}</span>
                        </p>
                     </div>
                  </div>

               </div>
               <div className="lg:col-span-2 glass-card rounded-xl border border-white/5 overflow-hidden shadow-2xl relative">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>
                  <div className="overflow-x-auto">
                     <table className="w-full text-left border-collapse">
                        <thead>
                           <tr className="bg-white/5 border-b border-white/5">
                              <th className="px-6 py-4 text-xs font-bold text-white/50 uppercase tracking-wider">Usuário</th>
                              <th className="px-6 py-4 text-xs font-bold text-white/50 uppercase tracking-wider">Função</th>
                              <th className="px-6 py-4 text-xs font-bold text-white/50 uppercase tracking-wider">Email</th>
                              <th className="px-6 py-4 text-xs font-bold text-white/50 uppercase tracking-wider text-right">Ações</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                           {users.map((u) => (
                              <tr key={u.id} className="hover:bg-white/5 transition-colors group">
                                 <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-3">
                                       {u.avatar_url ?
                                          <img alt="" className="h-9 w-9 rounded-full object-cover" src={u.avatar_url} /> :
                                          <div className="h-9 w-9 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-500 dark:text-gray-400">
                                             {u.name?.charAt(0) || '?'}
                                          </div>
                                       }

                                       <div className="text-sm font-semibold text-white">{u.name || 'Sem nome'}</div>
                                    </div>
                                 </td>
                                 <td className="px-6 py-4 whitespace-nowrap">
                                    <select
                                       value={u.role || ''}
                                       onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                                       className="bg-black/20 border border-white/10 rounded-lg text-sm p-2 text-white/90 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all cursor-pointer hover:bg-white/5"
                                       disabled={currentProfile?.role !== 'manager' && currentProfile?.name !== 'Vinicius Oliveira'} // Emergency backdoor for Vinicius until role is set
                                    >
                                       <option value="" className="bg-neutral-900">Selecione...</option>
                                       <option value="manager" className="bg-neutral-900">Gestor</option>
                                       <option value="consultant" className="bg-neutral-900">Consultor</option>
                                       <option value="analyst" className="bg-neutral-900">Analista</option>
                                    </select>
                                 </td>
                                 <td className="px-6 py-4 whitespace-nowrap text-sm text-white/60">
                                    {u.email}
                                 </td>
                                 <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                    <button
                                       onClick={() => handleDeleteUser(u.id, u.name || u.email)}
                                       className="p-2 text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                       title="Remover Usuário"
                                       disabled={u.id === currentUser?.id || (currentProfile?.role !== 'manager' && currentProfile?.name !== 'Vinicius Oliveira')}
                                    >
                                       <span className="material-symbols-outlined text-[18px]">delete</span>
                                    </button>
                                 </td>
                              </tr>
                           ))}
                           {users.length === 0 && (
                              <tr>
                                 <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">Nenhum usuário encontrado.</td>
                              </tr>
                           )}
                        </tbody>
                     </table>
                  </div>
               </div>

               {/* System Preferences */}
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-8">
                  <div className="lg:col-span-1">
                     <h3 className="text-lg font-bold text-white tracking-tight">Preferências do Sistema</h3>
                     <p className="text-sm text-white/50 mt-1">Configurações de localização, notificações e integração.</p>
                  </div>
                  <div className="lg:col-span-2 space-y-6">
                     <div className="glass-card rounded-xl border border-white/5 p-6 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -z-10 pointer-events-none"></div>
                        <h4 className="text-xs font-bold text-primary mb-6 uppercase tracking-widest flex items-center gap-2 border-b border-white/5 pb-2">
                           <span className="material-symbols-outlined text-[18px]">language</span>
                           Idioma e Região
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="space-y-2">
                              <label className="text-xs font-bold text-white/50 uppercase tracking-wider">Idioma da Interface</label>
                              <select className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-lg text-sm text-white focus:ring-1 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all hover:bg-white/5">
                                 <option className="bg-neutral-900">Português (Brasil)</option>
                              </select>
                           </div>
                           <div className="space-y-2">
                              <label className="text-xs font-bold text-white/50 uppercase tracking-wider">Moeda Padrão</label>
                              <select className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-lg text-sm text-white focus:ring-1 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all hover:bg-white/5">
                                 <option className="bg-neutral-900">BRL (R$)</option>
                              </select>
                           </div>
                        </div>
                     </div>
                     <div className="glass-card rounded-xl border border-white/5 p-6 shadow-xl">
                        <h4 className="text-xs font-bold text-primary mb-6 uppercase tracking-widest flex items-center gap-2 border-b border-white/5 pb-2">
                           <span className="material-symbols-outlined text-[18px]">shield</span>
                           Segurança
                        </h4>
                        <div className="space-y-4">
                           {[
                              { title: 'Autenticação de Dois Fatores (2FA)', desc: 'Exigir código OTP para todos os usuários.' },
                              { title: 'Notificações de Login Suspeito', desc: 'Alertar admins sobre acessos de novos IPs.' }
                           ].map((pref, i) => (
                              <div key={i} className="flex items-center justify-between">
                                 <div>
                                    <p className="text-sm font-semibold text-white">{pref.title}</p>
                                    <p className="text-xs text-white/50">{pref.desc}</p>
                                 </div>
                                 <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" defaultChecked className="sr-only peer" />
                                    <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                                 </label>
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>
               </div>

               <div className="text-center pt-12 pb-8">
                  <p className="text-[10px] text-white/20 uppercase tracking-widest">CRM K&O System v2.4.0 • Built for Excellence</p>
               </div>
            </div >
         </div >
      </Layout >
   );
}