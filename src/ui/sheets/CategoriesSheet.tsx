import { useState } from 'preact/hooks';
import type { Category } from '../../domain/types';
import { newId, saveCategory } from '../../data/store';
import { Notice, Sheet } from '../components';
import { useUI } from '../context';
import { Icon } from '../icons';
import { normalize, plural } from '../text';

function byOrder(a: Category, b: Category): number {
  return a.order - b.order;
}

/** Campo de nome com botão salvar (usado para criar e para renomear). */
function NameForm({ initial, placeholder, action, onSubmit }: { initial: string; placeholder: string; action: string; onSubmit(name: string): Promise<boolean> }) {
  const [value, setValue] = useState(initial);
  const trimmed = value.trim();
  const submit = async () => {
    if (!trimmed || trimmed === initial) return;
    if (await onSubmit(trimmed)) setValue(initial);
  };
  return (
    <form
      class="inline-form"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <input
        class="input"
        type="text"
        maxLength={30}
        placeholder={placeholder}
        aria-label={placeholder}
        value={value}
        onInput={(e) => setValue(e.currentTarget.value)}
      />
      <button type="submit" class="btn btn-dark" disabled={!trimmed || trimmed === initial}>
        {action}
      </button>
    </form>
  );
}

export function CategoriesSheet() {
  const ui = useUI();
  const all = ui.data.categories;
  const main = all.filter((c) => c.parentId === null).sort(byOrder);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);

  const siblingsOf = (parentId: string | null) => all.filter((c) => c.parentId === parentId);

  const nameTaken = (name: string, parentId: string | null, exceptId?: string) =>
    siblingsOf(parentId).some((c) => c.id !== exceptId && normalize(c.name) === normalize(name));

  const add = async (name: string, parentId: string | null): Promise<boolean> => {
    if (nameTaken(name, parentId)) {
      ui.toast('Já existe uma categoria com esse nome.');
      return false;
    }
    const order = Math.max(0, ...siblingsOf(parentId).map((c) => c.order)) + 1;
    const parent = parentId ? all.find((c) => c.id === parentId) : undefined;
    await saveCategory({ id: newId(), name, icon: parent?.icon ?? 'tag', parentId, hidden: false, order });
    ui.toast(parentId ? 'Subcategoria adicionada.' : 'Categoria adicionada.');
    return true;
  };

  const rename = async (category: Category, name: string): Promise<boolean> => {
    if (nameTaken(name, category.parentId, category.id)) {
      ui.toast('Já existe uma categoria com esse nome.');
      return false;
    }
    await saveCategory({ ...category, name });
    setRenaming(null);
    ui.toast('Nome atualizado.');
    return true;
  };

  const toggleHidden = async (category: Category) => {
    await saveCategory({ ...category, hidden: !category.hidden });
  };

  return (
    <Sheet title="Categorias" onClose={ui.close}>
      <Notice>
        Categorias ocultas somem do formulário de despesa, mas os lançamentos antigos continuam nos resumos. Toque em
        uma categoria para renomear ou gerenciar subcategorias.
      </Notice>

      <section class="panel" style={{ marginTop: '12px', paddingTop: '4px', paddingBottom: '4px' }}>
        <ul class="list">
          {main.map((c) => {
            const subs = siblingsOf(c.id).sort(byOrder);
            const open = expanded === c.id;
            return (
              <li key={c.id}>
                <div class={c.hidden ? 'cat-row hidden' : 'cat-row'}>
                  <span class="cat-icon">
                    <Icon name={c.icon} size={20} />
                  </span>
                  <button
                    type="button"
                    class="row-link grow"
                    style={{ minHeight: '44px', padding: 0 }}
                    aria-expanded={open}
                    onClick={() => {
                      setExpanded(open ? null : c.id);
                      setRenaming(null);
                    }}
                  >
                    <span class="grow">
                      <span class="name" style={{ display: 'block' }}>
                        {c.name}
                      </span>
                      <span class="method-sub">
                        {c.hidden ? 'Oculta' : subs.length > 0 ? plural(subs.length, 'subcategoria', 'subcategorias') : 'Sem subcategorias'}
                      </span>
                    </span>
                    <Icon name="chevronDown" size={18} />
                  </button>
                  <button
                    type="button"
                    class="icon-btn"
                    aria-label={c.hidden ? `Mostrar ${c.name}` : `Ocultar ${c.name}`}
                    aria-pressed={c.hidden}
                    onClick={() => toggleHidden(c)}
                  >
                    <Icon name={c.hidden ? 'eyeOff' : 'eye'} size={20} />
                  </button>
                </div>
                {open && (
                  <div class="cat-expand">
                    <div class="field-label">Nome da categoria</div>
                    <NameForm initial={c.name} placeholder="Nome da categoria" action="Salvar" onSubmit={(n) => rename(c, n)} />

                    <div class="field-label" style={{ marginTop: '16px' }}>
                      Subcategorias
                    </div>
                    {subs.map((s) => (
                      <div key={s.id}>
                        <div class={s.hidden ? 'sub-row hidden' : 'sub-row'}>
                          <span class="name">{s.name}</span>
                          <button
                            type="button"
                            class="icon-btn"
                            aria-label={`Renomear ${s.name}`}
                            onClick={() => setRenaming(renaming === s.id ? null : s.id)}
                          >
                            <Icon name="edit" size={18} />
                          </button>
                          <button
                            type="button"
                            class="icon-btn"
                            aria-label={s.hidden ? `Mostrar ${s.name}` : `Ocultar ${s.name}`}
                            aria-pressed={s.hidden}
                            onClick={() => toggleHidden(s)}
                          >
                            <Icon name={s.hidden ? 'eyeOff' : 'eye'} size={18} />
                          </button>
                        </div>
                        {renaming === s.id && (
                          <NameForm initial={s.name} placeholder="Novo nome" action="Salvar" onSubmit={(n) => rename(s, n)} />
                        )}
                      </div>
                    ))}
                    <NameForm initial="" placeholder="Nova subcategoria" action="Adicionar" onSubmit={(n) => add(n, c.id)} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <h3 class="section-title">Nova categoria</h3>
      <div class="form-card">
        <NameForm initial="" placeholder="Nome da categoria" action="Adicionar" onSubmit={(n) => add(n, null)} />
      </div>
    </Sheet>
  );
}
