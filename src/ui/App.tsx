import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { useRegisterSW } from 'virtual:pwa-register/preact';
import { todayISO, ymOf } from '../domain/dates';
import { buildLedger } from '../domain/ledger';
import type { AppData } from '../domain/types';
import { initStore, useAppState } from '../data/store';
import { Dialog } from './components';
import { UIContext } from './context';
import type { DialogSpec, SheetSpec, Tab, UIContextValue } from './context';
import { Icon } from './icons';
import type { IconName } from './icons';
import { sortedCards } from './labels';
import { Onboarding } from './Onboarding';
import { CardsScreen } from './screens/CardsScreen';
import { CategoriesScreen } from './screens/CategoriesScreen';
import { SummaryScreen } from './screens/SummaryScreen';
import { CardEditSheet } from './sheets/CardEditSheet';
import { CategoriesSheet } from './sheets/CategoriesSheet';
import { ExpenseSheet } from './sheets/ExpenseSheet';
import { HistorySheet } from './sheets/HistorySheet';
import { IncomeSheet } from './sheets/IncomeSheet';
import { RuleSheet } from './sheets/RuleSheet';
import { SettingsSheet } from './sheets/SettingsSheet';

export function App() {
  const state = useAppState();
  useEffect(() => {
    void initStore();
  }, []);

  if (state.status === 'loading') return <div class="loading">Carregando…</div>;
  if (state.status === 'error') {
    return (
      <div class="fatal" role="alert">
        <div>
          <Icon name="alert" size={32} />
          <p style={{ marginTop: '12px' }}>{state.message}</p>
        </div>
      </div>
    );
  }
  return <Main data={state.data} />;
}

/** Camadas abertas por cima das telas principais. Cada uma ocupa uma entrada no histórico do navegador,
 *  para que o botão Voltar do Android feche o painel em vez de sair do app. */
type Layer =
  | { key: number; kind: 'sheet'; spec: SheetSpec }
  | { key: number; kind: 'dialog'; spec: DialogSpec; resolve(ok: boolean): void };

const TABS: ReadonlyArray<{ tab: Tab; label: string; icon: IconName }> = [
  { tab: 'cards', label: 'Cartões', icon: 'card' },
  { tab: 'summary', label: 'Resumo', icon: 'summary' },
  { tab: 'categories', label: 'Categorias', icon: 'bars' },
];

function Main({ data }: { data: AppData }) {
  const [tab, setTab] = useState<Tab>('cards');
  const [today, setToday] = useState(todayISO());
  const [month, setMonth] = useState(ymOf(today));
  const [selectedCardId, setSelectedCardId] = useState(sortedCards(data.cards)[0]?.id ?? '');
  const [invoiceByCard, setInvoiceByCard] = useState<Record<string, string>>({});
  const [layers, setLayers] = useState<Layer[]>([]);
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);

  const layersRef = useRef<Layer[]>([]);
  const results = useRef(new Map<number, boolean>());
  const nextKey = useRef(1);

  const ledger = useMemo(() => buildLedger(data), [data.cards, data.expenses]);

  const applyLayers = (next: Layer[]) => {
    layersRef.current = next;
    setLayers(next);
  };

  const push = (layer: Layer) => {
    const next = [...layersRef.current, layer];
    history.pushState({ depth: next.length }, '');
    applyLayers(next);
  };

  useEffect(() => {
    history.replaceState({ depth: 0 }, '');
    const onPop = (e: PopStateEvent) => {
      const depth = typeof e.state?.depth === 'number' ? (e.state.depth as number) : 0;
      const current = layersRef.current;
      if (depth >= current.length) return;
      const removed = current.slice(depth);
      applyLayers(current.slice(0, depth));
      for (const layer of removed) {
        if (layer.kind === 'dialog') {
          layer.resolve(results.current.get(layer.key) ?? false);
          results.current.delete(layer.key);
        }
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Atualiza "hoje" quando o app volta ao primeiro plano (ex.: aberto de um dia para o outro).
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') setToday(todayISO());
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('locked', layers.length > 0);
  }, [layers.length]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // Mantém a seleção válida se um cartão deixar de existir (ex.: após importar um backup).
  const cardIds = data.cards.map((c) => c.id);
  const validSelected = cardIds.includes(selectedCardId) ? selectedCardId : (sortedCards(data.cards)[0]?.id ?? '');

  const ui: UIContextValue = {
    data,
    ledger,
    today,
    tab,
    goTo(next) {
      setTab(next);
      window.scrollTo(0, 0);
    },
    month,
    setMonth,
    selectedCardId: validSelected,
    setSelectedCardId,
    invoiceByCard,
    setInvoiceFor(cardId, monthKey) {
      setInvoiceByCard((prev) => {
        const next = { ...prev };
        if (monthKey) next[cardId] = monthKey;
        else delete next[cardId];
        return next;
      });
    },
    open(spec) {
      push({ key: nextKey.current++, kind: 'sheet', spec });
    },
    close() {
      if (layersRef.current.length > 0) history.back();
    },
    confirm(spec) {
      return new Promise<boolean>((resolve) => {
        push({ key: nextKey.current++, kind: 'dialog', spec, resolve });
      });
    },
    toast(message) {
      setToast({ id: Date.now(), message });
    },
  };

  const answer = (key: number, ok: boolean) => {
    results.current.set(key, ok);
    history.back();
  };

  return (
    <UIContext.Provider value={ui}>
      {data.settings.onboardingDone ? (
        <>
          <main class="app" aria-hidden={layers.length > 0 ? 'true' : undefined}>
            {tab === 'cards' && <CardsScreen />}
            {tab === 'summary' && <SummaryScreen />}
            {tab === 'categories' && <CategoriesScreen />}
          </main>
          <nav class="bottom-nav" aria-label="Navegação principal">
            <div class="bottom-nav-inner">
              {TABS.map((t) => (
                <button
                  type="button"
                  class="nav-item"
                  aria-current={tab === t.tab ? 'page' : undefined}
                  onClick={() => ui.goTo(t.tab)}
                >
                  <span class="nav-icon">
                    <Icon name={t.icon} />
                  </span>
                  {t.label}
                </button>
              ))}
            </div>
          </nav>
        </>
      ) : (
        <Onboarding />
      )}

      {layers.map((layer) =>
        layer.kind === 'sheet' ? (
          <SheetView key={layer.key} spec={layer.spec} />
        ) : (
          <Dialog
            key={layer.key}
            spec={layer.spec}
            onConfirm={() => answer(layer.key, true)}
            onCancel={() => answer(layer.key, false)}
          />
        ),
      )}

      <div aria-live="polite" class="visually-hidden">
        {toast?.message}
      </div>
      {toast && (
        <div class="toast" key={toast.id} aria-hidden="true">
          <Icon name="check" size={20} strokeWidth={2.4} />
          <span>{toast.message}</span>
        </div>
      )}

      <UpdatePrompt />
    </UIContext.Provider>
  );
}

function SheetView({ spec }: { spec: SheetSpec }) {
  switch (spec.type) {
    case 'expense':
      return <ExpenseSheet expenseId={spec.expenseId} cardId={spec.cardId} />;
    case 'income':
      return <IncomeSheet incomeId={spec.incomeId} />;
    case 'history':
      return <HistorySheet filter={spec.filter} />;
    case 'settings':
      return <SettingsSheet />;
    case 'card':
      return <CardEditSheet cardId={spec.cardId} />;
    case 'rule':
      return <RuleSheet />;
    case 'categories':
      return <CategoriesSheet />;
  }
}

/** Avisa quando uma nova versão foi baixada e deixa o usuário escolher a hora de atualizar. */
function UpdatePrompt() {
  const registration = useRef<ServiceWorkerRegistration | undefined>(undefined);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      registration.current = reg;
    },
    onRegisterError(error) {
      console.error('Falha ao registrar o service worker', error);
    },
  });

  // Procura atualizações sempre que o app volta ao primeiro plano.
  useEffect(() => {
    const check = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) void registration.current?.update();
    };
    document.addEventListener('visibilitychange', check);
    return () => document.removeEventListener('visibilitychange', check);
  }, []);

  if (!needRefresh) return null;
  return (
    <div class="update-banner" role="status">
      <Icon name="download" size={20} />
      <span class="grow">Nova versão disponível.</span>
      <button type="button" class="btn" onClick={() => void updateServiceWorker(true)}>
        Atualizar
      </button>
      <button type="button" class="icon-btn" style={{ color: '#fff' }} aria-label="Agora não" onClick={() => setNeedRefresh(false)}>
        <Icon name="close" size={20} />
      </button>
    </div>
  );
}
