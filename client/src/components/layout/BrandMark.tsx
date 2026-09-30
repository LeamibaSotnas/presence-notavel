import { useSite } from "@/contexts/SiteContext";

type BrandMarkProps = {
  onClick?: () => void;
};

/** Logotipo textual reutilizado no header, no menu mobile e no footer. */
export function BrandMark({ onClick }: BrandMarkProps) {
  const site = useSite();
  const { initials, firstName, lastName, name } = site.identity;

  return (
    <a
      href="#inicio"
      className="actor-brand"
      onClick={onClick}
      aria-label={name}
    >
      <span className="brand-mark">{initials}</span>
      <span className="brand-word">
        {firstName}
        <br />
        <b>{lastName}</b>
      </span>
    </a>
  );
}
