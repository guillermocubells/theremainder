import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type CollectionSortKey =
  | "created_desc"
  | "created_asc"
  | "nickname_asc"
  | "nickname_desc"
  | "status";

interface CollectionSortSelectProps {
  value: CollectionSortKey;
  onChange: (value: CollectionSortKey) => void;
}

const SORT_OPTIONS: { value: CollectionSortKey; label: string }[] = [
  { value: "created_desc", label: "Más recientes" },
  { value: "created_asc", label: "Más antiguas" },
  { value: "nickname_asc", label: "Nombre A–Z" },
  { value: "nickname_desc", label: "Nombre Z–A" },
  { value: "status", label: "Estado" },
];

const CollectionSortSelect = ({ value, onChange }: CollectionSortSelectProps) => (
  <Select value={value} onValueChange={(v) => onChange(v as CollectionSortKey)}>
    <SelectTrigger className="w-[160px] h-9 text-sm">
      <SelectValue placeholder="Ordenar" />
    </SelectTrigger>
    <SelectContent>
      {SORT_OPTIONS.map((opt) => (
        <SelectItem key={opt.value} value={opt.value}>
          {opt.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

export default CollectionSortSelect;
