import React from 'react';
import { useStore } from '../context/StoreContext';
import { ArrowRight, Sparkles } from 'lucide-react';

export const CategoryVisualGrid: React.FC = () => {
  const { setFilters, setActiveProductPage } = useStore();

  const categories = [
    {
      title: 'AKS Heritage Silk Panjabis',
      subtitle: 'Pure Mulberry Silk & Intricate Zardozi Neck Embroidery',
      image: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80',
      category: 'men',
      subcategory: 'Panjabis & Kabli',
      badge: 'Festive Luxury',
      badgeColor: 'bg-amber-600',
    },
    {
      title: 'AKS Signature Formal Shirts',
      subtitle: '2-Ply Egyptian Giza Cotton & Wrinkle-Resistant Finish',
      image: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=800&q=80',
      category: 'men',
      subcategory: 'Formal Shirts',
      badge: 'Executive Tailored',
      badgeColor: 'bg-sky-600',
    },
    {
      title: 'AKS Riva Salwar & Jamdani Sarees',
      subtitle: 'Handloom Muslin Jamdani & Organza 3-Piece Festive Ensembles',
      image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80',
      category: 'women',
      subcategory: 'Salwar Kameez & Suits',
      badge: 'Heritage Haute',
      badgeColor: 'bg-rose-600',
    },
    {
      title: 'European Washed Linen & Polos',
      subtitle: 'Breathable 100% French Flax Linen for Tropical Sophistication',
      image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80',
      category: 'men',
      subcategory: 'Casual Shirts & Polos',
      badge: 'Summer Comfort',
      badgeColor: 'bg-emerald-600',
    },
    {
      title: 'Junior Festive & Kids Panjabi',
      subtitle: 'Soft cotton lining, playful motifs & matching father-son sets',
      image: 'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?auto=format&fit=crop&w=800&q=80',
      category: 'kids',
      subcategory: 'All',
      badge: 'Festive Juniors',
      badgeColor: 'bg-orange-500',
    },
    {
      title: 'Kashmiri Shawls & Leather Belts',
      subtitle: 'Pashmina weave shawls, dupattas & full-grain Italian leather accessories',
      image: 'https://images.unsplash.com/photo-1607522370275-f14206abe5d3?auto=format&fit=crop&w=800&q=80',
      category: 'accessories',
      subcategory: 'All',
      badge: 'Atelier Accents',
      badgeColor: 'bg-indigo-600',
    },
  ];

  const handleTileClick = (item: (typeof categories)[0]) => {
    setActiveProductPage(null);
    setFilters((prev) => ({
      ...prev,
      category: item.category as any,
      subcategory: item.subcategory || 'All',
      brand: [],
      searchQuery: '',
    }));
    const catalogEl = document.getElementById('product-catalog-section');
    if (catalogEl) {
      catalogEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#D8232A] uppercase tracking-widest mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              Curated Collections
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
              Explore Our Signature Garment Universes
            </h2>
          </div>
          <p className="text-sm text-neutral-500 max-w-md">
            From artisanal festive panjabis and handloom Jamdani sarees to sharp executive 2-ply cotton shirts, discover garments crafted for discerning elegance.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat, idx) => (
            <div
              key={idx}
              onClick={() => handleTileClick(cat)}
              className="group relative rounded-2xl overflow-hidden shadow-sm hover:shadow-xl border border-neutral-100 transition-all duration-300 cursor-pointer h-72 flex flex-col justify-end p-6"
            >
              {/* Background Image */}
              <img
                src={cat.image}
                alt={cat.title}
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-106 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent" />

              {/* Badge */}
              <div className="relative z-10 mb-auto">
                <span
                  className={`inline-block text-[11px] font-extrabold uppercase tracking-wider text-white px-2.5 py-1 rounded-full shadow-sm ${cat.badgeColor}`}
                >
                  {cat.badge}
                </span>
              </div>

              {/* Content */}
              <div className="relative z-10">
                <h3 className="text-xl font-bold text-white tracking-tight group-hover:text-amber-200 transition-colors">
                  {cat.title}
                </h3>
                <p className="text-xs text-neutral-300 mt-1 line-clamp-1">{cat.subtitle}</p>
                <div className="flex items-center gap-1 text-xs font-bold text-white mt-3 group-hover:translate-x-1 transition-transform">
                  <span>Explore Garments</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
