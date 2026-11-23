// Boutique Officielle Aji Fit — Athletic Store & Cart Module
class SportShop {
    constructor() {
        this.products = [
            // --- BOXE & COMBAT ---
            {
                id: 'box-gloves-red',
                name: 'Gants de Boxe Cuir Pro Aji Fit 14oz',
                category: 'boxing',
                price: 59.99,
                oldPrice: 79.99,
                rating: 4.9,
                reviews: 184,
                badge: 'Top Vente 🔥',
                img: 'https://images.unsplash.com/photo-1517637382994-f02da38c6728?w=400&q=80',
                desc: 'Mousse triple densité, maintien renforcé du poignet, ergonomie combat pro.'
            },
            {
                id: 'box-wraps',
                name: 'Bandes de Boxe Semi-Élastiques Aji 4.5m',
                category: 'boxing',
                price: 11.90,
                rating: 4.8,
                reviews: 95,
                badge: 'Essentiel',
                img: 'https://images.unsplash.com/photo-1555597673-b21d5c935865?w=400&q=80',
                desc: 'Protection métacarpienne optimale avec fermeture velcro extra-large.'
            },
            {
                id: 'box-mouthguard',
                name: 'Protège-Dents Thermoformable Aji Custom',
                category: 'boxing',
                price: 14.50,
                rating: 4.7,
                reviews: 73,
                badge: 'Sécurité',
                img: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=400&q=80',
                desc: 'Canal de respiration intégré et ajustement personnalisé pour sparring.'
            },
            {
                id: 'box-punchbag',
                name: 'Sac de Frappe Lourd Aji Fit 35kg',
                category: 'boxing',
                price: 119.00,
                oldPrice: 149.00,
                rating: 5.0,
                reviews: 62,
                badge: 'Pro Gym',
                img: 'https://images.unsplash.com/photo-1593476550610-87baa860004a?w=400&q=80',
                desc: 'Revêtement cuir synthétique ultra-résistant avec chaîne de suspension en acier.'
            },

            // --- MUSCULATION & FITNESS ---
            {
                id: 'fit-pushup-bars',
                name: 'Poignées Pompes Ergonomiques Aji Pro',
                category: 'fitness',
                price: 19.99,
                rating: 4.9,
                reviews: 210,
                badge: 'Spécial Pompes',
                img: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80',
                desc: 'Soulage les poignets et augmente l\'amplitude de descente pour un pectoral complet.'
            },
            {
                id: 'fit-bands-set',
                name: 'Pack 5 Élastiques Résistance Aji Band',
                category: 'fitness',
                price: 24.90,
                oldPrice: 34.90,
                rating: 4.8,
                reviews: 340,
                badge: 'Polyvalent',
                img: 'https://images.unsplash.com/photo-1598971639058-fab3c3109a71?w=400&q=80',
                desc: '5 niveaux de résistance (4.5kg à 32kg) pour squats, pompes et mobilité.'
            },
            {
                id: 'fit-adjustable-dumbbells',
                name: 'Haltère Réglable Aji Iron 2.5 à 24kg',
                category: 'fitness',
                price: 149.00,
                oldPrice: 189.00,
                rating: 4.9,
                reviews: 115,
                badge: 'Best-Seller',
                img: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80',
                desc: 'Molette de sélection instantanée remplaçant 15 paires d\'haltères traditionnels.'
            },
            {
                id: 'fit-mat-pro',
                name: 'Tapis de Sol Aji Mat 15mm Haute Densité',
                category: 'fitness',
                price: 29.90,
                rating: 4.7,
                reviews: 88,
                img: 'https://images.unsplash.com/photo-1575052814086-f385e2e2ad1b?w=400&q=80',
                badge: 'Confort',
                desc: 'Amorti articulaire supérieur, surface texturée antidérapante et sangle de transport.'
            },

            // --- NUTRITION & ÉNERGIE ---
            {
                id: 'nutri-whey-isolate',
                name: 'Whey Isolate Aji Protein 90% Choco 2kg',
                category: 'nutrition',
                price: 49.99,
                oldPrice: 62.00,
                rating: 4.9,
                reviews: 420,
                badge: 'Pure Protéine',
                img: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=400&q=80',
                desc: '27g de protéines pures par portion, sans sucre ajouté, digestion ultra-rapide.'
            },
            {
                id: 'nutri-creatine',
                name: 'Créatine Monohydrate Aji Power 500g',
                category: 'nutrition',
                price: 24.99,
                rating: 5.0,
                reviews: 312,
                badge: 'Puissance',
                img: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&q=80',
                desc: 'Augmente la force explosive et accélère la récupération musculaire.'
            },
            {
                id: 'nutri-shaker-steel',
                name: 'Shaker Inox Aji Shake 750ml Antifuite',
                category: 'nutrition',
                price: 18.50,
                rating: 4.8,
                reviews: 140,
                badge: 'Sans Odeur',
                img: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=400&q=80',
                desc: 'Garde les boissons froides pendant 24h, grille de mélange intégrée.'
            },

            // --- RÉCUPÉRATION & ACCESSOIRES ---
            {
                id: 'recov-massage-gun',
                name: 'Pistolet Massage Aji Pulse Pro 3200RPM',
                category: 'recovery',
                price: 79.90,
                oldPrice: 119.00,
                rating: 4.9,
                reviews: 198,
                badge: 'Récupération',
                img: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&q=80',
                desc: '6 têtes interchangeables, moteur silencieux 3200 RPM, soulage les courbatures.'
            },
            {
                id: 'recov-foam-roller',
                name: 'Rouleau Massage Aji Roll Trigger Point 3D',
                category: 'recovery',
                price: 19.90,
                rating: 4.7,
                reviews: 92,
                badge: 'Mobilité',
                img: 'https://images.unsplash.com/photo-1517963879433-6ad2b056d712?w=400&q=80',
                desc: 'Libération myofasciale des quadriceps, fessiers et dos après l\'entraînement.'
            },
            {
                id: 'recov-speed-rope',
                name: 'Corde à Sauter Aji Speed Roulements Métal',
                category: 'recovery',
                price: 15.90,
                rating: 4.9,
                reviews: 280,
                badge: 'Cardio Boxe',
                img: 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=400&q=80',
                desc: 'Câble acier réglable et rotation 360° fluide pour doubles sauts et échauffements.'
            }
        ];

        this.cart = [];
        this.activeFilter = 'all';
        this.searchQuery = '';
    }

    init() {
        this.loadCart();
        this.bindEvents();
        this.renderProducts();
        this.updateCartBadge();
    }

    loadCart() {
        try {
            const saved = localStorage.getItem('apexfit_shop_cart');
            if (saved) {
                this.cart = JSON.parse(saved);
            }
        } catch (e) {
            console.warn("Erreur chargement panier:", e);
        }
    }

    saveCart() {
        try {
            localStorage.setItem('apexfit_shop_cart', JSON.stringify(this.cart));
            this.updateCartBadge();
        } catch (e) {
            console.warn("Erreur sauvegarde panier:", e);
        }
    }

    bindEvents() {
        // Filter pills
        document.querySelectorAll('[data-shop-filter]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('[data-shop-filter]').forEach(b => {
                    b.classList.remove('bg-cyan-500', 'text-black', 'font-black');
                    b.classList.add('bg-slate-800/80', 'text-slate-300');
                });
                btn.classList.add('bg-cyan-500', 'text-black', 'font-black');
                btn.classList.remove('bg-slate-800/80', 'text-slate-300');

                this.activeFilter = btn.getAttribute('data-shop-filter');
                this.renderProducts();
            });
        });

        // Search bar
        const searchInput = document.getElementById('shop-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.toLowerCase().trim();
                this.renderProducts();
            });
        }

        // Cart drawer open/close
        const openCartBtns = document.querySelectorAll('.open-cart-btn');
        openCartBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.renderCartDrawer();
                document.getElementById('cart-drawer')?.classList.remove('translate-x-full');
                document.getElementById('cart-backdrop')?.classList.remove('hidden');
            });
        });

        const closeCartBtn = document.getElementById('close-cart-btn');
        if (closeCartBtn) {
            closeCartBtn.addEventListener('click', () => this.closeCart());
        }

        const backdrop = document.getElementById('cart-backdrop');
        if (backdrop) {
            backdrop.addEventListener('click', () => this.closeCart());
        }

        // Checkout button
        const checkoutBtn = document.getElementById('checkout-cart-btn');
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', () => this.handleCheckout());
        }
    }

    closeCart() {
        document.getElementById('cart-drawer')?.classList.add('translate-x-full');
        document.getElementById('cart-backdrop')?.classList.add('hidden');
    }

    addToCart(productId) {
        const prod = this.products.find(p => p.id === productId);
        if (!prod) return;

        const existing = this.cart.find(item => item.id === productId);
        if (existing) {
            existing.qty++;
        } else {
            this.cart.push({ id: productId, qty: 1 });
        }

        this.saveCart();
        window.soundEngine.playCash ? window.soundEngine.playCash() : window.soundEngine.playRepCount(1);
        window.coachVoice.speak(`${prod.name} ajouté au panier !`, false);

        // Flash toast notification
        this.showToast(`✅ "${prod.name}" ajouté au panier !`);
    }

    changeQuantity(productId, delta) {
        const item = this.cart.find(i => i.id === productId);
        if (!item) return;

        item.qty += delta;
        if (item.qty <= 0) {
            this.cart = this.cart.filter(i => i.id !== productId);
        }

        this.saveCart();
        this.renderCartDrawer();
    }

    removeFromCart(productId) {
        this.cart = this.cart.filter(i => i.id !== productId);
        this.saveCart();
        this.renderCartDrawer();
    }

    getCartTotal() {
        return this.cart.reduce((total, item) => {
            const prod = this.products.find(p => p.id === item.id);
            return total + (prod ? prod.price * item.qty : 0);
        }, 0);
    }

    getCartCount() {
        return this.cart.reduce((sum, item) => sum + item.qty, 0);
    }

    updateCartBadge() {
        const count = this.getCartCount();
        document.querySelectorAll('.cart-count-badge').forEach(el => {
            el.textContent = count;
            if (count > 0) {
                el.classList.remove('hidden');
            } else {
                el.classList.add('hidden');
            }
        });
    }

    renderProducts() {
        const container = document.getElementById('shop-products-grid');
        if (!container) return;

        let filtered = this.products;
        if (this.activeFilter !== 'all') {
            filtered = filtered.filter(p => p.category === this.activeFilter);
        }

        if (this.searchQuery) {
            filtered = filtered.filter(p =>
                p.name.toLowerCase().includes(this.searchQuery) ||
                p.desc.toLowerCase().includes(this.searchQuery)
            );
        }

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="col-span-full py-16 text-center rounded-2xl bg-slate-800/30 border border-slate-700/40">
                    <span class="text-4xl block mb-2">🔍</span>
                    <h4 class="text-white font-bold text-lg">Aucun produit ne correspond à votre recherche</h4>
                    <p class="text-slate-400 text-sm mt-1">Essayez un autre mot-clé ou sélectionnez une autre catégorie.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filtered.map(p => `
            <div class="glass-card rounded-2xl overflow-hidden border border-slate-800 hover:border-cyan-500/40 transition duration-300 flex flex-col justify-between group">
                <!-- Product Image -->
                <div class="relative w-full h-44 overflow-hidden bg-slate-900">
                    <img
                        src="${p.img}"
                        alt="${p.name}"
                        class="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                        loading="lazy"
                        onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                    >
                    <div style="display:none" class="absolute inset-0 bg-slate-800 items-center justify-center text-5xl">
                        ${p.icon || '🏋️'}
                    </div>
                    <!-- Brand watermark -->
                    <div class="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-lg flex items-center gap-1">
                        <span class="text-[9px] font-black text-cyan-400 uppercase tracking-wider">Aji</span>
                        <span class="text-[9px] font-black text-white uppercase tracking-wider">Fit</span>
                    </div>
                    <!-- Badge -->
                    <div class="absolute top-2 right-2">
                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/80 text-black backdrop-blur-sm">
                            ${p.badge}
                        </span>
                    </div>
                    ${p.oldPrice ? `<div class="absolute top-2 left-2"><span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-500 text-white">-${Math.round((1-(p.price/p.oldPrice))*100)}%</span></div>` : ''}
                </div>

                <div class="p-4 flex flex-col flex-1">
                    <!-- Rating -->
                    <div class="flex items-center gap-1 text-xs text-amber-400 font-bold mb-2">
                        <span>★★★★★</span>
                        <span class="text-slate-300">${p.rating}</span>
                        <span class="text-slate-500 text-[10px]">(${p.reviews} avis)</span>
                    </div>

                    <!-- Title & Description -->
                    <h4 class="font-bold text-white text-sm leading-snug mb-1 group-hover:text-cyan-300 transition">
                        ${p.name}
                    </h4>
                    <p class="text-slate-400 text-xs leading-relaxed mb-3 line-clamp-2 flex-1">
                        ${p.desc}
                    </p>

                    <!-- Price & Add Button -->
                    <div class="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                        <div>
                            <div class="flex items-baseline gap-1.5">
                                <span class="text-xl font-black text-white font-teko">${p.price.toFixed(2)} €</span>
                                ${p.oldPrice ? `<span class="text-xs text-slate-500 line-through">${p.oldPrice.toFixed(2)} €</span>` : ''}
                            </div>
                            <span class="text-[10px] text-emerald-400 font-semibold">🚚 Expédition 24h</span>
                        </div>

                        <button onclick="window.sportShop.addToCart('${p.id}')" class="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs tracking-wide shadow-lg shadow-cyan-500/20 active:scale-95 transition flex items-center gap-1.5 whitespace-nowrap">
                            🛒 Ajouter
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderCartDrawer() {
        const container = document.getElementById('cart-items-container');
        const totalEl = document.getElementById('cart-drawer-total');
        if (!container) return;

        const total = this.getCartTotal();
        if (totalEl) totalEl.textContent = `${total.toFixed(2)} €`;

        if (this.cart.length === 0) {
            container.innerHTML = `
                <div class="py-20 text-center">
                    <span class="text-5xl block mb-3">🛒</span>
                    <h5 class="text-white font-bold text-base">Votre panier est vide</h5>
                    <p class="text-slate-400 text-xs mt-1 max-w-xs mx-auto">Parcourez nos équipements de boxe, musculation et nutrition pour vous équiper !</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.cart.map(item => {
            const prod = this.products.find(p => p.id === item.id);
            if (!prod) return '';

            const itemSubtotal = (prod.price * item.qty).toFixed(2);

            return `
                <div class="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                    <div class="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center text-2xl flex-shrink-0">
                        ${prod.icon}
                    </div>
                    <div class="flex-1 min-w-0">
                        <h6 class="text-xs font-bold text-white truncate">${prod.name}</h6>
                        <span class="text-xs text-cyan-400 font-bold">${prod.price.toFixed(2)} € /u</span>
                    </div>
                    <!-- Quantity controls -->
                    <div class="flex items-center gap-2">
                        <button onclick="window.sportShop.changeQuantity('${item.id}', -1)" class="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center">
                            -
                        </button>
                        <span class="text-xs font-bold text-white">${item.qty}</span>
                        <button onclick="window.sportShop.changeQuantity('${item.id}', 1)" class="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center">
                            +
                        </button>
                    </div>
                    <div class="text-right">
                        <span class="text-sm font-black text-white block">${itemSubtotal} €</span>
                        <button onclick="window.sportShop.removeFromCart('${item.id}')" class="text-[10px] text-red-400 hover:underline">
                            Supprimer
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    handleCheckout() {
        if (this.cart.length === 0) {
            alert("Votre panier est vide !");
            return;
        }

        const total = this.getCartTotal().toFixed(2);
        const count = this.getCartCount();

        // Celebration
        window.soundEngine.playRecordFanfare ? window.soundEngine.playRecordFanfare() : window.soundEngine.playBell();
        window.coachVoice.speak(`Commande validée pour ${total} euros ! Vos équipements sportifs arrivent bientôt !`, true);

        // Reset cart
        this.cart = [];
        this.saveCart();
        this.closeCart();

        // Show confirmation alert
        alert(`🎉 Félicitations ! Votre commande de ${count} article(s) d'un montant de ${total} € a été validée avec succès !\n\nExpédition sous 24h avec numéro de suivi.`);
    }

    showToast(message) {
        let toast = document.getElementById('shop-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'shop-toast';
            toast.className = 'fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-slate-900 border border-cyan-500/60 shadow-2xl text-white font-bold text-sm tracking-wide transition-all duration-200 pointer-events-none opacity-0';
            document.body.appendChild(toast);
        }

        toast.textContent = message;
        toast.style.opacity = '1';
        toast.style.transform = 'translate(-50%, -8px)';
        clearTimeout(toast.timer);
        toast.timer = setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translate(-50%, 0)';
        }, 2200);
    }
}

window.sportShop = new SportShop();
