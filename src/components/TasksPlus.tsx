import { useState } from 'react';
import React from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { ChevronLeft, Camera, MapPin } from 'lucide-react';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { toast } from 'sonner';
import { Task } from '../types';

interface TaskProps {
  onBack: () => void;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
}

export function TasksPlus({ onBack, tasks, setTasks }: TaskProps) {
  const items = ['POSTE ROTO', 'CABLE BAJO', 'GANCHO', 'VER SI HAY LINEA'];
  
  const [item, setItem] = useState(items[0]);
  const [comment, setComment] = useState('');

  const handleAddTask = () => {
    const newTask: Task = {
      id: Math.random().toString(36).substring(2, 9),
      item,
      comment,
      photo: null,
      coords: null,
      createdAt: new Date().toLocaleString(),
      finished: false
    };
    setTasks([...tasks, newTask]);
    setComment('');
    toast.success('Tarea cargada');
  };

  const handleFinalize = (id: string, finalComment: string, photo: string, coords: string) => {
    setTasks(tasks.map(t => t.id === id ? {...t, finished: true, finalComment, photo, coords, finalizedAt: new Date().toLocaleString()} : t));
    toast.success('Tarea finalizada');
  };

  const handleDeleteTask = (id: string, pin: string) => {
    if (pin === '123') {
      setTasks(tasks.filter(t => t.id !== id));
      toast.success('Tarea eliminada');
      return true;
    }
    toast.error('PIN incorrecto');
    return false;
  };

  function DeleteTaskDialog({ taskId, onDelete }: { taskId: string, onDelete: (id: string, pin: string) => boolean }) {
      const [pin, setPin] = useState('');
      const [open, setOpen] = useState(false);

      return (
          <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="bg-red-800 text-red-50 hover:bg-red-700">ELIMINAR</Button>
              </DialogTrigger>
              <DialogContent className="bg-neutral-900 border-red-900 text-yellow-50">
                  <DialogHeader>
                      <DialogTitle className="text-red-400">Autenticación Requerida</DialogTitle>
                  </DialogHeader>
                  <Input type="password" placeholder="Ingrese PIN..." value={pin} onChange={e => setPin(e.target.value)} className="bg-neutral-800 text-yellow-50 border-neutral-700"/>
                  <Button className="bg-red-800 hover:bg-red-700 text-white" onClick={() => {
                      if (onDelete(taskId, pin)) {
                          setOpen(false);
                      }
                  }}>Confirmar Eliminación</Button>
              </DialogContent>
          </Dialog>
      )
  }

  function TaskFinisher({ taskId, onFinalize }: { taskId: string, onFinalize: (id: string, comment: string, photo: string, coords: string) => void }) {
    const [finalComment, setFinalComment] = useState('');
    const [photo, setPhoto] = useState<string | null>(null);
    const [coords, setCoords] = useState<string | null>(null);

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button size="sm" className="bg-yellow-400 text-black font-bold hover:bg-yellow-500">FINALIZAR</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-neutral-900 text-yellow-50 border-yellow-500">
                <DialogHeader>
                    <DialogTitle className="text-yellow-400">Finalizar Tarea</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <Textarea placeholder="Comentario obligatorio..." value={finalComment} onChange={e => setFinalComment(e.target.value)} className="bg-neutral-800 text-yellow-50 border-neutral-700" />
                    <Button onClick={() => { setPhoto('foto_capturada.jpg'); toast.success('Foto tomada'); }} className="bg-yellow-400 text-black hover:bg-yellow-500"><Camera className="mr-2"/> {photo ? 'Foto Tomada' : 'Tomar Foto'}</Button>
                    {photo && <p className="text-xs text-yellow-500">Foto: {photo}</p>}
                    <Button onClick={() => { navigator.geolocation.getCurrentPosition((pos) => { setCoords(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`); toast.success('Coordenadas tomadas'); }); }} className="bg-neutral-700 text-yellow-50 hover:bg-neutral-600"><MapPin className="mr-2"/> Tomar Coordenadas</Button>
                    {coords && <p className="text-xs text-yellow-500">Coords: {coords}</p>}
                    <Button disabled={!finalComment} onClick={() => onFinalize(taskId, finalComment, photo || '', coords || '')} className="bg-yellow-400 text-black font-bold hover:bg-yellow-500 w-full">Guardar</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
  }

  return (
    <div className="space-y-6 pb-20 bg-neutral-950 min-h-screen p-4 text-yellow-50">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onBack} className="rounded-full font-black text-xs uppercase px-4 border-2 border-yellow-500 bg-neutral-900 text-yellow-50">
          <ChevronLeft className="w-4 h-4 mr-1" /> VOLVER
        </Button>
        <h1 className="text-xl font-black italic tracking-tight uppercase text-yellow-400 ml-4">TAREAS PLUS</h1>
      </div>

      <Card className="rounded-3xl border-2 border-yellow-500 bg-neutral-900 shadow-xl overflow-hidden">
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <Label className="text-yellow-400">Item</Label>
            <Select value={item} onValueChange={setItem}>
              <SelectTrigger className="bg-neutral-800 text-yellow-50 border-neutral-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-neutral-800 text-yellow-50 border-neutral-700">
                {items.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-yellow-400">Comentario (Opcional)</Label>
            <Textarea value={comment} onChange={e => setComment(e.target.value)} className="bg-neutral-800 text-yellow-50 border-neutral-700" />
          </div>
          <Button onClick={handleAddTask} className="w-full bg-yellow-400 text-black font-black hover:bg-yellow-500">CARGAR TAREA</Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {tasks.sort((a, b) => (a.finished === b.finished ? 0 : a.finished ? 1 : -1)).map(task => (
           <Card key={task.id} className={task.finished ? 'opacity-80 bg-neutral-800 border-neutral-600' : 'bg-neutral-900 border-yellow-500'}>
             <CardContent className="p-4 flex flex-col gap-2">
                <div className="flex justify-between items-center">
                    <div>
                        <p className="font-black text-lg text-yellow-100">{task.item}</p>
                        <p className="text-sm text-yellow-200/70 italic">"{task.comment}"</p>
                        <p className="text-[10px] text-neutral-400">Creada: {task.createdAt}</p>
                    </div>
                    {!task.finished && (
                        <TaskFinisher taskId={task.id} onFinalize={handleFinalize} />
                    )}
                    {task.finished && (
                        <DeleteTaskDialog taskId={task.id} onDelete={handleDeleteTask} />
                    )}
                </div>
                {task.finished && (
                    <div className="mt-2 pt-2 border-t border-yellow-900 text-xs text-yellow-100 space-y-1 bg-black p-3 rounded-lg">
                        <p><span className="font-bold text-yellow-400">Res. Comentario:</span> {task.finalComment}</p>
                        <p><span className="font-bold text-yellow-400">Foto:</span> {task.photo}</p>
                        <p><span className="font-bold text-yellow-400">Coords:</span> {task.coords}</p>
                        <p><span className="font-bold text-yellow-400">Finalizada:</span> {task.finalizedAt}</p>
                    </div>
                )}
             </CardContent>
           </Card>
        ))}
      </div>
    </div>
  );
}
