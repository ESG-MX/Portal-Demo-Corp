import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const useConsumo = (authFetch) => {
    const queryClient = useQueryClient();
    const [filtro, setFiltro] = useState('');
    const [conteos, setConteos] = useState({});
    const [almacenActivoLocal, setAlmacenActivoLocal] = useState('');
    const [historial, setHistorial] = useState([]);
    const [loadingHistorial, setLoadingHistorial] = useState(false);

    const { data: qData, isLoading: loading, refetch } = useQuery({
        queryKey: ['consumo', almacenActivoLocal],
        queryFn: async () => {
            const res = await authFetch.get(`/api/salidas/data?wh=${almacenActivoLocal}`);
            if (!almacenActivoLocal) return { almacenes: res.data.almacenes, productos: [], almacenActivo: '' };
            const productosConId = (res.data.productos || []).map((p, index) => ({
                ...p,
                rowId: `consumo-${index}-${p.itemcode}` 
            }));
            return {
                ...res.data,
                almacenActivo: res.data.almacenActivo || almacenActivoLocal,
                productos: productosConId
            };
        },
        enabled: !!authFetch,
        onSuccess: () => setConteos({}),
    });

    const data = qData || { almacenes: [], productos: [], almacenActivo: '' };

    const mutationGuardar = useMutation({
        mutationFn: async ({ fecha, itemsAEnviar }) => {
            const res = await authFetch.post('/api/salidas/guardar', { 
                almacen: data.almacenActivo,
                fecha,
                conteos: itemsAEnviar
            });
            return res.data;
        },
        onSuccess: () => {
            toast.success("Salidas registradas con éxito");
            setConteos({});
            queryClient.invalidateQueries(['consumo', data.almacenActivo]); 
        },
        onError: (err) => {
             toast.error(err?.response?.data?.message || err.message || "Error al registrar salidas");
        }
    });

    const fetchData = (whCode = '') => {
        setAlmacenActivoLocal(whCode);
    };

    const handleCantidadChange = (rowId, valor) => setConteos(prev => ({ ...prev, [rowId]: valor }));

    const registrarSalidas = (fecha) => {
        if (!data.almacenActivo) return toast.warning("Seleccione un almacén");
       const itemsAEnviar = data.productos
    .filter(p => conteos[p.rowId] && parseFloat(conteos[p.rowId]) > 0)
    .map(p => ({ 
        codigo: p.itemcode, 
        nombre: p.producto, 
        cantidad: parseFloat(conteos[p.rowId]), // Envía "1" (piezas)
        precio_paquete: p.precio_fijo,         // Envía el precio original de la DB
        factor: p.factor                       // IMPORTANTE: Envía el factor al back
    }));

        if (itemsAEnviar.length === 0) return toast.warning("Ingrese cantidades a retirar");

        toast("¿Registrar salidas verificadas?", {
            action: {
                label: 'Confirmar salidas',
                onClick: () => mutationGuardar.mutate({ fecha, itemsAEnviar })
            }
        });
    };

    const fetchHistorial = async (filtros) => {
        setLoadingHistorial(true);
        try {
            const params = new URLSearchParams(filtros).toString();
            const res = await authFetch.get(`/api/salidas/historial?${params}`);
            const dataHistory = Array.isArray(res.data) ? res.data : [];
            console.log("DEBUG - Historial recibido:", dataHistory);
            setHistorial(dataHistory);
        } catch (error) {
            console.error(error);
            toast.error("Error al obtener el historial");
        } finally {
            setLoadingHistorial(false);
        }
    };

    return {
        data,
        filtro,
        setFiltro,
        conteos,
        handleCantidadChange,
        registrarSalidas,
        fetchData,
        loading: loading || mutationGuardar.isPending,
        historial,
        loadingHistorial,
        fetchHistorial
    };
};