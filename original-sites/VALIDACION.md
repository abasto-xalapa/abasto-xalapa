# Abasto Xalapa

Aplicación con un inventario de Almacén y dos cocinas de destino, María Victoria y Chan Chan.

## Catálogo

Se conservan las 310 claves extraídas de ABASTO_XALAPA_V1.3_FINAL.xlsm: 187 productos con nombre y 123 claves reservadas sin nombre. Las reservadas no aparecen como productos seleccionables ni como filas de inventario. SHA-256 del archivo original: 6b85e3e090b840a02f86e5fbd669bbd4c73fb1b6c0d548619f55ee9e50e62dc8. No se modifica el archivo original. La importación inicial no contiene movimientos de prueba.

## Verificación

Circuito probado contra la base local D1: importación de catálogo, apertura única, recepción parcial, proveedor heredado, precios históricos, entrega, devolución, cancelación de pendientes, solicitudes parciales, reintentos idempotentes y dos salidas simultáneas. Sólo una salida se guarda cuando el saldo no cubre ambas. Las consultas concilian inicial + entradas − salidas = final.

El historial usa operaciones y líneas inmutables. Cada guardado se hace en un lote transaccional con una secuencia única: una colisión entre guardados provoca rechazo completo, no un guardado parcial. Las credenciales del administrador se toman de ADMIN_EMAIL en el entorno de producción; la simulación local no se publica.

Los miembros se autorizan en Equipo y también requieren acceso al sitio. La contraseña 1111 del Excel no se usa para autenticar personas: la aplicación utiliza su cuenta personal de ChatGPT.

Verificación del 27 de septiembre de 2026: circuito de API repetido en una base local aislada. Selector del formulario probado en navegador con ratón y teclado: selecciona producto, muestra unidad y carga precio. Un guardado correcto limpia producto, cantidad, precio y notas; el rechazo por apertura duplicada conserva la captura. Se validan claves reservadas, fechas inválidas y devoluciones superiores a lo entregado por la unidad mínima admitida. Las pruebas locales no se incluyen en la base de producción. Los permisos por función se comprueban en la lógica; no equivalen a un inicio de sesión real de cada integrante del equipo.

## Puesta en marcha

1. Administración importa el catálogo.
2. Almacén registra la apertura física por producto.
3. Cocinas solicitan; Almacén registra entregas totales o parciales.
4. Compras genera pedidos COM; Almacén registra lo recibido.
5. Inventario y Resumen consultan el mismo período semanal o mensual.

El costo entregado es el valor de salida del Almacén; no es consumo real de cocina ni pago a proveedor. La guía de la aplicación explica unidades, referencias, devoluciones y diferencias físicas.
