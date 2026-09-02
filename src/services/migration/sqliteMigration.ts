import { getTauriSQLiteDB } from "@/database/local/sqliteManager";
import { getStoragePath } from "@/services/storage/storageService";

const MIGRATION_FLAG = "ai_prompt_library_sqlite_migration_completed";
const APP_VERSION = "2.0.2";
const MIGRATION_VERSION = "1";

export async function runSQLiteMigration() {
  if (typeof window === "undefined") return;

  const isMigrated = localStorage.getItem(MIGRATION_FLAG);
  if (isMigrated === "true") {
    return; // Already migrated
  }

  console.log("[Migration] Starting P0.1 Durable SQLite Migration...");

  // 1. Serialize all localStorage (EXCEPT appLock credentials for security reasons)
  const backupData: Record<string, any> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    // CRITICAL: DO NOT BACKUP OR MIGRATE PLAINTEXT APP LOCK CREDENTIALS
    if (key === "appLockPasswordPlain" || key === "appLockPinPlain") {
      continue;
    }
    try {
      backupData[key] = JSON.parse(localStorage.getItem(key) || "null");
    } catch {
      backupData[key] = localStorage.getItem(key);
    }
  }

  // 2. Write Backup to Disk via Rust/Tauri Command
  const backupFileName = `migration_backup_${Date.now()}.json`;
  let storagePath = await getStoragePath();
  
  if (!storagePath) {
    try {
      const { appLocalDataDir } = await import("@tauri-apps/api/path");
      storagePath = await appLocalDataDir();
      console.log(`[Migration] No user storage path found. Using AppLocalData fallback for backup: ${storagePath}`);
    } catch (e) {
      console.error("[Migration] Failed to resolve fallback backup path.", e);
      throw new Error("Failed to resolve fallback backup path.");
    }
  }

  const backupPayload = {
    appVersion: APP_VERSION,
    migrationVersion: MIGRATION_VERSION,
    timestamp: Date.now(),
    sourceKeys: Object.keys(backupData),
    sourceRecordCounts: {
      categories: (backupData["ai_prompt_library_categories_v1"] || []).length,
      workspaces: (backupData["ai_prompt_library_workspaces_v1"] || []).length,
      prompts: (backupData["ai_prompt_library_prompts_v1"] || []).length,
      subcategories: (backupData["ai_prompt_library_subcategories_v1"] || []).length,
    },
    data: backupData
  };

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("save_migration_backup", {
      storagePath: storagePath,
      filename: backupFileName,
      content: JSON.stringify(backupPayload, null, 2)
    });
    console.log(`[Migration] Backup safely written to filesystem: ${backupFileName}`);
  } catch (err) {
    console.error("[Migration] Failed to write filesystem backup, aborting migration.", err);
    return; // Abort if we can't backup safely to the filesystem
  }

  // 3. Initialize SQLite & Begin Transaction
  let db;
  try {
    db = await getTauriSQLiteDB();
  } catch (err) {
    console.error("[Migration] Failed to initialize SQLite database.", err);
    return;
  }

  try {
    // Note: tauri-plugin-sql currently does not expose explicit beginTransaction / commit APIs
    // in its JS bindings directly (it runs each execute). We will execute raw SQL if needed,
    // or rely on a series of executes. If any fails, we throw an error.
    await db.execute("BEGIN TRANSACTION;");

    // 4. Migrate Categories
    const categories = backupData["ai_prompt_library_categories_v1"] || [];
    for (const cat of categories) {
      await db.execute(
        `INSERT OR IGNORE INTO categories (id, name, folder_name, sort_order, is_default, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [cat.id, cat.name, cat.folderName || cat.name, cat.sortOrder || 0, cat.is_default || 0, cat.created_at || Date.now(), cat.updated_at || Date.now()]
      );
    }

    // 4b. Migrate Subcategories
    const subcategories = backupData["ai_prompt_library_subcategories_v1"] || [];
    for (const subcat of subcategories) {
      await db.execute(
        `INSERT OR IGNORE INTO subcategories (id, category_id, name, description, sort_order, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [subcat.id, subcat.categoryId || subcat.category_id, subcat.name, subcat.description || null, subcat.sortOrder || 0, subcat.created_at || Date.now(), subcat.updated_at || Date.now()]
      );
    }

    // 5. Migrate Projects/Workspaces
    const workspaces = backupData["ai_prompt_library_workspaces_v1"] || [];
    for (const ws of workspaces) {
      await db.execute(
        `INSERT OR IGNORE INTO projects (id, name, description, color, icon, sort_order, is_default, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [ws.id, ws.name, ws.description || null, ws.color || '#6366f1', ws.icon || 'folder', ws.sort_order || 0, ws.is_default || 0, ws.created_at || Date.now(), ws.updated_at || Date.now()]
      );
    }

    // 6. Migrate Prompts and Versions
    const prompts = backupData["ai_prompt_library_prompts_v1"] || [];
    for (const prompt of prompts) {
      await db.execute(
        `INSERT OR IGNORE INTO prompts 
        (id, title, description, category, is_favorite, is_archived, current_version, created_at, updated_at, category_id, subcategory_id, project_id, text_direction, language, usage_count, last_used_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
        [
          prompt.id, prompt.title, prompt.description || null, prompt.category || 'Other',
          prompt.is_favorite ? 1 : 0, prompt.is_archived ? 1 : 0, prompt.current_version || 1,
          prompt.created_at || Date.now(), prompt.updated_at || Date.now(),
          prompt.category_id || null, prompt.subcategory_id || null, prompt.project_id || 'proj_default',
          prompt.text_direction || 'auto', prompt.language || 'auto',
          prompt.usage_count || 0, prompt.last_used_at || null
        ]
      );

      // Migrate prompt versions
      const versions = prompt.versions || [];
      for (const v of versions) {
        await db.execute(
          `INSERT OR IGNORE INTO prompt_versions (id, prompt_id, version_number, content, change_summary, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [v.id, prompt.id, v.version_number, v.content, v.change_summary || null, v.created_at || Date.now()]
        );
      }
    }

    // 7. Comprehensive Validation Step
    const [{ count: sqlPromptCount }] = await db.select<{count: number}[]>("SELECT COUNT(*) as count FROM prompts;");
    const [{ count: sqlCategoryCount }] = await db.select<{count: number}[]>("SELECT COUNT(*) as count FROM categories;");
    const [{ count: sqlSubcategoryCount }] = await db.select<{count: number}[]>("SELECT COUNT(*) as count FROM subcategories;");
    const [{ count: sqlProjectCount }] = await db.select<{count: number}[]>("SELECT COUNT(*) as count FROM projects;");
    
    // We only commit if ALL validations pass.
    if (sqlPromptCount < prompts.length) {
      throw new Error(`Validation failed: Expected >= ${prompts.length} prompts, got ${sqlPromptCount}`);
    }
    if (sqlCategoryCount < categories.length) {
      throw new Error(`Validation failed: Expected >= ${categories.length} categories, got ${sqlCategoryCount}`);
    }
    const expectedSubcategories = backupData["ai_prompt_library_subcategories_v1"] || [];
    if (sqlSubcategoryCount < expectedSubcategories.length) {
      throw new Error(`Validation failed: Expected >= ${expectedSubcategories.length} subcategories, got ${sqlSubcategoryCount}`);
    }
    if (sqlProjectCount < workspaces.length) {
      throw new Error(`Validation failed: Expected >= ${workspaces.length} projects, got ${sqlProjectCount}`);
    }

    // Additional deep relationship validation: Ensure versions migrated correctly
    let expectedVersionsCount = 0;
    prompts.forEach((p: any) => { expectedVersionsCount += (p.versions || []).length; });
    const [{ count: sqlVersionsCount }] = await db.select<{count: number}[]>("SELECT COUNT(*) as count FROM prompt_versions;");
    if (sqlVersionsCount < expectedVersionsCount) {
       throw new Error(`Validation failed: Expected >= ${expectedVersionsCount} prompt versions, got ${sqlVersionsCount}`);
    }

    // 8. Commit
    await db.execute("COMMIT;");
    
    // 9. Mark Completed
    localStorage.setItem(MIGRATION_FLAG, "true");
    console.log("[Migration] P0.1 Migration Completed Successfully!");
  } catch (err) {
    // 10. Rollback on failure
    console.error("[Migration] Error during migration. Rolling back.", err);
    await db.execute("ROLLBACK;");
    // Ensure localStorage is untouched. Safe retry possible.
  }
}
