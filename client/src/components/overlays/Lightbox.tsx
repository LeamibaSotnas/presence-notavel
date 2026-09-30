import { Overlay } from "./Overlay";

type LightboxProps = {
  image: string | null;
  label: string;
  onClose: () => void;
};

export function Lightbox({ image, label, onClose }: LightboxProps) {
  return (
    <Overlay
      open={image !== null}
      onClose={onClose}
      variant="lightbox"
      label={`Imagem ampliada${label ? `: ${label}` : ""}`}
    >
      {image && <img src={image} alt={label || "Galeria ampliada"} />}
    </Overlay>
  );
}
