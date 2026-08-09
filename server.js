const express = require('express');
const cors = require('cors');
const path = require('path');
const { db, initializeDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', async (req, res) => {
  try {
    res.json({ ok: true, message: 'API funcionando' });
  } catch (error) {
    res.status(500).json({ error: 'No se pudo verificar la API' });
  }
});

app.get('/api/clientes', async (req, res) => {
  try {
    const clientes = await db.all('SELECT * FROM clientes ORDER BY created_at DESC');
    res.json(clientes);
  } catch (error) {
    res.status(500).json({ error: 'No se pudieron listar los clientes' });
  }
});

app.get('/api/clientes/:id', async (req, res) => {
  try {
    const cliente = await db.get('SELECT * FROM clientes WHERE id = ?', [req.params.id]);
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    res.json(cliente);
  } catch (error) {
    res.status(500).json({ error: 'No se pudo obtener el cliente' });
  }
});

app.post('/api/clientes', async (req, res) => {
  try {
    const { nombre, apellido, dni, telefono, direccion, numero_cliente } = req.body;
    const result = await db.run(
      'INSERT INTO clientes (nombre, apellido, dni, telefono, direccion, numero_cliente) VALUES (?, ?, ?, ?, ?, ?)',
      [nombre, apellido, dni, telefono, direccion, numero_cliente ?? null]
    );

    const cliente = await db.get('SELECT * FROM clientes WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json({ message: 'Cliente creado', cliente });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.code === '23505') {
      return res.status(400).json({ error: 'El DNI ya existe' });
    }
    res.status(500).json({ error: 'No se pudo crear el cliente' });
  }
});

app.put('/api/clientes/:id', async (req, res) => {
  try {
    const { nombre, apellido, dni, telefono, direccion, numero_cliente } = req.body;
    const result = await db.run(
      'UPDATE clientes SET nombre = ?, apellido = ?, dni = ?, telefono = ?, direccion = ?, numero_cliente = ? WHERE id = ?',
      [nombre, apellido, dni, telefono, direccion, numero_cliente ?? null, req.params.id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const cliente = await db.get('SELECT * FROM clientes WHERE id = ?', [req.params.id]);
    res.json({ message: 'Cliente actualizado', cliente });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.code === '23505') {
      return res.status(400).json({ error: 'El DNI ya existe' });
    }
    res.status(500).json({ error: 'No se pudo actualizar el cliente' });
  }
});

app.delete('/api/clientes/:id', async (req, res) => {
  try {
    const result = await db.run('DELETE FROM clientes WHERE id = ?', [req.params.id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    res.json({ message: 'Cliente eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'No se pudo eliminar el cliente' });
  }
});

app.get('/api/clientes/:clienteId/electrodomesticos', async (req, res) => {
  try {
    const electrodomesticos = await db.all('SELECT * FROM electrodomesticos WHERE cliente_id = ? ORDER BY created_at DESC', [req.params.clienteId]);
    const data = await Promise.all(electrodomesticos.map(async (electrodomestico) => {
      const eventos = await db.all('SELECT * FROM eventos WHERE electrodomestico_id = ? ORDER BY created_at DESC', [electrodomestico.id]);
      return { ...electrodomestico, eventos };
    }));
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'No se pudieron listar los electrodomésticos' });
  }
});

app.post('/api/clientes/:clienteId/electrodomesticos', async (req, res) => {
  try {
    const { tipo, descripcion, modelo } = req.body;
    const result = await db.run(
      'INSERT INTO electrodomesticos (cliente_id, tipo, descripcion, modelo) VALUES (?, ?, ?, ?)',
      [req.params.clienteId, tipo, descripcion, modelo || null]
    );

    const electrodomestico = await db.get('SELECT * FROM electrodomesticos WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json({ message: 'Electrodoméstico creado', electrodomestico });
  } catch (error) {
    res.status(500).json({ error: 'No se pudo crear el electrodoméstico' });
  }
});

app.put('/api/electrodomesticos/:id', async (req, res) => {
  try {
    const { tipo, descripcion, modelo } = req.body;
    const result = await db.run('UPDATE electrodomesticos SET tipo = ?, descripcion = ?, modelo = ? WHERE id = ?', [tipo, descripcion, modelo || null, req.params.id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Electrodoméstico no encontrado' });
    }
    const electrodomestico = await db.get('SELECT * FROM electrodomesticos WHERE id = ?', [req.params.id]);
    res.json({ message: 'Electrodoméstico actualizado', electrodomestico });
  } catch (error) {
    res.status(500).json({ error: 'No se pudo actualizar el electrodoméstico' });
  }
});

app.delete('/api/electrodomesticos/:id', async (req, res) => {
  try {
    const result = await db.run('DELETE FROM electrodomesticos WHERE id = ?', [req.params.id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Electrodoméstico no encontrado' });
    }
    res.json({ message: 'Electrodoméstico eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'No se pudo eliminar el electrodoméstico' });
  }
});

app.get('/api/electrodomesticos/:electrodomesticoId/eventos', async (req, res) => {
  try {
    const eventos = await db.all('SELECT * FROM eventos WHERE electrodomestico_id = ? ORDER BY created_at DESC', [req.params.electrodomesticoId]);
    res.json(eventos);
  } catch (error) {
    res.status(500).json({ error: 'No se pudieron listar los eventos' });
  }
});

app.post('/api/electrodomesticos/:electrodomesticoId/eventos', async (req, res) => {
  try {
    const { texto } = req.body;
    const result = await db.run('INSERT INTO eventos (electrodomestico_id, texto) VALUES (?, ?)', [req.params.electrodomesticoId, texto]);
    const evento = await db.get('SELECT * FROM eventos WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json({ message: 'Evento creado', evento });
  } catch (error) {
    res.status(500).json({ error: 'No se pudo crear el evento' });
  }
});

app.put('/api/eventos/:id', async (req, res) => {
  try {
    const { texto } = req.body;
    const result = await db.run('UPDATE eventos SET texto = ? WHERE id = ?', [texto, req.params.id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }
    const evento = await db.get('SELECT * FROM eventos WHERE id = ?', [req.params.id]);
    res.json({ message: 'Evento actualizado', evento });
  } catch (error) {
    res.status(500).json({ error: 'No se pudo actualizar el evento' });
  }
});

app.delete('/api/eventos/:id', async (req, res) => {
  try {
    const result = await db.run('DELETE FROM eventos WHERE id = ?', [req.params.id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }
    res.json({ message: 'Evento eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'No se pudo eliminar el evento' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

initializeDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('No se pudo inicializar la base de datos', error);
    process.exit(1);
  });
