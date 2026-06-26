import { Lock, ShoppingBag, Sparkles } from 'lucide-react';

export default function BazarPage() {
  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          {/* Lock Icon */}
          <div className="relative mb-8">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-amber/20 via-purple/10 to-red/20 flex items-center justify-center">
              <Lock className="text-amber" size={48} />
            </div>
            <div className="absolute -top-2 -right-2 bg-amber text-bg text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              Brevemente
            </div>
          </div>

          {/* Title */}
          <h1 className="font-bebas text-4xl md:text-5xl text-text mb-4 text-center">
            Bazar dos <span className="text-amber">Kambas</span>
          </h1>

          {/* Description */}
          <div className="bg-bg2 border border-border rounded-2xl p-6 md:p-8 max-w-xl">
            <p className="text-text2 text-center leading-relaxed">
              Guerreiros e doces otomes, preparem as vossas armas e as vossas coleções!
            </p>
            <p className="text-text2 text-center leading-relaxed mt-4">
              <span className="text-purple font-semibold">Brevemente</span>, o Bazar dos Kambas estará de portas abertas.
              Este será o vosso mercado otaku exclusivo em Angola, onde poderão vender, comprar ou trocar
              os vossos mangás, action figures, cosplays e desapegos geeks diretamente com outros kambas.
            </p>
            <p className="text-text text-center font-semibold mt-4">
              Fiquem atentos, o mercado ideal está a ser forjado!
            </p>

            {/* Animated decorative elements */}
            <div className="flex justify-center gap-4 mt-8">
              <div className="flex items-center gap-2 text-text3 text-sm">
                <ShoppingBag size={16} className="text-teal" />
                <span>Mangás</span>
              </div>
              <div className="flex items-center gap-2 text-text3 text-sm">
                <Sparkles size={16} className="text-purple" />
                <span>Figures</span>
              </div>
              <div className="flex items-center gap-2 text-text3 text-sm">
                <div className="w-4 h-4 rounded bg-gradient-to-r from-red to-amber" />
                <span>Cosplays</span>
              </div>
            </div>
          </div>

          {/* Coming soon badges */}
          <div className="flex flex-wrap gap-2 justify-center mt-8">
            <span className="bg-bg3 border border-border px-3 py-1 rounded-full text-xs text-text3">
              Trocas Simples
            </span>
            <span className="bg-bg3 border border-border px-3 py-1 rounded-full text-xs text-text3">
              Pagamento Seguro
            </span>
            <span className="bg-bg3 border border-border px-3 py-1 rounded-full text-xs text-text3">
              Categorias Específicas
            </span>
            <span className="bg-bg3 border border-border px-3 py-1 rounded-full text-xs text-text3">
              Verificação de Usuários
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
