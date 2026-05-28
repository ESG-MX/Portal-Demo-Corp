import React, { useState, useEffect, useMemo } from 'react';
import { Search, FileSpreadsheet, Loader2 } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { toast } from 'sonner';
import Select from 'react-select';
import { customSelectStyles } from '../../../utils/selectStyles';

const MovementsTab = ({ logic }) => {
    const { authFetch } = useAuth();
    const [loading, setLoading] = useState(false);
    const [almacenes, setAlmacenes] = useState([]);
    const [data, setData] = useState([]);
    const [filters, setFilters] = useState({
        startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        whsCode: 'TODOS',
        modulo: 'TODOS'
    });

    useEffect(() => {
        if (!authFetch?.get) return;
        const getAlmacenes = async () => {
            try {
                const res = await authFetch.get('/api/admin/almacenes');
                setAlmacenes(Array.isArray(res.data) ? res.data : []);
            } catch (e) { console.error("Error cargando almacenes", e); }
        };
        getAlmacenes();
    }, [authFetch]);

    const almacenOptions = useMemo(() => [
        { value: 'TODOS', label: '🌍 TODAS LAS UNIDADES' },
        ...almacenes.map(al => ({ value: al.whscode, label: al.whsdesc || al.whsname }))
    ], [almacenes]);

    const fetchMovements = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams(filters).toString();
            const res = await authFetch.get(`/api/reportes/movimientos-historico?${params}`);
            setData(res.data);
        } catch (error) {
            toast.error("Error al cargar los movimientos");
        } finally {
            setLoading(false);
        }
    };

    const downloadCSV = () => {
        if (data.length === 0) return toast.info("No hay datos para exportar");
        const headers = ['Fecha', 'Modulo', 'Almacen', 'ItemCode', 'Descripcion', 'Cantidad', 'Usuario'];
        const csvRows = [headers.join(',')];
        data.forEach(row => {
            const safeRow = [
                `"${new Date(row.Fecha).toLocaleString().replace(/"/g, '""')}"`,
                `"${(row.Modulo || '').replace(/"/g, '""')}"`,
                `"${(row.Almacen || '').replace(/"/g, '""')}"`,
                `"${(row.ItemCode || '').replace(/"/g, '""')}"`,
                `"${(row.Descripcion || '').replace(/"/g, '""')}"`,
                row.Cantidad,
                `"${(row.Usuario || '').replace(/"/g, '""')}"`
            ];
            csvRows.push(safeRow.join(','));
        });
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Kardex_Movimientos_${filters.startDate}_${filters.endDate}.csv`;
        link.click();
    };

    const moduloOptions = [
        { value: 'TODOS', label: 'TODOS LOS MÓDULOS' },
        { value: 'CONSUMO', label: 'CONSUMO' },
        { value: 'RECEPCION', label: 'RECEPCIÓN' },
        { value: 'CAJA CHICA', label: 'CAJA CHICA' }
    ];

    return (
        <div className="text-azul-bersa p-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8 items-end bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                <div>
                    <label className="block text-[9px] font-black mb-1 uppercase tracking-widest ml-2 text-gray-400">Desde</label>
                    <input type="date" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-azul-bersa outline-none focus:ring-2 focus:ring-azul-bersa/20" />
                </div>
                <div>
                    <label className="block text-[9px] font-black mb-1 uppercase tracking-widest ml-2 text-gray-400">Hasta</label>
                    <input type="date" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-azul-bersa outline-none focus:ring-2 focus:ring-azul-bersa/20" />
                </div>
                <div>
                    <label className="block text-[9px] font-black mb-1 uppercase tracking-widest ml-2 text-gray-400">Almacén</label>
                    <Select 
                        options={almacenOptions}
                        styles={customSelectStyles}
                        value={almacenOptions.find(o => o.value === filters.whsCode)}
                        onChange={(opt) => setFilters({...filters, whsCode: opt.value})}
                    />
                </div>
                <div>
                    <label className="block text-[9px] font-black mb-1 uppercase tracking-widest ml-2 text-gray-400">Modulo</label>
                    <Select 
                        options={moduloOptions}
                        styles={customSelectStyles}
                        value={moduloOptions.find(o => o.value === filters.modulo)}
                        onChange={(opt) => setFilters({...filters, modulo: opt.value})}
                    />
                </div>
                <div className="flex gap-2 ml-auto">
                    <button onClick={fetchMovements} disabled={loading} className="bg-azul-bersa text-white px-8 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-all font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95">
                        {loading ? <Loader2 className="animate-spin" size={16}/> : <Search size={16}/>} BUSCAR
                    </button>
                    <button onClick={downloadCSV} className="bg-green-600 text-white p-3 rounded-xl hover:bg-green-700 transition-all shadow-lg active:scale-95">
                        <FileSpreadsheet size={18}/>
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-naranja-bersa text-white p-4 font-black text-[11px] tracking-widest px-10 italic uppercase">
                    Kardex: Registro Histórico de Movimientos
                </div>
                <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-black">
                        <tr>
                            <th className="px-6 py-4">Fecha</th>
                            <th className="px-6 py-4">Modulo</th>
                            <th className="px-6 py-4">Almacén</th>
                            <th className="px-6 py-4">Artículo</th>
                            <th className="px-6 py-4">Descripción</th>
                            <th className="px-6 py-4 text-right">Cant.</th>
                            <th className="px-6 py-4">Usuario</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-3 whitespace-nowrap font-medium">
                                    {new Date(row.Fecha).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                                </td>
                                <td className="px-6 py-3">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                        row.Modulo === 'CONSUMO' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                    }`}>
                                        {row.Modulo}
                                    </span>
                                </td>
                                <td className="px-6 py-3 font-bold text-slate-500">{row.Almacen}</td>
                                <td className="px-6 py-3 font-mono font-bold">{row.ItemCode}</td>
                                <td className="px-6 py-3 font-semibold text-slate-800 max-w-[200px] truncate" title={row.Descripcion}>
                                    {row.Descripcion}
                                </td>
                                <td className={`px-6 py-3 text-right font-black ${row.Cantidad < 0 ? 'text-red-500' : 'text-green-600'}`}>
                                    {parseFloat(row.Cantidad).toFixed(2)}
                                </td>
                                <td className="px-6 py-3 text-slate-400 italic text-[10px]">{row.Usuario}</td>
                            </tr>
                        ))}
                        {data.length === 0 && !loading && (
                            <tr>
                                <td colSpan="7" className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest">
                                    Realiza una búsqueda para ver los movimientos
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
                </div>
            </div>
        </div>
    );
};

export default MovementsTab;