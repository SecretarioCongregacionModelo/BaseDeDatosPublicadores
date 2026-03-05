'use client';

import React, { useState, useEffect } from 'react';
import { Lock, Unlock } from 'lucide-react';

interface AuthGuardProps {
    children: React.ReactNode;
    actionName?: string; // e.g. "Eliminar Registro"
    onVerified?: () => void;
    className?: string;
    requireAuth?: boolean; // If false, renders children directly
}

import { ADMIN_PASSWORD } from '@/lib/config';

export const AuthGuard = ({ children, actionName = "Acción Protegida", onVerified, className = "", requireAuth = true }: AuthGuardProps) => {
    const [isLocked, setIsLocked] = useState(requireAuth);
    const [password, setPassword] = useState("");
    const [error, setError] = useState(false);
    const [showPrompt, setShowPrompt] = useState(false);

    // Simple hardcoded check for now, can be moved to API verify
    const verifyPassword = () => {
        if (password === ADMIN_PASSWORD) {
            setIsLocked(false);
            setError(false);
            setShowPrompt(false);
            if (onVerified) onVerified();
        } else {
            setError(true);
            setPassword("");
        }
    };

    if (!requireAuth) return <>{children}</>;

    if (isLocked) {
        if (showPrompt) {
            return (
                <div className={`flex flex-col gap-2 p-2 bg-red-50 border border-red-200 rounded ${className}`}>
                    <p className="text-xs font-bold text-red-800">🔒 Contraseña requerida para: {actionName}</p>
                    <div className="flex gap-2">
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="border rounded px-2 py-1 text-sm w-full"
                            placeholder="Contraseña"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && verifyPassword()}
                        />
                        <button
                            onClick={verifyPassword}
                            className="bg-red-600 text-white px-3 py-1 rounded text-sm whitespace-nowrap"
                        >
                            Desbloquear
                        </button>
                    </div>
                    {error && <span className="text-xs text-red-600 font-bold">Incorrecta</span>}
                    <button onClick={() => setShowPrompt(false)} className="text-xs text-gray-500 underline text-left">Cancelar</button>
                </div>
            );
        }

        return (
            <div className={className} onClick={() => setShowPrompt(true)}>
                <p className="text-xs text-gray-400 flex items-center gap-1 cursor-pointer hover:text-red-600 transition-colors">
                    <Lock size={12} /> {actionName}
                </p>
            </div>
        );
    }

    return (
        <div className={`relative group ${className}`}>
            {children}
            {/* Optional: Relock button */}
            {/* <button onClick={() => setIsLocked(true)} className="absolute -top-2 -right-2 bg-gray-100 rounded-full p-1 opacity-0 group-hover:opacity-100">
        <Lock size={10} />
      </button> */}
        </div>
    );
};
