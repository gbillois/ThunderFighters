# Thunder Fighters

Shoot'em up vertical en pixel art, dans l'esprit de *Strikers 1945*. Il tourne dans le navigateur (PC et mobile) et s'installe comme une application (PWA, jouable hors-ligne).

Tout est généré par le code au lancement : les sprites en pixel art (éclairage, contours, rotations calculées nativement sur 16 directions), les décors des 5 biomes, les explosions, ainsi que la musique et les bruitages 16-bit (synthèse Web Audio). Le dépôt ne contient aucun fichier image ni son, à part l'icône de l'application.

## Contenu

- **5 niveaux** : Océan Pacifique, Canyon du Sahara, Jungle émeraude, Glacier arctique, Forteresse volcanique
- **5 boss à plusieurs phases**, avec des parties destructibles : Steel Leviathan, Sand Behemoth, Black Condor, Frost Titan, Inferno Citadel
- **Mid-boss** : croiseur, train blindé, bombardier géant, brise-glace
- **4 avions jouables**, chacun avec son tir, son arme secondaire, sa bombe et sa super-attaque :
  - P-38 Lightning : tir large et missiles à tête chercheuse
  - P-51 Mustang : rapide, double vulcan et roquettes
  - J7W Shinden : vague perforante et aiguilles latérales
  - Mosquito : lent mais très puissant, avec tapis de bombes
- **3 niveaux de difficulté** : Easy, Normal, Hard (sur Hard, les ennemis lâchent des balles en mourant)
- **Bonus** : P (puissance, 4 niveaux), B (bombe), médailles d'or à enchaîner, vies supplémentaires au score
- Records sauvegardés, options (volumes, scanlines, tir automatique)

## Contrôles

| Action | Clavier | Manette | Tactile |
|---|---|---|---|
| Déplacer | Flèches / WASD | Stick / croix | Glisser n'importe où (déplacement relatif) |
| Tirer | Z / Espace (maintenir) | A | Automatique |
| Bombe | X | B | Bouton BOMB |
| Super | C (jauge pleine) | X / Y | Bouton SUPER |
| Pause | Entrée / Échap | Start | Bouton II |

`M` coupe le son, `F` passe en plein écran.

## Jouer en local

```
npx http-server .   # ou n'importe quel serveur statique
```

Le jeu se lance aussi en ouvrant directement `index.html`. Il n'y a ni build ni dépendance.

## Publier sur GitHub Pages

Settings → Pages → *Deploy from a branch* → `main` / `(root)`.

## Paramètres de debug (URL)

`?stage=3` pour démarrer au niveau 3, `&boss=condor` pour affronter directement un boss, `&god=1` pour l'invincibilité, `&speed=4` pour accélérer le jeu.
