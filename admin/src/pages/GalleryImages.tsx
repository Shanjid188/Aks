import { ImageSetManager } from '../components/ImageSetManager';

/**
 * Gallery Images — the image-only banners of the homepage promo gallery, the
 * last section before the footer (rendered by PromoGallery).
 */
export function GalleryImagesPage() {
  return (
    <ImageSetManager
      resource="gallery-banners"
      title="Gallery Images"
      intro="The image grid just above the footer on the home page. Add a picture and it shows up there — nothing else to fill in."
      slotLabels={['Big wide banner', 'Square', 'Square', 'Tall column']}
      guide={{
        title: 'How the grid uses your images',
        rows: [
          { lead: '#1', text: '— big wide banner (≈3:2)' },
          { lead: '#2, #3', text: '— the two squares (1:1)' },
          { lead: '#4', text: '— tall column (≈4:5 portrait)' },
          { lead: '5+', text: '— not shown (the grid holds 4)' },
        ],
        note: 'Until you add anything here the storefront shows its built-in division banners, so the section is never empty.',
      }}
      emptyHint="Add your banner pictures above — they appear on the home page right away."
      capacity={4}
      overCapacityNote="Only the first 4 images are shown on the storefront."
    />
  );
}
