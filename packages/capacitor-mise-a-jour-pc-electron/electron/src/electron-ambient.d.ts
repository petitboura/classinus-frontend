// Declaration minimale, limitee a ce que plugin.mts utilise reellement
// (app.getVersion, app.isPackaged). Le vrai module "electron" est fourni a
// l'execution par l'appli hote : l'installer ici forcerait un telechargement
// complet du binaire Electron pour rien (meme principe que le plugin Dossiers).
declare module "electron" {
  interface AppMinimal {
    getVersion(): string;
    readonly isPackaged: boolean;
  }
  export const app: AppMinimal;
}
