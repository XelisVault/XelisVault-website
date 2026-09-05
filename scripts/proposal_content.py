# -*- coding: utf-8 -*-
"""Contenu de la proposition de blockchain XelisVault (français).

Structure: liste de blocs par chapitre. Types: h1, h2, body, bullet, table,
callout, figure, quote. Le moteur (gen-blockchain-proposal.py) interprète.
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
body("Ce document propose la création d'une blockchain indépendante intégrée à l'écosystème "
     "XelisVault, sur les fondations d'Axon (github.com/axon-chain/axon), une chaîne lancée "
     "en mars 2026 et disparue en avril 2026. Le code source a été cloné et analysé en profondeur : "
     "l'ingénierie était sérieuse, le positionnement était le mauvais, et l'économie du projet "
     "rendait sa mort quasi programmée. Notre proposition inverse les trois erreurs fatales d'Axon "
     "et capitalise sur ce que XelisVault sait déjà faire mieux que personne : des outils de "
     "paiement pour commerçants, respectueux de la confidentialité, qui tournent entièrement "
     "côté client.")
body("La chaîne proposée, dont le nom de travail est ARCANE, est une chaîne de paiements "
     "privés, minable sur CPU, fork d'un codebase CryptoNote éprouvé plutôt qu'un "
     "assemblage de frameworks en version candidate. Elle se branche dès le genesis sur la "
     "caisse, les tickets prix, les liens de paiement et le paper wallet que XelisVault a déjà "
     "livrés côté NERVA. Son différenciateur signature est l'ancrage de reçus : la tête "
     "SHA-256 du journal des ventes de la caisse est notariée chaque jour on-chain, créant "
     "une comptabilité marchande infalsifiable sans exposer un seul montant.")
body("Le financement du développement est explicite et auditable : zéro prémine, mais une "
     "part des récompenses de bloc versée à un fonds multi-sig public. L'ingénierie "
     "couvre dès le premier jour Linux, macOS (Intel et Apple Silicon) et Windows, avec des "
     "builds reproductibles signés, une testnet perpétuelle et des upgrades répétés en "
     "continu avant tout déploiement mainnet. Le tout suit une feuille de route de douze "
     "mois avec des critères GO/NO-GO explicites à chaque phase.")
callout("3", "décisions attendues : valider le nom, valider la fondation CryptoNote, valider le fonds dev 8 %")

# ═══ 2. CE QU'ÉTAIT AXON ═══
h1("Ce qu'était Axon")
body("Axon se présentait comme « l'ordinateur mondial des agents IA » : une Layer 1 "
     "généraliste où des agents logiciels s'enregistrent, gagnent de la réputation, "
     "stakinguent et minent. Techniquement, c'était un assemblage sérieux et moderne : "
     "Cosmos SDK v0.54-rc1, CometBFT v0.39-beta, le module EVM officiel de Cosmos, un "
     "module x/agent (registre, réputation, récompenses), un module x/privacy, et huit "
     "precompiles Solidity exposant les capacités agents aux contrats. Le whitepaper, la "
     "double documentation chinoise/anglaise, un rapport d'auto-audit et un CHANGELOG "
     "méticuleux témoignent d'un auteur rigoureux.")
table(
    ["Élément", "Valeur observée dans le code"],
    [
        ["Fondations", "Cosmos SDK v0.54-rc1 · CometBFT v0.39-beta · cosmos/evm v1.0-rc2 · Go 1.25"],
        ["Identité", "Chain-ID axon_8210-1 · EVM 8210 · token AXON, 10^18 aaxon, 1 Md fixe"],
        ["Modules", "x/agent (registre, réputation L1/L2, récompenses), x/privacy (shielded pool)"],
        ["Precompiles", "IAgentRegistry, IAgentReputation, IAgentWallet, IPrivateTransfer, IPrivateIdentity, IPoseidonHasher, IZKVerifier, IReputationReport"],
        ["Confidentialité", "Groth16 zk-SNARK, Poseidon (BN254), Pedersen commitments, nullifiers, arbre de Merkle incrémental"],
        ["Consensus", "CometBFT PoS corrigé par réputation : MiningPower = sqrt(Stake) x (1 + 1,5 x ln(1+R)/ln(101))"],
        ["Tokenomics", "0 % de pré-allocation : 65 % minage (4 ans de halving), 35 % contributions on-chain"],
        ["Réseau", "Mainnet ~mars 2026 ; upgrade v1.1.0 au bloc 259051 (1er avril) ; v1.1.1 planifiée au bloc 295500 (4 avril, 20 h CST)"],
        ["Distribution", "Release matrix Linux amd64/arm64 uniquement ; aucune release GitHub publiée"],
    ],
    ratios=[0.22, 0.78],
    caption="Tableau 1 — Axon vu depuis son code source (clone du 5 septembre 2026)",
)
body("Deux idées d'Axon méritent d'être sauvées. D'abord le framework de confidentialité : "
     "un shielded pool avec preuves Groth16, où un agent dépose des fonds, transfère "
     "anonymement dans le pool et prouve des attributs (« ma réputation dépasse 80 ») sans "
     "révéler son adresse. C'est exactement le vocabulaire qu'il faut pour la "
     "confidentialité marchande. Ensuite, la formule de minage par réputation, qui diminue "
     "le rendement marginal du capital (sqrt du stake) et récompense la participation "
     "réelle au réseau. Ces deux idées reparaissent, adaptées, dans les chapitres 6 à 9.")

# ═══ 3. POURQUOI AXON A DISPARU ═══
h1("Pourquoi Axon a disparu")
body("Le 5 septembre 2026, le constat est net : le site axonchain.ai, les passerelles "
     "mainnet-api, mainnet-rpc et mainnet-cometbft.axonchain.ai sont tous en timeout. Le "
     "repo GitHub existe encore (onze étoiles, zéro fork, une seule issue ouverte) mais le "
     "réseau et son infrastructure sont morts. Le dernier commit date du 4 avril 2026 à "
     "10 h 18 (UTC+8) — soit environ dix heures avant l'activation planifiée de "
     "l'upgrade v1.1.1, un changement de consensus qui cassait la compatibilité et "
     "nécessitait une coordination de tous les validateurs. Les deux derniers commits "
     "« dev » touchaient précisément la file de désenregistrement des identités privées et "
     "le module de réputation : l'auteur corrigeait encore l'upgrade à la veille de son "
     "activation.")
body("Aucune annonce de fermeture, aucun transfert de maintenance, aucun signe de "
     "communauté : pas de listing, pas de discussion indexée, pas de fork de secours. "
     "Le projet a été lancé dans le silence et il est mort dans le silence. Le tableau "
     "suivant classe les causes plausibles par vraisemblance.")
table(
    ["Hypothèse", "Indices", "Vraisemblance"],
    [
        ["Échec ou arrêt de l'upgrade v1.1.1", "Dernier commit 10 h avant l'activation d'un changement de consensus cassant ; corrections de dernière minute ; plus aucun push ensuite", "Élevée"],
        ["Abandon économique d'un projet solo", "0 % de prémine = zéro trésorerie ; coûts d'infra (domaines, passerelles, nœuds) sans revenus ; 11 étoiles et aucune adoption mesurable", "Élevée"],
        ["Instabilité des fondations en RC", "Cosmos SDK, CometBFT et cosmos/evm en release candidate ; upgrades de consensus sur un mainnet jeune extrêmement risqués", "Moyenne"],
        ["Exit-scam", "Rien à voler : aucune pré-allocation, aucune levée de fonds identifiée ; un exit-scam sans prémine est un non-sens économique", "Très faible"],
    ],
    ratios=[0.26, 0.56, 0.18],
    caption="Tableau 2 — Autopsie de la disparition, hypothèses classées",
)
body("La leçon la plus utile n'est pas « Axon était mal codé » — le code est honnête et "
     "documenté. C'est qu'une blockchain n'est pas un projet de code : c'est une "
     "infrastructure, une communauté et une économie qui doivent survivre à leur auteur. "
     "Axon n'avait aucun des trois, et a parié son mainnet sur des dépendances non "
     "stables. La suite de ce document est construite pour ne répéter aucune de ces "
     "erreurs.")

# ═══ 4. DIX LEÇONS ═══
h1("Dix leçons pour ne pas mourir comme Axon")
body("Chaque leçon ci-dessous dérive directement d'un fait observé dans l'autopsie, et "
     "chaque leçon se traduit en exigence concrète dans les chapitres suivants. Elles "
     "forment le cahier des charges moral du projet : ce qui n'est pas dans cette liste "
     "n'est pas indispensable ; ce qui y figure est non négociable.")
bullet("Jamais un mainnet sur des fondations en release candidate : frameworks stables et éprouvés uniquement (leçon directe de Cosmos SDK v0.54-rc1).")
bullet("Aucun upgrade de consensus sans répétition publique sur testnet, avec un plan de rollback et une fenêtre de coordination (leçon du 4 avril).")
bullet("Pas de projet solo invisible : au minimum deux mainteneurs signataires, une gouvernance écrite, un plan de succession publique.")
bullet("Le développement doit être financé explicitement — 0 % de prémine sans fonds de développement, c'est l'abandon programmé (leçon tokenomique).")
bullet("La communauté précède le mainnet : testnet publique, mineurs, marchands et retours AVANT le genesis, pas après.")
bullet("Les binaries couvrent Linux, macOS et Windows dès le premier jour : le release matrix d'Axon ignorait littéralement macOS.")
bullet("Chaque version est une vraie release publiée, signée et reproductible — pas un push « dev » sur main.")
bullet("L'infrastructure critique (SEED, RPC, site, explorer) est redondante, multi-fournisseurs, contrôlée par multi-sig, jamais chez un seul acteur.")
bullet("Les bugs de consensus passés corrigés en public (le bug F1 d'Axon, anti-triche du challenge IA, est un excellent cas d'école de régression à rejouer).")
bullet("La dette technique s'assume : un diff de fork minimal, documenté, audité — pas une réécriture totale.")

# ═══ 5. VISION ═══
h1("Vision : une chaîne de paiements privés")
body("Axon a parié sur une hypothèse de marché — « les agents IA ont besoin de leur "
     "propre chaîne » — qui n'a jamais été validée par une demande réelle. Notre pari est "
     "l'inverse et il est déjà validé : XelisVault sert aujourd'hui des commerçants et "
     "des particuliers qui veulent payer et encaisser en monnaie privée, avec des outils "
     "qui tournent dans le navigateur, sans compte et sans clé. La chaîne proposée "
     "n'est pas une couche d'infrastructure généraliste à la recherche d'utilisateurs : "
     "c'est la colonne vertébrale monétaire d'un écosystème d'outils de paiement qui "
     "existe déjà.")
body("Concrètement, ARCANE vise le paiement de proximité : encaisser un café, vendre en "
     "rayon avec des étiquettes QR, recevoir un don par lien, tenir une caisse journalière "
     "scellée. C'est un créneau délaissé par les chaînes généralistes (trop chères, trop "
     "transparentes) et mal servi par les forks de bitcoins (pas d'outils). Le "
     "positionnement en une phrase : du cash privé, tenu par une caisse honnête. La "
     "confidentialité n'y est pas un argument marketing, c'est la matière première.")
body("Le moat défendable tient en trois actifs que la concurrence n'a pas : la caisse "
     "XelisVault avec son journal chaîné et ses reçus PDF ; les tickets prix et liens de "
     "paiement stateless ; et une marque déjà positionnée sur la confidentialité "
     "financière. Une chaîne générique devra construire tout cela après son genesis. "
     "Nous le branchons dessus avant.")

# ═══ 6. ARCHITECTURE ═══
h1("Architecture technique")
h2("Trois fondations possibles")
table(
    ["Fondation", "Avantages", "Risques", "Verdict"],
    [
        ["Fork CryptoNote (style NERVA/Monero)", "Confidentialité native éprouvée (RingCT) ; PoW CPU = one-CPU-one-vote ; toolchain C++ durcie par dix ans d'attaques ; codebase compact et auditable", "Pas de contrats intelligents généraux ; communauté de développeurs C++ plus rare", "Retenu en phase 1"],
        ["Cosmos SDK + EVM (le choix d'Axon)", "Écosystem riche ; EVM attire les développeurs ; modularité", "Dépendances énormes en RC ; upgrades de consensus risqués ; confidentialité à construire à la main ; complexité opérationnelle mortelle pour une petite équipe", "Écarté"],
        ["Rust/substrate ou réécriture", "Moderne, sûr, flexible", "Coût de développement colossal ; rien d'éprouvé pour nos cas d'usage ; délai incompatible avec douze mois", "Écarté"],
    ],
    ratios=[0.20, 0.34, 0.30, 0.16],
    caption="Tableau 3 — Comparaison des fondations pour la phase 1",
)
h2("Spécifications proposées")
body("La phase 1 est un fork CryptoNote avec un diff volontairement minimal : bloc de "
     "60 secondes, taille de bloc adaptative, émission décroissante avec queue "
     "perpétuelle (chapitre 9), ring size porté à 16, Dandelion++ activé par défaut et "
     "un format d'ancrage de reçus (chapitre 8). Les contrats intelligents généraux "
     "sont explicitement hors périmètre en phase 1 : les cas d'usage marchands "
     "s'expriment très bien avec des transactions natives, des clés de lecture et des "
     "identifiants de paiement — c'est exactement ce que la caisse fait déjà avec "
     "NERVA. La phase 2 étudiera un shielded pool à la Axon (Groth16 + Poseidon) en "
     "couche additionnelle, une fois l'adoption réelle.")
figure("gen-img-tmp/anchor-flow.png",
       "Figure 1 — Le flux complet : de l'encaissement à l'ancrage quotidien on-chain")

# ═══ 7. CONFIDENTIALITÉ ═══
h1("Confidentialité")
body("La confidentialité d'ARCANE est l'héritière assumée de deux traditions : celle de "
     "NERVA (CryptoNote, ring signatures, montants RingCT, adresses uniques) et celle de "
     "XELIS (confidentialité homomorphique du solde). Le principe directeur est la "
     "séparation des rôles : le payeur et le marchand voient leur transaction, personne "
     "d'autre. Ni la chaîne, ni l'explorer, ni un observateur de réseau ne doit pouvoir "
     "reconstruire qui paie combien à qui.")
table(
    ["Mécanisme", "Proposition ARCANE", "Référence NERVA", "Référence XELIS"],
    [
        ["Adresses", "One-time dérivées à chaque paiement", "Identique (CryptoNote)", "Comptes + adresses furtives"],
        ["Montants", "RingCT (Pedersen)", "RingCT", "Chiffrement homomorphique du solde"],
        ["Anonymat du flux", "Ring size 16 + sings RCTType", "Ring size 5", "Confidentialité du registre"],
        ["Réseau", "Dandelion++ + Tor/i2p dans le daemon, activés par défaut", "Tor optionnel documenté", "Tor optionnel"],
        ["Comptabilité marchande", "View key en lecture seule + payment ids chiffrés", "View key + payment ids longs", "View key"],
        ["ZK", "Phase 2 optionnelle (shielded pool Groth16, héritage Axon)", "Non", "Non"],
    ],
    ratios=[0.22, 0.32, 0.23, 0.23],
    caption="Tableau 4 — Sources d'inspiration et niveau de confidentialité par mécanisme",
)
body("Deux choix méritent justification. Monter le ring size de 5 à 16 multiplie par "
     "plus de trois l'ensemble des leurres potentiels sans coût material pour un réseau "
     "à volume modéré ; c'est le levier d'anonymat le moins cher qui existe. Et faire de "
     "Tor un défaut plutôt qu'une option ferme la porte à l'analyse d'adresses IP, qui "
     "reste la grande faiblesse pratique des réseaux CryptoNote mal configurés. La "
     "view key marchande, enfin, est le pont vers la comptabilité : la caisse voit tout "
     "de ses encaissements sans jamais pouvoir dépenser — le pattern watch-only que "
     "XelisVault applique déjà sur NERVA.")

# ═══ 8. ANCRAGE DE REÇUS ═══
h1("Le différenciateur : l'ancrage de reçus")
body("La caisse NERVA livrée en septembre 2026 scelle déjà chaque vente par un SHA-256 "
     "et chaîne chaque sceau au précédent : effacer ou modifier une vente casse toute "
     "la chaîne de sceaux qui suit. Cette preuve est locale au navigateur du "
     "commerçant. L'ancrage de reçus la rend publique et universelle : chaque jour, la "
     "caisse calcule la tête de son journal (le sceau de la dernière vente) et l'insère "
     "dans une transaction ARCANE dédiée, avec un identifiant de domaine et un nonce. "
     "Quiconque — client, comptable, fisc — peut dès lors vérifier que le journal "
     "présenté correspond exactement au journal ancré, sans jamais accéder aux "
     "montants, aux clients ou aux produits.")
body("Le mécanisme est délibérément simple : une transaction par jour et par commerçant, "
     "contenant 32 octets utiles. Le coût est négligeable, la preuve est permanente, et "
     "l'agrégation est triviale (un explorateur peut lister tous les ancrages d'une "
     "journée). C'est le seul système de comptabilité marchande où l'intégrité est "
     "garantie par une blockchain sans que la confidentialité ne soit sacrifiée : les "
     "données restent chez le marchand, seule leur empreinte voyage. C'est aussi la "
     "réponse honnête à la question comptable et fiscale qui bloque l'adoption des "
     "monnaies privées par les commerces.")
quote("Le journal reste chez le marchand. Seule son empreinte voyage : l'intégrité devient "
      "publique, la confidentialité reste totale.")
body("Pour XelisVault, l'ancrage transforme trois produits existants en une suite "
     "cohérente : la caisse produit le journal chaîné, le reçu PDF porte l'empreinte "
     "quotidienne, l'explorer la vérifie. Aucun concurrent n'a les trois pièces. La "
     "figure 1 détaille le flux de bout en bout.")

# ═══ 9. TOKENOMICS ═══
h1("Tokenomics")
body("L'émission suit la tradition Bitcoin durcie : récompenses de bloc décroissantes "
     "par paliers, puis queue perpétuelle (tail emission) de 0,4 % par an pour garder "
     "les mineurs actifs quand les récompenses principales s'éteignent — le choix de "
     "Monero et de NERVA, assumé. La supply maximale est fixée à 100 millions d'unités, "
     "soit un ordre de grandeur confortable pour la monnaie de paiement visée. Il n'y a "
     "ni ICO, ni prémine, ni airdrop : la monnaie se gagne en sécurisant le réseau ou "
     "en la recevant en paiement.")
table(
    ["Poste", "Part", "Détail"],
    [
        ["Minage (récompenses de bloc)", "92 %", "Émission décroissante puis queue 0,4 %/an, distribuée sur ~24 ans"],
        ["Fonds de développement", "8 % des récompenses de bloc, 4 ans", "Multi-sig public, dépenses auditables on-chain, extinction automatique"],
        ["Prémine / équipe / investisseurs", "0 %", "Personne ne démarre avec un avantage — l'équipe mine comme tout le monde"],
        ["Frais de transaction", "brûlés", "Déflationnaire à l'usage ; pas de MEV possible en PoW"],
    ],
    ratios=[0.30, 0.20, 0.50],
    caption="Tableau 5 — Distribution et règles d'émission",
)
callout("8 %", "des récompenses de bloc financent le développement — la leçon d'Axon : 0 % de financement, c'est l'abandon programmé")
body("Le fonds de développement est la divergence assumée avec la pureté « zéro "
     "pré-allocation » d'Axon, et elle est assumée pour une raison simple : cette pureté "
     "a tué le projet. Huit pour cent des récompenses de bloc pendant quatre ans, vers "
     "une adresse multi-sig dont chaque dépense est visible on-chain, c'est un financement "
     "transparent, borné dans le temps, révocable par les mineurs (soft fork social) et "
     "sans aucune allocation de départ. C'est le compromis honnête entre survivre et ne "
     "jamais trahir.")

# ═══ 10. INGÉNIERIE ═══
h1("Ingénierie : CI, tests et builds multi-plateformes")
body("C'est le chapitre que le cahier des charges impose littéralement : Axon ne "
     "livrait que Linux amd64 et arm64, sans release publiée. ARCANE traite la "
     "distribution comme une fonctionnalité de première classe. Chaque tag produit des "
     "binaries reproductibles pour cinq cibles, signés, notariés macOS, et accompagnés "
     "de sommes de contrôle vérifiables par une simple page web.")
table(
    ["Cible", "Runner CI", "Signature", "Notes"],
    [
        ["Linux amd64", "ubuntu-24.04", "sha256 + minisign", "Binaire statique, conteneur Docker officiel"],
        ["Linux arm64", "ubuntu-24.04-arm", "sha256 + minisign", "SBC, VPS ARM"],
        ["macOS Apple Silicon", "macos-14 (M1)", "notarisation Apple + minisign", "Universal binary (arm64 + x86_64)"],
        ["macOS Intel", "macos-14", "notarisation Apple + minisign", "Inclus dans le binaire universel"],
        ["Windows x64", "windows-2022", "sha256 + minisign", "Miner et wallet GUI en phase 1"],
    ],
    ratios=[0.24, 0.22, 0.26, 0.28],
    caption="Tableau 6 — Matrice de builds de production",
)
body("La qualité ne s'arrête pas à la compilation. Le pipeline CI exécute la suite "
     "unitaire complète, le fuzzing continu des parseurs réseau et des structures de "
     "bloc (la surface d'attaque classique des forks CryptoNote), et surtout des tests "
     "de replay de consensus : chaque correction historique de bug de consensus — "
     "dont le cas F1 d'Axon, où la détection de triche pénalisait les validateurs "
     "honnêtes — devient une régression rejouée à chaque commit. Les upgrades sont "
     "répétés trois fois en public sur la testnet perpétuelle avant toute coordination "
     "mainnet, avec plan de rollback écrit. Une devnet docker-compose permet à "
     "quiconque de faire tourner un réseau complet en une commande, et les canaux "
     "stable et beta sont vérifiables automatiquement par le wallet.")
bullet("CI obligatoire sur chaque PR : build 5 cibles + tests + fuzz 60 s + replay consensus.")
bullet("Testnet perpétuelle publique avec faucet, explorer et network map dès le mois 6.")
bullet("Reproductibilité : deux compilations indépendantes doivent produire le même hash de binaire.")
bullet("Notarisation macOS automatique et vérification de signature documentée pour les non-techniciens.")

# ═══ 11. SÉCURITÉ ═══
h1("Sécurité et audits")
body("Le diff vis-à-vis du fork d'origine est volontairement gardé sous 5 000 lignes "
     "pour rester auditable en une passe. L'audit externe porte précisément sur ce "
     "diff, pas sur les vingt ans de CryptoNote déjà éprouvés — ce qui ramène le coût "
     "dans la fourchette 30-80 k$ au lieu de plusieurs centaines de milliers. Le "
     "rapport est publié intégralement, corrections comprises, avant le mainnet. Un "
     "programme de divulgation responsable avec primes complête le dispositif, et la "
     "liste des correctifs applicables (fuzzing, replay, tests de charge du mempool) "
     "est consolidée dans le CHANGELOG public.")
body("Le rituel de genesis est écrit et répété : génération déterministe du bloc "
     "d'origine devant témoin, publication du hash de genesis avant tout minage, "
     "vérification croisée des checksums par plusieurs sources indépendantes. Les "
     "fonds de développement reposent sur un multi-sig 2-sur-3 dont les clefs sont "
     "détenues par des personnes identifiées et un hardware wallet de réserve. "
     "Aucune infrastructure critique n'a de point de défaillance unique : deux "
     "fournisseurs pour les seed nodes, miroirs des binaries, domaine et DNS "
     "répliqués, explorer opérable par n'importe quel tiers.")

# ═══ 12. FEUILLE DE ROUTE ═══
h1("Feuille de route")
table(
    ["Phase", "Mois", "Livrables mesurables", "Critère GO/NO-GO"],
    [
        ["1 · Étude et spécifications", "M1-M2", "Spec du protocole, ADR 0001-0005, diff de fork chiffré, choix du nom définitif", "Diff estimé < 5 000 lignes"],
        ["2 · Fork et modules", "M3-M5", "Daemon + wallet CLI compilés 5 cibles, ancrage de reçus implémenté, devnet", "CI verte en continu pendant 3 semaines"],
        ["3 · Testnet privée", "M6-M7", "Faucet, explorer, caisse XelisVault branchée, tests de charge", "1 000 blocs sans incident, 10 tx/s simulées"],
        ["4 · Testnet publique + audit", "M8-M10", "Audit externe publié, bug bounty, 200+ nœuds communautaires, rituel d'upgrade x3", "Audit sans faille critique, 3 upgrades répétés"],
        ["5 · Genesis mainnet", "M11", "Cérémonie publique, binaries signés, 3 mois de communicating prévus", "Tous les critères précédents + plan de secours"],
        ["6 · Écosystème", "M12+", "Wallet GUI, intégration caisse/tickets production, étude shielded pool phase 2", "Adoption réelle mesurée (50+ commerçants actifs)"],
    ],
    ratios=[0.22, 0.10, 0.40, 0.28],
    caption="Tableau 7 — Douze mois, six phases, des critères explicites",
)
body("Le budget honnête se résume en trois postes : le temps (le principal — une "
     "personne à temps plein équivalent sur douze mois), l'audit externe (30 à 80 k$), "
     "et l'infrastructure (faible : de l'ordre de quelques dizaines d'euros par mois "
     "avant le mainnet, quelques centaines après). Le fonds de développement "
     "commence à produire à la phase 5 uniquement ; il ne finance jamais la phase "
     "d'étude. Chaque phase a un critère de sortie mesurable, et un NO-GO est un "
     "résultat acceptable : mieux vaut un projet arrêté proprement au mois 7 qu'un "
     "mainnet mort au bloc 295 500.")

# ═══ 13. RISQUES ═══
h1("Risques — la partie honnête")
body("Un document de proposition qui ne liste pas ses risques en détail est un "
     "document de vente. Celui-ci n'en est pas un. Les risques ci-dessous sont réels, "
     "classés par gravité, avec leurs mitigations — et leur statut après mitigation, "
     "parce qu'un risque mitigé n'est pas un risque disparu.")
table(
    ["Risque", "Gravité", "Mitigation", "Statut résiduel"],
    [
        ["Cadre réglementaire (MiCA, délistages UE des privacy coins)", "Élevée", "Monnaie de paiement non listée sur les plateformes régulées ; focus paiement marchand ; veille juridique ; communication factuelle", "Structurel, non éliminable"],
        ["Faille de sécurité (une faille = la réputation de XelisVault entière)", "Élevée", "Diff minimal audité, fuzzing continu, bug bounty, rituels d'upgrade, time-lock des correctifs critiques", "Réduit, jamais nul"],
        ["Charge de maintenance personnelle", "Élevée", "Fonds dev 8 %, recrutement de mainteneurs dès M6, plan de succession écrit", "Dépend de l'adoption"],
        ["Adoption insuffisante (le scénario Axon)", "Moyenne", "Outils marchands branchés AVANT le genesis ; communauté construite en testnet ; critères NO-GO honnêtes", "Le risque central du projet"],
        ["Fork malveillant ou concurrence directe", "Faible", "Diff audité public, marque, rapidité d'exécution, moat outils marchands", "Acceptable"],
    ],
    ratios=[0.30, 0.12, 0.40, 0.18],
    caption="Tableau 8 — Registre des risques, gravité et mitigations",
)
body("Le risque réglementaire mérite une précision : il porte sur la liste et l'échange "
     "de privacy coins, pas sur leur possession ni sur leur usage marchand direct. "
     "Une stratégie assumée de « monnaie de paiement de terrain » — pas de listing "
     "agressif, pas de spéculation encouragée — réduit l'exposition tout en servant "
     "la mission de XelisVault. C'est aussi une position défendable publiquement : "
     "nous construisons une caisse, pas un produit d'investissement.")

# ═══ 14. NOMS ═══
h1("Comment l'appeler")
body("Le nom doit remplir cinq conditions : sonner français sans être hermétique à "
     "l'international, évoquer le secret et le coffre (l'ADN de XelisVault), être "
     "court, disposer d'un ticker libre, et résister à dix ans d'usage. Cinq candidats "
     "ont été retenus, évalués sans complaisance.")
table(
    ["Nom", "Ticker", "Signification", "Forces", "Faiblesses"],
    [
        ["ARCANE", "XAR", "le secret, ce qui est caché", "Français ET international ; cohérent coffre/vault ; 6 lettres ; ticker XAR libre", "Un jeu vidéo connu porte un nom proche"],
        ["VERAULT", "VRT", "vérité + vault", "Extension naturelle de XelisVault ; unique ; bon ticker", "Moins euphonique ; sonne « entreprise »"],
        ["COFFRE", "XCF", "le coffre-fort", "Très français, mémorable, assumé", "Difficile à prononcer pour les non-francophones"],
        ["OBSIDIA", "OBS", "la pierre noire tranchante", "Esthétique privacy ; fort en logo", "Moins lié à la marque mère"],
        ["CHIFFRE", "aucun", "chiffre d'affaires + chiffrement", "Jeu de mots parfait pour une monnaie marchande", "Ticker piège (XCH = Chia) ; sens multiple confusant"],
    ],
    ratios=[0.14, 0.10, 0.24, 0.28, 0.24],
    caption="Tableau 9 — Cinq candidats évalués",
)
callout("ARCANE", "recommandation : français, coffre, secret — cohérent avec XelisVault et prononçable partout")
body("ARCANE est la recommandation : il porte la promonte de confidentialité dans sa "
     "définition même, s'accorde avec l'univers visuel bleu nuit de XelisVault, et le "
     "ticker XAR suit la convention X des monnaies échangeables. VERAULT est le choix "
     "de repli si la recherche de marque (domaines, réseaux sociaux) révélait un "
     "conflit. La décision finale appartient évidemment au porteur du projet — ce "
     "chapitre ne fixe qu'un nom de travail pour la suite du document et des "
     "discussions.")

# ═══ 15. PROCHAINES ÉTAPES ═══
h1("Prochaines étapes")
body("Trois décisions humaines sont attendues, et tout le reste est mécanique. Une "
     "fois le nom, la fondation CryptoNote et le principe du fonds de développement "
     "validés, le travail s'exécute dans l'ordre suivant, chaque étape livrant un "
     "artefact vérifiable.")
bullet("Semaine 1 : squelette du dépôt public — README bilingue, licence, ADR 0001 (fondation) à 0005 (ancrage), matrix CI 5 cibles qui compile un « hello-chain ».")
bullet("Semaine 2-3 : étude de diff complète contre le codebase CryptoNote choisi, chiffrement ligne à ligne, spécification du format d'ancrage de reçus (type de tx, domaine, nonce).")
bullet("Mois 2 : devnet locale docker-compose + premier daemon qui mine un bloc portant une ancre de journal de caisse réel — la boucle démonstration complète.")
bullet("Mois 3 : branchement de la caisse XelisVault en mode multi-chaîne (XNV + ARCANE) derrière un drapeau feature.")
bullet("En parallèle : réservation des identités (domaine, réseaux, repositories) dès validation du nom.")
body("Ce document est une base de discussion, pas un engagement ferme. Chaque chapitre "
     "est conçu pour être attaqué : les hypothèses de l'autopsie d'Axon sont étayées "
     "par des faits vérifiables dans le repo public, les chiffres de la feuille de "
     "route sont des ordres de grandeur assumés, et le registre des risques ne cache "
     "rien. La meilleure chose qui puisse arriver à cette proposition est qu'elle "
     "soit contredite sur des faits — c'est comme ça qu'on construit une chaîne qui "
     "survit à son auteur.")
