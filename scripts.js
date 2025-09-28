// js/scripts.js
console.log("scripts.js loaded"); // Debugging

// EN: Global error trap during dev / BR: Captura global de erros no dev
window.addEventListener('error', (e) => {
  console.error('[GLOBAL ERROR]', e.message, e.filename + ':' + e.lineno);
  const fm = document.getElementById('flash-messages');
  if (fm) fm.innerHTML = `<div class="alert alert-danger" role="alert" aria-live="assertive">
    JS error: ${e.message}
  </div>`;
});

/* ===========================
   API LAYERv
   =========================== */
// EN: Unified fetch helpers -> always return {ok,status,data} / BR: Helpers unificados
async function apiRequest(method, url, body) {
  const init = { method, headers: { 'Content-Type': 'application/json' } };
  if (body !== undefined) init.body = JSON.stringify(body);
  let data = null;
  try {
    const res = await fetch(url, init);
    try { data = await res.json(); } catch (_) { data = null; }
    return { ok: res.ok, status: res.status, data };
  } catch (error) {
    return { ok: false, status: 0, data: { detail: String(error) } };
  }
}

const API = {
  get: (url) => apiRequest('GET', url),
  post: (url, body) => apiRequest('POST', url, body),
  put: (url, body) => apiRequest('PUT', url, body),
  del: (url) => apiRequest('DELETE', url),
};

/* ===========================
   FLASH / STATE
   =========================== */
// EN: Simple flash helper / BR: Helper simples de alerta
function flash(kind, msg) {
  const fm = document.getElementById('flash-messages');
  if (!fm) return;
  fm.innerHTML = `<div class="alert alert-${kind}" role="alert" aria-live="polite">${msg}</div>`;
}

// EN: In-memory caches for dropdowns / BR: Cache em memória
const DATA_CACHE = { teachers: [], departments: [], focus: [] };

/* ===========================
   ADAPTERS (normalize shapes)
   =========================== */
async function getTeachers() {
  const res = await API.get('/api/teachers');
  if (!res.ok || !Array.isArray(res.data)) return [];
  return res.data.map(t => ({
    id: t.User_ID ?? t.id ?? t.user_id,
    name: (t.User_Surname && t.User_Forename)
      ? `${t.User_Surname}, ${t.User_Forename}`
      : (t.Teacher_Surname && t.Teacher_Forename)
        ? `${t.Teacher_Surname}, ${t.Teacher_Forename}`
        : (t.name ?? `${t.User_Surname ?? ''} ${t.User_Forename ?? ''}`.trim()),
    email: t.User_Email ?? t.email ?? null,
  }));
}

async function getDepartments() {
  const res = await API.get('/api/departments');
  if (!res.ok || !Array.isArray(res.data)) return [];
  return res.data.map(d => ({ id: d.Department_ID ?? d.id, name: d.Department_Name ?? d.name }));
}

async function getFocusAreas() {
  const res = await API.get('/api/focus_areas');
  if (!res.ok || !Array.isArray(res.data)) return [];
  return res.data.map(f => ({
    id: f.Focus_ID ?? f.id ?? f.FocusArea_ID,
    name: f.Focus_Name ?? f.name ?? f.FocusArea_Name
  }));
}

async function getObservations() {
  const res = await API.get('/api/observations');
  return res.ok && Array.isArray(res.data) ? res.data : [];
}

async function updateObservation(id, body) {
  return API.put(`/api/observation/${id}`, body);
}

// EN: Backend route should trigger server-side mailer / BR: Rota no backend dispara o mailer
async function emailObservation(id) {
  return API.post(`/api/observations/${id}/email?notify=true`, {});
}

// EN: Expose helpers for console / BR: Expor auxiliares
Object.assign(window, {
  API, getTeachers, getDepartments, getFocusAreas, getObservations, updateObservation, emailObservation
});
console.log('helpers attached?', typeof window.getTeachers, typeof getTeachers);

/* ===========================
   BOOTSTRAP
   =========================== */
document.addEventListener('DOMContentLoaded', () => {
  const isNewObservationPage = window.location.pathname === '/new_observation';

  if (isNewObservationPage) {
    // EN: Preload dropdown data / BR: Pré-carregar dados
    Promise.allSettled([getTeachers(), getDepartments(), getFocusAreas()])
      .then(([tRes, dRes, fRes]) => {
        const teachers    = tRes.status === 'fulfilled' ? tRes.value : [];
        const departments = dRes.status === 'fulfilled' ? dRes.value : [];
        const focus       = fRes.status === 'fulfilled' ? fRes.value : [];

        DATA_CACHE.teachers = teachers;
        DATA_CACHE.departments = departments;
        DATA_CACHE.focus = focus;

        buildObservationForm(teachers, departments, focus);
      })
      .catch(err => {
        console.error('Prefetch failed', err);
        flash('warning', 'Failed to load dropdowns. Submit disabled. / BR: Falha ao carregar listas. Envio desabilitado.');
        buildObservationForm([], [], []);
      });
  } else {
    // EN: List page / BR: Página de lista
    getObservations()
      .then(renderObservations)
      .catch(err => {
        console.error('Failed to load observations', err);
        renderNoObservations();
      });
  }
});

/* ===========================
   LIST RENDERING
   =========================== */
function renderNoObservations() {
  const container = document.getElementById("obs-table");
  if (container) container.innerHTML = "<p class='text-center'>No observations yet!</p>";
}

function renderObservations(observations) {
  const container = document.getElementById("obs-table");
  if (!container) return;

  if (!observations || observations.length === 0) {
    renderNoObservations();
    return;
  }

  let table = `
    <h2>Observations</h2>
    <table class="table table-striped table-bordered">
      <thead class="thead-dark">
        <tr>
          <th>Teacher</th>
          <th>Department</th>
          <th>Focus</th>
          <th>Class</th>
          <th>Date</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
  `;

  observations.forEach(obs => {
    const deptLabel =
      obs.Department_Name ??
      (obs.department && obs.department.Department_Name) ??
      obs.Observation_Department ?? "—";

    const focusLabel =
      obs.Focus_Name ??
      (obs.focus && obs.focus.Focus_Name) ??
      obs.Observation_Focus ?? "—";

    const formattedDate = obs.Observation_Date ? new Date(obs.Observation_Date).toLocaleDateString() : '—';
    const teacherName = [obs.Teacher_Forename, obs.Teacher_Surname].filter(Boolean).join(' ') || '—';

    table += `
      <tr>
        <td>${teacherName}</td>
        <td>${deptLabel}</td>
        <td>${focusLabel}</td>
        <td>${obs.Observation_Class ?? '—'}</td>
        <td>${formattedDate}</td>
        <td>
          <button class="btn btn-sm btn-info" onclick="viewObservation(${obs.Observation_ID})">View</button>
          <button class="btn btn-sm btn-danger" onclick="confirmDelete(${obs.Observation_ID})">Delete</button>
          <a href="/api/pdf/${obs.Observation_ID}" class="btn btn-sm btn-secondary">PDF</a>
        </td>
      </tr>
    `;
  });

  table += "</tbody></table>";
  container.innerHTML = table;
}

function confirmDelete(id) {
  if (!confirm("Delete observation?")) return;
  API.del(`/api/observations/${id}`)
    .then(res => {
      if (!res.ok) throw new Error(res.data?.detail || `HTTP ${res.status}`);
      alert(res.data?.message || "Observation deleted!");
      return getObservations();
    })
    .then(renderObservations)
    .catch(err => {
      console.error("Delete failed:", err);
      alert("Something went wrong while deleting.");
    });
}

function viewObservation(id) {
  API.get(`/api/observations/${id}`)
    .then(res => {
      if (!res.ok) throw new Error(res.data?.detail || 'Not found');
      const obs = res.data;
      const container = document.getElementById("content-block");
      if (!container) return;

      const formattedDate = obs.Observation_Date ? new Date(obs.Observation_Date).toLocaleDateString() : '—';
      const teacherName = [obs.Teacher_Forename, obs.Teacher_Surname].filter(Boolean).join(' ') || '—';

      container.innerHTML = `
        <h2>Observation Details</h2>
        <ul class="list-group">
          <li class="list-group-item"><strong>Teacher:</strong> ${teacherName}</li>
          <li class="list-group-item"><strong>Date:</strong> ${formattedDate}</li>
          <li class="list-group-item"><strong>Class:</strong> ${obs.Observation_Class ?? '—'}</li>
          <li class="list-group-item"><strong>Focus Area:</strong> ${obs.Focus_Name ?? obs.Observation_Focus ?? '—'}</li>
          <li class="list-group-item"><strong>Strengths:</strong> ${obs.Observation_Strengths ?? '—'}</li>
          <li class="list-group-item"><strong>Areas for Development:</strong> ${obs.Observation_Weaknesses ?? '—'}</li>
          <li class="list-group-item"><strong>Other Comments:</strong> ${obs.Observation_Comments ?? '—'}</li>
        </ul>
        <button class="btn btn-secondary mt-3" onclick="getObservations().then(renderObservations)">Back to list</button>
      `;
    })
    .catch(error => {
      alert("Observation not found.");
      console.error(error);
    });
}

/* ===========================
   NEW OBSERVATION FORM
   =========================== */
function buildObservationForm(teachers, departments, focus) {
  const container = document.getElementById('content-block');
  if (!container) return;

  const missingDeps = (departments.length === 0 || focus.length === 0);
  if (missingDeps) {
    flash('warning',
      'Departments/Focus failed to load. Submit is disabled. / BR: Departamentos/Foco não carregaram. Envio desabilitado.'
    );
  } else {
    flash('info', ''); // clear
  }

  container.innerHTML = `
    <h2 class="mb-3">New Observation</h2>

    <form id="obsForm" class="mb-5" novalidate>
      <!-- Teacher -->
      <div class="form-group">
        <label for="Observation_Teacher">Teacher / Professor</label>
        <select id="Observation_Teacher" name="Observation_Teacher" class="form-control" aria-describedby="teacherHelp" required>
          ${teachers.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
        </select>
        <small id="teacherHelp" class="form-text text-muted">
          EN: Choose the observed teacher. / BR: Escolha o professor observado.
        </small>
      </div>

      <!-- Department -->
      <div class="form-group">
        <label for="Observation_Department">Department / Departamento</label>
        <select id="Observation_Department" name="Observation_Department" class="form-control" aria-describedby="deptHelp" ${departments.length ? '' : 'disabled'}>
          ${departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
        </select>
        <small id="deptHelp" class="form-text text-muted">
          EN: Select the department. / BR: Selecione o departamento.
        </small>
      </div>

      <!-- Focus -->
      <div class="form-group">
        <label for="Observation_Focus">Focus Area / Foco</label>
        <select id="Observation_Focus" name="Observation_Focus" class="form-control" aria-describedby="focusHelp" ${focus.length ? '' : 'disabled'}>
          ${focus.map(f => `<option value="${f.id}">${f.name}</option>`).join('')}
        </select>
        <small id="focusHelp" class="form-text text-muted">
          EN: Select the focus for this observation. / BR: Selecione o foco desta observação.
        </small>
      </div>

      <!-- Class -->
      <div class="form-group">
        <label for="Observation_Class">Class / Turma</label>
        <input id="Observation_Class" name="Observation_Class" type="text" class="form-control" placeholder="e.g. 10A / ex.: 10A" aria-label="Class" />
      </div>

      <!-- Strengths -->
      <div class="form-group">
        <label for="Observation_Strengths">Strengths / Pontos fortes</label>
        <textarea id="Observation_Strengths" name="Observation_Strengths" class="form-control" rows="3" placeholder="Short notes..."></textarea>
      </div>

      <!-- Weaknesses -->
      <div class="form-group">
        <label for="Observation_Weaknesses">Areas for Development / Pontos a desenvolver</label>
        <textarea id="Observation_Weaknesses" name="Observation_Weaknesses" class="form-control" rows="3" placeholder="Short notes..."></textarea>
      </div>

      <!-- Comments -->
      <div class="form-group">
        <label for="Observation_Comments">Other Comments / Outros comentários</label>
        <textarea id="Observation_Comments" name="Observation_Comments" class="form-control" rows="3" placeholder="Optional..."></textarea>
      </div>

      <!-- Send feedback toggle -->
      <div class="form-group form-check text-left">
        <input type="checkbox" class="form-check-input" id="sendEmail">
        <label class="form-check-label" for="sendEmail">
          Send feedback to observed teacher / Enviar feedback ao professor observado
        </label>
        <small id="emailHelp" class="form-text text-muted d-block">
          EN: If checked, an email with the observation PDF will be sent to the teacher. <br>
          BR: Se marcado, um e-mail com o PDF da observação será enviado ao professor.
        </small>
      </div>

      <button id="submitBtn" type="submit" class="btn btn-success" ${missingDeps ? 'disabled' : ''}>
        Submit / Enviar
      </button>
      <a href="/" class="btn btn-light ml-2">Cancel</a>
    </form>
  `;

  // EN: Wire submit / BR: Conectar envio
  const form = document.getElementById('obsForm');
  const submitBtn = document.getElementById('submitBtn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (submitBtn.disabled) return;

    const payload = {
      Observation_Teacher: parseInt(document.getElementById('Observation_Teacher').value, 10),
      Observation_Class: (document.getElementById('Observation_Class').value || '').trim(),
      Observation_Department: departments.length ? parseInt(document.getElementById('Observation_Department').value, 10) : null,
      Observation_Focus: focus.length ? parseInt(document.getElementById('Observation_Focus').value, 10) : null,
      Observation_Strengths: (document.getElementById('Observation_Strengths').value || '').trim(),
      Observation_Weaknesses: (document.getElementById('Observation_Weaknesses').value || '').trim(),
      Observation_Comments: (document.getElementById('Observation_Comments').value || '').trim(),
    };

    // EN: Validate required dropdowns / BR: Validar obrigatórios
    if (!Number.isInteger(payload.Observation_Department) || !Number.isInteger(payload.Observation_Focus)) {
      flash('warning', 'Department/Focus missing — cannot submit. / BR: Departamento/Foco ausentes — não é possível enviar.');
      return;
    }

    submitBtn.disabled = true;

    try {
      const res = await API.post('/api/new', payload);

      if (!res.ok) {
        console.error('Create failed', res);
        const msg = res.data?.detail || res.status || 'network';
        flash('danger', `Create failed (${msg}). / BR: Falha ao criar (${msg}).`);
        submitBtn.disabled = false;
        return;
      }

      const data = res.data || {};
      const newId = data.Observation_ID ?? data.id ?? data.observation_id;

      const wantsEmail = !!document.getElementById('sendEmail')?.checked;
      if (wantsEmail && newId) {
        const mailRes = await emailObservation(newId);
        if (mailRes?.ok) {
          flash('success', 'Observation created and email sent. / BR: Observação criada e e-mail enviado.');
        } else {
          const emsg = mailRes?.data?.detail || mailRes?.status || 'unknown';
          flash('warning', `Observation created. Email failed (${emsg}). / BR: Observação criada. Falha no e-mail (${emsg}).`);
        }
      } else {
        flash('success', 'Observation created. / BR: Observação criada.');
      }

      setTimeout(() => { window.location.href = '/'; }, 800);

    } catch (err) {
      console.error('Unexpected submit error', err);
      flash('danger', 'Unexpected error. / BR: Erro inesperado.');
      submitBtn.disabled = false;
    }
  });
}

