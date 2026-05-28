import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useNotifications } from '../contexts/NotificationContext';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/features/LoadingSpinner';
import BuscadorProveedorSAP from '../components/features/reporteIncidencia/BuscadorProveedorSAP';
import ClasificacionIncidencia from '../components/features/reporteIncidencia/ClasificacionIncidencia';
import ListaArticulosAfectados from '../components/features/reporteIncidencia/ListaArticulosAfectados';
import DropzoneFotos from '../components/features/reporteIncidencia/DropzoneFotos';

const ReporteIncidencia = () => {
  const { userProfile, authFetch, isLoading: authLoading } = useAuth();
  const usuarioActual = userProfile;
  const location = useLocation();
  const prefill = location.state?.prefillData || {};
  const { notifyUser } = useNotifications();
const [formData, setFormData] = useState({
  // Aseguramos que si viene de prefill, se asigne correctamente
  proveedorId: prefill.proveedorId || '',
  proveedorNombre: prefill.proveedorNombre || '',
  poNumber: prefill.poNumber || '',
  docEntry: prefill.docEntry || '', 
  facturaUUID: '',
  almacen: prefill.almacen || '',
  tipoIncidencia: [],
  accion: [],
  descripcion: ''
});
  const [articulos, setArticulos] = useState(
    prefill.articulos && prefill.articulos.length > 0 
      ? prefill.articulos 
      : [{ ItemCode: '', ItemName: '', CantidadAfectada: '', PrecioPO: 0, PrecioFactura: '' }]
  );
  const [fotos, setFotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [almacenes, setAlmacenes] = useState([]);
  useEffect(() => {
    const fetchAlmacenes = async () => {
      try {
        const res = await authFetch.get('/api/entradas/warehouses');
        const formatted = res.data.map(w => ({ value: w.WarehouseCode, label: `${w.WarehouseCode} - ${w.WarehouseName}` }));
        setAlmacenes(formatted);
      } catch (error) { console.error("Error cargando almacenes:", error); }
    };
    fetchAlmacenes();
  }, [authFetch]);
  const loadProveedores = async (inputValue) => {
    if (inputValue && inputValue.length > 0 && inputValue.length < 3) return [];
    try {
      const query = inputValue ? `?q=${inputValue}` : '';
      const res = await authFetch.get(`/api/entradascc/search-vendors${query}`);
      return res.data;
    } catch { return []; }
  };
  const loadPOs = async (inputValue) => {
    if (inputValue && inputValue.length > 0 && inputValue.length < 3) return [];
    try {
      const query = inputValue ? `?docNum=${inputValue}` : '';
      const res = await authFetch.get(`/api/entradas/orders${query}`);
      const list = res.data?.data || res.data || [];
      return list.map(po => ({
        value: po.DocNum,
        label: `PO #${po.DocNum} - ${po.CardName}`, 
        docEntry: po.DocEntry,
        cardCode: po.CardCode,
        cardName: po.CardName
      }));
    } catch (error) {
      console.error("Error al cargar POs:", error);
      return [];
    }
  };
  const loadArticulos = async (inputValue) => {
    if (inputValue && inputValue.length > 0 && inputValue.length < 3) return [];
    try {
      const query = inputValue ? `?q=${inputValue}` : '';
      const res = await authFetch.get(`/api/entradascc/search-items${query}`);
      return res.data;
    } catch { return []; }
  };
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  const handleArticuloChange = (index, field, value) => {
    const nuevosArticulos = [...articulos];
    nuevosArticulos[index][field] = value;
    setArticulos(nuevosArticulos);
  };
  const agregarArticulo = () => {
    setArticulos([...articulos, { ItemCode: '', ItemName: '', CantidadAfectada: '', PrecioPO: 0, PrecioFactura: '' }]);
  };
  const eliminarArticulo = (index) => {
    const nuevosArticulos = articulos.filter((_, i) => i !== index);
    setArticulos(nuevosArticulos);
  };
  useEffect(() => {
    const fetchPODetails = async () => {
      if (!formData.docEntry || !authFetch) return;
      try {
        const res = await authFetch.get(`/api/entradas/orders/${formData.docEntry}`);
        if (res.data && res.data.DocumentLines) {
           const lines = res.data.DocumentLines.map(line => ({
             ItemCode: line.ItemCode,
             ItemName: line.ItemDescription,
             CantidadOriginal: line.RemainingOpenQuantity || line.OpenQuantity || 0,
             CantidadAfectada: line.RemainingOpenQuantity || line.OpenQuantity || 0, // Autocompletar con CantidadOriginal
             PrecioPO: line.Price || 0,
             PrecioFactura: line.Price || 0 // Autocompletar con PrecioPO
           }));
           setArticulos(lines);
        }
      } catch (error) {
        console.error("Error al cargar detalles de la PO:", error);
      }
    };
    fetchPODetails();
  }, [formData.docEntry, authFetch]);
  const handleFotos = (e) => {
    const files = Array.from(e.target.files);
    setFotos(prev => [...prev, ...files]);
  };
  const eliminarFoto = (index) => {
    const nuevasFotos = fotos.filter((_, i) => i !== index);
    setFotos(nuevasFotos);
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMensaje({ tipo: '', texto: '' });
    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => {
        if (key === 'tipoIncidencia' || key === 'accion') {
          const arr = formData[key] || [];
          data.append(key, arr.map(x => x.value).join(', '));
        } else {
          data.append(key, formData[key]);
        }
      });
      data.append('creadoPor', usuarioActual?.email || 'admin@bersa.com'); 
      data.append('articulos', JSON.stringify(articulos));
      fotos.forEach(foto => {
        data.append('evidencias', foto);
      });
      const response = await authFetch.post('/api/incidencias', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setMensaje({ tipo: 'success', texto: 'Incidencia reportada correctamente y enlazada a SAP.' });
      await notifyUser(
        usuarioActual?.email || 'admin@bersa.com',
        'Incidencia Enviada',
        `Tu reporte para el PO #${formData.poNumber} ha sido registrado.`,
        'success',
        '/incidencias'
      );
      setFormData({
        proveedorId: '', proveedorNombre: '', poNumber: '', docEntry: '',
        facturaUUID: '', almacen: '', tipoIncidencia: [],
        accion: [], descripcion: ''
      });
      setArticulos([{ itemCode: '', itemName: '', cantidadAfectada: '' }]);
      setFotos([]);
    } catch (error) {
      console.error(error);
      const errorMsg = error.response?.data?.message || error.response?.data?.mensaje || 'Error al enviar reporte.';
      setMensaje({ tipo: 'error', texto: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-azul-bersa flex items-center justify-center">
        <LoadingSpinner text="Iniciando módulo de incidencias..." />
      </div>
    );
  }

  const role = userProfile?.role?.toLowerCase() || '';
  // Validación de acceso: Permitir a Admin, MP y COMP (Compras) generar incidencias
  if (role.includes('mc')) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[500px]">
        <div className="bg-red-50 text-red-600 p-6 rounded-xl flex flex-col items-center">
          <span className="text-3xl mb-4">🔒</span>
          <h2 className="text-xl font-bold text-azul-bersa">Acceso Denegado</h2>
          <p className="mt-2 text-red-500/80">Tu nivel de acceso no tiene autorización para este módulo.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-azul-bersa p-6 md:p-12 font-sans text-white">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4 mb-2">
            <div className="bg-naranja-bersa p-2 rounded-xl shadow-lg shadow-violet-500/20">
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            </div>
            <h1 className="text-4xl font-black tracking-tight">
                Reporte de <span className="text-naranja-bersa">Incidencia</span>
            </h1>
        </div>
      {mensaje.texto && (
        <div className={`p-4 mb-6 rounded-2xl font-bold text-sm tracking-wide ${mensaje.tipo === 'success' ? 'bg-green-100 text-green-800 border-l-4 border-green-500' : 'bg-red-100 text-red-800 border-l-4 border-red-500'}`}>
          {mensaje.texto}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-8 bg-white p-8 rounded-2xl shadow-md border-t-8 border-naranja-bersa">
        <BuscadorProveedorSAP
          key={userProfile?.username || 'loading'}
          formData={formData}
          setFormData={setFormData}
          handleChange={handleChange}
          almacenes={almacenes}
          loadProveedores={loadProveedores}
          loadPOs={loadPOs}
        />
        <ClasificacionIncidencia
          formData={formData}
          handleChange={handleChange}
        />
        <ListaArticulosAfectados
          articulos={articulos}
          handleArticuloChange={handleArticuloChange}
          agregarArticulo={agregarArticulo}
          eliminarArticulo={eliminarArticulo}
          loadArticulos={loadArticulos}
          tipoIncidencia={formData.tipoIncidencia}
        />
        <DropzoneFotos
          fotos={fotos}
          handleFotos={handleFotos}
          eliminarFoto={eliminarFoto}
        />
        <div className="flex justify-end pt-6 border-t border-gray-100">
          <button
            type="submit" 
            disabled={loading}
            className={`px-10 py-4 rounded-xl font-black uppercase tracking-[0.2em] text-[11px] shadow-lg transition-all active:scale-95 
              ${loading ? 'bg-gray-400 text-gray-200 cursor-not-allowed shadow-none' : 'bg-naranja-bersa text-white hover:bg-violet-700 shadow-naranja-bersa/30'}`}
          >
            {loading ? <div className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full"></div> PROCESANDO...</div> : 'REGISTRAR INCIDENCIA'}
          </button>
        </div>
      </form>
      </div>
    </div>
  );
};
export default ReporteIncidencia;
