# -*- coding: utf-8 -*-
"""Génère les fichiers ADR du dépôt Antumbra (spécification, phase 1)."""
import os

BASE = '/home/z/my-project/antumbra/spec/adr'
os.makedirs(BASE, exist_ok=True)

TEMPLATE = """# ADR-000 : modèle de décision d'architecture

Statut : **Accepté** (processus)

## Contexte

Chaque choix structurel d'ANTUMBRA engage le réseau pour des années et
ne peut être corrigé qu'au prix d'un fork. Les décisions doivent donc
être écrites, argumentées, datées et numérotées avant la moindre ligne
de code, conformément à la feuille de route du livre blanc (phase 1).

## Format

Chaque ADR contient : un statut (Proposé, Accepté, Remplacé, Rejeté),
le contexte, la décision, les options écartées et leurs motifs, les
conséquences, et le critère de validation (prototype, simulation ou
audit) exigé avant l'acceptation définitive.

Les ADR sont écrits en français, sans tiret cadratin, dans le même
style que le livre blanc : ce sont des documents de spécification.
"""

ADRS = {
    '001': ("""# ADR-001 : couche d'ordre, un BlockDAG à convergence rapide

Statut : **Proposé**

## Contexte

La cadence visée est de deux secondes par bloc. Une chaîne linéaire à
preuve de travail perdrait à cette cadence une part insoutenable de ses
blocs en orphelins ; la confidentialité par anneau exige par ailleurs
que les sorties non dépensées soient nombreuses et bien distribuées.

## Décision

La couche d'ordre est un DAG de blocs à convergence rapide, de famille
GHOSTDAG : les blocs parallèles sont ordonnés par règle de consensus au
lieu d'être rejetés, et la sécurité cumulée croît avec le volume total
de blocs. L'élagage conserve l'état récent et les preuves du passé pour
qu'un nœud complet tienne sur un ordinateur personnel.

## Options écartées

Chaîne linéaire à blocs courts (taux d'orphelins rédhibitoire) ;
chaîne à cadence longue (confirmation trop lente pour le comptoir) ;
consensus à comité pour la production de blocs (verrou de capital,
contraire au principe égalitariste).

## Validation exigée

Prototype isolé minant un DAG processeur à deux secondes, puis
vingt-quatre heures de réseau de développement sans réorganisation
non anticipée (phase 2 de la feuille de route).
"""),
    '002': ("""# ADR-002 : finalité, l'Anneau ancré sur la réputation (RAF)

Statut : **Proposé**

## Contexte

L'inclusion en deux secondes ne suffit pas : le paiement doit devenir
irréversible en secondes. Les consensus à comité classiques l'obtiennent
en verrouillant du capital, ce qui revient à vendre la finalité.

## Décision

Un comité de cinquante-cinq sièges, tirés à chaque ère parmi les
identités à Kléos d'au moins 70 et à la Durée d'au moins quinze ères,
signe des points de contrôle toutes les quatre secondes ; le quorum de
trente-sept signatures finalise tout ce que le point de contrôle couvre.
Un siège qui signe un fork concurrent est déchu : son Kléos est remis à
zéro. En cas de silence du tiers des sièges, la finalité retombe sur la
profondeur de preuve de travail (dix blocs, vingt secondes) et l'ère
suivante retire les silencieux. Aucun capital n'est verrouillé, aucun
rendement n'est servi : ce n'est pas une preuve d'enjeu.

## Validation exigée

Finalité mesurée sous six secondes sur cent mille blocs rejoués en
phase 3, avec injection de pannes et de sièges silencieux.
"""),
    '003': ("""# ADR-003 : Kléos, la réputation à trois couches

Statut : **Proposé** (validé par simulation)

## Contexte

La réputation doit être assez solide pour porter la finalité, et assez
sobre pour ne pas devenir une monnaie. Le projet qui a inspiré cette
partie indexait la réputation sur le capital : la formule multipliait
les deux, et le riche restait au pouvoir.

## Décision

Score de 0 à 100, consensuel, non transférable : le Fait (comportement
observé, plafond 40), l'Écho (attestations des pairs, plafond 30, budget
de 0,1 par témoin et par ère), la Durée (ancienneté continue, plafond
30). Décroissances naturelles ; triche : remise à zéro du Fait ; incident
majeur : effondrement de la Durée. Quatre règles correctives issues de
la simulation : R1 seuil de candidature à 70 et quinze ères, R2 témoin
muet sous vingt points de Fait, R3 attestations responsables, R4 activité
mutualisée d'une clique comptée au quart.

## Validation exigée

La simulation déterministe (graine 1618) est le test de régression :
toute modification des règles doit la repasser au vert, attaques
maximales comprises.
"""),
    '004': ("""# ADR-004 : Braise, l'identité humaine non biométrique

Statut : **Proposé**

## Contexte

La gouvernance et le parrainage exigent de distinguer les personnes des
programmes. Les réponses dominantes gravent des données corporelles dans
des registres mondiaux : une dette irréversible.

## Décision

Une Braise s'établit par trois verrous : une preuve de travail légère
de présence signée à chaque ère, un parrainage plafonné à deux par an
engageant le Kléos du parrain, et la durée sans incident. Aucune donnée
personnelle n'est collectée, jamais. Une Braise, une voix dans sa
chambre de gouvernance.

## Options écartées

Iris (registre corporel mondial), biométrie au consensus (la chaîne
entière dépendrait d'un secret corporel), KYC délégué (tiers de
confiance central, contraire au positionnement).

## Validation exigée

Prototype du parrainage et de la preuve de présence en phase 4, avec
simulation d'une ferme de faux profils sur la toile réelle.
"""),
    '005': ("""# ADR-005 : Cipher, l'agent responsable par construction

Statut : **Proposé**

## Contexte

Les rails de paiement agentiques de 2026 transportent des paiements
machine-à-machine sans dire qui respond de l'agent ni jusqu'où il peut
dépenser.

## Décision

Tout agent s'enregistre avec trois attaches : un parrain humain (une
Braise, responsable et révocateur), un périmètre de dépense déclaratif
et vérifiable à chaque transaction (plafonds, destinataires, marqueurs
d'usage, fenêtre de validité), et un interrupteur de révocation à une
transaction. Le Kléos d'agent construit son actif commercial.

## Validation exigée

Prototype des périmètres en phase 4 : chaque transaction d'agent est
rejetée si elle sort du périmètre, et la révocation gèle les dépenses
dès le bloc suivant.
"""),
    '006': ("""# ADR-006 : Lumen, la divulgation sélective à trois niveaux

Statut : **Proposé**

## Contexte

La confidentialité par défaut rend le réseau illisible pour les
comptables et les autorités, à moins que la divulgation ne soit une
primitive du protocole plutôt qu'une promesse. C'est la leçon de
Zcash : la lisibilité, pas la transparence, est le critère
d'acceptation.

## Décision

Trois niveaux, tous à l'initiative du propriétaire : clé de vue par
transaction (prouver un paiement précis à son destinataire), clé
d'auditeur bornée dans le temps et le périmètre, preuve de conformité
non interactive établissant un fait (montant sous plafond, ancienneté
des fonds, couverture d'un engagement) sans rien révéler d'autre. Les
preuves de conformité de phase 4 s'appuient sur Groth16, héritage
revendiqué du projet qui a inspiré la couche d'agents.

## Validation exigée

Spécification cryptographique relue par un auditeur externe en phase 4,
et démonstrateurs de preuve vérifiés sur vecteurs d'essai publiés.
"""),
    '007': ("""# ADR-007 : économie, le contrat du nombre d'or

Statut : **Proposé** (calendrier vérifié par calcul exact)

## Contexte

Le plafond, la décroissance et la durée d'émission doivent être
récitables de tête dans dix ans, et l'émission doit survivre à ses
premiers mineurs : chaque génération doit trouver une émission active.

## Décision

Plafond de 16 180 339 ATU, le nombre d'or multiplié par dix millions ;
la même proportion pilote déjà RandomX (constante 0x9E3779B9). Émission
par éclipses de quatre ans, chacune émettant la fraction 1/phi de la
précédente : 6 180 340 puis 3 819 660, dont la somme vaut exactement
dix millions après huit ans ; cap exact à la trente-quatrième éclipse,
en l'an 136. Trésorerie communautaire de 6,18 % des récompenses
pendant huit éclipses, gouvernée par les Braises, extinction
automatique ensuite. Prémine nulle. Plafond strict, avec soupape
constitutionnelle de queue activable par les trois chambres.

## Validation exigée

Le calendrier exact est un script de calcul archivé
(calendrier d'émission) ; toute modification passe par la voie
constitutionnelle et refait passer le calcul.
"""),
}

with open(os.path.join(BASE, 'ADR-000-modele.md'), 'w', encoding='utf-8') as f:
    f.write(TEMPLATE)

TITLES = {
    '001': 'dag', '002': 'raf', '003': 'kleos', '004': 'braise',
    '005': 'cipher', '006': 'lumen', '007': 'economie',
}
for num, text in ADRS.items():
    path = os.path.join(BASE, f'ADR-{num}-{TITLES[num]}.md')
    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)
    print('écrit', path)
print('ADR écrites :', 1 + len(ADRS))
