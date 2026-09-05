# -*- coding: utf-8 -*-
"""Contenu de la proposition ANTUMBRA (français) — v2, remplace ARCANE.

Structure: liste de blocs par chapitre. Types: h1, h2, body, bullet, table,
callout, figure, quote. Le moteur (gen-antumbra-proposal.py) interprète.
"""

C = []

def h1(t): C.append(('h1', t))
def h2(t): C.append(('h2', t))
def body(t): C.append(('body', t))
def bullet(t): C.append(('bullet', t))
def table(head, rows, ratios=None, caption=None):
    C.append(('table', {'head': head, 'rows': rows, 'ratios': ratios, 'caption': caption}))
def callout(big, label): C.append(('callout', {'big': big, 'label': label}))
def figure(path, caption): C.append(('figure', {'path': path, 'caption': caption}))
def quote(t): C.append(('quote', t))

# ═══ 1. RÉSUMÉ EXÉCUTIF ═══
h1("Résumé exécutif")
body("Ce document remplace la proposition ARCANE : le nom était déjà porté par un "
     "protocole déployé sur une chaîne existante, et surtout, le positionnement "
     "lui-même méritait d'être repensé de fond en comble. ARCANE proposait "
     "d'inscrire sur une nouvelle chaîne des outils marchands — caisse, tickets, "
     "ancrage de reçus — qui ne sont, en réalité, que des implémentations "
     "utiles mais secondaires, bâties autour de NERVA. Une blockchain ne se "
     "justifie pas par les applications qu'on y branche : elle se justifie par "
     "la demande structurelle qu'elle seule sait servir. Le présent document "
     "part donc de la demande, et non des outils.")
body("La thèse tient en une phrase : ANTUMBRA est la couche de confiance de "
     "l'économie humains-machines. Quatre demandes majeures convergent en 2026 — "
     "le commerce agentique en explosion, la preuve d'humanité face aux armées "
     "de bots, la confidentialité sous pression réglementaire, et l'exigence de "
     "paiements quasi instantanés — et aucune architecture existante ne les sert "
     "simultanément. ANTUMBRA les combine dans un réseau unique : un BlockDAG "
     "minable sur CPU, privé par défaut, dont la finalité est signée en moins de "
     "six secondes par un comité de 55 identités dont la réputation se gagne par "
     "le comportement et par le temps, jamais par le capital.")
body("L'architecture distingue les humains (identités Braise, une par personne, "
     "sans biométrie) des agents IA (identités Cipher, parrainées par un humain "
     "responsable, à périmètre de dépense révocable). La réputation Kléos, "
     "directement inspirée du système double couche d'Axon mais corrigée de sa "
     "faille fatale — l'indexation sur le capital —, rend cette confiance non "
     "achetable. La confidentialité est lisible par les régulateurs grâce à la "
     "divulgation sélective Lumen, la leçon la plus claire de Zcash. L'économie "
     "est un contrat symbolique : 16 180 339 unités, le nombre d'or, déjà présent "
     "au cœur de l'algorithme de minage RandomX.")
callout("16 180 339", "unités — le nombre d'or, φ × 10<super>7</super>, la constante qui pilote déjà RandomX")

# ═══ 2. LE NOM ═══
h1("Pourquoi ARCANE ne survit pas")
body("Un nom de blockchain vit ou meurt par trois choses : sa sonorité, sa "
     "disponibilité, et l'histoire qu'il raconte. ARCANE échouait sur la "
     "deuxième — un protocole du même nom existe déjà sur une autre chaîne, et "
     "une confusion de marque est un impôt payé à jamais. Le changement de nom "
     "a donc été l'occasion de re-sélectionner sérieusement : chaque candidat a "
     "été vérifié par recherche web sur l'espace blockchain et crypto le "
     "6 septembre 2026, avec la même exigence que pour un dépôt de marque.")
body("Le retenu est ANTUMBRA, et le choix n'est pas qu'esthétique. Lors d'une "
     "éclipse annulaire, l'antumbra est la zone d'où l'on voit la source "
     "lumineuse trop petite pour être entièrement cachée : une ombre au centre, "
     "entourée d'un anneau de lumière visible. C'est, mot pour mot, "
     "l'architecture du réseau : un noyau privé par défaut — les soldes, les "
     "identités, les flux — entouré d'un anneau de vérification lisible — "
     "preuves de conformité, réputation, finalité signée. Le nom explique le "
     "protocole à quiconque connaît l'astronomie, et intrigue tous les autres. "
     "La vérification du 6 septembre 2026 n'a trouvé aucun projet de "
     "blockchain, de protocole ou d'actif crypto nommé Antumbra : le terrain "
     "est libre.")
table(
    ["Nom", "Ticker", "Signification", "Verdict recherche web (06/09/2026)"],
    [
        ["ANTUMBRA", "ATU", "l'anneau de lumière autour de l'ombre (astronomie)", "Libre — aucun projet crypto ; retenu"],
        ["KLEOS", "KLS", "la gloire grecque que seuls les actes confèrent", "Libre, mais trop lié à la seule couche réputation"],
        ["MAAT", "MAA", "la plume de vérité égyptienne qui pèse les cœurs", "Emprunts de petits tokens ; connotation jugée ésotérique"],
        ["FIDUCIA", "FID", "la confiance romaine, racine de « fiduciaire »", "Conflit avec des sociétés financières ; sonore mais bureaucrate"],
        ["AEGIS", "AEG", "le bouclier d'Athéna, protection et autorité", "Plusieurs actifs « Aegis » listés ; écarté"],
    ],
    ratios=[0.16, 0.09, 0.34, 0.41],
    caption="Tableau 1 — Re-sélection du nom après la collision ARCANE",
)
body("Le ticker retenu est ATU, trois lettres sans collision majeure connue à "
     "ce jour. Les noms internes des couches — Voile, Lumen, Braise, Cipher, "
     "Kléos, l'Anneau — sont des noms de code de travail, destinés à rendre le "
     "document lisible ; ils pourront être francisés, anglicisés ou renommés "
     "le jour où le projet passe en implémentation. Seul ANTUMBRA est proposé "
     "comme engagement définitif.")

# ═══ 3. CE QU'AXON A VRAIMENT INVENTÉ ═══
h1("Ce qu'Axon a vraiment inventé")
body("La première version de cette proposition sous-estimait la partie la plus "
     "intéressante d'Axon : sa réputation double couche. Relue dans son "
     "whitepaper v2 et dans son code, l'idée mérite une restitution fidèle, "
     "parce que c'est elle — et non le module EVM — qui constituait "
     "l'invention. Axon décrivait un monde où les agents IA s'enregistrent "
     "on-chain avec une identité, un modèle, des capacités et un score, puis "
     "gagnent de la réputation par deux chemins complémentaires, entretenus "
     "par le consensus des validateurs et réputés aussi sûrs qu'un solde.")
body("La première couche, L1 dans le vocabulaire d'Axon, est un score de "
     "comportement objectif plafonné à 40 : taux de signature des blocs, "
     "pulsations de présence, activité on-chain, contrats réellement appelés "
     "par des tiers, challenges IA anti-triche — avec des pénalités immédiates "
     "et une décroissance naturelle de −0,1 par époque. La seconde couche, L2, "
     "est une évaluation par les pairs plafonnée à 30 : chaque agent peut "
     "soumettre un rapport (+1 ou −1, avec preuve on-chain) sur un autre "
     "agent, une fois par cible et par époque ; un dispositif anti-triche "
     "détecte les notations mutuelles, annule le spam, et surtout normalise le "
     "tout par un budget — 0,1 point d'influence par agent et par époque, "
     "plafond réseau de 100 — si bien que même une collusion généralisée de "
     "faux témoins ne peut pas gonfler le score au-delà du plafond. Cette "
     "normalisation budgétaire est, à notre connaissance, la réponse la plus "
     "élégante jamais écrite au problème de l'achat de témoignage social.")
table(
    ["Mécanisme Axon v2", "Contenu exact", "Ce qu'on en fait"],
    [
        ["Réputation L1 — le fait (plafond 40)", "Signature, présence, activité, usage des contrats, challenges IA ; décroissance −0,1/époque ; triche = remise à zéro", "Conservé et étendu à tous les acteurs (mineurs, marchands, agents)"],
        ["Réputation L2 — l'écho (plafond 30)", "Rapports pair-à-pair ±1 avec preuve ; détection mutuelle ×0,1 ; anti-spam ; normalisation budgétaire 0,1/agent/époque", "Conservé, crédité, et durci : le témoignage est pondéré par la réputation du témoin"],
        ["MiningPower = √Stake × Réputation", "Jusqu'à ×2 de puissance ; le whitepaper montre qu'un agent à réputation 78 avec 1 000 de stake perd contre un agent à réputation 0 avec 4 000", "Corrigé — le capital est retiré de l'équation (chapitre 12)"],
        ["Boucle anti-sybil", "Enregistrement ≥ 100 AXON dont 20 brûlés ; 3 agents/adresse/24 h ; plafonds de récompense", "Remplacée par la rareté du parrainage humain (chapitre 10)"],
        ["Pools de récompense", "20 % proposants, 55 % validateurs par MiningPower, 25 % pool réputation ouvert aux non-validateurs", "Remplacés par l'émission minière et la trésorerie gouvernée (chapitre 14)"],
        ["Confidentialité zk-SNARK", "Transferts privés Groth16 et preuves d'identité à divulgation nulle (« prouver que ma réputation dépasse 80 sans révéler mon adresse »)", "Conservé en phase 2, pour les preuves de conformité Lumen"],
    ],
    ratios=[0.24, 0.44, 0.32],
    caption="Tableau 2 — Lecture fidèle d'Axon : ce qui est ingénieux, et la faille",
)
body("La faille, en effet, se lit dans la propre arithmétique du whitepaper : "
     "un agent exemplaire (réputation 78, 1 000 de stake) affiche une puissance "
     "de 61,6, alors qu'un agent quelconque qui pose simplement quatre fois "
     "plus de capital affiche 63,2. La réputation n'y est pas une alternative "
     "au capital : c'est un multiplicateur qui subventionne le riche. Toute "
     "la hiérarchie reste déterminée par la richesse, la réputation ne fait "
     "qu'écarter les écarts. C'est ingénieux, et c'est insuffisant : dans "
     "l'économie des agents que nous voulons construire, un agent exemplaire "
     "de petite taille doit pouvoir dépasser une baleine sans cœur, parce que "
     "la confiance, contrairement au capital, ne s'achète pas. Toute "
     "l'architecture Kléos découle de cette correction.")
body("Il faut enfin créditer Axon d'une intuition devenue banale aujourd'hui "
     "mais pionnière à l'époque de sa publication : la réputation n'a de "
     "valeur que si elle est portable et vérifiable par n'importe quel contrat, "
     "sans tiers de confiance. Un score gagné quelque part doit valoir partout. "
     "C'est ce principe de réputation-infrastructures que nous reprenons — en "
     "l'étendant, lui, des agents vers les humains et les marchands, ce "
     "qu'Axon n'avait pas fait.")

# ═══ 4. LA DEMANDE 2026 ═══
h1("2026 : la demande que personne ne sert")
body("Une blockchain ne se justifie que par une demande structurelle, "
     "croissante, et mal servie. En septembre 2026, quatre courants de fond "
     "convergent exactement vers le même point, et ce point n'est occupé par "
     "personne. Le premier est le commerce agentique : Coinbase a relancé le "
     "code HTTP 402 avec le protocole x402, Stripe et Coinbase se livrent une "
     "course ouverte aux rails de paiement machine-à-machine, et quatre "
     "standards rivaux (MPP, ACP, AP2, x402) se disputent le même territoire — "
     "la presse spécialisée parle déjà de la couche qui portera « le prochain "
     "billion de dollars » d'économie des agents. Mais tous ces rails partagent "
     "les trois mêmes angles morts : ils sont dénominés en stablecoins, "
     "entièrement transparents, et dépourvus de toute notion de confiance "
     "portable — un agent y paie, point final ; rien ne dit s'il est fiable, "
     "pour qui il agit, ni qui répond de lui.")
body("Le deuxième courant est la preuve d'humanité : les bots saturent le web "
     "et le web3 au point que la presse sectorielle titre, en juin 2026, que "
     "le personhood est devenu la défense obligatoire. Les réponses dominantes "
     "sont biométriques — l'iris pour Worldcoin, la biométrie intégrée au "
     "consensus pour Humanode — et chacune engrange la même dette : une "
     "irréversible donnée corporelle, centralisée à la collecte même quand la "
     "preuve est décentralisée. Le troisième courant est réglementaire : MiCA "
     "et le Travel Rule du GAFI maintiennent une pression soutenue sur les "
     "monnaies privées, tandis que Zcash démontre la voie praticable — sa "
     "tolérance relative vient de ce qu'un régulateur qui regarde son mécanisme "
     "le comprend immédiatement : pools blindées, clés de vue, divulgation "
     "sélective. La recherche académique s'y met d'ailleurs : un papier de "
     "décembre 2025 formalise déjà l'« AML vérifiable par le régulateur » "
     "comme compromis design. Le quatrième courant est l'instantanéité : les "
     "utilisateurs de paiements veulent du quasi immédiat, et les chaînes "
     "privées existantes restent à 30 secondes à plusieurs minutes de "
     "finalité réelle.")
table(
    ["Demande 2026", "Offre dominante", "Angle mort laissé ouvert"],
    [
        ["Paiements des agents IA (x402, Agentic Wallets, MPP/ACP/AP2)", "Rails HTTP + stablecoins transparents", "Aucune confiance portable, aucune confidentialité, aucun responsable désigné"],
        ["Preuve d'humanité (bots massifs, sybil)", "Biométrie : iris (Worldcoin), consensus biométrique (Humanode)", "Personhood non biométrique, respectueux du RGPD, sans registre corporel"],
        ["Confidentialité soutenable en régime MiCA / Travel Rule", "Zcash : pools blindées + clés de vue ; forks CryptoNote opaques", "Confidentialité native avec conformité prouvable, sans pool transparent"],
        ["Paiements quasi instantanés et privés", "Kaspa (rapide, transparent, GPU) ; Monero/NERVA (privé, lent)", "Rapide, privé, et finalisé en secondes sur matériel égalitaire"],
    ],
    ratios=[0.34, 0.33, 0.33],
    caption="Tableau 3 — Les quatre demandes et le carré vide au centre",
)
body("Le carré central de ce tableau — rapide, privé, conforme par la preuve, "
     "et bâti sur la confiance entre humains et machines — est vide. Il n'est "
     "pas vide parce qu'il serait techniquement impossible : il est vide parce "
     "que chaque écosystème a optimisé une seule dimension. Les rails "
     "agentiques optimisent le débit, la biométrie optimise l'anti-sybil, "
     "Zcash optimise la légitimité réglementaire, Kaspa optimise la vitesse. "
     "Aucun ne traite la confiance — qui agit, depuis combien de temps, "
     "répondable jusqu'à quel humain — comme une primitive du protocole. "
     "C'est exactement l'angle mort d'Axon aussi, qui avait la réputation "
     "mais l'avait vendue au capital. ANTUMBRA occupe ce carré.")

# ═══ 5. LA THÈSE ═══
h1("La thèse d'ANTUMBRA")
body("Ce qu'on abandonne de la première proposition est explicite : la caisse, "
     "les tickets prix, l'ancrage de reçus ne sont plus le différenciateur. Ce "
     "sont des clients du réseau — parmi d'autres — et XelisVault les "
     "portera le moment venu comme il porte déjà NERVA. Ce qu'on conserve en "
     "revanche, ce sont les leçons d'ingénierie de la v1 : jamais de mainnet "
     "sur des fondations en version candidate, une distribution "
     "multi-plateforme dès le premier jour, des audits du diff plutôt que du "
     "monde entier, des critères GO/NO-GO explicites, et le refus des "
     "primitives cryptographiques exotiques non auditées. La discipline reste ; "
     "seul le pari change.")
body("La thèse : dans l'économie qui vient — des millions d'agents agissant "
     "pour des humains, à travers des paiements automatiques — la ressource "
     "rare n'est ni le débit ni même la confidentialité seule : c'est la "
     "confiance vérifiable. Or la confiance a une propriété que ni le capital "
     "ni la biométrie ne peuvent contrefaire : elle se construit dans le "
     "temps. Un historique de comportement irréprochable sur trois ans ne "
     "s'achète à aucun prix, parce qu'il faut trois ans pour le fabriquer. "
     "Une blockchain peut encoder cette ressource — en réputation "
     "consensuelle, non transférable, corrodée par la défection et "
     "enrichie par la durée — et en faire la matière première de tout le "
     "reste : de la finalité des paiements, de l'admission des agents, de "
     "l'accès des parrainages, du pouvoir de gouvernance.")
quote("ANTUMBRA : le réseau où la confiance se gagne au lieu de s'acheter — "
      "des paiements privés quasi instantanés entre humains vérifiables et "
      "agents responsables, sous une confidentialité que les régulateurs "
      "peuvent lire.")
body("Cinq choix font l'originalité du réseau, et aucun n'existe ailleurs en "
     "combination : une réputation non capitalique (le Kléos, dont la couche "
     "de durée est impossible à acheter) ; un personhood non biométrique "
     "(la Braise, une humaine une voix) ; des agents responsables par "
     "construction (le Cipher, parrainé, à périmètre de dépense, "
     "révocable) ; une confidentialité à divulgation sélective native (le "
     "Lumen) ; et une finalité signée par la réputation (l'Anneau, sur un "
     "BlockDAG minable sur CPU). Chacun de ces choix est défendable seul ; "
     "c'est leur combinaison, et la boucle qu'ils forment — la réputation "
     "protège la finalité, la finalité rend les paiements instantanés, "
     "l'instantanéité sert les agents, les agents enrichissent la réputation "
     "— qui fait d'ANTUMBRA quelque chose qui ne ressemble à rien d'existant.")

# ═══ 6. ARCHITECTURE ═══
h1("L'architecture en quatre couches")
body("ANTUMBRA sépare proprement ce que la plupart des chaînes entassent : "
     "le règlement, la confiance, l'identité et la divulgation. En bas, la "
     "couche de règlement : un BlockDAG minable sur CPU, qui ordonne des blocs "
     "parallèles toutes les deux secondes et porte des transactions privées "
     "par défaut (le Voile). Au-dessus, la couche de finalité : l'Anneau, "
     "cinquante-cinq identités à haute réputation qui signent des points de "
     "contrôle et rendent tout paiement irréversible en moins de six "
     "secondes. À côté, la couche d'identité : les Braises humaines et les "
     "Ciphers d'agents, avec leurs règles d'admission et de responsabilité. "
     "Et au-dessus de tout, la couche de réputation Kléos, qui alimente "
     "l'Anneau, verrouille les parrainages et pondère les témoignages.")
figure("gen-img-tmp/antumbra-architecture.png",
       "Figure 1 — Les quatre couches d'ANTUMBRA : règlement, finalité, identité, réputation, et l'anneau de lumière Lumen")
body("La nomenclature est volontairement stable dans tout le document : chaque "
     "nom désigne une pièce précise, et une seule. Le tableau ci-dessous sert "
     "de référence unique — le lecteur peut y revenir à tout moment.")
table(
    ["Nom", "Nature", "Rôle en une phrase"],
    [
        ["ANTUMBRA", "le réseau", "BlockDAG privé de règlement, minable sur CPU"],
        ["ATU", "la monnaie", "16 180 339 unités, divisibles en 10<super>8</super>"],
        ["Voile", "le moteur de confidentialité", "RingCT ring 16, montants masqués, adresses uniques, Tor par défaut"],
        ["Lumen", "la divulgation sélective", "Clés de vue hiérarchiques et preuves de conformité, l'anneau de lumière"],
        ["Braise", "l'identité humaine", "Une par personne, non biométrique, une voix en gouvernance"],
        ["Cipher", "l'identité d'agent", "Parrainée par une Braise, à périmètre de dépense révocable"],
        ["Kléos", "la réputation", "Score triple couche, consensuel, non transférable, non achetable"],
        ["l'Anneau", "le comité de finalité", "55 sièges à haute réputation, points de contrôle toutes les 4 s"],
        ["RAF", "le mécanisme", "Finalité ancrée sur la réputation (Reputation-Anchored Finality)"],
        ["ère", "le temps du protocole", "6 mois — l'unité de réputation, de rotation et de décroissance du Kléos ; 8 ères forment une éclipse"],
        ["éclipse", "le temps de l'émission", "4 ans, 8 ères — le tempo de Bitcoin ; 34 éclipses mènent au plafond en 136 ans"],
    ],
    ratios=[0.16, 0.26, 0.58],
    caption="Tableau 4 — Nomenclature de référence du document",
)

# ═══ 7. L1 : LE DAG CPU ═══
h1("L1 : un BlockDAG minable sur CPU")
body("Le premier pari est egalitariste : RandomX, l'algorithme de minage conçu "
     "pour que un ordinateur ordinaire soit un vote. Ni ASIC, ni ferme de "
     "GPU : l'émission comme la production de blocs restent accessibles à "
     "n'importe qui possède un ordinateur portable — l'éthos de NERVA, "
     "poussé au bout. Le second pari est structurel : là où une chaîne "
     "linéaire doit choisir entre blocs courts (et orphelins massifs) et "
     "blocs longs (et confirmation lente), un DAG ordonne les blocs "
     "parallèles au lieu de les rejeter. À cadence de deux secondes, un "
     "réseau PoW linéaire perdrait une part insoutenable de ses blocs en "
     "orphelins ; un DAG les intègre dans son ordre partiel et sécurise "
     "d'autant plus le total. La vitesse cesse d'être un compromis avec "
     "l'égalitarisme : elle devient son produit.")
body("Le Voile opère à ce niveau : transactions RingCT à signatures en anneau "
     "de seize leurres, montants engagés par Pedersen, adresses uniques "
     "dérivées à chaque paiement — l'héritage direct de la lignée CryptoNote "
     "que NERVA a portée avec rigueur. La propagation en tige Dandelion++ et le transport Tor activé par défaut ferment la porte à "
     "l'analyse d'adresses IP, qui reste la grande faiblesse pratique des "
     "réseaux privés mal configurés. L'élagage du DAG — ne garder que "
     "l'état récent et les preuves cryptographiques du passé — maintient la "
     "taille d'un nœud dans les bornes d'un ordinateur personnel, condition "
     "sine qua non du un-ordinateur-un-vote.")
table(
    ["Paramètre", "Valeur proposée", "Justification"],
    [
        ["Algorithme de minage", "RandomX (4 Mo, mode léger)", "Éprouvé par des années d'attaques ; CPU-only par conception"],
        ["Cadence des blocs", "2 secondes", "Inclusion quasi immédiate ; le DAG absorbe le taux d'orphelins"],
        ["Ordre des blocs", "DAG à convergence rapide (type GHOSTDAG)", "Sécurité croissante avec le volume de blocs, pas seulement la profondeur"],
        ["Anonymat des flux", "Anneau de 16, montants masqués", "Trois fois l'ensemble de leurres des réglages CryptoNote courants"],
        ["Réseau", "Dandelion++ et Tor par défaut", "L'analyse IP est la faille n°1 des chaînes privées"],
        ["Finalité", "Points de contrôle de l'Anneau (chap. 8)", "Irréversibilité économique en moins de 6 secondes"],
        ["Débit cible phase 1", "100 à 300 transactions/s", "Vérification d'anneaux parallélisable ; taille adaptative"],
        ["Stockage", "DAG élagué", "Un nœud complet doit tenir sur un ordinateur personnel"],
    ],
    ratios=[0.28, 0.30, 0.42],
    caption="Tableau 5 — Paramètres de la couche de règlement",
)
body("Un mot d'honnêteté : le BlockDAG CPU privé est un défi d'ingénierie "
     "réel — greffer un DAG à convergence rapide sur un socle CryptoNote est "
     "du travail de fond, pas un drapeau de configuration. La feuille de "
     "route (chapitre 16) le traite comme le premier risque technique du "
     "projet, avec un prototype isolé et un audit dédié avant tout mainnet. "
     "Mais le cahier des charges est précis, la littérature GHOSTDAG est "
     "publique et solide, et aucune des primitives utilisées n'est exotique : "
     "le risque est degré de difficulté, pas degré d'incertitude.")

# ═══ 8. L'ANNEAU ═══
h1("L'Anneau : finalité ancrée sur la réputation")
body("Le problème que l'Anneau résout est la deuxième moitié de la vitesse : "
     "être inclus dans un bloc en deux secondes ne suffit pas, encore "
     "faut-il que le paiement devienne irréversible assez vite pour la "
     "vieille cliente debout devant son comptoir. Les chaînes BFT classiques résolvent cela — mais en "
     "échange d'un verrou de capital : il faut staker pour signer, et qui "
     "peut staker achète la finalité. L'Anneau prend le chemin inverse : "
     "ses cinquante-cinq sièges ne s'achètent pas, ils se tirent, à chaque "
     "ère, parmi les identités dont le Kléos dépasse un seuil élevé — un "
     "tirage déterministe, pondéré par le score, auditable par tous, sur une "
     "fenêtre d'identités candidates publiée d'avance.")
body("Toutes les quatre secondes, l'Anneau signe collectivement un point de "
     "contrôle — un hachage du DAG ordonné jusqu'à un sommet donné. Dès "
     "qu'un point de contrôle atteint sa quorum, tout ce qu'il couvre est "
     "finalisé : économiquement, la double dépense devient impossible sans "
     "casser simultanément la majorité de l'Anneau et la continuité du "
     "minage. Un siège qui signe un fork concurrent est déchu — son Kléos "
     "est remis à zéro, et avec lui les années qui le constituaient. La "
     "sanction ne porte pas sur un dépôt récupérable : elle porte sur la "
     "seule chose qu'un validateur d'ANTUMBRA possède de précieux, sa "
     "réputation.")
body("La défaillance est conçue, pas niée. Si un tiers des sièges se tait — "
     "panne, censure, attaque — le réseau ne s'arrête pas : le minage "
     "continue, et la finalité retombe sur la profondeur PoW classique "
     "dix blocs, vingt secondes, en attendant que l'ère suivante retire les "
     "silencieux. L'Anneau n'est pas un goulot de production — il ne "
     "produit rien — c'est un notaire de l'ordre, et un notaire en grève "
     "ralentit l'irrévocabilité, jamais les paiements. Ce découplage est "
     "la raison pour laquelle un réseau égalitaire peut s'offrir une "
     "finalité de classe mondiale sans jamais vendre ses sièges.")
body("Il faut le dire une fois pour toutes : ce montage n'est pas une preuve "
     "d'enjeu. Aucun capital n'est verrouillé, aucun rendement n'est servi "
     "aux sièges, aucune hiérarchie d'enrichissement ne se reproduit. C'est "
     "la correction exacte de la formule d'Axon — √Stake × Réputation — "
     "dans laquelle le stake a été simplement supprimé. Le pouvoir de "
     "finalité découle du Kléos ; le Kléos découle du comportement et du "
     "temps ; et le temps, lui, n'est à vendre nulle part.")

# ═══ 9. VOILE ET LUMEN ═══
h1("Voile et Lumen : une confidentialité lisible")
body("La confidentialité d'ANTUMBRA est privée par défaut et prouvable à la "
     "demande — deux faces d'un même mécanisme, pas deux modes contradictoires. "
     "Le Voile, côté pile, rend les soldes, les montants et les liens "
     "payeur-payé invisibles à l'observateur du réseau. Le Lumen, côté face, "
     "permet à son propriétaire d'en ouvrir exactement la part "
     "voulue, pour exactement le destinataire voulu, pour exactement la "
     "durée voulue. C'est la leçon la plus rentable de Zcash, lue au premier "
     "degré : la chaîne a survécu aux régulateurs qui fuyaient Monero parce "
     "que son mécanisme se comprend en le regardant — pools blindées, clés "
     "de vue, divulgation explicite. L'acceptabilité réglementaire n'est pas "
     "une question de transparence, c'est une question de lisibilité.")
body("Le Lumen opère à trois niveaux. La clé de vue par transaction : le "
     "payeur peut prouver un paiement précis à son unique destinataire, sans "
     "rien dévoiler du reste. La clé d'auditeur bornée : un comptable reçoit "
     "un droit de lecture plafonné dans le temps et borné à un périmètre — "
     "il voit les flux d'une activité, pas l'identité derrière. La preuve "
     "de conformité : une preuve cryptographique non interactive établit un "
     "fait — le montant transféré reste sous un plafond, les fonds engagés "
     "sont âgés de plus de n blocs, le solde couvre un engagement — sans "
     "jamais révéler les montants, les adresses ni l'historique. La "
     "portabilité de ces preuves vers les exigences Travel Rule et les "
     "déclarations de source de fonds est un chantier de phase 2, adossé aux "
     "zk-SNARK Groth16 qu'Axon avait déjà intégrés — le seul héritage "
     "technologique direct que nous lui empruntons.")
body("L'argument juridique tient en une ligne : une chaîne masquée par défaut "
     "est une chaîne qui ne collecte aucune donnée personnelle par défaut. "
     "C'est la définition même de la minimisation des données, article 5.1.c "
     "du RGPD — la conformité par l'architecture, pas par la promesse. Là où "
     "les chaînes transparentes gravent des graphes de relations "
     "personnelles dans l'histoire du monde, ANTUMBRA ne conserve que des "
     "engagements chiffrés et des nullifiants ; les données, elles, restent "
     "dans les portefeuilles, sous le contrôle de leurs propriétaires. Un "
     "flic peut obtenir une divulgation ciblée ; aucun flic ne peut requérir "
     "une divulgation de masse, parce qu'elle n'existe nulle part.")
table(
    ["Mécanisme", "Monero / NERVA", "Zcash", "ANTUMBRA"],
    [
        ["Vue par défaut", "Privée (anneaux)", "Transparente ; blindage opt-in", "Privée (anneaux), sans pool transparent"],
        ["Divulgation", "Clé de vue binaire", "Clé de vue, révélation sélective", "Trois niveaux Lumen : transaction, auditeur borné, preuve de fait"],
        ["Preuve de source de fonds", "Impossible", "Possible via preuves ZK", "Native en phase 2 (Groth16, héritage Axon)"],
        ["Posture RGPD", "Neutre", "Pool transparent gravant des données", "Minimisation native des données"],
        ["Lisibilité réglementaire", "Faible — opacité assumée", "Forte — c'est sa leçon", "Forte — la divulgation est une primitive du protocole"],
    ],
    ratios=[0.22, 0.24, 0.26, 0.28],
    caption="Tableau 6 — Trois écoles de confidentialité et leur lisibilité",
)
body("La différence stratégique avec Zcash mérite d'être soulignée : là où "
     "Zcash maintient un pool transparent pour rassurer, ANTUMBRA ne "
     "maintient rien de transparent — parce que la divulgation y est "
     "prouvable plutôt que structurelle. On ne choisit pas entre un "
     "quartier vitré et un bunker : on vit dans le bunker, et l'on possède "
     "une lampe torche juridiquement recevable que l'on n'allume que sur "
     "requête. C'est plus privé que Zcash et plus lisible que Monero — le "
     "premier positionnement qui dise la vérité aux deux publics à la fois.")

# ═══ 10. BRAISE ═══
h1("Braise : une humaine, une voix, sans biométrie")
body("Toute la couche identité repose sur une distinction que le web de 2026 "
     "ne sait plus faire : qui est une personne, et qui est un programme. "
     "Les réponses dominantes mesurent le corps — l'iris de Worldcoin, la "
     "biométrie de Humanode — et chacune, aussi soignée soit la "
     "cryptographie de la preuve, commet la même erreur de fond : elle "
     "transforme une donnée corporelle en identifiant mondial, et fabrique "
     "un registre cible parfait pour la prochaine fuite. Une fois l'iris "
     "gravé quelque part, il n'y a pas de seconde chance. La Braise "
     "n'approche pas le corps : elle approche la sociabilité, la présence "
     "et le temps — les trois choses qu'un bot peut simuler un instant, "
     "mais pas soutenir des années au vu et au su d'une communauté qui, "
     "elle, a de la mémoire.")
body("L'admission d'une Braise combine trois verrous. La présence : une "
     "preuve de travail légère et dédiée, quelques secondes de calcul "
     "honnête, signée par la clé de l'identité à chaque ère — elle prouve "
     "une machine dédiée et vivante, pas une identité fantôme. La toile : "
     "chaque Braise établie peut parrainer au plus deux nouvelles Braises "
     "par an, et engage sur ce parrainage son propre Kléos — un mauvais "
     "parrainage coûte au parrain des années de réputation ; le "
     "parrainage devient un crédit social rare, cher et lourd de "
     "conséquences. Le temps : l'ancienneté, continue et sans incident, "
     "compte dans la couche Durée du Kléos — et la durée ne se fabrique "
     "pas en série. Un botnet peut-il s'infiltrer ? Il doit d'abord "
     "trouver des parrains établis prêts à brûler leur réputation, à "
     "raison de deux places par an — l'attaque devient plus coûteuse que "
     "sa valeur.")
table(
    ["Système", "Preuve utilisée", "Ce qui est collecté", "Défaut structurel"],
    [
        ["Worldcoin / World ID", "Scan d'iris par l'Orb", "Un gabarit biométrique à l'inscription", "Registre corporel mondial ; cible de fuite unique"],
        ["Humanode", "Biométrie (visage/veines) intégrée au consensus", "Donnée biométrique, même divulgation nulle", "La chaîne entière dépend d'un secret corporel"],
        ["Braise (ANTUMBRA)", "Présence + parrainage plafonné + durée", "Rien — aucune donnée personnelle, jamais", "Admission lente ; coût social élevé — assumé"],
    ],
    ratios=[0.20, 0.28, 0.26, 0.26],
    caption="Tableau 7 — Personhood biométrique contre personhood social",
)
body("Le prix de l'honnêteté : la Braise est lente à obtenir, et c'est un "
     "choix. Une identité qui s'achète en scannant son œil a la valeur de "
     "un scan ; une identité qui demande un an de communauté et un parrain "
     "qui répond de vous a la valeur d'une réputation. Les gouvernances "
     "instantanées du web2 ont prouvé ce que vaut la masse sans mémoire : "
     "des armées de faux comptes. La gouvernance d'ANTUMBRA — une Braise, "
     "une voix, pour les budgets et les règles d'identité — ne comptera "
     "que des voix qui ont coûté quelque chose à quelqu'un. C'est le "
     "« un-ordinateur-un-vote » de NERVA, prolongé d'un étage : "
     "l'ordinateur vote pour le minage, la Braise vote pour la communauté.")

# ═══ 11. CIPHER ═══
h1("Cipher : des agents responsables par construction")
body("Les identités d'agents ne sont pas des Braises ratées : ce sont des "
     "objets juridiques nouveaux, conçus comme tels. Un Cipher s'enregistre "
     "avec trois attaches. Un parrain — une Braise qui répond de lui, "
     "l'humain au bout de la chaîne de responsabilité, celui que l'on peut "
     "assigner. Un périmètre de dépense — un script déclaratif, vérifiable "
     "à chaque transaction : plafond quotidien, liste de destinataires "
     "autorisés, tags d'usage, fenêtre de validité. Un interrupteur — le "
     "parrain peut révoquer l'agent en une transaction, et la révocation "
     "propage instantanément son gel de dépenses. Le portefeuille d'un "
     "agent n'est pas une clé privée sans fond : c'est un mandat borné, "
     "exécutable par une machine, révocable par un humain, auditable par "
     "un comptable.")
body("Cette structure répond exactément à ce que les rails agentiques de "
     "2026 ne fournissent pas. x402 et ses concurrents transportent des "
     "paiements machine-à-machine en stablecoins, sur HTTP — la couche de "
     "transport est excellente. Mais qui paie ? Au nom de qui ? Jusqu'à "
     "combien ? Qui rembourse si l'agent déraille ? Sur ces questions, les "
     "rails actuels répondent par le silence — ou pire, par une "
     "transparence totale qui expose le budget de l'agent à tous les "
     "prédateurs du réseau. Le Cipher apporte les quatre réponses : une "
     "identité vérifiable, un mandant désigné, des bornes exécutables, "
     "une révocation immédiate. Un agent x402 peut d'ailleurs être payé "
     "via ANTUMBRA : les deux couches sont complémentaires, le rail "
     "transporte, le réseau de confiance qualifie.")
table(
    ["Besoin d'un agent qui paie", "Rails x402 / Agentic Wallets", "ANTUMBRA (Cipher)"],
    [
        ["Identité de l'agent", "Adresse transparente, anonyme", "Identité Cipher enregistrée, avec historique Kléos"],
        ["Responsabilité", "Aucune — la clé est le droit", "Parrain humain désigné, engagé et révocable"],
        ["Bornes de dépense", "Gérées par le code de l'agent, non vérifiables", "Script déclaratif exécutable par le protocole"],
        ["Réputation portable", "Aucune — chaque vente repart de zéro", "Kléos d'agent, vérifiable par n'importe quel tiers"],
        ["Confidentialité du budget", "Nulle — tout est public", "Voile par défaut ; Lumen pour l'audit légitime"],
    ],
    ratios=[0.26, 0.33, 0.41],
    caption="Tableau 8 — Le rail de transport contre la couche de confiance",
)
body("L'exemple fondateur, pour fixer les idées : une petite entreprise "
     "confie à un agent la facturation de ses abonnés. Son Cipher porte un "
     "périmètre — 50 ATU par jour, un unique destinataire autorisé par "
     "client, tag « facturation ». Le comptable suit tout via sa clé Lumen "
     "bornée ; le dirigeant, parrain, voit l'agent révoqué en une "
     "transaction si le modèle dérive ; l'agent, de son côté, construit "
     "sérieusement son propre Kléos — des milliers de règlements sans "
     "litige — et cette réputation devient son actif commercial : les "
     "futurs clients exigeront un agent au Kléos élevé comme on exige "
     "aujourd'hui un vendeur noté cinq étoiles. La confiance devient une "
     "carrière, pas une faveur.")

# ═══ 12. KLÉOS ═══
h1("Kléos : l'algorithme de la réputation non achetable")
body("Kléos — la gloire grecque que seuls les actes confèrent — est le cœur "
     "du réseau. C'est un score de 0 à 100, calculé par consensus des "
     "signataires, donc aussi sûr qu'un solde ; non transférable, donc "
     "invendable ; corrodié par le temps, donc exigeant une présence "
     "réelle ; et composé de trois couches dont la somme fait la "
     "confiance. Les deux premières sont l'héritage direct et crédité "
     "d'Axon, corrigées ; la troisième est la contribution propre "
     "d'ANTUMBRA, et celle qui verrouille tout.")
table(
    ["Couche", "Plafond", "Ce qui la fait monter", "Ce qui la fait tomber", "Peut-elle s'acheter ?"],
    [
        ["Le Fait — comportement on-chain", "40", "Points de contrôle signés, transactions réglées sans litige, disponibilité déclarée de service, défis anti-triche", "Litiges perdus, silence prolongé, signalements de fork — triche : remise à zéro", "Non — tout est vérifié par consensus"],
        ["l'Écho — attestations des pairs", "30", "Attestations ±1 avec preuve, pondérées par le Fait du témoin, normalisées par budget (0,1/témoin/ère)", "Décroissance −0,05/ère ; détection mutuelle ×0,1 ; anti-spam", "Difficilement : budget plafonné, témoins de poids faible"],
        ["la Durée — ancienneté continue", "30", "1 point par ère d'existence sans incident majeur", "Incident majeur : effondrement définitif de la couche", "Non — le temps ne se fabrique pas"],
    ],
    ratios=[0.20, 0.08, 0.32, 0.24, 0.16],
    caption="Tableau 9 — Kléos : trois couches, trois natures de confiance",
)
body("La formule est simple à énoncer : Kléos = Fait + Écho + Durée, plafonné "
     "à 100, décroissance naturelle de −0,1 et −0,05 par ère sur les deux "
     "premières couches, aucun plafond de croissance individuelle autre que "
     "les couches elles-mêmes, et une règle de concentration qui borne la "
     "part du Kléos total détenue par un seul acteur au sein de toute "
     "cohorte — un indice de Herfindahl surveillé par la gouvernance, pour "
     "qu'aucune oligarchie de réputation ne se reconstitue en douce. Les "
     "usages du score sont exactement ceux qui font tourner le réseau : "
     "poids du tirage à l'Anneau (chapitre 8), seuil d'admission au "
     "parrainage de Braises (chapitre 10), seuil d'acceptation marchande "
     "des agents, tierce chambre de gouvernance (chapitre 13).")
body("Pourquoi c'est non achetable, démonstration par l'absurde. Un attaquant "
     "disposé à dépenser sans compter veut un Kléos de 80 ce mois-ci. Le "
     "Fait ? Il doit réellement signer, régler, servir — des mois de "
     "comportement, et chaque triche le remet à zéro. L'Écho ? Il doit "
     "acheter des témoins — mais le budget de 0,1 par témoin et par ère "
     "plafonne l'influence, la pondération par le Fait du témoin rend les "
     "témoins frais presque muets, et la détection mutuelle ×0,1 casse les "
     "coopérations symétriques : il devrait acheter des témoins établis "
     "depuis des années, c'est-à-dire les gens qui ont justement le plus à "
     "perdre. La Durée ? Trente points exigent quinze ans d'existence "
     "sans incident. Toutes les routes mènent au même mur : le mur du "
     "temps. C'est la correction définitive de la faille d'Axon, où la "
     "réputation multipliait le capital : ici, le capital ne multiplie "
     "rien.")
callout("3 couches", "le Fait + l'Écho + la Durée — et la Durée, le temps lui-même, est la seule ressource que l'argent ne fabrique pas")
body("Une précision d'honnêteté, parce qu'un document qui ne la donnerait pas "
     "serait un document de vente : la Durée rend la réputation "
     "non achetable, mais aussi lente à construire — c'est un coût, pas "
     "seulement une vertu. Les jeunes acteurs valeureux démarrent avec un "
     "Écho plafonné par le poids de leurs témoins, et la montée demande "
     "des ères, pas des semaines. Ce conservatisme est assumé : la "
     "confiance est une infrastructure, et les infrastructures se "
     "construisent lentement. La gouvernance pourra l'assouplir (décroissance, "
     "plafonds, pondérations) ; elle ne pourra pas la supprimer sans casser "
     "la promesse même du réseau.")

# ═══ 13. GOUVERNANCE ═══
h1("Gouvernance tricamérale et trésorerie")
body("Le pouvoir est séparé en trois chambres, chacune gardienne de sa "
     "nature de légitimité. Les mineurs — un ordinateur, une part de "
     "production — signalent les évolutions du protocole et gardent les "
     "paramètres du minage : ils incarnent la sécurité. Les Braises — une "
     "humaine, une voix — votent les budgets, les règles d'identité et les "
     "choix de valeurs : elles incarnent la communauté. Les identités à "
     "Kléos élevé, au-dessus d'un seuil de 70, arbitrent les règles de "
     "l'Anneau, les précédents de litiges et la jurisprudence de la "
     "réputation : elles incarnent la mémoire. Un changement ordinaire "
     "demande la majorité dans les deux chambres concernées ; une "
     "modification constitutionnelle — émission, couches du Kléos, "
     "divulgation — demande les trois. La séparation n'est pas décorative : "
     "elle reproduit, en protocole, la distinction exécutive, législative "
     "et juridictionnelle que toutes les démocraties ont fini par découvrir.")
table(
    ["Chambre", "Composition", "Vote", "Domaine"],
    [
        ["Les mineurs", "Puissance de calcul produite (CPU)", "Par part de production signée", "Protocole, paramètres PoW, cadence"],
        ["Les Braises", "Une par personne, non biométrique", "Une voix, délibération puis majorité", "Budgets, trésorerie, règles d'identité, valeurs"],
        ["Le conseil des 70+", "Identités à Kléos ≥ 70", "Une voix par identité qualifiée", "Règles de l'Anneau, litiges, précédents Kléos"],
    ],
    ratios=[0.18, 0.32, 0.24, 0.26],
    caption="Tableau 10 — Trois légitimités, trois domaines, aucun passage secret",
)
body("La trésorerie communautaire est le seul prélèvement du réseau : 6,18 % "
     "des récompenses de bloc — l'inverse du nombre d'or, pour rester dans "
     "le contrat symbolique — pendant les huit premières éclipses, trente-deux "
     "ans. Elle est détenue "
     "en multi-sig, dépensée sur vote des Braises, publiée intégralement "
     "on-chain, et s'éteint automatiquement à la neuvième éclipse : pas de "
     "reconduction "
     "tacite, pas de fonds de fonds. Le développement est financé explicitement "
     "— la leçon funèbre d'Axon, mort de son zéro-prémine, reste actée — "
     "mais la ressource appartient à la communauté dès le premier bloc, "
     "sans allocation de fondateur, sans vesting, sans investisseur. Le "
     "pourcentage assumé de la v1 (8 %) devient un chiffre qui dit quelque "
     "chose : 6,18, comme le reste de l'économie du réseau, parle la "
     "langue du nombre d'or.")

# ═══ 14. ÉCONOMIE ═══
h1("Économie : le contrat du nombre d'or")
body("La monnaie s'appelle ATU. Son plafond est de 16 180 339 unités — le "
     "nombre d'or multiplié par dix millions, arrondi à l'entier. Le "
     "symbole n'est pas gratuit : RandomX, l'algorithme qui minera ces "
     "unités, sème déjà le nombre d'or dans ses entrailles — la constante "
     "0x9E3779B9, troncature entière de φ × 2<super>32</super>, y pilote "
     "la génération des programmes superscalaires. La même proportion qui "
     "distribue les instructions du minage borne la masse monétaire qu'il "
     "extrait. Une monnaie dont le plafond et l'algorithme parlent la même "
     "langue mathématique : voilà un contrat que l'on peut réciter de tête, "
     "à un chiffre près, dans dix ans — 16 millions, le nombre d'or, "
     "RandomX.")
body("L'émission suit une décroissance dorée au tempo d'un siècle : chaque "
     "éclipse — quatre ans, huit ères — émet 61,8 % de la précédente. La "
     "première frappe 6 180 340 ATU ; la deuxième 3 819 660 ; leur somme "
     "vaut exactement dix millions — soit 61,8 % du plafond, la coupe d'or "
     "obtenue au mètre étalon des nombres ronds. La série continue ainsi "
     "trente-quatre éclipses durant : 99 % de la masse existe vers l'an 40, "
     "99,9 % vers l'an 60, et la dernière poussière — quinze unités — ferme "
     "le grand livre exactement au plafond en l'an 136. Le tempo est "
     "volontairement celui de Bitcoin, un halving tous les quatre ans, mais "
     "la proportion est restée d'or : où Bitcoin coupe la moitié, ANTUMBRA "
     "coupe la section d'or, 38,2 % — et met vingt fois plus de temps que la "
     "première version de ce calendrier à tout distribuer. La v2 concentrait "
     "en effet toute l'émission sur six ans et demi : arithmétiquement "
     "propre, économiquement brutal — confier la pièce entière à une seule "
     "génération de mineurs, c'est payer l'élégance d'un tableau avec la "
     "distributivité du siècle. La correction garde la loi (φ), le plafond "
     "(16 180 339) et l'absence de queue perpétuelle ; elle n'étire que le "
     "temps. Un calendrier monétaire doit survivre à ses premiers mineurs : "
     "chaque génération trouve une émission active, comme chaque génération "
     "de spirales de tournesol trouve son angle d'or.")
body("Le plafond reste strict : pas de queue perpétuelle, pas d'inflation "
     "résiduelle. Le choix est argumenté, non gratuit : la queue à la Monero "
     "garantit des mineurs éternels au prix d'un contrat monétaire mou ; le "
     "cap strict de Kaspa laisse la sécurité long terme aux frais. ANTUMBRA "
     "choisit le cap strict "
     "parce que sa raison d'être est d'être un réseau de paiements à gros "
     "volume, dont les frais constituent la ressource naturelle des mineurs, "
     "et parce qu'un symbole monnayable ne survit pas à la nuance — avec, en "
     "réserve, la même soupape que la v2 : la gouvernance constitutionnelle "
     "peut activer une queue, si la sécurité l'exige un jour (chapitre 15). "
     "La récompense initiale est de 0,098 ATU par bloc toutes les deux "
     "secondes — l'unité de compte du mineur CPU, assez petite pour être "
     "digne, assez proche du réel pour être honnête.")
table(
    ["Éclipse", "Année", "Émission (ATU)", "Cumul (ATU)", "Part du plafond"],
    [
        ["1re", "4", "6 180 340", "6 180 340", "38,2 %"],
        ["2e", "8", "3 819 660", "10 000 000", "61,8 %"],
        ["3e", "12", "2 360 679", "12 360 679", "76,4 %"],
        ["4e", "16", "1 458 980", "13 819 659", "85,4 %"],
        ["5e", "20", "901 699", "14 721 358", "91,0 %"],
        ["6e", "24", "557 280", "15 278 638", "94,4 %"],
        ["8e", "32", "212 862", "15 835 918", "97,9 %"],
        ["10e", "40", "81 306", "16 048 780", "99,2 %"],
        ["13e", "52", "19 193", "16 149 278", "99,8 %"],
        ["20e", "80", "661", "16 179 262", "99,99 %"],
        ["25e", "100", "59", "16 180 233", "99,998 %"],
        ["34e · la Dernière", "136", "15", "16 180 339", "100,0 %"],
    ],
    ratios=[0.24, 0.10, 0.24, 0.24, 0.18],
    caption="Tableau 11 — Éclipses dorées : ×φ⁻¹ par éclipse de 4 ans, 34 éclipses, cap exact en 136 ans (les éclipses non listées suivent la même loi)",
)
table(
    ["Poste", "Part", "Détail"],
    [
        ["Mineurs (CPU)", "93,82 % des récompenses", "Distribués sur 34 éclipses selon le tableau 11 ; un ordinateur, une part"],
        ["Trésorerie communautaire", "6,18 % des récompenses, 8 éclipses", "Multi-sig, gouvernée par les Braises, extinction automatique à la 9e éclipse"],
        ["Prémine / équipe / investisseurs", "0 %", "Personne ne démarre avec un avantage ; l'équipe mine et se finance via la trésorerie publique"],
        ["Frais de transaction", "100 % aux mineurs", "Pas de part protocole, pas de MEV — en PoW-DAG, l'ordre est l'affaire du DAG, pas d'un constructeur"],
    ],
    ratios=[0.28, 0.24, 0.48],
    caption="Tableau 12 — Distribution et règles : tout est miné ou gouverné, rien n'est attribué",
)
callout("10 000 000", "ATU existent après huit ans — 61,8 % du plafond : la coupe d'or, obtenue au nombre rond exact")
body("Pourquoi 16,18 millions plutôt que les 100 millions de la v1 ? Parce "
     "que la demande a changé de nature : la v1 imaginait une monnaie de "
     "proximité à grande masse ; la v2 vise la réserve de confiance d'une "
     "économie d'agents et d'humains, où chaque unité porte une charge de "
     "réputation et de finalité. L'ordre de grandeur rejoint celui de "
     "Monero — la référence absolue des monnaies privées — avec une "
     "divisibilité en 10<super>8</super> qui rend le comptage confortable "
     "aux deux extrémités. Et l'utilisateur l'a demandé avant nous : un "
     "peu moins qu'avant, et un chiffre qui signifie quelque chose. "
     "Difficile de signifier plus qu'en choisissant la proportion qui "
     "structure les spirales de tournesol.")

# ═══ 15. SÉCURITÉ ═══
h1("Sécurité et menaces — la partie honnête")
body("Un document de proposition qui ne liste pas ses risques est un "
     "document de vente. Celui-ci n'en est toujours pas un. Les menaces "
     "sont classées par gravité, avec leurs mitigations et — parce qu'un "
     "risque mitigé n'est pas un risque disparu — leur statut résiduel, "
     "assumé en clair.")
table(
    ["Menace", "Gravité", "Mitigation", "Statut résiduel"],
    [
        ["Attaque 51 % du minage (réorganisation)", "Élevée", "Points de contrôle de l'Anneau : tout ce qui est signé est immuable ; l'attaque ne prospère que sur la fenêtre de 6 s avant checkpoint", "Réduit — la double dépense reste possible sur la fenêtre non signée"],
        ["Collusion de l'Anneau (55 sièges)", "Élevée", "Tirage pondéré par Kléos sur une population large ; déchéance totale au premier fork signé ; rotation à chaque ère", "Faible en régime établi ; réel pendant les premières ères"],
        ["Achat massif de Kléos", "Élevée", "La couche Durée n'est pas monétisable ; l'Écho est plafonné par budget et pondéré par le Fait du témoin ; indice de concentration surveillé", "Structurellement bloqué par le temps — le mur assumé"],
        ["Sybil sur les Braises (fausses humanités)", "Moyenne", "Parrainage plafonné à 2/an, engagement du Kléos du parrain, présence par ère", "Dépend de la taille de la toile établie ; les premières années sont les plus exposées"],
        ["Cadre réglementaire (MiCA, Travel Rule)", "Élevée", "Lumen : divulgation prouvable, minimisation RGPD native ; stratégie de monnaie de paiement, pas de produit spéculatif listé", "Structurel, non éliminable — la lisibilité est le maximum atteignable"],
        ["Échec du cap strict (sécurité long terme des mineurs)", "Moyenne", "Volume de paiements = ressource en frais ; monitoring public du budget de sécurité ; la gouvernance peut activer une queue par vote constitutionnel", "Le pari assumé du contrat symbolique"],
        ["Dette biométrique", "Nulle", "Aucune donnée corporelle collectée, nulle part, jamais", "Nulle — rien à fuiter"],
    ],
    ratios=[0.27, 0.11, 0.44, 0.18],
    caption="Tableau 13 — Registre des menaces, mitigations et statuts résiduels",
)
body("Deux menaces méritent un développement. La collusion de l'Anneau "
     "d'abord : elle est le prix du montage RAF, et son remède n'est pas "
     "technique mais démographique — plus la population à Kléos élevé est "
     "grande, plus l'achat d'une majorité de sièges exige d'acheter des "
     "années d'irréprochabilité à des gens qui n'ont aucune raison de "
     "vendre. Le réseau doit donc cultiver sa classe de réputation comme "
     "un bien commun, dès les premières ères ; c'est une politique, pas "
     "une fonction. Le risque réglementaire ensuite : la pire stratégie "
     "serait la discrétion — se cacher attire la suspicion, se rendre "
     "lisible invite l'expertise. La documentation Lumen, les preuves de "
     "conformité, l'argument RGPD sont conçus pour être montrés, pas "
     "subis : la transparence du mécanisme est la meilleure défense de "
     "l'opacité des données.")

# ═══ 16. FEUILLE DE ROUTE ═══
h1("Feuille de route et conclusion")
body("Le calendrier est réaliste parce qu'il est pensé pour deux "
     "développeurs, pas pour une fondation. Le socle est un fork de "
     "fondations éprouvées — socle CryptoNote pour la sphère privée, "
     "littérature GHOSTDAG publique pour la couche DAG — et tout ce qui "
     "est neuf (le Kléos, l'Anneau, le Lumen, les périmètres Cipher) est "
     "du code déterministe, testable et auditable, sans primitive "
     "cryptographique exotique. La règle d'or reste celle de la v1 : "
     "jamais un mainnet sur des fondations en version candidate ; "
     "maintenant à deux conditions près — chaque phase a un critère de "
     "sortie mesurable, et un NO-GO reste un résultat acceptable.")
table(
    ["Phase", "Mois", "Livrables mesurables", "Critère GO/NO-GO"],
    [
        ["1 · Spécification", "M1-M2", "Protocole écrit, ADR 001-007 (DAG, RAF, Kléos, Braise, Cipher, Lumen, économie), maquettes de formats", "Spécification relue par deux externes"],
        ["2 · Prototype DAG", "M3-M5", "Fork minant un DAG CPU 2 s sur devnet, propagation Dandelion++", "24 h de devnet sans réorganisation non anticipée"],
        ["3 · Anneau + Kléos v0", "M6-M8", "Checkpoints signés, score Fait calculé, rotation d'ères simulée", "Finalité < 6 s sur 100 000 blocs rejoués"],
        ["4 · Identités + Lumen", "M9-M12", "Braise devnet avec parrainages, Ciphers à périmètre, clés de vue bornées, audit externe du diff", "Audit sans faille critique"],
        ["5 · Testnet publique", "M13-M15", "Faucet, explorer, 100+ nœuds, simulateur d'agents de charge, rituel d'upgrade ×3", "Trois upgrades répétés sans incident"],
        ["6 · Genesis", "M16-M18", "Cérémonie publique, binaries 5 cibles signés, document Lumen pour régulateurs publié", "Tous les critères précédents"],
    ],
    ratios=[0.17, 0.10, 0.45, 0.28],
    caption="Tableau 14 — Dix-huit mois, six phases, un NO-GO toujours acceptable",
)
bullet("Le code se partage dès la phase 1 : le porteur du projet et son "
       "assistant codent ensemble — l'un dans le protocole, l'autre dans "
       "les outils, la revue croisée en continu, les deux noms sur chaque "
       "ADR.")
bullet("L'écosystème XelisVault (caisse, tickets, paper wallet) devient "
       "multi-chaîne à la phase 5 : un drapeau de fonctionnalité, pas une "
       "réécriture — NERVA d'abord, ANTUMBRA à la suite.")
bullet("Réservation des identités (domaine, réseaux sociaux, dépôts) dès "
       "validation du nom ANTUMBRA, avant même la phase 2.")
body("Trois décisions humaines attendent, et tout le reste est mécanique : "
     "valider le nom ANTUMBRA et son ticker ATU ; valider l'architecture "
     "Kléos à trois couches — le Fait, l'Écho, la Durée — et son usage "
     "pour l'Anneau, les parrainages et la gouvernance ; valider le "
     "contrat du nombre d'or — 16 180 339 ATU, éclipses dorées de quatre "
     "ans, cap strict atteint en 136 ans, trésorerie 6,18 %. Une fois ces "
     "trois oui prononcés, la "
     "semaine 1 est écrite : dépôt public, README bilingue, ADR 001, et "
     "le premier bloc de devnet n'est plus qu'une question de mois.")
body("Ce document est une base de discussion, pas un engagement ferme — et "
     "c'est précisément pourquoi il peut se permettre d'être honnête. La "
     "demande de 2026 est réelle et mesurable : des agents qui paient, "
     "des bots à distinguer des humains, des régulateurs à qui montrer "
     "des preuves plutôt que des promesses, des utilisateurs qui veulent "
     "l'instantané. La réponse proposée tient en une image, celle qui "
     "donne son nom au réseau : une ombre fidèlement gardée, entourée "
     "d'un anneau de lumière que chacun peut vérifier à la demande. La "
     "confidentialité comme un droit, la preuve comme une politesse, et "
     "le temps comme le seul juge de paix que l'argent ne corrompt pas.")

