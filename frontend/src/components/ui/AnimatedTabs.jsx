import React, { useEffect, useRef, useState } from 'react';

/**
 * AnimatedTabs – sliding underline indicator tabs.
 *
 * tabs: Array<{ value: string, label: string }>
 * activeTab: string
 * onChange: (value: string) => void
 */
export function AnimatedTabs({ tabs, activeTab, onChange }) {
  const tabRefs = useRef([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const idx = tabs.findIndex((t) => t.value === activeTab);
    const el = tabRefs.current[idx];
    if (el) {
      setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
    }
  }, [activeTab, tabs]);

  return (
    <div className="relative flex bg-gray-100 rounded-xl p-1 gap-1">
      {/* sliding background pill */}
      <span
        className="absolute top-1 bottom-1 bg-white rounded-lg shadow-sm transition-all duration-200 ease-in-out pointer-events-none"
        style={{ left: indicator.left, width: indicator.width }}
        aria-hidden="true"
      />
      {tabs.map((tab, i) => (
        <button
          key={tab.value}
          ref={(el) => (tabRefs.current[i] = el)}
          onClick={() => onChange(tab.value)}
          className={`relative z-10 px-5 py-2 text-sm font-medium rounded-lg transition-colors duration-200 cursor-pointer ${
            activeTab === tab.value
              ? 'text-gray-900'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          type="button"
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
