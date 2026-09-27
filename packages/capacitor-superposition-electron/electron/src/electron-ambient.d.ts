// Declaration minimale, volontairement limitee a ce que plugin.mts utilise
// reellement. Le vrai module "electron" (avec tous ses types) est fourni
// au moment de l'execution par l'appli hote (clovis-frontend/electron/
// package.json, qui a deja "electron" en devDependency) -- l'installer
// aussi ici forcerait un telechargement complet du binaire Electron pour
// rien, meme raisonnement que le plugin Dossiers du Lot Q.
declare module "electron" {
  interface RectangleMinimal {
    x: number;
    y: number;
    width: number;
    height: number;
  }
  export class BrowserWindow {
    static getAllWindows(): BrowserWindow[];
    isDestroyed(): boolean;
    getTitle(): string;
    getContentBounds(): RectangleMinimal;
    setIgnoreMouseEvents(ignore: boolean, options?: { forward?: boolean }): void;
  }
}
