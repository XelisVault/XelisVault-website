# Pack de prompts Grok « Imagine » — VaultLaunch

> À destination du fondateur : chaque prompt ci-dessous se copie-colle
> tel quel dans Grok (onglet Imagine). Générer en grand, exporter en PNG,
> puis déposer le fichier au chemin indiqué. Aucun texte ne doit apparaître
> dans les images : les mots sont ajoutés ensuite par le site (police
> Fraunces), toujours nets.

## Les 5 règles d'or (à lire avant de générer)

1. **Jamais de texte dans l'image.** Tous les prompts contiennent
   « no text, no letters, no words » — si Grok ajoute des lettres,
   regénérez. Le texte réel (nom du produit, chiffres) est posé par le
   site en HTML, il reste ainsi parfaitement net.
2. **Une seule famille visuelle.** Tous les prompts partagent les mêmes
   mots-clés de style (`institutional private banking, editorial
   engraving, ivory paper, champagne bronze, deep teal`) — c'est ce qui
   rendra le pack cohérent avec le reste du site (peau « Maison »).
3. **Fond ivoire, pas blanc pur, pas noir.** Hex de référence :
   ivoire `#F8F6F1`, encre `#37332E`, bronze champagne `#A0764B`,
   teal profond `#3F6E75`, champagne doré `#D2A76F`, bordeaux `#8A3A43`.
4. **Générer grand** (prendre la plus grande taille proposée, ratio
   adapté à l'usage), exporter en **PNG**, nommer le fichier exactement
   comme indiqué.
5. **Générer 3-4 variantes par prompt** et garder la plus sobre — le
   critère est : « est-ce que ça pourrait être dans le rapport annuel
   d'une banque privée ? ». Si ça ressemble à un memecoin, on jette.

---

## 1. Emblème VaultLaunch (le logo-mark) — LE plus important

**Usage** : identité de la page launchpad, navigation, watermark.
**Fichier** : `public/images/launchpad-mark.png` (+ la meilleure variante
en `public/images/launchpad-mark-lg.png`, même image en plus grand).

```
Minimal luxury emblem for a serious crypto launchpad, a circular bank
vault door seen head-on, its dial transformed into an ascending curve
that rises through the door like a rocket trajectory, flat vector style,
champagne bronze #A0764B lines on ivory paper #F8F6F1 background, one
subtle deep teal #3F6E75 accent arc, fine engraving line weight,
institutional private banking aesthetic, Swiss grid composition,
perfectly centered, generous margins, elegant and restrained, no text,
no letters, no words, no gradient, no glow, no neon.
```

**Variante B (si la A est trop chargée)** :

```
Minimal geometric emblem, an abstract monogram shape made of a vault
door arc and an ascending launch curve crossing it, single continuous
line style, champagne bronze #A0764B on ivory paper #F8F6F1, deep teal
#3F6E75 small dot marking the curve apex, flat vector, institutional
private banking logo, timeless like a Swiss private bank crest, centered
with wide margins, no text, no letters, no words.
```

## 2. Illustration hero (haut de la page launchpad)

**Usage** : grand visuel d'accueil de la page launchpad (le site
superposera le titre en Fraunces par-dessus).
**Fichier** : `public/images/launchpad-hero.png` — ratio très large
(≈2:1 ou 21:9).

```
Wide editorial illustration for an institutional crypto launchpad, an
abstract ascending bonding curve drawn as a fine engraved line rising
from left to right across ivory paper #F8F6F1, the curve made of
delicate guilloché engraving patterns like a banknote, champagne bronze
#A0764B main line, deep teal #3F6E75 secondary curves, tiny champagne
gold #D2A76F nodes on the curve like milestone markers, large calm
negative space on the left third for a title, luxury annual report
aesthetic, private banking mood, extremely subtle paper grain, no text,
no letters, no numbers, no words, no chart axes, no glow.
```

## 3. Bannière OG / réseaux sociaux (partages X, Discord, etc.)

**Usage** : image de prévisualisation quand on partage le site/la page
launchpad.
**Fichier** : `public/og/launchpad-og.png` — ratio exact **1200×630**.

```
Elegant social banner 1200x630, ivory paper #F8F6F1 background, on the
right side a large minimal emblem of a vault door arc crossed by an
ascending engraved curve, champagne bronze #A0764B with a deep teal
#3F6E75 accent, fine line engraving style, left half almost empty ivory
space reserved for typography, thin bronze hairline border inset from
the edges, institutional private banking annual report cover aesthetic,
calm, premium, restrained, no text, no letters, no words, no logo text,
no gradient, no neon, no crypto clichés.
```

## 4. Fond de carte projet (placeholder quand un projet n'a pas de logo)

**Usage** : image par défaut derrière les cartes des projets listés.
**Fichier** : `public/images/launchpad-card-bg.png` — ratio carré ou 4:3.

```
Abstract placeholder artwork for a project card, subtle guilloché
engraving rosette pattern like a security paper watermark, champagne
bronze #A0764B lines at 20 percent opacity on ivory paper #F8F6F1, one
small deep teal #3F6E75 geometric element off-center, very low contrast,
quiet, elegant, must not distract from text overlaid on top,
institutional stationery aesthetic, no text, no letters, no words, no
symbols.
```

## 5 & 6. Deux icônes de statut (les plus utiles du set de 6)

Le système a 6 statuts (validation, bonding, graduated, trusted,
untrusted, recovery). Les 4 autres se déclinent du même style une fois
celles-ci validées. Style commun : **icône ligne fine bronze sur ivoire,
1:1, marges généreuses**.

**5. « Graduated » (diplômé)** — fichier `public/images/status-graduated.png` :

```
Minimal line icon for a graduated token launch, a classical laurel
wreath in fine engraving line style enclosing a small ascending curve
arrow, champagne bronze #A0764B on ivory paper #F8F6F1, single deep
teal #3F6E75 accent, institutional private banking aesthetic, centered,
generous margins, flat vector, no text, no letters, no words.
```

**6. « Untrusted » (confiance perdue)** — fichier
`public/images/status-untrusted.png` :

```
Minimal line icon for a community warning status, a sober shield shape
in fine engraving line style, a single horizontal calm line across it
(not aggressive, not a triangle warning sign), bordeaux #8A3A43 lines
on ivory paper #F8F6F1, institutional private banking aesthetic,
centered, generous margins, flat vector, no text, no letters, no words,
no exclamation mark.
```

## 7. Base favicon / icône launchpad

**Usage** : icône de la page launchpad et future PWA.
**Fichier** : `public/images/launchpad-icon.png` — carré, 512×512 si
possible.

```
App icon, rounded square of ivory paper #F8F6F1, centered minimal
emblem of a vault door arc crossed by an ascending curve, champagne
bronze #A0764B, one deep teal #3F6E75 accent dot, flat vector, fine
line weight, institutional private banking aesthetic, no text, no
letters, no words, no gradient, readable at very small size.
```

## 8. Illustration « cycle de vie » (section explication, optionnelle)

**Usage** : visuel pédagogique du cycle propose → vote → courbe →
graduation → confiance (le site posera les libellés en HTML).
**Fichier** : `public/images/launchpad-cycle.png` — ratio large 3:1.

```
Wide horizontal editorial diagram illustration with NO labels, five
abstract stages connected left to right by one continuous fine engraved
line that rises like a curve: stage one a small document shape, stage
two raised hands abstracted as simple arcs, stage three a rising curve
inside a circle, stage four a laurel wreath, stage five a shield,
champagne bronze #A0764B line art on ivory paper #F8F6F1 with one deep
teal #3F6E75 accent on the final stage, guilloché engraving texture in
the connecting line, institutional annual report aesthetic, calm and
precise, no text, no letters, no numbers, no words, no labeled arrows.
```

---

## Checklist qualité (pour chaque image retenue)

- [ ] Aucune lettre ni chiffre lisible dans l'image
- [ ] Fond ivoire `#F8F6F1` (pas blanc pur) ou transparence propre
- [ ] Bronze `#A0764B` dominant, teal `#3F6E75` en accent discret
- [ ] Ça tiendrait dans un rapport annuel de banque privée (sinon :
      regénérer)
- [ ] Export PNG, plus grande taille disponible, nom de fichier exact

## Et ensuite

Déposez les fichiers aux chemins indiqués (ou transmets-les dans le
chat), et j'intègre : page launchpad du site (hero + cycle de vie +
cartes de projets branchées sur les vues du contrat), bannière OG,
icônes de statut. Le texte restera toujours en HTML/Fraunces — net à
toutes les tailles.
