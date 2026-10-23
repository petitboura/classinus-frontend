import { forwardRef } from "react";
import type { LucideProps } from "lucide-react";

// Microsoft four-square logomark, rendered in monochrome to match existing Classinus integrations.
export const IconeMicrosoft = forwardRef<SVGSVGElement, LucideProps>(
  ({ size = 24, color = "currentColor", strokeWidth: _strokeWidth, className, ...reste }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      className={className}
      {...reste}
    >
      <path d="M1 1h10v10H1zM13 1h10v10H13zM1 13h10v10H1zM13 13h10v10H13z" />
    </svg>
  )
);
IconeMicrosoft.displayName = "IconeMicrosoft";
