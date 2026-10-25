import { forwardRef } from "react";
import type { LucideProps } from "lucide-react";

// Official monochrome brand mark from Simple Icons (CC0-1.0), matching existing Classinus icon components.
export const IconeGoogleSlides = forwardRef<SVGSVGElement, LucideProps>(
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
      <path d="M16.09 15.273H7.91v-4.637h8.18v4.637zm1.728-8.523h2.91v15.614c0 .904-.733 1.636-1.637 1.636H4.909a1.636 1.636 0 0 1-1.636-1.636V1.636C3.273.732 4.005 0 4.909 0h9.068v6.75h3.841zm-.363 2.523H6.545v7.363h10.91V9.273zm-2.728-5.979V6h6.001l-6-6v3.294z" />
    </svg>
  )
);
IconeGoogleSlides.displayName = "IconeGoogleSlides";
