    // ========= Utilities =========
    const PRIORITY_ORDER = { none: 0, low: 1, medium: 2, high: 3 };
    const formatDate = (iso) => iso ? new Date(iso + 'T00:00:00').toLocaleDateString() : 'No due date';

    // Closure-based incremental ID
    const idFactory = (() => {
      let seed = Number(localStorage.getItem('__task_id_seed__') || '0');
      return () => {
        seed += 1;
        localStorage.setItem('__task_id_seed__', String(seed));
        return seed;
      };
    })();

    // ========= State & Storage =========
    const STORAGE_KEY = 'task_manager_v1';
    const load = () => {
      try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
      catch { return []; }
    };
    const save = (tasks) => localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));

    let tasks = load();

    // ========= DOM Elements & UI State =========
    const listEl = document.getElementById('list');
    const titleInput = document.getElementById('titleInput');
    const dateInput = document.getElementById('dateInput');
    const priorityInput = document.getElementById('priorityInput');
    const addBtn = document.getElementById('addBtn');

    const chips = [...document.querySelectorAll('.chip[data-filter]')];
    const priorityFilter = document.getElementById('priorityFilter');
    const sortSelect = document.getElementById('sortSelect');
    const searchInput = document.getElementById('searchInput');
    const clearCompletedBtn = document.getElementById('clearCompletedBtn');
    const statsEl = document.getElementById('stats');

    let ui = {
      filter: 'all',          // all | active | completed
      priority: 'any',        // any | high | medium | low
      query: '',
      sort: 'created_desc',
    };

    // ========= Actions =========
    function addTask() {
      const title = titleInput.value.trim();
      if (!title) {
        titleInput.focus();
        titleInput.placeholder = 'Title required';
        return;
      }
      const due = dateInput.value || null;
      const priority = priorityInput.value;

      tasks.unshift({
        id: idFactory(),
        title, due, priority,
        completed: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      save(tasks);
      titleInput.value = '';
      dateInput.value = '';
      priorityInput.value = 'none';
      render();
    }

    function toggleDone(id) {
      const t = tasks.find(x => x.id === id);
      if (!t) return;
      t.completed = !t.completed;
      t.updatedAt = Date.now();
      save(tasks); render();
    }

    function deleteTask(id) {
      tasks = tasks.filter(x => x.id !== id);
      save(tasks); render();
    }

    function clearCompleted() {
      tasks = tasks.filter(t => !t.completed);
      save(tasks); render();
    }

    function updateTitle(id, newTitle) {
      const t = tasks.find(x => x.id === id);
      if (!t) return;
      t.title = newTitle.trim() || t.title;
      t.updatedAt = Date.now();
      save(tasks); render();
    }

    function updatePriority(id, value) {
      const t = tasks.find(x => x.id === id);
      if (!t) return;
      t.priority = value;
      t.updatedAt = Date.now();
      save(tasks); render();
    }

    function updateDue(id, value) {
      const t = tasks.find(x => x.id === id);
      if (!t) return;
      t.due = value || null;
      t.updatedAt = Date.now();
      save(tasks); render();
    }

    // ========= Rendering =========
    function render() {
      const q = ui.query.toLowerCase();

      let view = tasks.filter(t => {
        if (ui.filter === 'active' && t.completed) return false;
        if (ui.filter === 'completed' && !t.completed) return false;
        if (ui.priority !== 'any' && t.priority !== ui.priority) return false;
        if (q && !t.title.toLowerCase().includes(q)) return false;
        return true;
      });

      view.sort((a, b) => {
        const s = ui.sort;
        if (s === 'created_desc') return b.createdAt - a.createdAt;
        if (s === 'created_asc') return a.createdAt - b.createdAt;
        if (s === 'date_asc') {
          const ad = a.due ? new Date(a.due) : new Date(8640000000000000);
          const bd = b.due ? new Date(b.due) : new Date(8640000000000000);
          return ad - bd;
        }
        if (s === 'date_desc') {
          const ad = a.due ? new Date(a.due) : new Date(-8640000000000000);
          const bd = b.due ? new Date(b.due) : new Date(-8640000000000000);
          return bd - ad;
        }
        if (s === 'priority_desc') return PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
        if (s === 'priority_asc')  return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
        return 0;
      });

      // Stats
      const total = tasks.length;
      const completed = tasks.filter(t => t.completed).length;
      const active = total - completed;
      statsEl.textContent = `${total} total · ${active} active · ${completed} completed`;

      // Draw
      listEl.innerHTML = '';
      if (!view.length) {
        listEl.innerHTML = `<div class="empty">No tasks here yet. Add one above ✨</div>`;
        return;
      }

      for (const t of view) {
        const item = document.createElement('article');
        item.className = 'item' + (t.completed ? ' done' : '');
        item.setAttribute('data-id', t.id);

        // Checkbox
        const check = document.createElement('button');
        check.className = 'check' + (t.completed ? ' done' : '');
        check.setAttribute('aria-label', t.completed ? 'Mark as active' : 'Mark as completed');
        check.addEventListener('click', () => toggleDone(t.id));

        // Main content
        const content = document.createElement('div');
        content.className = 'content';

        // Title (editable)
        const title = document.createElement('div');
        title.className = 'title' + (t.completed ? ' completed' : '');
        title.textContent = t.title;
        title.title = 'Double-click to edit';
        title.addEventListener('dblclick', () => startInlineEdit(title, t));

        // Meta line
        const meta = document.createElement('div');
        meta.className = 'meta';

        const due = document.createElement('span');
        due.className = 'badge ' + (t.due ? '' : '');
        if (t.due) {
          const overdue = !t.completed && new Date(t.due) < new Date(new Date().toDateString());
          due.classList.add(overdue ? 'danger' : 'warn');
          due.textContent = overdue ? `Overdue: ${formatDate(t.due)}` : `Due: ${formatDate(t.due)}`;
        } else {
          due.textContent = 'No due date';
        }

        const pr = document.createElement('span');
        pr.className = 'badge';
        if (t.priority === 'high') pr.classList.add('danger');
        if (t.priority === 'medium') pr.classList.add('warn');
        pr.textContent = `Priority: ${t.priority}`;

        // Quick editors (selects)
        const dueEdit = document.createElement('input');
        dueEdit.type = 'date';
        dueEdit.className = 'inline-edit';
        dueEdit.value = t.due || '';
        dueEdit.title = 'Change due date';
        dueEdit.addEventListener('change', (e) => updateDue(t.id, e.target.value));

        const prEdit = document.createElement('select');
        prEdit.className = 'inline-edit';
        prEdit.innerHTML = `
          <option value="none">none</option>
          <option value="low">low</option>
          <option value="medium">medium</option>
          <option value="high">high</option>`;
        prEdit.value = t.priority;
        prEdit.title = 'Change priority';
        prEdit.addEventListener('change', (e) => updatePriority(t.id, e.target.value));

        meta.append(due, pr, dueEdit, prEdit);

        content.append(title, meta);

        // Actions
        const actions = document.createElement('div');
        actions.className = 'actions';
        const del = document.createElement('button');
        del.className = 'icon-btn danger';
        del.textContent = 'Delete';
        del.addEventListener('click', () => deleteTask(t.id));

        actions.append(del);

        item.append(check, content, actions);
        listEl.appendChild(item);
      }
    }

    function startInlineEdit(titleEl, task) {
      const input = document.createElement('input');
      input.type = 'text';
      input.value = task.title;
      input.className = 'inline-edit';
      titleEl.replaceWith(input);
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);

      const cancel = () => {
        input.replaceWith(titleEl);
      };
      const save = () => {
        updateTitle(task.id, input.value);
      };

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') save();
        if (e.key === 'Escape') cancel();
      });
      input.addEventListener('blur', cancel);
    }

    // ========= Events =========
    addBtn.addEventListener('click', addTask);
    titleInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addTask();
    });

    chips.forEach(c => c.addEventListener('click', () => {
      chips.forEach(x => { x.classList.toggle('active', x === c); x.setAttribute('aria-selected', x===c) });
      ui.filter = c.dataset.filter;
      render();
    }));

    priorityFilter.addEventListener('change', (e) => { ui.priority = e.target.value; render(); });
    sortSelect.addEventListener('change', (e) => { ui.sort = e.target.value; render(); });

    let searchTimer;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => { ui.query = e.target.value; render(); }, 150);
    });

    clearCompletedBtn.addEventListener('click', clearCompleted);

    // Seed a few demo tasks if nothing exists
    if (tasks.length === 0) {
      tasks = [
        { id: idFactory(), title: 'Review Day 3 notes', due: null, priority: 'medium', completed: false, createdAt: Date.now(), updatedAt: Date.now() },
        { id: idFactory(), title: 'Build Task Manager mini-app', due: new Date(Date.now()+86400000).toISOString().slice(0,10), priority: 'high', completed: false, createdAt: Date.now(), updatedAt: Date.now() },
        { id: idFactory(), title: 'Read about closures', due: null, priority: 'low', completed: true, createdAt: Date.now(), updatedAt: Date.now() },
      ];
      save(tasks);
    }

    // Initial render
    render();