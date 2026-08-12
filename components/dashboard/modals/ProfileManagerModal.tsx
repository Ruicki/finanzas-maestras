'use client';

import React from 'react';
import { ProfileWithData } from '@/types';
import ProfileManager from '@/components/profiles/ProfileManager'; // Ensure this path is correct
import { toast } from 'sonner';
import { useScrollLock } from '@/hooks/useScrollLock';

interface ProfileManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: ProfileWithData;
}

export default function ProfileManagerModal({ isOpen, onClose, currentUser }: ProfileManagerModalProps) {
    useScrollLock(isOpen);

    if (!isOpen) return null;
    if (currentUser.role !== 'ADMIN') return null;

    return (
        <ProfileManager
            profiles={[]} // Helper will fetch them on mount
            currentProfileId={currentUser.id}
            onClose={onClose}
            onUpdate={() => window.location.reload()}
            onImpersonate={async (profile) => {
                if (confirm(`¿Iniciar sesión como ${profile.name}?`)) {
                    // Import dynamically to avoid cycle if necessary
                    const { startImpersonation } = await import('@/app/actions/auth');
                    const res = await startImpersonation(profile.id);
                    if (res?.error) {
                        toast.error(res.error);
                    } else {
                        toast.success(`Cambiando a perfil de ${profile.name}...`);
                        window.location.reload();
                    }
                }
            }}
        />
    );
}
