const winston = require('winston');
const path = require('path');
const fs = require('fs');

// EN AZURE: Usamos la carpeta /home/LogFiles que siempre es escribible
// LOCAL: Usamos una carpeta logs local
const isAzure = process.env.REGION_NAME || process.env.WEBSITE_SITE_NAME;
const logDir = isAzure ? '/home/LogFiles' : path.join(__dirname, '../../logs');

// Solo intentamos crear la carpeta si NO estamos en Azure (en Azure ya existe)
if (!isAzure && !fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

const customFormat = winston.format.printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
});

const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                customFormat
            )
        }),
        // Estos archivos ahora se guardarán en la ruta segura de Azure
        new winston.transports.File({ 
            filename: path.join(logDir, 'error.log'), 
            level: 'error' 
        }),
        new winston.transports.File({ 
            filename: path.join(logDir, 'combined.log') 
        })
    ]
});

module.exports = logger;