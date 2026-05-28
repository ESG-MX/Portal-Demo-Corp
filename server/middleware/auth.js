const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const axios = require('axios');
const { getConnection, sql } = require('../config/datab');
require('dotenv').config();

const TENANT_ID   = process.env.AZURE_TENANT_ID?.trim();
const CLIENT_ID   = process.env.AZURE_CLIENT_ID?.trim();
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET?.trim();

const ROLE_LEVELS = {
    'admin':   5,
    'mc':      4,
    'mp':      3,
    'manager': 2,
    'comp':    2,
    'user':    1,
    'usuario': 1
};

const DEMO_ADMIN_EMAIL = process.env.DEMO_ADMIN_EMAIL || 'admin@democorp.com';

const userCache = {};
const CACHE_TTL = 1000 * 60 * 60;

const jwks = jwksClient({
    jwksUri: `https://login.microsoftonline.com/${TENANT_ID}/discovery/v2.0/keys`,
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 10,
    requestOptions: { timeout: 30000 }
});

function getKey(header, callback) {
    jwks.getSigningKey(header.kid, (err, key) => {
        if (err) return callback(err);
        callback(null, key.getPublicKey());
    });
}

let cachedGraphToken = null;
let graphTokenExpires = 0;

async function getGraphToken() {
    if (cachedGraphToken && Date.now() < graphTokenExpires) return cachedGraphToken;
    const params = new URLSearchParams();
    params.append('client_id', CLIENT_ID);
    params.append('client_secret', CLIENT_SECRET);
    params.append('scope', 'https://graph.microsoft.com/.default');
    params.append('grant_type', 'client_credentials');
    const res = await axios.post(`https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`, params);
    cachedGraphToken  = res.data.access_token;
    graphTokenExpires = Date.now() + (res.data.expires_in * 1000) - 60000;
    return cachedGraphToken;
}

const validateUserWithGraph = async (req, res, next) => {
    // Demo mode: skip Azure AD validation and inject a mock admin user.
    if (process.env.DEMO_MODE === 'true') {
        req.user = {
            email:          DEMO_ADMIN_EMAIL,
            name:           'Admin Demo',
            role:           'admin',
            office:         'Corporativo',
            verifiedOffice: 'Corporativo',
            photo:          null
        };
        return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'No token provided' });

    const token = authHeader.split(' ')[1];
    const validationOptions = {
        audience:   [CLIENT_ID, `api://${CLIENT_ID}`],
        issuer:     [
            `https://sts.windows.net/${TENANT_ID}/`,
            `https://login.microsoftonline.com/${TENANT_ID}/v2.0`,
            `https://login.microsoftonline.com/${TENANT_ID}/v2.0/`
        ],
        algorithms: ['RS256']
    };

    jwt.verify(token, getKey, validationOptions, async (err, decoded) => {
        if (err) {
            const raw = jwt.decode(token);
            console.error('❌ JWT inválido — Aud:', raw?.aud, 'Iss:', raw?.iss);
            return res.status(403).json({ message: 'Token inválido', error: err.message });
        }

        const userEmail = (decoded.preferred_username || decoded.upn || decoded.email || '').toLowerCase().trim();
        const userName  = decoded.name || 'Usuario';

        if (userCache[userEmail]?.expire > Date.now()) {
            req.user = userCache[userEmail].data;
            return next();
        }

        let office     = 'Sin Oficina';
        let userRole   = 'user';
        let photoBase64 = null;

        try {
            const pool   = await getConnection();
            const result = await pool.request()
                .input('email', sql.VarChar, userEmail)
                .query('SELECT rol FROM Usuarios WHERE LOWER(LTRIM(RTRIM(email))) = LOWER(@email)');

            if (result.recordset.length > 0) {
                userRole = result.recordset[0].rol.toLowerCase().trim();
            }

            if (userEmail === DEMO_ADMIN_EMAIL) userRole = 'admin';

            try {
                const graphToken = await getGraphToken();
                const [graphRes, photoRes] = await Promise.allSettled([
                    axios.get(`https://graph.microsoft.com/v1.0/users/${userEmail}?$select=officeLocation`, {
                        headers: { Authorization: `Bearer ${graphToken}` }
                    }),
                    axios.get(`https://graph.microsoft.com/v1.0/users/${userEmail}/photo/$value`, {
                        headers: { Authorization: `Bearer ${graphToken}` },
                        responseType: 'arraybuffer'
                    })
                ]);
                if (graphRes.status === 'fulfilled') office = graphRes.value.data.officeLocation || 'Sin Oficina';
                if (photoRes.status === 'fulfilled') {
                    photoBase64 = `data:image/jpeg;base64,${Buffer.from(photoRes.value.data).toString('base64')}`;
                }
            } catch {}

            if (userRole === 'admin') office = 'Corporativo';

            const finalProfile = { email: userEmail, name: userName, role: userRole, office, verifiedOffice: office, photo: photoBase64 };
            userCache[userEmail] = { data: finalProfile, expire: Date.now() + CACHE_TTL };
            req.user = finalProfile;
            next();
        } catch (error) {
            console.error('❌ Error DB/Auth:', error.message);
            res.status(500).json({ message: 'Error interno de servidor' });
        }
    });
};

const authorize = (...roles) => (req, res, next) => {
    const userRole       = (req.user?.role || 'user').toLowerCase().trim();
    const currentLevel   = ROLE_LEVELS[userRole] || 0;
    const minLevel       = Math.min(...roles.map(r => ROLE_LEVELS[r.toLowerCase().trim()] || 99));
    if (currentLevel >= minLevel) return next();
    res.status(403).json({ message: 'Permisos insuficientes', details: `Nivel requerido: ${minLevel}, tu nivel: ${currentLevel}` });
};

module.exports = { validateUserWithGraph, authorize };
