import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await login(email, password);
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.message || 'Error al iniciar sesión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-6">
                        <img src="/src/assets/logo.png" alt="ALDASE TECH" className="h-24 object-contain" />
                    </div>
                    <CardTitle>Ingeniería CRM</CardTitle>
                    <p className="text-sm text-slate-500 mt-2">Accede a tu cuenta</p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Input
                            label="Email"
                            type="email"
                            placeholder="admin@crm.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <Input
                            label="Contraseña"
                            type="password"
                            placeholder="******"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        {error && <p className="text-sm text-red-600">{error}</p>}
                        <Button type="submit" className="w-full" isLoading={loading}>
                            Entrar
                        </Button>

                        <div className="mt-4 text-xs text-center text-slate-400">
                            <p>Demo Users:</p>
                            <p>admin@crm.com</p>
                            <p>alvaro@crm.com</p>
                            <p>juan@crm.com</p>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
