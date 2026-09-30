# Abasto Xalapa · Sistema de costos e inventario para restaurantes

Aplicación web (Next.js + SQLite) para costos, recetas/catálogo, inventario, compras, merma y abasto a cocinas.
Funciona en computadora y celular (se puede "instalar" en la pantalla de inicio). Contacto/administración: **rafadonte@gmail.com**

## Instalar y usar (3 pasos)

Requisito: [Node.js 22.13 o superior](https://nodejs.org) (versión LTS).

```sh
npm install
npm run dev
```

La primera vez, la terminal muestra tu **correo**, una **contraseña generada** y las direcciones para abrir la app:

- Computadora: http://localhost:3000
- Celular (conectado a la **misma WiFi** del restaurante): la dirección `http://192.168.x.x:3000` que aparece en la terminal.

Entra con `rafadonte@gmail.com` y esa contraseña. Puedes cambiarla editando `ADMIN_PASSWORD` en el archivo `.env` (y reiniciando).
En el celular: menú del navegador → **Agregar a pantalla de inicio** para usarla como app.

Primer uso: Almacén → **Importar catálogo** (310 claves, 187 con nombre) → registrar **Apertura** por producto.

## Dar acceso al equipo

Equipo → escribe nombre, correo, función y contraseña (mín. 8 caracteres). Funciones: Administración, Almacén, Compras, Cocina María Victoria, Cocina Chan Chan. Cada quien entra desde su propio celular con su correo y contraseña.

## Usarla todos los días (modo producción)

```sh
npm run prod      # compila y arranca en el puerto 3000
```

La computadora que la ejecute debe quedar encendida y en la red del restaurante. Los datos viven en `.data/abasto.sqlite`: **respalda esa carpeta** (con la app detenida o copiando también los archivos `-wal`/`-shm`).

## Acceso desde fuera del restaurante (Internet)

Hace falta un servidor con disco persistente y HTTPS (Render, Railway, Fly.io, un VPS…). Incluye `Dockerfile`.
Variables a definir en el servicio: `ADMIN_EMAIL=rafadonte@gmail.com`, `ADMIN_PASSWORD` (larga), `SESSION_SECRET` (texto aleatorio de 32+ caracteres), `COOKIE_SECURE=true`, `DATABASE_PATH=/data/abasto.sqlite` y un volumen montado en `/data`.
No expongas el puerto 3000 a Internet sin HTTPS.

## Lógica conservada (sin cambios)

`lib/domain.ts` conserva íntegras las reglas de costo promedio, aperturas, recepciones parciales, traspasos, devoluciones, merma, cancelaciones, mínimos/máximos y sugeridos. `lib/catalog.json` conserva el catálogo. Los permisos por función siguen igual.

## Pruebas

`npm test` (cantidades, reservados, fechas, devoluciones, base de datos y sesiones).
`tests/ledger.integration.mjs` recorre todo el circuito contra una base **vacía** (genera movimientos de prueba; no la uses con datos reales).

## Qué cambió respecto a la versión de ChatGPT

- Se quitó la dependencia de ChatGPT/Cloudflare; ahora hay inicio de sesión propio (correo + contraseña, sesión firmada de 14 días).
- Base de datos SQLite local con el mismo esquema; escritura por lotes atómica.
- El servidor escucha en la red local para poder entrar desde celulares.
- Nuevo diseño, instalable en celular (PWA).
- `original-sites/` conserva una copia del código exportado original (con el correo ya actualizado).
