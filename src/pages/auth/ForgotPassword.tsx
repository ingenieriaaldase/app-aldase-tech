import React, { useState } from 'react';
import { supabase } from '../../services/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, CheckCircle, AlertCircle } from 'lucide-react';
import logo from '../../assets/logo.png';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStatus('IDLE');
        setMessage('');

        try {
            // Check if user exists in workers table first? No, security best practice is typically generic message.
            // But we can check if email is valid format.

            // Supabase Reset Password
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/update-password`,
            });

            if (error) throw error;

            setStatus('SUCCESS');
            setMessage('Si el email existe en nuestra base de datos, recibirás un enlace de recuperación en unos instantes.');

        } catch (error: any) {
            console.error('Reset Password Error:', error);
            setStatus('ERROR');
            // Don't leak user existence? Or maybe yes for internal app?
            // "Rate limit exceeded" is common.
            setMessage(error.message || 'Error al enviar el correo de recuperación.');
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
                    <CardTitle className="text-xl font-bold text-slate-800">Recuperar Contraseña</CardTitle>
                    <p className="text-sm text-slate-500 mt-2">
                        Te enviaremos un enlace para restablecer tu acceso.
                    </p>
                </CardHeader>
                <CardContent className="space-y-6 pt-4">
                    {status === 'SUCCESS' ? (
                        <div className="text-center space-y-4 animate-in fade-in zoom-in duration-300">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
                                <CheckCircle className="w-8 h-8" />
                            </div>
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800 text-sm">
                                <p className="font-semibold mb-1">¡Correo Enviado!</p>
                                <p>{message}</p>
                            </div>
                            <Button variant="outline" className="w-full" onClick={() => window.location.href = '/login'}>
                                Volver al Login
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <Input
                                label="Email Corporativo"
                                type="email"
                                placeholder="tu.nombre@aldasetech.es"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                icon={<Mail className="w-4 h-4 text-slate-400" />}
                            />

                            {status === 'ERROR' && (
                                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md text-sm flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                    <span>{message}</span>
                                </div>
                            )}

                            <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700" isLoading={loading}>
                                Enviar Enlace de Recuperación
                            </Button>

                            <div className="text-center mt-4">
                                <Link to="/login" className="text-sm text-slate-500 hover:text-purple-600 flex items-center justify-center gap-1 transition-colors">
                                    <ArrowLeft className="w-4 h-4" />
                                    Volver al inicio de sesión
                                </Link>
                            </div>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
