import Database from "@tauri-apps/plugin-sql";

let dbInstance: Database | null = null;

export async function getTauriSQLiteDB(): Promise<Database> {
  if (dbInstance) return dbInstance;
  
  // Connect to the local SQLite database via Tauri plugin
  dbInstance = await Database.load("sqlite:prompt_library.db");
  
  // Tauri-SQL wrapper to execute schema initialization queries.
  await runTauriSchemaMigrations(dbInstance);

  return dbInstance;
}

async function runTauriSchemaMigrations(db: Database) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS system_checks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      checked_at TEXT NOT NULL,
      status TEXT NOT NULL
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS prompts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL DEFAULT 'Other',
      is_favorite INTEGER NOT NULL DEFAULT 0,
      is_archived INTEGER NOT NULL DEFAULT 0,
      current_version INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      category_id TEXT,
      subcategory_id TEXT,
      project_id TEXT DEFAULT 'proj_default',
      text_direction TEXT DEFAULT 'auto',
      language TEXT DEFAULT 'auto',
      usage_count INTEGER NOT NULL DEFAULT 0,
      last_used_at INTEGER
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS prompt_versions (
      id TEXT PRIMARY KEY,
      prompt_id TEXT NOT NULL,
      version_number INTEGER NOT NULL,
      content TEXT NOT NULL,
      change_summary TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY(prompt_id) REFERENCES prompts(id) ON DELETE CASCADE,
      UNIQUE(prompt_id, version_number)
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      color TEXT NOT NULL DEFAULT '#6366f1',
      icon TEXT NOT NULL DEFAULT 'folder',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      folder_name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS subcategories (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE CASCADE,
      UNIQUE(category_id, name)
    );
  `);
}
