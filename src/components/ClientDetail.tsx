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

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="hover:bg-neutral-200">
          <ChevronLeft className="w-6 h-6 text-neutral-900" />
        </Button>
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600">Detalle Cliente</span>
          <h1 className="text-xl font-black italic tracking-tight uppercase text-neutral-900">Precinto: {cliente.numeroPrecinto}</h1>
        </div>
      </div>

      <div className="space-y-6">
        {/* Map Section */}
        <div className="h-64 rounded-3xl overflow-hidden border-2 border-neutral-300 shadow-lg relative bg-neutral-100 z-0">
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
            <div className="flex flex-col items-center justify-center h-full text-neutral-500 p-8 text-center space-y-2">
              <MapPin className="w-8 h-8 opacity-40" />
              <p className="text-xs font-black uppercase tracking-widest">Mapa no disponible</p>
            </div>
          )}
          
          {cliente.latitud && (
            <Button 
              onClick={handleNavigate}
              className="absolute bottom-4 right-4 h-12 rounded-xl shadow-xl bg-blue-700 hover:bg-blue-800 text-white font-black z-[1000] border-2 border-white"
            >
              <Navigation className="mr-2 w-5 h-5" />
              IR AL LUGAR
            </Button>
          )}
        </div>

        {/* Photos Gallery */}
        {cliente.fotos && cliente.fotos.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-neutral-600 ml-1">Fotos de Instalación</h3>
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
          <Card className="rounded-3xl border-none bg-white shadow-xl overflow-hidden ring-1 ring-neutral-200">
            <CardContent className="p-0">
              <div className="p-5 bg-neutral-900 text-white flex justify-between items-center">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-black opacity-70 uppercase tracking-widest">Estado de Gestión</p>
                  <p className="font-black text-2xl uppercase italic leading-none">{cliente.estado}</p>
                </div>
                <Badge 
                  className={`h-10 px-4 rounded-full border-2 font-black uppercase tracking-wider ${
                    cliente.estado === 'Resuelto' 
                    ? 'bg-green-500 border-green-300 text-white' 
                    : 'bg-amber-500 border-amber-300 text-white'
                  }`}
                >
                  {cliente.estado}
                </Badge>
              </div>
              <div className="p-6 space-y-8">
                <div className="grid grid-cols-2 gap-8 border-b pb-8 border-neutral-100">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-neutral-600 uppercase tracking-widest">Num. Cliente</p>
                    <p className="font-black text-2xl text-neutral-950 tracking-tight">{cliente.numeroCliente || '---'}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-neutral-600 uppercase tracking-widest">Cargado el</p>
                    <div>
                      <p className="font-black text-xl text-neutral-950 leading-none">{formattedDate}</p>
                      <p className="text-sm text-neutral-700 font-bold mt-1 uppercase tracking-tighter">{formattedTime} HS</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-neutral-100 rounded-2xl border border-neutral-200">
                      <MapPin className="w-6 h-6 text-neutral-950" />
                    </div>
                    <div className="space-y-1.5 pt-0.5">
                      <p className="text-[10px] font-black text-neutral-600 uppercase tracking-widest">Dirección completa</p>
                      <p className="font-black text-lg text-neutral-950 leading-tight">{cliente.direccion || 'No especificada'}</p>
                    </div>
                  </div>

                  {cliente.observacion && (
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-neutral-100 rounded-2xl border border-neutral-200">
                        <MessageSquare className="w-6 h-6 text-neutral-950" />
                      </div>
                      <div className="space-y-1.5 pt-0.5 w-full">
                        <p className="text-[10px] font-black text-neutral-600 uppercase tracking-widest">Observaciones</p>
                        <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-200 italic text-neutral-950 text-base leading-relaxed">
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
      {cliente.telefono && (
        <div className="fixed bottom-6 left-0 right-0 px-4 flex justify-between gap-3 z-50">
          <Button 
            onClick={handleCall}
            className="flex-1 h-16 rounded-2xl shadow-2xl bg-sky-600 hover:bg-sky-700 font-black text-lg gap-2 border-b-4 border-sky-800 transform active:translate-y-1 transition-all"
          >
            <Phone className="w-6 h-6" />
            LLAMAR
          </Button>
          <Button 
            onClick={handleWhatsApp}
            className="flex-1 h-16 rounded-2xl shadow-2xl bg-emerald-600 hover:bg-emerald-700 font-black text-lg gap-2 border-b-4 border-emerald-800 transform active:translate-y-1 transition-all"
          >
            <MessageSquare className="w-6 h-6" />
            WHATSAPP
          </Button>
        </div>
      )}
    </div>
  );
}
