const express = require("express");
const { Pool } = require("pg");

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || "taskmanager",
  user: process.env.DB_USER || "appuser",
  password: process.env.DB_PASSWORD
});

async function initializeDatabase() {
  // Retry briefly while PostgreSQL completes startup.
  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS tasks (
          id BIGSERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          completed BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      console.log("Database connected; tasks table is ready.");
      return;
    } catch (error) {
      console.error(`Database initialization attempt ${attempt}/10 failed: ${error.message}`);
      if (attempt === 10) throw error;
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
}

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", service: "task-manager-api", database: "connected" });
  } catch {
    res.status(503).json({ status: "error", database: "unavailable" });
  }
});

app.get("/api/tasks", async (req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT id, title, completed FROM tasks ORDER BY id ASC"
    );
    res.json(result.rows);
  } catch (error) { next(error); }
});

app.post("/api/tasks", async (req, res, next) => {
  const title = req.body.title?.trim();
  if (!title) return res.status(400).json({ error: "Task title is required" });

  try {
    const result = await pool.query(
      "INSERT INTO tasks (title) VALUES ($1) RETURNING id, title, completed",
      [title]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) { next(error); }
});

app.patch("/api/tasks/:id", async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "Invalid task ID" });
  }

  const { title, completed } = req.body;
  if (title === undefined && completed === undefined) {
    return res.status(400).json({ error: "Provide title or completed" });
  }
  if (title !== undefined && (typeof title !== "string" || !title.trim())) {
    return res.status(400).json({ error: "Title must be a non-empty string" });
  }
  if (completed !== undefined && typeof completed !== "boolean") {
    return res.status(400).json({ error: "Completed must be a boolean" });
  }

  try {
    const result = await pool.query(
      `UPDATE tasks
       SET title = COALESCE($2, title),
           completed = COALESCE($3, completed)
       WHERE id = $1
       RETURNING id, title, completed`,
      [id, title === undefined ? null : title.trim(),
       completed === undefined ? null : completed]
    );
    if (!result.rowCount) return res.status(404).json({ error: "Task not found" });
    res.json(result.rows[0]);
  } catch (error) { next(error); }
});

app.delete("/api/tasks/:id", async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "Invalid task ID" });
  }

  try {
    const result = await pool.query("DELETE FROM tasks WHERE id = $1", [id]);
    if (!result.rowCount) return res.status(404).json({ error: "Task not found" });
    res.status(204).end();
  } catch (error) { next(error); }
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: "Internal server error" });
});

initializeDatabase()
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Task Manager API listening on port ${PORT}`);
    });
  })
  .catch(error => {
    console.error("Could not initialize database:", error);
    process.exit(1);
  });

process.on("SIGTERM", async () => {
  await pool.end();
  process.exit(0);
});
