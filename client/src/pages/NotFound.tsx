import { ArrowUpRight } from "lucide-react";
import { Link } from "wouter";
import { useSite } from "@/contexts/SiteContext";

export default function NotFound() {
  const site = useSite();
  return (
    <div className="notfound-page">
      <div className="container notfound-inner">
        <span className="section-kicker peach-text">Erro 404</span>
        <h1>
          Esta página
          <br />
          <i>não existe.</i>
        </h1>
        <p>
          O endereço pode ter mudado ou o conteúdo foi removido. Volte para a
          página inicial para continuar navegando.
        </p>
        <Link className="peach-button" href="/">
          Voltar ao início <ArrowUpRight size={16} />
        </Link>
        <span className="notfound-brand">{site.identity.name}</span>
      </div>
    </div>
  );
}
