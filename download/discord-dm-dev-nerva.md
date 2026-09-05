# Message Discord — DM à un dev NERVA (à copier-coller tel quel)

---

Salut ! 👋 C'est le créateur de XelisVault (xelisvault.xyz), le toolkit marchand XNV dont je t'avais parlé. Je viens de pousser une grosse mise à jour et comme tu es dans le code du wallet, j'aurais vraiment ton avis sur deux points précis. Tout est auditable ici :

→ **github.com/XelisVault/XelisVault-website** (repo public, code MIT)

**1 · Le paper wallet (et j'aimerais ton verdict)** 🧾

Génération 100 % côté client (CSPRNG du navigateur, zéro requête réseau, zéro stockage — tu peux passer le site en mode avion, il génère quand même). La partie qui m'intéresse : j'ai porté `account.cpp` / `crypto.cpp` / `base58.cpp` / `electrum-words.cpp` en TypeScript, octet par octet.

Au passage, j'ai corrigé un bug que tu aurais repéré en dix secondes 😅 : mon encodage mnémonique lisait les groupes de 4 octets en big-endian alors que `electrum-words.cpp` fait un `SWAP32LE` (little-endian natif) — donc la seed restaurait une **autre adresse** dans nerva-wallet. Corrigé, et surtout **vérifié contre le C++** : j'ai commité un copier-coller verbatim des boucles (`scripts/nerva-mnemonic-xcheck.cpp`) qu'on compile et qu'on compare à mon TS sur 48 vecteurs — identiques bit par bit, y compris le mot de checksum CRC-32.

→ Est-ce que ce format de paper wallet te convient pour l'écosystème ? Rien à changer côté protocole, mais si tu vois un truc qui cloche (ou si vous prévoyez de toucher aux seeds), je préfère l'apprendre de toi.

**2 · NervaLink v2 — adresses intégrées** 🔗

Mes liens de paiement de première génération foutaient un payment id **long en clair** dans l'URI… or `nerva-wallet` le refuse par défaut (`--long-payment-id-support` = false). Résultat : le client payait, mais la page cherchait une référence qui n'existait pas dans `tx_extra`. Désolé pour celui qui a testé, c'était exactement ça 😬

Nouveau design : l'invoice embarque un pid8 aléatoire dans une **adresse intégrée** (préfixe 0x7081), donc le wallet chiffre la référence automatiquement — aucun réglage, aucun refus. Et la détection :
- côté marchand : view key optionnelle dans la caisse, je déchiffre `pid ⊕ keccak(D‖0x8d)[0..8]` avec `D = 8·viewSec·txPub` (vérifié contre `device_default.cpp`) — le même scan que le wallet officiel, en navigateur ;
- côté payeur : il déclare son hash de transaction, et avec `get_tx_key` la page prouve la référence elle-même (`D = 8·txKey·viewPub`).

**Et le reste :** caisse POS avec journal de ventes scellé SHA-256, étiquettes prix A4 imprimables, prix XNV en **USD live** (CoinGecko → CoinPaprika, EUR en secondaire), tout reste statique et sans serveur.

Si tu as 20 minutes : `bun run audit:paper-wallet` (échoue au moindre fetch/storage dans le chemin du paper wallet), `bun run test:crypto` + le cross-check C++. Si tu veux relire directement le port crypto : `src/lib/nerva/cryptonote.ts`, chaque fonction a la ligne du fichier source NERVA en commentaire.

Un retour, une PR, ou même un « c'est nul, voilà pourquoi » — tout est bon à prendre 🙏

→ **xelisvault.xyz** (côté Nerva)

Merci pour le travail que vous fournissez sur le protocole ⚡

---

## Notes (à ne pas envoyer)

- Repo exact : https://github.com/XelisVault/XelisVault-website
- Le domaine est bien **xelisvault.xyz** (pas .network — l'ancienne annonce citait encore .network).
- Si le dev veut un test rapide du paper wallet : générer une feuille sur /nerva/paper-wallet, puis `nerva-wallet-cli --restore-deterministic-wallet` avec les 25 mots → l'adresse doit être identique à celle imprimée.
- Si le format DM est trop long pour Discord, couper après le point 1 et envoyer le point 2 dans un second message.
