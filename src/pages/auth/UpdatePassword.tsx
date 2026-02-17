import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, AlertCircle, Lock } from 'lucide-react';
import logo from '../../assets/logo.png';

export default function UpdatePassword() {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState(''); // New: Confirm Password
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE');
    const [message, setMessage] = useState('');

    useEffect(() => {
        // Verify if we have a session (link clicked)
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                // If no session, check URL hash for access_token (implicit flow)
                // Supabase handles this automatically usually, but let's be safe.
                // If completely invalid, redirect to login?
                // Actually, let user stay and try to input pass, if it fails, it fails.
            }
        });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setStatus('ERROR');
            setMessage('Las contraseñas no coinciden.');
            return;
        }

        if (password.length < 6) {
            setStatus('ERROR');
            setMessage('La contraseña debe tener al menos 6 caracteres.');
            return;
        }

        setLoading(true);
        setStatus('IDLE');
        setMessage('');

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;

            setStatus('SUCCESS');
            setMessage('Contraseña actualizada correctamente. Redirigiendo al Dashboard...');

            // Auto login/redirect
            setTimeout(() => {
                navigate('/dashboard');
            }, 2000);

        } catch (error: any) {
            console.error('Update Password Error:', error);
            setStatus('ERROR');
            setMessage(error.message || 'Error al actualizar la contraseña. El enlace puede haber caducado.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md border-t-4 border-t-purple-600 shadow-xl">
                <CardHeader className="text-center pb-2">
                    <div className="flex justify-center mb-6">
                        <img src={logo} alt="ALDASE TECH" className="h-20 object-contain" />
                    </div>
                    <CardTitle className="text-xl font-bold text-slate-800">Establecer Nueva Contraseña</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-4">
                    {status === 'SUCCESS' ? (
                        <div className="text-center space-y-4 animate-in fade-in zoom-in duration-300">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
                                <CheckCircle className="w-8 h-8" />
                            </div>
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800 text-sm">
                                <p className="font-semibold mb-1">¡Contraseña Actualizada!</p>
                                <p>{message}</p>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <Input
                                label="Nueva Contraseña"
                                type="password"
                                placeholder="******"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                icon={<Lock className="w-4 h-4 text-slate-400" />}
                            />

                            <Input
                                label="Confirmar Contraseña"
                                type="password"
                                placeholder="******"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                minLength={6}
                                icon={<Lock className="w-4 h-4 text-slate-400" />}
                            />

                            {status === 'ERROR' && (
                                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md text-sm flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                    <span>{message}</span>
                                </div>
                            )}

                            <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700" isLoading={loading}>
                                Cambiar Contraseña y Entrar
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
