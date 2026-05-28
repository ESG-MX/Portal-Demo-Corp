import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
export const useInventario = (authFetch) => {
    const [data, setData] = useState({ almacenes: [], productos: [], almacenActivo: '' });
    const [filtro, setFiltro] = useState('');
    const [conteos, setConteos] = useState({});
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        if (data.almacenActivo && Object.keys(conteos).length > 0) {
            localStorage.setItem(`draft_inv_${data.almacenActivo}`, JSON.stringify(conteos));
        }
    }, [conteos, data.almacenActivo]);
    const limpiarConteos = () => {
        if (Object.keys(conteos).length === 0) return;
        toast('¿Seguro que deseas borrar todo el inventario actual registrado?', {
            action: {
                label: 'Borrar todo',
                onClick: () => {
                    setConteos({});
                    if (data.almacenActivo) localStorage.removeItem(`draft_inv_${data.almacenActivo}`);
                    toast.success('Inventario limpiado exitosamente');
                }
            }
        });
    };
    const fetchData = useCallback(async (whCode = '') => {
        if (!authFetch || typeof authFetch.get !== 'function') return; 
        setLoading(true);
        try {
            setConteos({});
            const res = await authFetch.get(`/api/inventario?wh=${whCode}`);
            const productosConId = (res.data.productos || []).map((p, index) => ({
                ...p,
                rowId: `row-${index}-${p.itemcode}` 
            }));
            const savedDraft = localStorage.getItem(`draft_inv_${whCode}`);
            if (savedDraft) {
                try {
                    const parsedDraft = JSON.parse(savedDraft);
                    setConteos(parsedDraft);
                } catch (e) { console.error(e); }
            }
            setData({ ...res.data, productos: productosConId, almacenActivo: whCode || res.data.almacenActivo });
        } catch (error) { console.error(error); } finally { setLoading(false); }
    }, [authFetch]);
    useEffect(() => { if (authFetch && data.almacenes.length === 0) fetchData(); }, [authFetch, fetchData, data.almacenes.length]);
    const handleCantidadChange = (rowId, valor) => {
        if (valor !== '' && parseFloat(valor) < 0) return;
        setConteos(prev => ({ ...prev, [rowId]: valor }));
    };
    const totalGeneral = useMemo(() => {
        return (data.productos || []).reduce((acc, p) => {
            const cant = parseFloat(conteos[p.rowId] || 0);
            const factor = parseFloat(p.factor || 1);
            return acc + (cant * (p.precio_fijo || 0) / factor);
        }, 0);
    }, [data.productos, conteos]);
    const guardar = () => {
        const itemsAEnviar = data.productos
            .filter(p => conteos[p.rowId] && parseFloat(conteos[p.rowId]) > 0)
            .map(p => ({ 
                codigo: p.itemcode, 
                cantidad: parseFloat(conteos[p.rowId]),
                precio: p.precio_fijo || 0,
                factor: p.factor || 1
            }));
        if (itemsAEnviar.length === 0) return toast.warning("Ingrese cantidades");
        toast(`¿Deseas guardar ${itemsAEnviar.length} artículos?`, {
            action: {
                label: 'Guardar',
                onClick: async () => {
                    setLoading(true);
                    try {
                        const res = await authFetch.post('/api/inventario/guardar', { almacen: data.almacenActivo, conteos: itemsAEnviar });
                        if (res.data.success) {
                            localStorage.removeItem(`draft_inv_${data.almacenActivo}`);
                            toast.success("Inventario guardado con éxito.");
                            setConteos({}); 
                        }
                    } catch (error) { toast.error("Error al guardar el inventario."); } finally { setLoading(false); }
                }
            }
        });
    };
    return { data, filtro, setFiltro, conteos, handleCantidadChange, totalGeneral, guardar, fetchData, loading, limpiarConteos };
};