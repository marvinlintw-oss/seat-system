// src/components/Layout.tsx
import React from 'react';
import { SidebarContainer } from './Sidebar/SidebarContainer';
import { VenueCanvas } from './VenueCanvas/VenueCanvas';

export const Layout: React.FC = () => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 font-sans">
      <SidebarContainer />
      <div className="flex-1 relative">
        <VenueCanvas />
      </div>
    </div>
  );
};