'use client';

import { useState } from 'react';
// import { Category } from '@prisma/client'; 
import { ProfileWithData } from '@/types';
import { createCategory, deleteCategory, updateCategory } from '@/app/actions/categories';
import { toast } from 'sonner';
import { X, Plus, Trash2, Pencil, Check } from 'lucide-react';
import { useScrollLock } from '@/hooks/useScrollLock';
import { CategoryIcon, AVAILABLE_ICONS } from './CategoryIcon';

type Category = ProfileWithData['categories'][number];

interface CategoryManagerProps {
    categories: Category[];
    profileId: number;
    onClose: () => void;
    onUpdate: () => void;
}

const COLORS = [
    'text-blue-500', 'text-orange-500', 'text-zinc-500', 'text-pink-500',
    'text-yellow-500', 'text-red-500', 'text-indigo-500', 'text-cyan-500',
    'text-emerald-500', 'text-purple-500', 'text-lime-500', 'text-fuchsia-500'
];

export default function CategoryManager({ categories, profileId, onClose, onUpdate }: CategoryManagerProps) {
    const [view, setView] = useState<'list' | 'form'>('list');
    const [editId, setEditId] = useState<number | null>(null);

    useScrollLock(true);

    // Estado del Formulario
    const [newName, setNewName] = useState('');
    const [newIcon, setNewIcon] = useState('Home');
    const [newColor, setNewColor] = useState('text-blue-500');
    const [newType, setNewType] = useState('VARIABLE'); // FIXED, VARIABLE, LUXURY

    function openCreate() {
        setEditId(null);
        setNewName('');
        setNewIcon('Home');
        setNewColor('text-blue-500');
        setNewType('VARIABLE');
        setView('form');
    }

    function openEdit(cat: Category) {
        setEditId(cat.id);
        setNewName(cat.name);
        setNewIcon(cat.icon);
        setNewColor(cat.color);
        setNewType(cat.type);
        setView('form');
    }

    async function handleSave() {
        if (!newName) return toast.error("El nombre es requerido");

        try {
            if (editId) {
                await updateCategory(editId, newName, newIcon, newColor, newType);
                toast.success("Categoría actualizada");
            } else {
                await createCategory(profileId, newName, newIcon, newColor, newType);
                toast.success("Categoría creada");
            }
            onUpdate();
            setView('list');
        } catch (e) {
            toast.error("Error guardando categoría");
        }
    }

    async function handleDelete(id: number) {
        if (confirm('¿Seguro? Los gastos asociados perderán su categoría.')) {
            await deleteCategory(id);
            onUpdate();
            toast.success("Categoría eliminada");
        }
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">

                {/* Encabezado */}
                <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900">
                    <h3 className="text-xl font-black text-zinc-900 dark:text-white">
                        {view === 'list' ? 'Gestionar Categorías' : editId ? 'Editar Categoría' : 'Nueva Categoría'}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors">
                        <X size={20} className="text-zinc-500" />
                    </button>
                </div>

                {/* Contenido */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">

                    {view === 'list' ? (
                        <div className="space-y-4">
                            <button
                                onClick={openCreate}
                                className="w-full py-4 rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-400 font-bold hover:border-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-all flex items-center justify-center gap-2"
                            >
                                <Plus size={20} /> Crear Nueva Categoría
                            </button>

                            <div className="grid gap-3">
                                {categories.map(cat => (
                                    <div key={cat.id} className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cat.color.replace('text-', 'bg-').replace('500', '100')} ${cat.color}`}>
                                                <CategoryIcon iconName={cat.icon} size={20} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-zinc-900 dark:text-white">{cat.name}</p>
                                                <p className="text-xs font-bold text-zinc-400 uppercase">{cat.type}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => openEdit(cat)}
                                                className="p-2 text-zinc-300 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all"
                                                title="Editar"
                                            >
                                                <Pencil size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(cat.id)}
                                                className="p-2 text-zinc-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                                title="Eliminar"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Formulario */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Columna Izquierda: Nombre, Tipo y Color */}
                                <div className="space-y-6">
                                    <div>
                                        <label className="text-xs font-bold text-zinc-500 uppercase ml-1 mb-2 block">Nombre</label>
                                        <input
                                            value={newName}
                                            onChange={e => setNewName(e.target.value)}
                                            className="w-full bg-zinc-100 dark:bg-zinc-800 p-4 rounded-2xl font-bold text-lg outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all"
                                            placeholder="Ej: Gimnasio"
                                            autoFocus
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-zinc-500 uppercase ml-1 mb-2 block">Tipo</label>
                                        <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
                                            {['FIXED', 'VARIABLE', 'LUXURY'].map(t => (
                                                <button
                                                    key={t}
                                                    onClick={() => setNewType(t)}
                                                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${newType === t ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-400'}`}
                                                >
                                                    {t === 'FIXED' ? 'Fijo' : t === 'VARIABLE' ? 'Variable' : 'Lujo'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-zinc-500 uppercase ml-1 mb-2 block">Color</label>
                                        <div className="flex flex-wrap gap-3">
                                            {COLORS.map(c => (
                                                <button
                                                    key={c}
                                                    onClick={() => setNewColor(c)}
                                                    className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${c.replace('text-', 'bg-')} ${newColor === c ? 'ring-2 ring-offset-2 ring-zinc-400 scale-110' : ''}`}
                                                >
                                                    {newColor === c && <Check size={14} className="text-white mx-auto" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Columna Derecha: Selector de Iconos */}
                                <div>
                                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1 mb-2 block">Icono</label>
                                    <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-3xl border border-zinc-100 dark:border-zinc-800 h-[320px] overflow-y-auto scrollbar-thin">
                                        <div className="grid grid-cols-4 gap-3">
                                            {AVAILABLE_ICONS.map(icon => (
                                                <button
                                                    key={icon}
                                                    onClick={() => setNewIcon(icon)}
                                                    className={`aspect-square rounded-2xl flex items-center justify-center transition-all ${newIcon === icon ? 'bg-zinc-900 dark:bg-white text-white dark:text-black shadow-lg scale-105' : 'bg-white dark:bg-zinc-800 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700'}`}
                                                >
                                                    <CategoryIcon iconName={icon} size={24} />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800 mt-6">
                                <button
                                    onClick={() => setView('list')}
                                    className="flex-1 py-4 rounded-xl font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="flex-1 py-4 rounded-xl font-bold bg-zinc-900 dark:bg-white text-white dark:text-black hover:scale-105 active:scale-95 transition-all shadow-lg"
                                >
                                    {editId ? 'Actualizar' : 'Guardar Categoría'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
