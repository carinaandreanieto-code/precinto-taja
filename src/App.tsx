/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Home } from './components/Home';
import { IdentifyForm } from './components/IdentifyForm';
import { Search } from './components/Search';
import { Admin } from './components/Admin';
import { Screen } from './types';
import { Toaster } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { doc, getDocFromServer } from 'firebase/firestore';
import { db } from './lib/firebase';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');

  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return <Home onNavigate={setCurrentScreen} />;
      case 'identify':
        return <IdentifyForm onBack={() => setCurrentScreen('home')} />;
      case 'search':
        return <Search onBack={() => setCurrentScreen('home')} />;
      case 'admin':
        return <Admin onBack={() => setCurrentScreen('home')} />;
      default:
        return <Home onNavigate={setCurrentScreen} />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-slate-50 font-sans selection:bg-accent selection:text-slate-900">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentScreen}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="container mx-auto max-w-md px-4 py-8 md:max-w-4xl"
        >
          {renderScreen()}
        </motion.div>
      </AnimatePresence>
      <Toaster position="top-center" />
    </div>
  );
}
