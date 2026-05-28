require('dotenv').config();

// In demo/portfolio mode the app uses a mock SAP service.
if (process.env.USE_MOCK_DB === 'true') {
    module.exports = require('../mock/mockSapService');
    return;
}

const axios = require('axios');
const https = require('https');
const logger = require('../utils/logger');
const { decryptSapPassword } = require('../utils/sapCrypto');
const { getConnection, sql } = require('../config/datab');

const agent = new https.Agent({ rejectUnauthorized: false });
const sapAxios = axios.create({
    baseURL: process.env.SAP_BASE_URL,
    httpsAgent: agent,
    headers: { 'Content-Type': 'application/json' }
});

let sessions = {};
let loginPromises = {};

async function getCredentials(userEmail) {
    try {
        const pool = await getConnection();
        const result = await pool.request()
            .input('email', sql.VarChar, userEmail.toLowerCase().trim())
            .query(`
                SELECT SapUsername, SapPasswordEncrypted, Iv
                FROM SapUserMapping
                WHERE LOWER(LTRIM(RTRIM(EmailAzure))) = @email
                AND IsLicensed = 1
            `);

        if (result.recordset.length > 0) {
            const mapped = result.recordset[0];
            const decryptedPass = await decryptSapPassword(mapped.SapPasswordEncrypted, mapped.Iv);
            const cleanPass = decryptedPass.replace(/\0/g, '').trim();
            logger.info(`🔑 [SAP Service] Licencia propia detectada para: ${userEmail} -> ${mapped.SapUsername}`);
            return { user: mapped.SapUsername.trim(), pass: cleanPass };
        }

        logger.info(`👥 [SAP Service] Usando usuario genérico para: ${userEmail || 'Desconocido'}`);
        return {
            user: process.env.SAP_USER.trim(),
            pass: process.env.SAP_PASSWORD.trim()
        };
    } catch (error) {
        logger.error(`❌ [SAP Service] Error consultando SQL Server: ${error.message}`);
        return { user: process.env.SAP_USER, pass: process.env.SAP_PASSWORD };
    }
}

async function login(userEmail) {
    if (loginPromises[userEmail]) {
        logger.info(`⏳ [SAP Service] Login en proceso para ${userEmail}, esperando...`);
        return loginPromises[userEmail];
    }

    loginPromises[userEmail] = (async () => {
        let currentUser = 'Desconocido';
        try {
            const { user, pass } = await getCredentials(userEmail);
            currentUser = user;
            logger.info(`🔄 [SAP Service] Intentando Login en SAP B1 con usuario: ${user}...`);
            const response = await sapAxios.post('Login', {
                CompanyDB: process.env.SAP_COMPANY_DB,
                UserName: user,
                Password: pass
            });
            const cookie = response.headers['set-cookie']
                ? response.headers['set-cookie'].join('; ')
                : null;
            sessions[userEmail] = cookie;
            logger.info(`✅ [SAP Service] Sesión establecida exitosamente para: ${user}.`);
            return cookie;
        } catch (error) {
            const errorDetail = error.response?.data?.error?.message?.value || error.message;
            logger.error(`❌ [SAP Service] Error en Login (${currentUser}): ${errorDetail}`);
            sessions[userEmail] = null;
            throw error;
        } finally {
            delete loginPromises[userEmail];
        }
    })();

    return loginPromises[userEmail];
}

const sapRequest = async (userEmail, method, endpoint, data = null, params = null) => {
    if (!sessions[userEmail]) {
        await login(userEmail);
    }
    try {
        return await sapAxios({
            method,
            url: endpoint,
            data,
            params,
            headers: { Cookie: sessions[userEmail] }
        });
    } catch (error) {
        if (error.response && error.response.status === 401) {
            logger.warn(`⚠️ [SAP Service] Sesión 401 para ${userEmail}. Reintentando login...`);
            await login(userEmail);
            return await sapAxios({
                method,
                url: endpoint,
                data,
                params,
                headers: { Cookie: sessions[userEmail] }
            });
        }
        throw error;
    }
};

module.exports = { sapRequest };
