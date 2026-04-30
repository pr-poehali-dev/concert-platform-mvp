import Icon from "@/components/ui/icon";
import { Doc, Category } from "./docTypes";

interface Props {
  docs: Doc[];
  categories: Category[];
  filterCat: string;
  onFilterCat: (v: string) => void;
}

export default function DocCategoryFilter({ docs, categories, filterCat, onFilterCat }: Props) {
  return (
    <div className="flex flex-wrap gap-1 glass rounded-xl p-1 w-fit">
      <button
        onClick={() => onFilterCat("all")}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filterCat === "all" ? "bg-neon-purple text-white" : "text-white/70 hover:text-white"}`}
      >
        Все ({docs.length})
      </button>
      {categories.map(c => {
        const cnt = docs.filter(d => d.category === c.value).length;
        return (
          <button
            key={c.value}
            onClick={() => onFilterCat(c.value)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${filterCat === c.value ? "bg-neon-purple text-white" : "text-white/70 hover:text-white"}`}
          >
            <Icon name={c.icon as never} size={13} />
            {c.label}
            {cnt > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${filterCat === c.value ? "bg-white/20" : "bg-white/10"}`}>
                {cnt}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}