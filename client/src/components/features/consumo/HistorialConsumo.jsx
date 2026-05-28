import React, { useState, useEffect, useMemo } from 'react';
import { Search, Loader2, FileSpreadsheet, ArrowLeft, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import Select from 'react-select';
import { customSelectStyles } from '../../../utils/selectStyles';

const HistorialConsumo = ({ almacenes, historial, fetchHistorial, loadingHistorial, authFetch }) => {
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
    const contratoOptions = useMemo(() => [        { value: '', label: 'TODOS LOS CLIENTES' },
        ...contratosDisponibles.map(con => ({ value: con, label: con }))
    ], [contratosDisponibles]);

    const almacenOptions = useMemo(() => {
        if (!almacenes) return [];
        const base = filters.contrato 
            ? almacenes.filter(al => al.Contrato === filters.contrato)
            : almacenes;
        
        return [{ value: '', label: 'TODOS LOS ALMACENES' }, ...base.map(al => ({ value: al.whscode, label: al.whsname }))];
    }, [almacenes, filters.contrato]);

    // Filtrar la lista de almacenes que se muestran en el select según el contrato elegido
    const almacenesFiltrados = useMemo(() => {
        if (!almacenes) return [];
        if (!filters.contrato) return almacenes;
        return almacenes.filter(al => al.Contrato === filters.contrato);
    }, [almacenes, filters.contrato]);

    // Si cambiamos de contrato y el almacén seleccionado ya no pertenece a ese contrato, lo limpiamos
    useEffect(() => {
        if (filters.whsCode && filters.contrato) {
            const existeEnContrato = almacenesFiltrados.some(al => al.whscode === filters.whsCode);
            if (!existeEnContrato) {
                setFilters(prev => ({ ...prev, whsCode: '' }));
            }
        }
    }, [filters.contrato, almacenesFiltrados]);

    useEffect(() => {
        fetchHistorial({
            page,
            limit: 20,
            ...filters
        });
    }, [page, filters.whsCode, filters.contrato]);

    const handleFilterSearch = (e) => {
        e.preventDefault();
        setPage(1);
        fetchHistorial({ page: 1, limit: 20, ...filters });
    };

    const handleDownloadReport = async () => {
        setDownloading(true);
        try {
            const params = new URLSearchParams({ ...filters, page: 1, limit: 10000 }).toString();
            const res = await authFetch.get(`/api/salidas/historial?${params}`);
            const dataHistory = Array.isArray(res.data) ? res.data : [];
            if (dataHistory.length === 0) return toast.info("No hay datos");

            const headers = ['Timestamp', 'Fecha S.', 'Código SAP', 'Descripción', 'Almacén', 'Cantidad', 'Precio Unit.', 'Total', 'Usuario'];
            const csvRows = [headers.join(',')];
            dataHistory.forEach(row => {
                const total = Number(row.Quantity || 0) * Number(row.PrecioUnitario || 0);
                csvRows.push([
                    `"${new Date(row.Timestamp).toLocaleString('es-MX')}"`,
                    new Date(row.FechaSeleccionada).toLocaleDateString('es-MX', { timeZone: 'UTC' }),
                    row.ItemCode,
                    `"${row.ItemName}"`,
                    row.WhsCode,
                    row.Quantity,
                    row.PrecioUnitario || 0,
                    total.toFixed(2),
                    `"${row.UsuarioEmail}"`
                ].join(','));
            });
            const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Consumo_Historial_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
        } catch (error) { toast.error("Error al generar reporte"); } finally { setDownloading(false); }
    };

    return (
        <div className="bg-white rounded-[2.5rem] p-10 text-gray-800 shadow-2xl animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-10">
                <div>
                    <h2 className="text-3xl font-black text-azul-bersa uppercase tracking-tighter">Histórico de Salidas</h2>
                    <p className="text-gray-400 font-bold text-[10px] mt-1 uppercase italic tracking-widest">Registros de consumos locales</p>
                </div>
                
                <form onSubmit={handleFilterSearch} className="w-full lg:w-auto flex flex-wrap items-end gap-3 bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                    <div className="w-full md:w-48">
                        <label className="text-[9px] font-black text-gray-400 uppercase ml-2 mb-1 block">Cliente</label>
                        <Select 
                            options={contratoOptions}
                            styles={customSelectStyles}
                            value={contratoOptions.find(opt => opt.value === filters.contrato)}
                            onChange={opt => setFilters({...filters, contrato: opt.value})}
                            placeholder="Cliente..."
                        />
                    </div>
                    <div className="w-full md:w-64">
                        <label className="text-[9px] font-black text-gray-400 uppercase ml-2 mb-1 block">Almacén</label>
                        <Select 
                            options={almacenOptions}
                            styles={customSelectStyles}
                            value={almacenOptions.find(opt => opt.value === filters.whsCode)}
                            onChange={opt => setFilters({...filters, whsCode: opt.value})}
                            placeholder="Seleccionar Almacén..."
                        />
                    </div>
                    <div className="w-full md:w-36">
                        <label className="text-[9px] font-black text-gray-400 uppercase ml-2 mb-1 block">Desde</label>
                        <input 
                            type="date" 
                            className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-azul-bersa outline-none focus:ring-2 focus:ring-naranja-bersa/20" 
                            value={filters.startDate} 
                            onChange={e => setFilters({...filters, startDate: e.target.value})} 
                        />
                    </div>
                    <div className="w-full md:w-36">
                        <label className="text-[9px] font-black text-gray-400 uppercase ml-2 mb-1 block">Hasta</label>
                        <input 
                            type="date" 
                            className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-azul-bersa outline-none focus:ring-2 focus:ring-naranja-bersa/20" 
                            value={filters.endDate} 
                            onChange={e => setFilters({...filters, endDate: e.target.value})} 
                        />
                    </div>
                    <div className="flex gap-2 ml-auto">
                        <button type="submit" className="bg-azul-bersa text-white p-3 rounded-xl hover:scale-105 transition-all shadow-lg active:scale-95"><Search size={18}/></button>
                        <button type="button" onClick={handleDownloadReport} disabled={downloading} className="bg-green-600 text-white p-3 rounded-xl hover:bg-green-700 shadow-lg disabled:opacity-50 active:scale-95">
                            {downloading ? <Loader2 className="animate-spin" size={18} /> : <FileSpreadsheet size={18} />}
                        </button>
                    </div>
                </form>
            </div>

            {loadingHistorial ? (
                <div className="flex justify-center p-20"><Loader2 className="animate-spin text-naranja-bersa" size={50} /></div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] border-b">
                                <th className="px-6 py-5">Fecha Salida</th>
                                <th className="px-6 py-5">Código SAP</th>
                                <th className="px-6 py-5">Descripción</th>
                                <th className="px-6 py-5 text-center">Almacén</th>
                                <th className="px-6 py-5 text-right">Precio Unit.</th>
                                <th className="px-6 py-5 text-right">Cantidad</th>
                                <th className="px-6 py-5">Usuario</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {historial.length > 0 ? (
                                historial.map((c) => (
                                <tr key={c.ID} className="hover:bg-gray-50 transition-colors group">
                                    <td className="px-6 py-5">
                                        <p className="font-black text-azul-bersa text-sm">
                                            {c.FechaSeleccionada ? new Date(c.FechaSeleccionada).toLocaleDateString('es-MX', { timeZone: 'UTC' }) : 'S/F'}
                                        </p>
                                        <p className="text-[9px] text-gray-400 font-bold">
                                            {c.Timestamp ? new Date(c.Timestamp).toLocaleTimeString() : '--:--'}
                                        </p>
                                    </td>
                                    <td className="px-6 py-5 font-mono font-black text-gray-400 text-xs">{c.ItemCode}</td>
                                    <td className="px-6 py-5 font-bold text-gray-700 uppercase text-xs truncate max-w-[200px]">{c.ItemName}</td>
                                    <td className="px-6 py-5 text-center"><span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg font-black text-[10px]">{c.WhsCode}</span></td>
                                    <td className="px-6 py-5 text-right font-bold text-azul-bersa/60">$ {Number(c.PrecioUnitario || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                                    <td className="px-6 py-5 text-right font-black text-xl text-azul-bersa">{Number(c.Quantity).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    <td className="px-6 py-5"><p className="text-[10px] font-bold text-gray-400 truncate max-w-[120px]">{c.UsuarioEmail}</p></td>
                                </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" className="px-6 py-20 text-center text-gray-300 font-black uppercase italic text-2xl tracking-tighter">No se encontraron registros</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
            <div className="mt-10 flex justify-between items-center border-t pt-8">
                <p className="text-[10px] font-black text-gray-300 uppercase italic">Portal Cloud Systems v2.0</p>
                <div className="flex gap-3">
                    <button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="p-3 border-2 border-gray-100 rounded-2xl hover:bg-gray-50 disabled:opacity-30 transition-all"><ArrowLeft size={20}/></button>
                    <span className="flex items-center px-6 font-black text-azul-bersa bg-gray-50 rounded-2xl text-sm">PÁGINA {page}</span>
                    <button disabled={historial.length < 20} onClick={() => setPage(p => p + 1)} className="p-3 border-2 border-gray-100 rounded-2xl hover:bg-gray-50 disabled:opacity-30 transition-all"><ArrowRight size={20}/></button>
                </div>
            </div>
        </div>
    );
};

export default HistorialConsumo;