import { useSite } from "@/contexts/SiteContext";

type GallerySectionProps = {
  onSelect: (image: string, label: string) => void;
};

export function GallerySection({ onSelect }: GallerySectionProps) {
  const site = useSite();
  const { gallery } = site;

  return (
    <section className="gallery-section" id="galeria">
      <div className="container">
        <div className="gallery-head">
          <div>
            <span className="section-kicker peach-text">{gallery.kicker}</span>
            <h2>
              {gallery.titleLead}
              <br />
              <i>{gallery.titleAccent}</i>
            </h2>
          </div>
          <p>{gallery.intro}</p>
        </div>

        <div className="gallery-grid">
          {gallery.items.map(item => (
            <button
              type="button"
              key={item.label}
              className={`gallery-item ${item.tall ? "tall" : ""}`}
              onClick={() => onSelect(item.image, item.label)}
              aria-label={`Ampliar imagem ${item.label}`}
            >
              <img src={item.image} alt={item.label} loading="lazy" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
