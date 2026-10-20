import type { MaterialId } from './material';

/** Original CSS material studies. Only this ornament follows the light field. */
export function MaterialObject({ id, compact = false }: { id: MaterialId; compact?: boolean }) {
  return (
    <span
      className={'material-object' + (compact ? ' material-object--compact' : '')}
      data-object={id}
      aria-hidden="true"
    >
      <span className="object-ground" />
      <span className="object-body">
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
      </span>
      <span className="object-satellite" />
      <span className="object-satellite object-satellite--small" />
      <span className="object-caption">BKIT · MATERIAL STUDY</span>
    </span>
  );
}
