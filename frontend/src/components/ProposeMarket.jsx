import { useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Lightbulb, Send, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';

const categories = [
  { key: 'politics', label: 'Política' },
  { key: 'sports', label: 'Deportes' },
  { key: 'crypto', label: 'Crypto' },
  { key: 'entertainment', label: 'Entretenimiento' },
  { key: 'economy', label: 'Economía' },
  { key: 'technology', label: 'Tecnología' },
  { key: 'science', label: 'Ciencia' },
  { key: 'weather', label: 'Clima' },
  { key: 'culture', label: 'Cultura' },
  { key: 'other', label: 'Otro' },
];

export default function ProposeMarket({ onClose }) {
  const { user } = useAuth();
  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('other');
  const [closesInDays, setClosesInDays] = useState(30);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!question || question.length < 10) {
      toast.error('La pregunta debe tener al menos 10 caracteres');
      return;
    }

    setLoading(true);
    try {
      const result = await api('/markets/propose', {
        method: 'POST',
        body: { question, description, category, closes_in_days: closesInDays },
      });
      toast.success(result.message);
      onClose?.();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (!user) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#161a1e] border border-[#2b3139] rounded-lg w-full max-w-lg mx-4 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2b3139]">
          <h3 className="text-lg font-bold text-[#eaecef] flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-[#00b8d4]" />
            Proponer un mercado
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#1e2329] text-[#848e9c] hover:text-[#eaecef] transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Question */}
          <div>
            <label className="block text-xs text-[#848e9c] mb-1.5">Pregunta (formato Sí/No)</label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="¿Bitcoin superará los $150,000 antes de julio 2026?"
              className="w-full bg-[#1e2329] border border-[#2b3139] rounded-lg px-4 py-2.5 text-[#eaecef] text-sm focus:outline-none focus:border-[#00b8d4]/50"
              required
              minLength={10}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-[#848e9c] mb-1.5">Descripción (criterio de resolución)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Se resuelve SÍ si BTC/USD toca $150,000 en cualquier exchange principal..."
              className="w-full bg-[#1e2329] border border-[#2b3139] rounded-lg px-4 py-2.5 text-[#eaecef] text-sm focus:outline-none focus:border-[#00b8d4]/50 h-20 resize-none"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs text-[#848e9c] mb-1.5">Categoría</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-[#1e2329] border border-[#2b3139] rounded-lg px-4 py-2.5 text-[#eaecef] text-sm focus:outline-none focus:border-[#00b8d4]/50"
            >
              {categories.map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-xs text-[#848e9c] mb-1.5">¿En cuántos días se cierra?</label>
            <div className="flex gap-2">
              {[7, 14, 30, 60, 90].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setClosesInDays(d)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                    closesInDays === d
                      ? 'bg-[#00b8d4]/10 text-[#00b8d4] border border-[#00b8d4]/30'
                      : 'bg-[#1e2329] text-[#848e9c] border border-[#2b3139] hover:bg-[#2b3139]'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || question.length < 10}
            className="w-full py-3 rounded-lg bg-[#00b8d4] text-white font-bold text-sm hover:bg-[#00d4f5] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Enviar propuesta
          </button>

          <p className="text-[10px] text-[#5e6673] text-center">
            Tu propuesta será revisada por el equipo de BetAll antes de publicarse.
          </p>
        </form>
      </div>
    </div>
  );
}
