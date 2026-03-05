'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import { ADMIN_PASSWORD } from '@/lib/config';

export default function LoginPage() {
    const [password, setPassword] = useState('');
    const [error, setError] = useState(false);
    const router = useRouter();

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        // Simple verification
        if (password === ADMIN_PASSWORD) {
            // Set simple cookie/storage
            localStorage.setItem('isAuthenticated', 'true');
            document.cookie = "auth=true; path=/";
            router.push('/');
        } else {
            setError(true);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
                <div className="flex justify-center mb-6">
                    <div className="p-4 bg-blue-100 rounded-full">
                        <Lock className="w-8 h-8 text-blue-600" />
                    </div>
                </div>

                <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">Acceso Restringido</h1>
                <p className="text-center text-gray-500 mb-8">Base de Fichas - Congregación Modelo</p>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña Maestra</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                setError(false);
                            }}
                            className={`w-full px-4 py-3 rounded-lg border ${error ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors`}
                            placeholder="••••••••"
                            autoFocus
                        />
                        {error && <p className="text-red-500 text-sm mt-1">Contraseña incorrecta</p>}
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors shadow-md hover:shadow-lg"
                    >
                        Ingresar
                    </button>
                </form>

                <div className="mt-8 text-center text-xs text-gray-400">
                    <p>Solo personal autorizado</p>
                </div>
            </div>
        </div>
    );
}
