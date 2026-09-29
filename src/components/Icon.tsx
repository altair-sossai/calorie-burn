/** Ícone do Material Symbols (ligadura: o nome vira o desenho). */
export function Icon({ name, class: cls }: { name: string; class?: string }) {
  return <span class={cls ? `mi ${cls}` : 'mi'} aria-hidden="true">{name}</span>;
}
