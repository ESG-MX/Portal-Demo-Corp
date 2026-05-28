import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Download, Calendar, User, LayoutGrid, FileText, Eye } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import DetalleAuditoriaModal from '../components/modals/DetalleAuditoriaModal';
import LoadingSpinner from '../components/features/LoadingSpinner';

export default function ReportesAuditoria() {
    const { authFetch, accessToken, userProfile, isLoading: authLoading } = useAuth();

    const [filters, setFilters] = useState({
        startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        modulo: 'ALL',
        usuario: 'ALL'
    });

    const [modalData, setModalData] = useState(null);

    const effectiveRole = userProfile?.permissions?.effectiveRole || 'usuario';
    const isAuthorized = userProfile?.permissions?.isAdmin || false;

    const { data: usuariosActivos = [] } = useQuery({
        queryKey: ['usuariosActivos'],
        queryFn: async () => {
            if (!authFetch) return [];
            const res = await authFetch.get('/api/reportes/usuarios-activos');
            return res.data;
        },
        enabled: !!authFetch && isAuthorized
    });

    const { data: reportes = [], isLoading } = useQuery({
        queryKey: ['reportesAuditoria', filters],
        queryFn: async () => {
            if (!authFetch) return [];
            const params = new URLSearchParams(filters).toString();
            const res = await authFetch.get(`/api/reportes/auditoria-global?${params}`);
            return res.data;
        },
        enabled: !!authFetch && isAuthorized
    });

    if (authLoading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <LoadingSpinner text="Verificando permisos..." />
            </div>
        );
    }

    const handleExportCSV = () => {
        if (reportes.length === 0) return;
        const headers = ['Fecha', 'Usuario', 'Sucursal', 'Modulo', 'Accion', 'ReferenciaID'];
        const csvRows = [headers.join(',')];

        reportes.forEach(row => {
            const values = [
                row.Fecha,
                `"${row.Usuario}"`,
                `"${row.Sucursal}"`,
                `"${row.Modulo}"`,
                `"${row.Accion}"`,
                `"${row.ReferenciaID}"`
            ];
            csvRows.push(values.join(','));
        });

        const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `Auditoria_${filters.startDate}_al_${filters.endDate}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    if (!isAuthorized) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[500px]">
                <div className="bg-red-50 text-red-600 p-6 rounded-xl flex flex-col items-center">
                    <span className="text-3xl mb-4">🔒</span>
                    <h2 className="text-xl font-bold">Acceso Denegado</h2>
                    <p className="mt-2 text-red-500/80">Solo los administradores pueden ver los reportes históricos.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto animate-fade-in text-azul-bersa">
            <DetalleAuditoriaModal
                isOpen={!!modalData}
                onClose={() => setModalData(null)}
                transaccion={modalData}
            />
            <div className="mb-8 p-6 bg-gradient-to-r from-azul-bersa to-slate-800 rounded-2xl text-white shadow-xl shadow-azul-bersa/10 flex flex-col md:flex-row justify-between items-start md:items-center border border-white/10 relative overflow-hidden group">
                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.05)_50%,transparent_75%)] bg-[length:400%_400%] animate-shine opacity-0 group-hover:opacity-100 transition-opacity duration-1000"/>
                <div className="relative z-10">
                    <h1 className="text-3xl font-extrabold tracking-tight mb-2">Histórico de Actividad</h1>
                    <p className="text-slate-300 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-naranja-bersa shadow-[0_0_8px_rgba(251,146,60,0.8)] animate-pulse"></span>
                        Auditoria global de operaciones de todos los módulos.
                    </p>
                </div>

                <button
                    onClick={handleExportCSV}
                    disabled={reportes.length === 0}
                    className="relative z-10 mt-6 md:mt-0 flex items-center gap-2 bg-gradient-to-r from-naranja-bersa to-violet-500 hover:from-violet-700 hover:to-naranja-bersa text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-violet-500/30 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed group/btn"
                >
                    <Download className="w-5 h-5 group-hover/btn:-translate-y-1 transition-transform" />
                    <span>Exportar a Excel (CSV)</span>
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/40 border border-slate-100 p-6 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div>
                        <label className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-naranja-bersa"/> Fecha Inicio
                        </label>
                        <input type="date" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-naranja-bersa/50 focus:border-naranja-bersa outline-none transition-all"/>
                    </div>
                    <div>
                        <label className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-naranja-bersa"/> Fecha Fin
                        </label>
                        <input type="date" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-naranja-bersa/50 focus:border-naranja-bersa outline-none transition-all"/>
                    </div>
                    <div>
                        <label className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                           <LayoutGrid className="w-4 h-4 text-naranja-bersa"/> Filtro Módulo
                        </label>
                        <select value={filters.modulo} onChange={e => setFilters({...filters, modulo: e.target.value})} className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-naranja-bersa/50 focus:border-naranja-bersa outline-none transition-all appearance-none cursor-pointer">
                            <option value="ALL">Todos los módulos</option>
                            <option value="Incidencias">Incidencias</option>
                            <option value="Inventario Físico">Inventarios</option>
                            <option value="Ventas">Ventas</option>
                            <option value="CONSUMO">Salidas por Consumo</option>
                            <option value="RECEPCION">Recepción de Mercancía</option>
                            <option value="CAJA CHICA">Entradas Caja Chica</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                            <User className="w-4 h-4 text-naranja-bersa"/> Operador Maestro
                        </label>
                        <select value={filters.usuario} onChange={e => setFilters({...filters, usuario: e.target.value})} className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-naranja-bersa/50 focus:border-naranja-bersa outline-none transition-all appearance-none cursor-pointer">
                            <option value="ALL">Todos los Usuarios</option>
                            {usuariosActivos?.map((u, i) => (
                                <option key={i} value={u.Usuario}>{u.Usuario}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 text-slate-500 uppercase text-xs tracking-wider border-b border-slate-100">
                                <th className="px-6 py-4 font-bold rounded-tl-xl w-40">Fecha</th>
                                <th className="px-6 py-4 font-bold">Módulo</th>
                                <th className="px-6 py-4 font-bold">Acción / Referencia</th>
                                <th className="px-6 py-4 font-bold">Usuario Operador</th>
                                <th className="px-6 py-4 font-bold">Sucursal Whs</th>
                                <th className="px-6 py-4 font-bold rounded-tr-xl">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-naranja-bersa mb-4"></div>
                                            Cargando información histórica...
                                        </div>
                                    </td>
                                </tr>
                            ) : reportes.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center opacity-60">
                                            <Search className="w-12 h-12 mb-4 text-slate-300" />
                                            <p className="text-lg font-medium">No se encontraron movimientos</p>
                                            <p className="text-sm">Intenta ajustar los filtros de fecha o usuario.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                reportes.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors group cursor-default">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">
                                            {new Date(row.Fecha).toLocaleString('es-MX', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute:'2-digit' })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-700">
                                                {row.Modulo}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm text-slate-800 font-semibold">{row.Accion}</span>
                                                <span className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                                                    <FileText className="w-3 h-3" /> ID Ref: {row.ReferenciaID}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-naranja-bersa/10 text-naranja-bersa flex items-center justify-center font-bold text-xs ring-1 ring-naranja-bersa/20">
                                                    {row.Usuario?.substring(0, 2).toUpperCase() || '??'}
                                                </div>
                                                <span className="text-sm text-slate-700 font-medium">{row.Usuario}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm text-slate-600 font-medium px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg">
                                                {row.Sucursal || 'Múltiples'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <button
                                                onClick={() => setModalData(row)}
                                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-azul-bersa/5 hover:bg-azul-bersa/10 text-azul-bersa rounded-lg font-bold text-sm transition-colors"
                                            >
                                                <Eye className="w-4 h-4" /> Ver Detalles
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
