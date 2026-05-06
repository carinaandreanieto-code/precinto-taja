import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, Search as SearchIcon, MapPin, Hash, ArrowRight, Loader2, X } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy, limit, startAt, endAt } from 'firebase/firestore';
import { Cliente, OperationType } from '../types';
import { handleFirestoreError } from '../lib/error-handler';
import { ClientDetail } from './ClientDetail';
import { motion, AnimatePresence } from 'motion/react';

interface SearchProps {
  onBack: () => void;
}

export function Search({ onBack }: SearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);

  const performSearch = async (term: string) => {
    if (!term) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const clientesCol = collection(db, 'clientes');
      
      // We search by seal number (primary), customer num, address, phone
      // Firestore doesn't support easy full-text multi-field search without third-party services
      // So we'll fetch a broad set and filter client-side for this demo, or do multiple queries
      
      // Query 1: By Numero Precinto
      const qPrecinto = query(clientesCol, where('numeroPrecinto', '==', term));
      const snapPrecinto = await getDocs(qPrecinto);
      
      // Query 2: By Numero Cliente
      const qCliente = query(clientesCol, where('numeroCliente', '==', term));
      const snapCliente = await getDocs(qCliente);

      const searchResults: Cliente[] = [];
      snapPrecinto.forEach(doc => searchResults.push({ id: doc.id, ...doc.data() } as Cliente));
      snapCliente.forEach(doc => {
        if (!searchResults.find(r => r.id === doc.id)) {
          searchResults.push({ id: doc.id, ...doc.data() } as Cliente);
        }
      });

      // If no results, try partial match on string fields if term is long enough
      if (searchResults.length === 0 && term.length >= 3) {
        const qAddress = query(clientesCol, orderBy('direccion'), startAt(term), endAt(term + '\uf8ff'), limit(10));
        const snapAddress = await getDocs(qAddress);
        snapAddress.forEach(doc => {
          if (!searchResults.find(r => r.id === doc.id)) {
            searchResults.push({ id: doc.id, ...doc.data() } as Cliente);
          }
        });
      }

      setResults(searchResults);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'clientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm) performSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  if (selectedCliente) {
    return <ClientDetail cliente={selectedCliente} onBack={() => setSelectedCliente(null)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="text-slate-400 hover:text-accent">
          <ChevronLeft className="w-8 h-8" />
        </Button>
        <h1 className="text-3xl font-black italic tracking-tight text-white uppercase">BUSCAR</h1>
      </div>

      <div className="relative">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-6 h-6" />
        <Input
          className="input-sleek h-16 pl-14 pr-4 text-xl font-bold bg-slate-900 border-border"
          placeholder="Precinto, Cliente, Dirección..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-slate-700" />
          </div>
        ) : results.length > 0 ? (
          <AnimatePresence>
            {results.map((cliente) => (
              <motion.div
                key={cliente.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <Card 
                  className="bg-surface border-border border-2 rounded-2xl shadow-xl hover:border-accent/40 transition-all cursor-pointer active:scale-[0.98] group"
                  onClick={() => setSelectedCliente(cliente)}
                >
                  <CardContent className="p-6 flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black bg-accent/10 text-accent border border-accent/20 px-2 py-0.5 rounded-md uppercase tracking-wider">P-PRECINTO</span>
                        <h3 className="font-black text-2xl text-white tracking-tighter group-hover:text-accent transition-colors">{cliente.numeroPrecinto}</h3>
                      </div>
                      <div className="flex flex-col text-sm text-slate-400 font-bold tracking-tight">
                        <span className="flex items-center gap-2"><Hash className="w-4 h-4 opacity-50" /> {cliente.numeroCliente}</span>
                        <span className="flex items-center gap-2 line-clamp-1"><MapPin className="w-4 h-4 opacity-50" /> {cliente.direccion || 'Ubicación sin especificar'}</span>
                      </div>
                    </div>
                    <div className="w-12 h-12 bg-slate-700 rounded-xl flex items-center justify-center group-hover:bg-accent group-hover:text-slate-900 transition-colors">
                      <ArrowRight className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        ) : searchTerm.length > 0 ? (
          <div className="text-center py-20 space-y-4">
            <div className="bg-red-500/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
              <X className="w-10 h-10 text-red-500" />
            </div>
            <div className="space-y-1">
              <p className="text-slate-300 font-black uppercase tracking-widest text-lg italic">Sin Resultados</p>
              <p className="text-slate-500 text-xs font-bold">Verifique el número de precinto o cliente ingresado</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 space-y-6">
            <div className="bg-slate-800 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto border-2 border-slate-700">
              <SearchIcon className="w-10 h-10 text-slate-600" />
            </div>
            <div className="space-y-2">
              <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-xs">Módulo de búsqueda avanzada</p>
              <p className="text-slate-700 text-[10px] font-bold">Indexando {results.length} registros en red local</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
