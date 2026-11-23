# ⚡ ApexFit Vision - Boxe Sparring & Musculation IA

Application sportive multi-sport par vision artificielle (sans capteur, 100% dans le navigateur via Webcam).

---

## 🥊 Fonctionnalités

### 1. 🥊 Mode Boxe (Sparring Virtuel avec Adversaire)
- **Adversaire virtuel interactif** affiché sur le canvas au-dessus de votre flux caméra.
- **Détection des coups de poing en direct** (Directs, Crochets gauche/droite, Coups au corps) via le tracking en temps réel des poignets et des coudes.
- **Système d'esquives dynamiques** : L'adversaire télégraphie ses attaques avec des alertes visuelles et vocales. Vous devez déplacer votre tête / buste dans la zone sûre pour esquiver ses coups.
- **Barres de vie, Combos et K.O.** : Infligez des dégâts à l'adversaire, enchaînez les combos et mettez-le K.O. avant la fin du round !
- **Effets sonores réalistes & Coach vocal** intégrés via le Web Audio API et la synthèse vocale (sans dépendances externes).

### 2. 🏋️ Mode Musculation (Tracker de Pompes IA)
- **Calcul de l'angle du coude en continu** ($\angle(\text{Épaule}, \text{Coude}, \text{Poignet})$).
- **Validation stricte de la descente** : Répétition validée uniquement si les coudes atteignent l'angle de $90^\circ$ puis reviennent en extension complète ($>150^\circ$).
- **Contrôle de la posture** : Détecte si le dos est creusé ou mal gainé ($\angle(\text{Épaule}, \text{Hanche}, \text{Cheville})$) et vous encourage à corriger votre forme.
- **Jauge de profondeur en temps réel** et compteur de cadence (pompes par minute) et calories.

### 3. 📊 Tableau de bord (Page d'accueil)
- **Affichage des records personnels** :
  - Record de coups donnés en boxe (et combo maximum).
  - Record de pompes validées en une série.
- **Résumé d'activité persistant** : Historique complet de chaque séance avec date, durée, calories brûlées et badges "NOUVEAU RECORD".
- Sauvegarde automatique locale via `localStorage`.

---

## 🚀 Comment lancer l'application

1. Ouvrez un terminal dans le dossier du projet :
   ```bash
   cd /Users/jaran/Desktop/sport-vision-app
   ```

2. Lancez le serveur local avec Python :
   ```bash
   python3 server.py
   ```

3. Ouvrez votre navigateur sur :
   ```
   http://localhost:8000
   ```

4. Cliquez sur **"🥊 Entrer sur le Ring"** ou **"🏋️ Démarrer la série"**, et autorisez l'accès à la caméra pour démarrer l'entraînement !
