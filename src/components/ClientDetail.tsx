import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { ChevronLeft, MapPin, Phone, MessageSquare, Navigation, User, Calendar, Clock, BadgeCheck } from 'lucide-react';
import { Cliente } from '../types';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { Badge } from './ui/badge';

interface ClientDetailProps {
  cliente: Cliente;
  onBack: () => void;
}

const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';

export function ClientDetail({ cliente, onBack }: ClientDetailProps) {
  const hasValidMapKey = Boolean(GOOGLE_MAPS_KEY);
  
  const handleWhatsApp = () => {
    const phone = cliente.telefono.replace(/\D/g, '');
    const url = `https://wa.me/549${phone}`;
    window.open(url, '_blank text-button');
  };

  const handleNavigate = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${cliente.latitud},${cliente.longitud}`;
    window.open(url, '_blank');
  };

  const formattedDate = cliente.fecha?.toDate?.() 
    ? cliente.fecha.toDate().toLocaleDateString() 
    : 'N/A';
    
  const formattedTime = cliente.fecha?.toDate?.()
    ? cliente.fecha.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Detalle Cliente</span>
          <h1 className="text-xl font-black italic tracking-tight uppercase">Precinto: {cliente.numeroPrecinto}</h1>
        </div>
      </div>

      <div className="space-y-6">
        {/* Map Section */}
        <div className="h-64 rounded-3xl overflow-hidden border-2 border-neutral-200 shadow-lg relative bg-neutral-100">
          {hasValidMapKey && cliente.latitud && cliente.longitud ? (
            <APIProvider apiKey={GOOGLE_MAPS_KEY}>
              <Map
                defaultCenter={{ lat: cliente.latitud, lng: cliente.longitud }}
                defaultZoom={15}
                mapId="PRECINTO_TAJA_DETAIL_MAP"
                internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                gestureHandling={'greedy'}
                disableDefaultUI={true}
              >
                <AdvancedMarker position={{ lat: cliente.latitud, lng: cliente.longitud }}>
                  <Pin background="#ea580c" borderColor="#fff" glyphColor="#fff" />
                </AdvancedMarker>
              </Map>
            </APIProvider>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-neutral-400 p-8 text-center space-y-2">
              <MapPin className="w-8 h-8 opacity-20" />
              <p className="text-xs font-bold uppercase tracking-widest">Mapa no disponible</p>
              {!hasValidMapKey && <p className="text-[10px] opacity-70">Falta API Key de Google Maps</p>}
            </div>
          )}
          
          {cliente.latitud && (
            <Button 
              onClick={handleNavigate}
              className="absolute bottom-4 right-4 h-12 rounded-xl shadow-xl bg-blue-600 hover:bg-blue-700 font-bold"
            >
              <Navigation className="mr-2 w-5 h-5" />
              IR AL LUGAR
            </Button>
          )}
        </div>

        {/* Photos Gallery */}
        {cliente.fotos && cliente.fotos.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400">Fotos de Instalación</h3>
            <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
              {cliente.fotos.map((url, i) => (
                <img 
                  key={i} 
                  src={url} 
                  alt={`Instalación ${i}`} 
                  className="w-40 h-56 object-cover rounded-2xl border-2 border-white shadow-md flex-shrink-0"
                />
              ))}
            </div>
          </div>
        )}

        {/* Info Grid */}
        <div className="grid grid-cols-1 gap-4">
          <Card className="rounded-2xl border-none bg-white shadow-md overflow-hidden">
            <CardContent className="p-0">
              <div className="p-4 bg-neutral-900 text-white flex justify-between items-center">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest">Estado</p>
                  <p className="font-black text-lg">{cliente.estado}</p>
                </div>
                <Badge variant={cliente.estado === 'Resuelto' ? 'default' : 'secondary'} className="h-8 rounded-full border-2">
                  {cliente.estado}
                </Badge>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-6 border-b pb-6 border-neutral-100">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Num. Cliente</p>
                    <p className="font-bold text-lg">{cliente.numeroCliente || '---'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Fecha Carga</p>
                    <p className="font-bold text-lg">{formattedDate}</p>
                    <p className="text-xs text-neutral-400 font-medium">{formattedTime}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-neutral-100 rounded-xl">
                      <MapPin className="w-5 h-5 text-neutral-600" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Dirección completa</p>
                      <p className="font-bold text-neutral-900">{cliente.direccion || 'No especificada'}</p>
                    </div>
                  </div>
                </div>

                {cliente.observacion && (
                  <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100 italic text-neutral-600 text-sm">
                    "{cliente.observacion}"
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Floating Action footer */}
      {cliente.telefono && (
        <div className="fixed bottom-6 left-0 right-0 px-4 flex justify-center">
          <Button 
            onClick={handleWhatsApp}
            className="w-full max-w-md h-16 rounded-2xl shadow-2xl bg-green-500 hover:bg-green-600 font-black text-xl gap-2"
          >
            <MessageSquare className="w-6 h-6" />
            ENVIAR WHATSAPP
          </Button>
        </div>
      )}
    </div>
  );
}
