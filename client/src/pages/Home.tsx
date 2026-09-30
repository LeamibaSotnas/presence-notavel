import { useState } from "react";
import { type PortfolioItem } from "@/config/site.config";
import { useContactActions } from "@/hooks/useContactActions";
import { useScrollLock } from "@/hooks/useScrollLock";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { HeroSection } from "@/components/sections/HeroSection";
import { AboutSection } from "@/components/sections/AboutSection";
import { PortfolioSection } from "@/components/sections/PortfolioSection";
import { EventsSection } from "@/components/sections/EventsSection";
import { GallerySection } from "@/components/sections/GallerySection";
import { NotesSection } from "@/components/sections/NotesSection";
import { AdminConceptSection } from "@/components/sections/AdminConceptSection";
import { ContactSection } from "@/components/sections/ContactSection";
import { InterestSection } from "@/components/sections/InterestSection";
import { ProjectDetailModal } from "@/components/overlays/ProjectDetailModal";
import { Lightbox } from "@/components/overlays/Lightbox";
import { EditableAreasModal } from "@/components/overlays/EditableAreasModal";

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [detail, setDetail] = useState<PortfolioItem | null>(null);
  const [lightbox, setLightbox] = useState<{
    image: string;
    label: string;
  } | null>(null);
  const [editableOpen, setEditableOpen] = useState(false);

  const contact = useContactActions();
  useScrollLock(menuOpen);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="actor-site">
      <SiteHeader
        menuOpen={menuOpen}
        onToggleMenu={() => setMenuOpen(open => !open)}
        onCloseMenu={closeMenu}
        onContact={contact.openWhatsApp}
      />
      <MobileMenu
        open={menuOpen}
        onClose={closeMenu}
        onContact={contact.openWhatsApp}
      />

      <main>
        <HeroSection onContact={contact.openWhatsApp} />
        <AboutSection />
        <PortfolioSection onSelect={setDetail} />
        <EventsSection onContact={contact.openWhatsApp} />
        <GallerySection
          onSelect={(image, label) => setLightbox({ image, label })}
        />
        <NotesSection />
        <InterestSection />
        <AdminConceptSection onOpen={() => setEditableOpen(true)} />
        <ContactSection {...contact} />
      </main>

      <SiteFooter />

      <ProjectDetailModal
        item={detail}
        onClose={() => setDetail(null)}
        onContact={contact.openWhatsApp}
      />
      <Lightbox
        image={lightbox?.image ?? null}
        label={lightbox?.label ?? ""}
        onClose={() => setLightbox(null)}
      />
      <EditableAreasModal
        open={editableOpen}
        onClose={() => setEditableOpen(false)}
      />
    </div>
  );
}
