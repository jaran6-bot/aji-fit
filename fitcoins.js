// ApexFit FitCoins & Rewards System
// Système de monnaie sportive, récompenses et codes promotionnels pour inciter à l'entraînement
class FitCoinsEngine {
    constructor() {
        this.balance = 50; // Solde de bienvenue
        this.totalEarned = 50;
        this.totalWorkoutSeconds = 0;
        this.unlockedPromos = [];
        this.history = [
            {
                id: 1,
                date: 'Aujourd\'hui',
                desc: 'Bonus de bienvenue ApexFit',
                amount: 50,
                type: 'gain'
            }
        ];

        // Catalogue des récompenses échangeables contre des FitCoins
        this.rewardsCatalog = [
            {
                id: 'PROMO10',
                title: 'Code Promo -10% Tout le Magasin',
                category: 'Boutique Équipements',
                cost: 100,
                discountPercent: 10,
                code: 'FIT10',
                icon: '🏷️',
                desc: 'Valable sur l\'ensemble des gants, accessoires, et nutrition sportive.'
            },
            {
                id: 'PROMO20',
                title: 'Réduction -20% Matériel de Boxe',
                category: 'Boutique Combat',
                cost: 200,
                discountPercent: 20,
                code: 'BOXE20',
                icon: '🥊',
                desc: 'Applicable sur les gants de boxe pro 14oz, bandes et protège-dents.'
            },
            {
                id: 'PROMO30',
                title: 'Réduction -30% Musculation & Force',
                category: 'Boutique Fitness',
                cost: 320,
                discountPercent: 30,
                code: 'IRON30',
                icon: '🏋️',
                desc: 'Valable sur les poignées pour pompes, bandes élastiques et haltères.'
            },
            {
                id: 'CADEAU_SHAKER',
                title: 'Shaker Inox 750ml Offert',
                category: 'Cadeau Gratuit',
                cost: 250,
                freeItem: 'Shaker Inox Isotherme',
                code: 'SHAKERFREE',
                icon: '🥤',
                desc: 'Recevez un shaker isotherme premium gratuit dans votre prochain colis.'
            },
            {
                id: 'VIP1M',
                title: '1 Mois Abonnement ApexFit VIP Pro',
                category: 'Abonnement Sport',
                cost: 450,
                subscription: '1 Mois Pro VIP',
                code: 'VIP1MOIS',
                icon: '⭐',
                desc: 'Accès illimité aux programmes personnalisés, statistiques avancées et coachings IA.'
            },
            {
                id: 'ANNUEL50',
                title: '-50% sur l\'Abonnement Annuel Premium',
                category: 'Abonnement Sport',
                cost: 750,
                discountPercent: 50,
                code: 'ANNUEL50',
                icon: '👑',
                desc: 'Moitié prix sur l\'abonnement illimité pour une année complète de sport.'
            }
        ];

        this.activeCoupon = null; // Coupon actuellement appliqué au panier
    }

    init() {
        this.loadStorage();
        this.bindEvents();
        this.updateUI();
    }

    loadStorage() {
        try {
            const saved = localStorage.getItem('apexfit_coins_data');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.balance = parsed.balance ?? 50;
                this.totalEarned = parsed.totalEarned ?? 50;
                this.totalWorkoutSeconds = parsed.totalWorkoutSeconds ?? 0;
                this.unlockedPromos = parsed.unlockedPromos || [];
                this.history = parsed.history || this.history;
                this.activeCoupon = parsed.activeCoupon || null;
            }
        } catch (e) {
            console.warn("Erreur chargement FitCoins:", e);
        }
    }

    saveStorage() {
        try {
            const payload = {
                balance: this.balance,
                totalEarned: this.totalEarned,
                totalWorkoutSeconds: this.totalWorkoutSeconds,
                unlockedPromos: this.unlockedPromos,
                history: this.history,
                activeCoupon: this.activeCoupon
            };
            localStorage.setItem('apexfit_coins_data', JSON.stringify(payload));
        } catch (e) {
            console.warn("Erreur sauvegarde FitCoins:", e);
        }
    }

    bindEvents() {
        // Modal des récompenses FitCoins
        const openRewardsBtn = document.querySelectorAll('.open-rewards-btn');
        openRewardsBtn.forEach(btn => {
            btn.addEventListener('click', () => {
                this.renderRewardsModal();
                document.getElementById('rewards-modal')?.classList.remove('hidden');
            });
        });

        const closeRewardsBtn = document.getElementById('close-rewards-modal-btn');
        if (closeRewardsBtn) {
            closeRewardsBtn.addEventListener('click', () => {
                document.getElementById('rewards-modal')?.classList.add('hidden');
            });
        }
    }

    // Créditer des FitCoins à l'utilisateur
    awardCoins(amount, reason = "Entraînement complété") {
        if (amount <= 0) return;

        this.balance += amount;
        this.totalEarned += amount;

        this.history.unshift({
            id: Date.now(),
            date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
            desc: reason,
            amount: amount,
            type: 'gain'
        });

        if (this.history.length > 30) this.history.pop();

        this.saveStorage();
        this.updateUI();

        // Audio & notification
        if (window.soundEngine && window.soundEngine.playCoin) {
            window.soundEngine.playCoin();
        }
        this.showCoinFloatingToast(`+${amount} FitCoins 🪙 (${reason})`);
    }

    // Enregistrer du temps d'effort (ex: 1 coin par 15s d'effort actif = 4 coins/min)
    recordWorkoutTime(seconds) {
        if (!seconds || seconds <= 0) return;
        this.totalWorkoutSeconds += seconds;

        // 1 FitCoin par 20 secondes d'effort
        const timeCoins = Math.floor(seconds / 20);
        if (timeCoins > 0) {
            this.awardCoins(timeCoins, `Temps d'effort (${Math.round(seconds / 60)} min)`);
        } else {
            this.saveStorage();
            this.updateUI();
        }
    }

    // Échanger des coins contre une promotion ou un abonnement
    redeemReward(rewardId) {
        const reward = this.rewardsCatalog.find(r => r.id === rewardId);
        if (!reward) return;

        if (this.balance < reward.cost) {
            alert(`Solde insuffisant ! Il vous faut ${reward.cost} FitCoins (Vous en avez ${this.balance}). Continuez vos entraînements pour en gagner !`);
            return;
        }

        // Vérifier si déjà débloqué
        const already = this.unlockedPromos.find(p => p.id === rewardId);
        if (already) {
            this.applyCouponDirectly(already.code);
            alert(`Ce code (${already.code}) est déjà actif et prêt à être utilisé dans votre panier !`);
            return;
        }

        this.balance -= reward.cost;
        const newPromo = {
            id: reward.id,
            title: reward.title,
            code: reward.code,
            discountPercent: reward.discountPercent || 0,
            freeItem: reward.freeItem || null,
            subscription: reward.subscription || null,
            unlockedAt: new Date().toISOString()
        };

        this.unlockedPromos.push(newPromo);
        this.activeCoupon = newPromo;

        this.history.unshift({
            id: Date.now(),
            date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
            desc: `Échange récompense : ${reward.title}`,
            amount: -reward.cost,
            type: 'depense'
        });

        this.saveStorage();
        this.updateUI();
        this.renderRewardsModal();

        // Célébration
        if (window.soundEngine && window.soundEngine.playRecordFanfare) {
            window.soundEngine.playRecordFanfare();
        }
        if (window.coachVoice) {
            window.coachVoice.speak(`Félicitations ! Code ${reward.code} débloqué grâce à vos efforts !`, false);
        }

        // Si le shop est ouvert, rafraîchir le panier
        if (window.sportShop) {
            window.sportShop.renderCartDrawer();
        }

        this.showCoinFloatingToast(`🎉 Code ${reward.code} débloqué et activé !`);
    }

    applyCouponDirectly(code) {
        const found = this.unlockedPromos.find(p => p.code.toUpperCase() === code.toUpperCase());
        if (found) {
            this.activeCoupon = found;
            this.saveStorage();
            if (window.sportShop) window.sportShop.renderCartDrawer();
            this.showCoinFloatingToast(`Code promo ${found.code} appliqué au panier !`);
            return true;
        }

        // Tester si c'est un code direct du catalogue
        const cat = this.rewardsCatalog.find(r => r.code.toUpperCase() === code.toUpperCase());
        if (cat) {
            alert(`Le code ${code} nécessite ${cat.cost} FitCoins. Débloquez-le dans l'espace Récompenses FitCoins !`);
            return false;
        }

        alert("Code promotionnel invalide ou non encore débloqué avec vos FitCoins.");
        return false;
    }

    removeActiveCoupon() {
        this.activeCoupon = null;
        this.saveStorage();
        if (window.sportShop) window.sportShop.renderCartDrawer();
    }

    updateUI() {
        // Badges de solde
        document.querySelectorAll('.fitcoins-balance').forEach(el => {
            el.textContent = this.balance;
        });

        document.querySelectorAll('.fitcoins-total').forEach(el => {
            el.textContent = this.totalEarned;
        });

        // Heures d'entraînement formatées
        const hours = (this.totalWorkoutSeconds / 3600).toFixed(1);
        document.querySelectorAll('.fitcoins-workout-time').forEach(el => {
            el.textContent = `${hours}h`;
        });
    }

    renderRewardsModal() {
        const container = document.getElementById('rewards-catalog-grid');
        if (!container) return;

        container.innerHTML = this.rewardsCatalog.map(r => {
            const isUnlocked = this.unlockedPromos.some(p => p.id === r.id);
            const canAfford = this.balance >= r.cost;

            return `
                <div class="glass-card p-5 rounded-2xl border ${isUnlocked ? 'border-emerald-500/50 bg-emerald-950/20' : 'border-slate-800'} flex flex-col justify-between relative overflow-hidden group">
                    ${isUnlocked ? `
                        <div class="absolute -right-12 top-4 bg-emerald-500 text-black text-[9px] font-black uppercase py-0.5 px-12 rotate-45 shadow">
                            Débloqué
                        </div>
                    ` : ''}

                    <div>
                        <div class="flex items-center justify-between mb-3">
                            <span class="text-3xl">${r.icon}</span>
                            <span class="px-2.5 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                                <span>🪙</span>
                                <span>${r.cost} Coins</span>
                            </span>
                        </div>

                        <span class="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block mb-1">${r.category}</span>
                        <h4 class="text-base font-bold text-white mb-1.5 leading-snug">${r.title}</h4>
                        <p class="text-slate-400 text-xs mb-4 leading-relaxed">${r.desc}</p>
                    </div>

                    <div class="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                        <div>
                            <span class="text-[10px] text-slate-500 block">Code promo :</span>
                            <span class="text-xs font-mono font-bold text-cyan-300 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">${r.code}</span>
                        </div>

                        ${isUnlocked ? `
                            <button onclick="window.fitCoins.applyCouponDirectly('${r.code}')" class="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition">
                                Utiliser
                            </button>
                        ` : `
                            <button onclick="window.fitCoins.redeemReward('${r.id}')" class="px-3.5 py-1.5 rounded-xl ${canAfford ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black' : 'bg-slate-800 text-slate-500 cursor-not-allowed'} font-bold text-xs transition flex items-center gap-1">
                                <span>Échanger</span>
                            </button>
                        `}
                    </div>
                </div>
            `;
        }).join('');
    }

    showCoinFloatingToast(msg) {
        let toast = document.getElementById('fitcoins-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'fitcoins-toast';
            toast.className = 'fixed top-20 right-6 z-50 px-4 py-2.5 rounded-2xl bg-amber-500/90 text-black font-black text-xs shadow-2xl backdrop-blur flex items-center gap-2 transform translate-y-[-20px] opacity-0 transition-all duration-300 pointer-events-none';
            document.body.appendChild(toast);
        }

        toast.innerHTML = `<span>🪙</span> <span>${msg}</span>`;
        toast.classList.remove('opacity-0', 'translate-y-[-20px]');
        toast.classList.add('opacity-100', 'translate-y-0');

        setTimeout(() => {
            toast.classList.add('opacity-0', 'translate-y-[-20px]');
            toast.classList.remove('opacity-100', 'translate-y-0');
        }, 3200);
    }
}

// Global instance
window.fitCoins = new FitCoinsEngine();
