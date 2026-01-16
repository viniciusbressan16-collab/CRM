import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { View } from '../App';

interface ProfilePageProps {
    onNavigate: (view: View, id?: string) => void;
    activePage: View;
}

export default function ProfilePage({ onNavigate, activePage }: ProfilePageProps) {
    const { profile, user } = useAuth();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [isAvatarRemoved, setIsAvatarRemoved] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        if (profile) {
            setName(profile.name || '');
            setEmail(profile.email || user?.email || '');
            setAvatarPreview(profile.avatar_url);
        }
    }, [profile, user]);

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            setAvatarFile(file);
            setAvatarPreview(URL.createObjectURL(file));
            setIsAvatarRemoved(false);
        }
    };

    const handleRemoveAvatar = () => {
        setAvatarFile(null);
        setAvatarPreview(null);
        setIsAvatarRemoved(true);
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            let updatedAvatarUrl = isAvatarRemoved ? null : profile?.avatar_url;

            // 1. Upload Avatar if changed
            if (avatarFile) {
                const fileExt = avatarFile.name.split('.').pop();
                const fileName = `${user?.id}/${Math.random()}.${fileExt}`;
                const filePath = `avatars/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('project-files') // Using existing bucket for now, or could try to create 'avatars'
                    .upload(filePath, avatarFile);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('project-files')
                    .getPublicUrl(filePath);

                updatedAvatarUrl = publicUrl;
            }

            // 2. Update Auth User (Email/Password)
            if (email !== user?.email || password) {
                const updates: any = {};
                if (email !== user?.email) updates.email = email;
                if (password) {
                    if (password !== confirmPassword) {
                        throw new Error('As senhas não coincidem.');
                    }
                    updates.password = password;
                }

                const { error: authError } = await supabase.auth.updateUser(updates);
                if (authError) throw authError;
            }

            // 3. Update Profile Table
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    name,
                    email,
                    avatar_url: updatedAvatarUrl,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user?.id);

            if (profileError) throw profileError;

            setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
            setPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            console.error('Error updating profile:', error);
            setMessage({ type: 'error', text: error.message || 'Erro ao atualizar perfil.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout onNavigate={onNavigate} activePage={activePage}>
            <div className="flex flex-col h-full bg-transparent">
                <Header
                    title="Configurações do Perfil"
                    description="Gerencie suas informações pessoais e credenciais de acesso."
                />

                <div className="flex-1 overflow-y-auto p-6 md:p-8">
                    <div className="max-w-2xl mx-auto">
                        <form onSubmit={handleUpdateProfile} className="space-y-8">

                            {/* Avatar Section */}
                            <div className="glass-card p-6 rounded-2xl flex flex-col md:flex-row items-center gap-6">
                                <div className="relative group">
                                    <div
                                        className="size-32 rounded-full border-4 border-white dark:border-surface-dark shadow-xl bg-cover bg-center overflow-hidden"
                                        style={{ backgroundImage: `url('${avatarPreview || 'https://i.pravatar.cc/150'}')` }}
                                    >
                                        {!avatarPreview && (
                                            <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-400">
                                                <span className="material-symbols-outlined text-4xl">person</span>
                                            </div>
                                        )}
                                    </div>
                                    <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                        <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                                        <span className="material-symbols-outlined">photo_camera</span>
                                    </label>
                                </div>
                                <div className="text-center md:text-left">
                                    <h3 className="text-lg font-bold text-text-main-light dark:text-text-main-dark">Foto de Perfil</h3>
                                    <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-1">
                                        Clique na imagem para alterar. Formatos aceitos: JPG, PNG.
                                    </p>
                                    {(avatarPreview || avatarFile) && (
                                        <button
                                            type="button"
                                            onClick={handleRemoveAvatar}
                                            className="mt-3 text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">delete</span>
                                            Remover Foto
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Info Section */}
                            <div className="glass-card p-6 rounded-2xl space-y-6">
                                <h3 className="text-lg font-bold text-text-main-light dark:text-text-main-dark flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[20px]">badge</span>
                                    Informações Básicas
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-600 dark:text-gray-400">Nome Completo</label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="w-full bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all dark:text-white"
                                            placeholder="Seu nome"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-600 dark:text-gray-400">E-mail</label>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all dark:text-white"
                                            placeholder="seu@email.com"
                                            required
                                        />
                                        <p className="text-[10px] text-gray-500 mt-1">
                                            {email !== user?.email ? 'Uma confirmação será enviada para o novo e-mail.' : 'Seu e-mail de acesso.'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Password Section */}
                            <div className="glass-card p-6 rounded-2xl space-y-6">
                                <h3 className="text-lg font-bold text-text-main-light dark:text-text-main-dark flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[20px]">key</span>
                                    Alterar Senha
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-600 dark:text-gray-400">Nova Senha</label>
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all dark:text-white"
                                            placeholder="Deixe em branco para não alterar"
                                            minLength={6}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-600 dark:text-gray-400">Confirmar Senha</label>
                                        <input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="w-full bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all dark:text-white"
                                            placeholder="Repita a nova senha"
                                        />
                                    </div>
                                </div>
                            </div>

                            {message && (
                                <div className={`p-4 rounded-xl flex items-center gap-3 ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    <span className="material-symbols-outlined">
                                        {message.type === 'success' ? 'check_circle' : 'error'}
                                    </span>
                                    <span className="text-sm font-medium">{message.text}</span>
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-3 pb-8">
                                <button
                                    type="button"
                                    onClick={() => onNavigate('pipeline')}
                                    className="px-6 py-3 text-sm font-bold text-gray-500 hover:text-gray-700 dark:hover:text-white transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-8 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 transition-all flex items-center gap-2 disabled:opacity-50"
                                >
                                    {loading ? (
                                        <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                                    ) : (
                                        <span className="material-symbols-outlined text-[20px]">save</span>
                                    )}
                                    Salvar Alterações
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
