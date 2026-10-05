import React, { useState, useRef } from 'react';
import type { CleaningTask, User } from '../types';
import { DEFAULT_USERS } from '../utils/storage';
import {
  Sparkles,
  CheckCircle2,
  Camera,
  RotateCcw,
  UserCheck,
  FileText,
  X,
  Plus,
  Trash2,
  ArrowLeft,
  Image as ImageIcon,
  Eye,
  Check,
  Settings,
  Bell,
} from 'lucide-react';
import { compressImage } from '../services/imageStorage';
import { formatCompletedAt } from '../utils/formatters';
import {
  getNotificationPermission,
  requestNotificationPermission,
  triggerTestNotification,
} from '../services/notificationService';

interface CleaningModuleProps {
  tasks: CleaningTask[];
  currentUser: User;
  users?: User[];
  onToggleTask?: (taskId: string) => void;
  onUpdateTask?: (
    taskId: string,
    completed: boolean,
    completedBy?: string,
    completedAt?: string,
    notes?: string,
    photoUrl?: string,
    machinePhotoUrl?: string
  ) => void;
  onAddTask?: (task: Omit<CleaningTask, 'id'>) => void;
  onDeleteTask?: (id: string) => void;
  onResetAllTasks?: () => void;
  onGoHome?: () => void;
}

export const CleaningModule: React.FC<CleaningModuleProps> = ({
  tasks,
  currentUser,
  users = DEFAULT_USERS,
  onUpdateTask,
  onAddTask,
  onDeleteTask,
  onResetAllTasks,
  onGoHome,
}) => {
  // Modal states
  const [selectedTask, setSelectedTask] = useState<CleaningTask | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; title: string } | null>(null);

  // Validation Form State (when recording cleaning)
  const [selectedOperator, setSelectedOperator] = useState<User>(currentUser);
  const [cleaningPhoto, setCleaningPhoto] = useState<string | undefined>(undefined);
  const [notes, setNotes] = useState<string>('');

  // Add / Edit Machine State (Adel B Admin only)
  const [newMachineName, setNewMachineName] = useState<string>('');
  const [newMachineZone, setNewMachineZone] = useState<
    'Fournil' | 'Laboratoire Pâtisserie' | 'Vente & Magasin' | 'Plonge & Sanitaires'
  >('Fournil');
  const [newMachineColor, setNewMachineColor] = useState<string>('from-blue-600 to-blue-700');
  const [newMachinePhoto, setNewMachinePhoto] = useState<string | undefined>(undefined);

  const [uploadingTaskId, setUploadingTaskId] = useState<string | null>(null);
  const cleaningPhotoInputRef = useRef<HTMLInputElement>(null);
  const addMachinePhotoInputRef = useRef<HTMLInputElement>(null);
  const editMachinePhotoInputRef = useRef<HTMLInputElement>(null);
  const cardMachinePhotoInputRef = useRef<HTMLInputElement>(null);

  // Check if current user is Adel B (Admin) - strictly Adel B only
  const isAdmin =
    currentUser.id === 'u_adel' ||
    currentUser.name.trim().toLowerCase().startsWith('adel');

  const colorPalettes = [
    { label: 'Bleu', value: 'from-blue-600 to-blue-700', bg: 'bg-blue-600' },
    { label: 'Indigo', value: 'from-indigo-600 to-indigo-700', bg: 'bg-indigo-600' },
    { label: 'Violet', value: 'from-purple-600 to-purple-700', bg: 'bg-purple-600' },
    { label: 'Émeraude', value: 'from-emerald-600 to-emerald-700', bg: 'bg-emerald-600' },
    { label: 'Ambre', value: 'from-amber-600 to-amber-700', bg: 'bg-amber-600' },
    { label: 'Orange', value: 'from-orange-600 to-orange-700', bg: 'bg-orange-600' },
    { label: 'Rose', value: 'from-rose-600 to-rose-700', bg: 'bg-rose-600' },
    { label: 'Teal', value: 'from-teal-600 to-teal-700', bg: 'bg-teal-600' },
  ];

  const handleOpenTask = (task: CleaningTask) => {
    setSelectedTask(task);
    const existingUser = users.find((u) => u.name === task.completedBy);
    setSelectedOperator(existingUser || currentUser);
    setCleaningPhoto(task.photoUrl);
    setNotes(task.notes || '');
  };

  const handleCleaningPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, { maxWidth: 1000, maxHeight: 1000, quality: 0.8 });
      setCleaningPhoto(compressed);
    } catch (err) {
      console.error('Error compressing cleaning photo', err);
    }
  };

  const handleAddMachinePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, { maxWidth: 800, maxHeight: 800, quality: 0.85 });
      setNewMachinePhoto(compressed);
    } catch (err) {
      console.error('Error compressing machine photo', err);
    }
  };

  const handleCardMachinePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingTaskId || !onUpdateTask) return;
    try {
      const compressed = await compressImage(file, { maxWidth: 800, maxHeight: 800, quality: 0.85 });
      const targetTask = tasks.find((t) => t.id === uploadingTaskId);
      if (targetTask) {
        onUpdateTask(
          targetTask.id,
          targetTask.completed,
          targetTask.completedBy,
          targetTask.completedAt,
          targetTask.notes,
          targetTask.photoUrl,
          compressed
        );
      }
      setUploadingTaskId(null);
    } catch (err) {
      console.error('Error compressing machine photo', err);
    }
  };

  const handleEditMachinePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTask) return;
    try {
      const compressed = await compressImage(file, { maxWidth: 800, maxHeight: 800, quality: 0.85 });
      if (onUpdateTask) {
        onUpdateTask(
          selectedTask.id,
          selectedTask.completed,
          selectedTask.completedBy,
          selectedTask.completedAt,
          selectedTask.notes,
          selectedTask.photoUrl,
          compressed
        );
      }
      setSelectedTask((prev) => (prev ? { ...prev, machinePhotoUrl: compressed } : null));
    } catch (err) {
      console.error('Error compressing machine photo', err);
    }
  };

  // Submit Cleaning Validation
  const handleConfirmValidation = () => {
    if (!selectedTask) return;
    const finalOperator = selectedOperator.name;
    const finalTime = new Date().toISOString();

    if (onUpdateTask) {
      onUpdateTask(
        selectedTask.id,
        true,
        finalOperator,
        finalTime,
        notes.trim() || undefined,
        cleaningPhoto,
        selectedTask.machinePhotoUrl
      );
    }
    setSelectedTask(null);
  };

  // Uncheck Task
  const handleUncheckTask = () => {
    if (!selectedTask) return;
    if (onUpdateTask) {
      onUpdateTask(
        selectedTask.id,
        false,
        undefined,
        undefined,
        undefined,
        undefined,
        selectedTask.machinePhotoUrl
      );
    }
    setSelectedTask(null);
  };

  // Submit New Machine (Adel B only)
  const handleCreateMachine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMachineName.trim() || !onAddTask) return;

    onAddTask({
      name: newMachineName.trim(),
      shortName: newMachineName.trim(),
      zone: newMachineZone,
      frequency: 'Quotidien',
      completed: false,
      color: newMachineColor,
      machinePhotoUrl: newMachinePhoto,
      instructions: `Nettoyage et désinfection de ${newMachineName.trim()}`,
    });

    setNewMachineName('');
    setNewMachinePhoto(undefined);
    setShowAddModal(false);
  };

  // Delete Machine (Adel B only)
  const handleDeleteMachine = (taskId: string) => {
    if (onDeleteTask) {
      onDeleteTask(taskId);
    }
    setSelectedTask(null);
  };

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;
  const pendingCount = totalCount - completedCount;

  // Push Notification state
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(() => getNotificationPermission());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    setNotifPermission(getNotificationPermission());
    if (granted) {
      showToast('✓ Alertes Push activées ! Rappel programmé chaque Dimanche à 12h00.');
    } else {
      showToast('⚠️ Notifications bloquées. Veuillez les autoriser dans les paramètres.');
    }
  };

  const handleTestNotification = async () => {
    const ok = await triggerTestNotification();
    if (ok) {
      showToast('🔔 Notification envoyée ! Vérifiez votre écran de verrouillage.');
    } else {
      showToast('⚠️ Activez d\'abord les notifications pour tester.');
    }
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-24 px-1 sm:px-0">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-white text-slate-950 text-xs sm:text-sm font-bold px-4 py-3 rounded-2xl shadow-2xl border border-slate-200 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hidden File Input for On-Card Machine Photo Upload */}
      <input
        ref={cardMachinePhotoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleCardMachinePhotoUpload}
      />
      
      {/* ================= HEADER (CLEAN & MOBILE FIRST) ================= */}
      <div className="flex items-center justify-between gap-2.5 bg-slate-900 text-white p-3.5 sm:p-4 rounded-3xl border border-slate-800 shadow-md">
        <div className="flex items-center gap-2.5 min-w-0">
          {onGoHome && (
            <button
              onClick={onGoHome}
              className="p-2 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white transition-all cursor-pointer shrink-0"
              title="Retour"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white truncate">
                Nettoyage
              </h2>
              {totalCount > 0 && (
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    pendingCount === 0
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-rose-500 text-white'
                  }`}
                >
                  {pendingCount === 0 ? 'Fait ✓' : `${pendingCount} restant`}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-medium truncate">
              {isAdmin ? '👤 Mode Admin (Adel B)' : 'Touchez pour valider'}
            </p>
          </div>
        </div>

        {/* Top Actions: Notification Pill, Add Machine & Reset */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={notifPermission === 'granted' ? handleTestNotification : handleEnableNotifications}
            className={`h-9 px-2.5 sm:px-3 rounded-2xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
              notifPermission === 'granted'
                ? 'bg-slate-800 border-slate-700 text-emerald-400 hover:text-white'
                : 'bg-amber-500/15 border-amber-500/30 text-amber-300 hover:bg-amber-500 hover:text-slate-950'
            }`}
            title="Rappel automatique Grand Nettoyage le Dimanche à 12h00"
          >
            <Bell className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Dim. 12h</span>
            <span className="text-[10px]">{notifPermission === 'granted' ? '✓' : 'Activer'}</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => setShowAddModal(true)}
              className="h-9 sm:h-10 px-3 sm:px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer whitespace-nowrap"
              title="Ajouter un matériel"
            >
              <Plus className="w-4 h-4 stroke-[3] shrink-0" />
              <span>Nouveau Matériel</span>
            </button>
          )}

          {totalCount > 0 && onResetAllTasks && (
            <button
              onClick={onResetAllTasks}
              className="p-2 sm:p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-amber-400 border border-slate-700 transition-all active:scale-95 cursor-pointer"
              title="Remettre tout à faire pour la journée"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ================= 2-COLUMN SQUARES GRID ================= */}
      {tasks.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center text-white space-y-4 my-6">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto shadow-inner">
            <Sparkles className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">Aucun matériel configuré</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              {isAdmin
                ? "Vous êtes connecté avec le profil d'administration (Adel B). Ajoutez vos machines et leurs photos pour que l'équipe puisse effectuer les nettoyages."
                : "Demandez à Adel B (Administrateur) d'ajouter les machines et leurs photos."}
            </p>
          </div>

          {isAdmin && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-2xl text-xs sm:text-sm inline-flex items-center gap-2 shadow-lg shadow-amber-500/25 transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Ajouter ma première machine</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {tasks.map((task) => {
            const userObj = users.find((u) => u.name === task.completedBy);
            const isDone = task.completed;
            const hasPhoto = Boolean(task.machinePhotoUrl);

            const cardBackground = isDone
              ? 'bg-gradient-to-br from-emerald-600 to-emerald-700 shadow-emerald-950/40'
              : task.color
              ? `bg-gradient-to-br ${task.color} shadow-slate-950/40`
              : 'bg-gradient-to-br from-blue-600 to-blue-700';

            return (
              <button
                key={task.id}
                onClick={() => handleOpenTask(task)}
                className={`p-3.5 sm:p-4 rounded-3xl flex flex-col justify-between text-left transition-all active:scale-95 min-h-[155px] sm:min-h-[170px] shadow-lg relative overflow-hidden group cursor-pointer border border-white/10 ${cardBackground}`}
              >
                {/* Full Square Photo Background */}
                {hasPhoto && (
                  <>
                    <img
                      src={task.machinePhotoUrl}
                      alt={task.name}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {/* Contrast Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/45 to-black/35 pointer-events-none" />
                  </>
                )}

                {/* Top Row: Quick Photo (if admin & no photo) + Status Badge */}
                <div className="relative z-10 flex items-start justify-between w-full gap-2">
                  {!hasPhoto && isAdmin ? (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setUploadingTaskId(task.id);
                        cardMachinePhotoInputRef.current?.click();
                      }}
                      className="px-2 py-1 rounded-xl bg-black/40 hover:bg-black/60 text-amber-300 hover:text-white border border-amber-500/30 text-[10px] font-black uppercase flex items-center gap-1 transition-colors cursor-pointer"
                      title="Ajouter la photo de cette machine"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>+ Photo</span>
                    </span>
                  ) : !hasPhoto ? (
                    <div className="w-8 h-8 rounded-xl bg-black/20 flex items-center justify-center text-white/80">
                      <Sparkles className="w-4 h-4" />
                    </div>
                  ) : (
                    <div />
                  )}

                  {/* Status Badge */}
                  {isDone ? (
                    <span className="bg-emerald-500 text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-md">
                      <Check className="w-3 h-3 stroke-[3]" /> Fait
                    </span>
                  ) : (
                    <span className="bg-slate-950/80 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-xs border border-white/20">
                      À faire
                    </span>
                  )}
                </div>

                {/* Bottom Row: Machine Name & Status */}
                <div className="relative z-10 mt-auto pt-3 w-full">
                  <h3 className="text-sm sm:text-base font-black tracking-tight text-white leading-snug drop-shadow-md line-clamp-2">
                    {task.shortName || task.name}
                  </h3>

                  {isDone ? (
                    <div className="flex items-center gap-1.5 mt-1 text-[11px] font-bold text-emerald-300 drop-shadow-xs">
                      <div
                        className="w-4 h-4 rounded-full overflow-hidden flex items-center justify-center text-[9px] font-black text-white shrink-0 shadow-xs"
                        style={{
                          backgroundColor: userObj?.avatarColor || '#10b981',
                          border: `1.5px solid ${userObj?.avatarColor || '#10b981'}`,
                        }}
                      >
                        {userObj?.avatarUrl ? (
                          <img src={userObj.avatarUrl} alt={userObj.name} className="w-full h-full object-cover" />
                        ) : (
                          (task.completedBy || 'U').charAt(0)
                        )}
                      </div>
                      <span className="truncate">{task.completedBy ? task.completedBy.split(' ')[0] : 'Fait'}</span>
                      <span className="text-white/70 font-mono text-[10px]">• {formatCompletedAt(task.completedAt)}</span>
                    </div>
                  ) : (
                    <p className="text-[11px] text-white/80 font-semibold truncate mt-0.5 drop-shadow-xs">
                      {task.zone}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ================= MODAL: VALIDATION DU NETTOYAGE ================= */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs no-print">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95">
            
            {/* Header */}
            <div className="bg-slate-900 text-white p-5 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 font-black flex items-center justify-center shrink-0 shadow-md overflow-hidden">
                  {selectedTask.machinePhotoUrl ? (
                    <img
                      src={selectedTask.machinePhotoUrl}
                      alt={selectedTask.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Sparkles className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                    {selectedTask.zone}
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-white leading-snug">
                    {selectedTask.name}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 text-slate-800">
              
              {/* 1. PHOTO DU NETTOYAGE (OPTIONNEL) */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-amber-600" />
                    Photo du nettoyage réalisé (Optionnel) :
                  </span>
                  {cleaningPhoto && (
                    <button
                      type="button"
                      onClick={() => setCleaningPhoto(undefined)}
                      className="text-rose-600 text-[11px] font-bold flex items-center gap-0.5 hover:underline"
                    >
                      <Trash2 className="w-3 h-3" /> Supprimer
                    </button>
                  )}
                </label>

                {cleaningPhoto ? (
                  <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500 bg-slate-950 h-36 flex items-center justify-center">
                    <img
                      src={cleaningPhoto}
                      alt="Nettoyage"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewPhoto({
                          url: cleaningPhoto,
                          title: `Nettoyage • ${selectedTask.name}`,
                        })
                      }
                      className="absolute bottom-2 right-2 bg-slate-900/80 hover:bg-slate-900 text-white p-1.5 rounded-xl text-xs flex items-center gap-1 backdrop-blur-xs font-bold"
                    >
                      <Eye className="w-3.5 h-3.5" /> Agrandir
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => cleaningPhotoInputRef.current?.click()}
                    className="w-full p-4 border-2 border-dashed border-slate-300 hover:border-amber-500 bg-slate-50 hover:bg-amber-50/50 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all text-slate-600 hover:text-amber-800 cursor-pointer"
                  >
                    <div className="p-2.5 rounded-2xl bg-amber-100 text-amber-700 shadow-xs">
                      <Camera className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold">Prendre une photo du matériel propre</span>
                    <span className="text-[10px] text-slate-400">Caméra ou galerie • Enregistré dans l'historique</span>
                  </button>
                )}

                <input
                  ref={cleaningPhotoInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleCleaningPhotoUpload}
                />
              </div>

              {/* 2. OPERATEUR */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-amber-600" />
                  Qui a nettoyé ?
                </label>

                <div className="grid grid-cols-2 gap-2">
                  {users.map((u) => {
                    const isSelected = selectedOperator.id === u.id;
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => setSelectedOperator(u)}
                        className={`flex items-center gap-2.5 p-2 rounded-2xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-xs overflow-hidden shrink-0"
                          style={{
                            border: `2px solid ${u.avatarColor || '#f59e0b'}`,
                            background: u.avatarColor || '#f59e0b',
                          }}
                        >
                          {u.avatarUrl ? (
                            <img src={u.avatarUrl} alt={u.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="font-black">{u.name.charAt(0)}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">{u.name}</div>
                          <div className="text-[10px] font-semibold text-slate-500 truncate">{u.role}</div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-amber-600 stroke-[3] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. NOTE / REMARQUE */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-amber-600" />
                  Remarque (Optionnel) :
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: R.A.S., dégraissé, lames désinfectées..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              {/* 4. ADEL B (ADMIN) MACHINE EDIT / PHOTO SETTINGS */}
              {isAdmin && (
                <div className="pt-3 border-t border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                      <Settings className="w-3.5 h-3.5 text-amber-600" />
                      Gérer ce matériel (Adel B) :
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteMachine(selectedTask.id)}
                      className="text-rose-600 hover:text-rose-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Supprimer ce matériel
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => editMachinePhotoInputRef.current?.click()}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>{selectedTask.machinePhotoUrl ? 'Changer photo machine' : 'Ajouter photo machine'}</span>
                    </button>

                    <input
                      ref={editMachinePhotoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleEditMachinePhotoUpload}
                    />
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              {selectedTask.completed ? (
                <button
                  type="button"
                  onClick={handleUncheckTask}
                  className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-2xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Remettre à faire
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setSelectedTask(null)}
                  className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-2xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Fermer
                </button>
              )}

              <button
                type="button"
                onClick={handleConfirmValidation}
                className="flex-1 sm:flex-none px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black rounded-2xl text-xs sm:text-sm shadow-md shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Valider le nettoyage</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: AJOUTER UN MATERIEL (ADEL B ONLY) ================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs no-print">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95">
            
            {/* Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500 text-slate-950 rounded-2xl font-black">
                  <Plus className="w-5 h-5 stroke-[3]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Ajouter un matériel</h3>
                  <p className="text-[11px] text-slate-400">Profil Admin • Adel B</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateMachine} className="p-5 space-y-4 overflow-y-auto flex-1 text-slate-800">
              
              {/* Nom */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                  Nom du matériel / Machine * :
                </label>
                <input
                  type="text"
                  required
                  value={newMachineName}
                  onChange={(e) => setNewMachineName(e.target.value)}
                  placeholder="Ex: Pétrin Spiral, Façonneuse, Four rotatif..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              {/* Photo du matériel */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                  Photo de la machine (Optionnel) :
                </label>

                {newMachinePhoto ? (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-300 h-28 flex items-center justify-center bg-slate-950">
                    <img src={newMachinePhoto} alt="Machine" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setNewMachinePhoto(undefined)}
                      className="absolute top-2 right-2 bg-rose-600 text-white p-1 rounded-lg text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => addMachinePhotoInputRef.current?.click()}
                    className="w-full p-3 border-2 border-dashed border-slate-300 hover:border-amber-500 bg-slate-50 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold text-slate-600 hover:text-amber-800 cursor-pointer transition-colors"
                  >
                    <Camera className="w-4 h-4 text-amber-600" />
                    <span>Prendre ou choisir une photo</span>
                  </button>
                )}

                <input
                  ref={addMachinePhotoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAddMachinePhotoUpload}
                />
              </div>

              {/* Zone */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                  Zone :
                </label>
                <select
                  value={newMachineZone}
                  onChange={(e) => setNewMachineZone(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800"
                >
                  <option value="Fournil">Fournil (Boulangerie)</option>
                  <option value="Laboratoire Pâtisserie">Laboratoire Pâtisserie</option>
                  <option value="Vente & Magasin">Vente & Magasin</option>
                  <option value="Plonge & Sanitaires">Plonge & Sanitaires</option>
                </select>
              </div>

              {/* Couleur du carré */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                  Couleur du carré :
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {colorPalettes.map((cp) => (
                    <button
                      key={cp.value}
                      type="button"
                      onClick={() => setNewMachineColor(cp.value)}
                      className={`w-8 h-8 rounded-xl ${cp.bg} transition-all cursor-pointer flex items-center justify-center text-white ${
                        newMachineColor === cp.value
                          ? 'ring-3 ring-amber-500 scale-110 shadow-md'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      {newMachineColor === cp.value && <Check className="w-4 h-4 stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-2xl text-xs shadow-md shadow-amber-500/20"
                >
                  + Ajouter le matériel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= LIGHTBOX PREVIEW ================= */}
      {previewPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm no-print">
          <div className="bg-slate-900 text-white w-full max-w-lg rounded-3xl overflow-hidden border border-slate-800 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="p-4 flex items-center justify-between border-b border-slate-800">
              <h4 className="text-sm font-bold text-white">{previewPhoto.title}</h4>
              <button
                onClick={() => setPreviewPhoto(null)}
                className="p-1 text-slate-400 hover:text-white rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 bg-slate-950 flex items-center justify-center max-h-[70vh] overflow-auto">
              <img
                src={previewPhoto.url}
                alt={previewPhoto.title}
                className="max-h-[65vh] w-auto object-contain rounded-2xl shadow-md"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
