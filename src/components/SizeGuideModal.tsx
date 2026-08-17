import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { X, Ruler, HelpCircle, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

export const SizeGuideModal: React.FC = () => {
  const { isSizeGuideOpen, setIsSizeGuideOpen } = useStore();
  const [selectedCategory, setSelectedCategory] = useState<'panjabi' | 'shirts' | 'women' | 'trousers'>('panjabi');
  const [chestInput, setChestInput] = useState<number>(40);
  const [unit, setUnit] = useState<'inch' | 'cm'>('inch');

  if (!isSizeGuideOpen) return null;

  const getRecommendedSize = (chest: number) => {
    const val = unit === 'inch' ? chest : chest / 2.54;
    if (val < 37) return '38 (S)';
    if (val < 39.5) return '40 (M)';
    if (val < 41.5) return '42 (L)';
    if (val < 43.5) return '44 (XL)';
    return '46 (XXL)';
  };

  const panjabiChart = [
    { size: '38 (S)', chest: '38-39"', length: '40"', sleeve: '24.5"', collar: '15.0"' },
    { size: '40 (M)', chest: '40-41"', length: '42"', sleeve: '25.0"', collar: '15.5"' },
    { size: '42 (L)', chest: '42-43"', length: '44"', sleeve: '25.5"', collar: '16.0"' },
    { size: '44 (XL)', chest: '44-45"', length: '46"', sleeve: '26.0"', collar: '16.5"' },
    { size: '46 (XXL)', chest: '46-47"', length: '47"', sleeve: '26.5"', collar: '17.0"' },
  ];

  const shirtChart = [
    { size: '38 (S / 15)', chest: '38-39"', length: '29"', sleeve: '24.5"', shoulder: '17.5"' },
    { size: '40 (M / 15.5)', chest: '40-41"', length: '30"', sleeve: '25.0"', shoulder: '18.2"' },
    { size: '42 (L / 16)', chest: '42-43"', length: '31"', sleeve: '25.5"', shoulder: '19.0"' },
    { size: '44 (XL / 16.5)', chest: '44-45"', length: '32"', sleeve: '26.0"', shoulder: '19.8"' },
    { size: '46 (XXL / 17)', chest: '46-48"', length: '32.5"', sleeve: '26.5"', shoulder: '20.5"' },
  ];

  const womenChart = [
    { size: '36 (XS)', bust: '34-35"', waist: '28-29"', hip: '38"', kurtiLength: '42"' },
    { size: '38 (S)', bust: '36-37"', waist: '30-31"', hip: '40"', kurtiLength: '44"' },
    { size: '40 (M)', bust: '38-39"', waist: '32-33"', hip: '42"', kurtiLength: '45"' },
    { size: '42 (L)', bust: '40-41"', waist: '34-35"', hip: '44"', kurtiLength: '46"' },
    { size: '44 (XL)', bust: '42-44"', waist: '36-38"', hip: '46"', kurtiLength: '46"' },
  ];

  const trousersChart = [
    { waist: '30"', inseam: '32"', hip: '38"', thigh: '22"', bottom: '14.5"' },
    { waist: '32"', inseam: '32"', hip: '40"', thigh: '23"', bottom: '15.0"' },
    { waist: '34"', inseam: '32"', hip: '42"', thigh: '24"', bottom: '15.5"' },
    { waist: '36"', inseam: '32"', hip: '44"', thigh: '25"', bottom: '16.0"' },
    { waist: '38"', inseam: '32"', hip: '46"', thigh: '26"', bottom: '16.5"' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setIsSizeGuideOpen(false)}
        className="fixed inset-0 bg-black/70 backdrop-blur-xs"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-neutral-200 overflow-hidden z-10 my-auto max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-5 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
          <div className="flex items-center gap-2">
            <Ruler className="w-5 h-5 text-[#D8232A]" />
            <h3 className="font-black text-base text-neutral-900 tracking-tight">
              AKS Garments Measuring & Tailored Fit Guide
            </h3>
          </div>
          <button
            onClick={() => setIsSizeGuideOpen(false)}
            className="p-1 rounded-full text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Interactive Calculator Section */}
          <div className="bg-gradient-to-br from-neutral-900 to-neutral-800 text-white p-6 rounded-2xl shadow-md">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Bespoke Fit Estimator
                </div>
                <h4 className="text-lg font-black text-white">Find Your Tailored Garment Fit</h4>
              </div>

              {/* Category tabs */}
              <div className="flex items-center bg-white/10 rounded-xl p-1 border border-white/20">
                {[
                  { id: 'panjabi', label: 'Panjabi' },
                  { id: 'shirts', label: 'Shirts' },
                  { id: 'women', label: 'Women' },
                  { id: 'trousers', label: 'Trousers' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id as any)}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                      selectedCategory === cat.id ? 'bg-[#D8232A] text-white shadow-xs' : 'text-neutral-300 hover:text-white'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Slider Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
              <div className="sm:col-span-8 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-300">Body Chest / Bust Measurement:</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setUnit('inch')}
                      className={`text-xs px-2 py-0.5 rounded font-bold cursor-pointer ${
                        unit === 'inch' ? 'bg-white text-neutral-900' : 'text-neutral-400'
                      }`}
                    >
                      INCH
                    </button>
                    <button
                      onClick={() => setUnit('cm')}
                      className={`text-xs px-2 py-0.5 rounded font-bold cursor-pointer ${
                        unit === 'cm' ? 'bg-white text-neutral-900' : 'text-neutral-400'
                      }`}
                    >
                      CM
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={unit === 'inch' ? '34' : '86'}
                    max={unit === 'inch' ? '50' : '128'}
                    step="0.5"
                    value={chestInput}
                    onChange={(e) => setChestInput(parseFloat(e.target.value))}
                    className="flex-1 accent-[#D8232A] cursor-pointer"
                  />
                  <span className="text-lg font-black text-white w-20 text-right">
                    {chestInput} {unit}
                  </span>
                </div>
              </div>

              {/* Recommended Size Box */}
              <div className="sm:col-span-4 bg-white/10 border border-white/20 p-4 rounded-xl text-center backdrop-blur-md">
                <span className="text-[10px] uppercase font-bold text-neutral-300 tracking-wider">
                  Recommended Size
                </span>
                <div className="text-2xl font-black text-amber-400 mt-1">
                  {getRecommendedSize(chestInput)}
                </div>
                <div className="text-[11px] text-neutral-300 mt-0.5">
                  Tailored Contemporary Fit
                </div>
              </div>
            </div>
          </div>

          {/* Size Chart Table */}
          <div>
            <h4 className="font-bold text-sm text-neutral-900 mb-3 uppercase tracking-wider">
              {selectedCategory === 'panjabi' && 'AKS Heritage Panjabi Measurement Chart'}
              {selectedCategory === 'shirts' && 'AKS Signature Formal & Linen Shirt Chart'}
              {selectedCategory === 'women' && 'AKS Riva Salwar Kameez & Kurti Size Specs'}
              {selectedCategory === 'trousers' && 'AKS Denim & Tailored Chino Size Specs'}
            </h4>

            <div className="overflow-x-auto border border-neutral-200 rounded-xl">
              {selectedCategory === 'panjabi' && (
                <table className="w-full text-xs text-left">
                  <thead className="bg-neutral-100 text-neutral-600 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-4">Size</th>
                      <th className="py-2.5 px-4">Chest (Inches)</th>
                      <th className="py-2.5 px-4">Length</th>
                      <th className="py-2.5 px-4">Sleeve</th>
                      <th className="py-2.5 px-4">Collar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 font-medium text-neutral-800">
                    {panjabiChart.map((row) => (
                      <tr key={row.size} className="hover:bg-neutral-50">
                        <td className="py-2 px-4 font-bold">{row.size}</td>
                        <td className="py-2 px-4">{row.chest}</td>
                        <td className="py-2 px-4">{row.length}</td>
                        <td className="py-2 px-4">{row.sleeve}</td>
                        <td className="py-2 px-4">{row.collar}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {selectedCategory === 'shirts' && (
                <table className="w-full text-xs text-left">
                  <thead className="bg-neutral-100 text-neutral-600 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-4">Collar / Tag Size</th>
                      <th className="py-2.5 px-4">Chest (Inches)</th>
                      <th className="py-2.5 px-4">Body Length</th>
                      <th className="py-2.5 px-4">Sleeve Length</th>
                      <th className="py-2.5 px-4">Shoulder</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 font-medium text-neutral-800">
                    {shirtChart.map((row) => (
                      <tr key={row.size} className="hover:bg-neutral-50">
                        <td className="py-2 px-4 font-bold">{row.size}</td>
                        <td className="py-2 px-4">{row.chest}</td>
                        <td className="py-2 px-4">{row.length}</td>
                        <td className="py-2 px-4">{row.sleeve}</td>
                        <td className="py-2 px-4">{row.shoulder}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {selectedCategory === 'women' && (
                <table className="w-full text-xs text-left">
                  <thead className="bg-neutral-100 text-neutral-600 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-4">Size</th>
                      <th className="py-2.5 px-4">Bust (Inches)</th>
                      <th className="py-2.5 px-4">Waist</th>
                      <th className="py-2.5 px-4">Hip</th>
                      <th className="py-2.5 px-4">Kameez Length</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 font-medium text-neutral-800">
                    {womenChart.map((row) => (
                      <tr key={row.size} className="hover:bg-neutral-50">
                        <td className="py-2 px-4 font-bold">{row.size}</td>
                        <td className="py-2 px-4">{row.bust}</td>
                        <td className="py-2 px-4">{row.waist}</td>
                        <td className="py-2 px-4">{row.hip}</td>
                        <td className="py-2 px-4">{row.kurtiLength}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {selectedCategory === 'trousers' && (
                <table className="w-full text-xs text-left">
                  <thead className="bg-neutral-100 text-neutral-600 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-4">Waist Size</th>
                      <th className="py-2.5 px-4">Inseam</th>
                      <th className="py-2.5 px-4">Hip</th>
                      <th className="py-2.5 px-4">Thigh</th>
                      <th className="py-2.5 px-4">Bottom Opening</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 font-medium text-neutral-800">
                    {trousersChart.map((row) => (
                      <tr key={row.waist} className="hover:bg-neutral-50">
                        <td className="py-2 px-4 font-bold">{row.waist}</td>
                        <td className="py-2 px-4">{row.inseam}</td>
                        <td className="py-2 px-4">{row.hip}</td>
                        <td className="py-2 px-4">{row.thigh}</td>
                        <td className="py-2 px-4">{row.bottom}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* How to Measure Instructions */}
          <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 text-xs text-neutral-600 space-y-2">
            <h5 className="font-bold text-neutral-900 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-[#D8232A]" /> How to measure for the perfect fit:
            </h5>
            <ol className="list-decimal list-inside space-y-1 text-neutral-600">
              <li><strong>Chest/Bust:</strong> Measure around the fullest part of your chest, keeping the tape horizontal under arms.</li>
              <li><strong>Shoulder:</strong> Measure across the upper back from the tip of one shoulder bone to the other.</li>
              <li><strong>Panjabi/Shirt Length:</strong> Measure straight down from the highest point of the shoulder collar seam.</li>
              <li><strong>Alterations:</strong> Free sleeve and hem length customization is available at all AKS Boutiques.</li>
            </ol>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
