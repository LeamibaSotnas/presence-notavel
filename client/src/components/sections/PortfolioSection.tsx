import { useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { siteConfig, type PortfolioItem } from "@/config/site.config";

const ALL = "Todos";

type PortfolioSectionProps = {
  onSelect: (item: PortfolioItem) => void;
};

export function PortfolioSection({ onSelect }: PortfolioSectionProps) {
  const { portfolio } = siteConfig;
  const [filter, setFilter] = useState(ALL);

  const categories = useMemo(
    () => [ALL, ...new Set(portfolio.items.map(item => item.category))],
    [portfolio.items]
  );

  const visible = useMemo(
    () =>
      filter === ALL
        ? portfolio.items
        : portfolio.items.filter(item => item.category === filter),
    [filter, portfolio.items]
  );

  return (
    <section className="portfolio-section" id="portfolio">
      <div className="container">
        <div className="section-intro">
          <div>
            <span className="section-kicker">{portfolio.kicker}</span>
            <h2>
              {portfolio.titleLead}
              <br />
              <i>{portfolio.titleAccent}</i>
            </h2>
          </div>
          <p>{portfolio.intro}</p>
        </div>

        <div
          className="filter-row"
          role="group"
          aria-label="Filtrar por categoria"
        >
          {categories.map(category => (
            <button
              type="button"
              key={category}
              className={filter === category ? "active" : ""}
              aria-pressed={filter === category}
              onClick={() => setFilter(category)}
            >
              {category}
            </button>
          ))}
          <span className="filter-count">
            {String(visible.length).padStart(2, "0")} trabalhos
          </span>
        </div>

        <div className="portfolio-grid">
          {visible.map((item, index) => (
            <article
              className={`portfolio-card card-${index + 1}`}
              key={item.id}
            >
              <button
                type="button"
                className="portfolio-image"
                onClick={() => onSelect(item)}
                aria-label={`Ver projeto ${item.title}`}
              >
                <img
                  src={item.image}
                  alt={`${item.title} — ${item.category}`}
                  loading="lazy"
                />
                <span className="image-wash" />
                <span className="card-number">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="view-plus" aria-hidden="true">
                  +
                </span>
              </button>

              <div className="portfolio-meta">
                <span>
                  {item.category} · {item.year}
                </span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <button
                  type="button"
                  onClick={() => onSelect(item)}
                  className="text-arrow"
                >
                  Ver projeto <ArrowUpRight size={15} />
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
