const taskForm = document.querySelector("#task-form");
const taskTitle = document.querySelector("#task-title");
const taskList = document.querySelector("#task-list");
const taskCount = document.querySelector("#task-count");
const message = document.querySelector("#message");

async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Request failed: ${response.status}`);
  }
  return response.status === 204 ? null : response.json();
}

function renderTasks(tasks) {
  taskList.replaceChildren();
  taskCount.textContent = `${tasks.length} task${tasks.length === 1 ? "" : "s"}`;

  for (const task of tasks) {
    const item = document.createElement("li");
    if (task.completed) item.classList.add("completed");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.completed;
    checkbox.setAttribute("aria-label", `Mark ${task.title} complete`);
    checkbox.addEventListener("change", async () => {
      try {
        await request(`/api/tasks/${task.id}`, {
          method: "PATCH",
          body: JSON.stringify({ completed: checkbox.checked })
        });
        await loadTasks();
      } catch (error) { showMessage(error.message); }
    });

    const title = document.createElement("span");
    title.textContent = task.title;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Delete";
    remove.addEventListener("click", async () => {
      try {
        await request(`/api/tasks/${task.id}`, { method: "DELETE" });
        await loadTasks();
      } catch (error) { showMessage(error.message); }
    });

    item.append(checkbox, title, remove);
    taskList.append(item);
  }
}

function showMessage(text) { message.textContent = text; }

async function loadTasks() {
  try {
    const tasks = await request("/api/tasks");
    renderTasks(tasks);
    showMessage("");
  } catch (error) { showMessage(error.message); }
}

taskForm.addEventListener("submit", async event => {
  event.preventDefault();
  try {
    await request("/api/tasks", {
      method: "POST",
      body: JSON.stringify({ title: taskTitle.value })
    });
    taskTitle.value = "";
    await loadTasks();
  } catch (error) { showMessage(error.message); }
});

loadTasks();
