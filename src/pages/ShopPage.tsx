
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/ToastContext';
import {
  ShoppingBag, Coins, Star, Zap, Crown, Gift, Lock,
  ChevronRight, Package, Sparkles, Filter, X, Check
} from 'lucide-react';

interface ShopItem {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  rarity: string;
  xp_cost: number;
  effect_type: string;
  effect_value: any;
  stock: number | null;
  is_coming_soon?: boolean;
}

// Coming soon items (mocked, not in database yet)
const COMING_SOON_ITEMS: ShopItem[] = [
  {
    id: 'coming-soon-1',
    name: 'Pet Kurama',
    description: 'Um mascote animado que te segue no perfil',
    category: 'special',
    icon: '🦊',
    rarity: 'legendary',
    xp_cost: 5000,
    effect_type: 'mascot',
    effect_value: { mascot: 'kurama' },
    stock: null,
    is_coming_soon: true,
  },
  {
    id: 'coming-soon-2',
    name: 'Transformação Super Saiyan',
    description: 'Efeito visual especial durante duelos',
    category: 'special',
    icon: '⚡',
    rarity: 'legendary',
    xp_cost: 8000,
    effect_type: 'transformation',
    effect_value: { effect: 'ssj' },
    stock: null,
    is_coming_soon: true,
  },
  {
    id: 'coming-soon-3',
    name: 'Sharingan',
    description: 'Olho especial que dá bónus em duelos',
    category: 'special',
    icon: '👁️',
    rarity: 'epic',
    xp_cost: 3000,
    effect_type: 'ability',
    effect_value: { ability: 'sharingan' },
    stock: null,
    is_coming_soon: true,
  },
  {
    id: 'coming-soon-4',
    name: 'Bankai',
    description: 'Libertação completa do teu poder oculto',
    category: 'special',
    icon: '🗡️',
    rarity: 'epic',
    xp_cost: 4000,
    effect_type: 'ability',
    effect_value: { ability: 'bankai' },
    stock: null,
    is_coming_soon: true,
  },
];

interface InventoryItem {
  id: string;
  item_id: string;
  quantity: number;
  equipped: boolean;
  purchased_at: string;
  item: ShopItem;
}

const RARITY_COLORS: Record<string, string> = {
  common: 'from-gray-400 to-gray-500',
  rare: 'from-blue-400 to-blue-600',
  epic: 'from-purple-400 to-purple-600',
  legendary: 'from-amber-400 to-amber-600',
};

const RARITY_BG: Record<string, string> = {
  common: 'bg-gray-500/10 border-gray-500/30',
  rare: 'bg-blue-500/10 border-blue-500/30',
  epic: 'bg-purple-500/10 border-purple-500/30',
  legendary: 'bg-amber-500/10 border-amber-500/30',
};

const CATEGORY_INFO: Record<string, { label: string; icon: any }> = {
  all: { label: 'Todos', icon: ShoppingBag },
  consumable: { label: 'Consumíveis', icon: Zap },
  cosmetic: { label: 'Cosméticos', icon: Sparkles },
  boost: { label: 'Boosts', icon: Crown },
  special: { label: 'Especiais', icon: Gift },
};

export default function ShopPage() {
  const { user, profile, character } = useAuth();
  const { showToast } = useToast();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeTab, setActiveTab] = useState<'shop' | 'inventory'>('shop');
  const [showItemModal, setShowItemModal] = useState<ShopItem | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [userXP, setUserXP] = useState(0);
  const [userCoins, setUserCoins] = useState(0);

  useEffect(() => {
    loadData();
  }, [user, character]);

  async function loadData() {
    setLoading(true);
    try {
      const [itemsRes, inventoryRes, profileRes] = await Promise.all([
        supabase.from('shop_items').select('*').eq('is_active', true),
        user
          ? supabase
              .from('user_inventory')
              .select('*, item:shop_items(*)')
              .eq('user_id', user.id)
          : { data: [] },
        user
          ? supabase.from('profiles').select('total_xp, coins').eq('id', user.id).maybeSingle()
          : { data: null },
      ]);

      setItems([...(itemsRes.data || []), ...COMING_SOON_ITEMS]);
      setInventory(inventoryRes.data || []);
      if (profileRes.data) {
        setUserXP(profileRes.data.total_xp || 0);
        setUserCoins(profileRes.data.coins || 0);
      }
      // Also use character XP
      if (character) {
        setUserXP(prev => Math.max(prev, character.xp));
      }
    } catch (error) {
      console.error('Error loading shop:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handlePurchase(item: ShopItem) {
    if (!user) {
      showToast('Entra na tua conta para comprar', 'info');
      return;
    }

    if (!character) {
      showToast('Cria um personagem primeiro', 'info');
      return;
    }

    const availableXP = character.xp || 0;
    if (availableXP < item.xp_cost) {
      showToast(`Precisas de ${item.xp_cost} XP para comprar este item`, 'error');
      return;
    }

    setPurchasing(true);
    try {
      // Check if already owned
      const existing = inventory.find(i => i.item_id === item.id);
      if (existing && item.category !== 'consumable') {
        showToast('Já tens este item!', 'error');
        setPurchasing(false);
        return;
      }

      // Deduct XP from character
      const { error: xpError } = await supabase
        .from('characters')
        .update({ xp: character.xp - item.xp_cost })
        .eq('user_id', user.id);

      if (xpError) throw xpError;

      // ✅ Bug corrigido: antes inseria E atualizava para consumíveis existentes,
      //    criando linhas duplicadas no inventário.
      //    Agora: se já existe → só atualiza. Se não existe → insere.
      if (existing) {
        const { error: invError } = await supabase
          .from('user_inventory')
          .update({ quantity: existing.quantity + 1 })
          .eq('id', existing.id);
        if (invError) throw invError;
      } else {
        const { error: invError } = await supabase.from('user_inventory').insert({
          user_id: user.id,
          item_id: item.id,
          quantity: 1,
        });
        if (invError) throw invError;
      }

      showToast(`${item.name} comprado com sucesso!`, 'success');
      setShowItemModal(null);
      loadData();
    } catch (error) {
      console.error('Purchase error:', error);
      showToast('Erro ao comprar item', 'error');
    } finally {
      setPurchasing(false);
    }
  }

  async function handleEquip(inventoryItem: InventoryItem) {
    if (!user) return;

    try {
      // Unequip others of same type
      await supabase
        .from('user_inventory')
        .update({ equipped: false })
        .eq('user_id', user.id)
        .eq('equipped', true);

      // Equip this one
      await supabase
        .from('user_inventory')
        .update({ equipped: true })
        .eq('id', inventoryItem.id);

      showToast(`${inventoryItem.item.name} equipado!`, 'success');
      loadData();
    } catch {
      showToast('Erro ao equipar', 'error');
    }
  }

  const filteredItems = activeCategory === 'all'
    ? items
    : items.filter(i => i.category === activeCategory);

  const canAfford = (item: ShopItem) => {
    if (!character) return false;
    return character.xp >= item.xp_cost;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-16">
        <div className="w-14 h-14 border-2 border-border2 border-t-purple rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-bebas text-4xl text-text">Loja do Kamba</h1>
              <Sparkles className="text-amber" size={28} />
            </div>
            <p className="text-text3 text-sm">Usa o teu XP para comprar itens especiais</p>
          </div>

          {/* XP Balance */}
          <div className="flex items-center gap-4">
            <div className="bg-bg2 border border-amber/30 rounded-xl px-4 py-3 flex items-center gap-2">
              <Zap className="text-amber" size={20} />
              <div>
                <div className="text-xs text-text3">Teu XP</div>
                <div className="font-bebas text-xl text-amber">{character?.xp || 0}</div>
              </div>
            </div>
            <div className="bg-bg2 border border-purple/30 rounded-xl px-4 py-3 flex items-center gap-2">
              <Coins className="text-purple" size={20} />
              <div>
                <div className="text-xs text-text3">Moedas</div>
                <div className="font-bebas text-xl text-purple">{userCoins}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('shop')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all ${
              activeTab === 'shop'
                ? 'bg-purple text-white'
                : 'bg-bg2 text-text2 hover:text-text border border-border'
            }`}
          >
            <ShoppingBag size={18} />
            Loja
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all ${
              activeTab === 'inventory'
                ? 'bg-purple text-white'
                : 'bg-bg2 text-text2 hover:text-text border border-border'
            }`}
          >
            <Package size={18} />
            Meu Inventário ({inventory.length})
          </button>
        </div>

        {activeTab === 'shop' && (
          <>
            {/* Category Filters */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
              {Object.entries(CATEGORY_INFO).map(([key, { label, icon: Icon }]) => (
                <button
                  key={key}
                  onClick={() => setActiveCategory(key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                    activeCategory === key
                      ? 'bg-purple/20 text-purple border border-purple/30'
                      : 'bg-bg2 text-text3 hover:text-text border border-border'
                  }`}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>

            {/* Items Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredItems.map(item => (
                <div
                  key={item.id}
                  onClick={() => !item.is_coming_soon && setShowItemModal(item)}
                  className={`relative rounded-2xl p-5 cursor-pointer transition-all hover:scale-[1.02] border ${RARITY_BG[item.rarity]} ${item.is_coming_soon ? 'opacity-60' : ''}`}
                >
                  {/* Coming Soon Overlay */}
                  {item.is_coming_soon && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-2xl bg-bg/80 backdrop-blur-sm">
                      <Lock className="text-amber mb-2" size={32} />
                      <span className="text-xs font-bold text-amber uppercase tracking-wider">Brevemente</span>
                    </div>
                  )}

                  {/* Rarity glow */}
                  {item.rarity === 'legendary' && !item.is_coming_soon && (
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-amber/5 via-amber/10 to-amber/5 animate-pulse" />
                  )}

                  <div className="relative z-10">
                    {/* Icon */}
                    <div className="text-4xl mb-3">{item.icon}</div>

                    {/* Name */}
                    <h3 className="font-rajdhani font-bold text-text mb-1">{item.name}</h3>

                    {/* Rarity badge */}
                    <span className={`inline-block text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-gradient-to-r ${RARITY_COLORS[item.rarity]} text-white mb-2`}>
                      {item.rarity}
                    </span>

                    {/* Description */}
                    <p className="text-xs text-text3 mb-3 line-clamp-2">{item.description}</p>

                    {/* Price */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-amber font-semibold">
                        <Zap size={14} />
                        {item.xp_cost}
                      </div>
                      {!canAfford(item) && !item.is_coming_soon && (
                        <Lock className="text-red" size={14} />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredItems.length === 0 && (
              <div className="text-center py-12 bg-bg2 rounded-2xl border border-border">
                <ShoppingBag className="mx-auto text-text3 mb-4" size={48} />
                <p className="text-text3">Sem itens nesta categoria</p>
              </div>
            )}
          </>
        )}

        {activeTab === 'inventory' && (
          <div>
            {inventory.length === 0 ? (
              <div className="text-center py-12 bg-bg2 rounded-2xl border border-border">
                <Package className="mx-auto text-text3 mb-4" size={48} />
                <h3 className="font-rajdhani font-bold text-xl text-text mb-2">Inventário vazio</h3>
                <p className="text-text3 mb-4">Compra itens na loja para começar!</p>
                <button onClick={() => setActiveTab('shop')} className="btn btn-primary">
                  Ver Loja
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {inventory.map(invItem => (
                  <div
                    key={invItem.id}
                    className={`relative rounded-2xl p-5 border transition-all ${
                      invItem.equipped
                        ? 'bg-purple/10 border-purple/50'
                        : RARITY_BG[invItem.item?.rarity || 'common']
                    }`}
                  >
                    {/* Equipped badge */}
                    {invItem.equipped && (
                      <div className="absolute top-2 right-2 bg-purple text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        EQUIPADO
                      </div>
                    )}

                    <div className="text-3xl mb-2">{invItem.item?.icon}</div>
                    <h3 className="font-rajdhani font-bold text-text">{invItem.item?.name}</h3>
                    <p className="text-xs text-text3 mb-2">{invItem.item?.description}</p>

                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-text3">Qtd: {invItem.quantity}</span>
                      {!invItem.equipped && invItem.item?.category === 'cosmetic' && (
                        <button
                          onClick={() => handleEquip(invItem)}
                          className="btn btn-ghost text-xs py-1 px-3"
                        >
                          Equipar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Item Purchase Modal */}
        {showItemModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`bg-bg2 rounded-2xl w-full max-w-md border ${RARITY_BG[showItemModal.rarity]} overflow-hidden`}>
              {/* Header with gradient */}
              <div className={`h-2 bg-gradient-to-r ${RARITY_COLORS[showItemModal.rarity]}`} />

              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <span className="text-5xl">{showItemModal.icon}</span>
                    <div>
                      <h2 className="font-rajdhani font-bold text-xl text-text">{showItemModal.name}</h2>
                      <span className={`inline-block text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-gradient-to-r ${RARITY_COLORS[showItemModal.rarity]} text-white`}>
                        {showItemModal.rarity}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => setShowItemModal(null)} className="text-text3 hover:text-text">
                    <X size={20} />
                  </button>
                </div>

                <p className="text-text2 mb-4">{showItemModal.description}</p>

                {/* Effect info */}
                {showItemModal.effect_type && (
                  <div className="bg-bg3 rounded-xl p-4 mb-4">
                    <div className="text-xs text-text3 mb-1">Efeito</div>
                    <div className="text-sm text-text capitalize">
                      {showItemModal.effect_type.replace('_', ' ')}: {JSON.stringify(showItemModal.effect_value)}
                    </div>
                  </div>
                )}

                {/* Price and buy */}
                <div className="flex items-center justify-between bg-bg3 rounded-xl p-4">
                  <div>
                    <div className="text-xs text-text3">Preço</div>
                    <div className="flex items-center gap-2 text-amber font-bebas text-2xl">
                      <Zap size={20} />
                      {showItemModal.xp_cost} XP
                    </div>
                  </div>

                  {user && character ? (
                    canAfford(showItemModal) ? (
                      <button
                        onClick={() => handlePurchase(showItemModal)}
                        disabled={purchasing}
                        className="btn btn-primary"
                      >
                        {purchasing ? (
                          <span className="flex items-center gap-2">
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            A comprar...
                          </span>
                        ) : (
                          <>
                            <ShoppingBag size={16} />
                            Comprar
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="text-right">
                        <div className="text-xs text-red">XP insuficiente</div>
                        <div className="text-sm text-text3">
                          Tens {character.xp} XP
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="text-sm text-text3">
                      Entra para comprar
                    </div>
                  )}
                </div>

                {/* Your XP */}
                {character && (
                  <div className="text-center text-xs text-text3 mt-3">
                    Teu saldo: {character.xp} XP
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
