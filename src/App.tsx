import React from 'react';
import { GameCanvas } from './components/GameCanvas';

export default function App() {
  return (
    <main className="fixed inset-0 w-screen h-screen overflow-hidden bg-black select-none">
      <GameCanvas />
    </main>
  );
}
