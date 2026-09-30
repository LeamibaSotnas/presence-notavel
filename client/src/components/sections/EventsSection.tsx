import { ArrowUpRight, CalendarDays } from "lucide-react";
import { siteConfig } from "@/config/site.config";

type EventsSectionProps = {
  onContact: () => void;
};

export function EventsSection({ onContact }: EventsSectionProps) {
  const { events } = siteConfig;

  return (
    <section className="event-section" id="eventos">
      <div className="container">
        <div className="event-head">
          <div>
            <span className="section-kicker">{events.kicker}</span>
            <h2>
              {events.titleLead}
              <br />
              <i>{events.titleAccent}</i>
            </h2>
          </div>
          <p>{events.intro}</p>
        </div>

        <div className="events-list">
          {events.items.map(event => {
            const [day, month] = event.date.split(".");
            return (
              <article
                className="event-row"
                key={`${event.date}-${event.title}`}
              >
                <div className="event-date">
                  <b>{day}</b>
                  <span>/ {month}</span>
                </div>
                <div className="event-thumb">
                  <img src={event.image} alt="" loading="lazy" />
                </div>
                <div className="event-copy">
                  <span>{event.place}</span>
                  <h3>{event.title}</h3>
                  <p>{event.description}</p>
                </div>
                <ArrowUpRight className="event-arrow" size={21} />
              </article>
            );
          })}
        </div>

        <div className="event-cta">
          <CalendarDays size={17} />
          <span>{events.ctaLabel}</span>
          <button type="button" onClick={onContact}>
            Vamos conversar <ArrowUpRight size={15} />
          </button>
        </div>
      </div>
    </section>
  );
}
