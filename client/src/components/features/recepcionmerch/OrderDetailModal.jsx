import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../LoadingSpinner';
import { toast } from 'sonner';

const OrderDetailModal = ({ order, onClose, logic, authFetch }) => {
  const { cantidades, setCantidades, fetchOrders, warehouseOptions } = logic;
  const [fullOrder, setFullOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [referencia, setReferencia] = useState('');
  const navigate = useNavigate();

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount || 0);
  };

  useEffect(() => {
    const fetchFullDetail = async () => {
      if (!order?.DocEntry || !authFetch) return;
      setLoading(true);
      try {
        const res = await authFetch.get(`/api/entradas/orders/${order.DocEntry}`);
        setFullOrder(res.data);
        const initialCants = {};
        (res.data?.DocumentLines || []).forEach(line => {
          initialCants[line.LineNum] = line.RemainingOpenQuantity || line.OpenQuantity || 0;
        });
        setCantidades(initialCants);
      } catch (error) { 
        console.error(error); 
      } finally { 
        setLoading(false); 
      }
    };
    fetchFullDetail();
  }, [order?.DocEntry, authFetch]);

  const handleConfirmarRecepcion = async () => {
    if (!referencia || referencia.trim().length === 0) {
        return toast.warning("Ingresa la referencia de factura.");
    }
    try {
        setLoading(true);
        const payload = {
            docEntry: order.DocEntry,
            numAtCard: referencia,
            lines: Object.keys(cantidades).map(lineNum => {
                const lineDetail = fullOrder?.DocumentLines?.find(line => line.LineNum == lineNum);
                return {
                    LineNum: lineNum,
                    ItemCode: lineDetail?.ItemCode, // Se agrega el código para evitar el error de NULL en SQL
                    Quantity: cantidades[lineNum],
                    Price: lineDetail?.Price || 0, // Incluimos el precio para el registro de inventario
                    WhsCode: lineDetail?.WarehouseCode
                };
            })
        };
        
        const res = await authFetch.post('/api/entradas/receive', payload);
        if (res.data.success) {
            toast.success(`Recepción procesada y orden finalizada.`);
            onClose();
            fetchOrders();
        }
    } catch (error) {
        toast.error("Error al procesar la recepción");
    } finally {
        setLoading(false);
    }
  };

  const irAReporteIncidencia = () => {
    const articulosConPrecio = (fullOrder?.DocumentLines || []).map(line => ({
        ItemCode: line.ItemCode,
        ItemName: line.ItemDescription,
        CantidadOriginal: line.RemainingOpenQuantity || line.OpenQuantity || 0,
        CantidadAfectada: '',
        PrecioPO: line.Price || 0,
        PrecioFactura: ''
    }));

    const infoParaReporte = {
        proveedorId: fullOrder?.CardCode || order.CardCode || '',
        proveedorNombre: fullOrder?.CardName || order.CardName || '',
        poNumber: order.DocNum,
        docEntry: order.DocEntry,
        almacen: fullOrder?.DocumentLines?.[0]?.WarehouseCode || order.WhsCode || '',
        articulos: articulosConPrecio
    };

    navigate('/incidencias/nuevo', { state: { prefillData: infoParaReporte } });
  };

  const handleCancelarOrden = async () => {
    const confirmar = window.confirm(`¿Estás seguro de que deseas CANCELAR la orden #${order.DocNum} en SAP? Esta acción no se puede deshacer.`);
    if (!confirmar) return;

    try {
        setLoading(true);
        const res = await authFetch.post(`/api/entradas/orders/${order.DocEntry}/cancel`);
        if (res.data.success) {
            toast.success(`Orden #${order.DocNum} cancelada exitosamente en SAP.`);
            onClose();
            fetchOrders();
        }
    } catch (error) {
        toast.error("Error al intentar cancelar la orden.");
        console.error(error);
    } finally {
        setLoading(false);
    }
  };

  if (!order) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      
      {/* Capa de fondo con Blur - Ocupa toda la pantalla */}
      <div 
        className="fixed inset-0 bg-azul-bersa/85 backdrop-blur-md transition-opacity" 
        onClick={onClose} 
      />

      {/* Contenedor del Modal - Posición relativa para estar sobre el fondo */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col border-t-8 border-naranja-bersa text-azul-bersa animate-in fade-in zoom-in duration-200">
        
        {/* Cabecera */}
        <div className="px-8 py-6 flex justify-between items-center border-b border-gray-100 bg-white rounded-t-2xl">
          <h2 className="text-3xl font-black text-azul-bersa uppercase">Orden #{order.DocNum}</h2>
          <button onClick={onClose} className="text-4xl font-light hover:text-naranja-bersa transition-colors">&times;</button>
        </div>

        {/* Cuerpo Scrolleable */}
        <div className="p-8 overflow-y-auto flex-1 space-y-6 text-azul-bersa">
          {loading ? (
            <div className="py-20">
                <LoadingSpinner text="Cargando información..." />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Proveedor</p>
                  <p className="font-black text-lg uppercase leading-tight">{fullOrder?.CardName || order.CardName}</p>
                </div>
                <div className="bg-violet-50 p-6 rounded-3xl border-2 border-naranja-bersa/20">
                  <p className="text-[10px] font-black text-naranja-bersa uppercase tracking-widest mb-1">Referencia Factura *</p>
                  <input 
                    type="text" 
                maxLength={8} 
                    className="w-full bg-transparent font-black text-2xl outline-none uppercase placeholder:text-naranja-bersa/20" 
                    placeholder="INGRESAR" 
                    value={referencia} 
                    onChange={(e) => setReferencia(e.target.value.slice(0, 8).toUpperCase())} 
                  />
                </div>
                <div className="bg-azul-bersa p-6 rounded-3xl text-white">
                  <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">Almacén</p>
                  <p className="font-black text-xl uppercase">{fullOrder?.DocumentLines?.[0]?.WarehouseCode || order.WhsCode}</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-[10px] font-black uppercase border-b">
                    <tr>
                        <th className="p-4">Artículo</th>
                        <th className="p-4 text-right">Precio Unit.</th>
                        <th className="p-4 text-right">Pendiente</th>
                        <th className="p-4 text-center">Recibir</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                    {fullOrder?.DocumentLines?.map((line) => (
                        <tr key={line.LineNum} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4 font-bold text-sm">{line.ItemDescription}</td>
                        <td className="p-4 text-right font-bold text-gray-400">
                            {formatCurrency(line.Price)}
                        </td>
                        <td className="p-4 text-right font-black text-lg">{line.RemainingOpenQuantity || line.OpenQuantity}</td>
                        <td className="p-4 w-32">
                            <input 
                                type="number" 
                                className="w-full p-2.5 border-2 border-gray-100 rounded-xl text-center font-black text-azul-bersa outline-none focus:border-naranja-bersa" 
                                value={cantidades[line.LineNum] || ''} 
                                onChange={(e) => setCantidades({...cantidades, [line.LineNum]: e.target.value})} 
                            />
                        </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-8 bg-gray-50 flex flex-col md:flex-row justify-between items-center border-t gap-6 rounded-b-2xl">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-6">
              <button 
                  onClick={handleCancelarOrden} 
                  disabled={loading}
                  className="text-red-500 font-black text-[10px] uppercase hover:underline flex items-center gap-1"
              > 
                  🚫 CANCELAR ORDEN EN SAP
              </button>

              <button onClick={irAReporteIncidencia} className="text-naranja-bersa font-black text-[10px] uppercase hover:underline flex items-center gap-1">
                ⚠️ REPORTAR INCIDENCIA
              </button>
            </div>
            <p className="text-[9px] font-bold text-gray-400 italic">Al confirmar, el saldo pendiente se cerrará automáticamente en SAP.</p>
          </div>

          <div className="flex gap-4 w-full md:w-auto">
            <button onClick={onClose} className="flex-1 md:flex-none px-8 py-4 bg-white border rounded-2xl font-black text-azul-bersa text-xs hover:bg-gray-100 transition-colors">VOLVER</button>
            <button
                onClick={handleConfirmarRecepcion}
                disabled={loading}
                className="flex-1 md:flex-none px-12 py-4 bg-naranja-bersa text-white rounded-2xl font-black shadow-xl shadow-violet-500/20 active:scale-95 transition-all uppercase text-xs tracking-widest disabled:opacity-50"
            >
              {loading ? "PROCESANDO..." : "✅ CONFIRMAR"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default OrderDetailModal;