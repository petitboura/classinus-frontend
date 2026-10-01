// Declaration minimale, volontairement limitee a ce que plugin.mts utilise
// reellement (app.getPath). Le vrai module "electron" (avec tous ses types)
// est fourni au moment de l'execution par l'appli hote (voir
// clovis-frontend/electron/package.json, qui a deja "electron" en
// devDependency) -- l'installer aussi ici, dans ce petit paquet de plugin,
// forcerait un telechargement complet du binaire Electron pour rien.
declare module "electron" {
  interface AppMinimal {
    getPath(name: "userData" | (string & {})): string;
  }
  export const app: AppMinimal;
}
