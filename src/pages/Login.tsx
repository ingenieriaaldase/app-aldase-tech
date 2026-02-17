import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import logo from '../assets/logo.png';


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
        console.log('[Login] Starting login process for:', email);

        try {
            await login(email, password);
            console.log('[Login] Login successful, navigating...');
            navigate('/dashboard');
        } catch (err: any) {
            console.error('[Login] Error caught:', err);
            setError(err.message || 'Error al iniciar sesión');
        } finally {
            console.log('[Login] Finally block reached, stopping loading');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-6">
                        <img src={logo} alt="ALDASE TECH" className="h-24 object-contain" />
                    </div>


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


                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
