import React, { useState, useMemo } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { Search, Save, AlertTriangle, Loader2, Calculator } from 'lucide-react';
import Select from 'react-select';
import { customSelectStyles } from '../../../utils/selectStyles';
import { toast } from 'sonner';

const CierreMes = ({ almacenes }) => {
    const { authFetch } = useAuth();
    const [loading, setLoading] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [sales, setSales] = useState([]);
    const [expandedId, setExpandedId] = useState(null);
    const [tempLines, setTempLines] = useState([]);
    
    const [filtros, setFiltros] = useState({
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        whsCode: '',
        cliente: ''
    });

    const clienteOptions = useMemo(() => {
        if (!almacenes) return [];
        const clienteMap = new Map();
        almacenes.forEach(al => {
            const val = al.CardName || al.Contrato;
            const lbl = al.Contrato || al.CardName;
            if (val) clienteMap.set(val, lbl);
        });
        return [
            { value: '', label: 'CLIENTE (TODOS)' },
            ...Array.from(clienteMap.entries()).map(([value, label]) => ({ value, label }))
        ];
    }, [almacenes]);

    const almacenOptions = useMemo(() => {
        return [
            { value: '', label: 'ALMACÉN (TODOS)' }, 
            ...(almacenes || []).map(al => ({ value: al.whscode, label: al.whsdesc }))
        ];
    }, [almacenes]);

    const fetchSapSales = async () => {
        if (!filtros.whsCode && !filtros.cliente) {
            return toast.warning("Selecciona al menos un Cliente o un Almacén");
        }
        setLoading(true);
        try {
            const params = new URLSearchParams({
                startDate: filtros.startDate,
                endDate: filtros.endDate,
                whsCode: filtros.whsCode,
                cardName: filtros.cliente
            }).toString();

            const res = await authFetch.get(`/api/ventas/sap-orders?${params}`);
            setSales(Array.isArray(res.data) ? res.data : []);
            if (res.data.length === 0) toast.info("No se encontraron ventas.");
        } catch (error) {
            toast.error("Error al consultar SAP");
        } finally {
            setLoading(false);
        }
    };

    const startEdit = (sale) => {
        setExpandedId(sale.DocEntry);
        setTempLines(JSON.parse(JSON.stringify(sale.DocumentLines)));
    };

    const handleSaveUpdate = async (docEntry) => {
        setEnviando(true);
        
        // Enviamos las líneas con su cantidad total y su desglose detallado
        const payload = {
            DocumentLines: tempLines.map(line => ({
                LineNum: line.LineNum,
                ItemCode: line.ItemCode,
                Quantity: parseFloat(line.Quantity || 0),
                desglose: line.desglose // Enviamos el desglose para que el controlador actualice SQL
            }))
        };

        try {
            await authFetch.patch(`/api/ventas/sap-orders/${docEntry}`, payload);
            toast.success("SAP y SQL sincronizados correctamente");
            setExpandedId(null);
            fetchSapSales();
        } catch (error) {
            toast.error(error.response?.data?.message || "No se pudo actualizar la venta");
        } finally {
            setEnviando(false);
        }
    };

    // Función para manejar el cambio en una dieta específica y recalcular el total de la línea
    const handleDietaChange = (lineIdx, dietaIdx, valor) => {
        const numValor = parseFloat(valor || 0);
        const newLines = [...tempLines];
        
        // 1. Actualizar el valor de la dieta
        newLines[lineIdx].desglose[dietaIdx].Cantidad = numValor;
        
        // 2. Recalcular el total de la línea (La suma de todas las dietas de esa línea)
        const nuevoTotal = newLines[lineIdx].desglose.reduce((sum, d) => sum + parseFloat(d.Cantidad || 0), 0);
        newLines[lineIdx].Quantity = nuevoTotal;

        setTempLines(newLines);
    };

    return (
        <div className="mt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Filtros */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl mb-10 grid grid-cols-1 md:grid-cols-5 gap-4 items-end text-gray-700 border border-gray-100">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Cliente</label>
                    <Select 
                        options={clienteOptions}
                        styles={customSelectStyles}
                        value={clienteOptions.find(o => o.value === filtros.cliente)}
                        onChange={(opt) => setFiltros({...filtros, cliente: opt.value})}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Almacén</label>
                    <Select 
                        options={almacenOptions}
                        styles={customSelectStyles}
                        value={almacenOptions.find(o => o.value === filtros.whsCode)}
                        onChange={(opt) => setFiltros({...filtros, whsCode: opt.value})}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Desde</label>
                    <input type="date" value={filtros.startDate} onChange={e => setFiltros({...filtros, startDate: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl border-none font-bold outline-none focus:ring-2 focus:ring-violet-200 text-xs" />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Hasta</label>
                    <input type="date" value={filtros.endDate} onChange={e => setFiltros({...filtros, endDate: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl border-none font-bold outline-none focus:ring-2 focus:ring-violet-200 text-xs" />
                </div>
                <button onClick={fetchSapSales} className="bg-[#001e36] text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg">
                    <Search size={18} /> Buscar Ventas
                </button>
            </div>

            {/* Tabla */}
            <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-2xl text-gray-800 mb-20 border border-gray-50">
                <div className="bg-naranja-bersa text-white p-4 font-black text-[11px] tracking-widest px-10 italic uppercase flex justify-between items-center">
                    <span>Órdenes de Venta Detectadas en SAP</span>
                    <span className="bg-white/20 px-3 py-1 rounded-full text-[9px]">EDICIÓN DE CIERRE</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b">
                            <tr>
                                <th className="px-8 py-5">Orden SAP</th>
                                <th className="px-8 py-5">Fecha</th>
                                <th className="px-8 py-5">Cliente / Referencia</th>
                                <th className="px-8 py-5 text-center">Cant. Total</th>
                                <th className="px-8 py-5 text-right">Total</th>
                                <th className="px-8 py-5 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr><td colSpan="6" className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-naranja-bersa" size={40}/></td></tr>
                            ) : sales.map(sale => {
                                const isExpanded = expandedId === sale.DocEntry;
                                return (
                                    <React.Fragment key={sale.DocEntry}>
                                        <tr className={`hover:bg-violet-50/20 transition-colors ${isExpanded ? 'bg-violet-50/50' : ''}`}>
                                            <td className="px-8 py-5 font-black text-[#001e36]">#{sale.DocNum}</td>
                                            <td className="px-8 py-5 font-bold text-gray-500">{sale.DocDate?.split('T')[0]}</td>
                                            <td className="px-8 py-5">
                                                <p className="font-bold text-gray-600 uppercase text-xs">{sale.CardName}</p>
                                                <p className="text-[9px] font-black text-gray-400">{sale.NumAtCard || 'SIN REF'}</p>
                                            </td>
                                            <td className="px-8 py-5 text-center font-bold text-gray-600">
                                                {sale.DocumentLines?.reduce((acc, l) => acc + parseFloat(l.Quantity), 0).toLocaleString()}
                                            </td>
                                            <td className="px-8 py-5 text-right font-mono font-black text-[#001e36]">${Number(sale.DocTotal).toFixed(2)}</td>
                                            <td className="px-8 py-5 text-center">
                                                <button onClick={() => isExpanded ? setExpandedId(null) : startEdit(sale)} className="text-naranja-bersa font-black text-[10px] uppercase hover:underline">
                                                    {isExpanded ? 'Cancelar' : 'Ajustar Cierre'}
                                                </button>
                                            </td>
                                        </tr>
                                        {isExpanded && (
                                            <tr>
                                                <td colSpan="6" className="p-10 bg-gray-50/50 border-y border-violet-100">
                                                    <div className="max-w-5xl mx-auto space-y-6">
                                                        <div className="flex justify-between items-center">
                                                            <div>
                                                                <h4 className="text-[12px] font-black uppercase text-[#001e36] flex items-center gap-2">
                                                                    <AlertTriangle size={16} className="text-naranja-bersa"/> 
                                                                    Desglose Detallado de Dietas
                                                                </h4>
                                                                <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">
                                                                    Modifica las cantidades y el total para SAP se actualizará solo.
                                                                </p>
                                                            </div>
                                                            <button 
                                                                onClick={() => handleSaveUpdate(sale.DocEntry)} 
                                                                disabled={enviando} 
                                                                className="bg-green-600 hover:bg-green-700 text-white px-10 py-3 rounded-2xl text-[11px] font-black uppercase flex items-center gap-2 shadow-xl active:scale-95 transition-all disabled:opacity-50"
                                                            >
                                                                {enviando ? <Loader2 className="animate-spin" size={14}/> : <><Save size={16}/> Sincronizar SAP y SQL</>}
                                                            </button>
                                                        </div>

                                                        <div className="grid grid-cols-1 gap-6">
                                                            {tempLines.map((line, lIdx) => (
                                                                <div key={lIdx} className="bg-white rounded-[2rem] border border-gray-200 shadow-sm overflow-hidden">
                                                                    {/* Encabezado de la línea (Artículo SAP) */}
                                                                    <div className="bg-[#001e36] text-white p-4 px-8 flex justify-between items-center">
                                                                        <div>
                                                                            <p className="text-[9px] font-bold text-orange-300 uppercase tracking-widest">{line.ItemCode}</p>
                                                                            <p className="text-xs font-black uppercase">{line.ItemDescription}</p>
                                                                        </div>
                                                                        <div className="bg-white/10 px-6 py-2 rounded-xl text-right">
                                                                            <p className="text-[8px] font-black uppercase text-violet-200">Total SAP</p>
                                                                            <p className="text-lg font-black">{line.Quantity}</p>
                                                                        </div>
                                                                    </div>

                                                                    {/* Grid de Dietas (Tabla Hija) */}
                                                                    <div className="p-8 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                                                        {line.desglose && line.desglose.length > 0 ? (
                                                                            line.desglose.map((dieta, dIdx) => (
                                                                                <div key={dIdx} className="bg-gray-50 p-3 rounded-2xl border border-gray-100 hover:border-violet-200 transition-all">
                                                                                    <label className="text-[8px] font-black text-gray-400 uppercase block mb-1 truncate">
                                                                                        {dieta.NombreDieta} 
                                                                                        {dieta.TipoServicio && (
                                                                                            <span className="ml-1 text-blue-500">({dieta.TipoServicio.substring(0,1)})</span>
                                                                                        )}
                                                                                    </label>
                                                                                    <div className="relative">
                                                                                        <input 
                                                                                            type="number"
                                                                                            min="0"
                                                                                            className="w-full bg-white border-none rounded-lg p-2 font-black text-azul-bersa text-sm focus:ring-2 focus:ring-violet-200 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                                            onWheel={(e) => e.target.blur()}
                                                                                            value={dieta.Cantidad}
                                                                                            onChange={(e) => handleDietaChange(lIdx, dIdx, e.target.value)}
                                                                                        />
                                                                                    </div>
                                                                                </div>
                                                                            ))
                                                                        ) : (
                                                                            <div className="col-span-full py-4 text-center text-gray-400 font-bold text-[10px] uppercase italic">
                                                                                Esta línea no tiene desglose de dietas registrado en SQL.
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default CierreMes;