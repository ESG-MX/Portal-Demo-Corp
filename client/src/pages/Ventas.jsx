import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useVentas } from '../hooks/useVentas';
import { toast } from 'sonner';
import Select from 'react-select';
import { customSelectStyles } from '../utils/selectStyles';
import { FileText, Loader2 } from 'lucide-react';
import HistorialVentas from '../components/features/ventas/HistorialVentas';
import CostoCharola from '../components/features/ventas/CostoCharola';
import CierreMes from '../components/features/ventas/CierreMes';

const Ventas = () => {
    const { userProfile, authFetch } = useAuth();
    const {
        almacenes, articulos, carrito, loading, cargarArticulos, setCarrito,
        historial, fetchHistorial, loadingHistorial
    } = useVentas(userProfile);

    const [activeTab, setActiveTab] = useState('venta');
    const [selectedWhs, setSelectedWhs] = useState('');
    const [selectedItem, setSelectedItem] = useState('');
    const [cantidad, setCantidad] = useState(1);
    const [dietasCantidades, setDietasCantidades] = useState({});
    const [enviando, setEnviando] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [tipoServicio, setTipoServicio] = useState('Desayuno');

    // Identificar si el usuario tiene rol de MP o Admin
    const isMP = useMemo(() => {
        if (!userProfile) return false;
        const role = (userProfile.role || '').toLowerCase().trim();
        const email = (userProfile.email || userProfile.username || '').toLowerCase().trim();
        return ['mp', 'admin'].includes(role);
    }, [userProfile]);

    const role = userProfile?.role?.toLowerCase() || '';
    if (role.includes('comp') || role.includes('mc')) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[500px]">
                <div className="bg-red-50 text-red-600 p-6 rounded-xl flex flex-col items-center">
                    <span className="text-3xl mb-4">🔒</span>
                    <h2 className="text-xl font-bold">Acceso Denegado</h2>
                    <p className="mt-2 text-red-500/80">Tu nivel de acceso no tiene autorización para este módulo.</p>
                </div>
            </div>
        );
    }

    // Objeto del item seleccionado actualmente en el buscador
    const itemSeleccionadoObj = useMemo(() => {
        if (!selectedItem || !articulos) return null;
        return articulos.find(a => String(a.ItemCode) === String(selectedItem));
    }, [selectedItem, articulos]);

    // Encontrar la fecha más reciente reportada para este almacén
    const ultimaFechaReportada = useMemo(() => {
        if (!historial || historial.length === 0 || !selectedWhs) return null;
        const fechas = historial
            .filter(h => String(h.WhsCode) === String(selectedWhs))
            .map(h => {
                const dStr = typeof h.DocDate === 'string' ? h.DocDate.split('T')[0] : '';
                return new Date(dStr + 'T00:00:00').getTime();
            });
        if (fechas.length === 0) return null;
        return new Date(Math.max(...fechas));
    }, [historial, selectedWhs]);

    // Determinar si hay un salto de días (Bloqueo para no saltarse ventas)
    const haySaltoDeDias = useMemo(() => {
        if (!ultimaFechaReportada) return false;
        const fechaSeleccionada = new Date(selectedDate + 'T00:00:00');
        // Diferencia en días naturales
        const diffDays = Math.round((fechaSeleccionada.getTime() - ultimaFechaReportada.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays > 1;
    }, [ultimaFechaReportada, selectedDate]);

    // Lógica para detectar si el envío actual parece un duplicado (Misma Fecha, Almacén y TipoServicio)
    const esPosibleDuplicado = useMemo(() => {
        if (!historial || historial.length === 0 || carrito.length === 0) return false;

        // Obtener servicios únicos en el carrito actual
        const serviciosEnCarrito = [...new Set(carrito.map(i => i.TipoServicio))];
        
        // Filtrar historial por fecha y almacén
        const registrosHoy = historial.filter(h => 
            (h.DocDate ? h.DocDate.split('T')[0] : '') === selectedDate &&
            String(h.WhsCode) === String(selectedWhs)
        );

        // Si alguno de los servicios en el carrito ya existe en el historial de hoy
        return serviciosEnCarrito.some(servicio => 
            registrosHoy.some(reg => String(reg.TipoServicio) === String(servicio))
        );

    }, [historial, carrito, selectedDate, selectedWhs]);

    // Función para agregar artículos al detalle local (Carrito)
    const handleAgregar = () => {
        if (!selectedItem || !itemSeleccionadoObj) return toast.warning("Seleccione un artículo");
        
        let totalQty = 0;
        let desgloseParaBackend = [];

        if (itemSeleccionadoObj.RequiereDetalle) {
            desgloseParaBackend = (itemSeleccionadoObj.DietasDisponibles || [])
                .map(d => ({
                    id: d.id,
                    NombreDieta: d.NombreDieta,
                    Cantidad: parseFloat(dietasCantidades[d.id] || 0)
                }))
                .filter(d => d.Cantidad > 0);

            totalQty = desgloseParaBackend.reduce((acc, curr) => acc + curr.Cantidad, 0);
            if (totalQty <= 0) return toast.error("Debe ingresar al menos una dieta.");
        } else {
            if (!cantidad || cantidad <= 0) return toast.warning("Cantidad inválida");
            totalQty = parseFloat(cantidad);
        }

        setCarrito([...carrito, { 
            ...itemSeleccionadoObj, 
            Quantity: totalQty, 
            desglose: desgloseParaBackend,
            TipoServicio: tipoServicio 
        }]);
        setSelectedItem('');
        setCantidad(1);
        setDietasCantidades({});
        toast.success("Agregado al detalle local");
    };

    // Función principal para enviar a SAP
    const handleEnviarSAP = async (force = false) => {
        if (carrito.length === 0) return toast.warning("No hay información para enviar.");
        
        const isAdmin = userProfile?.role?.toLowerCase() === 'admin';

        if (haySaltoDeDias && !force) {
            const proximoDia = new Date(ultimaFechaReportada);
            proximoDia.setDate(proximoDia.getDate() + 1);
            return toast.error(`BLOQUEO: Falta reportar el día ${proximoDia.toLocaleDateString()}. No puedes saltarte días.`);
        }
        
        if (esPosibleDuplicado && !force) {
            const confirmar = window.confirm("⚠️ POSIBLE DUPLICADO DETECTADO: Ya existe una venta registrada en este almacén para esta fecha y este servicio. ¿Deseas continuar?");
            if (!confirmar) return;
        }

        setEnviando(true);
        console.log(">>> [LOG FRONT] INICIANDO ENVÍO A SAP <<<");

        try {
            const almacen = almacenes.find(a => a.whscode === selectedWhs);
            const fecha = new Date(selectedDate);
            const meses = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
            const numAtCard = `${almacen?.Abreviatura || ''} ${meses[fecha.getUTCMonth()]} ${fecha.getUTCDate()}`;

            // Construcción del objeto de la Orden
            const orderData = {
                CardCode: carrito[0].CardCode, 
                DocDate: selectedDate,    
                DocDueDate: selectedDate, 
                NumAtCard: numAtCard,
                U_ALMACEN: String(selectedWhs), 
                DocumentLines: carrito.map(item => ({
                    ItemCode: item.ItemCode, 
                    Quantity: item.Quantity, 
                    WarehouseCode: selectedWhs, 
                    Price: item.Price, 
                    TaxCode: item.TaxCode,
                    TipoServicio: item.TipoServicio,
                    // Enviamos desglose como string, el backend se encargará de guardarlo en SQL y quitarlo para SAP
                    U_Desglose: JSON.stringify(item.desglose) 
                }))
            };

            const payloadFinal = { 
                ...orderData, 
                force, 
                TipoServicio: "VENTA MIXTA" // Referencia para el encabezado
            };

            console.log(">>> [LOG FRONT] DATOS ENVIADOS AL SERVIDOR:", JSON.stringify(payloadFinal, null, 2));

            const res = await authFetch.post('/api/ventas/crear-pedido', payloadFinal); 

            if (res.data.success) {
                console.log(">>> [LOG FRONT] RESPUESTA EXITOSA DEL SERVIDOR:", res.data);
                toast.success(`SAP: Pedido #${res.data.message} creado.`);
                setCarrito([]);
                setSelectedWhs(''); 
            }
        } catch (err) { 
            // LOG DETALLADO DE ERROR EN CONSOLA F12
            console.error(">>> [LOG FRONT] ERROR EN LA PETICIÓN:");
            if (err.response) {
                console.error("Status Code:", err.response.status);
                console.error("Data de Error del Servidor:", err.response.data);
            } else {
                console.error("Error de conexión:", err.message);
            }

            if (err.response?.status === 409 && err.response?.data?.isDuplicate) {
                const reconfirmar = window.confirm(`🛑 SQL DETECTÓ DUPLICADO:\n${err.response.data.message}\n\n¿Deseas FORZAR el envío de todas formas?`);
                if (reconfirmar) {
                    handleEnviarSAP(true);
                }
            } else {
                // Muestra el mensaje de error que SAP nos regresó (si existe)
                const errorMsg = err.response?.data?.message || "Error al enviar a SAP";
                toast.error(errorMsg); 
                console.error(">>> [LOG FRONT] Mensaje mostrado al usuario:", errorMsg);
            }
        } finally { 
            setEnviando(false); 
        }
    };

    return (
        <div className="min-h-screen bg-azul-bersa p-6 md:p-12 font-sans text-white">
            {/* Encabezado */}
            <div className="max-w-7xl mx-auto mb-8 flex items-center gap-4">
                <div className="bg-naranja-bersa p-2 rounded-xl shadow-lg shadow-violet-500/30">
                    <FileText size={40} className="text-white" />
                </div>
                <h1 className="text-4xl font-black">Ventas</h1>
            </div>

            {/* Pestañas */}
            <div className="max-w-6xl mx-auto flex gap-4 mb-6 border-b border-white/10">
                <button 
                    onClick={() => setActiveTab('venta')} 
                    className={`pb-3 px-4 font-black text-sm border-b-4 transition-all ${activeTab === 'venta' ? 'border-naranja-bersa text-white' : 'border-transparent text-white/40 hover:text-white'}`}
                >
                    NUEVA VENTA
                </button>
                {isMP && (
                    <button 
                        onClick={() => setActiveTab('historial')} 
                        className={`pb-3 px-4 font-black text-sm border-b-4 transition-all ${activeTab === 'historial' ? 'border-naranja-bersa text-white' : 'border-transparent text-white/40 hover:text-white'}`}
                    >
                        HISTORIAL
                    </button>
                )}
                {isMP && (
                    <button 
                        onClick={() => setActiveTab('costo')} 
                        className={`pb-3 px-4 font-black text-sm border-b-4 transition-all ${activeTab === 'costo' ? 'border-naranja-bersa text-white' : 'border-transparent text-white/40 hover:text-white'}`}
                    >
                        COSTO CHAROLA
                    </button>
                )}
                {isMP && (
                    <button 
                        onClick={() => setActiveTab('cierre')} 
                        className={`pb-3 px-4 font-black text-sm border-b-4 transition-all ${activeTab === 'cierre' ? 'border-naranja-bersa text-white' : 'border-transparent text-white/40 hover:text-white'}`}
                    >
                        CIERRE DE MES
                    </button>
                )}
            </div>

            <div className="max-w-6xl mx-auto">
                {activeTab === 'venta' && (
                    <>
                        {/* Panel de Configuración de Venta */}
                        <div className="flex flex-col md:flex-row gap-6 items-stretch mb-12">
                            <div className="flex-1 bg-white rounded-[40px] p-10 shadow-2xl grid grid-cols-1 md:grid-cols-2 gap-8 text-gray-800 border border-gray-100">
                                
                                {/* Selección de Almacén */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-naranja-bersa uppercase ml-4">Almacen</label>
                                    <div className="border-2 border-violet-100 rounded-2xl p-2 bg-gray-50">
                                        <Select 
                                            options={almacenes.map(a => ({ value: a.whscode, label: a.whsdesc }))} 
                                            value={almacenes.find(a => a.whscode === selectedWhs) ? { value: selectedWhs, label: almacenes.find(a => a.whscode === selectedWhs).whsdesc } : null} 
                                            onChange={(opt) => { 
                                                setSelectedWhs(opt.value); 
                                                cargarArticulos(opt.value); 
                                                fetchHistorial({ whsCode: opt.value, limit: 100 }); 
                                            }} 
                                            styles={customSelectStyles} 
                                            placeholder="Seleccionar Almacén..." 
                                            isDisabled={carrito.length > 0} 
                                        />
                                    </div>
                                </div>

                                {/* Selección de Fecha */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-naranja-bersa uppercase ml-4">Fecha del Pedido</label>
                                    <div className="border-2 border-violet-100 rounded-2xl p-4 bg-gray-50">
                                        <input 
                                            type="date" 
                                            value={selectedDate} 
                                            onChange={(e) => setSelectedDate(e.target.value)} 
                                            className="w-full bg-transparent font-bold outline-none text-gray-700" 
                                        />
                                    </div>
                                </div>

                                {/* Selección de Tipo de Servicio */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-naranja-bersa uppercase ml-4">Tipo de Servicio</label>
                                    <div className="border-2 border-violet-100 rounded-2xl p-2 bg-gray-50">
                                        <Select 
                                            options={[
                                                { value: 'Desayuno', label: 'DESAYUNO' },
                                                { value: 'Comida', label: 'COMIDA' },
                                                { value: 'Cena', label: 'CENA' }
                                            ]} 
                                            value={{ value: tipoServicio, label: tipoServicio.toUpperCase() }} 
                                            onChange={(opt) => setTipoServicio(opt.value)} 
                                            styles={customSelectStyles} 
                                        />
                                    </div>
                                </div>

                                {/* Selección de Artículo */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-naranja-bersa uppercase ml-4">Artículo a Vender</label>
                                    <div className="border-2 border-violet-100 rounded-2xl p-2 bg-gray-50">
                                        <Select 
                                            options={articulos.map(art => ({ value: art.ItemCode, label: art.ItemName }))} 
                                            value={selectedItem ? { value: selectedItem, label: articulos.find(a => String(a.ItemCode) === String(selectedItem))?.ItemName } : null} 
                                            onChange={(opt) => setSelectedItem(opt?.value || '')} 
                                            styles={customSelectStyles} 
                                            placeholder="Buscar Artículo SAP..." 
                                            isDisabled={!selectedWhs} 
                                        />
                                    </div>
                                </div>

                                {/* Cantidad o Desglose de Dietas */}
                                <div className={`space-y-2 ${itemSeleccionadoObj?.RequiereDetalle ? 'md:col-span-2' : ''}`}>
                                    <label className="text-[10px] font-black text-naranja-bersa uppercase ml-4">
                                        {itemSeleccionadoObj?.RequiereDetalle ? 'Desglose de Dietas' : 'Cantidad'}
                                    </label>
                                    <div className="border-2 border-violet-100 rounded-2xl p-4 bg-gray-50 flex items-center min-h-[70px]">
                                        {itemSeleccionadoObj?.RequiereDetalle ? (
                                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-3 max-h-60 overflow-y-auto pr-4 custom-scrollbar">
                                                {itemSeleccionadoObj.DietasDisponibles?.map(dieta => (
                                                    <div key={dieta.id} className="flex justify-between items-center border-b border-violet-200 pb-1 hover:border-naranja-bersa transition-colors">
                                                        <span className="text-[10px] font-black text-gray-500 uppercase pr-4">{dieta.NombreDieta}</span>
                                                        <input 
                                                            type="number" 
                                                            className="w-16 text-right bg-white border border-violet-100 rounded text-xs font-black text-naranja-bersa outline-none px-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                                                            onWheel={(e) => e.target.blur()}
                                                            placeholder="0" 
                                                            value={dietasCantidades[dieta.id] || ''} 
                                                            onChange={(e) => setDietasCantidades({...dietasCantidades, [dieta.id]: e.target.value})} 
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <input 
                                                type="number" 
                                                value={cantidad} 
                                                    onChange={(e) => setCantidad(e.target.value)}
                                                    onWheel={(e) => e.target.blur()}
                                                    className="flex-1 bg-transparent font-bold text-gray-700 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                                                placeholder="0" 
                                            />
                                        )}
                                        <button 
                                            onClick={handleAgregar} 
                                            className="ml-4 bg-naranja-bersa text-white w-10 h-10 rounded-xl font-black text-xl shadow-lg hover:scale-110 active:scale-90 transition-all"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Botón Grande de Envío a SAP */}
                            <button 
                                onClick={() => handleEnviarSAP(false)}
                                disabled={enviando || carrito.length === 0 || (haySaltoDeDias && userProfile?.role?.toLowerCase() !== 'admin')}
                                className="bg-white border-2 border-naranja-bersa rounded-[45px] w-full md:w-36 flex flex-col items-center justify-center gap-8 py-12 shadow-2xl transition-all hover:bg-violet-50 active:scale-95 group disabled:opacity-50 disabled:grayscale"
                            >
                                <span className="text-azul-bersa font-black text-[13px] tracking-[0.2em] uppercase">
                                    {enviando ? '...' : 'ENVIAR'}
                                </span>
                                
                                <div className="text-naranja-bersa transform transition-transform group-hover:scale-125">
                                    {enviando ? (
                                        <Loader2 className="animate-spin" size={40} />
                                    ) : (
                                        <svg width="45" height="45" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M8 5v14l11-7z" />
                                        </svg>
                                    )}
                                </div>
                            </button>
                        </div>

                        {/* Listado de Artículos en Carrito Local */}
                        <div className="bg-white rounded-[30px] overflow-hidden shadow-2xl text-gray-800 border border-gray-100 mb-20">
                            <div className="bg-rojo-bersa text-white p-4 font-black text-[11px] tracking-widest px-10 italic uppercase">
                                DETALLE DE ENVÍO LOCAL (ANTES DE SAP)
                            </div>
                            <div className="p-10 min-h-[250px]">
                                {carrito.length === 0 ? (
                                    <div className="flex items-center justify-center h-40 text-gray-200 font-black italic text-4xl uppercase select-none">CARRITO VACÍO</div>
                                ) : (
                                    <div className="space-y-4">
                                        {carrito.map((item, index) => (
                                            <div key={index} className="flex justify-between items-center p-6 border-b border-gray-100 hover:bg-gray-50 rounded-2xl transition-colors">
                                                <div className="flex-1">
                                                    <p className="font-black text-azul-bersa text-lg uppercase leading-none mb-1">{item.ItemName}</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        <span className="text-[10px] font-bold text-gray-400 font-mono">Item Code: {item.ItemCode}</span>
                                                        <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md font-black uppercase">SERVICIO: {item.TipoServicio}</span>
                                                        {item.desglose?.length > 0 && item.desglose.map((d, i) => (
                                                            <span key={i} className="text-[10px] bg-violet-50 text-naranja-bersa px-2 py-0.5 rounded-md font-black uppercase">
                                                                {d.NombreDieta}: {d.Cantidad}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-8 text-right">
                                                    <div>
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase">Cantidad Total</p>
                                                        <p className="text-2xl font-bold text-gray-600">{item.Quantity}</p>
                                                    </div>
                                                    <button 
                                                        onClick={() => setCarrito(carrito.filter((_, i) => i !== index))} 
                                                        className="text-rojo-bersa font-black text-[10px] border-2 border-rojo-bersa px-6 py-2 rounded-full hover:bg-rojo-bersa hover:text-white transition-all uppercase active:scale-90"
                                                    >
                                                        Eliminar
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {/* Vista del Historial */}
                {activeTab === 'historial' && isMP && (
                    <HistorialVentas 
                        almacenes={almacenes}
                        historial={historial}
                        fetchHistorial={fetchHistorial}
                        loadingHistorial={loadingHistorial}
                        authFetch={authFetch}
                    />
                )}

                {/* Vista de Costo Charola */}
                {activeTab === 'costo' && isMP && (
                    <CostoCharola />
                )}

                {/* Vista de Corrección de Ventas SAP (Cierre de Mes) */}
                {activeTab === 'cierre' && isMP && (
                    <CierreMes 
                        almacenes={almacenes}
                    />
                )}
            </div>
        </div>
    );
};

export default Ventas;