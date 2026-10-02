// La librairie fournit bien des types (build/index.d.ts), mais son
// package.json "exports" ne déclare pas de condition "types" -- sous
// resolution stricte des "exports", TypeScript ne les trouve pas tout
// seul. Déclaration minimale ici plutôt que de toucher au tsconfig global.
declare module "vh-sticky-table-header" {
  export default class StickyTableHeader {
    constructor(
      tableContainer: HTMLTableElement,
      cloneContainer: HTMLTableElement,
      top: { max: number | string; [breakpointPx: number]: number | string }
    );
    destroy(): void;
  }
  export { StickyTableHeader };
}
