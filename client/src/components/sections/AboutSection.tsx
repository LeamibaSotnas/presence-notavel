import { ArrowUpRight, MapPin } from "lucide-react";
import { siteConfig } from "@/config/site.config";

export function AboutSection() {
  const { about, identity } = siteConfig;

  return (
    <section className="statement-section" id="sobre">
      <div className="container statement-grid">
        <div className="statement-index">
          01 <span>Sobre</span>
        </div>

        <div>
          <span className="section-kicker peach-text">{about.kicker}</span>
          <h2>
            {about.titleLead}
            <br />
            <i>{about.titleAccent}</i>
          </h2>
          <p className="statement-lead">{about.lead}</p>
          <p>{about.body}</p>
          <a className="text-arrow" href="#eventos">
            Conheça a agenda <ArrowUpRight size={16} />
          </a>
        </div>

        <div className="about-aside">
          <div className="about-card">
            <span className="about-quote" aria-hidden="true">
              &ldquo;
            </span>
            <p>{about.quote}</p>
            <span className="about-line" />
          </div>
          <div className="about-location">
            <MapPin size={16} />
            <span>{identity.location}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
