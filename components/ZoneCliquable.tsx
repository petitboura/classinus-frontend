"use client";

import type { ReactNode } from "react";

// 02/10/2026 : une carte ou une pastille entière s'ouvre au clic, mais elle
// contient d'autres boutons (bascule, menu des trois points). Un vrai
// bouton ne peut pas en contenir d'autres, donc cette zone se comporte
// comme un bouton (clic, Entrée, Espace) sans en être un.
export function ZoneCliquable({
  onClick,
  title,
  className,
  children,
}: {
  onClick: () => void;
  title: string;
  className: string;
  children: ReactNode;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      title={title}
      className={`cursor-pointer ${className}`}
    >
      {children}
    </div>
  );
}
