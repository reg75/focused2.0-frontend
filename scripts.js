// js/scripts.js
console.log("scripts.js loaded"); // Debugging

document.addEventListener('DOMContentLoaded', () => {
  const isNewObservationPage = window.location.pathname === '/new_observation';

  if (isNewObservationPage) {
    // EN: Fetch teacher list for form / BR: Buscar lista de professores para o formulário
    fetch('/api/teachers')
      .then(response => response.json())
      .then(data => {
        if (data.message) {
          console.error("No teachers found.");
        } else {
          buildObservationForm(data);
        }
      })
      .catch(error => {
        console.error('Error fetching teachers:', error);
      });
  } else {
    fetchObservations(); // EN: Show observations list / BR: Mostrar lista de observações
  }
});

// EN: Fetch and render all observations / BR: Buscar e renderizar todas as observações
function fetchObservations() {
  fetch('/api/observations')
    .then(response => {
      if (!response.ok) throw new Error("Network response was not ok");
      return response.json();
    })
    .then(data => {
      console.log("Fetched observations: ", data);
      if (data.message === "No observations yet!") {
        renderNoObservations();
      } else {
        renderObservations(data);
      }
    })
    .catch(error => {
      console.error('Error fetching observations:', error);
    });
}

function renderNoObservations() {
  const container = document.getElementById("content-block");
  container.innerHTML = "<p class='text-center'>No observations yet!</p>";
}

function renderObservations(observations) {
  const container = document.getElementById("content-block");

  let table = `
    <h2>Observations</h2>
    <table class="table table-striped table-bordered">
      <thead class="thead-dark">
        <tr>
          <th>Teacher</th>
          <th>Class</th>
          <th>Date</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
  `;

  observations.forEach(obs => {
    const formattedDate = new Date(obs.Observation_Date).toLocaleDateString();
    table += `
      <tr>
        <td>${obs.Teacher_Forename} ${obs.Teacher_Surname}</td>
        <td>${obs.Observation_Class}</td>
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

// EN: Confirm and delete observation / BR: Confirmar e excluir observação
function confirmDelete(id) {
  if (confirm("Delete observation?")) {
    fetch(`/api/observations/${id}`, {
      method: 'DELETE',
    })
      .then(response => {
        if (!response.ok) throw new Error("Failed to delete observation");
        return response.json();
      })
      .then(data => {
        alert(data.message || "Observation deleted!");
        fetchObservations(); // EN: Refresh list / BR: Atualizar lista
      })
      .catch(error => {
        console.error("Error deleting observation:", error);
        alert("Something went wrong while deleting.");
      });
  }
}

// EN: View details of an observation / BR: Ver detalhes de uma observação
function viewObservation(id) {
  fetch(`/api/view/${id}`)
    .then(response => {
      if (!response.ok) throw new Error("Observation not found");
      return response.json();
    })
    .then(obs => {
      const container = document.getElementById("content-block");
      const formattedDate = new Date(obs.Observation_Date).toLocaleDateString();
      container.innerHTML = `
        <h2>Observation Details</h2>
        <ul class="list-group">
          <li class="list-group-item"><strong>Teacher:</strong> ${obs.Teacher_Forename} ${obs.Teacher_Surname}</li>
          <li class="list-group-item"><strong>Date:</strong> ${formattedDate}</li>
          <li class="list-group-item"><strong>Class:</strong> ${obs.Observation_Class}</li>
          <li class="list-group-item"><strong>Focus Area:</strong> ${obs.Observation_Focus}</li>
          <li class="list-group-item"><strong>Strengths:</strong> ${obs.Observation_Strengths}</li>
          <li class="list-group-item"><strong>Areas for Development:</strong> ${obs.Observation_Weaknesses}</li>
          <li class="list-group-item"><strong>Other Comments:</strong> ${obs.Observation_Comments}</li>
        </ul>
        <button class="btn btn-secondary mt-3" onclick="fetchObservations()">Back to list</button>
      `;
    })
    .catch(error => {
      alert("Observation not found.");
      console.error(error);
    });
}

// EN: Build and handle observation form / BR: Criar e manipular o formulário de observação
function buildObservationForm(teachers) {
  const container = document.getElementById('content-block');
  const form = document.createElement('form');
  form.classList.add('mt-4');

  const selectTeacher = document.createElement('select');
  selectTeacher.name = 'Observation_Teacher';
  selectTeacher.className = 'form-control mb-3';

  teachers.forEach(teacher => {
    const option = document.createElement('option');
    option.value = teacher.User_ID;
    option.textContent = `${teacher.Teacher_Surname}, ${teacher.Teacher_Forename}`;
    selectTeacher.appendChild(option);
  });

  const inputClass = createInput('Observation_Class', 'Class...');
  const inputFocus = createInput('Observation_Focus', 'Focus...');
  const inputStrengths = createTextarea('Observation_Strengths', 'Strengths...');
  const inputWeaknesses = createTextarea('Observation_Weaknesses', 'Areas for development...');
  const inputComments = createTextarea('Observation_Comments', 'Other comments...');


  const buttonSubmit = document.createElement('input');
  buttonSubmit.type = 'submit';
  buttonSubmit.value = 'Submit';
  buttonSubmit.className = 'btn btn-success mt-3';

  form.appendChild(selectTeacher);
  form.appendChild(inputClass);
  form.appendChild(inputFocus);
  form.appendChild(inputStrengths);
  form.appendChild(inputWeaknesses);
  form.appendChild(inputComments);
  form.appendChild(buttonSubmit);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const formObject = Object.fromEntries(formData.entries());

    const response = await fetch('/api/new', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formObject)
    });

    if (response.ok) {
      const result = await response.json();
      alert(`Observation created!`);
      window.location.href = '/';  // EN Redirect to list after submission / BR: Redirecionar para a lista após o envio
    } else {
      const error = await response.json();
      alert(`Error: ${error.detail || 'Could not create observation'}`);
    }
  });

  container.innerHTML = ''; 
  container.appendChild(form);
}

// EN: Utility function to create inputs / BR: Função utilitária para criar campos de entrada
function createInput(name, placeholder) {
  const input = document.createElement('input');
  input.type = 'text';
  input.name = name;
  input.placeholder = placeholder;
  input.className = 'form-control mb-3';
  return input;
}

// EN: Utility function to create textarea fields / BR: Função utilitária para criar áreas de texto
function createTextarea(name, placeholder) {
  const textarea = document.createElement('textarea');
  textarea.name = name;
  textarea.placeholder = placeholder;
  textarea.className = 'form-control mb-3';
  textarea.rows = 4; // EN: Number of visible rows / BR: Número de linhas visíveis
  return textarea;
}
