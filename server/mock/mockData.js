// Central mock data store — replaces Azure SQL for demo/portfolio mode

const almacenes = [
    { whscode: 'CAFE-01', whsdesc: 'Cafetería Torre Norte', Zona: 'ZONA 1', Contrato: 'CONT-A', CardName: 'Demo Corp S.A. de C.V.' },
    { whscode: 'CAFE-02', whsdesc: 'Cafetería Torre Sur',  Zona: 'ZONA 1', Contrato: 'CONT-A', CardName: 'Demo Corp S.A. de C.V.' },
    { whscode: 'CAFE-03', whsdesc: 'Cafetería Planta 1',   Zona: 'ZONA 2', Contrato: 'CONT-B', CardName: 'Corporativo Demo S.A.' },
    { whscode: 'CAFE-04', whsdesc: 'Cafetería Planta 2',   Zona: 'ZONA 2', Contrato: 'CONT-B', CardName: 'Corporativo Demo S.A.' },
    { whscode: 'CAFE-05', whsdesc: 'Cafetería Corporativo', Zona: 'ZONA 3', Contrato: 'CONT-C', CardName: 'Holding Demo Group' },
    { whscode: 'CAFE-06', whsdesc: 'Cafetería Almacén Central', Zona: 'ZONA 3', Contrato: 'CONT-C', CardName: 'Holding Demo Group' },
];

const ventasItems = [
    { id: 1, CardCode: 'C-DEMO-01', ItemCode: 'MENU-001', ItemName: 'Menú Ejecutivo',      Price: 65.00, TaxCode: 'IVAT16', WhsCode: 'CAFE-01', RequiereDetalle: 1, Status: 1, CardName: 'Demo Corp S.A. de C.V.' },
    { id: 2, CardCode: 'C-DEMO-01', ItemCode: 'MENU-002', ItemName: 'Menú Económico',      Price: 45.00, TaxCode: 'IVAT16', WhsCode: 'CAFE-01', RequiereDetalle: 0, Status: 1, CardName: 'Demo Corp S.A. de C.V.' },
    { id: 3, CardCode: 'C-DEMO-01', ItemCode: 'MENU-003', ItemName: 'Desayuno Completo',   Price: 38.00, TaxCode: 'IVAT16', WhsCode: 'CAFE-01', RequiereDetalle: 0, Status: 1, CardName: 'Demo Corp S.A. de C.V.' },
    { id: 4, CardCode: 'C-DEMO-02', ItemCode: 'MENU-004', ItemName: 'Menú Vegetariano',    Price: 55.00, TaxCode: 'IVAT16', WhsCode: 'CAFE-02', RequiereDetalle: 1, Status: 1, CardName: 'Demo Corp S.A. de C.V.' },
    { id: 5, CardCode: 'C-DEMO-02', ItemCode: 'MENU-005', ItemName: 'Menú Especial',       Price: 75.00, TaxCode: 'IVAT16', WhsCode: 'CAFE-02', RequiereDetalle: 1, Status: 1, CardName: 'Demo Corp S.A. de C.V.' },
    { id: 6, CardCode: 'C-DEMO-03', ItemCode: 'MENU-006', ItemName: 'Charola Estándar',    Price: 50.00, TaxCode: 'IVAT16', WhsCode: 'CAFE-03', RequiereDetalle: 0, Status: 1, CardName: 'Corporativo Demo S.A.' },
    { id: 7, CardCode: 'C-DEMO-03', ItemCode: 'MENU-007', ItemName: 'Cena Nocturna',       Price: 40.00, TaxCode: 'IVAT16', WhsCode: 'CAFE-03', RequiereDetalle: 0, Status: 1, CardName: 'Corporativo Demo S.A.' },
    { id: 8, CardCode: 'C-DEMO-04', ItemCode: 'MENU-008', ItemName: 'Menú Diet',           Price: 60.00, TaxCode: 'IVAT16', WhsCode: 'CAFE-04', RequiereDetalle: 1, Status: 1, CardName: 'Corporativo Demo S.A.' },
];

const dietas = [
    { id: 1, NombreDieta: 'Normal',       Activo: 1, WhsCode: 'CAFE-01', DietaId: 1, whsdesc: 'Cafetería Torre Norte' },
    { id: 2, NombreDieta: 'Vegetariana',  Activo: 1, WhsCode: 'CAFE-01', DietaId: 2, whsdesc: 'Cafetería Torre Norte' },
    { id: 3, NombreDieta: 'Vegana',       Activo: 1, WhsCode: 'CAFE-02', DietaId: 1, whsdesc: 'Cafetería Torre Sur'  },
    { id: 4, NombreDieta: 'Sin Gluten',   Activo: 1, WhsCode: 'CAFE-02', DietaId: 3, whsdesc: 'Cafetería Torre Sur'  },
    { id: 5, NombreDieta: 'Hiposódica',   Activo: 0, WhsCode: 'CAFE-03', DietaId: 4, whsdesc: 'Cafetería Planta 1'  },
];

const items = [
    { itemcode: 'MP-001', descripcion: 'Arroz Blanco',       tipo: 'Kg',    codigo_general: 'GEN-001', factor: 1, Zona_1: 22.50, Zona_2: 23.00, Zona_3: 24.00 },
    { itemcode: 'MP-002', descripcion: 'Frijol Negro',       tipo: 'Kg',    codigo_general: 'GEN-002', factor: 1, Zona_1: 35.00, Zona_2: 36.00, Zona_3: 37.00 },
    { itemcode: 'MP-003', descripcion: 'Pollo Entero',       tipo: 'Kg',    codigo_general: 'GEN-003', factor: 1, Zona_1: 85.00, Zona_2: 87.00, Zona_3: 90.00 },
    { itemcode: 'MP-004', descripcion: 'Carne Molida',       tipo: 'Kg',    codigo_general: 'GEN-004', factor: 1, Zona_1: 120.0, Zona_2: 122.0, Zona_3: 125.0 },
    { itemcode: 'MP-005', descripcion: 'Tomate Bola',        tipo: 'Kg',    codigo_general: 'GEN-005', factor: 1, Zona_1: 28.00, Zona_2: 29.00, Zona_3: 30.00 },
    { itemcode: 'MP-006', descripcion: 'Cebolla Blanca',     tipo: 'Kg',    codigo_general: 'GEN-006', factor: 1, Zona_1: 20.00, Zona_2: 21.00, Zona_3: 22.00 },
    { itemcode: 'MP-007', descripcion: 'Aceite Vegetal',     tipo: 'Litro', codigo_general: 'GEN-007', factor: 1, Zona_1: 45.00, Zona_2: 46.00, Zona_3: 47.00 },
    { itemcode: 'MP-008', descripcion: 'Tortillas de Maíz',  tipo: 'Paquete', codigo_general: 'GEN-008', factor: 30, Zona_1: 18.00, Zona_2: 18.50, Zona_3: 19.00 },
    { itemcode: 'MP-009', descripcion: 'Pan de Caja Blanco', tipo: 'Paquete', codigo_general: 'GEN-009', factor: 20, Zona_1: 32.00, Zona_2: 33.00, Zona_3: 34.00 },
    { itemcode: 'MP-010', descripcion: 'Leche Entera',       tipo: 'Litro', codigo_general: 'GEN-010', factor: 1, Zona_1: 24.00, Zona_2: 25.00, Zona_3: 26.00 },
];

const now = new Date();
const daysAgo = (n) => new Date(now - n * 86400000).toISOString();

const recordedOrders = [
    { id: 1, username: 'supervisor1@democorp.com', whscode: 'CAFE-01', cardcode: 'C-DEMO-01', docentry: 1001, docnum: 5001, itemcode: 'MENU-001', quantity: 85, price: 65.00, taxcode: 'IVAT16', docdate: daysAgo(1), TipoServicio: 'Comida', Fecha: daysAgo(1), Almacen: 'CAFE-01', Ventas_Del_Dia: 5525, Consumos_Del_Dia: 4250, Charolas_Vendidas: 85, Relacion_Consumo_Charola: 50.0 },
    { id: 2, username: 'supervisor1@democorp.com', whscode: 'CAFE-01', cardcode: 'C-DEMO-01', docentry: 1002, docnum: 5002, itemcode: 'MENU-002', quantity: 120, price: 45.00, taxcode: 'IVAT16', docdate: daysAgo(1), TipoServicio: 'Cena', Fecha: daysAgo(2), Almacen: 'CAFE-02', Ventas_Del_Dia: 3800, Consumos_Del_Dia: 2900, Charolas_Vendidas: 72, Relacion_Consumo_Charola: 40.3 },
    { id: 3, username: 'supervisor2@democorp.com', whscode: 'CAFE-02', cardcode: 'C-DEMO-02', docentry: 1003, docnum: 5003, itemcode: 'MENU-004', quantity: 60,  price: 55.00, taxcode: 'IVAT16', docdate: daysAgo(2), TipoServicio: 'Comida', Fecha: daysAgo(3), Almacen: 'CAFE-01', Ventas_Del_Dia: 5525, Consumos_Del_Dia: 4250, Charolas_Vendidas: 85, Relacion_Consumo_Charola: 50.0 },
    { id: 4, username: 'supervisor2@democorp.com', whscode: 'CAFE-02', cardcode: 'C-DEMO-02', docentry: 1004, docnum: 5004, itemcode: 'MENU-005', quantity: 45,  price: 75.00, taxcode: 'IVAT16', docdate: daysAgo(3), TipoServicio: 'Desayuno', Fecha: daysAgo(4), Almacen: 'CAFE-03', Ventas_Del_Dia: 4200, Consumos_Del_Dia: 3100, Charolas_Vendidas: 68, Relacion_Consumo_Charola: 45.6 },
    { id: 5, username: 'admin@democorp.com',       whscode: 'CAFE-03', cardcode: 'C-DEMO-03', docentry: 1005, docnum: 5005, itemcode: 'MENU-006', quantity: 95,  price: 50.00, taxcode: 'IVAT16', docdate: daysAgo(4), TipoServicio: 'Comida', Fecha: daysAgo(5), Almacen: 'CAFE-04', Ventas_Del_Dia: 3950, Consumos_Del_Dia: 3000, Charolas_Vendidas: 62, Relacion_Consumo_Charola: 48.4 },
    { id: 6, username: 'admin@democorp.com',       whscode: 'CAFE-05', cardcode: 'C-DEMO-04', docentry: 1006, docnum: 5006, itemcode: 'MENU-008', quantity: 40,  price: 60.00, taxcode: 'IVAT16', docdate: daysAgo(5), TipoServicio: 'Comida', Fecha: daysAgo(1), Almacen: 'CAFE-05', Ventas_Del_Dia: 2400, Consumos_Del_Dia: 1800, Charolas_Vendidas: 40, Relacion_Consumo_Charola: 45.0 },
    // VentasConAtraso shape
    { whscode: 'CAFE-01', whsdesc: 'Cafetería Torre Norte', ultima_fecha: daysAgo(1), horas_atraso: 18 },
    { whscode: 'CAFE-02', whsdesc: 'Cafetería Torre Sur',   ultima_fecha: daysAgo(0), horas_atraso: 2  },
    { whscode: 'CAFE-03', whsdesc: 'Cafetería Planta 1',    ultima_fecha: daysAgo(3), horas_atraso: 72 },
];

const inventarioFisico = [
    { id: 1, email_operador: 'supervisor1@democorp.com', codigo_almacen: 'CAFE-01', codigo_articulo: 'MP-001', cantidad_fisica: 45.5, fecha_conteo: daysAgo(0), stock_fisico: 45.5, stock_teorico: 48.0, diferencia: -2.5, descripcion: 'Arroz Blanco', itemcode: 'MP-001', whscode: 'CAFE-01', whsdesc: 'Cafetería Torre Norte', horas_atraso: 6, dias_atraso: 0, ultima_fecha: daysAgo(0) },
    { id: 2, email_operador: 'supervisor1@democorp.com', codigo_almacen: 'CAFE-01', codigo_articulo: 'MP-002', cantidad_fisica: 22.0, fecha_conteo: daysAgo(0), stock_fisico: 22.0, stock_teorico: 25.0, diferencia: -3.0, descripcion: 'Frijol Negro',  itemcode: 'MP-002', whscode: 'CAFE-01', whsdesc: 'Cafetería Torre Norte', horas_atraso: 6, dias_atraso: 0, ultima_fecha: daysAgo(0) },
    { id: 3, email_operador: 'supervisor2@democorp.com', codigo_almacen: 'CAFE-02', codigo_articulo: 'MP-003', cantidad_fisica: 18.0, fecha_conteo: daysAgo(1), stock_fisico: 18.0, stock_teorico: 20.0, diferencia: -2.0, descripcion: 'Pollo Entero',  itemcode: 'MP-003', whscode: 'CAFE-02', whsdesc: 'Cafetería Torre Sur',   horas_atraso: 30, dias_atraso: 1, ultima_fecha: daysAgo(1) },
    { id: 4, email_operador: 'supervisor2@democorp.com', codigo_almacen: 'CAFE-03', codigo_articulo: 'MP-004', cantidad_fisica: 12.5, fecha_conteo: daysAgo(3), stock_fisico: 12.5, stock_teorico: 15.0, diferencia: -2.5, descripcion: 'Carne Molida',  itemcode: 'MP-004', whscode: 'CAFE-03', whsdesc: 'Cafetería Planta 1',   horas_atraso: 78, dias_atraso: 3, ultima_fecha: daysAgo(3) },
    { id: 5, email_operador: 'admin@democorp.com',       codigo_almacen: 'CAFE-04', codigo_articulo: 'MP-007', cantidad_fisica: 30.0, fecha_conteo: daysAgo(0), stock_fisico: 30.0, stock_teorico: 30.0, diferencia:  0.0, descripcion: 'Aceite Vegetal', itemcode: 'MP-007', whscode: 'CAFE-04', whsdesc: 'Cafetería Planta 2',   horas_atraso: 4, dias_atraso: 0, ultima_fecha: daysAgo(0) },
];

const movimientosInventario = [
    { id: 1, origen_web: 'Recepcion', codigo_almacen: 'CAFE-01', codigo_articulo: 'MP-001', cantidad_enviada: 50.0, precio_unitario: 22.50, fecha_envio: daysAgo(5), UsuarioEmail: 'supervisor1@democorp.com' },
    { id: 2, origen_web: 'CONSUMO',   codigo_almacen: 'CAFE-01', codigo_articulo: 'MP-001', cantidad_enviada: 4.5,  precio_unitario: 22.50, fecha_envio: daysAgo(1), UsuarioEmail: 'supervisor1@democorp.com' },
    { id: 3, origen_web: 'Recepcion', codigo_almacen: 'CAFE-02', codigo_articulo: 'MP-003', cantidad_enviada: 20.0, precio_unitario: 85.00, fecha_envio: daysAgo(4), UsuarioEmail: 'supervisor2@democorp.com' },
    { id: 4, origen_web: 'CONSUMO',   codigo_almacen: 'CAFE-02', codigo_articulo: 'MP-003', cantidad_enviada: 2.0,  precio_unitario: 85.00, fecha_envio: daysAgo(1), UsuarioEmail: 'supervisor2@democorp.com' },
    { codigo_articulo: 'MP-001', stock_total: 45.5 },
    { codigo_articulo: 'MP-002', stock_total: 22.0 },
    { codigo_articulo: 'MP-003', stock_total: 18.0 },
];

const usuarios = [
    { id: 1, email: 'admin@democorp.com',       rol: 'admin',   Modulo: 'Admin',     Accion: 'Login', ReferenciaID: '1', Usuario: 'admin@democorp.com',       Sucursal: 'Corporativo',   Fecha: daysAgo(0) },
    { id: 2, email: 'supervisor1@democorp.com',  rol: 'manager', Modulo: 'Ventas',    Accion: 'Pedido Creado', ReferenciaID: '5001', Usuario: 'supervisor1@democorp.com',  Sucursal: 'CAFE-01', Fecha: daysAgo(1) },
    { id: 3, email: 'supervisor2@democorp.com',  rol: 'user',    Modulo: 'Inventario Físico', Accion: 'Conteo Guardado', ReferenciaID: '3', Usuario: 'supervisor2@democorp.com', Sucursal: 'CAFE-03', Fecha: daysAgo(3) },
];

const usuarioAlmacenes = [
    { ID: 1, email: 'supervisor1@democorp.com', whscode: 'CAFE-01' },
    { ID: 2, email: 'supervisor1@democorp.com', whscode: 'CAFE-02' },
    { ID: 3, email: 'supervisor2@democorp.com', whscode: 'CAFE-03' },
    { ID: 4, email: 'supervisor2@democorp.com', whscode: 'CAFE-04' },
];

const registroEntradas = [
    { id: 1, fecha_recibido: daysAgo(1), usuario: 'supervisor1@democorp.com', almacen: 'CAFE-01', orden_compra: '10001', referencia_factura: 'FAC-001', item_code: 'MP-001', item_nombre: 'Arroz Blanco', cantidad: 50.0, precio_unitario: 22.50, DocDate: daysAgo(1), WhsCode: 'CAFE-01', DocNum: '10001', ItemCode: 'MP-001', ItemName: 'Arroz Blanco', NumAtCard: 'FAC-001', Quantity: 50.0, Price: 22.50, DocTotal: 1125.0, EmailUsuario: 'supervisor1@democorp.com', Contrato: 'CONT-A', CardName: 'Demo Corp S.A. de C.V.' },
    { id: 2, fecha_recibido: daysAgo(2), usuario: 'supervisor1@democorp.com', almacen: 'CAFE-01', orden_compra: '10002', referencia_factura: 'FAC-002', item_code: 'MP-003', item_nombre: 'Pollo Entero', cantidad: 20.0, precio_unitario: 85.00, DocDate: daysAgo(2), WhsCode: 'CAFE-01', DocNum: '10002', ItemCode: 'MP-003', ItemName: 'Pollo Entero', NumAtCard: 'FAC-002', Quantity: 20.0, Price: 85.00, DocTotal: 1700.0, EmailUsuario: 'supervisor1@democorp.com', Contrato: 'CONT-A', CardName: 'Demo Corp S.A. de C.V.' },
    { id: 3, fecha_recibido: daysAgo(3), usuario: 'supervisor2@democorp.com', almacen: 'CAFE-03', orden_compra: '10003', referencia_factura: 'FAC-003', item_code: 'MP-004', item_nombre: 'Carne Molida', cantidad: 15.0, precio_unitario: 120.0, DocDate: daysAgo(3), WhsCode: 'CAFE-03', DocNum: '10003', ItemCode: 'MP-004', ItemName: 'Carne Molida', NumAtCard: 'FAC-003', Quantity: 15.0, Price: 120.0, DocTotal: 1800.0, EmailUsuario: 'supervisor2@democorp.com', Contrato: 'CONT-B', CardName: 'Corporativo Demo S.A.' },
];

const incidenciasHeader = [
    { Id: 1, Modulo: 'Incidencias', Accion: 'Reporte de Incidencia', ReferenciaID: '1', CreadoPor: 'supervisor1@democorp.com', Almacen: 'CAFE-01', FechaCreacion: daysAgo(2), Estado: 'Abierta',   Proveedor: 'Proveedor Demo 1', NumOrden: 'OC-1001', Descripcion: 'Mercancía incompleta en entrega' },
    { Id: 2, Modulo: 'Incidencias', Accion: 'Reporte de Incidencia', ReferenciaID: '2', CreadoPor: 'supervisor2@democorp.com', Almacen: 'CAFE-03', FechaCreacion: daysAgo(5), Estado: 'Cerrada',  Proveedor: 'Proveedor Demo 2', NumOrden: 'OC-1002', Descripcion: 'Producto en mal estado' },
    { Id: 3, Modulo: 'Incidencias', Accion: 'Reporte de Incidencia', ReferenciaID: '3', CreadoPor: 'admin@democorp.com',       Almacen: 'CAFE-05', FechaCreacion: daysAgo(1), Estado: 'En proceso', Proveedor: 'Proveedor Demo 1', NumOrden: 'OC-1003', Descripcion: 'Retraso en la entrega' },
];

const incidenciasDetail = [
    { Id: 1, IncidenciaId: 1, ItemCode: 'MP-001', ItemName: 'Arroz Blanco', CantidadAfectada: 5.0 },
    { Id: 2, IncidenciaId: 1, ItemCode: 'MP-002', ItemName: 'Frijol Negro', CantidadAfectada: 2.0 },
    { Id: 3, IncidenciaId: 2, ItemCode: 'MP-003', ItemName: 'Pollo Entero', CantidadAfectada: 8.5 },
];

const incidenciasEvidencia = [
    { Id: 1, IncidenciaId: 1, NombreArchivo: 'evidencia_001.jpg', UrlBlob: 'https://example.com/demo-evidence/1.jpg' },
    { Id: 2, IncidenciaId: 2, NombreArchivo: 'evidencia_002.jpg', UrlBlob: 'https://example.com/demo-evidence/2.jpg' },
];

const comparativoFisico = [
    { codigo_almacen: 'CAFE-01', codigo_articulo: 'MP-001', descripcion: 'Arroz Blanco',   stock_teorico: 48.0, stock_fisico: 45.5, diferencia: -2.5, fecha_conteo: daysAgo(0) },
    { codigo_almacen: 'CAFE-01', codigo_articulo: 'MP-002', descripcion: 'Frijol Negro',   stock_teorico: 25.0, stock_fisico: 22.0, diferencia: -3.0, fecha_conteo: daysAgo(0) },
    { codigo_almacen: 'CAFE-02', codigo_articulo: 'MP-003', descripcion: 'Pollo Entero',   stock_teorico: 20.0, stock_fisico: 18.0, diferencia: -2.0, fecha_conteo: daysAgo(1) },
    { codigo_almacen: 'CAFE-03', codigo_articulo: 'MP-004', descripcion: 'Carne Molida',   stock_teorico: 15.0, stock_fisico: 12.5, diferencia: -2.5, fecha_conteo: daysAgo(3) },
    { codigo_almacen: 'CAFE-04', codigo_articulo: 'MP-007', descripcion: 'Aceite Vegetal', stock_teorico: 30.0, stock_fisico: 30.0, diferencia:  0.0, fecha_conteo: daysAgo(0) },
];

module.exports = {
    almacenes,
    ventasItems,
    dietas,
    items,
    recordedOrders,
    inventarioFisico,
    movimientosInventario,
    usuarios,
    usuarioAlmacenes,
    registroEntradas,
    incidenciasHeader,
    incidenciasDetail,
    incidenciasEvidencia,
    comparativoFisico,
};
