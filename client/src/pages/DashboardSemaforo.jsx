import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Activity, AlertTriangle, CheckCircle, Clock, BarChart3, Search } from 'lucide-react';
import Select from 'react-select';
import { customSelectStyles } from '../utils/selectStyles';

const DashboardSemaforo = () => {
    const { authFetch } = useAuth();
    const [reportes, setReportes] = useState({ ventas: [], inventario: [], consumo: [] });
    const [almacenes, setAlmacenes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtros, setFiltros] = useState({ whsCode: '', contrato: '' });

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

    const contratoOptions = useMemo(() => {
        const unique = [...new Set(almacenes.map(al => al.Contrato).filter(Boolean))];
        return [{ value: '', label: 'CLIENTE (TODOS)' }, ...unique.sort().map(c => ({ value: c, label: c }))];
    }, [almacenes]);

    const almacenOptions = useMemo(() => {
        const base = filtros.contrato ? almacenes.filter(al => al.Contrato === filtros.contrato) : almacenes;
        return [{ value: '', label: 'ALMACÉN (TODOS)' }, ...base.map(al => ({ value: al.whscode, label: al.whsdesc || al.whsname }))];
    }, [almacenes, filtros.contrato]);

    const fetchData = async () => {
        if (!authFetch) return;
        setLoading(true);
        try {
            const [vRes, iRes, cRes] = await Promise.all([
                authFetch.get('/api/ventas/reporte-salud'),
                authFetch.get('/api/inventario/reporte-salud'),
                authFetch.get('/api/salidas/reporte-salud')
            ]);
            setReportes({
                ventas: vRes.data,
                inventario: iRes.data,
                consumo: cRes.data
            });
        } catch (error) {
            console.error("Error cargando dashboard de semáforo:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (authFetch) fetchData();
    }, [authFetch]);

    // Filtrado local de los datos del semáforo
    const dataFiltrada = useMemo(() => {
        const filterFn = (item) => {
            const matchesWhs = !filtros.whsCode || item.whscode === filtros.whsCode;
            const matchesContrato = !filtros.contrato || (almacenes.find(a => a.whscode === item.whscode)?.Contrato === filtros.contrato);
            return matchesWhs && matchesContrato;
        };

        return {
            ventas: reportes.ventas.filter(filterFn),
            inventario: reportes.inventario.filter(filterFn),
            consumo: reportes.consumo.filter(filterFn)
        };
    }, [reportes, filtros, almacenes]);

    const HealthSection = ({ title, data, icon: Icon }) => (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between px-5 py-4 bg-white/5 rounded-[1.5rem] border border-white/5 shadow-inner">
                <div className="flex items-center gap-3 text-white transition-all">
                    <div className="bg-naranja-bersa p-2 rounded-xl shadow-lg shadow-violet-500/20">
                        <Icon size={18} className="text-white" />
                    </div>
                    <h2 className="font-black text-[11px] uppercase tracking-[0.2em]">{title}</h2>
                </div>
                <span className="bg-white/10 text-[9px] px-3 py-1 rounded-full text-white/40 font-black uppercase tracking-widest">
                    {data.length} Almacenes
                </span>
            </div>
            <div className="max-h-[550px] overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-3">
                {data.length === 0 ? (
                    <div className="bg-white/5 border-2 border-dashed border-white/10 rounded-[2rem] p-12 text-center">
                        <p className="text-white/20 font-black uppercase text-[10px] tracking-widest italic">Sin datos disponibles</p>
                    </div>
                ) : (
                    data.map((item, idx) => (
                        <div 
                            key={idx} 
                            className="bg-white rounded-2xl p-5 flex items-center justify-between shadow-xl transition-all hover:translate-x-1 border-l-[10px]"
                            style={{ borderLeftColor: item.semaforo?.hex || '#ccc' }}
                        >
                            <div className="flex items-center gap-4">
                                <div>
                                    <p className="text-[13px] font-black text-azul-bersa uppercase leading-none mb-1">{item.whsname || item.whscode}</p>
                                    <p className="text-[10px] text-gray-400 font-bold tracking-tighter flex items-center gap-2">
                                        <span>Atraso: {item.horas_atraso || 0} hrs</span>
                                        <span className="text-naranja-bersa bg-violet-50 px-1.5 rounded">
                                            ({(item.horas_atraso / 24).toFixed(1)} días)
                                        </span>
                                    </p>
                                </div>
                            </div>
                            <span 
                                className="text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-tighter"
                                style={{ backgroundColor: `${item.semaforo?.hex}15`, color: item.semaforo?.hex }}
                            >
                                {item.semaforo?.label || 'Indefinido'}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-azul-bersa text-white">
            <div className="flex flex-col items-center gap-4">
                <Activity className="animate-spin text-naranja-bersa" size={48} />
                <p className="font-black tracking-widest uppercase text-xs">Analizando Semáforo Operativo...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-azul-bersa p-6 md:p-12">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div className="flex items-center gap-4">
                        <div className="bg-naranja-bersa p-2 rounded-xl shadow-lg shadow-violet-500/20">
                            <BarChart3 className="text-white" size={32} />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">Semáforo <span className="text-naranja-bersa">Ops</span></h1>
                            <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-1">Monitor de cumplimiento y salud operativa</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => { setFiltros({ whsCode: '', contrato: '' }); fetchData(); }}
                        className="bg-white text-azul-bersa px-8 py-3 rounded-xl font-black text-[10px] hover:bg-naranja-bersa hover:text-white transition-all uppercase tracking-widest shadow-xl active:scale-95"
                    >
                        Limpiar y Actualizar
                    </button>
                </div>

                {/* Barra de Filtros */}
                <div className="bg-white rounded-[2rem] p-4 px-7 shadow-2xl mb-10 flex flex-wrap gap-6 items-end border border-white/10 w-fit">
                    <div className="w-full md:w-64">
                        <label className="text-[9px] font-black text-gray-400 uppercase ml-2 mb-1 block tracking-widest">Filtrar por Cliente</label>
                        <Select 
                            options={contratoOptions} 
                            styles={customSelectStyles} 
                            value={contratoOptions.find(o => o.value === filtros.contrato)} 
                            onChange={opt => setFiltros({...filtros, contrato: opt.value, whsCode: ''})} 
                        />
                    </div>
                    <div className="w-full md:w-64">
                        <label className="text-[9px] font-black text-gray-400 uppercase ml-2 mb-1 block tracking-widest">Filtrar por Almacén</label>
                        <Select 
                            options={almacenOptions} 
                            styles={customSelectStyles} 
                            value={almacenOptions.find(o => o.value === filtros.whsCode)} 
                            onChange={opt => setFiltros({...filtros, whsCode: opt.value})} 
                        />
                    </div>
                </div>

                {/* Grid de Reportes */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <HealthSection title="Ventas Diarias" data={dataFiltrada.ventas} icon={AlertTriangle} />
                    <HealthSection title="Consumo Interno" data={dataFiltrada.consumo} icon={Clock} />
                    <HealthSection title="Inventario Semanal" data={dataFiltrada.inventario} icon={CheckCircle} />
                </div>
            </div>
        </div>
    );
};

export default DashboardSemaforo;