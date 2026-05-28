import React, { useState, useEffect, useMemo } from 'react';
import { Search, Loader2, FileSpreadsheet, ArrowLeft, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import Select from 'react-select';
import { customSelectStyles } from '../../../utils/selectStyles';

const HistorialVentas = ({ almacenes, historial, fetchHistorial, loadingHistorial, authFetch }) => {
    const [filters, setFilters] = useState({ startDate: '', endDate: '', whsCode: '', contrato: '' });
    const [page, setPage] = useState(1);
    const [downloading, setDownloading] = useState(false);

    // Extraer contratos únicos de la lista de almacenes
    const contratosDisponibles = useMemo(() => {
        if (!almacenes) return [];
        const uniqueContratos = [...new Set(almacenes.map(al => al.Contrato).filter(Boolean))];
        return uniqueContratos.sort();
    }, [almacenes]);

    // Opciones para React Select
    const contratoOptions = useMemo(() => [
        { value: '', label: 'CLIENTE (TODOS)' },
        ...contratosDisponibles.map(con => ({ value: con, label: con }))
    ], [contratosDisponibles]);

    const almacenOptions = useMemo(() => {
        const base = filters.contrato 
            ? (almacenes || []).filter(al => al.Contrato === filters.contrato)
            : (almacenes || []);
        return [{ value: '', label: 'ALMACÉN (TODOS)' }, ...base.map(al => ({ value: al.whscode, label: al.whsdesc }))];
    }, [almacenes, filters.contrato]);

    // Filtrar almacenes según el contrato seleccionado
    const almacenesFiltrados = useMemo(() => {
        if (!almacenes) return [];
        if (!filters.contrato) return almacenes;
        return almacenes.filter(al => al.Contrato === filters.contrato);
    }, [almacenes, filters.contrato]);

    // Resetear almacén si cambia el contrato y el seleccionado ya no es válido
    useEffect(() => {
        if (filters.whsCode && filters.contrato) {
            const existe = almacenesFiltrados.some(al => al.whscode === filters.whsCode);
            if (!existe) setFilters(prev => ({ ...prev, whsCode: '' }));
        }
    }, [filters.contrato, almacenesFiltrados]);

    useEffect(() => {
        fetchHistorial({
            page,
            limit: 50,
            ...filters
        });
    }, [page, filters.whsCode, filters.contrato]);

    const handleFilterSearch = (e) => {
        e.preventDefault();
        setPage(1);
        fetchHistorial({ page: 1, limit: 50, ...filters });
    };

    const handleDownloadReport = async () => {
        setDownloading(true);
        try {
            const params = new URLSearchParams({ ...filters, page: 1, limit: 5000 }).toString();
            const res = await authFetch.get(`/api/ventas/historial?${params}`);
            const data = Array.isArray(res.data) ? res.data : [];
            if (data.length === 0) return toast.info("No hay datos para exportar");

            const headers = ["Fecha", "Almacén", "Pedido SAP", "Tipo Servicio", "Usuario", "Item SAP", "Detalle/Dieta", "Descripcion General", "Cantidad", "Precio Unitario", "Total"];
            const csvRows = [
                headers.join(","), 
                ...data.map(row => [
                    new Date(row.DocDate).toLocaleDateString('es-MX', { timeZone: 'UTC' }), 
                    row.WhsCode, 
                    row.DocNum, 
                    `"${row.TipoServicio || ''}"`,
                    `"${row.EmailUsuario}"`, 
                    row.ItemSAP, 
                    `"${row.DetalleDieta}"`, 
                    `"${row.ItemGeneral}"`, 
                    row.CantidadAnalisis, 
                    row.PrecioUnitario, 
                    row.TotalRenglon
                ].join(","))
            ];
            
            const blob = new Blob([csvRows.join("\n")], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Analisis_Ventas_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (e) { 
            toast.error("Error al generar CSV"); 
        } finally { 
            setDownloading(false); 
        }
    };

    return (
        <div className="bg-white rounded-3xl shadow-2xl p-8 text-gray-800 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col lg:flex-row justify-between items-center mb-8 gap-4">
                <h2 className="text-2xl font-black text-azul-bersa uppercase italic">Histórico de Ventas</h2>
                <form onSubmit={handleFilterSearch} className="w-full lg:w-auto flex flex-wrap items-center gap-3 bg-gray-50 p-5 rounded-[2rem] border border-gray-100 shadow-inner">
                    <div className="w-44">
                        <Select 
                            options={contratoOptions}
                            styles={customSelectStyles}
                            value={contratoOptions.find(o => o.value === filters.contrato)}
                            onChange={opt => setFilters({...filters, contrato: opt.value})}
                            placeholder="Cliente..."
                        />
                    </div>
                    <div className="w-56">
                        <Select 
                            options={almacenOptions}
                            styles={customSelectStyles}
                            value={almacenOptions.find(o => o.value === filters.whsCode)}
                            onChange={opt => setFilters({...filters, whsCode: opt.value})}
                            placeholder="Almacén..."
                        />
                    </div>
                    <div className="flex gap-2">
                        <input type="date" className="p-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-azul-bersa outline-none focus:ring-2 focus:ring-violet-200" value={filters.startDate} onChange={(e) => setFilters({...filters, startDate: e.target.value})} />
                        <input type="date" className="p-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-azul-bersa outline-none focus:ring-2 focus:ring-violet-200" value={filters.endDate} onChange={(e) => setFilters({...filters, endDate: e.target.value})} />
                    </div>
                    <div className="flex gap-2">
                        <button type="submit" className="bg-azul-bersa text-white p-2.5 rounded-xl hover:scale-105 transition-all shadow-md active:scale-95"><Search size={18}/></button>
                        <button type="button" onClick={handleDownloadReport} disabled={downloading} className="bg-green-600 text-white p-2.5 rounded-xl flex items-center justify-center disabled:opacity-50 hover:bg-green-700 shadow-md active:scale-95">
                            {downloading ? <Loader2 className="animate-spin" size={18} /> : <FileSpreadsheet size={18} />}
                        </button>
                    </div>
                </form>
            </div>

            <div className="bg-naranja-bersa text-white p-4 font-black text-[11px] tracking-widest px-10 italic uppercase -mx-8 mb-6">
                Listado Detallado de Pedidos y Servicios Registrados
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b">
                        <tr><th className="px-6 py-4">Pedido</th><th className="px-6 py-4">Servicio</th><th className="px-6 py-4">Almacén / Usuario</th><th className="px-6 py-4">Análisis</th><th className="px-6 py-4 text-center">Cant.</th><th className="px-6 py-4 text-right">Total</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {loadingHistorial ? (
                            <tr><td colSpan="6" className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-naranja-bersa" size={40}/></td></tr>
                        ) : historial.length > 0 ? (
                            historial.map((v, idx) => (
                                <tr key={`${v.DocNum}-${idx}`} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-5">
                                        <p className="font-black text-azul-bersa">#{v.DocNum}</p>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase">
                                            {new Date(v.DocDate).toLocaleDateString('es-MX', { timeZone: 'UTC' })}
                                        </p>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded-md font-black uppercase">
                                            {v.TipoServicio}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5"><p className="text-[11px] font-black text-naranja-bersa uppercase leading-none">{v.WhsCode}</p><p className="text-[10px] font-bold text-gray-400 mt-1 truncate max-w-[150px]">{v.EmailUsuario}</p></td>
                                    <td className="px-6 py-5"><span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase italic ${v.DetalleDieta === 'VENTA DIRECTA' ? 'text-gray-300' : 'text-blue-600 bg-blue-50'}`}>{v.DetalleDieta}</span><p className="text-[9px] text-gray-400 mt-1 font-bold italic truncate max-w-[120px]">{v.ItemGeneral}</p></td>
                                    <td className="px-6 py-5 text-center font-bold text-gray-600">{v.CantidadAnalisis}</td>
                                    <td className="px-6 py-5 text-right font-mono font-bold text-gray-600">${Number(v.TotalRenglon || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan="6" className="py-20 text-center font-black text-gray-200 text-2xl uppercase italic">No hay registros encontrados</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            <div className="flex justify-between items-center mt-8 pt-6 border-t">
                <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest italic">Sales Analytics v2.0</p>
                <div className="flex gap-3">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 border rounded-xl hover:bg-gray-50 text-azul-bersa disabled:opacity-30"><ArrowLeft size={18}/></button>
                    <span className="flex items-center px-4 text-xs font-black bg-gray-50 rounded-xl">PÁGINA {page}</span>
                    <button onClick={() => setPage(p => p + 1)} disabled={historial.length < 50} className="p-2 border rounded-xl hover:bg-gray-50 text-azul-bersa disabled:opacity-30"><ArrowRight size={18}/></button>
                </div>
            </div>
        </div>
    );
};

export default HistorialVentas;
