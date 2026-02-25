import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Leaf } from "lucide-react";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
}

interface CategoryCardsProps {
  selectedCategory: string;
  onSelectCategory: (slug: string) => void;
}

const CategoryCards = ({ selectedCategory, onSelectCategory }: CategoryCardsProps) => {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    supabase
      .from("categories")
      .select("id, name, slug, description, image_url")
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .then(({ data }) => {
        if (data) setCategories(data);
      });
  }, []);

  if (categories.length === 0) return null;

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 mb-6 scrollbar-hide">
      <button
        onClick={() => onSelectCategory("")}
        className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full border transition-colors text-sm font-medium ${
          selectedCategory === ""
            ? "bg-moss text-white border-moss"
            : "bg-card border-border text-foreground hover:border-moss/50"
        }`}
      >
        Todas
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelectCategory(cat.slug === selectedCategory ? "" : cat.slug)}
          className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full border transition-colors text-sm font-medium ${
            selectedCategory === cat.slug
              ? "bg-moss text-white border-moss"
              : "bg-card border-border text-foreground hover:border-moss/50"
          }`}
        >
          {cat.image_url ? (
            <img
              src={cat.image_url}
              alt={cat.name}
              className="h-6 w-6 rounded-full object-cover"
            />
          ) : (
            <Leaf className="h-4 w-4" />
          )}
          {cat.name}
        </button>
      ))}
    </div>
  );
};

export default CategoryCards;
