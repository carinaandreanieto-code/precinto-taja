import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './ui/card';
import { ChevronLeft, Camera, MapPin, Save, Plus, Loader2, X } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { Cliente, OperationType } from '../types';
import { handleFirestoreError } from '../lib/error-handler';
import { motion, AnimatePresence } from 'motion/react';

interface IdentifyFormProps {
  onBack: () => void;
}

const STORAGE_KEY = 'esaqui_temp_payload';

export function IdentifyForm({ onBack }: IdentifyFormProps) {
  const [loading, setLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    numeroCliente: '',
    numeroPrecinto: '',
    direccion: '',
    telefono: '',
    observacion: '',
    latitud: null as number | null,
    longitud: null as number | null,
  });

  // Load temp data
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFormData(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error('Error loading temp data', e);
      }
    }
  }, []);

  // Auto-save temp data
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
  }, [formData]);

  const getGPS = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocalización no soportada en este dispositivo');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          latitud: position.coords.latitude,
          longitud: position.coords.longitude
        }));
        setIsLocating(false);
        toast.success('Ubicación obtenida');
        if (navigator.vibrate) navigator.vibrate(50);
      },
      (error) => {
        setIsLocating(false);
        toast.error('Error al obtener ubicación: ' + error.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handlePhotoSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setPhotos(prev => [...prev, ...files]);
    
    files.forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const findExistingCliente = async (cliente: string, precinto: string) => {
    if (!cliente && !precinto) return null;
    
    // Primero buscamos por número de cliente que es más restrictivo
    if (cliente) {
      const q = query(collection(db, 'clientes'), where('numeroCliente', '==', cliente));
      try {
        const snap = await getDocs(q);
        if (!snap.empty) return { id: snap.docs[0].id, data: snap.docs[0].data() as Cliente };
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, 'clientes');
      }
    }

    // Si no encontramos por cliente, buscamos por precinto
    if (precinto) {
      const q = query(collection(db, 'clientes'), where('numeroPrecinto', '==', precinto));
      try {
        const snap = await getDocs(q);
        if (!snap.empty) return { id: snap.docs[0].id, data: snap.docs[0].data() as Cliente };
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, 'clientes');
      }
    }

    return null;
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Tiempo de espera agotado al comprimir imagen'));
      }, 15000);

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800; // Un poco más pequeño para optimizar Firestore
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          // Convertimos a Base64 con calidad media para ahorrar espacio en Firestore
          const base64 = canvas.toDataURL('image/jpeg', 0.5);
          clearTimeout(timeout);
          resolve(base64);
        };
        img.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('Error al decodificar la imagen'));
        };
        img.src = event.target?.result as string;
      };
      reader.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async () => {
    setLoading(true);
    const toastId = toast.loading('Procesando reporte...');
    
    try {
      // Check if exists for merging
      const existing = await findExistingCliente(formData.numeroCliente, formData.numeroPrecinto);
      
      // Process photos as Base64 (Free storage in Firestore)
      const newPhotoData: string[] = [];
      if (photos.length > 0) {
        toast.loading(`Procesando ${photos.length} fotos...`, { id: toastId });
        for (let i = 0; i < photos.length; i++) {
          const photo = photos[i];
          try {
            const base64 = await compressImage(photo);
            newPhotoData.push(base64);
            toast.loading(`Fotos: ${i + 1}/${photos.length} procesadas...`, { id: toastId });
          } catch (processError) {
            console.error(`Error procesando foto ${i + 1}:`, processError);
            toast.error(`No se pudo procesar la foto ${i + 1}`, { id: toastId });
          }
        }
      }

      toast.loading('Guardando datos del reporte...', { id: toastId });

      if (existing) {
        // MERGE LOGIC
        const mergedData: any = {
          numeroPrecinto: formData.numeroPrecinto || existing.data.numeroPrecinto,
          numeroCliente: formData.numeroCliente || existing.data.numeroCliente,
          direccion: formData.direccion || existing.data.direccion,
          telefono: formData.telefono || existing.data.telefono,
          estado: 'Pendiente',
          fecha: existing.data.fecha || serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        // Fusionar observaciones
        if (formData.observacion) {
          mergedData.observacion = existing.data.observacion 
            ? `${existing.data.observacion}\n--- NUEVA ANOTACIÓN ---\n${formData.observacion}`
            : formData.observacion;
        } else {
          mergedData.observacion = existing.data.observacion || '';
        }

        // GPS
        mergedData.latitud = formData.latitud ?? existing.data.latitud ?? null;
        mergedData.longitud = formData.longitud ?? existing.data.longitud ?? null;

        // FOTOS (merged Base64/URLs)
        mergedData.fotos = [...(existing.data.fotos || []), ...newPhotoData];

        await updateDoc(doc(db, 'clientes', existing.id), mergedData);
        toast.success('Registro actualizado correctamente', { id: toastId });
      } else {
        // NEW RECORD
        const clienteData = {
          ...formData,
          fotos: newPhotoData,
          estado: 'Pendiente',
          fecha: serverTimestamp(),
        };
        await addDoc(collection(db, 'clientes'), clienteData);
        toast.success('Nuevo cliente guardado con éxito', { id: toastId });
      }
      
      localStorage.removeItem(STORAGE_KEY);
      
      // Final navigation - no delay
      onBack();
    } catch (e) {
      console.error('Error en handleSubmit:', e);
      let errorMessage = 'Error al guardar el reporte';
      if (e instanceof Error) {
        if (e.message.includes('permission')) {
          errorMessage = 'Error de permisos en el servidor';
        } else {
          try {
            const parsed = JSON.parse(e.message);
            errorMessage = parsed.error || e.message;
          } catch {
            errorMessage = e.message;
          }
        }
      }
      toast.error(errorMessage, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="text-slate-400 hover:text-accent">
          <ChevronLeft className="w-8 h-8" />
        </Button>
        <h1 className="text-3xl font-black italic tracking-tight text-white uppercase">IDENTIFICAR</h1>
      </div>

      <Card className="bg-surface border-border shadow-2xl rounded-[2rem] overflow-hidden">
        <CardContent className="p-8 space-y-8">
          <div className="grid grid-cols-1 gap-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Número de Cliente</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  className="input-sleek h-14 text-xl font-bold"
                  placeholder="Ej: 885210"
                  value={formData.numeroCliente}
                  onChange={e => setFormData({ ...formData, numeroCliente: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">Número de Precinto</Label>
                <Input
                  className="input-sleek border-accent/50 bg-slate-900/50 h-14 text-2xl font-black text-accent placeholder:text-accent/30"
                  placeholder="Ej: AX-992-01"
                  value={formData.numeroPrecinto}
                  onChange={e => setFormData({ ...formData, numeroPrecinto: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Ubicación GPS</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    className={`flex-1 h-14 rounded-xl font-bold transition-all ${
                      formData.latitud ? "bg-slate-700 text-green-400 border-green-500/50 border-2" : "btn-sleek-secondary"
                    }`}
                    onClick={getGPS}
                    disabled={isLocating}
                  >
                    {isLocating ? <Loader2 className="w-5 h-5 animate-spin" /> : <MapPin className="w-5 h-5 mr-2" />}
                    {formData.latitud ? "CAPTURADO" : "OBTENER GPS"}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Fotos</Label>
                <Button
                  type="button"
                  className="w-full h-14 rounded-xl font-bold bg-slate-700 border-2 border-slate-600 hover:border-slate-400"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="w-5 h-5 mr-2" />
                  CAPTURAR
                </Button>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handlePhotoSelect}
                />
              </div>
            </div>

            <div className="h-24 bg-slate-900 rounded-xl border border-slate-700 flex items-center justify-center">
              {formData.latitud ? (
                <div className="text-center font-mono text-[10px] text-slate-500">
                  LAT: {formData.latitud.toFixed(6)} <br />
                  LON: {formData.longitud?.toFixed(6)}
                </div>
              ) : (
                <div className="text-[10px] font-bold text-slate-700 uppercase tracking-widest text-center">
                  Sin coordenadas registradas
                </div>
              )}
            </div>

            {photoPreviews.length > 0 && (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                <AnimatePresence>
                  {photoPreviews.map((src, i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="relative flex-shrink-0"
                    >
                      <img src={src} className="w-20 h-20 object-cover rounded-xl border-2 border-slate-600 shadow-md" />
                      <button
                        onClick={() => removePhoto(i)}
                        className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 shadow-lg border-2 border-surface"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            <div className="space-y-6 pt-4 border-t border-slate-700">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Dirección Exacta</Label>
                <Input
                  className="input-sleek h-12"
                  placeholder="Calle, altura, localidad"
                  value={formData.direccion}
                  onChange={e => setFormData({ ...formData, direccion: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Teléfono de contacto</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  className="input-sleek h-12"
                  placeholder="Cód. Área + Número (sin 15)"
                  value={formData.telefono}
                  onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Observaciones</Label>
                <Textarea
                  className="input-sleek min-h-[120px] resize-none p-4"
                  placeholder="Describa irregularidades o detalles relevantes..."
                  value={formData.observacion}
                  onChange={e => setFormData({ ...formData, observacion: e.target.value })}
                />
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="p-8 bg-slate-900/50 border-t border-slate-700">
          <Button
            className="btn-sleek-primary w-full h-16 text-xl"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <Save className="mr-2 h-6 w-6" />}
            FINALIZAR REPORTE
          </Button>
        </CardFooter>
      </Card>
      
      <div className="px-4 py-8 flex items-center justify-center gap-4 text-slate-600 italic text-xs font-medium">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
        CONEXIÓN ESTABLE CON SERVIDOR
      </div>
    </div>
  );
}
