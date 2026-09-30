import { ArrowUpRight } from "lucide-react";
import { type NoteItem } from "@/config/site.config";
import { useSite } from "@/contexts/SiteContext";

/**
 * Card de nota. Vira link de verdade quando o item traz `href`;
 * sem href permanece estático (não simula navegação que não existe).
 */
function NoteCard({ note, index }: { note: NoteItem; index: number }) {
  const inner = (
    <>
      <span>
        {String(index + 1).padStart(2, "0")} · {note.category}
      </span>
      <h3>{note.title}</h3>
      <time>{note.date}</time>
      {note.href ? <ArrowUpRight size={17} /> : null}
    </>
  );

  if (note.href) {
    return (
      <a className="note-card" href={note.href}>
        {inner}
      </a>
    );
  }

  return <article className="note-card">{inner}</article>;
}

export function NotesSection() {
  const site = useSite();
  const { notes } = site;

  // Seção inteira desaparece quando não há publicações.
  if (notes.items.length === 0) return null;

  return (
    <section className="notes-section" id="notas">
      <div className="container">
        <div className="notes-head">
          <div>
            <span className="section-kicker">{notes.kicker}</span>
            <h2>
              {notes.titleLead}
              <br />
              <i>{notes.titleAccent}</i>
            </h2>
          </div>
          <a className="text-arrow" href="#contato">
            Ver todas <ArrowUpRight size={16} />
          </a>
        </div>

        <div className="notes-grid">
          {notes.items.map((note, index) => (
            <NoteCard key={note.title} note={note} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
