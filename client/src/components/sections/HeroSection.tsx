import { ArrowDown, ArrowUpRight } from "lucide-react";
import { useSite } from "@/contexts/SiteContext";

type HeroSectionProps = {
  onContact: () => void;
};

export function HeroSection({ onContact }: HeroSectionProps) {
  const site = useSite();
  const { hero, identity } = site;
  const [stampTop, stampBottom] = hero.stampLabel.split("\n");

  return (
    <section className="actor-hero" id="inicio">
      {/* A imagem vem do config para permitir troca sem mexer no CSS. */}
      <div
        className="hero-image"
        style={{ backgroundImage: `url("${hero.image}")` }}
      />
      <div className="hero-gradient" />
      <div className="hero-grain" />

      <div className="hero-side-label left">{hero.labelLeft}</div>
      <div className="hero-side-label right">{hero.labelRight}</div>

      <div className="container actor-hero-content">
        <div className="hero-top">
          <span>
            <span className="peach-dot" /> Portfólio profissional
          </span>
          <span>Imagem · Presença · Experiência</span>
        </div>

        <div className="hero-copy">
          <span className="hero-small">{hero.eyebrow}</span>
          <h1>
            {hero.titleLead}
            <br />
            <i>{hero.titleAccent}</i>
          </h1>
          <p>{identity.tagline}</p>
          <div className="hero-buttons">
            <button type="button" className="peach-button" onClick={onContact}>
              Fale comigo <ArrowUpRight size={16} />
            </button>
            <a className="light-link" href="#portfolio">
              Ver portfólio <ArrowDown size={16} />
            </a>
          </div>
        </div>

        <div className="hero-bottom">
          <span>Role para descobrir</span>
          <span className="hero-rule" />
          <span className="hero-scroll-num">
            01 / {String(site.nav.length).padStart(2, "0")}
          </span>
        </div>
      </div>

      <div className="hero-stamp">
        <span>{identity.initials}</span>
        <small>
          {stampTop}
          <br />
          {stampBottom}
        </small>
      </div>
    </section>
  );
}
