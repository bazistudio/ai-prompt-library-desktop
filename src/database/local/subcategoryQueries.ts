import { Database } from "better-sqlite3";
import { v7 as uuidv7 } from "uuid";

export interface SubcategoryItem {
  id: string;
  category_id: string;
  category_name?: string;
  name: string;
  description: string | null;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

export function validateSubcategoryName(name: string): { valid: boolean; error?: string; cleanName?: string } {
  if (!name || typeof name !== "string") {
    return { valid: false, error: "Subcategory name cannot be empty." };
  }

  const clean = name.trim();

  if (!clean) {
    return { valid: false, error: "Subcategory name cannot be empty or whitespace only." };
  }

  if (clean.length > 100) {
    return { valid: false, error: "Subcategory name is too long (maximum 100 characters)." };
  }

  return { valid: true, cleanName: clean };
}

export function getAllSubcategoriesDb(db: Database, categoryId?: string): SubcategoryItem[] {
  let stmt;
  if (categoryId) {
    stmt = db.prepare(`
      SELECT s.id, s.category_id, s.name, s.description, s.sort_order, s.created_at, s.updated_at, c.name as category_name
      FROM subcategories s
      LEFT JOIN categories c ON s.category_id = c.id
      WHERE s.category_id = ?
      ORDER BY s.sort_order ASC, s.name ASC
    `);
    return stmt.all(categoryId) as SubcategoryItem[];
  } else {
    stmt = db.prepare(`
      SELECT s.id, s.category_id, s.name, s.description, s.sort_order, s.created_at, s.updated_at, c.name as category_name
      FROM subcategories s
      LEFT JOIN categories c ON s.category_id = c.id
      ORDER BY s.sort_order ASC, s.name ASC
    `);
    return stmt.all() as SubcategoryItem[];
  }
}

export function getSubcategoryByIdDb(db: Database, id: string): SubcategoryItem | null {
  const stmt = db.prepare(`
    SELECT s.id, s.category_id, s.name, s.description, s.sort_order, s.created_at, s.updated_at, c.name as category_name
    FROM subcategories s
    LEFT JOIN categories c ON s.category_id = c.id
    WHERE s.id = ?
  `);
  const row = stmt.get(id) as SubcategoryItem | undefined;
  return row || null;
}

export function getSubcategoryByNameAndCategoryDb(db: Database, categoryId: string, name: string): SubcategoryItem | null {
  const stmt = db.prepare(`
    SELECT s.id, s.category_id, s.name, s.description, s.sort_order, s.created_at, s.updated_at, c.name as category_name
    FROM subcategories s
    LEFT JOIN categories c ON s.category_id = c.id
    WHERE s.category_id = ? AND LOWER(s.name) = LOWER(?)
  `);
  const row = stmt.get(categoryId, name.trim()) as SubcategoryItem | undefined;
  return row || null;
}

export function createSubcategoryDb(
  db: Database,
  categoryId: string,
  name: string,
  description?: string
): { success: boolean; subcategory?: SubcategoryItem; error?: string } {
  if (!categoryId || !categoryId.trim()) {
    return { success: false, error: "Parent category is required." };
  }

  const val = validateSubcategoryName(name);
  if (!val.valid || !val.cleanName) {
    return { success: false, error: val.error };
  }
  const cleanName = val.cleanName;

  const existing = getSubcategoryByNameAndCategoryDb(db, categoryId, cleanName);
  if (existing) {
    return { success: false, error: "A subcategory with this name already exists under this category." };
  }

  const now = Date.now();
  const id = `subcat_${uuidv7().replace(/-/g, "").slice(0, 12)}`;

  const maxSortStmt = db.prepare(`SELECT MAX(sort_order) as maxSort FROM subcategories WHERE category_id = ?`);
  const maxRow = maxSortStmt.get(categoryId) as { maxSort: number | null };
  const sortOrder = (maxRow?.maxSort || 0) + 1;

  const stmt = db.prepare(`
    INSERT INTO subcategories (id, category_id, name, description, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, categoryId, cleanName, description?.trim() || null, sortOrder, now, now);

  const newSubcat = getSubcategoryByIdDb(db, id);
  return { success: true, subcategory: newSubcat! };
}

export function updateSubcategoryDb(
  db: Database,
  id: string,
  name: string,
  description?: string
): { success: boolean; subcategory?: SubcategoryItem; error?: string } {
  const existing = getSubcategoryByIdDb(db, id);
  if (!existing) {
    return { success: false, error: "Subcategory not found." };
  }

  const val = validateSubcategoryName(name);
  if (!val.valid || !val.cleanName) {
    return { success: false, error: val.error };
  }
  const cleanName = val.cleanName;

  const duplicate = getSubcategoryByNameAndCategoryDb(db, existing.category_id, cleanName);
  if (duplicate && duplicate.id !== id) {
    return { success: false, error: "A subcategory with this name already exists under this category." };
  }

  const now = Date.now();
  const stmt = db.prepare(`
    UPDATE subcategories
    SET name = ?, description = ?, updated_at = ?
    WHERE id = ?
  `);
  stmt.run(cleanName, description !== undefined ? description?.trim() || null : existing.description, now, id);

  const updatedSubcat = getSubcategoryByIdDb(db, id);
  return { success: true, subcategory: updatedSubcat! };
}

export function countPromptsBySubcategoryDb(db: Database, subcategoryId: string): number {
  const stmt = db.prepare(`SELECT COUNT(*) as count FROM prompts WHERE subcategory_id = ?`);
  const row = stmt.get(subcategoryId) as { count: number };
  return row?.count || 0;
}

export function deleteSubcategoryDb(
  db: Database,
  id: string
): { success: boolean; countPromptsAffected: number; error?: string } {
  const existing = getSubcategoryByIdDb(db, id);
  if (!existing) {
    return { success: false, countPromptsAffected: 0, error: "Subcategory not found." };
  }

  const count = countPromptsBySubcategoryDb(db, id);

  // Atomic transaction: nullify prompts' subcategory_id and delete the subcategory record
  const deleteTx = db.transaction(() => {
    db.prepare(`UPDATE prompts SET subcategory_id = NULL, updated_at = ? WHERE subcategory_id = ?`).run(Date.now(), id);
    db.prepare(`DELETE FROM subcategories WHERE id = ?`).run(id);
  });

  try {
    deleteTx();
    return { success: true, countPromptsAffected: count };
  } catch (err: any) {
    return { success: false, countPromptsAffected: 0, error: err.message || "Failed to delete subcategory." };
  }
}
