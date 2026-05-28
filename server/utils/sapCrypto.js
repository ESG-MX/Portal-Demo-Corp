const crypto = require('crypto');
require('dotenv').config();

// In demo mode a local key is used instead of Azure Key Vault.
// In production, replace this with the real Key Vault implementation below.

const algorithm = 'aes-256-cbc';

function getLocalKey() {
    const raw = process.env.SAP_ENCRYPT_KEY_LOCAL || 'demo-local-key-replace-in-production!!';
    return Buffer.alloc(32, raw, 'utf-8');
}

async function getMasterKey() {
    if (process.env.USE_MOCK_DB === 'true') {
        return getLocalKey();
    }

    // Production path: fetch key from Azure Key Vault
    const { DefaultAzureCredential } = require('@azure/identity');
    const { SecretClient } = require('@azure/keyvault-secrets');
    const vaultName = process.env.KEY_VAULT_NAME || 'demo-keyvault';
    const url = `https://${vaultName}.vault.azure.net`;
    const credential = new DefaultAzureCredential();
    const client = new SecretClient(url, credential);
    const secret = await client.getSecret('SAP-ENCRYPT-KEY');
    return Buffer.alloc(32, secret.value, 'utf-8');
}

async function encryptSapPassword(plainText) {
    const key = await getMasterKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return { encryptedPassword: encrypted, iv: iv.toString('hex') };
}

async function decryptSapPassword(encryptedPassword, iv) {
    const key = await getMasterKey();
    const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(iv, 'hex'));
    let decrypted = decipher.update(encryptedPassword, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

module.exports = { encryptSapPassword, decryptSapPassword };
