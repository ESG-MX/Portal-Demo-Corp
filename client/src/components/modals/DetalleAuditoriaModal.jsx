import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Package, DollarSign } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function DetalleAuditoriaModal({ isOpen, onClose, transaccion }) {
    const { authFetch, accessToken } = useAuth();

    const { data: detalles = [], isLoading } = useQuery({
        queryKey: ['reporteDetalle', transaccion?.Modulo, transaccion?.ReferenciaID],
        queryFn: async () => {
            if (!transaccion || !authFetch) return [];
            const res = await authFetch.get('/api/reportes/detalle', {
                params: {
                    modulo: transaccion.Modulo,
                    id: transaccion.ReferenciaID
                }
            });
            return res.data;
        },
        enabled: isOpen && !!transaccion && !!accessToken
    });

    if (!isOpen || !transaccion) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-slide-up border border-slate-200">
                <div className="bg-gradient-to-r from-azul-bersa to-slate-800 p-6 flex justify-between items-start relative overflow-hidden">
                    <div className="relative z-10 text-white">
                        <h2 className="text-xl font-bold mb-1">Detalle de Operación</h2>
                        <div className="flex gap-4 text-sm text-slate-300">
                            <span>Módulo: <strong className="text-white">{transaccion.Modulo}</strong></span>
                            <span>Ref ID: <strong className="text-white">{transaccion.ReferenciaID}</strong></span>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-colors z-10">
                        <X className="w-5 h-5" />
                    </button>
                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
                </div>

                <div className="p-6">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between gap-4 mb-6">
                        <div>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Operador</p>
                            <p className="text-slate-800 font-medium">{transaccion.Usuario}</p>
                        </div>
                        <div className="h-8 w-px bg-slate-200" />
                        <div>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Acción</p>
                            <p className="text-slate-800 font-medium">{transaccion.Accion}</p>
                        </div>
                        <div className="h-8 w-px bg-slate-200" />
                        <div>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Fecha</p>
                            <p className="text-slate-800 font-medium">{new Date(transaccion.Fecha).toLocaleString('es-MX')}</p>
                        </div>
                    </div>

                    <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Package className="w-4 h-4 text-naranja-bersa" /> Partidas Afectadas
                    </h3>

                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                                    <th className="px-4 py-3 font-bold border-b border-slate-200">Código Artículo</th>
                                    <th className="px-4 py-3 font-bold border-b border-slate-200">Descripción Artículo</th>
                                    <th className="px-4 py-3 font-bold border-b border-slate-200 text-right">Cant. Afectada</th>
                                    <th className="px-4 py-3 font-bold border-b border-slate-200 text-right">Referencia Costo</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 min-h-[100px]">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan="4" className="px-4 py-8 text-center text-slate-500">
                                            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-naranja-bersa"></div>
                                        </td>
                                    </tr>
                                ) : detalles.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-4 py-8 text-center text-slate-500 font-medium text-sm">
                                            No se encontraron partidas o detalles desglosados para este movimiento.
                                        </td>
                                    </tr>
                                ) : (
                                    detalles.map((d, i) => (
                                        <tr key={i} className="hover:bg-slate-50/50">
                                            <td className="px-4 py-3 font-medium text-slate-700">{d.ItemCode || 'N/A'}</td>
                                            <td className="px-4 py-3 text-slate-600 truncate max-w-[200px]" title={d.ItemName}>
                                                {d.ItemName || 'Registrado por Código'}
                                            </td>
                                            <td className="px-4 py-3 font-bold text-azul-bersa text-right">{parseFloat(d.CantidadAfectada || 0).toFixed(2)}</td>
                                            <td className="px-4 py-3 text-slate-500 text-right font-mono">
                                                {d.PrecioFactura != null ? `$${parseFloat(d.PrecioFactura).toFixed(2)}` : 'N/A'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-200">
                    <button onClick={onClose} className="px-5 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-200 transition-colors">
                        Cerrar Detalles
                    </button>
                </div>
            </div>
        </div>
    );
}
