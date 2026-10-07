# Thunder Fighters

Shoot'em up vertical en pixel art, dans l'esprit de *Strikers 1945*. Il tourne dans le navigateur (PC et mobile) et s'installe comme une application (PWA, jouable hors-ligne).

**Jouer : https://gbillois.github.io/ThunderFighters/**

Tout est généré par le code au lancement : les sprites en pixel art (éclairage, contours, rotations calculées nativement sur 16 directions), les décors des 9 biomes, la 3D façon Mode 7, les explosions, ainsi que la musique et les bruitages 16-bit (synthèse Web Audio). Le dépôt ne contient aucun fichier image ni son, à part l'icône de l'application.

## Contenu

- **9 niveaux** : Océan Pacifique, Canyon du Sahara, Jungle émeraude, Glacier arctique, Steel City, Mer d'orage (de nuit sous la pluie et les éclairs), Forteresse alpine, Forteresse volcanique, Stratosphère
- **Vols de transition en fausse 3D (Mode 7)** entre chaque niveau : on survole un monde en perspective qui passe du biome que l'on quitte à celui qui arrive (le sol, le ciel et l'horizon changent en vol). On passe dans les anneaux, on éclate les ballons et on ramasse les pièces. Un sans-faute rapporte une bombe.
- **9 boss à plusieurs phases**, avec des parties destructibles : Steel Leviathan, Sand Behemoth, Black Condor, Frost Titan, Iron Colossus (robot marcheur), Storm Carrier (porte-avions qui catapulte des chasseurs), Eagle Nest Bastion (canon électrique), Inferno Citadel, Sky Emperor (boss final en 3 phases)
- **Mid-boss** : croiseur, train blindé, bombardier géant, brise-glace, hélicoptère lourd bi-rotor
- **4 avions jouables**, chacun avec son tir, son arme secondaire, sa bombe et sa super-attaque : P-38 Lightning, P-51 Mustang, J7W Shinden, Mosquito

## Profondeur de jeu

- **Forteresse de ravitaillement** : à chaque niveau, un dirigeable allié se présente. On vole dans sa soute pour être réparé : bombe +1, puissance +1, bouclier, ailier et super-jauge pleine.
- **Ailiers** (bonus H) : jusqu'à 2 avions d'escorte qui tirent avec vous et encaissent des balles.
- **Armes spéciales** (bonus W, dont la lettre change en continu) : laser continu (L), jet de napalm (F), obus flak qui éclatent à l'impact (K) ou foudre en chaîne (C), pendant 25 secondes. Toutes portent jusqu'en haut de l'écran.
- **Autres bonus** : P (puissance, 4 niveaux), B (bombe), S (bouclier), F (pleine puissance), G (lingot d'or), médailles d'or à enchaîner, vies supplémentaires au score.
- **Ennemis venant de derrière**, annoncés par des flèches rouges en bas de l'écran.
- **Unités au sol** : convois de camions (le dernier transporte un bonus), lance-missiles SAM, artillerie à obus explosifs, dépôts de carburant qui explosent en chaîne, avions au sol, chars, DCA, bunkers, vedettes.
- **3 niveaux de difficulté** : Easy, Normal, Hard (sur Hard, les ennemis lâchent des balles en mourant).
- **Choix du niveau de départ** parmi ceux déjà atteints, records sauvegardés, options (volumes, scanlines, tir automatique).

## Contrôles

| Action | Clavier | Manette | Tactile |
|---|---|---|---|
| Déplacer | Flèches / WASD | Stick / croix | Glisser n'importe où (déplacement relatif) |
| Tirer | Z / Espace (maintenir) | A | Automatique |
| Bombe | X | B | Bouton BOMB |
| Super | C (jauge pleine) | X / Y | Bouton SUPER |
| Pause | Entrée / Échap | Start | Bouton II |

Sur mobile, le jeu occupe tout l'écran : le terrain s'allonge selon la taille du téléphone et un tableau de bord pixel art (acier riveté, bandes de danger, boutons à hublot, écran LCD avec le niveau, les vies, les bombes et la puissance) prend le bas de l'écran. Le bouton SUPER se remplit comme une jauge et clignote quand il est prêt. En paysage, le tableau de bord se place de chaque côté du terrain.

`M` coupe le son, `F` passe en plein écran.

## Performance

La simulation tourne à 60 Hz fixes ; l'affichage suit la fréquence de l'écran (90, 120, 144 Hz...) avec extrapolation des positions, pour un mouvement fluide (option *SMOOTH 120HZ*). Les sprites sont regroupés dans quelques atlas (peu d'appels GPU), le texte est pré-rendu et l'eau animée est composée une seule fois par image d'animation. L'option *FPS METER* affiche les images par seconde, les ticks de simulation et le temps de rendu. Pendant les vols de transition : gauche/droite pour virer, haut/bas pour l'altitude.

## Jouer en local

```
npx http-server .   # ou n'importe quel serveur statique
```

Le jeu se lance aussi en ouvrant directement `index.html`. Il n'y a ni build ni dépendance.

## Paramètres de debug (URL)

`?stage=5` pour démarrer au niveau 5, `&boss=emperor` pour affronter directement un boss, `?bonus=ocean,desert` pour un vol de transition entre deux biomes, `&god=1` pour l'invincibilité, `&speed=4` pour accélérer le jeu.
