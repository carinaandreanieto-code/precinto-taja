import React, { useState, useEffect, ChangeEvent } from 'react';
import Papa from 'papaparse';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { 
  ChevronLeft, 
  Filter, 
  Edit2, 
  Trash2, 
  Download, 
  Plus,
  Eye, 
  Map as MapIcon,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, getDocs, orderBy, deleteDoc, doc, updateDoc, where, addDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { Cliente, OperationType, ClienteEstado } from '../types';
import { handleFirestoreError } from '../lib/error-handler';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';

interface AdminProps {
  onBack: () => void;
}

export function Admin({ onBack }: AdminProps) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterState, setFilterState] = useState<ClienteEstado | 'Todos'>('Todos');
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchClientes = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'clientes'), orderBy('fecha', 'desc'));
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cliente));
      setClientes(data);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'clientes');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    const csv = Papa.unparse(clientes.map(c => ({
      'NUMERO CLIENTE': c.numeroCliente,
      'PRECINTO': c.numeroPrecinto,
      'CLIENTE': c.numeroCliente, 
      'TELEFONO': c.telefono,
      'DIRECCION': c.direccion,
      'LATITUD': c.latitud,
      'LONGITUD': c.longitud,
      'OBSERVACIONES': c.observacion,
      'ESTADO': c.estado
    })));
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'clientes.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleMarcarTodosResuelto = async () => {
    try {
      toast.loading('Actualizando estados...');
      const pendientes = clientes.filter(c => c.estado !== 'Resuelto');
      
      if (pendientes.length === 0) {
        toast.info('Todos los registros ya están en estado Resuelto');
        return;
      }

      // Chunk into batches of 500
      for (let i = 0; i < pendientes.length; i += 500) {
        const batch = writeBatch(db);
        const chunk = pendientes.slice(i, i + 500);
        
        chunk.forEach(cliente => {
          const docRef = doc(db, 'clientes', cliente.id!);
          batch.update(docRef, { estado: 'Resuelto' });
        });
        
        await batch.commit();
      }

      toast.success(`Se actualizaron ${pendientes.length} registros a Resuelto`);
      fetchClientes();
    } catch (e) {
      console.error(e);
      toast.error('Error al actualizar estados');
    }
  };

  const handleImportCSV = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const data = results.data as any[];
        toast.loading(`Importando/Actualizando ${data.length} registros...`);
        
        try {
          // Fetch existing clients to map numeroCliente to ID
          const snap = await getDocs(collection(db, 'clientes'));
          const existingClientes = new Map<string, string>();
          snap.docs.forEach(doc => {
            const data = doc.data();
            if (data.numeroCliente) {
              existingClientes.set(data.numeroCliente, doc.id);
            }
          });

          let clientsBatch = writeBatch(db);
          let operationCount = 0;

          for (const row of data) {
            const numeroCliente = (row['NUMERO CLIENTE'] || '').toString().trim();
            if (!numeroCliente) continue;

            // Busca el nombre en diferentes posibles encabezados
            const nombreKeys = ['NOMBRE CLIENTE', 'NOMBRE', 'CLIENTE', 'TITULAR', 'APELLIDO Y NOMBRE', 'APELLIDO_Y_NOMBRE', 'USER'];
            let nombreCSV = '';
            for (const key of nombreKeys) {
              if (row[key]) {
                nombreCSV = row[key].toString().trim();
                break;
              }
            }

            const newClienteData: any = {
              numeroCliente: numeroCliente,
              numeroPrecinto: (row['precinto'] || row['PRECINTO'] || '').toString().trim(),
              telefono: (row['TELEFONO'] || row['TEL'] || '').toString().trim(),
              direccion: `${row['CALLE'] || ''} ${row['ALTURA'] || ''}`.trim(),
              observacion: (row['UBICACION'] || row['OBSERVACIONES'] || '').toString().trim(),
              latitud: parseFloat(row['LAT_MZN'] || row['LATITUD'] || 0),
              longitud: parseFloat(row['LONG_MZN'] || row['LONGITUD'] || 0),
              estado: 'Pendiente',
            };

            // Solo incluimos el nombre si encontramos uno en el CSV
            if (nombreCSV) {
              newClienteData.nombre = nombreCSV;
            }

            if (existingClientes.has(numeroCliente)) {
              // Actualizar existente
              const docId = existingClientes.get(numeroCliente)!;
              const docRef = doc(db, 'clientes', docId);
              
              // Si el nombre ya existe en la DB y el CSV viene vacío para este registro, 
              // no lo sobrescribimos (esto se maneja con el IF de arriba, 
              // pero para mayor seguridad, durante el update solo pasamos los campos definidos)
              clientsBatch.update(docRef, newClienteData);
            } else {
              // Crear nuevo
              newClienteData.fecha = serverTimestamp();
              newClienteData.fotos = [];
              // Si no hay nombre en el CSV, ponemos un valor por defecto o vacío
              if (!newClienteData.nombre) newClienteData.nombre = 'Sin Nombre';
              
              const newDocRef = doc(collection(db, 'clientes'));
              clientsBatch.set(newDocRef, newClienteData);
            }

            operationCount++;
            if (operationCount >= 500) {
              await clientsBatch.commit();
              clientsBatch = writeBatch(db); // Create a new batch
              operationCount = 0;
            }
          }
          await clientsBatch.commit();
          toast.success('Registros importados/actualizados con éxito');
          fetchClientes();
        } catch (e) {
          console.error(e);
          toast.error('Error durante la importación');
        }
      },
      error: (error) => {
        console.error(error);
        toast.error('Error al parsear el archivo CSV');
      }
    });
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteDoc(doc(db, 'clientes', deleteId));
      toast.success('Registro eliminado');
      setClientes(prev => prev.filter(c => c.id !== deleteId));
      setDeleteId(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'clientes');
    }
  };

  const handleUpdate = async () => {
    if (!editingCliente?.id) return;
    try {
      const { id, ...data } = editingCliente;
      await updateDoc(doc(db, 'clientes', id), data as any);
      toast.success('Registro actualizado');
      setClientes(prev => prev.map(c => c.id === id ? editingCliente : c));
      setEditingCliente(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'clientes');
    }
  };

  const filteredClientes = clientes.filter(c => 
    filterState === 'Todos' ? true : c.estado === filterState
  );

  const getStatusIcon = (estado: ClienteEstado) => {
    switch (estado) {
      case 'Resuelto': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'Revisar': return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'Pendiente': return <Clock className="w-4 h-4 text-blue-500" />;
    }
  };

  const getStatusBadge = (estado: ClienteEstado) => {
    switch (estado) {
      case 'Resuelto': return <Badge className="bg-green-500/10 text-green-500 border-green-500/50 border capitalize font-black">{estado}</Badge>;
      case 'Revisar': return <Badge className="bg-accent/10 text-accent border-accent/50 border capitalize font-black">{estado}</Badge>;
      case 'Pendiente': return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/50 border capitalize font-black">{estado}</Badge>;
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden text-slate-400">
            <ChevronLeft className="w-8 h-8" />
          </Button>
          <div>
            <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase">SISTEMA GESTIÓN</h1>
            <p className="text-slate-500 text-xs font-black uppercase tracking-[0.3em]">Instalaciones • Admin Panel</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <Button variant="ghost" size="sm" className="hidden md:flex text-slate-400 font-bold hover:text-white" onClick={onBack}>
            VOLVER
          </Button>
          <Button variant="outline" size="sm" className="btn-sleek-secondary border-none" onClick={fetchClientes}>
            ACTUALIZAR
          </Button>
          <Button size="sm" className="btn-sleek-primary px-6" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-2" /> EXPORTAR CSV
          </Button>
          <Button size="sm" variant="outline" className="bg-green-950/20 text-green-500 border-green-500/20" onClick={handleMarcarTodosResuelto}>
            <CheckCircle2 className="w-4 h-4 mr-2" /> MARCAR TODOS RESUELTO
          </Button>
          <Button size="sm" variant="secondary" className="px-6 relative">
            <input 
              type="file" 
              accept=".csv" 
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={handleImportCSV}
            />
            <Plus className="w-4 h-4 mr-2" /> IMPORTAR CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="md:col-span-1 bg-surface border-border border-2 rounded-[1.5rem] shadow-xl">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-slate-400">
              <Filter className="w-4 h-4" /> Configuración Filtros
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Filtrar por Estado</Label>
              <Select value={filterState} onValueChange={(val: any) => setFilterState(val)}>
                <SelectTrigger className="input-sleek h-12">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent className="bg-surface border-border text-white">
                  <SelectItem value="Todos">Todos</SelectItem>
                  <SelectItem value="Pendiente">Pendiente</SelectItem>
                  <SelectItem value="Revisar">Revisar</SelectItem>
                  <SelectItem value="Resuelto">Resuelto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="pt-6 border-t border-border space-y-4">
              <div className="flex justify-between items-center p-3 bg-slate-900 rounded-xl border border-border">
                <span className="text-[10px] font-black text-slate-500 uppercase">Cargas Totales</span>
                <span className="text-xl font-black text-white">{clientes.length}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-900 rounded-xl border border-border">
                <span className="text-[10px] font-black text-slate-500 uppercase">Pendientes</span>
                <span className="text-xl font-black text-blue-500">{clientes.filter(c => c.estado === 'Pendiente').length}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-3 bg-surface border-border border-2 rounded-[1.5rem] shadow-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="w-12 h-12 animate-spin text-slate-800" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-900/50">
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Nombre</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Precinto</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Cliente</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Fecha Carga</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Estado</TableHead>
                    <TableHead className="text-right font-black text-[10px] uppercase tracking-widest text-slate-400">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClientes.map((cliente) => (
                    <TableRow key={cliente.id} className="border-border hover:bg-slate-800/50 transition-colors">
                      <TableCell className="font-bold text-white uppercase text-xs">{cliente.nombre || 'Sin Nombre'}</TableCell>
                      <TableCell className="font-black text-accent">{cliente.numeroPrecinto}</TableCell>
                      <TableCell className="font-bold text-slate-300">{cliente.numeroCliente || '--'}</TableCell>
                      <TableCell className="text-slate-500 text-[10px] font-bold">
                        {cliente.fecha?.toDate?.() ? cliente.fecha.toDate().toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell>{getStatusBadge(cliente.estado)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-9 w-9 bg-slate-700/50 text-slate-400 hover:text-accent hover:bg-slate-700"
                            onClick={() => setEditingCliente(cliente)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-9 w-9 bg-red-950/20 text-red-900 hover:text-red-500 hover:bg-red-950/40"
                            onClick={() => setDeleteId(cliente.id!)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredClientes.length === 0 && (
                <div className="p-20 text-center space-y-4">
                  <div className="bg-slate-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto opacity-20">
                    <Filter className="w-8 h-8" />
                  </div>
                  <p className="text-slate-600 font-black uppercase tracking-[0.3em] text-[10px]">No se encontraron registros</p>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingCliente} onOpenChange={() => setEditingCliente(null)}>
        <DialogContent className="bg-surface border-border text-white sm:max-w-[500px] rounded-[1.5rem]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-accent font-black uppercase tracking-tighter text-xl">
              <Edit2 className="w-5 h-5 text-accent" />
              Modificar Registro
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-6 border-t border-border mt-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nombre del Cliente</Label>
              <Input 
                value={editingCliente?.nombre} 
                onChange={(e) => setEditingCliente(prev => prev ? { ...prev, nombre: e.target.value } : null)}
                className="input-sleek font-bold text-white h-12"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Precinto</Label>
                <Input 
                  value={editingCliente?.numeroPrecinto} 
                  onChange={(e) => setEditingCliente(prev => prev ? { ...prev, numeroPrecinto: e.target.value } : null)}
                  className="input-sleek font-black text-accent"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Cliente</Label>
                <Input 
                  value={editingCliente?.numeroCliente} 
                  onChange={(e) => setEditingCliente(prev => prev ? { ...prev, numeroCliente: e.target.value } : null)}
                  className="input-sleek font-bold"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Estado Instalación</Label>
              <Select 
                value={editingCliente?.estado} 
                onValueChange={(val: ClienteEstado) => setEditingCliente(prev => prev ? { ...prev, estado: val } : null)}
              >
                <SelectTrigger className="input-sleek h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-surface border-border text-white">
                  <SelectItem value="Pendiente">Pendiente</SelectItem>
                  <SelectItem value="Revisar">Revisar</SelectItem>
                  <SelectItem value="Resuelto">Resuelto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Dirección</Label>
              <Input 
                value={editingCliente?.direccion} 
                onChange={(e) => setEditingCliente(prev => prev ? { ...prev, direccion: e.target.value } : null)}
                className="input-sleek"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Observación</Label>
              <Textarea 
                value={editingCliente?.observacion} 
                onChange={(e) => setEditingCliente(prev => prev ? { ...prev, observacion: e.target.value } : null)}
                className="input-sleek min-h-[100px] resize-none"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setEditingCliente(null)} className="text-slate-500 font-bold hover:text-white">DESCARTAR</Button>
            <Button onClick={handleUpdate} className="btn-sleek-primary h-12 px-8">GUARDAR CAMBIOS</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="bg-surface border-border text-white sm:max-w-[400px] rounded-[1.5rem]">
          <DialogHeader>
            <DialogTitle className="text-red-500 flex items-center gap-2 font-black uppercase tracking-tight">
              <AlertCircle className="w-5 h-5" />
              ¿Eliminar registro?
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 text-slate-400 font-bold text-sm">
            Esta acción no se puede deshacer. Se eliminarán permanentemente los datos del cliente y sus fotos asociadas.
          </div>
          <DialogFooter className="gap-3">
            <Button variant="ghost" onClick={() => setDeleteId(null)} className="flex-1 text-slate-500 font-bold hover:text-white">CANCELAR</Button>
            <Button onClick={handleDelete} variant="destructive" className="flex-1 font-black uppercase tracking-widest bg-red-600 hover:bg-red-700">ELIMINAR</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
