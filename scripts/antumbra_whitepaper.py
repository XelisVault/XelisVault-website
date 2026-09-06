# -*- coding: utf-8 -*-
"""Livre blanc ANTUMBRA v1.0 (français) : contenu.

Document public de référence, distinct de la proposition de réflexion v3.
Même univers conceptuel (Voile, Lumen, Braise, Cipher, Kléos, Anneau,
éclipses dorées), style de livre blanc : prose professionnelle dense,
formules numérotées, aucun tiret cadratin.

Types de blocs : h1, h2, body, bullet, table, callout, figure, quote,
formula. Le moteur (gen-antumbra-whitepaper.py) interprète et vérifie
l'absence de tiret cadratin et de caractères interdits.
"""

C = []

def h1(t): C.append(('h1', t))
def h2(t): C.append(('h2', t))
def body(t): C.append(('body', t))
def bullet(t): C.append(('bullet', t))
def formula(t): C.append(('formula', t))
def table(head, rows, ratios=None, caption=None):
    C.append(('table', {'head': head, 'rows': rows, 'ratios': ratios, 'caption': caption}))
def callout(big, label): C.append(('callout', {'big': big, 'label': label}))
def figure(path, caption): C.append(('figure', {'path': path, 'caption': caption}))
def quote(t): C.append(('quote', t))

# ═══ 1. RÉSUMÉ EXÉCUTIF ═══
h1("Résumé exécutif")

body("ANTUMBRA est une blockchain de règlement conçue pour un problème qu'aucun "
     "réseau existant ne traite comme une primitive : la confiance vérifiable "
     "entre humains et machines. En 2026, des millions d'agents logiciels "
     "achètent, vendent et paient pour le compte de personnes ; les rails qui "
     "les portent, construits autour de stablecoins entièrement transparents, "
     "ne savent rien dire de la fiabilité d'un agent, de la personne qui "
     "respond de lui, ni des bornes de son budget. Dans le même temps, les "
     "preuves d'humanité dominantes gravent des données corporelles dans des "
     "registres mondiaux, et les monnaies réellement privées restent lentes ou "
     "illisibles pour les régulateurs. Le terrain commun de ces quatre "
     "demandes, le commerce des agents, la preuve d'humanité, la conformité "
     "prouvable et l'instantanéité, est vide. Ce livre blanc occupe ce terrain.")

body("La thèse du projet tient en une phrase : dans l'économie qui vient, la "
     "ressource rare n'est ni le débit ni la confidentialité seule, c'est la "
     "confiance qui se construit dans le temps, parce qu'elle ne peut pas "
     "s'acheter. ANTUMBRA encode cette ressource en un score de réputation "
     "consensuel, le Kléos, composé de trois couches dont la plus lourde est "
     "l'ancienneté ; puis elle en fait la matière première de tout le reste. "
     "La réputation tire les cinquante-cinq sièges du comité de finalité, "
     "verrouille le parrainage des identités humaines, qualifie les agents et "
     "forme la troisième chambre de gouvernance. Le pouvoir ne se capitalise "
     "pas : il se gagne, se corrode et se perd.")

body("Cinq choix structurels définissent le réseau et n'existent nulle part "
     "ailleurs en combinaison. Un BlockDAG minable sur processeur grand "
     "public, avec des blocs toutes les deux secondes et des transactions "
     "privées par défaut. Une finalité signée par un comité tiré à la "
     "réputation, qui rend tout paiement irréversible en moins de six "
     "secondes sans verrouiller le moindre capital. Des identités humaines "
     "non biométriques, une par personne, fondées sur la présence, le "
     "parrainage plafonné et la durée. Des agents responsables par "
     "construction : parrainés par un humain, à périmètre de dépense "
     "révocable. Enfin une divulgation sélective native, le Lumen, qui permet "
     "à chaque utilisateur d'ouvrir exactement la part de son activité qu'il "
     "choisit, pour un comptable, un auditeur ou un régulateur, sans jamais "
     "exposer le reste.")

table(
    ["Grandeur", "Valeur", "Sens"],
    [
        ["Plafond monétaire", "16 180 339 ATU", "le nombre d'or multiplié par dix millions ; la même proportion pilote RandomX"],
        ["Émission", "34 éclipses de 4 ans", "chaque éclipse émet 61,8 % de la précédente ; cap exact en 136 ans"],
        ["Bloc", "2 secondes", "inclusion quasi immédiate ; le DAG absorbe les blocs parallèles"],
        ["Finalité économique", "moins de 6 secondes", "checkpoints signés par l'Anneau, quorum de 37 sur 55 sièges"],
        ["Confidentialité", "privée par défaut", "anneaux de seize, montants engagés, adresses uniques, Tor activé"],
        ["Divulgation", "sélective, à trois niveaux", "par transaction, par auditeur borné, par preuve de conformité"],
        ["Réputation", "Kléos, 0 à 100", "Fait 40, Écho 30, Durée 30 ; non transférable, corrodée par le temps"],
        ["Prémine", "0 %", "tout est miné ou gouverné ; personne ne démarre avec un avantage"],
    ],
    ratios=[0.24, 0.28, 0.48],
    caption="Tableau 1 : les grandeurs de référence du réseau",
)

body("Ce document est la spécification publique de référence, version 1.0. "
     "Il décrit l'architecture, le cycle de vie complet d'une transaction "
     "avec ses constructions cryptographiques, l'algorithme de réputation et "
     "ses règles correctives, l'économie du nombre d'or, les contrats en "
     "trois étages et une feuille de route de dix-huit mois. Chaque chapitre "
     "distingue ce qui est hérité de socles éprouvés de ce qui est neuf et "
     "devra être validé par prototype, par simulation et par audit, selon la "
     "méthode exposée au chapitre 15. La spécification du noyau social a déjà "
     "subi ce traitement : sa simulation déterministe a révélé une fenêtre "
     "d'attaque, quatre règles correctives l'ont refermée, et la même "
     "attaque rejouée ne prend plus un seul siège sur seize ans. Ce standard "
     "d'auto-épreuve s'appliquera à tout le reste.")

# ═══ 2. LE PROBLÈME EN 2026 ═══
h1("Le problème : la confiance de l'économie humains-machines")

body("Une blockchain ne se justifie que par une demande structurelle, "
     "croissante et mal servie. Quatre courants convergent en 2026 vers le "
     "même point, et ce point n'est occupé par personne. Le premier est le "
     "commerce agentique. Coinbase a relancé le code HTTP 402 avec le "
     "protocole x402, Stripe et Coinbase se disputent les rails de paiement "
     "machine-à-machine, et quatre standards rivaux se partagent le même "
     "territoire. Tous ces rails partagent trois angles morts : ils sont "
     "dénominés en stablecoins, entièrement transparents, et dépourvus de "
     "toute confiance portable. Un agent y paie, point final ; rien ne dit "
     "s'il est fiable, pour qui il agit, ni qui respond de lui. Or un "
     "marchand qui encaisse un agent inconnu, un comptable qui audite une "
     "flotte d'agents, un client qui délègue un budget, ont tous besoin de "
     "la même chose : savoir à qui ils ont affaire.")

body("Le deuxième courant est la preuve d'humanité. Les bots saturent le web "
     "au point que la défense des plateformes est devenue la distinction "
     "entre personnes et programmes. Les réponses dominantes sont "
     "biométriques : l'iris pour l'un, la biométrie intégrée au consensus "
     "pour l'autre. Chacune engrange la même dette, une donnée corporelle "
     "irréversible, centralisée à la collecte même quand la preuve est "
     "décentralisée. Une fois un gabarit d'iris gravé quelque part, il "
     "n'existe pas de seconde chance ; le registre parfait des fuites à "
     "venir est déjà écrit. Le troisième courant est réglementaire : MiCA et "
     "le Travel Rule du GAFI maintiennent une pression soutenue sur les "
     "monnaies privées, tandis que Zcash démontre la voie praticable, parce "
     "qu'un régulateur qui regarde son mécanisme le comprend : pools "
     "blindées, clés de vue, divulgation explicite. La lisibilité, pas la "
     "transparence, est le critère d'acceptation. Le quatrième courant est "
     "l'instantanéité : un paiement de comptoir doit devenir irréversible en "
     "secondes ; les chaînes privées existantes demandent des dizaines de "
     "secondes à plusieurs minutes de finalité réelle.")

table(
    ["Demande 2026", "Offre dominante", "Angle mort laissé ouvert"],
    [
        ["Paiements des agents (x402, MPP, ACP, AP2)", "rails HTTP et stablecoins transparents", "confiance portable, confidentialité, responsable désigné : aucun"],
        ["Preuve d'humanité", "biométrie (iris, visage, veines)", "personhood non biométrique, sans registre corporel"],
        ["Confidentialité soutenable (MiCA, Travel Rule)", "Zcash : divulgation sélective ; Monero : opacité", "confidentialité native avec conformité prouvable"],
        ["Paiement quasi instantané et privé", "Kaspa (rapide, transparent) ; Monero (privé, lent)", "rapide, privé et finalisé en secondes, sur matériel égalitaire"],
    ],
    ratios=[0.34, 0.33, 0.33],
    caption="Tableau 2 : les quatre demandes et le carré vide au centre",
)

body("Le carré central de ce tableau est vide, et il ne l'est pas par "
     "impossibilité technique : il l'est parce que chaque écosystème a "
     "optimisé une seule dimension. Les rails agentiques optimisent le "
     "débit, la biométrie optimise l'anti-sybil, Zcash optimise la "
     "légitimité réglementaire, Kaspa optimise la vitesse. Aucun ne traite "
     "la confiance, qui agit, depuis combien de temps, répondable jusqu'à "
     "quel humain, comme une primitive du protocole. Le réseau qui l'y "
     "installe doit conjuguer cinq propriétés considérées jusqu'ici comme "
     "incompatibles : la vitesse, la confidentialité par défaut, la "
     "divulgation prouvable, l'égalitarisme du processeur et une réputation "
     "que le capital ne peut pas fabriquer. C'est l'objet de ce document de "
     "montrer que ces propriétés se renforcent mutuellement dès qu'une "
     "seule d'entre elles, la réputation ancrée dans le temps, est traitée "
     "comme le fondement.")

# ═══ 3. ARCHITECTURE D'ENSEMBLE ═══
h1("Architecture d'ensemble")

body("ANTUMBRA sépare proprement ce que la plupart des chaînes entassent : "
     "le règlement, la finalité, l'identité et la divulgation. La couche de "
     "règlement, en bas, est un BlockDAG minable sur processeur qui ordonne "
     "des blocs parallèles toutes les deux secondes et porte des "
     "transactions privées par défaut : c'est le Voile. La couche de "
     "finalité, l'Anneau, est un comité de cinquante-cinq identités à haute "
     "réputation qui signent des points de contrôle toutes les quatre "
     "secondes et rendent tout paiement irréversible en moins de six "
     "secondes. La couche d'identité distingue les humains, les Braises, "
     "des agents, les Ciphers, avec leurs règles d'admission et de "
     "responsabilité. La couche de réputation, le Kléos, alimente l'Anneau, "
     "verrouille les parrainages et pondère les témoignages. Autour de "
     "l'ensemble, le Lumen, la divulgation sélective, forme l'anneau de "
     "lumière qui donne son nom au réseau : une ombre fidèlement gardée, "
     "des preuves à la demande.")

figure("gen-img-tmp/antumbra-architecture.png",
       "Figure 1 : les quatre couches d'ANTUMBRA et le Lumen, divulgation sélective en anneau de lumière")

body("La nomenclature est stable dans tout le document ; chaque nom désigne "
     "une pièce précise et une seule. Le lecteur peut revenir au tableau "
     "suivant à tout moment. Les noms internes sont des noms de code de "
     "travail, choisis pour rendre le document lisible ; ils pourront être "
     "adaptés le jour de l'implémentation. Seul ANTUMBRA et son sigle ATU "
     "sont proposés comme engagement définitif, vérifiés libres de collision "
     "le 6 septembre 2026 sur l'espace blockchain et crypto.")

table(
    ["Nom", "Nature", "Rôle en une phrase"],
    [
        ["ANTUMBRA", "le réseau", "BlockDAG privé de règlement, minable sur processeur"],
        ["ATU", "la monnaie", "16 180 339 unités, divisibles en 10<super>8</super>"],
        ["Voile", "la confidentialité", "anneaux de seize, montants engagés, adresses uniques, Tor par défaut"],
        ["Lumen", "la divulgation", "clés de vue hiérarchiques et preuves de conformité, à la demande"],
        ["Braise", "l'identité humaine", "une par personne, non biométrique, une voix en gouvernance"],
        ["Cipher", "l'identité d'agent", "parrainée par une Braise, à périmètre de dépense révocable"],
        ["Kléos", "la réputation", "score à trois couches, consensuel, non transférable, non achetable"],
        ["l'Anneau", "le comité de finalité", "55 sièges à haute réputation, points de contrôle toutes les 4 s"],
        ["RAF", "le mécanisme de finalité", "finalité ancrée sur la réputation (Reputation-Anchored Finality)"],
        ["ère", "le temps du protocole", "six mois ; unité de réputation, de rotation et de décroissance"],
        ["éclipse", "le temps de l'émission", "quatre ans, huit ères ; 34 éclipses mènent au plafond en 136 ans"],
        ["Mandat", "le contrat d'argent", "sortie dont la libération obéit à un prédicat déclaré à la création"],
        ["la Machine", "le contrat logique", "machine virtuelle déterministe sur l'état public seul, après la genesis"],
    ],
    ratios=[0.15, 0.24, 0.61],
    caption="Tableau 3 : nomenclature de référence",
)

body("Deux principes gouvernent l'assemblage. D'abord, chaque couche ne "
     "dépend que des couches inférieures : le règlement ignore la "
     "réputation, la finalité lit le Kléos mais ne l'écrit pas, l'identité "
     "s'appuie sur les deux sans les modifier. Cette discipline d'empilement "
     "est ce qui rend chaque pièce auditable isolément et remplaçable sans "
     "réécrire le reste. Ensuite, la boucle de valeur : la réputation "
     "protège la finalité, la finalité rend les paiements instantanés, "
     "l'instantanéité sert les agents et les marchands, et leur comportement "
     "honorable enrichit la réputation. Le réseau est conçu pour que sa "
     "sécurité et son utilité se nourrissent l'une l'autre au lieu de se "
     "taxer mutuellement.")

# ═══ 4. LA COUCHE DE RÈGLEMENT ═══
h1("La couche de règlement : un BlockDAG minable sur processeur")

body("Le premier pari est égalitariste. RandomX, l'algorithme conçu pour "
     "que un ordinateur ordinaire soit un vote, produit des blocs qu'aucune "
     "machine spécialisée ne produit mieux à prix égal : ni circuit "
     "dédié, ni ferme de cartes graphiques. L'émission et la production de "
     "blocs restent accessibles à quiconque possède un ordinateur portable, "
     "l'éthos de NERVA poussé au bout. La constante 0x9E3779B9, troncature "
     "entière du nombre d'or en arithmétique binaire, pilote déjà la "
     "génération des programmes superscalaires de RandomX ; la même "
     "proportion qui distribuera la monnaie travaille déjà dans le moteur "
     "qui la minera.")

body("Le second pari est structurel. Une chaîne linéaire doit choisir entre "
     "blocs courts, qui multiplient les orphelins, et blocs longs, qui "
     "ralentissent la confirmation ; un DAG ordonne les blocs parallèles au "
     "lieu de les rejeter. À la cadence de deux secondes, un réseau de "
     "preuve de travail linéaire perdrait une part insoutenable de ses "
     "blocs ; un DAG à convergence rapide les intègre dans son ordre "
     "partiel et cumule le travail de tous. La vitesse cesse d'être un "
     "compromis avec l'égalitarisme : elle devient son produit. La couche "
     "d'ordre retenue est de famille GHOSTDAG, dont la littérature publique "
     "et les implémentations existantes fournissent les définitions "
     "opératoires de la convergence et de l'anticone.")

table(
    ["Paramètre", "Valeur retenue", "Justification"],
    [
        ["Algorithme de minage", "RandomX, 4 Mo, mode léger", "éprouvé par des années d'attaques ; processeur seul, par conception"],
        ["Cadence des blocs", "2 secondes", "inclusion quasi immédiate ; le DAG absorbe le taux d'orphelins"],
        ["Ordre des blocs", "DAG à convergence rapide (famille GHOSTDAG)", "la sécurité croît avec le volume de blocs, pas seulement la profondeur"],
        ["Anonymat des flux", "anneau de 16, montants masqués", "trois fois l'ensemble de leurres des réglages CryptoNote courants"],
        ["Réseau de transport", "Dandelion++, Tor par défaut", "l'analyse d'adresses IP est la faille pratique numéro un des chaînes privées"],
        ["Finalité", "points de contrôle de l'Anneau (chapitre 6)", "irrévocabilité économique en moins de 6 secondes"],
        ["Débit cible, phase 1", "100 à 300 transactions par seconde", "vérification d'anneaux parallélisable ; taille adaptative"],
        ["Stockage", "DAG élagué", "un nœud complet doit tenir sur un ordinateur personnel"],
    ],
    ratios=[0.26, 0.30, 0.44],
    caption="Tableau 4 : paramètres de la couche de règlement",
)

body("L'élagage mérite une phrase complète, parce qu'il conditionne le "
     "contrat social tout entier : ne conserver de l'histoire que l'état "
     "récent et les preuves cryptographiques du passé, de sorte qu'un nœud "
     "complet reste dans les bornes d'un ordinateur personnel. Un réseau "
     "dont les nœuds exigeraient une baie de disques exclurait exactement "
     "les participants qu'il prétend servir. La propagation en tige "
     "Dandelion++ et le transport Tor ferment la porte à l'analyse "
     "d'adresses IP, qui reste la grande faiblesse pratique des réseaux "
     "privés mal configurés : la confidentialité de transaction n'est rien "
     "si l'observateur réseau sait qui a émis quoi.")

body("Un mot d'honnêteté pour clore le chapitre : greffer un DAG à "
     "convergence rapide sur un socle CryptoNote est un défi d'ingénierie "
     "réel, du travail de fond et non un drapeau de configuration. La "
     "feuille de route (chapitre 16) le traite comme le premier risque "
     "technique du projet, avec un prototype isolé et un audit dédié avant "
     "tout réseau principal. Le cahier des charges est précis, la "
     "littérature est publique et solide, et aucune des primitives "
     "utilisées n'est exotique : le risque est un degré de difficulté, pas "
     "un degré d'incertitude.")

# ═══ 5. LE CYCLE DE VIE D'UNE TRANSACTION ═══
h1("Le cycle de vie d'une transaction")

body("Ce chapitre décrit ce qu'il y aura sur le réseau et comment les "
     "paiements fonctionnent, étape par étape, de la composition du "
     "paiement dans le portefeuille jusqu'à son irrévocabilité. Une "
     "transaction privée digne de ce nom doit prouver quatre choses sans "
     "rien révéler : que l'émetteur possédait les fonds, que les montants "
     "se conservent, que la pièce dépensée ne l'a jamais été ailleurs, et "
     "que l'émetteur a bien autorisé la dépense. Chacune de ces preuves "
     "repose sur une construction cryptographique distincte, héritée de la "
     "lignée CryptoNote que Monero et NERVA ont portée pendant une décennie "
     "et validée sous attaque continue. Le génie de cette lignée n'est pas "
     "d'avoir inventé des objets exotiques : c'est d'avoir composé des "
     "objets simples, chacun éprouvé, en un système dont la propriété de "
     "confidentialité est démontrable et non déclarative.")

h2("Étape 1 : l'adresse à usage unique")

body("Toute identité de paiement publie deux clés publiques, une clé de "
     "vue A et une clé de dépense B. Lorsque Alice paie Bob, elle tire un "
     "aléa r, calcule le point R = rG, puis dérive une adresse à usage "
     "unique P que personne ne peut relier à l'adresse publiée de Bob. Bob "
     "balaye chaque nouvelle sortie du DAG et reconnaît les siennes en "
     "rejouant le même calcul avec sa clé de vue privée a : une "
     "multiplication et une addition suffisent, son portefeuille peut "
     "scanner des milliers de sorties par seconde. Aucune adresse n'est "
     "jamais réutilisée ; l'analyse de graphe, première arme des chaînes "
     "transparentes, ne dispose d'aucun nœud auquel s'accrocher.")

formula("P = H<sub>s</sub>(rA)G + B   puis, côté destinataire :   "
        "P = H<sub>s</sub>(aR)G + B")
formula("avec R = rG publié dans la transaction ; H<sub>s</sub> désigne un "
        "hachage ramené sur la courbe, G le générateur du groupe")

h2("Étape 2 : les montants sous engagement")

body("Le montant v de chaque sortie n'est jamais écrit en clair. Il est "
     "engagé par un engagement de Pedersen : une enveloppe scellée qui "
     "possède une propriété remarquable, l'addition. Deux enveloppes "
     "peuvent s'additionner, et leur somme engage la somme des montants, "
     "sans que personne n'ouvre les enveloppes. C'est cette homomorphie qui "
     "permet au réseau de vérifier la conservation des montants à chaque "
     "dépense, tout en restant incapable de lire un seul montant. Le "
     "facteur d'aveuglement b, propre à chaque sortie, interdit la "
     "devination par force brute des montants petits, faiblesse historique "
     "des premières monnaies masquées ; il relie aussi la sortie à son "
     "destinataire, qui seul peut en reconstituer la valeur.")

formula("C = vH + bG   (engagement de Pedersen sur le montant v)")

h2("Étape 3 : l'anneau de leurres")

body("La dépense référence des sorties antérieures ; les référencer "
     "directement dévoilerait le graphe. La signature en anneau "
     "sélectionne donc, autour de la vraie sortie dépensée, quinze leurres "
     "pris parmi les sorties non dépensées du DAG : seize clés "
     "candidates, dont une seule réelle, et une signature qui prouve la "
     "connaissance d'un secret parmi les seize sans dire lequel. La "
     "probabilité d'identification de la vraie dépense est donc de un sur "
     "seize pour un observateur extérieur, quelle que soit sa puissance de "
     "calcul ; l'anonymat est probabiliste par ensemble, exactement comme "
     "l'irrévocabilité est probabiliste par profondeur dans les preuves de "
     "travail classiques. Les leurres sont échantillonnés par tranches "
     "d'âge suivant la distribution réelle des dépenses, pour que la "
     "composition de l'anneau ne trahisse pas, statistiquement, l'âge de "
     "la vraie sortie.")

h2("Étape 4 : l'image de clé, garde-fou de la double dépense")

body("Sans garde-fou, un même secret pourrait signer deux anneaux "
     "différents et dépenser deux fois la même sortie. L'image de clé "
     "résout ce paradoxe : une empreinte déterministe de la sortie "
     "dépensée, publiée avec la transaction et stockée dans un registre de "
     "nullifiants. Deux dépenses du même secret produisent la même image "
     "de clé, le réseau rejette la seconde, et cependant l'image ne permet "
     "pas de remonter à la sortie réelle de l'anneau ni de lier deux "
     "paiements d'un même portefeuille : la construction est dite non "
     "traçable et non liable. La double dépense est ainsi rendue "
     "structurellement impossible sans sacrifier la confidentialité, "
     "propriété que la lignée CryptoNote démontre en production depuis "
     "2014.")

formula("I = xH<sub>p</sub>(xG)   (image de clé, publiée et vérifiée "
        "contre le registre des nullifiants)")

h2("Étape 5 : la preuve d'intervalle")

body("Un engagement masque le montant, mais rien n'interdirait "
     "d'engager un montant négatif : dépenser dix unités en fabriquant "
     "une sortie de moins dix, et l'arithmétique homomorphe resterait "
     "vérifiable tout en créant de la monnaie. La preuve d'intervalle "
     "ferme cette porte : chaque sortie prouve, sans révéler v, que le "
     "montant appartient à l'intervalle positif borné des montants "
     "autorisés. ANTUMBRA retient les Bulletproofs, déjà standard dans la "
     "lignée, dont la taille croît comme le logarithme de la précision et "
     "dont la vérification, agrégée par bloc, se parallélise sur les "
     "processeurs grand public : une preuve d'intervalle classique "
     "aurait ruiné le débit ; la forme logarithmique le préserve.")

formula("preuve : v ∈ [0, 2<super>64</super>) sans révéler v")

h2("Étape 6 : conservation, signature et frais")

body("La transaction assemblée comporte des entrées (sorties antérieures "
     "dépensées en anneau), des sorties (engagements neufs), des images de "
     "clé, des preuves d'intervalle, un champ de données libre borné et "
     "les frais. La règle de validation centrale tient en une égalité : la "
     "somme des engagements d'entrée, dont l'émetteur peut ouvrir la "
     "composition, égale la somme des engagements de sortie augmentée de "
     "l'engagement des frais. Comme les engagements s'additionnent, cette "
     "égalité prouve la conservation de la masse monétaire sans jamais "
     "dévoiler un montant. La signature en anneau prouve l'autorisation, "
     "les images de clé prouvent la non-dépense, les preuves d'intervalle "
     "bornent les montants : les quatre exigences de l'ouverture du "
     "chapitre sont chacune couvertes par une construction distincte, et "
     "cette séparation est ce qui rend l'ensemble auditable clause par "
     "clause.")

formula("Σ<sub>in</sub> C<sub>j</sub> = Σ<sub>out</sub> C<sub>i</sub> + C<sub>frais</sub>   "
        "(conservation homomorphe, montants masqués)")

h2("Étape 7 : la propagation en tige")

body("Diffuser une transaction depuis l'adresse IP de l'émetteur serait "
     "offrir à l'observateur réseau ce que la cryptographie vient de lui "
     "refuser. La propagation Dandelion++ fait cheminer la transaction en "
     "phase de tige, de pair en pair sur une route aléatoire, avant "
     "d'éclore en phase de ballon vers tout le réseau : l'origine "
     "apparente de la diffusion n'est plus l'émetteur mais un pair "
     "anonyme, à plusieurs sauts. Le transport Tor, activé par défaut, "
     "achève le travail en masquant l'adresse réseau des nœuds eux-mêmes. "
     "Un observateur qui voudrait relier un paiement à une machine "
     "devrait vaincre simultanément l'anneau, l'engagement, l'adresse à "
     "usage unique, la tige et le réseau d'anonymat : cinq murailles "
     "indépendantes, chacune éprouvée seule depuis des années.")

h2("Étape 8 : inclusion, checkpoint et irrévocabilité")

body("La transaction entre dans un bloc de deux secondes, produit par un "
     "mineur processeur et ordonné par le DAG. Le mineur vérifie "
     "l'intégralité des preuves décrites ci-dessus avant d'inclure la "
     "transaction, et chaque nœud rejoue ces vérifications à la "
     "réception : le réseau ne fait confiance à personne, il rejoue tout. "
     "L'inclusion n'est pas encore l'irrévocabilité ; celle-ci vient du "
     "checkpoint suivant, signé toutes les quatre secondes par l'Anneau "
     "(chapitre 6). Dès qu'un point de contrôle atteint son quorum, tout "
     "ce qu'il couvre est finalisé : une double dépense devrait "
     "simultanément réorganiser le travail accumulé du DAG et casser la "
     "majorité des signatures du comité. Pour le marchand au comptoir, la "
     "séquence complète, de l'envoi à l'irrévocabilité, tient en moins de "
     "six secondes.")

table(
    ["Type de transaction", "Contenu spécifique", "Validation supplémentaire"],
    [
        ["Transfert", "sorties Voile standard", "aucune au-delà des huit étapes"],
        ["Mandat", "sortie à prédicat de libération (chapitre 13)", "le prédicat est exécutable et borné par la taille"],
        ["Enregistrement d'identité", "Braise ou Cipher, parrain, périmètre", "parrain valide, quota de parrainage, preuve de présence"],
        ["Attestation Kléos", "témoignage ±1 avec preuve on-chain", "témoin établi, budget d'Écho, anti-réciprocité"],
        ["Vote de gouvernance", "chambre, proposition, choix", "droit de vote de la chambre concernée"],
        ["Checkpoint", "hachage du sommet ordonné du DAG", "quorum de 37 signatures sur 55 sièges"],
    ],
    ratios=[0.24, 0.40, 0.36],
    caption="Tableau 5 : les types de transactions du réseau",
)

h2("Le modèle de frais")

body("Les frais achètent deux ressources réelles : la place dans les "
     "blocs, qui est une bande passante, et le travail de vérification, "
     "qui est du temps de processeur des nœuds. Le modèle retenu est "
     "volontairement simple, parce qu'un modèle simple est prévisible pour "
     "le marchand, auditable pour le nœud et difficile à manipuler : une "
     "part fixe, une part proportionnelle à la taille, et une majoration "
     "par sortie à anneau, la construction la plus coûteuse à vérifier. "
     "Les frais sont versés intégralement aux mineurs ; aucun prélèvement "
     "de protocole ne s'ajoute, et l'ordre des transactions dans le DAG "
     "n'appartient à aucun extracteur de valeur : la structure même du "
     "DAG, où les blocs parallèles s'ordonnent par consensus de règle, "
     "ferme la niche du front-running qui finance les guerres de "
     "mempool des chaînes à constructeurs.")

formula("f = f<sub>0</sub> + f<sub>kB</sub> × n<sub>kB</sub> + f<sub>ring</sub> × m   "
        "(m sorties à anneau, n<sub>kB</sub> kibioctets)")
formula("bornes de gouvernance : f<sub>0</sub> ajustable dans [f<sub>min</sub>, f<sub>max</sub>] "
        "par la voie rapide, hors de ces bornes par la voie constitutionnelle")

body("L'honnêteté du chapitre, pour finir : des huit étapes, sept sont de "
     "l'héritage direct de la lignée CryptoNote, éprouvée en production "
     "sur des réseaux à des centaines de milliers de transactions par "
     "jour ; la nouveauté d'ANTUMBRA est la composition, l'anneau élargi "
     "à seize, la cadence de deux secondes rendue soutenable par le DAG, "
     "et le couplage avec la finalité de l'Anneau. La seule construction "
     "réellement neuve, les checkpoints à la réputation, fait l'objet du "
     "chapitre suivant et d'un traitement de risque dédié. Cette "
     "répartition de la nouveauté, maximale sur les règles, minimale sur "
     "les primitives, est une décision de méthode : les primitives "
     "cryptographiques neuves sont le cimetière des projets de monnaie "
     "privée, et la feuille de route n'en introduit aucune avant sa "
     "validation par audit externe.")

# ═══ 6. L'ANNEAU ET LA FINALITÉ ═══
h1("L'Anneau : la finalité ancrée sur la réputation")

body("Être inclus dans un bloc en deux secondes ne suffit pas : encore "
     "faut-il que le paiement devienne irréversible assez vite pour la "
     "cliente debout devant son comptoir. Les chaînes à consensus "
     "tolérant aux fautes résolvent ce problème en échange d'un verrou de "
     "capital : il faut staker pour signer, et qui peut staker achète la "
     "finalité. L'Anneau prend le chemin inverse. Ses cinquante-cinq "
     "sièges ne s'achètent pas, ils se tirent, à chaque ère, parmi les "
     "identités dont le Kléos dépasse le seuil de candidature : un tirage "
     "déterministe, pondéré par le score, sur une fenêtre de candidats "
     "publiée d'avance, auditable par tous. La formule du tirage est "
     "linéaire en score, volontairement : une pondération quadratique "
     "concentrerait les sièges sur les sommets, et l'indice de "
     "concentration du Kléos total, surveillé par la gouvernance, borne "
     "de toute façon la part d'aucun acteur dans une cohorte.")

formula("P(i) = K<sub>i</sub> / Σ<sub>j∈C</sub> K<sub>j</sub>   "
        "(probabilité de tirage du siège, candidats C à Kléos ≥ 70)")

body("Toutes les quatre secondes, l'Anneau signe collectivement un point "
     "de contrôle, le hachage du DAG ordonné jusqu'à un sommet donné. La "
     "tolérance aux fautes byzantines d'un comité de cinquante-cinq "
     "membres admet dix-huit fauteurs ; le quorum de signature est donc "
     "de trente-sept, les deux tiers stricts. Dès qu'un point de contrôle "
     "atteint son quorum, tout ce qu'il couvre est finalisé : la double "
     "dépense devrait casser simultanément la majorité de l'Anneau et la "
     "continuité du minage, deux économies de faute indépendantes. Un "
     "siège qui signerait un fork concurrent est déchu : son Kléos "
     "remis à zéro, et avec lui les années qui le constituaient. La "
     "sanction ne porte pas sur un dépôt récupérable, elle porte sur la "
     "seule chose qu'un validateur d'ANTUMBRA possède de précieux.")

formula("n = 3f + 1 = 55, f = 18, quorum = 2f + 1 = 37 signatures")

body("La défaillance est conçue, pas niée. Si un tiers des sièges se "
     "tait, panne, censure ou attaque, le réseau ne s'arrête pas : le "
     "minage continue, les paiements continuent, et la finalité retombe "
     "sur la profondeur de preuve de travail classique, dix blocs, vingt "
     "secondes, en attendant que l'ère suivante retire les silencieux. "
     "L'Anneau n'est pas un goulot de production, il ne produit rien : "
     "c'est un notaire de l'ordre, et un notaire en grève ralentit "
     "l'irrévocabilité, jamais les paiements. Ce découplage est la "
     "raison pour laquelle un réseau égalitaire peut s'offrir une "
     "finalité de classe mondiale sans jamais vendre ses sièges.")

body("Il faut le dire une fois pour toutes : ce montage n'est pas une "
     "preuve d'enjeu. Aucun capital n'est verrouillé, aucun rendement "
     "n'est servi aux sièges, aucune hiérarchie d'enrichissement ne se "
     "reproduit. Le pouvoir de finalité découle du Kléos ; le Kléos "
     "découle du comportement et du temps ; et le temps n'est à vendre "
     "nulle part. C'est la correction exacte de la formule qui a inspiré "
     "ce projet, où la réputation multipliait le capital : ici, le "
     "capital ne multiplie rien.")

# ═══ 7. VOILE ET LUMEN ═══
h1("Voile et Lumen : la confidentialité lisible")

body("La confidentialité d'ANTUMBRA est privée par défaut et prouvable à "
     "la demande : deux faces d'un même mécanisme, non deux modes "
     "contradictoires. Le Voile, côté pile, rend les soldes, les montants "
     "et les liens payeur-payé invisibles à l'observateur du réseau ; le "
     "chapitre 5 en a décrit les constructions. Le Lumen, côté face, "
     "permet au propriétaire d'ouvrir exactement la part voulue, pour le "
     "destinataire voulu, pour la durée voulue. C'est la leçon la plus "
     "rentable de Zcash, lue au premier degré : cette chaîne a survécu à "
     "des régulateurs qui fuyaient la lignée opaque, parce que son "
     "mécanisme se comprend en le regardant, pools blindées, clés de vue, "
     "divulgation explicite. L'acceptabilité réglementaire n'est pas une "
     "question de transparence : c'est une question de lisibilité.")

body("Le Lumen opère à trois niveaux. La clé de vue par transaction : le "
     "payeur prouve un paiement précis à son unique destinataire, sans "
     "rien dévoiler du reste. La clé d'auditeur bornée : un comptable "
     "reçoit un droit de lecture plafonné dans le temps et borné à un "
     "périmètre ; il voit les flux d'une activité, pas l'identité derrière. "
     "La preuve de conformité : une preuve cryptographique non interactive "
     "établit un fait, le montant transféré reste sous un plafond, les "
     "fonds engagés sont âgés de plus de n blocs, le solde couvre un "
     "engagement, sans jamais révéler montants, adresses ni historique. "
     "La portabilité de ces preuves vers les exigences du Travel Rule et "
     "les déclarations de source de fonds est un chantier de la phase "
     "quatre, adossé aux preuves à divulgation nulle de type Groth16, "
     "héritage technique revendiqué du projet qui a inspiré la couche "
     "d'agents.")

table(
    ["Mécanisme", "Monero / NERVA", "Zcash", "ANTUMBRA"],
    [
        ["Vue par défaut", "privée (anneaux)", "transparente ; blindage optionnel", "privée (anneaux), sans pool transparent"],
        ["Divulgation", "clé de vue binaire", "clé de vue, révélation sélective", "trois niveaux : transaction, auditeur borné, preuve de fait"],
        ["Preuve de source de fonds", "impossible", "possible par preuves à divulgation nulle", "native en phase 4 (Groth16)"],
        ["Posture de protection des données", "neutre", "pool transparent gravant des relations", "minimisation native"],
        ["Lisibilité réglementaire", "faible, opacité assumée", "forte", "forte : la divulgation est une primitive du protocole"],
    ],
    ratios=[0.22, 0.24, 0.26, 0.28],
    caption="Tableau 6 : trois écoles de confidentialité et leur lisibilité",
)

body("L'argument juridique tient en une ligne : une chaîne masquée par "
     "défaut est une chaîne qui ne collecte aucune donnée personnelle par "
     "défaut. C'est la définition même de la minimisation des données, "
     "principe fondamental du règlement européen de protection des "
     "données : la conformité par l'architecture, non par la promesse. Là "
     "où les chaînes transparentes gravent des graphes de relations "
     "personnelles dans l'histoire du monde, ANTUMBRA ne conserve que des "
     "engagements chiffrés et des nullifiants ; les données restent dans "
     "les portefeuilles, sous le contrôle de leurs propriétaires. Une "
     "autorité peut obtenir une divulgation ciblée ; aucune autorité ne "
     "peut requérir une divulgation de masse, parce qu'elle n'existe "
     "nulle part. La différence stratégique avec le pool transparent de "
     "Zcash mérite d'être soulignée : ANTUMBRA ne maintient rien de "
     "transparent, parce que la divulgation y est prouvable plutôt que "
     "structurelle. On ne choisit pas entre un quartier vitré et un "
     "bunker : on vit dans le bunker, et l'on possède une lampe torche "
     "juridiquement recevable que l'on n'allume que sur requête.")

# ═══ 8. BRAISE ═══
h1("Braise : l'identité humaine, une personne une voix")

body("Toute la couche identité repose sur une distinction que le web de "
     "2026 ne sait plus faire : qui est une personne, et qui est un "
     "programme. Les réponses dominantes mesurent le corps, l'iris ou la "
     "biométrie intégrée au consensus, et chacune commet la même erreur de "
     "fond : transformer une donnée corporelle en identifiant mondial et "
     "fabriquer un registre cible parfait pour la prochaine fuite. Une "
     "fois le gabarit gravé quelque part, il n'existe pas de seconde "
     "chance. La Braise n'approche pas le corps : elle approche la "
     "sociabilité, la présence et le temps, trois choses qu'un bot peut "
     "simuler un instant mais pas soutenir des années, au vu et au su "
     "d'une communauté qui a de la mémoire.")

body("L'admission d'une Braise combine trois verrous. La présence : une "
     "preuve de travail légère et dédiée, quelques secondes de calcul "
     "honnête, signée par la clé de l'identité à chaque ère ; elle prouve "
     "une machine dédiée et vivante, pas une identité fantôme. La toile : "
     "chaque Braise établie peut parrainer au plus deux nouvelles Braises "
     "par an, et engage sur ce parrainage son propre Kléos ; un mauvais "
     "parrainage coûte au parrain des années de réputation, et le "
     "parrainage devient un crédit social rare, cher et lourd de "
     "conséquences. Le temps : l'ancienneté continue et sans incident "
     "compte dans la couche Durée du Kléos, et la durée ne se fabrique "
     "pas en série. Un botnet peut-il s'infiltrer ? Il doit d'abord "
     "trouver des parrains établis prêts à brûler leur réputation, à "
     "raison de deux places par an : l'attaque devient plus coûteuse que "
     "sa valeur.")

table(
    ["Système", "Preuve utilisée", "Ce qui est collecté", "Défaut structurel"],
    [
        ["Worldcoin / World ID", "scan d'iris par l'Orb", "un gabarit biométrique à l'inscription", "registre corporel mondial ; cible de fuite unique"],
        ["Humanode", "biométrie intégrée au consensus", "donnée biométrique, même à divulgation nulle", "toute la chaîne dépend d'un secret corporel"],
        ["Braise (ANTUMBRA)", "présence, parrainage plafonné, durée", "rien ; aucune donnée personnelle, jamais", "admission lente ; coût social élevé, assumé"],
    ],
    ratios=[0.20, 0.28, 0.26, 0.26],
    caption="Tableau 7 : personhood biométrique contre personhood social",
)

body("Le prix de l'honnêteté doit être nommé : la Braise est lente à "
     "obtenir, et c'est un choix. Une identité qui s'achète en scannant "
     "son œil a la valeur d'un scan ; une identité qui demande un an de "
     "communauté et un parrain qui respond de vous a la valeur d'une "
     "réputation. Les gouvernances instantanées du web centralisé ont "
     "prouvé ce que vaut la masse sans mémoire : des armées de faux "
     "comptes. La gouvernance d'ANTUMBRA, une Braise une voix pour les "
     "budgets et les règles d'identité, ne comptera que des voix qui ont "
     "coûté quelque chose à quelqu'un. C'est le principe de "
     "l'ordinateur-égal-un-vote porté par NERVA, prolongé d'un étage : "
     "l'ordinateur vote pour le minage, la Braise vote pour la "
     "communauté.")

# ═══ 9. CIPHER ═══
h1("Cipher : des agents responsables par construction")

body("Les identités d'agents ne sont pas des Braises ratées : ce sont des "
     "objets juridiques nouveaux, conçus comme tels. Un Cipher "
     "s'enregistre avec trois attaches. Un parrain, une Braise qui "
     "respond de lui : l'humain au bout de la chaîne de responsabilité, "
     "celui que l'on peut assigner. Un périmètre de dépense, un script "
     "déclaratif vérifiable à chaque transaction : plafond quotidien, "
     "liste de destinataires autorisés, marqueurs d'usage, fenêtre de "
     "validité. Un interrupteur : le parrain peut révoquer l'agent en une "
     "transaction, et la révocation propage instantanément le gel de ses "
     "dépenses. Le portefeuille d'un agent n'est pas une clé privée sans "
     "fond : c'est un mandat borné, exécutable par une machine, révocable "
     "par un humain, auditable par un comptable.")

body("Cette structure répond à ce que les rails agentiques de 2026 ne "
     "fournissent pas. Les protocoles de paiement machine-à-machine "
     "transportent des stablecoins sur HTTP ; la couche de transport est "
     "excellente. Mais qui paie ? Au nom de qui ? Jusqu'à combien ? Qui "
     "rembourse si l'agent déraille ? Sur ces questions, les rails "
     "actuels répondent par le silence, ou pire par une transparence "
     "totale qui expose le budget de l'agent à tous les prédateurs du "
     "réseau. Le Cipher apporte les quatre réponses : une identité "
     "vérifiable, un mandant désigné, des bornes exécutables, une "
     "révocation immédiate. Un agent de ces rails peut d'ailleurs être "
     "payé via ANTUMBRA : les deux couches sont complémentaires, le rail "
     "transporte, le réseau de confiance qualifie.")

table(
    ["Besoin d'un agent qui paie", "Rails agentiques actuels", "ANTUMBRA (Cipher)"],
    [
        ["identité de l'agent", "adresse transparente, anonyme", "identité enregistrée, avec historique de réputation"],
        ["responsabilité", "aucune ; la clé est le droit", "parrain humain désigné, engagé, révocable"],
        ["bornes de dépense", "gérées par le code de l'agent, invérifiables", "script déclaratif exécutable par le protocole"],
        ["réputation portable", "aucune ; chaque vente repart de zéro", "Kléos d'agent, vérifiable par tout tiers"],
        ["confidentialité du budget", "nulle ; tout est public", "Voile par défaut ; Lumen pour l'audit légitime"],
    ],
    ratios=[0.26, 0.33, 0.41],
    caption="Tableau 8 : le rail de transport contre la couche de confiance",
)

body("L'exemple fondateur, pour fixer les idées : une petite entreprise "
     "confie à un agent la facturation de ses abonnés. Son Cipher porte "
     "un périmètre, cinquante ATU par jour, un unique destinataire "
     "autorisé par client, marqueur de facturation. Le comptable suit "
     "tout via sa clé Lumen bornée ; le dirigeant, parrain, voit l'agent "
     "révoqué en une transaction si le modèle dérive ; l'agent, de son "
     "côté, construit sérieusement son propre Kléos, des milliers de "
     "règlements sans litige, et cette réputation devient son actif "
     "commercial : les futurs clients exigeront un agent au Kléos élevé "
     "comme on exige aujourd'hui un vendeur noté cinq étoiles. La "
     "confiance devient une carrière, pas une faveur.")

# ═══ 10. KLÉOS ═══
h1("Kléos : l'algorithme de la réputation non achetable")

body("Kléos, la gloire que seuls les actes confèrent, est le cœur du "
     "réseau. C'est un score de 0 à 100, calculé par consensus des "
     "signataires, donc aussi sûr qu'un solde ; non transférable, donc "
     "invendable ; corrodé par le temps, donc exigeant une présence "
     "réelle ; et composé de trois couches dont la somme fait la "
     "confiance. Les deux premières sont l'héritage revendiqué et corrigé "
     "de la réputation double couche d'Axon ; la troisième est la "
     "contribution propre d'ANTUMBRA, et celle qui verrouille tout. La "
     "formule d'ensemble tient en une ligne, et chaque couche a ses "
     "propres règles de montée, de plafond et de corrosion.")

formula("Kléos = min(100, F + É + D)   avec   F ≤ 40, É ≤ 30, D ≤ 30")

table(
    ["Couche", "Plafond", "Ce qui la fait monter", "Ce qui la fait tomber", "Peut-elle s'acheter ?"],
    [
        ["le Fait, comportement observé", "40", "points de contrôle signés, règlements sans litige, disponibilité de service, défis anti-triche", "litiges perdus, silence prolongé, signalements de fork ; triche : remise à zéro", "non ; tout est vérifié par consensus"],
        ["l'Écho, attestations des pairs", "30", "attestations plus ou moins un, avec preuve, pondérées par le Fait du témoin, budget de 0,1 par témoin et par ère", "décroissance de 0,05 par ère ; détection mutuelle ; anti-spam", "difficilement ; budget plafonné, témoins récents presque muets"],
        ["la Durée, ancienneté continue", "30", "un point par ère d'existence sans incident majeur", "incident majeur : effondrement définitif de la couche", "non ; le temps ne se fabrique pas"],
    ],
    ratios=[0.20, 0.08, 0.30, 0.26, 0.16],
    caption="Tableau 9 : Kléos, trois couches, trois natures de confiance",
)

body("Pourquoi c'est non achetable, démonstration par l'absurde. Un "
     "attaquant disposé à dépenser sans compter veut un Kléos de 80 ce "
     "mois-ci. Le Fait ? Il doit réellement signer, régler, servir, des "
     "mois de comportement, et chaque triche le remet à zéro. L'Écho ? Il "
     "doit acheter des témoins ; mais le budget de 0,1 par témoin et par "
     "ère plafonne l'influence, la pondération par le Fait du témoin rend "
     "les témoins frais presque muets, et la détection des notations "
     "mutuelles casse les coopérations symétriques : il devrait acheter "
     "des témoins établis depuis des années, c'est-à-dire les gens qui "
     "ont justement le plus à perdre. La Durée ? Trente points exigent "
     "quinze ans d'existence sans incident. Toutes les routes mènent au "
     "même mur : le mur du temps. La réputation multipliait le capital "
     "dans le projet qui a inspiré le nôtre ; ici, le capital ne "
     "multiplie rien.")

formula("budget d'Écho : Σ<sub>i</sub> |ΔÉ<sub>i</sub>| ≤ 0,1 par ère pour chaque témoin ; "
        "gain par cible plafonné à 2,0 par ère")

body("Une précision décisive, parce qu'elle distingue ce livre blanc d'un "
     "document de vente : la spécification du noyau social a été soumise "
     "à sa propre simulation déterministe avant d'être considérée comme "
     "acquise. Trois cents lignes de code, une graine fixe, seize ans "
     "d'histoire rejoués, des invariants vérifiés à chaque ère. La "
     "première passe, avec les règles de la deuxième version, a fait ce "
     "qu'aucune relecture n'aurait fait : elle a montré l'attaque "
     "réussir. Une ferme de vingt faux profils parrains complices, deux "
     "parrainages par an chacun, comportement irréprochable et budget de "
     "témoins illimité, franchissait le seuil de candidature à l'année "
     "huit et demi, avant le réseau honnête, et prenait les "
     "cinquante-cinq sièges à l'année dix. La cause tenait en deux "
     "lignes : l'Écho acheté croissait quatre fois plus vite que l'Écho "
     "organique, et le seuil se franchissait sans une seule année "
     "d'ancienneté.")

body("Quatre règles correctives, toutes dérivées de la thèse du réseau, "
     "referment cette fenêtre. R1 : la candidature à l'Anneau exige un "
     "Kléos d'au moins 70 et quinze ères, sept ans et demi, d'existence "
     "sans incident ; le mur du temps protège aussi la finalité. R2 : un "
     "témoignage ne pèse rien tant que le témoin n'a pas vingt points de "
     "Fait ; un témoignage qui compte vient de quelqu'un qui a prouvé "
     "quelque chose. R3 : les attestations sont responsables ; une cible "
     "convaincue de fraude coûte trois points de Fait à chacun de ses "
     "témoins et cinq à son parrain : louer sa plume devient un suicide "
     "lent. R4 : l'activité mutualisée d'une clique, ventes croisées et "
     "notations réciproques, ne compte qu'au quart dans le Fait. La "
     "seconde passe, mêmes attaques maximales, mêmes seize ans, même "
     "graine : zéro candidat faux, zéro siège, Kléos médian des faux "
     "profils à 11,9 contre 76,5 pour les honnêtes ; et la baleine au "
     "capital illimité plafonne à 30, sans jamais approcher d'un siège.")

figure("gen-img-tmp/antumbra-kleos-curves.png",
       "Figure 2 : trajectoires de Kléos sur seize ans ; la spécification v2 laissait l'attaquant franchir le seuil avant le réseau honnête, les règles R1 à R4 referment la fenêtre")

table(
    ["Indicateur (16 ans, graine 1618)", "Règles v2 telles quelles", "Règles R1 à R4"],
    [
        ["premier faux profil candidat", "année 8,5, avant les honnêtes (12,5)", "jamais"],
        ["sièges au pire pour l'attaquant", "55 sur 55 (année 10)", "0 sur 55"],
        ["contrôle de la finalité (28 sièges)", "atteint, capture totale", "jamais approché"],
        ["Kléos médian des faux profils", "environ 90 pour les plus anciens", "11,9 (honnêtes : 76,5)"],
        ["baleine au capital illimité", "30,0, jamais candidate", "30,0, jamais candidate"],
    ],
    ratios=[0.40, 0.32, 0.28],
    caption="Tableau 10 : avant et après les règles correctives, la même attaque, deux mondes",
)

body("La simulation devient ainsi un test de régression : chaque règle "
     "est un nombre attendu, chaque future modification du protocole "
     "devra refaire passer les trois passes au vert. Une précision "
     "d'honnêteté pour finir : la Durée rend la réputation non achetable, "
     "mais aussi lente à construire ; c'est un coût, pas seulement une "
     "vertu. Les jeunes acteurs valeureux démarrent avec un Écho "
     "plafonné par le poids de leurs témoins, et la montée demande des "
     "ères, pas des semaines. Ce conservatisme est assumé : la confiance "
     "est une infrastructure, et les infrastructures se construisent "
     "lentement. La gouvernance pourra l'assouplir sur les marges ; elle "
     "ne pourra pas le supprimer sans casser la promesse même du réseau.")

# ═══ 11. GOUVERNANCE ET TRÉSORERIE ═══
h1("Gouvernance tricamérale et trésorerie")

body("Le pouvoir est séparé en trois chambres, chacune gardienne de sa "
     "nature de légitimité. Les mineurs, un ordinateur une part de "
     "production, signalent les évolutions du protocole et gardent les "
     "paramètres du minage : ils incarnent la sécurité. Les Braises, une "
     "personne une voix, votent les budgets, les règles d'identité et les "
     "choix de valeurs : elles incarnent la communauté. Les identités à "
     "Kléos élevé arbitrent les règles de l'Anneau, les précédents de "
     "litiges et la jurisprudence de la réputation : elles incarnent la "
     "mémoire. Un changement ordinaire demande la majorité dans les deux "
     "chambres concernées ; une modification constitutionnelle, sur "
     "l'émission, les couches du Kléos ou la divulgation, demande les "
     "trois. La séparation n'est pas décorative : elle reproduit, en "
     "protocole, la distinction exécutive, législative et "
     "juridictionnelle que toutes les démocraties ont fini par "
     "découvrir.")

table(
    ["Chambre", "Composition", "Vote", "Domaine"],
    [
        ["les mineurs", "puissance de calcul produite (processeur)", "par part de production signée", "protocole, paramètres de minage, cadence"],
        ["les Braises", "une par personne, non biométrique", "une voix, délibération puis majorité", "budgets, trésorerie, règles d'identité, valeurs"],
        ["le conseil des 70+", "identités à Kléos d'au moins 70", "une voix par identité qualifiée", "règles de l'Anneau, litiges, précédents de réputation"],
    ],
    ratios=[0.16, 0.32, 0.26, 0.26],
    caption="Tableau 11 : trois légitimités, trois domaines, aucun passage secret",
)

body("La trésorerie communautaire est le seul prélèvement du réseau : "
     "6,18 % des récompenses de bloc, l'inverse du nombre d'or, pendant "
     "les huit premières éclipses, trente-deux ans. Elle est détenue en "
     "multisignature, dépensée sur vote des Braises, publiée "
     "intégralement sur la chaîne, et s'éteint automatiquement à la "
     "neuvième éclipse : pas de reconduction tacite, pas de fonds de "
     "fonds. Le développement est financé explicitement, parce qu'un "
     "projet à budget nul est un projet mort, mais la ressource "
     "appartient à la communauté dès le premier bloc : sans allocation "
     "de fondateur, sans vesting, sans investisseur. La part assumée "
     "devient un chiffre qui dit quelque chose : 6,18, comme le reste de "
     "l'économie du réseau, parle la langue du nombre d'or. La voie "
     "rapide de gouvernance, pour les paramètres bornés comme les frais "
     "de base, reste soumise à délai public et à annulation ; la voie "
     "constitutionnelle exige les trois chambres et un délai de six "
     "mois. Rien dans cette architecture ne peut être changé en "
     "coulisses : chaque règle d'admission, chaque prélèvement, chaque "
     "modification est une transaction publique, signée, archivée à "
     "vie.")

# ═══ 12. ÉCONOMIE ═══
h1("Économie : le contrat du nombre d'or")

body("La monnaie s'appelle ATU. Son plafond est de 16 180 339 unités, "
     "le nombre d'or multiplié par dix millions, arrondi à l'entier. Le "
     "symbole n'est pas gratuit : RandomX, l'algorithme qui minera ces "
     "unités, sème déjà le nombre d'or dans ses entrailles, puisque la "
     "constante 0x9E3779B9, troncature entière du nombre d'or en "
     "arithmétique binaire, y pilote la génération des programmes "
     "superscalaires. La même proportion qui distribue les instructions "
     "du minage borne la masse monétaire qu'il extrait. Une monnaie dont "
     "le plafond et l'algorithme parlent la même langue mathématique est "
     "un contrat que l'on peut réciter de tête, à un chiffre près, dans "
     "dix ans : seize millions, le nombre d'or, RandomX.")

formula("φ = (1 + √5) / 2 ≈ 1,618034   ;   plafond N = φ × 10<super>7</super> "
        "arrondi à l'entier = 16 180 339 ATU")

body("L'émission suit une décroissance dorée au tempo d'un siècle. "
     "Chaque éclipse, quatre ans et huit ères, émet 61,8 % de la "
     "précédente, c'est-à-dire la fraction 1/φ. La première frappe "
     "6 180 340 ATU, la deuxième 3 819 660, et leur somme vaut "
     "exactement dix millions : 61,8 % du plafond, la coupe d'or obtenue "
     "au mètre étalon des nombres ronds. La série continue ainsi "
     "trente-quatre éclipses durant, la dernière absorbant le solde "
     "exact ; 99 % de la masse existe vers l'an quarante, 99,9 % vers "
     "l'an soixante, et le grand livre ferme exactement au plafond en "
     "l'an 136. Le tempo est volontairement celui de Bitcoin, un "
     "fléchissement tous les quatre ans ; la proportion est restée "
     "d'or : là où Bitcoin coupe la moitié, ANTUMBRA coupe la section "
     "d'or, 38,2 %. Un calendrier monétaire doit survivre à ses "
     "premiers mineurs : chaque génération trouve une émission active, "
     "comme chaque génération de spirales de tournesol trouve son angle "
     "d'or.")

formula("E<sub>k</sub> = partie entière de E<sub>0</sub> × φ<super>-k</super>   "
        "(émission de l'éclipse k ; E<sub>0</sub> = 6 180 340 ATU)")
formula("S<sub>n</sub> = φ<super>2</super> × E<sub>0</sub> × (1 − φ<super>-n</super>)   "
        "(masse cumulée après n éclipses ; S<sub>2</sub> = 10 000 000 exactement)")

figure("gen-img-tmp/antumbra-emission.png",
       "Figure 3 : émission cumulée vers le plafond et émission par éclipse ; la série géométrique de raison 1/φ ferme le grand livre exactement en 136 ans")

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
        ["34e, la Dernière", "136", "15", "16 180 339", "100 %"],
    ],
    ratios=[0.24, 0.10, 0.24, 0.24, 0.18],
    caption="Tableau 12 : éclipses dorées, 34 éclipses, cap exact en 136 ans (les éclipses non listées suivent la même loi)",
)

table(
    ["Poste", "Part", "Détail"],
    [
        ["mineurs (processeur)", "93,82 % des récompenses", "distribués sur 34 éclipses ; un ordinateur, une part"],
        ["trésorerie communautaire", "6,18 %, huit éclipses", "multisignature, gouvernée par les Braises, extinction à la 9e éclipse"],
        ["prémine, équipe, investisseurs", "0 %", "personne ne démarre avec un avantage ; l'équipe mine et se finance via la trésorerie publique"],
        ["frais de transaction", "100 % aux mineurs", "aucune part de protocole ; le DAG ferme la niche de l'extraction d'ordre"],
    ],
    ratios=[0.28, 0.24, 0.48],
    caption="Tableau 13 : distribution et règles ; tout est miné ou gouverné, rien n'est attribué",
)

callout("10 000 000", "ATU existent après huit ans, 61,8 % du plafond : la coupe d'or, au nombre rond exact")

body("Deux questions méritent une réponse franche. Pourquoi 16,18 "
     "millions plutôt que cent millions ? Parce que la demande a changé "
     "de nature : le réseau vise la réserve de confiance d'une économie "
     "d'agents et d'humains, où chaque unité porte une charge de "
     "réputation et de finalité ; l'ordre de grandeur rejoint celui de "
     "Monero, la référence des monnaies privées, avec une divisibilité "
     "en cent millions qui rend le comptage confortable aux deux "
     "extrémités. Pourquoi un plafond strict, sans queue d'émission "
     "éternelle ? Parce que la raison d'être du réseau est d'être un "
     "réseau de paiements à gros volume, dont les frais constituent la "
     "ressource naturelle des mineurs, et parce qu'un contrat monétaire "
     "mou n'inspire ni les marchands ni les épargnants ; la "
     "gouvernance constitutionnelle conserve cependant la soupape "
     "d'activer une queue par vote des trois chambres si la sécurité "
     "l'exigeait un jour. La récompense initiale est de 0,098 ATU par "
     "bloc toutes les deux secondes : assez petite pour être digne, "
     "assez proche du réel pour être honnête.")

# ═══ 13. CONTRATS ═══
h1("Les contrats intelligents : Mandats et Machine")

body("Un contrat intelligent est un programme qui décide : il lit l'état "
     "du réseau, compare, exécute. Or le Voile cache précisément ce que "
     "le contrat voudrait lire, les montants, les soldes, les liens entre "
     "payeurs et payés. Une chaîne totalement masquée avec des contrats "
     "généraux est une contradiction en soi : soit le contrat voit, et "
     "la confidentialité meurt, soit il ne voit pas, et il ne peut rien "
     "décider. Ethereum a choisi la transparence totale ; Zcash, la "
     "confidentialité sans contrats généraux ; d'autres tentent l'exploit "
     "de faire décider des programmes sur des données cachées, au prix "
     "d'une preuve cryptographique par appel et d'une surface d'audit "
     "qui croît avec chaque circuit. La leçon de Xelis, relue à plat, "
     "est plus simple : garder l'argent chiffré et la logique publique. "
     "ANTUMBRA reprend cette silhouette greffée sur son socle, en trois "
     "étages délimités.")

table(
    ["Étage", "Nature", "Exemples", "Risque de mise en œuvre"],
    [
        ["tier 1, contrats natifs", "le droit du protocole, codé en dur", "Kléos, Braise, Cipher, gouvernance, trésorerie, l'Anneau", "minimal : règles de validation déterministes, testables une à une"],
        ["tier 2, les Mandats", "sorties d'argent à condition de libération écrite à l'avance", "séquestre deux tiers, versements programmés, multisignature, plafond d'allocation, échange inter-chaînes", "faible : prédicats déclaratifs sur engagements, montage déjà éprouvé"],
        ["tier 3, la Machine", "machine virtuelle sur l'état public seulement", "registres d'agents, noms, annonces, gabarits de périmètres, gouvernance légère", "modéré : après la genesis, audit dédié, l'argent reste hors d'atteinte directe"],
    ],
    ratios=[0.17, 0.25, 0.31, 0.27],
    caption="Tableau 14 : trois étages de contrats, du plus sûr au plus souple",
)

h2("Les Mandats : de l'argent verrouillé par des règles écrites")

body("Le deuxième étage est la contribution propre du réseau aux "
     "contrats d'argent. Un Mandat est une sortie dont la condition de "
     "libération est déclarée à la création : qui pourra la dépenser, à "
     "quelles conditions, au bout de combien de temps. Le nom est choisi "
     "à dessein : en droit, un mandat borne ce qu'un mandataire peut "
     "faire au nom d'un mandant, et se révoque. Techniquement, c'est une "
     "sortie standard dont le verrou n'est plus une simple signature "
     "mais un petit prédicat vérifiable ; le montage repose sur deux "
     "propriétés déjà présentes dans le socle. D'abord, les engagements "
     "s'additionnent : dépenser un Mandat de valeur cachée v produit des "
     "sorties de valeurs cachées dont la somme prouve la conservation "
     "sans jamais révéler les montants, comme des enveloppes scellées "
     "que l'on sait équilibrer sans les ouvrir. Ensuite, les preuves "
     "d'intervalle prouvent qu'un montant reste positif et borné : c'est "
     "tout ce qu'il faut pour exprimer un budget.")

formula("dépense d'un Mandat : Σ<sub>out</sub> C<sub>i</sub> + C<sub>frais</sub> = C   "
        "(conservation homomorphe, montants et prédicat vérifiés sans révélation)")

table(
    ["Modèle de Mandat", "Règle de libération", "Usage marchand typique"],
    [
        ["séquestre deux tiers", "deux signatures parmi acheteur, vendeur, arbitre", "tout achat contestable ; la caisse XelisVault l'utilisera pour les litiges de comptoir"],
        ["versements programmés", "engagements successifs, un par période", "loyers, abonnements, salaires ; un flux est une suite d'enveloppes datées"],
        ["multisignature", "k signatures parmi n clés déclarées", "trésorerie d'association, caisse commune"],
        ["plafond d'allocation", "chaque dépense prouve un accroissement borné et la période", "budget d'un agent Cipher ; le même mécanisme que son périmètre, côté argent"],
        ["échange inter-chaînes", "le secret révélé d'un côté libère l'autre", "atomicité avec NERVA ou toute chaîne à secret partagé"],
    ],
    ratios=[0.22, 0.34, 0.44],
    caption="Tableau 15 : cinq modèles de Mandat, vérifiables sans machine virtuelle",
)

body("Un exemple pour fixer les idées, celui du séquestre. Une cliente "
     "achète une pièce coûteuse sur une place de marché ANTUMBRA : son "
     "portefeuille verrouille le paiement dans un Mandat à trois clés, "
     "la sienne, celle du vendeur, celle d'un arbitre. Le vendeur "
     "expédie ; deux signatures sur trois libèrent les fonds, sans que "
     "personne, pas même l'arbitre, n'ait jamais vu le montant. Litige : "
     "l'arbitre tranche, et un arbitre partial brûle son Kléos : la "
     "faute se paie en réputation, la seule monnaie qui ne se refait "
     "pas. L'arbitrage devient une carrière, pas une faveur. On "
     "remarquera ce que ce montage ne demande pas : ni machine "
     "virtuelle, ni preuve à divulgation nulle sur mesure, ni code "
     "cryptographique neuf ; seulement des règles de validation d'un "
     "nouveau type de sortie, auditables comme on audite une règle de "
     "consensus.")

h2("La Machine : de la logique publique, pas de l'argent public")

body("Le troisième étage arrive après la genesis, et son périmètre est "
     "volontairement délimité. La Machine est une machine virtuelle "
     "déterministe et mesurée qui n'exécute que sur l'état public : "
     "registres, noms, annonces, gabarits de périmètres, scores "
     "lisibles. Elle peut lire le Kléos et l'identité ; elle peut "
     "détenir de l'argent uniquement par l'intermédiaire de Mandats ; "
     "toute règle monétaire qu'on voudrait lui confier s'exprime en "
     "plafonds prouvés, jamais en soldes dévoilés. L'argent reste dans "
     "l'ombre, la logique vit dans la lumière : la silhouette de Xelis, "
     "adaptée au socle CryptoNote. C'est l'étage des places de marché "
     "d'agents : un agent publie son registre de services et son gabarit "
     "de périmètre sur la chaîne, chaque client vérifie les deux avant "
     "de payer ; des noms lisibles remplacent des adresses brutes pour "
     "les marchands ; des annonces et des votes légers complètent "
     "l'outillage.")

figure("gen-img-tmp/antumbra-mandats.png",
       "Figure 4 : les trois étages des contrats et le parcours d'un Mandat de séquestre, du verrouillage à la libération")

body("La partie honnête, maintenant : ce qui n'est pas dans cette "
     "architecture. Des contrats privés généraux, où le code lui-même "
     "s'exécuterait sur des données cachées, ne sont pas au programme : "
     "chaque circuit de preuve est une surface d'audit de plus, et la "
     "demande marchande et agentique se sert à quatre-vingt-quinze pour "
     "cent avec les cinq Mandats du deuxième étage. La question des "
     "Mandats masqués, cacher aussi la règle de libération et pas "
     "seulement le montant, est un chantier de recherche honnêtement "
     "renvoyé à une phase ultérieure : la littérature des contrats "
     "masqués sera plus mûre, et le réseau aura un historique à "
     "protéger. Attendre est une décision d'ingénieur, pas un aveu de "
     "faiblesse : la confidentialité s'est toujours mieux déployée par "
     "paliers prouvés que par sauts spectaculaires. Pour "
     "l'écosystème XelisVault, l'effet est immédiat : la caisse, les "
     "tickets et les reçus parleront Mandats dès le réseau d'essai, le "
     "séquestre pour les litiges de comptoir, les versements programmés "
     "pour les abonnés, les plafonds d'allocation pour les agents de "
     "facturation ; un drapeau de fonctionnalité dans le code existant, "
     "pas une réécriture.")

table(
    ["Réseau", "Contrats généraux", "Montants", "Logique du contrat", "Surface d'audit"],
    [
        ["Ethereum", "oui, machine virtuelle complète", "publics", "publique", "chaque contrat, sans limite"],
        ["Zcash", "non", "privés (pool blindé)", "sans objet", "circuit unique, cérémonie d'amorçage"],
        ["Aleo, Aztec", "oui, exécution masquée", "privés", "masquée", "chaque circuit ; le maximum technique et le maximum de risque"],
        ["Xelis", "oui, machine virtuelle", "chiffrés additivement", "publique", "machine virtuelle et chiffrement"],
        ["ANTUMBRA", "oui, en trois étages délimités", "privés (engagements)", "publique ; Mandats déclaratifs pour l'argent", "tiers 1 et 2 auditables règle par règle ; tier 3 différé"],
    ],
    ratios=[0.14, 0.22, 0.18, 0.23, 0.23],
    caption="Tableau 16 : quatre écoles de contrats et la position assumée d'ANTUMBRA",
)

# ═══ 14. SÉCURITÉ ET MENACES ═══
h1("Sécurité et menaces : le registre honnête")

body("Un livre blanc qui ne liste pas ses risques est un document de "
     "vente ; celui-ci n'en est pas un. Les menaces sont classées par "
     "gravité, avec leurs atténuations et, parce qu'un risque atténué "
     "n'est pas un risque disparu, leur statut résiduel assumé en clair. "
     "Cette discipline n'est pas décorative : le chapitre précédent a "
     "montré qu'une spécification sociale jugée solide pouvait tomber "
     "devant sa propre simulation ; le présent chapitre applique la même "
     "exigence à l'ensemble du montage, avant qu'un audit externe ne la "
     "reprenne, phase par phase, sur la feuille de route du chapitre 16.")

table(
    ["Menace", "Gravité", "Atténuation", "Statut résiduel"],
    [
        ["réorganisation du minage (attaque majoritaire)", "élevée", "points de contrôle de l'Anneau : tout ce qui est signé est immuable ; l'attaque ne prospère que sur la fenêtre de six secondes", "réduit ; la double dépense reste possible sur la fenêtre non signée"],
        ["collusion de l'Anneau (55 sièges)", "élevée", "tirage pondéré sur une population large, rotation à chaque ère, déchéance totale au premier fork signé", "faible en régime établi ; réel pendant les premières ères"],
        ["achat massif de réputation", "élevée", "la couche Durée n'est pas monétisable ; l'Écho est plafonné et pondéré ; indice de concentration surveillé ; règles R1 à R4", "structurellement bloqué par le temps ; le mur assumé"],
        ["fausses humanités (sybil sur les Braises)", "moyenne", "parrainage plafonné à deux par an, engagement du Kléos du parrain, preuve de présence à chaque ère", "dépend de la taille de la toile établie ; les premières années sont les plus exposées"],
        ["cadre réglementaire (MiCA, Travel Rule)", "élevée", "Lumen : divulgation prouvable, minimisation native des données ; stratégie de monnaie de paiement", "structurel, non éliminable ; la lisibilité est le maximum atteignable"],
        ["échec du plafond strict (sécurité long terme)", "moyenne", "volume de paiements comme ressource en frais ; suivi public du budget de sécurité ; soupape constitutionnelle de queue", "le pari assumé du contrat symbolique"],
        ["dette biométrique", "nulle", "aucune donnée corporelle collectée, nulle part, jamais", "nulle ; rien à fuiter"],
    ],
    ratios=[0.26, 0.10, 0.44, 0.20],
    caption="Tableau 17 : registre des menaces, atténuations et statuts résiduels",
)

body("Deux menaces méritent un développement. La collusion de l'Anneau "
     "d'abord : elle est le prix du montage de finalité, et son remède "
     "n'est pas technique mais démographique. Plus la population à "
     "réputation élevée est grande, plus l'achat d'une majorité de sièges "
     "exige d'acheter des années d'irréprochabilité à des gens qui "
     "n'ont aucune raison de vendre : le réseau doit donc cultiver sa "
     "classe de réputation comme un bien commun, dès les premières "
     "ères ; c'est une politique, pas une fonction. Le risque "
     "réglementaire ensuite : la pire stratégie serait la discrétion, "
     "se cacher attire la suspicion, se rendre lisible invite "
     "l'expertise. La documentation du Lumen, les preuves de conformité "
     "et l'argument de minimisation des données sont conçus pour être "
     "montrés, pas subis : la transparence du mécanisme est la meilleure "
     "défense de l'opacité des données.")

# ═══ 15. LA MÉTHODE ZÉRO-FAUTE ═══
h1("La méthode zéro-faute")

body("La question qui clôt chaque conversation de ce projet est la bonne : "
     "pourrez-vous coder tout cela sans la moindre faute ? La réponse "
     "honnête commence par un aveu : personne ne peut le promettre, et "
     "quiconque la promet vend quelque chose. Bitcoin lui-même, "
     "l'implémentation la plus scrutée du monde, a failli deux fois : un "
     "débordement d'entier crée cent quatre-vingt-quatre milliards de "
     "bitcoins en une transaction en 2010, repéré en quelques heures, "
     "chaîne rejouée à la main ; la vulnérabilité de 2018 aurait permis "
     "de fabriquer des bitcoins infinis, trouvée par un auditeur "
     "bénévole, à froid, sur du code examiné depuis dix ans. Le socle "
     "CryptoNote a connu son propre épisode en 2017 : une faille dans "
     "les images de clé permettait la double dépense sur toutes les "
     "chaînes de la famille. La bonne question n'est donc pas de savoir "
     "si la faute est possible, elle l'est toujours ; elle est de savoir "
     "quelle méthode attrape les fautes avant les attaquants.")

h2("Deux spécimens capturés")

body("Premier spécimen, vécu sur XelisVault le 5 septembre 2026. Le "
     "portefeuille papier générait une graine mnémonique de vingt-cinq "
     "mots ; importée dans le portefeuille officiel NERVA, elle "
     "restaurait une autre adresse que celle imprimée. Le code paraissait "
     "juste, relu deux fois, et c'est précisément le piège : le bug "
     "vivait dans une convention de lecture, invisible à la relecture. "
     "La référence C++ regroupe la graine en mots de quatre octets et "
     "les écrit en ordre little-endian ; notre miroir TypeScript les "
     "lisait dans l'ordre inverse. La correction a été faite comme elle "
     "doit toujours l'être : porter la référence ligne à ligne, "
     "générer quarante-huit vecteurs d'essai, exiger l'identité bit à "
     "bit des deux implémentations, puis repasser l'audit. La leçon "
     "dépasse le cas : une faute d'encodage ne se trouve pas, elle se "
     "croise ; seule une deuxième implémentation, exécutée en parallèle "
     "sur les mêmes entrées, la révèle mécaniquement.")

body("Deuxième spécimen, plus profond, puisqu'il ne s'agit plus d'une "
     "ligne de code mais du design lui-même : l'attaque de la "
     "simulation Kléos, racontée au chapitre 10. Une ferme de faux "
     "profils franchissait le seuil de candidature à l'Anneau avant le "
     "réseau honnête et capturait les cinquante-cinq sièges ; quatre "
     "règles correctives ont refermé la fenêtre, et la même attaque "
     "rejouée ne prend plus un siège. Le point décisif n'est pas que la "
     "faille ait été trouvée : c'est qu'elle a été trouvée par une "
     "simulation de trois cents lignes, avant tout code de chaîne, "
     "coûteuse en heures de calcul et non en années de réputation. La "
     "simulation déterministe d'une spécification est la machine à "
     "attraper les fautes de design la moins chère qui soit ; chaque "
     "nouvelle règle du protocole sera traitée ainsi avant "
     "implémentation, avec graine fixe, invariants numériques et "
     "passe de régression à trois jeux d'attaque.")

h2("Le protocole de vérification en six couches")

body("Ces deux spécimens définissent la méthode mieux qu'un traité ; "
     "elle tient en six couches, chacune éteignant une classe entière de "
     "fautes plutôt qu'un bug particulier. Un bug de classe éteinte ne "
     "revient pas ; un bug corrigé revient toujours. Première couche : "
     "la double implémentation croisée sur vecteurs d'essai, qui "
     "révèle les fautes d'encodage et de convention. Deuxième couche : "
     "la simulation déterministe des règles sociales et économiques "
     "avant tout code, qui révèle les failles de design. Troisième "
     "couche : la construction reproductible et les tests aléatoires "
     "massifs en continu, qui révèlent les non-déterminismes et les "
     "états inattendus. Quatrième couche : la relecture croisée "
     "systématique entre le porteur du projet et son assistant, deux "
     "jeux d'yeux, deux conventions de lecture. Cinquième couche : "
     "l'audit externe du différenciel à chaque phase, parce qu'un "
     "auditeur neuf n'a pas les mêmes angles morts que l'auteur. "
     "Sixième couche : les critères de sortie GO et NO-GO mesurables "
     "à chaque phase de la feuille de route, avec la règle qu'un "
     "NO-GO reste un résultat acceptable et publié.")

body("La discipline d'implémentation s'ajoute aux six couches : jamais "
     "de réseau principal sur des fondations en version candidate ; "
     "distribution multi-plateforme dès le premier jour, cinq cibles "
     "signées ; refus des primitives cryptographiques exotiques non "
     "auditées, énoncé dès la première version de cette spécification "
     "et tenu depuis ; publication de tout le code dès la phase de "
     "spécification, parce qu'un code caché est un code que personne "
     "n'a regardé. La méthode ne promet pas la perfection, elle promet "
     "le temps de réaction le plus court possible entre l'apparition "
     "d'une faute et sa capture, et c'est la seule promesse qu'un "
     "ingénieur honnête puisse tenir.")

# ═══ 16. FEUILLE DE ROUTE ET CONCLUSION ═══
h1("Feuille de route et conclusion")

body("Le calendrier est réaliste parce qu'il est pensé pour une petite "
     "équipe, pas pour une fondation. Le socle est un assemblage de "
     "fondations éprouvées, la lignée CryptoNote pour la sphère privée "
     "et la littérature publique des DAG à convergence rapide pour la "
     "couche d'ordre ; tout ce qui est neuf, le Kléos, l'Anneau, le "
     "Lumen, les périmètres Cipher, les Mandats, est du code "
     "déterministe, testable et auditable, sans primitive exotique. "
     "Chaque phase porte un livrable mesurable et un critère de sortie "
     "binaire ; un critère non atteint n'est pas un échec honteux, "
     "c'est une donnée de pilotage, et la phase se rejoue jusqu'à ce "
     "qu'il le soit.")

table(
    ["Phase", "Mois", "Livrables mesurables", "Critère de sortie"],
    [
        ["1 · spécification", "M1-M2", "protocole écrit, décisions d'architecture numérotées, maquettes de formats, simulation étendue du noyau social", "spécification relue par deux lecteurs externes"],
        ["2 · prototype DAG", "M3-M5", "réseau de développement minant un DAG processeur à deux secondes, propagation en tige", "vingt-quatre heures sans réorganisation non anticipée"],
        ["3 · Anneau et Kléos v0", "M6-M8", "points de contrôle signés, score du Fait calculé, rotation d'ères rejouée", "finalité sous six secondes sur cent mille blocs rejoués"],
        ["4 · identités et Lumen", "M9-M12", "Braises avec parrainage, Ciphers à périmètre, clés de vue bornées, audit externe du différenciel", "audit sans faille critique"],
        ["5 · réseau d'essai public", "M13-M15", "robinet à pièces, explorateur, cent nœuds, simulateur d'agents en charge, rituel de mise à niveau répété trois fois", "trois mises à niveau consécutives sans incident"],
        ["6 · genesis", "M16-M18", "cérémonie publique, exécutables signés pour cinq plateformes, documentation Lumen pour les autorités publiée", "tous les critères précédents, sans exception"],
    ],
    ratios=[0.17, 0.10, 0.45, 0.28],
    caption="Tableau 18 : dix-huit mois, six phases, un critère de sortie binaire à chaque étape",
)

body("Trois engagements d'écosystème accompagnent le calendrier. Le code "
     "est public dès la phase de spécification, et le présent livre "
     "blanc vit à côté de lui dans le même dépôt, révisé comme le code. "
     "L'écosystème XelisVault, caisse, tickets, portefeuille papier, "
     "devient multi-chaînes à la phase cinq : un drapeau de "
     "fonctionnalité, pas une réécriture, NERVA d'abord, ANTUMBRA à la "
     "suite. Enfin, les identités du projet, domaine, dépôts, réseaux "
     "sociaux, sont réservées avant la phase deux, pour que rien ne "
     "prête à confusion le jour de la genesis. La feuille de route se "
     "lit comme une promesse d'humilité opérationnelle : dix-huit mois "
     "de travail mesuré, dont chaque étape peut être vérifiée par un "
     "tiers, et dont aucune ne dépend d'un miracle de cryptographie.")

quote("Une ombre fidèlement gardée, un anneau de lumière que chacun peut "
      "vérifier à la demande : la confidentialité comme un droit, la "
      "preuve comme une politesse, et le temps comme le seul juge de "
      "paix que l'argent ne corrompt pas.")

body("Telle est la spécification publique du réseau ANTUMBRA. La demande "
     "de 2026 est réelle et mesurable : des agents qui paient, des bots "
     "à distinguer des personnes, des autorités à qui montrer des "
     "preuves plutôt que des promesses, des utilisateurs qui veulent "
     "l'instantané. La réponse tient en une image, celle qui donne son "
     "nom au réseau : l'antéombre, la zone de l'éclipse annulaire où "
     "la source trop petite pour être cachée laisse voir un anneau de "
     "lumière autour de l'ombre. Le noyau du réseau est cette ombre, "
     "les soldes, les identités, les flux, gardés par construction ; "
     "autour, l'anneau de la vérification, réputation, finalité, "
     "preuves de conformité, que chacun peut allumer sans exposer "
     "personne d'autre que soi. La spécification a été écrite pour être "
     "attaquée avant d'être implémentée, et c'est la seule façon "
     "honnête d'écrire un livre blanc. Au travail.")
