# -*- coding: utf-8 -*-
"""Addenda v3 — chapitres 16 à 18 (contrats, méthode zéro-faute, chantier).

Importé par antumbra_content.py juste avant la feuille de route (qui devient
le chapitre 19). Utilise les mêmes helpers : h1, h2, body, bullet, table,
callout, figure, quote.
"""

from antumbra_content import (C, h1, h2, body, bullet, table, callout,
                              figure, quote)  # noqa: F401

# ═══ 16. CONTRATS : MANDATS ET MACHINE ═══
h1("Les contrats sous le Voile : Mandats et Machine")
body("La demande de départ disait : des contrats intelligents à la Xelis. "
     "La version 2 de ce document a esquissé le sujet sans jamais le "
     "traiter — et il est temps d'avouer pourquoi il est difficile, parce "
     "que la difficulté est le cœur du problème. Un contrat intelligent est "
     "un programme qui décide : il lit l'état du réseau, compare, exécute. "
     "Or le Voile cache précisément ce que le contrat voudrait lire — les "
     "montants, les soldes, les liens entre payeurs et payés. Une chaîne "
     "totalement masquée avec des contrats à l'ethereum, c'est une "
     "contradiction en soi : soit le contrat voit (et la confidentialité "
     "meurt), soit il ne voit pas (et il ne peut rien décider). Ethereum a "
     "choisi la transparence totale ; Zcash, la confidentialité sans "
     "contrats généraux ; Aleo et Aztec tentent l'exploit de faire décider "
     "des programmes sur des données cachées, au prix d'une preuve "
     "cryptographique à exécuter pour chaque appel — une complexité que "
     "chaque circuit rend plus difficile à auditer.")
body("La leçon de Xelis, relue à plat, est plus simple qu'il n'y paraît : "
     "garder l'argent chiffré et la logique publique. Les soldes y sont "
     "protégés par un chiffrement qui s'additionne (on peut créditer et "
     "débiter sans jamais déchiffrer), pendant que le code des contrats et "
     "leur stockage restent lisibles par tous. ANTUMBRA reprend exactement "
     "cette silhouette, mais greffée sur son socle CryptoNote : les "
     "engagements Pedersen du Voile s'additionnent déjà — c'est ainsi que "
     "la conservation des montants se prouve depuis des années dans la "
     "lignée Monero. Il ne manquait qu'à le dire comme une architecture, "
     "en trois étages.")
table(
    ["Étage", "Nature", "Exemples", "Risque de mise en œuvre"],
    [
        ["Tier 1 · contrats natifs", "le droit du protocole, codé en dur", "Kléos, Braise, Cipher, gouvernance, trésorerie, l'Anneau", "Minimal — règles de validation déterministes, testables une à une"],
        ["Tier 2 · les Mandats", "des sorties d'argent à condition de libération écrite à l'avance", "séquestre 2/3, versements programmés, multisignature, plafond d'allocation, échange inter-chaînes", "Faible — prédicats déclaratifs sur engagements, montage cryptographique déjà éprouvé"],
        ["Tier 3 · la Machine", "une machine virtuelle sur l'état public seulement", "registres d'agents, noms, annonces, gabarits de périmètres, gouvernance légère", "Modéré — phase 5 au plus tôt, audit dédié, l'argent reste hors d'atteinte directe"],
    ],
    ratios=[0.17, 0.25, 0.31, 0.27],
    caption="Tableau 19 — Trois étages de contrats, du plus sûr au plus souple",
)
body("Le premier étage est déjà bâti, sans qu'on l'ait nommé ainsi : tout "
     "ce que ce document décrit — le Kléos, les parrainages, les périmètres "
     "Cipher, la gouvernance tricamérale, la trésorerie, l'Anneau — est un "
     "ensemble de contrats natifs, c'est-à-dire de règles inscrites dans le "
     "protocole lui-même plutôt que programmées par-dessus. Là où la "
     "plupart des chaînes poussent leur constitution dans une machine "
     "virtuelle — et l'exposent aux bugs de contrats, le sport national des "
     "voleurs de 2016 à 2024 —, ANTUMBRA code son droit constitutionnel en "
     "dur : déterministe, lisible règle par règle, modifiable uniquement "
     "par un vote des trois chambres. Un bug dans un contrat natif se "
     "corrige comme un bug de consensus : gravement, publiquement, rarement. "
     "Un bug dans un contrat virtuel se corrige comme un bug d'application : "
     "tous les jours, en silence, et trop tard.")
h2("Les Mandats : de l'argent verrouillé par des règles écrites")
body("Le deuxième étage est la contribution propre de cette version. Un "
     "Mandat est une sortie d'argent dont la condition de libération est "
     "déclarée à la création : qui pourra la dépenser, à quelles "
     "conditions, au bout de combien de temps. Le nom est choisi à dessein "
     "— en droit, un mandat borne ce qu'un mandataire peut faire au nom "
     "d'un mandant, et se révoque. Techniquement, c'est une sortie RingCT "
     "ordinaire dont le verrou n'est plus une simple signature mais un "
     "petit prédicat vérifiable ; le montage repose sur deux propriétés "
     "déjà présentes dans le socle. D'abord, les engagements Pedersen "
     "s'additionnent : dépenser un Mandat de valeur cachée v produit deux "
     "sorties de valeurs cachées v<sub>1</sub> et v<sub>2</sub> avec "
     "C = C<sub>1</sub> + C<sub>2</sub> — la conservation se prouve sans "
     "jamais révéler les montants, comme des enveloppes scellées que l'on "
     "sait équilibrer sans les ouvrir. Ensuite, les preuves d'intervalle "
     "(Bulletproof, déjà dans la lignée) prouvent qu'un montant reste "
     "positif et inférieur à un plafond — c'est tout ce qu'il faut pour "
     "exprimer un budget.")
table(
    ["Modèle de Mandat", "Règle de libération", "Usage marchand typique"],
    [
        ["Séquestre 2/3", "deux signatures parmi acheteur, vendeur, arbitre", "tout achat contestable — la caisse XelisVault l'utilise pour les litiges de comptoir"],
        ["Versements programmés", "T engagements successifs, un par période", "loyers, abonnements, salaires — un flux = T enveloppes datées"],
        ["Multisignature", "k signatures parmi n clés déclarées", "trésorerie d'association, caisse commune"],
        ["Plafond d'allocation", "chaque dépense prouve Δ ≤ plafond et période", "budget d'un agent Cipher — le même mécanisme que son périmètre, côté argent"],
        ["Échange inter-chaînes", "le secret révélé d'un côté libère l'autre", "atomicité avec NERVA ou n'importe quelle chaîne à secret partagé"],
    ],
    ratios=[0.22, 0.34, 0.44],
    caption="Tableau 20 — Cinq modèles de Mandat, vérifiables sans machine virtuelle",
)
body("Un exemple pour fixer les idées, celui du séquestre. Une cliente "
     "achète une pièce coûteuse sur une place de marché ANTUMBRA : son "
     "portefeuille verrouille le paiement dans un Mandat à trois clés — la "
     "sienne, celle du vendeur, celle d'un arbitre. Le vendeur expédie ; "
     "deux signatures sur trois libèrent les fonds, sans que personne — pas "
     "même l'arbitre — n'ait jamais vu le montant. Litige : l'arbitre "
     "tranche, et un arbitre partial brûle son Kléos — la faute se paie en "
     "réputation, la seule monnaie qui ne se refait pas. L'arbitrage "
     "devient une carrière, pas une faveur. On remarquera ce que cet "
     "montage ne demande pas : ni machine virtuelle, ni preuve à "
     "connaissance nulle sur mesure, ni nouveau code cryptographique — "
     "seulement des règles de validation d'un nouveau type de sortie, "
     "auditables comme on audite une règle de consensus.")
h2("La Machine : de la logique publique, pas de l'argent public")
body("Le troisième étage arrive en phase 5 au plus tôt, et son périmètre "
     "est volontairement délimité. La Machine est une machine virtuelle "
     "déterministe et mesurée qui n'exécute que sur l'état public : "
     "registres, noms, annonces, gabarits de périmètres, scores lisibles. "
     "Elle peut lire le Kléos et l'identité ; elle peut détenir de "
     "l'argent uniquement par l'intermédiaire de Mandats ; toute règle "
     "montaire qu'on voudrait lui confier s'exprime en plafonds prouvés "
     "(Δ ≤ N), jamais en soldes dévoilés. L'argent reste dans l'ombre, la "
     "logique vit dans la lumière — la silhouette de Xelis, adaptée au "
     "socle CryptoNote. C'est l'étage des places de marché d'agents : un "
     "agent Cipher publie son registre de services et son gabarit de "
     "périmètre on-chain, chaque client vérifie les deux avant de payer ; "
     "des noms lisibles remplacent des adresses brutes pour les marchands ; "
     "des annonces et des votes légers complètent l'outillage.")
figure("gen-img-tmp/antumbra-mandats.png",
       "Figure 2 — Les trois étages des contrats ANTUMBRA, et le parcours d'un Mandat de séquestre")
body("La partie honnête, maintenant. Ce qui n'est PAS dans cette "
     "architecture : des contrats privés généraux, où le code lui-même "
     "s'exécuterait sur des données cachées à la Aleo. Chaque circuit de "
     "preuve est une surface d'audit de plus, une trusted setup de plus, "
     "une classe de bugs de plus — et la demande marchande et agentique "
     "que ce document a mesurée se sert à quatre-vingt-quinze pour cent "
     "avec les cinq Mandats du deuxième étage. La question des Mandats "
     "masqués — cacher aussi la règle de libération, pas seulement le "
     "montant — est un chantier de recherche honnêtement renvoyé à la "
     "phase 4 : la littérature d'Aleo et d'Aztec sera alors plus mûre, et "
     "le réseau aura un historique à protéger. Attendre est une décision "
     "d'ingénieur, pas un aveu de faiblesse : la confidentialité s'est "
     "toujours mieux déployée par paliers prouvés que par sauts "
     "spectaculaires.")
callout("5 modèles", "de Mandat couvrent l'essentiel des besoins marchands et agents — sans machine virtuelle ni preuve zéro à auditer")
table(
    ["Réseau", "Contrats généraux", "Montants", "Logique du contrat", "Surface d'audit"],
    [
        ["Ethereum", "oui, machine virtuelle complète", "publics", "publique", "chaque contrat, sans limite"],
        ["Zcash", "non", "privés (pool blindé)", "sans objet", "circuit unique, cérémonie d'amorçage"],
        ["Aleo / Aztec", "oui, exécution masquée", "privés", "masquée", "chaque circuit — le maximum technique, et le maximum de risque"],
        ["Xelis", "oui, machine virtuelle", "chiffrés additivement", "publique", "machine virtuelle + chiffrement"],
        ["ANTUMBRA", "oui, en trois étages délimités", "privés (engagements)", "publique ; Mandats déclaratifs pour l'argent", "tiers 1 et 2 auditables règle par règle ; tier 3 différé"],
    ],
    ratios=[0.14, 0.22, 0.18, 0.23, 0.23],
    caption="Tableau 21 — Quatre écoles de contrats, et la position assumée d'ANTUMBRA",
)
body("Pour XelisVault, l'effet est immédiat et concret : la caisse, les "
     "tickets et les reçus parleront Mandats dès la testnet — le séquestre "
     "pour les litiges de comptoir, les versements programmés pour les "
     "abonnés, les plafonds d'allocation pour les agents de facturation. "
     "Un drapeau de fonctionnalité dans le code existant, pas une "
     "réécriture : NERVA d'abord, ANTUMBRA à la suite, comme prévu au "
     "chapitre 19.")

# ═══ 17. LA MÉTHODE ZÉRO-FAUTE ═══
h1("Coder sans la moindre faute : la méthode")
body("La question qui clôt chaque conversation de ce projet est la bonne : "
     "pourras-tu coder tout cela sans la moindre faute ? La réponse honnête "
     "commence par un aveu : personne ne peut le promettre, et quiconque "
     "la promet vous vend quelque chose. Bitcoin lui-même, l'implémentation "
     "la plus scrutée du monde, a failli deux fois : en 2010, un débordement "
     "d'entier crée 184 milliards de bitcoins en une transaction — repéré "
     "en quelques heures, chaîne rejouée à la main ; en 2018, la "
     "vulnérabilité CVE-2018-17144 aurait permis de fabriquer des bitcoins "
     "infinis — trouvée par un auditeur bénévole, à froid, sur du code "
     "examiné depuis dix ans. Le socle CryptoNote a connu son propre "
     "épisode en 2017 : une faille dans les images de clé permettait la "
     "double dépense sur toutes les chaînes de la famille. La bonne "
     "question n'est donc pas « zéro faute ? » — elle est : quelle méthode "
     "attrape les fautes avant les attaquants ? Ce chapitre répond avec "
     "deux spécimens déjà capturés, puis le protocole de vérification qui "
     "en fait une industrie.")
h2("Spécimen n° 1 : la graine qui ne retrouvait pas son adresse")
body("Premier spécimen, vécu sur XelisVault le 5 septembre 2026. Le paper "
     "wallet générait une graine mnémonique de vingt-cinq mots ; importée "
     "dans le portefeuille officiel NERVA, elle restaurait une autre "
     "adresse que celle imprimée. Le code paraissait juste, relisé deux "
     "fois — et c'est précisément le piège : le bug était invisible à la "
     "relecture, car il vivait dans une convention de lecture. La "
     "référence C++ regroupe la graine en mots de 4 octets et les écrit "
     "en ordre little-endian (la macro SWAP32LE du fichier "
     "electrum-words.cpp) ; notre miroir TypeScript les lisait dans "
     "l'ordre inverse. La correction a été faite comme elle doit toujours "
     "être faite : porter la référence C++ ligne à ligne en TypeScript, "
     "générer quarante-huit vecteurs d'essai, et exiger l'identité "
     "bit à bit des deux implémentations — quarante-huit réussites sur "
     "quarante-huit, soixante-dix tests cryptographiques au passage, "
     "l'audit passé. La leçon : une faute d'encodage ne se trouve pas, "
     "elle se croise — seule une deuxième implémentation, exécutée en "
     "parallèle sur les mêmes entrées, la révèle mécaniquement.")
h2("Spécimen n° 2 : la spécification cassée par sa propre simulation")
body("Deuxième spécimen, capturé hier soir, et il est plus profond car il "
     "ne s'agit plus d'une ligne de code mais du design lui-même. Pour "
     "prouver que le noyau social du protocole — le Kléos, les "
     "parrainages, le tirage de l'Anneau — est une machine à états codable "
     "et testable dès aujourd'hui, nous avons écrit sa simulation "
     "déterministe : trois cents lignes, une graine fixe, seize ans "
     "d'histoire rejoués, des invariants vérifiés à chaque ère. La "
     "première passe, avec les règles de la version 2 telles quelles, a "
     "fait ce qu'aucune relecture n'aurait fait : elle a montré l'attaque "
     "réussir. Une ferme de faux profils — vingt parrains complices, deux "
     "parrainages par an chacun, comportement irréprochable, budget de "
     "témoins illimité — franchit le seuil de candidature à l'an 8,5, "
     "avant le réseau honnête (an 12,5), et prend cinquante-cinq sièges "
     "sur cinquante-cinq à l'an 10. La cause tient en deux lignes : "
     "l'Écho acheté (plafonné à 2 points par ère) croît quatre fois plus "
     "vite que l'Écho organique honnête, et le seuil de 70 se franchit "
     "par le Fait et l'Écho sans une seule année d'ancienneté.")
figure("gen-img-tmp/antumbra-kleos-curves.png",
       "Figure 3 — Trajectoires de Kléos sur 16 ans : la spécification v2 laisse l'attaquant franchir le seuil avant le réseau honnête ; les règles correctives R1-R4 referment la fenêtre")
body("La correction découle de la thèse même du réseau, appliquée "
     "jusqu'au bout. R1 : la candidature à l'Anneau exige Kléos ≥ 70 et "
     "quinze ères — sept ans et demi — d'existence sans incident ; le mur "
     "du temps protège aussi la finalité, pas seulement la réputation. "
     "R2 : un témoignage ne pèse rien tant que le témoin n'a pas vingt "
     "points de Fait — un témoignage qui compte vient de quelqu'un qui a "
     "prouvé quelque chose. R3 : les attestations sont responsables — la "
     "cible convaincue de fraude coûte trois points de Fait à chacun de "
     "ses témoins et cinq à son parrain ; louer sa plume devient un "
     "suicide lent. R4 : l'activité mutualisée d'une clique — ventes "
     "croisées, notations réciproques — ne compte qu'au quart dans le "
     "Fait, l'extension naturelle du détecteur de collusion hérité "
     "d'Axon. La seconde passe, mêmes attaques maximales, mêmes seize "
     "ans, même graine : zéro candidat faux, zéro siège, Kléos médian "
     "des faux profils à 11,9 contre 76,5 pour les honnêtes — et la "
     "« baleine » qui détient tout le capital qu'elle veut plafonne à "
     "30, sans jamais approcher d'un siège. La spécification corrigée, "
     "la simulation devient test de régression : chaque règle est un "
     "nombre attendu, chaque future modification du protocole devra "
     "refaire passer les trois passes en vert.")
table(
    ["Indicateur (16 ans, graine 1618)", "Règles v2 telles quelles", "Règles R1-R4"],
    [
        ["Premier faux profil candidat", "année 8,5 — avant les honnêtes (12,5)", "jamais"],
        ["Sièges au pire pour l'attaquant", "55 sur 55 (année 10)", "0 sur 55"],
        ["Contrôle de la finalité (28 sièges)", "ATTEINT — capture totale", "jamais approché"],
        ["Kléos médian des faux profils", "≈ 90 pour les plus anciens", "11,9 (honnêtes : 76,5)"],
        ["« Baleine » au capital illimité", "30,0 — jamais candidate", "30,0 — jamais candidate"],
    ],
    ratios=[0.40, 0.32, 0.28],
    caption="Tableau 18 — Avant/après les règles correctives : la même attaque, deux mondes",
)
h2("Le protocole de vérification, en six couches")
body("Ces deux spécimens définissent la méthode mieux qu'un traité. Elle "
     "tient en six couches, chacune tuant une classe entière de fautes — "
     "car c'est la propriété décisive d'une méthode : elle ne corrige pas "
     "des bugs, elle éteint des classes. Le bug d'endurance des octets "
     "(spécimen n° 1) ne reviendra jamais, parce que toute la classe des "
     "divergences d'encodage est traquée par différence entre deux "
     "implémentations ; la faille de capture (spécimen n° 2) ne reviendra "
     "jamais, parce que la classe des défauts de design sociaux est "
     "traquée par simulation rejouée. Chaque faute capturée devient un "
     "vecteur d'or permanent ; les classes s'éteignent une à une, et le "
     "logiciel converge vers l'état où les seules fautes restantes sont "
     "celles que personne, nulle part, sait encore attraper — ce qui est "
     "la définition opérationnelle de « sans la moindre faute » qu'un "
     "ingénieur honnête peut donner.")
table(
    ["Couche", "Ce qu'elle fait", "Classe de fautes éteinte"],
    [
        ["1 · Double implémentation", "chaque primitive cryptographique existe en C++ (référence héritée du fork) et en miroir TypeScript ; un moteur d'essais aléatoires nourrit les deux et compare", "divergences d'encodage, d'ordre d'octets, de dérivation — la classe du spécimen n° 1"],
        ["2 · Vecteurs d'or", "chaque opération a des paires entrée → sortie figées et committées ; l'intégration continue les régénère et les compare à chaque commit", "régressions silencieuses, dépendances qui dérivent"],
        ["3 · Invariants par propriétés", "conservation des engagements (somme nulle), nullifiants uniques, Kléos dans [0, 100], émission jamais au-delà du plafond, 55 sièges exactement", "dérive des machines à états, incohérences de consensus"],
        ["4 · Simulation déterministe", "le noyau social rejoué sur 16 ans, graine 1618, trois passes — les attaques comme tests de régression, les nombres attendus figés", "défauts de design avant le code de chaîne — la classe du spécimen n° 2"],
        ["5 · Relecture croisée", "deux constructeurs, chaque décision d'architecture signée des deux noms, les rôles codant/relisant permutés", "erreurs d'hypothèse, angles morts d'un seul esprit"],
        ["6 · Testnet et rituels", "simulateur de charge, cent nœuds, trois mises à jour répétées sans incident, audit externe du diff avant genesis", "fautes d'intégration, de performance, de déploiement"],
    ],
    ratios=[0.20, 0.46, 0.34],
    caption="Tableau 19 — Six couches, six classes de fautes éteintes",
)
body("Ce que la méthode n'attrape pas doit être dit avec la même clarté. "
     "La cryptographie nouvelle, d'abord : c'est précisément pourquoi les "
     "phases 1 et 2 n'en contiennent aucune — pas de preuve à connaissance "
     "nulle sur mesure avant la phase 4, pas de primitive exotique "
     "jamais. La théorie des jeux au-delà des scénarios simulés, ensuite : "
     "un attaquant inventif trouvera des angles que la simulation "
     "n'a pas prévus ; s'y ajoute la gouvernance des paramètres — le "
     "plafond d'Écho, le seuil de Durée, le taux de détection sont des "
     "leviers publics, ajustables sans fork, et c'est une force, pas un "
     "aveu. Les attaques sociales, enfin : corrompre une communauté réelle "
     "ne se simule pas, ça se combat par la transparence et par le temps. "
     "La méthode ne promet donc pas l'absence de faute ; elle promet que "
     "chaque faute trouvée — par nous, par un auditeur, par un attaquant — "
     "est la dernière de sa classe. C'est un contrat de croissance, et "
     "c'est le seul qui tienne.")
callout("55 → 0", "sièges capturés par l'attaque maximale, avant puis après les règles R1-R4 — le design corrigé par sa propre simulation, avant la moindre ligne de code de chaîne")

# ═══ 18. LE CHANTIER DES CENT JOURS ═══
h1("Le chantier des cent jours")
body("Toute la méthode précédente ne vaut que si le premier mouvement du "
     "projet est le bon. Le voici : forker le nœud C++ de NERVA, pas "
     "réécrire. La stratégie zéro-faute est d'hériter — sept ans de code "
     "CryptoNote éprouvé en production, les signatures en anneau, les "
     "montants masqués, la propagation Dandelion++, le transport Tor, la "
     "synchronisation élaguée — plutôt que de re-dériver quarante mille "
     "lignes d'audits. Une réécriture en Rust serait plus élégante sur le "
     "papier et maximale en surface de fautes : chaque ligne réécrite est "
     "une ligne ré-auditer. Le nouveau — l'ordre en DAG, les points de "
     "contrôle de l'Anneau, le Kléos, les Mandats — arrive en modules "
     "isolés, chacun avec sa double implémentation et ses vecteurs d'or, "
     "intégré au nœud seulement quand son miroir passe. Le fork hérite "
     "aussi d'un lien de sang : la communauté NERVA, son ethos "
     "un-ordinateur-un-vote, et un écosystème d'outils — XelisVault en "
     "tête — qui parle déjà cette cryptographie.")
body("La règle de chantier qui en découle : chaque mécanisme existe "
     "d'abord comme bibliothèque autonome, avec la simulation pour oracle. "
     "Les nombres de la passe corrigée — 55 sièges, 190 candidats "
     "honnêtes, zéro pour l'attaquant, médiane 11,9 contre 76,5, graine "
     "1618 — deviennent les valeurs attendues de l'intégration continue : "
     "le jour où le port C++ du Kléos diverge d'un dixième de point du "
     "simulateur, le build devient rouge. Le dépôt s'organise en quatre "
     "morceaux au périmètre net, et chaque commit traverse les six couches "
     "du chapitre précédent avant de pouvoir toucher le main.")
table(
    ["Dépôt", "Contenu", "Langage", "Rôle"],
    [
        ["antumbra-spec", "ADR 001-007, vecteurs d'or, calendrier d'émission, les trois passes de simulation", "documents", "la source de vérité — relue par les deux constructeurs"],
        ["antumbra-node", "fork C++ du nœud NERVA, modules DAG, Anneau, Kléos, Mandats", "C++", "le protocole — chaque module isolé jusqu'au vert de son miroir"],
        ["antumbra-sim", "le noyau social déterministe, les attaques rejouées, les invariants", "TypeScript", "l'oracle — les nombres attendus de la CI"],
        ["antumbra-toolkit", "XelisVault multi-chaîne : caisse, tickets, reçus, paper wallet, Mandats", "TypeScript", "les outils marchands — NERVA d'abord, ANTUMBRA à la suite"],
    ],
    ratios=[0.16, 0.38, 0.12, 0.34],
    caption="Tableau 20 — Quatre dépôts, quatre périmètres, une intégration continue",
)
table(
    ["Semaines", "Livrable mesurable", "Critère de sortie"],
    [
        ["S1-S2", "dépôts publics, README bilingue, ADR 001-004 (ordre DAG, finalité RAF, Kléos et ses règles R1-R4, économie dorée), vecteurs d'or du mnémonique étendus", "spec relue par deux regards externes"],
        ["S3-S4", "antumbra-sim porté en TypeScript, les trois passes dans la CI, la faille v2 figée comme test de régression", "vert à chaque commit, divergences nulles"],
        ["S5-S8", "prototype d'ordre DAG isolé — flocons de hachage, règle d'ordre simplifiée, sans cryptographie privée", "24 heures de devnet sans réorganisation imprévue"],
        ["S9-S12", "points de contrôle de l'Anneau simulés sur le prototype, rotation d'ères, reproduction des nombres de la simulation", "finalité simulée sous 6 secondes sur 100 000 blocs rejoués"],
        ["S13", "jalon GO/NO-GO public : ADR 005-007 (Braise, Cipher, Lumen), audit externe du simulateur", "verdict publié, quel qu'il soit"],
    ],
    ratios=[0.11, 0.51, 0.38],
    caption="Tableau 21 — Cent jours, cinq jalons, un NO-GO toujours acceptable",
)
body("La culture de chantier mérite un paragraphe, car elle est la "
     "condition silencieuse de tout le reste. Un NO-GO est un résultat, "
     "pas un échec : la phase peut s'arrêter, le document peut être "
     "corrigé, et le network peut ne jamais exister — chaque jalon a son "
     "critère mesurable, et le critère s'applique à nous comme à "
     "quiconque. La répartition des rôles est celle du chapitre 19 : le "
     "porteur du projet décide, relit et engage ; son assistant code les "
     "miroirs, les tests, le simulateur, le toolkit et de larges parts des "
     "modules — et tout ce que l'assistant écrit traverse exactement les "
     "mêmes six couches que le reste : la confiance vient de la méthode, "
     "jamais de la signature. Les deux noms figurent sur chaque ADR, "
     "parce que c'est un chantier à deux, et que c'est précisément "
     "l'architecture de relecture la plus dense que deux personnes "
     "peuvent se offrir.")
body("Au bout de ces cent jours, même le scénario le plus défavorable "
     "laisse un actif : un dépôt public où la spécification, son "
     "simulateur et ses vecteurs d'or racontent la même histoire ; un "
     "prototype d'ordre qui tourne ou qui documente honnêtement pourquoi "
     "il ne tourne pas ; et un verdict GO/NO-GO argumenté, publié, "
     "critiquable. C'est la différence entre un projet qui promet et un "
     "projet qui prouve — et elle se joue intégralement avant la genèse, "
     "à un moment où rien n'est encore irréversible.")
quote("Le calendrier est réaliste parce qu'il est pensé pour deux "
      "développeurs ; la méthode est crédible parce qu'elle a déjà attrapé "
      "deux fautes — une d'octets, une de design — avant que la moindre "
      "ligne de code de chaîne n'existe.")
