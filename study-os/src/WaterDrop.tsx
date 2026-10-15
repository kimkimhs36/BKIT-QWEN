/** BKIT's water signature. Pure CSS keeps the material crisp on Retina screens. */
export function WaterDrop({ className = '' }: { className?: string }) {
  return (
    <span className={`water-object ${className}`} aria-hidden="true">
      <span className="water-rings"><i /><i /><i /></span>
      <span className="water-drop"><span className="water-drop-light" /></span>
      <span className="water-spark" />
    </span>
  );
}
