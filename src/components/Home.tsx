import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Shield, Search, MapPin, Lock } from 'lucide-react';
import { Screen } from '../types';
import { toast } from 'sonner';

interface HomeProps {
  onNavigate: (screen: Screen) => void;
}

export function Home({ onNavigate }: HomeProps) {
  const [isAdminDialogOpen, setIsAdminDialogOpen] = useState(false);
  const [password, setPassword] = useState('');

  const handleAdminAccess = () => {
    if (password === 'tajamar123') {
      setIsAdminDialogOpen(false);
      onNavigate('admin');
    } else {
      toast.error('Contraseña incorrecta');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-12">
      <div className="text-center space-y-2">
        <h1 className="text-6xl font-black tracking-tighter text-accent italic drop-shadow-lg text-center leading-none">PRECINTO<br/>TAJA</h1>
        <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-xs">Técnicos en campo</p>
      </div>

      <div className="grid grid-cols-1 gap-8 w-full">
        <Button
          onClick={() => onNavigate('identify')}
          className="btn-sleek-primary h-36 text-3xl flex flex-col gap-2 hover:scale-[1.02] active:scale-[0.98]"
        >
          <MapPin className="w-10 h-10" />
          IDENTIFICAR
        </Button>

        <Button
          onClick={() => onNavigate('search')}
          className="btn-sleek-secondary h-36 text-3xl flex flex-col gap-2 hover:scale-[1.02] active:scale-[0.98]"
        >
          <Search className="w-10 h-10" />
          BUSCAR
        </Button>

        <div className="pt-8 flex flex-col items-center space-y-4">
          <Button
            onClick={() => setIsAdminDialogOpen(true)}
            variant="ghost"
            className="text-slate-500 font-bold tracking-widest uppercase hover:text-accent transition-colors flex items-center gap-2"
          >
            <Shield className="w-4 h-4" />
            PANEL DE GESTIÓN
          </Button>
        </div>
      </div>

      <Dialog open={isAdminDialogOpen} onOpenChange={setIsAdminDialogOpen}>
        <DialogContent className="bg-surface border-border text-white sm:max-w-[425px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-accent uppercase font-black tracking-tight">
              <Lock className="w-5 h-5" />
              Acceso Restringido
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-6">
            <div className="grid gap-2">
              <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contraseña Administrativa</Label>
              <Input
                type="password"
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdminAccess()}
                className="input-sleek h-14 text-xl tracking-widest"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAdminAccess} className="btn-sleek-primary w-full h-14 text-xl">
              INGRESAR
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <footer className="pt-12 text-slate-600 text-[10px] font-bold uppercase tracking-[0.4em]">
        v1.0.0 • Professional Field Ops
      </footer>
    </div>
  );
}
