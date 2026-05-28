const { z } = require('zod');
const logger = require('../utils/logger');
require('dotenv').config();
process.env.DB_NAME = process.env.DB_NAME || process.env.DB_DATABASE;

const isMockMode = process.env.USE_MOCK_DB === 'true';

// In mock/demo mode, DB and SAP credentials are not required.
const envSchema = isMockMode
    ? z.object({
        NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
        PORT: z.string().default('8080'),
        USE_MOCK_DB: z.string().default('true'),
        DEMO_MODE: z.string().default('true'),
    })
    : z.object({
        NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
        PORT: z.string().default('8080'),
        DB_USER:       z.string().min(1, 'DB_USER es requerido'),
        DB_PASSWORD:   z.string().min(1, 'DB_PASSWORD es requerido'),
        DB_SERVER:     z.string().min(1, 'DB_SERVER es requerido'),
        DB_NAME:       z.string().min(1, 'DB_NAME o DB_DATABASE es requerido'),
        SAP_BASE_URL:  z.string().url('SAP_BASE_URL debe ser una URL válida'),
        SAP_COMPANY_DB:z.string().min(1, 'SAP_COMPANY_DB es requerido'),
        SAP_USER:      z.string().min(1, 'SAP_USER es requerido'),
        SAP_PASSWORD:  z.string().min(1, 'SAP_PASSWORD es requerido'),
    });

const parseEnv = () => {
    try {
        return envSchema.parse(process.env);
    } catch (error) {
        logger.error('❌ ERROR: Al validar variables de entorno:');
        const issues = error.errors || error.issues || [];
        issues.forEach(err => logger.error(`  - ${err.path.join('.')}: ${err.message}`));
        logger.error('El servidor se apagará debido a un problema con el entorno.');
        process.exit(1);
    }
};

module.exports = { env: parseEnv() };
