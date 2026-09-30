import { siteConfig } from "@/config/site.config";
import { BrandMark } from "./BrandMark";

export function SiteFooter() {
  const { footer, isDemo } = siteConfig;

  return (
    <footer className="actor-footer">
      <div className="container footer-top">
        <BrandMark />
        <span>{footer.tagline}</span>
        <div>
          {footer.links.map(link => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </div>
      </div>

      <div className="container footer-bottom">
        <span>
          {footer.copyright}
          {isDemo ? " · Conteúdo demonstrativo" : ""}
        </span>
        <span>{footer.closing}</span>
      </div>
    </footer>
  );
}
