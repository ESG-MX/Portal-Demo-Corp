import React from 'react';
import AsyncSelect from 'react-select/async';
import { customSelectStyles } from '../../../utils/selectStyles';

const ListaArticulosAfectados = ({ articulos, handleArticuloChange, agregarArticulo, eliminarArticulo, loadArticulos, tipoIncidencia = [] }) => {
  const esDiscrepanciaPrecio = tipoIncidencia.some(tipo => tipo.value === 'Discrepancia de Precio');

  return (
    <div>
      <div className="flex justify-between items-center border-b pb-2 mb-4">
        <h2 className="text-lg font-black text-azul-bersa uppercase tracking-widest">3. Artículos Afectados</h2>
        <button type="button" onClick={agregarArticulo} className="text-[10px] font-black tracking-widest uppercase bg-azul-bersa/10 text-azul-bersa px-4 py-2 rounded-xl hover:bg-azul-bersa hover:text-white transition-all shadow-sm active:scale-95">
          + Agregar Artículo
        </button>
      </div>

      <div className="space-y-4">
        {articulos.map((art, index) => (
          <div key={index} className="flex flex-col md:flex-row gap-4 items-start md:items-end bg-gray-50/50 p-4 rounded-2xl border border-gray-200 shadow-inner">
            
            {/* ARTICULO SAP */}
            <div className="w-full md:flex-1">
              <label className="block text-[10px] font-black tracking-widest uppercase text-gray-700 mb-1">Artículo SAP</label>
              <AsyncSelect 
                cacheOptions 
                defaultOptions={true}
                loadOptions={loadArticulos} 
                styles={customSelectStyles}
                placeholder="BUSCAR CÓDIGO O DESCRIPCIÓN..."
                onChange={(selected) => {
                  if (selected) {
                    // CORRECCIÓN: Usar PascalCase
                    handleArticuloChange(index, 'ItemCode', selected.value);
                    const nameOnly = selected.label.split(' - ')[1] || selected.label;
                    handleArticuloChange(index, 'ItemName', nameOnly);
                  } else {
                    handleArticuloChange(index, 'ItemCode', '');
                    handleArticuloChange(index, 'ItemName', '');
                  }
                }}
                // CORRECCIÓN: Usar PascalCase
                value={art.ItemCode ? { value: art.ItemCode, label: `${art.ItemCode} - ${art.ItemName}` } : null}
              />
            </div>

            <div className="grid grid-cols-2 md:flex gap-4 md:items-end">
              
              {/* CANTIDAD ORIGINAL (Solo lectura) */}
              <div className="w-full md:w-24 shrink-0">
                <label className="block text-[10px] font-black tracking-widest uppercase text-gray-700 mb-1">Cant. Orig</label>
                <input 
                  type="number" 
                  readOnly 
                  // CORRECCIÓN: Usar PascalCase 'CantidadOriginal'
                  value={art.CantidadOriginal || 0} 
                  className="w-full rounded-xl border-gray-200 bg-gray-100 p-[0.6rem] border font-black text-gray-600 text-sm text-center shadow-none outline-none transition-all"
                />
              </div>

              {/* PRECIO PO (Solo lectura) */}
              <div className="w-full md:w-24 shrink-0">
                <label className="block text-[10px] font-black tracking-widest uppercase text-gray-700 mb-1">Precio PO</label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] font-bold">$</span>
                  <input 
                    type="number" 
                    readOnly 
                    // CORRECCIÓN: Usar PascalCase 'PrecioPO'
                    value={art.PrecioPO || 0} 
                    className="w-full rounded-xl border-gray-200 bg-gray-100 p-[0.6rem] pl-5 border font-black text-gray-600 text-sm text-center shadow-none outline-none transition-all"
                  />
                </div>
              </div>

              {/* CANTIDAD AFECTADA */}
              <div className="w-full md:w-28 shrink-0">
                <label className="block text-[10px] font-black tracking-widest uppercase text-gray-700 mb-1">Cant. Afec</label>
                <input 
                  type="number" 
                  step="0.01" 
                  // CORRECCIÓN: Usar PascalCase 'CantidadAfectada'
                  value={art.CantidadAfectada} 
                  onChange={(e) => handleArticuloChange(index, 'CantidadAfectada', e.target.value)} 
                  required 
                  className="w-full rounded-xl border-gray-300 bg-white p-[0.6rem] border font-black text-azul-bersa text-sm text-center shadow-sm focus:border-naranja-bersa focus:ring-naranja-bersa outline-none transition-all"
                />
              </div>

              {/* PRECIO FACTURA (Opcional según tipo) */}
              <div className="w-full md:w-28 shrink-0">
                <label className="block text-[10px] font-black tracking-widest uppercase text-gray-700 mb-1">Prec. Fact</label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-azul-bersa">$</span>
                  <input 
                    type="number" 
                    step="0.01" 
                    // CORRECCIÓN: Usar PascalCase 'PrecioFactura'
                    value={art.PrecioFactura} 
                    onChange={(e) => handleArticuloChange(index, 'PrecioFactura', e.target.value)} 
                    placeholder="0.00"
                    className="w-full rounded-xl p-[0.6rem] pl-5 border font-black text-sm text-center transition-all outline-none border-gray-300 bg-white text-azul-bersa focus:border-naranja-bersa focus:ring-naranja-bersa shadow-sm"
                  />
                </div>
              </div>
            </div>

            {/* BOTÓN ELIMINAR */}
            {articulos.length > 1 && (
              <button type="button" onClick={() => eliminarArticulo(index)} className="text-red-500 hover:text-white hover:bg-red-500 w-full md:w-auto p-[0.6rem] md:px-4 rounded-xl transition-all border border-red-200 shadow-sm font-black active:scale-95 h-[42px] mt-auto">
                <span className="md:hidden mr-2">ELIMINAR ARTÍCULO</span>&times;
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ListaArticulosAfectados;