import React from 'react';

const OrderDetailModal = ({ order, onClose, logic, authFetch }) => {
  const { 
    cantidades, setCantidades, 
    referencia, setReferencia, 
    loadingDetails, setLoadingDetails, 
    fetchOrders 
  } = logic;

  // Función interna para procesar la recepción
  const handleConfirmarRecepcion = async () => {
    if (!referencia.trim() || referencia.trim().length !== 8) {
      return alert("⚠️ La Referencia debe tener EXACTAMENTE 8 caracteres.");
    }
    
    if (!confirm(`¿Confirmar recepción de Orden #${order.DocNum}?`)) return;

    setLoadingDetails(true);
    const lineasParaRecibir = order.DocumentLines
      .map(line => ({ 
        LineNum: line.LineNum, 
        Quantity: parseFloat(cantidades[line.LineNum] || 0) 
      }))
      .filter(line => line.Quantity > 0);

    try {
      const response = await authFetch('/api/sap/receive', {
        method: 'POST',
        body: JSON.stringify({ 
          docEntry: order.DocEntry, 
          lines: lineasParaRecibir, 
          numAtCard: referencia 
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`✅ RECEPCIÓN EXITOSA.\n\nEntrada #: ${result.docNum}`);
        onClose(); // Cerrar modal
        fetchOrders(); // Refrescar tabla principal
      } else {
        alert("❌ Error al procesar en SAP.");
      }
    } catch (error) {
      alert("Error de conexión al servidor.");
    } finally {
      setLoadingDetails(false);
    }
  };

  // Función interna para cancelar (mantenemos tu lógica actual)
  const handleCancelar = () => {
    if (confirm("¿Estás seguro de que deseas cancelar esta orden en SAP?")) {
      // Aquí iría tu fetch de cancelación
      alert("Función de cancelación llamada");
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0C2340]/90 backdrop-blur-xl flex justify-center items-center p-4 z-50">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col border-t-[10px] border-[#FF9E1B]">
        
        {/* HEADER DEL MODAL */}
        <div className="p-8 flex justify-between items-center border-b border-gray-100">
          <div className="flex items-center gap-4">
            <span className="text-4xl">📄</span>
            <h2 className="text-2xl font-black text-[#0C2340]">Orden de Compra #{order.DocNum}</h2>
          </div>
          <button onClick={onClose} className="bg-gray-100 hover:bg-red-50 text-gray-400 hover:text-[#EE2737] w-10 h-10 rounded-full flex items-center justify-center transition-all text-2xl font-black">&times;</button>
        </div>

        {/* CONTENIDO SCROLLABLE */}
        <div className="p-8 overflow-y-auto flex-1 space-y-8">
          
          {/* CARDS DE INFORMACIÓN */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-50 p-6 rounded-3xl">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Proveedor</p>
              <p className="font-black text-[#0C2340] text-lg leading-tight">{order.CardName}</p>
            </div>
            
            <div className="bg-[#0C2340] p-6 rounded-3xl text-white shadow-xl">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Almacén de Recepción</p>
              <p className="font-black text-xl leading-tight">
                {order.DocumentLines?.[0]?.WarehouseCode || "N/A"}
              </p>
            </div>

            <div className="bg-violet-50 p-6 rounded-3xl border-2 border-[#FF9E1B]/20">
              <p className="text-[10px] font-black text-[#FF9E1B] uppercase tracking-widest mb-2">Referencia Proveedor (8 Dígitos) *</p>
              <input 
                type="text" 
                maxLength={8} 
                className="w-full bg-transparent font-black text-[#0C2340] text-2xl outline-none placeholder:text-[#FF9E1B]/30 uppercase" 
                placeholder="REQUERIDO" 
                value={referencia} 
                onChange={(e) => setReferencia(e.target.value)} 
              />
            </div>
          </div>

          {/* TABLA DE ARTÍCULOS */}
          <div className="rounded-3xl border-2 border-gray-50 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#f8fafc] border-b-2 border-gray-100">
                <tr>
                  <th className="p-5 text-left text-[10px] font-black text-gray-400 uppercase">Artículo</th>
                  <th className="p-5 text-right text-[10px] font-black text-[#0C2340] uppercase">Precio Unit.</th>
                  <th className="p-5 text-right text-[10px] font-black text-gray-400 uppercase">Pendiente</th>
                  <th className="p-5 text-center text-[10px] font-black text-[#FF9E1B] uppercase">Cantidad a Recibir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {order.DocumentLines?.filter(line => line.RemainingOpenQuantity > 0).map((line) => (
                  <tr key={line.LineNum} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-5">
                      <p className="font-black text-[#0C2340]">{line.ItemDescription}</p>
                      <p className="text-xs text-gray-400 font-bold">{line.ItemCode}</p>
                    </td>
                    <td className="p-5 text-right font-bold text-green-700">
                      ${line.Price?.toLocaleString('es-MX', {minimumFractionDigits: 2})}
                    </td>
                    <td className="p-5 text-right font-black text-[#0C2340] text-xl">{line.RemainingOpenQuantity}</td>
                    <td className="p-5 w-44">
                      <input 
                        type="number" 
                        className="w-full p-3 bg-white border-2 border-gray-200 rounded-2xl text-center font-black text-[#0C2340] focus:border-[#FF9E1B] outline-none" 
                        value={cantidades[line.LineNum] || ''} 
                        onChange={(e) => setCantidades({...cantidades, [line.LineNum]: e.target.value})} 
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FOOTER DE ACCIONES */}
        <div className="p-8 bg-gray-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
          <button 
            onClick={handleCancelar}
            className="text-[#EE2737] hover:bg-red-50 px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
          >
            🚫 Cancelar Orden en SAP
          </button>
          
          <div className="flex gap-4 w-full md:w-auto">
            <button 
              onClick={onClose} 
              className="flex-1 md:flex-none px-10 py-4 bg-white border-2 border-gray-200 text-gray-400 rounded-2xl font-black text-[10px] tracking-widest hover:bg-gray-100"
            >
              CERRAR
            </button>
            <button 
              onClick={handleConfirmarRecepcion}
              disabled={loadingDetails}
              className="flex-1 md:flex-none px-14 py-5 bg-gradient-to-r from-[#159E4F] to-[#0E713A] text-white rounded-2xl font-black shadow-xl active:scale-95 transition-all text-sm flex items-center justify-center gap-4 border-b-4 border-green-800 disabled:opacity-50"
            >
              {loadingDetails ? "PROCESANDO..." : "✅ CONFIRMAR RECEPCIÓN"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailModal;