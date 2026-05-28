import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth'; 
import { toast } from 'sonner';

export const useAdmin = () => {
    const [items, setItems] = useState([]);
    const [pax, setPax] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { authFetch } = useAuth(); 
    const fetchAdminData = async (endpoint) => {
        const response = await authFetch.get(`/api/admin/${endpoint}`);
        return response.data; 
    };
    const loadAllData = async (role) => { 
        setLoading(true);
    try {
            if (['admin', 'mc', 'mp', 'manager'].includes(role)) {
                const [itemsData, paxData] = await Promise.all([
                    fetchAdminData('items-raw'),
                    fetchAdminData('items-pax')
                ]);
                setItems(itemsData);
                setPax(paxData);
            }
            if (role === 'admin') {
                const usersData = await fetchAdminData('users');
                setUsers(usersData);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const updateItem = useCallback(async (id, data) => {
        if (!authFetch) return false;
        try {
            setLoading(true);
            await authFetch.put(`/api/admin/items-raw/${id}`, data);
            toast.success("Producto actualizado con éxito");
            const updatedItems = await fetchAdminData('items-raw');
            setItems(updatedItems);
            return true;
        } catch (err) {
            toast.error("Error al actualizar: " + (err.response?.data?.message || err.message));
            return false;
        } finally {
            setLoading(false);
        }
    }, [authFetch]);

    return { items, setItems, pax, users, loading, error, loadAllData, updateItem };
};