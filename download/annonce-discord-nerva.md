# Annonce Discord NERVA (à publier tel quel)

---

**XelisVault s'ouvre au monde NERVA** 🔒

Salut à tous ! 👋

Je suis le créateur de **XelisVault** (xelisvault.network), une plateforme centrée sur la confidentialité financière. À l'origine tournée vers la blockchain Xelis, elle vient d'ouvrir un monde entier dédié à **NERVA**. Le site vous propose désormais de « choisir votre côté » : Xelis ou Nerva. Et je me suis vraiment donné pour mission de faire honneur au nôtre.

**Ce que vous y trouverez :**

🔭 **Un explorateur en direct** : hauteur, hashrate, difficulté, mempool, graphique de difficultité sur 120 blocs, flux des derniers blocs rafraîchi toutes les 10 secondes, recherche par hauteur ou par hash, détails de blocs et de transactions (dont le parsing de tx_extra : clé publique, payment id).

🔗 **NervaLink, des liens de paiement stateless** : générez un lien de paiement XNV en quelques secondes, sans compte ni base de données. L'invoice vit entièrement dans l'URL : la page de paiement affiche le QR (URI nerva: native), surveille la chaîne via l'API publique, et suit votre référence du mempool jusqu'à 10 confirmations.

📊 **De la télémétrie en direct** alimentée uniquement par l'API publique de l'explorer officiel.

**Comment ça marche (la partie qui devrait vous plaire) :**

Tout tourne **côté client**, dans votre navigateur. Le site interroge directement api.nerva.one (CORS ouvert, merci 💚), ne stocke aucune donnée, ne demande **aucune seed, aucune clé**, aucun compte, zéro tracker. Les liens de paiement ne passent par aucun serveur intermédiaire : c'est du pair-à-pair, comme prévu. Le tout est déployé en statique.

**Transparence totale :** les montants RingCT étant chiffrés, la détection confirme l'arrivée de votre référence on-chain avec ses confirmations, pas le montant exact (à vérifier dans votre wallet, qui associe les deux). NervaOne et le CLI gèrent nativement les URI. Le projet n'est pas affilié à NERVA : je suis simplement un convaincu de la vision one-CPU-one-vote, et j'ai voulu construire un outil digne de ce protocole.

Venez tester, casser, critiquer : les retours (et les PR, c'est public) sont les bienvenus 🙏

→ **https://xelisvault.network** (choisissez le côté Nerva 🧠)

Merci à la communauté NERVA pour ce que vous construisez depuis 2018. ⚡

---

## Version anglaise (si vous voulez aussi l'annoncer sur un canal international)

**XelisVault just opened a full NERVA world** 🔒

Hey everyone 👋

I built **XelisVault** (xelisvault.network), a privacy-focused financial platform originally built around the Xelis blockchain. It now opens an entire world dedicated to **NERVA**: the site greets you with a "choose your side" gate, Xelis or Nerva, and I made sure ours gets the treatment it deserves.

**What you'll find there:**

🔭 **A live explorer**: height, hashrate, difficulty, mempool, a 120-block difficulty chart, a 10-second block feed, search by height or hash, block and transaction details (including tx_extra parsing: tx pubkey, payment id).

🔗 **NervaLink, stateless payment links**: generate an XNV payment link in seconds, no account, no database. The invoice lives entirely in the URL: the checkout page renders the QR (native nerva: URI), watches the chain through the public API, and follows your reference from the mempool to 10 confirmations.

📊 **Live telemetry** fed only by the official explorer's public API.

**How it works (the part you'll like):**

Everything runs **client-side**, in your browser. The site talks directly to api.nerva.one (CORS-open, thanks 💚), stores nothing, holds **no seed, no keys**, requires no account, runs zero trackers. Payment links go through no intermediary server: purely peer-to-peer, as intended. Fully static deployment.

**Full transparency**: since RingCT amounts are encrypted, detection confirms your reference landed on-chain with its confirmations, not the exact amount (verify in your wallet, which pairs both). NervaOne and the CLI handle URIs natively. This project is not affiliated with NERVA: I'm simply a believer in the one-CPU-one-vote vision, and I wanted to build a tool worthy of the protocol.

Come test it, break it, criticize it: feedback (and PRs, it's public) are welcome 🙏

→ **https://xelisvault.network** (pick the Nerva side 🧠)

Thanks to the NERVA community for what you've been building since 2018. ⚡
