import React, { useState, useEffect, useMemo } from 'react';
import Select from 'react-select';
import { Search, FileSpreadsheet, Loader2, ArrowLeft, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { customSelectStyles } from '../../../utils/selectStyles';

const HistorialEntradas = ({ authFetch }) => {
    const [almacenes, setAlmacenes] = useState([]);
    const [historial, setHistorial] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({ startDate: '', endDate: '', whsCode: '', contrato: '' });
    const [page, setPage] = useState(1);

    // Cargar lista de almacenes para los filtros
    useEffect(() => {
        const loadAlmacenes = async () => {
            if (!authFetch) return;
            try {
                const res = await authFetch.get('/api/ventas/almacenes');
                setAlmacenes(Array.isArray(res.data) ? res.data : []);
            } catch (e) { console.error("Error al cargar almacenes", e); }
        };
        loadAlmacenes();
    }, [authFetch]);

    const contratosDisponibles = useMemo(() => {
        const unique = [...new Set(almacenes.map(al => al.Contrato).filter(Boolean))];
        return unique.sort();
    }, [almacenes]);

    const contratoOptions = useMemo(() => [
        { value: '', label: 'CLIENTE (TODOS)' },
        ...contratosDisponibles.map(c => ({ value: c, label: c }))
    ], [contratosDisponibles]);

    const almacenOptions = useMemo(() => {
        const base = filters.contrato ? almacenes.filter(al => al.Contrato === filters.contrato) : almacenes;
        return [{ value: '', label: 'ALMACÉN (TODOS)' }, ...base.map(al => ({ value: al.whscode, label: al.whsdesc || al.whsname }))];
    }, [almacenes, filters.contrato]);

    // Resetear página cuando cambian los filtros principales para evitar resultados vacíos en páginas inexistentes
    useEffect(() => {
        setPage(1);
    }, [filters.whsCode, filters.contrato, filters.startDate, filters.endDate]);

    const fetchHistorial = async () => {
        if (!authFetch) return;
        setLoading(true);
        try {
            // Limpiamos los filtros para no enviar strings vacíos que puedan confundir a SQL Server
            const cleanFilters = {};
            Object.keys(filters).forEach(key => {
                if (filters[key] && filters[key] !== '' && filters[key] !== 'TODOS') {
                    cleanFilters[key] = filters[key];
                }
            });

            const params = new URLSearchParams({ ...cleanFilters, page, limit: 50 }).toString();
            const res = await authFetch.get(`/api/entradas/historial?${params}`);
            
            // Soporte para múltiples formatos de respuesta (Array directo o { data: [] })
            const data = Array.isArray(res.data) ? res.data : (res.data?.data || res.data?.recordset || []);
            setHistorial(data);
        } catch (e) { 
            setHistorial([]); // Limpiamos el estado en caso de error
            toast.error("Error al cargar historial"); 
        }
        finally { setLoading(false); }
    };

    useEffect(() => { 
        fetchHistorial(); 
    }, [authFetch, page, filters.whsCode, filters.contrato, filters.startDate, filters.endDate]);

    const handleDownload = () => {
        if (historial.length === 0) return toast.info("No hay datos para exportar");
        const headers = ["Fecha Recibido", "Usuario", "Almacén", "Orden Compra", "Item Code", "Descripción", "Referencia Factura", "Cantidad", "Precio Unitario", "Precio Total"];
        const csv = [headers.join(","), ...historial.map(h => [
            (h.fecha_recibido || h.DocDate || h.docdate || h.FechaSeleccionada) ? new Date(h.fecha_recibido || h.DocDate || h.docdate || h.FechaSeleccionada).toLocaleDateString('es-MX', { timeZone: 'UTC' }) : 'S/F',
            `"${h.usuario || h.UsuarioEmail || 'N/A'}"`,
            h.WhsCode || h.whscode || h.almacen, 
            h.DocNum || h.docnum || h.orden_compra, 
            h.ItemCode || h.itemcode || h.item_code, 
            `"${h.ItemName || h.itemname || h.item_nombre}"`, 
            `"${h.NumAtCard || h.numatcard || h.referencia_factura}"`,
            h.Quantity || h.quantity || h.cantidad, 
            h.precio_unitario || h.Price || h.price || h.PrecioUnitario, 
            h.precio_total || h.DocTotal || h.doctotal || ((h.cantidad || h.Quantity || h.quantity) * (h.precio_unitario || h.Price || h.price || 0))
        ].join(","))].join("\n");
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Historial_Entradas_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    return (
        <div className="animate-in fade-in duration-500">
            <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl mb-10 flex flex-col lg:flex-row justify-between items-end gap-6 border border-gray-100 text-gray-700">
                <form className="w-full lg:w-auto flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); fetchHistorial(); }}>
                    <div className="w-48">
                        <label className="text-[9px] font-black text-gray-400 uppercase ml-2 mb-1 block">Cliente</label>
                        <Select options={contratoOptions} styles={customSelectStyles} value={contratoOptions.find(o => o.value === filters.contrato)} onChange={opt => setFilters({...filters, contrato: opt.value})} placeholder="Cliente..." />
                    </div>
                    <div className="w-64">
                        <label className="text-[9px] font-black text-gray-400 uppercase ml-2 mb-1 block">Almacén</label>
                        <Select options={almacenOptions} styles={customSelectStyles} value={almacenOptions.find(o => o.value === filters.whsCode)} onChange={opt => setFilters({...filters, whsCode: opt.value})} placeholder="Almacén..." />
                    </div>
                    <div className="w-36">
                        <label className="text-[9px] font-black text-gray-400 uppercase ml-2 mb-1 block">Desde</label>
                        <input type="date" className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-azul-bersa outline-none" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} />
                    </div>
                    <div className="w-36">
                        <label className="text-[9px] font-black text-gray-400 uppercase ml-2 mb-1 block">Hasta</label>
                        <input type="date" className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-azul-bersa outline-none" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} />
                    </div>
                    <div className="flex gap-2">
                        <button type="submit" className="bg-azul-bersa text-white p-3 rounded-xl hover:scale-105 transition-all shadow-lg active:scale-95"><Search size={18}/></button>
                        <button type="button" onClick={handleDownload} className="bg-green-600 text-white p-3 rounded-xl hover:bg-green-700 shadow-lg active:scale-95"><FileSpreadsheet size={18}/></button>
                    </div>
                </form>
            </div>

            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-naranja-bersa text-white p-4 font-black text-[11px] tracking-widest px-10 italic uppercase">
                    Registro Histórico de Entradas de Mercancía
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b">
                            <tr>
                                <th className="px-6 py-4">Fecha Recibido</th>
                                <th className="px-6 py-4">Almacén</th>
                                <th className="px-6 py-4">Orden Compra</th>
                                <th className="px-6 py-4">Factura</th>
                                <th className="px-6 py-4">Artículo</th>
                                <th className="px-6 py-4">Recibido por</th>
                                <th className="px-6 py-4 text-center">Cantidad</th>
                                <th className="px-6 py-4 text-right">Precio Unitario</th>
                                <th className="px-6 py-4 text-right">Precio Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-xs font-bold text-gray-600">
                            {loading ? (
                                <tr><td colSpan="8" className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-naranja-bersa" size={40} /></td></tr>
                            ) : (Array.isArray(historial) && historial.length > 0) ? (
                                historial.map((h, i) => (
                                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                                        {/* Agregamos soporte para minúsculas por si el backend no usa alias de CamelCase */}
                                        <td className="px-6 py-4 whitespace-nowrap">{(h.fecha_recibido || h.DocDate || h.docdate || h.FechaSeleccionada) ? new Date(h.fecha_recibido || h.DocDate || h.docdate || h.FechaSeleccionada).toLocaleDateString('es-MX', { timeZone: 'UTC' }) : 'S/F'}</td>
                                        <td className="px-6 py-4 font-black text-azul-bersa uppercase">{h.WhsCode || h.whscode || h.almacen}</td>
                                        <td className="px-6 py-4">#{h.DocNum || h.docnum || h.orden_compra}</td>
                                        <td className="px-6 py-4 italic text-gray-400 truncate max-w-[120px]">{h.NumAtCard || h.numatcard || h.referencia_factura}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-black text-azul-bersa">{h.ItemCode || h.itemcode || h.item_code}</div>
                                            <div className="text-[10px] text-gray-400 uppercase truncate max-w-[150px]">{h.ItemName || h.itemname || h.item_nombre || h.Dscription}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-[10px] text-gray-400 font-bold truncate max-w-[100px]">{h.usuario || 'Sistema'}</p>
                                        </td>
                                        <td className="px-6 py-4 text-center font-black text-azul-bersa text-sm">{h.cantidad || h.Quantity || h.quantity}</td>
                                        <td className="px-6 py-4 text-right">${Number(h.precio_unitario || h.Price || h.price || 0).toFixed(2)}</td>
                                        <td className="px-6 py-4 text-right font-black text-azul-bersa">${Number(h.precio_total || h.DocTotal || h.doctotal || ((h.cantidad || h.Quantity || h.quantity) * (h.precio_unitario || h.Price || h.price || 0))).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="9" className="py-20 text-center text-gray-300 font-black uppercase italic text-2xl">No se encontraron registros</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="mt-8 flex justify-between items-center border-t pt-6">
                <p className="text-[10px] font-black text-gray-300 uppercase italic">Portal Warehouse Systems v2.0</p>
                <div className="flex gap-3">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 border rounded-xl hover:bg-gray-50 text-azul-bersa disabled:opacity-30"><ArrowLeft size={18}/></button>
                    <span className="flex items-center px-4 text-xs font-black bg-gray-50 rounded-xl uppercase">Pág. {page}</span>
                    <button onClick={() => setPage(p => p + 1)} disabled={historial.length < 50} className="p-2 border rounded-xl hover:bg-gray-50 text-azul-bersa disabled:opacity-30"><ArrowRight size={18}/></button>
                </div>
            </div>
        </div>
    );
};

export default HistorialEntradas;