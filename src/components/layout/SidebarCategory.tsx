import { useState, useEffect, useCallback, Suspense } from "react";
import { Link, useLocation, useSearchParams, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Library,
  Star,
  Folder,
  Plus,
  Edit2,
  Trash2,
  Workflow,
  ChevronDown,
  ChevronRight,
  Briefcase,
} from "lucide-react";
import { CategoryItem, fetchCategories } from "@/services/categories/categoryService";
import {
  SubcategoryItem,
  fetchSubcategories,
} from "@/services/categories/subcategoryService";
import { CategoryModal } from "@/components/categories/CategoryModal";
import { SubcategoryModal } from "@/components/categories/SubcategoryModal";
import { DeleteSubcategoryModal } from "@/components/categories/DeleteSubcategoryModal";

interface SidebarCategoryProps {
  onNavigate?: () => void;
}

function SidebarCategoryContent({ onNavigate }: SidebarCategoryProps) {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeCategory = searchParams.get("category") || "";
  const activeSubcategory = searchParams.get("subcategory") || "";
  const activeSubcategoryId = searchParams.get("subcategoryId") || "";
  const isFavorites = searchParams.get("favorite") === "true";

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [subcategories, setSubcategories] = useState<SubcategoryItem[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  // Category Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<CategoryItem | null>(null);

  // Subcategory Modal State
  const [isSubcatModalOpen, setIsSubcatModalOpen] = useState(false);
  const [subcatParentCategory, setSubcatParentCategory] = useState<CategoryItem | null>(null);
  const [subcategoryToEdit, setSubcategoryToEdit] = useState<SubcategoryItem | null>(null);

  // Delete Subcategory Modal State
  const [isDeleteSubcatModalOpen, setIsDeleteSubcatModalOpen] = useState(false);
  const [subcategoryToDelete, setSubcategoryToDelete] = useState<SubcategoryItem | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [cats, subcats] = await Promise.all([fetchCategories(), fetchSubcategories()]);
      setCategories(cats);
      setSubcategories(subcats);
    } catch (err) {
      console.error("Failed to load categories or subcategories:", err);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Keep active category expanded if actively filtering by a subcategory
  useEffect(() => {
    if (activeCategory && (activeSubcategory || activeSubcategoryId)) {
      const matched = categories.find(
        (c) => c.name.toLowerCase() === activeCategory.toLowerCase()
      );
      if (matched) {
        setExpandedCategories((prev) => ({ ...prev, [matched.id]: true }));
      }
    }
  }, [activeCategory, activeSubcategory, activeSubcategoryId, categories]);

  const toggleExpand = (catId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  const handleOpenCreateCategoryModal = () => {
    setCategoryToEdit(null);
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategoryModal = (cat: CategoryItem, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCategoryToEdit(cat);
    setIsCategoryModalOpen(true);
  };

  const handleCategorySaved = (savedCat: CategoryItem) => {
    loadData();
    if (categoryToEdit && activeCategory === categoryToEdit.name) {
      navigate(`/prompts?category=${encodeURIComponent(savedCat.name)}`);
    }
  };

  const handleOpenCreateSubcatModal = (cat: CategoryItem, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSubcatParentCategory(cat);
    setSubcategoryToEdit(null);
    setExpandedCategories((prev) => ({ ...prev, [cat.id]: true }));
    setIsSubcatModalOpen(true);
  };

  const handleOpenEditSubcatModal = (
    cat: CategoryItem,
    subcat: SubcategoryItem,
    e: React.MouseEvent
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setSubcatParentCategory(cat);
    setSubcategoryToEdit(subcat);
    setIsSubcatModalOpen(true);
  };

  const handleOpenDeleteSubcatModal = (subcat: SubcategoryItem, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSubcategoryToDelete(subcat);
    setIsDeleteSubcatModalOpen(true);
  };

  const handleSubcategorySaved = () => {
    loadData();
  };

  const handleSubcategoryDeleted = () => {
    loadData();
    if (
      (subcategoryToDelete && activeSubcategoryId === subcategoryToDelete.id) ||
      (subcategoryToDelete && activeSubcategory === subcategoryToDelete.name)
    ) {
      navigate(`/prompts?category=${encodeURIComponent(activeCategory)}`);
    }
  };

  return (
    <div className="flex flex-col gap-3 py-0.5 px-0.5 text-left">
      {/* 1. CORE NAVIGATION */}
      <div className="space-y-0.5">
        <Link
          to="/prompts"
          onClick={onNavigate}
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
            pathname === "/prompts" && !isFavorites && !activeCategory
              ? "bg-primary text-primary-foreground font-bold shadow-2xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Library className="h-3.5 w-3.5" />
          <span>My Library</span>
        </Link>
        <Link
          to="/workflows"
          onClick={onNavigate}
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
            pathname.startsWith("/workflows")
              ? "bg-primary text-primary-foreground font-bold shadow-2xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Workflow className="h-3.5 w-3.5" />
          <span className="flex-1">Workflows</span>
          <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-background/20 font-bold">
            Chains
          </span>
        </Link>
        <Link
          to="/projects"
          onClick={onNavigate}
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
            pathname.startsWith("/projects")
              ? "bg-primary text-primary-foreground font-bold shadow-2xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Briefcase className="h-3.5 w-3.5" />
          <span className="flex-1">Projects</span>
        </Link>
        <Link
          to="/prompts?favorite=true"
          onClick={onNavigate}
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
            isFavorites
              ? "bg-accent/20 text-accent font-bold"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Star className="h-3.5 w-3.5 text-accent fill-accent/20" />
          <span>Favorites</span>
        </Link>
      </div>

      {/* 3. CATEGORIES & SUBCATEGORIES TREE */}
      <div className="space-y-1.5">
        {/* Header */}
        <div className="flex items-center justify-between px-2">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Categories
          </span>
        </div>

        {/* + New Category Button */}
        <button
          onClick={handleOpenCreateCategoryModal}
          className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary font-bold text-xs transition-all shadow-2xs cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Category</span>
        </button>

        {/* Categories Tree */}
        <div className="space-y-0.5">
          {/* All Prompts Filter */}
          <Link
            to="/prompts"
            onClick={onNavigate}
            className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-colors ${
              pathname === "/prompts" && !activeCategory && !isFavorites
                ? "bg-secondary text-foreground font-bold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <div className="flex items-center gap-2">
              <Folder className="h-3.5 w-3.5 text-muted-foreground/70" />
              <span>All Prompts</span>
            </div>
          </Link>

          {/* Dynamic Category Items */}
          {categories.map((cat) => {
            const isCatActive = activeCategory === cat.name && !activeSubcategory && !activeSubcategoryId;
            const catSubcats = subcategories.filter((s) => s.category_id === cat.id);
            const isHovered = hoveredCategory === cat.id;
            const isExplicitlyExpanded = Boolean(expandedCategories[cat.id]);
            const isExpanded = catSubcats.length > 0 && (isHovered || isExplicitlyExpanded);
            const targetUrl = `/prompts?category=${encodeURIComponent(cat.name)}`;

            return (
              <div
                key={cat.id}
                onMouseEnter={() => {
                  if (catSubcats.length > 0) setHoveredCategory(cat.id);
                }}
                onMouseLeave={() => {
                  setHoveredCategory(null);
                }}
                className="space-y-0.5"
              >
                {/* Category Main Row */}
                <div className="group relative flex items-center">
                  <Link
                    to={targetUrl}
                    onClick={onNavigate}
                    className={`flex-1 flex items-center justify-between pl-3 pr-16 py-1.5 rounded-lg text-xs transition-colors ${
                      isCatActive
                        ? "bg-secondary text-foreground font-bold"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Folder className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                      <span className="truncate">{cat.name}</span>
                    </div>
                  </Link>

                  {/* Right side controls: Actions (+, Edit) and Chevron */}
                  <div className="absolute right-1.5 flex items-center gap-0.5">
                    {/* Hover Quick Actions */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => handleOpenCreateSubcatModal(cat, e)}
                        title="Add subcategory"
                        className="p-1 text-muted-foreground hover:!text-primary hover:bg-background/80 rounded transition-all cursor-pointer"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleOpenEditCategoryModal(cat, e)}
                        title="Rename category"
                        className="p-1 text-muted-foreground hover:!text-foreground hover:bg-background/80 rounded transition-all cursor-pointer"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                    </div>

                    {/* Right-aligned Chevron indicator (only when category has subcategories) */}
                    {catSubcats.length > 0 && (
                      <button
                        type="button"
                        onClick={(e) => toggleExpand(cat.id, e)}
                        className="p-1 text-muted-foreground/60 hover:text-foreground rounded transition-colors cursor-pointer shrink-0"
                        title={isExpanded ? "Collapse subcategories" : "Expand subcategories"}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Subcategories Children Tree (Only rendered when category actually has subcategories) */}
                {isExpanded && catSubcats.length > 0 && (
                  <div className="pl-6 space-y-0.5 border-l border-border/40 ml-4 my-0.5 animate-in fade-in duration-150">
                    {catSubcats.map((subcat) => {
                      const isSubcatActive =
                        activeCategory === cat.name &&
                        (activeSubcategory === subcat.name || activeSubcategoryId === subcat.id);
                      const subcatUrl = `/prompts?category=${encodeURIComponent(cat.name)}&subcategoryId=${encodeURIComponent(subcat.id)}`;

                      return (
                        <div key={subcat.id} className="group/sub relative flex items-center">
                          <Link
                            to={subcatUrl}
                            onClick={onNavigate}
                            className={`flex-1 flex items-center justify-between px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors pr-12 ${
                              isSubcatActive
                                ? "bg-primary/15 text-primary font-bold shadow-2xs"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                            }`}
                          >
                            <span className="truncate">{subcat.name}</span>
                          </Link>

                          {/* Subcategory Edit & Delete Buttons */}
                          <div className="absolute right-1 flex items-center gap-0.5 opacity-0 group-hover/sub:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={(e) => handleOpenEditSubcatModal(cat, subcat, e)}
                              title="Edit subcategory"
                              className="p-1 text-muted-foreground hover:!text-foreground hover:bg-background rounded transition-colors cursor-pointer"
                            >
                              <Edit2 className="h-2.5 w-2.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleOpenDeleteSubcatModal(subcat, e)}
                              title="Delete subcategory"
                              className="p-1 text-muted-foreground hover:!text-destructive hover:bg-background rounded transition-colors cursor-pointer"
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Category Create/Edit Modal */}
      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSuccess={handleCategorySaved}
        categoryToEdit={categoryToEdit}
      />

      {/* Subcategory Create/Edit Modal */}
      {subcatParentCategory && (
        <SubcategoryModal
          isOpen={isSubcatModalOpen}
          onClose={() => setIsSubcatModalOpen(false)}
          onSuccess={handleSubcategorySaved}
          parentCategory={subcatParentCategory}
          subcategoryToEdit={subcategoryToEdit}
        />
      )}

      {/* Subcategory Delete Confirmation Modal */}
      <DeleteSubcategoryModal
        isOpen={isDeleteSubcatModalOpen}
        onClose={() => setIsDeleteSubcatModalOpen(false)}
        onSuccess={handleSubcategoryDeleted}
        subcategory={subcategoryToDelete}
      />
    </div>
  );
}

export function SidebarCategory({ onNavigate }: SidebarCategoryProps) {
  return (
    <Suspense fallback={<div className="p-4 space-y-4 animate-pulse"><div className="h-6 w-3/4 bg-card rounded" /><div className="h-4 w-1/2 bg-card rounded" /></div>}>
      <SidebarCategoryContent onNavigate={onNavigate} />
    </Suspense>
  );
}
