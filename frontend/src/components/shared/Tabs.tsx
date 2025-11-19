import React from 'react';
import Button from './Button';

interface Tab {
  id: string;
  label: string;
  badge?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onTabChange, className = '' }) => {
  return (
    <div className={`mb-8 ${className}`}>
      <nav className="flex gap-3 bg-black/40 backdrop-blur-sm p-2 rounded-2xl shadow-2xl border border-purple-500/30">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant="tab"
            active={activeTab === tab.id}
            onClick={() => onTabChange(tab.id)}
            className="flex items-center gap-2"
          >
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="px-2.5 py-0.5 bg-purple-500/40 backdrop-blur-sm text-white rounded-full text-xs font-bold border border-purple-400/30">
                {tab.badge}
              </span>
            )}
          </Button>
        ))}
      </nav>
    </div>
  );
};

export default Tabs;

