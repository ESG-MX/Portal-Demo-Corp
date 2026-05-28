import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/features/Sidebar';
import Header from '../components/features/Header';
const MainLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  return (
    <div className="flex h-screen bg-azul-bersa overflow-hidden w-full">
      <Sidebar isSidebarOpen={isSidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          isSidebarOpen={isSidebarOpen} 
          setIsSidebarOpen={setIsSidebarOpen} 
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-900/20">
          <div className="max-w-[1400px] mx-auto h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
export default MainLayout;