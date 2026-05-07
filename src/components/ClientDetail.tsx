import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { ChevronLeft, MapPin, Phone, MessageSquare, Navigation, User, Calendar, Clock, BadgeCheck } from 'lucide-react';
import { Cliente } from '../types';
import { Badge } from './ui/badge';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface ClientDetailProps {
  cliente: Cliente;
  onBack: () => void;
}

export function ClientDetail({ cliente, onBack }: ClientDetailProps) {
  const handleWhatsApp = () => {
    const phone = cliente.telefono.replace(/\D/g, '');
    const url = `https://wa.me/549${phone}`;
    window.open(url, '_blank');
  };

  const handleCall = () => {
    window.location.href = `tel:${cliente.telefono}`;
  };

  const handleNavigate = () => {
    // We can use Google Maps for navigation URL or OSM, Google is usually better for mobile routing
    const url = `https://www.google.com/maps/dir/?api=1&destination=${cliente.latitud},${cliente.longitud}`;
    window.open(url, '_blank');
  };

  const formattedDate = cliente.fecha?.toDate?.() 
    ? cliente.fecha.toDate().toLocaleDateString() 
    : 'N/A';
    
  const formattedTime = cliente.fecha?.toDate?.()
    ? cliente.fecha.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  console.log('ClientDetail cliente:', cliente);
  return (
    <div className="space-y-6 pb-32">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onBack} className="rounded-full font-black text-xs uppercase px-4 border-2 border-neutral-300">
          <ChevronLeft className="w-4 h-4 mr-1" /> VOLVER
        </Button>
        <div className="flex flex-col ml-2">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">Número de Precinto</span>
          <div className="bg-indigo-600 text-white px-4 py-1 rounded-full inline-block mt-1">
            <h1 className="text-2xl font-black tracking-tight uppercase">{cliente.numeroPrecinto}</h1>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Map Section */}
        <div className="h-64 rounded-3xl overflow-hidden border-2 border-neutral-200 shadow-inner relative bg-indigo-50 z-0">
          {cliente.latitud && cliente.longitud ? (
            <MapContainer 
              center={[cliente.latitud, cliente.longitud]} 
              zoom={15} 
              scrollWheelZoom={false}
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={[cliente.latitud, cliente.longitud]}>
                <Popup>
                  <span className="font-bold">Ubicación de instalación</span>
                </Popup>
              </Marker>
            </MapContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-indigo-400 p-8 text-center space-y-2">
              <MapPin className="w-8 h-8 opacity-40" />
              <p className="text-xs font-black uppercase tracking-widest">Mapa no disponible</p>
            </div>
          )}
          
          {cliente.latitud && (
            <Button 
              onClick={handleNavigate}
              className="absolute bottom-4 right-4 h-12 rounded-xl shadow-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-950 font-black z-[1000] border-2 border-indigo-200"
            >
              <Navigation className="mr-2 w-5 h-5" />
              IR AL LUGAR
            </Button>
          )}
        </div>

        {/* Photos Gallery */}
        {cliente.fotos && cliente.fotos.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-black uppercase tracking-widest text-indigo-900 ml-1 mb-2">Fotos de Instalación</h3>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide px-1">
              {cliente.fotos.map((url, i) => (
                <img 
                  key={i} 
                  src={url} 
                  alt={`Instalación ${i}`} 
                  className="w-48 h-64 object-cover rounded-2xl border-4 border-white shadow-xl flex-shrink-0"
                />
              ))}
            </div>
          </div>
        )}

        {/* Info Grid */}
        <div className="grid grid-cols-1 gap-4">
          <Card className="rounded-3xl border-none bg-indigo-50/50 shadow-lg overflow-hidden ring-1 ring-neutral-100">
            <CardContent className="p-0">
              <div className="p-5 bg-sky-100 text-sky-950 flex justify-between items-center">
                <div className="space-y-0.5">
                  <p className="text-xs font-black opacity-90 uppercase tracking-widest text-sky-950">Estado de Gestión</p>
                  <p className="font-black text-3xl uppercase italic leading-none text-sky-950">{cliente.estado}</p>
                </div>
                <Badge 
                  className={`h-10 px-4 rounded-full border-2 font-black uppercase tracking-wider ${
                    cliente.estado === 'Resuelto' 
                    ? 'bg-emerald-200 border-emerald-400 text-emerald-950' 
                    : 'bg-amber-200 border-amber-400 text-amber-950'
                  }`}
                >
                  {cliente.estado}
                </Badge>
              </div>
              <div className="p-6 space-y-8">
                <div className="grid grid-cols-2 gap-8 border-b pb-8 border-indigo-100">
                  <div className="space-y-2">
                    <p className="text-xs font-black text-indigo-900 uppercase tracking-widest">Num. Cliente</p>
                    <p className="font-black text-4xl text-indigo-950 tracking-tight">{cliente.numeroCliente || '---'}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-black text-indigo-900 uppercase tracking-widest">Cargado el</p>
                    <div>
                      <p className="font-black text-2xl text-indigo-950 leading-none">{formattedDate}</p>
                      <p className="text-base text-indigo-900 font-black mt-1 uppercase tracking-tighter">{formattedTime} HS</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-white rounded-2xl border border-indigo-200 shadow-sm">
                      <MapPin className="w-8 h-8 text-indigo-600" />
                    </div>
                    <div className="space-y-1.5 pt-0.5">
                      <p className="text-xs font-black text-indigo-900 uppercase tracking-widest">Dirección completa</p>
                      <p className="font-black text-xl text-indigo-950 leading-tight">{cliente.direccion || 'No especificada'}</p>
                    </div>
                  </div>

                  {cliente.observacion && (
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-white rounded-2xl border border-indigo-200 shadow-sm">
                        <MessageSquare className="w-8 h-8 text-indigo-600" />
                      </div>
                      <div className="space-y-1.5 pt-0.5 w-full">
                        <p className="text-xs font-black text-indigo-900 uppercase tracking-widest">Observaciones</p>
                        <div className="bg-white/80 p-5 rounded-2xl border border-indigo-200 italic text-indigo-950 text-xl font-bold leading-relaxed">
                          "{cliente.observacion}"
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Floating Action footer */}
      <div className="fixed bottom-6 left-0 right-0 px-4 flex justify-between gap-4 z-50">
        <Button 
          onClick={handleCall}
          disabled={!cliente.telefono}
          className={`flex-1 h-20 rounded-3xl font-black text-2xl gap-3 text-white border-2 border-white transition-all ${
            cliente.telefono 
              ? 'shadow-[0_8px_0_rgb(12,74,110)] bg-sky-600 hover:bg-sky-500' 
              : 'bg-neutral-500 cursor-not-allowed opacity-50'
          }`}
        >
          <Phone className="w-8 h-8" />
          {cliente.telefono ? 'LLAMAR' : 'SIN TEL'}
        </Button>
        <Button 
          onClick={handleWhatsApp}
          disabled={!cliente.telefono}
          className={`flex-1 h-20 rounded-3xl font-black text-2xl gap-3 text-white border-2 border-white transition-all ${
            cliente.telefono 
              ? 'shadow-[0_8px_0_rgb(6,78,59)] bg-emerald-600 hover:bg-emerald-500' 
              : 'bg-neutral-500 cursor-not-allowed opacity-50'
          }`}
        >
          <MessageSquare className="w-8 h-8" />
          {cliente.telefono ? 'WHATSAPP' : 'SIN WA'}
        </Button>
      </div>
    </div>
  );
}
