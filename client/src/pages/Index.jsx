import React from 'react';
import { Link } from "react-router-dom";
import { ShoppingCart, Truck, ClipboardList, Package, Wallet, BarChart3 } from 'lucide-react';

const modulos = [
    { name: 'Ventas',               Icon: ShoppingCart, color: 'bg-rojo-bersa',    path: '/ventas' },
    { name: 'Recepción Mercancía',  Icon: Truck,        color: 'bg-naranja-bersa', path: '/repmerch' },
    { name: 'Inventario',           Icon: ClipboardList,color: 'bg-rojo-bersa',    path: '/inventario' },
    { name: 'Consumo',              Icon: Package,      color: 'bg-naranja-bersa', path: '/consumo' },
    { name: 'Caja Chica',           Icon: Wallet,       color: 'bg-rojo-bersa',    path: '/cajac' },
    { name: 'Reportes',             Icon: BarChart3,    color: 'bg-naranja-bersa', path: '/reportes' },
];

const Index = () => {
    return (
        <div className="h-full flex flex-col justify-center">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {modulos.map(({ name, Icon, color, path }, index) => (
                    <Link
                        key={index}
                        to={path}
                        className={`${color} rounded-2xl shadow-lg flex flex-col items-center justify-center p-6 border border-white/10 hover:brightness-110 transition-all transform hover:scale-[1.02] min-h-[220px] group`}
                    >
                        <Icon size={72} className="text-white/80 mb-4 group-hover:text-white transition-colors" strokeWidth={1.5} />
                        <span className="bg-white text-black font-bold text-sm px-6 py-2 rounded-lg shadow-md uppercase tracking-wide">
                            {name}
                        </span>
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default Index;
