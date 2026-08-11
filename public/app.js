const API_BASE_URL = (typeof window !== 'undefined' && window.API_BASE_URL ? window.API_BASE_URL : '').replace(/\/$/, '');

const state = {
  clientes: [],
  selectedClientId: null,
  selectedClient: null,
  editingClientId: null,
  editingApplianceId: null,
  activeEventForm: null,
  searchTerm: '',
};

const clientesList = document.getElementById('clientesList');
const detalleCliente = document.getElementById('detalleCliente');
const feedback = document.getElementById('feedback');
const clienteForm = document.getElementById('clienteForm');
const clienteIdInput = document.getElementById('clienteId');
const clienteSearchInput = document.getElementById('clienteSearch');

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function setFeedback(message, isError = false) {
  feedback.textContent = message;
  feedback.classList.toggle('error', isError);
}

function formatTimestamp(value) {
  if (!value) return 'Sin fecha';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function resetClientForm() {
  clienteForm.reset();
  clienteIdInput.value = '';
  state.editingClientId = null;
}

function fillClientForm(cliente) {
  clienteIdInput.value = cliente.id;
  clienteForm.nombre.value = cliente.nombre;
  clienteForm.apellido.value = cliente.apellido;
  clienteForm.numeroCliente.value = cliente.numero_cliente ?? '';
  clienteForm.telefono.value = cliente.telefono || '';
  clienteForm.direccion.value = cliente.direccion || '';
  state.editingClientId = cliente.id;
}

function getFilteredClientes() {
  const term = state.searchTerm.trim().toLowerCase();
  if (!term) {
    return state.clientes;
  }

  return state.clientes.filter((cliente) => {
    const haystack = [
      cliente.nombre,
      cliente.apellido,
      cliente.numero_cliente != null ? String(cliente.numero_cliente) : '',
      cliente.telefono,
      cliente.direccion,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(term);
  });
}

function renderClientes() {
  const clientes = getFilteredClientes();

  if (!state.clientes.length) {
    clientesList.innerHTML = '<div class="empty-state">Aún no hay clientes cargados. Agrega el primero.</div>';
    return;
  }

  if (!clientes.length) {
    clientesList.innerHTML = '<div class="empty-state">No se encontraron clientes con ese criterio de búsqueda.</div>';
    return;
  }

  clientesList.innerHTML = clientes
    .map((cliente) => {
      const isActive = state.selectedClientId === cliente.id;
      return `
        <article class="cliente-card ${isActive ? 'active' : ''}">
          <button type="button" class="cliente-main" data-action="select-client" data-id="${cliente.id}">
            <h3>${escapeHtml(cliente.nombre)} ${escapeHtml(cliente.apellido)}</h3>
            <p><strong>Nº manual:</strong> ${escapeHtml(cliente.numero_cliente != null ? cliente.numero_cliente : 'Sin número')}</p>
            <p>${escapeHtml(cliente.telefono || 'Sin teléfono')} • ${escapeHtml(cliente.direccion || 'Sin dirección')}</p>
          </button>
          <div class="client-actions">
            <button type="button" data-action="edit-client" data-id="${cliente.id}" class="secondary">Editar</button>
            <button type="button" data-action="delete-client" data-id="${cliente.id}" class="danger">Eliminar</button>
          </div>
        </article>
      `;
    })
    .join('');
}

function renderDetalleCliente() {
  if (!state.selectedClient) {
    detalleCliente.innerHTML = '<div class="empty-state">Selecciona un cliente para ver sus electrodomésticos y eventos.</div>';
    return;
  }

  const cliente = state.selectedClient;
  const appliances = cliente.electrodomesticos || [];

  detalleCliente.innerHTML = `
    <div class="detalle-header">
      <h3>${escapeHtml(cliente.nombre)} ${escapeHtml(cliente.apellido)}</h3>
      <p><strong>Nº manual:</strong> ${escapeHtml(cliente.numero_cliente != null ? cliente.numero_cliente : 'Sin número')}</p>
      <p><strong>Teléfono:</strong> ${escapeHtml(cliente.telefono || 'Sin teléfono')}</p>
      <p><strong>Dirección:</strong> ${escapeHtml(cliente.direccion || 'Sin dirección')}</p>
    </div>

    <div class="detail-actions">
      <button type="button" data-action="new-appliance" class="secondary">+ Nuevo electrodoméstico</button>
    </div>

    <form id="applianceForm" class="card-form" data-form="appliance">
      <input type="hidden" name="applianceId" id="applianceId" value="${state.editingApplianceId || ''}" />
      <div class="field-grid">
        <label class="full-width">
          Tipo de electrodoméstico
          <select name="tipo" required>
            <option value="Lavarropas">Lavarropas</option>
            <option value="Lavaplatos">Lavaplatos</option>
            <option value="Secarropas">Secarropas</option>
            <option value="Microondas">Microondas</option>
            <option value="Otro">Otro</option>
          </select>
        </label>
        <label class="full-width">
          Modelo
          <input type="text" name="modelo" placeholder="Ej: Samsung WW90T" />
        </label>
        <label class="full-width">
          Descripción
          <input type="text" name="descripcion" placeholder="Ej: Ingreso de lavarropas de 7kg" />
        </label>
      </div>
      <div class="actions">
        <button type="submit">${state.editingApplianceId ? 'Guardar cambios' : 'Agregar electrodoméstico'}</button>
        <button type="button" data-action="cancel-appliance-form" class="secondary">Cancelar</button>
      </div>
    </form>

    <div class="appliances-list">
      ${appliances.length ? appliances.map((appliance) => {
        const eventFormOpen = state.activeEventForm && state.activeEventForm.applianceId === appliance.id;
        const eventForm = eventFormOpen
          ? `
            <form class="card-form event-form" data-form="event">
              <input type="hidden" name="applianceId" value="${appliance.id}" />
              <input type="hidden" name="eventId" value="${state.activeEventForm.eventId || ''}" />
              <label>
                Evento
                <textarea name="texto" required>${escapeHtml(state.activeEventForm.text || '')}</textarea>
              </label>
              <div class="actions">
                <button type="submit">${state.activeEventForm.eventId ? 'Guardar cambios' : 'Agregar evento'}</button>
                <button type="button" data-action="cancel-event-form" class="secondary">Cancelar</button>
              </div>
            </form>
          `
          : `
            <div class="actions">
              <button type="button" data-action="new-event" data-appliance-id="${appliance.id}" class="secondary">+ Añadir evento</button>
            </div>
          `;

        return `
          <article class="appliance-card">
            <div class="appliance-top">
              <div>
                <h4>${escapeHtml(appliance.tipo)}</h4>
                <p>${escapeHtml(appliance.descripcion || 'Sin descripción')}</p>
                <p class="meta-info"><strong>Ingreso:</strong> ${escapeHtml(formatTimestamp(appliance.created_at))}</p>
              </div>
              <div class="client-actions">
                <button type="button" data-action="edit-appliance" data-id="${appliance.id}" class="secondary">Editar</button>
                <button type="button" data-action="delete-appliance" data-id="${appliance.id}" class="danger">Eliminar</button>
              </div>
            </div>

            <div class="event-list">
              ${appliance.eventos.length ? appliance.eventos.map((event) => `
                <div class="event-item">
                  <div>
                    <p>${escapeHtml(event.texto)}</p>
                    <small>${escapeHtml(formatTimestamp(event.created_at))}</small>
                  </div>
                  <div class="client-actions">
                    <button type="button" data-action="edit-event" data-event-id="${event.id}" data-appliance-id="${appliance.id}" class="secondary">Editar</button>
                    <button type="button" data-action="delete-event" data-event-id="${event.id}" class="danger">Eliminar</button>
                  </div>
                </div>
              `).join('') : '<div class="empty-state">Sin eventos. Agrega uno para registrar movimientos.</div>'}
            </div>

            ${eventForm}
          </article>
        `;
      }).join('') : '<div class="empty-state">Este cliente aún no tiene electrodomésticos.</div>'}
    </div>
  `;

  if (state.editingApplianceId) {
    const form = document.getElementById('applianceForm');
    const appliance = appliances.find((item) => item.id === state.editingApplianceId);
    if (form && appliance) {
      form.tipo.value = appliance.tipo;
      form.modelo.value = appliance.modelo || '';
      form.descripcion.value = appliance.descripcion || '';
    }
  }
}

async function loadClientes() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/clientes`);
    const data = await response.json();
    state.clientes = data;
    renderClientes();

    if (state.selectedClientId) {
      const selected = state.clientes.find((cliente) => cliente.id === state.selectedClientId);
      if (selected) {
        await loadClienteDetalle(selected.id);
      } else {
        state.selectedClientId = null;
        state.selectedClient = null;
        renderDetalleCliente();
      }
    }
  } catch (error) {
    console.error(error);
    setFeedback('No se pudieron cargar los clientes', true);
  }
}

async function loadClienteDetalle(clienteId) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/clientes/${clienteId}/electrodomesticos`);
    const electrodomesticos = await response.json();
    const cliente = state.clientes.find((item) => item.id === clienteId);
    state.selectedClient = cliente ? { ...cliente, electrodomesticos } : null;
    state.selectedClientId = clienteId;
    state.editingApplianceId = null;
    state.activeEventForm = null;
    renderDetalleCliente();
  } catch (error) {
    console.error(error);
    setFeedback('No se pudieron cargar los electrodomésticos', true);
  }
}

async function handleSubmit(event) {
  const form = event.target;

  if (form.matches('#clienteForm')) {
    event.preventDefault();
    const numeroClienteValue = form.numeroCliente.value.trim();
    const payload = {
      nombre: form.nombre.value.trim(),
      apellido: form.apellido.value.trim(),
      numero_cliente: numeroClienteValue ? Number(numeroClienteValue) : null,
      telefono: form.telefono.value.trim(),
      direccion: form.direccion.value.trim(),
    };

    if (!payload.nombre || !payload.apellido) {
      setFeedback('Completá nombre y apellido', true);
      return;
    }

    const url = state.editingClientId ? `/api/clientes/${state.editingClientId}` : '/api/clientes';
    const method = state.editingClientId ? 'PUT' : 'POST';

    try {
      const response = await fetch(`${API_BASE_URL}${url}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'No se pudo guardar el cliente');
      }
      setFeedback(state.editingClientId ? 'Cliente actualizado' : 'Cliente creado');
      resetClientForm();
      await loadClientes();
      if (result.cliente) {
        state.selectedClientId = result.cliente.id;
        await loadClienteDetalle(result.cliente.id);
      }
    } catch (error) {
      setFeedback(error.message, true);
    }
    return;
  }

  if (form.matches('#applianceForm')) {
    event.preventDefault();
    const tipo = form.tipo.value;
    const descripcion = form.descripcion.value.trim();
    const modelo = form.modelo.value.trim();
    const applianceId = form.applianceId.value;

    if (!tipo) {
      setFeedback('Seleccioná un tipo de electrodoméstico', true);
      return;
    }

    if (!modelo) {
      setFeedback('El modelo del electrodoméstico es obligatorio', true);
      return;
    }

    try {
      const url = applianceId ? `/api/electrodomesticos/${applianceId}` : `/api/clientes/${state.selectedClientId}/electrodomesticos`;
      const method = applianceId ? 'PUT' : 'POST';
      const response = await fetch(`${API_BASE_URL}${url}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, descripcion, modelo }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'No se pudo guardar el electrodoméstico');
      }
      setFeedback(applianceId ? 'Electrodoméstico actualizado' : 'Electrodoméstico agregado');
      state.editingApplianceId = null;
      form.reset();
      await loadClienteDetalle(state.selectedClientId);
    } catch (error) {
      setFeedback(error.message, true);
    }
  }

  if (form.matches('.event-form')) {
    event.preventDefault();
    const texto = form.texto.value.trim();
    const applianceId = form.applianceId.value;
    const eventId = form.eventId.value;

    if (!texto) {
      setFeedback('El evento no puede estar vacío', true);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}${eventId ? `/api/eventos/${eventId}` : `/api/electrodomesticos/${applianceId}/eventos`}`, {
        method: eventId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'No se pudo guardar el evento');
      }
      setFeedback(eventId ? 'Evento actualizado' : 'Evento agregado');
      state.activeEventForm = null;
      await loadClienteDetalle(state.selectedClientId);
    } catch (error) {
      setFeedback(error.message, true);
    }
  }
}

async function handleClick(event) {
  const trigger = event.target.closest('[data-action]');
  if (!trigger) return;

  const action = trigger.dataset.action;

  if (action === 'new-client') {
    resetClientForm();
    setFeedback('Completá los datos del nuevo cliente');
    return;
  }

  if (action === 'cancel-client-form') {
    resetClientForm();
    setFeedback('Formulario cancelado');
    return;
  }

  if (action === 'select-client') {
    const clienteId = Number(trigger.dataset.id);
    state.selectedClientId = clienteId;
    await loadClienteDetalle(clienteId);
    renderClientes();
    return;
  }

  if (action === 'edit-client') {
    const clienteId = Number(trigger.dataset.id);
    const cliente = state.clientes.find((item) => item.id === clienteId);
    if (cliente) {
      fillClientForm(cliente);
      setFeedback(`Editando a ${cliente.nombre} ${cliente.apellido}`);
    }
    return;
  }

  if (action === 'delete-client') {
    const clienteId = Number(trigger.dataset.id);
    if (!confirm('¿Seguro que querés eliminar este cliente y todos sus datos?')) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/clientes/${clienteId}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'No se pudo eliminar el cliente');
      setFeedback('Cliente eliminado');
      state.selectedClientId = null;
      state.selectedClient = null;
      await loadClientes();
    } catch (error) {
      setFeedback(error.message, true);
    }
    return;
  }

  if (action === 'new-appliance') {
    state.editingApplianceId = null;
    state.activeEventForm = null;
    renderDetalleCliente();
    return;
  }

  if (action === 'cancel-appliance-form') {
    state.editingApplianceId = null;
    state.activeEventForm = null;
    document.getElementById('applianceForm').reset();
    renderDetalleCliente();
    return;
  }

  if (action === 'edit-appliance') {
    const applianceId = Number(trigger.dataset.id);
    state.editingApplianceId = applianceId;
    renderDetalleCliente();
    return;
  }

  if (action === 'delete-appliance') {
    const applianceId = Number(trigger.dataset.id);
    if (!confirm('¿Querés eliminar este electrodoméstico y sus eventos?')) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/electrodomesticos/${applianceId}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'No se pudo eliminar el electrodoméstico');
      setFeedback('Electrodoméstico eliminado');
      await loadClienteDetalle(state.selectedClientId);
    } catch (error) {
      setFeedback(error.message, true);
    }
    return;
  }

  if (action === 'new-event') {
    state.activeEventForm = { applianceId: Number(trigger.dataset.applianceId), eventId: null, text: '' };
    renderDetalleCliente();
    return;
  }

  if (action === 'edit-event') {
    const applianceId = Number(trigger.dataset.applianceId);
    const eventId = Number(trigger.dataset.eventId);
    const appliance = state.selectedClient?.electrodomesticos?.find((item) => item.id === applianceId);
    const event = appliance?.eventos?.find((item) => item.id === eventId);
    if (event) {
      state.activeEventForm = { applianceId, eventId: event.id, text: event.texto };
      renderDetalleCliente();
    }
    return;
  }

  if (action === 'delete-event') {
    const eventId = Number(trigger.dataset.eventId);
    if (!confirm('¿Querés eliminar este evento?')) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/eventos/${eventId}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'No se pudo eliminar el evento');
      setFeedback('Evento eliminado');
      await loadClienteDetalle(state.selectedClientId);
    } catch (error) {
      setFeedback(error.message, true);
    }
    return;
  }

  if (action === 'cancel-event-form') {
    state.activeEventForm = null;
    renderDetalleCliente();
  }
}

document.addEventListener('submit', handleSubmit);
document.addEventListener('click', handleClick);
document.addEventListener('input', (event) => {
  if (event.target.matches('#clienteSearch')) {
    state.searchTerm = event.target.value;
    renderClientes();
  }
});

window.addEventListener('DOMContentLoaded', async () => {
  await loadClientes();
  setFeedback('Listo para trabajar');
});
