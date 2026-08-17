import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { STORE_LOCATIONS } from '../data/stores';
import { StoreLocation } from '../types';
import {
  X,
  MapPin,
  Phone,
  Clock,
  Navigation,
  Search,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const StoreLocatorModal: React.FC = () => {
  const { isStoreLocatorOpen, setIsStoreLocatorOpen } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDivision, setSelectedDivision] = useState<string>('All');
  const [selectedStore, setSelectedStore] = useState<StoreLocation>(STORE_LOCATIONS[0]);

  if (!isStoreLocatorOpen) return null;

  const divisions = ['All', 'Dhaka', 'Chittagong', 'Sylhet', 'Rajshahi', 'Khulna'];

  const filteredStores = STORE_LOCATIONS.filter((store) => {
    const matchesDiv = selectedDivision === 'All' || store.division.toLowerCase() === selectedDivision.toLowerCase();
    const matchesQuery =
      store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      store.area.toLowerCase().includes(searchQuery.toLowerCase()) ||
      store.address.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDiv && matchesQuery;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setIsStoreLocatorOpen(false)}
        className="fixed inset-0 bg-neutral-950/60 backdrop-blur-xs"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        className="relative bg-white w-full max-w-4xl rounded-2xl shadow-xl border border-neutral-200 overflow-hidden z-10 my-auto max-h-[88vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-5 border-b border-neutral-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center text-[#D8232A]">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 tracking-tight">
                AKS Garments Boutique & Atelier Locator
              </h2>
              <p className="text-xs text-neutral-500">
                Find 45+ bespoke flagship boutiques and atelier studios across Bangladesh
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsStoreLocatorOpen(false)}
            className="p-2 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="p-4 bg-neutral-50 border-b border-neutral-200 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by neighborhood, district, or mall..."
              className="w-full pl-9 pr-4 py-2 bg-white text-xs rounded-xl border border-neutral-200 outline-none focus:border-neutral-900 transition-colors"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {divisions.map((div) => (
              <button
                key={div}
                onClick={() => setSelectedDivision(div)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                  selectedDivision === div
                    ? 'bg-neutral-900 text-white'
                    : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-100'
                }`}
              >
                {div}
              </button>
            ))}
          </div>
        </div>

        {/* Store Grid & Preview */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 min-h-[380px]">
          {/* Store List (5 cols) */}
          <div className="md:col-span-5 border-r border-neutral-200 overflow-y-auto p-3 space-y-2 max-h-[50vh] md:max-h-full">
            {filteredStores.length === 0 ? (
              <div className="text-center py-12 text-xs text-neutral-400">
                No stores found matching your criteria.
              </div>
            ) : (
              filteredStores.map((store) => (
                <div
                  key={store.id}
                  onClick={() => setSelectedStore(store)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left ${
                    selectedStore?.id === store.id
                      ? 'border-[#D8232A] bg-red-50/40 shadow-xs'
                      : 'border-neutral-200 hover:border-neutral-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-neutral-900">{store.name}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#D8232A] bg-red-50 px-2 py-0.5 rounded">
                      {store.isFlagship ? 'Flagship' : 'Retail'}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 line-clamp-2">{store.address}</p>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-neutral-400">
                    <span>{store.division} • {store.area}</span>
                    <span className="font-medium text-emerald-600">Open Today</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Selected Store Detailed View (7 cols) */}
          <div className="md:col-span-7 p-6 flex flex-col justify-between bg-white">
            {selectedStore ? (
              <div className="space-y-5">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#D8232A] bg-red-50 px-2 py-0.5 rounded">
                      {selectedStore.isFlagship ? 'Flagship Store' : 'Official Retail Store'}
                    </span>
                    <span className="text-xs text-neutral-400">ID: {selectedStore.id}</span>
                  </div>
                  <h3 className="text-xl font-bold text-neutral-900 tracking-tight">
                    {selectedStore.name}
                  </h3>
                </div>

                <div className="space-y-3 bg-neutral-50 p-4 rounded-xl border border-neutral-100 text-xs text-neutral-700">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-neutral-900">Address:</p>
                      <p className="text-neutral-600">{selectedStore.address}, {selectedStore.area}, {selectedStore.division}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Clock className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-neutral-900">Operating Hours:</p>
                      <p className="text-neutral-600">{selectedStore.openingHours}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Phone className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-neutral-900">Direct Phone:</p>
                      <p className="text-neutral-600">{selectedStore.phone}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                    Available Store Services & Features
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {selectedStore.features.map((srv, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-neutral-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{srv}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-xs text-neutral-400">
                Select a store to view details.
              </div>
            )}

            {selectedStore && (
              <div className="pt-6 border-t border-neutral-100 flex items-center gap-3">
                <a
                  href={`tel:${selectedStore.phone}`}
                  className="flex-1 py-2.5 px-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold rounded-xl transition-colors text-center flex items-center justify-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call Store</span>
                </a>
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(selectedStore.name + ' ' + selectedStore.address)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-2.5 px-4 bg-[#D8232A] hover:bg-[#b51c22] text-white text-xs font-bold rounded-xl transition-colors text-center flex items-center justify-center gap-1.5"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Get Directions</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
