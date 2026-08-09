# CRUD de clientes y electrodomésticos

Aplicación web simple para gestionar:
- clientes con nombre, apellido, DNI, teléfono y dirección
- electrodomésticos por cliente (lavarropas, lavaplatos u otro)
- eventos de texto asociados a cada electrodoméstico, con edición y eliminación

## Tecnologías
- Node.js + Express
- SQLite con `better-sqlite3`
- HTML, CSS y JavaScript separados

## Ejecución local
1. Instala dependencias:
   ```bash
   npm install
   ```
2. Inicia la app:
   ```bash
   npm start
   ```
3. Abre en el navegador:
   ```text
   http://localhost:3000
   ```

## Despliegue
Esta versión usa SQLite, por lo que funciona bien en plataformas como Render o Railway.
Si querés usar Vercel, conviene migrar la base de datos a PostgreSQL.
