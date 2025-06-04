import React, { useState } from 'react';
import CurrentlyViewing from './CurrentlyViewing';
import useClientStore from '@/hooks/useClientStore';
import AiInfo from './AiInfo';
import OrbitInfo from './OrbitInfo';
import SatelliteImage from './SatelliteImage';

enum Tab {
  AI = 'ai',
  ORBIT = 'orbit',
}

const SidePanel: React.FC = () => {
  const { selectedSatellite } = useClientStore();
  const [activeTab, setActiveTab] = useState<Tab>(Tab.AI);

  return (
    <div className="w-[400px] h-full bg-[rgba(25,25,25,0.85)] text-white z-[1000] overflow-y-auto">
      <section className="p-4">
        <CurrentlyViewing />
      </section>

      {selectedSatellite && (
        <>
          <hr className="border-white/20"/>
          
          <section className="py-4 px-12">
            <SatelliteImage selectedSatellite={selectedSatellite} />
          </section>

          <hr className="border-white/20"/>

          <section className="p-4">
            <div className="flex gap-8 relative">
              <button 
                className={`bg-transparent border-none text-[rgba(255,255,255,0.6)] cursor-pointer transition-all duration-200 font-['Inter',sans-serif] text-sm font-medium tracking-[-0.03em] relative hover:text-[rgba(255,255,255,0.8)] ${activeTab === Tab.AI ? 'text-white after:content-[""] after:absolute after:bottom-[-8px] after:left-0 after:right-0 after:h-[2px] after:bg-white after:transition-all after:duration-200' : ''}`}
                onClick={() => setActiveTab(Tab.AI)}
              >
                A.I. Insights
              </button>
              <button 
                className={`bg-transparent border-none text-[rgba(255,255,255,0.6)] cursor-pointer transition-all duration-200 font-['Inter',sans-serif] text-sm font-medium tracking-[-0.03em] relative hover:text-[rgba(255,255,255,0.8)] ${activeTab === Tab.ORBIT ? 'text-white after:content-[""] after:absolute after:bottom-[-8px] after:left-0 after:right-0 after:h-[2px] after:bg-white after:transition-all after:duration-200' : ''}`}
                onClick={() => setActiveTab(Tab.ORBIT)}
              >
                Orbit Info
              </button>
            </div>
            <div className="mt-8 rounded-lg">
              {activeTab === Tab.AI && (
                <AiInfo selectedSatellite={selectedSatellite} />
              )}
              {activeTab === Tab.ORBIT && (
                <OrbitInfo selectedSatellite={selectedSatellite} />
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default SidePanel;
