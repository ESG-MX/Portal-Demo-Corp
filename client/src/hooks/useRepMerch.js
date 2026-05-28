import { useState, useEffect, useCallback } from "react";

export const useRepMerch = (authFetch, accessToken) => {
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [warehouseOptions, setWarehouseOptions] = useState([]);
  const [filters, setFilters] = useState({ startDate: '', endDate: '', docNum: '' });
  const [appliedDocNum, setAppliedDocNum] = useState('');
  const [selectedWhs, setSelectedWhs] = useState(null);
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [cantidades, setCantidades] = useState({});
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    if (!accessToken || !authFetch) return;
    authFetch.get('/api/entradas/warehouses')
      .then(res => {
        const options = res.data.map(wh => ({
          value: wh.WarehouseCode,
          label: `${wh.WarehouseCode} - ${wh.WarehouseName}`
        }));
        if (options.length > 1) {
          options.unshift({ value: '', label: '🌐 TODOS LOS ALMACENES' });
        } else if (options.length === 1) {
          setSelectedWhs(options[0]);
        }
        setWarehouseOptions(options);
      })
      .catch(err => console.error("Error almacenes:", err));
  }, [accessToken, authFetch]);

  const fetchOrders = useCallback(async () => {
    if (!accessToken || !authFetch) return;
    setLoading(true);
    try {
      const res = await authFetch.get('/api/entradas/orders', {
        params: {
          page,
          limit: 25,
          docNum: appliedDocNum,
          startDate: filters.startDate,
          endDate: filters.endDate,
          whsCode: selectedWhs?.value
        }
      });
      setOrdenes(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (err) {
        console.error("Error órdenes:", err);
        setOrdenes([]);
    } finally { setLoading(false); }
  }, [accessToken, page, appliedDocNum, filters.startDate, filters.endDate, selectedWhs, authFetch]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return {
    ordenes, loading, filters, setFilters, selectedWhs, setSelectedWhs,
    page, setPage, selectedOrder, setSelectedOrder,
    cantidades, setCantidades, loadingDetails, setLoadingDetails,
    setAppliedDocNum, warehouseOptions, fetchOrders
  };
};