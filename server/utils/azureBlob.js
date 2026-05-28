const { BlobServiceClient, generateBlobSASQueryParameters, BlobSASPermissions, StorageSharedKeyCredential } = require("@azure/storage-blob");

const connString = process.env.AZURE_STORAGE_CONNECTION_STRING; // Configúrala en tus variables de entorno de Azure
const blobServiceClient = BlobServiceClient.fromConnectionString(connString);

const getSasUrl = (blobUrl) => {
    try {
        // Extraer el nombre del contenedor y el blob de la URL
        const urlParts = new URL(blobUrl);
        const [containerName, ...blobPathParts] = urlParts.pathname.split('/').filter(Boolean);
        const blobName = blobPathParts.join('/');

        const sharedKeyCredential = new StorageSharedKeyCredential(
            blobServiceClient.accountName, 
            process.env.AZURE_STORAGE_KEY // Tu Key 1 de Azure
        );

        const sasToken = generateBlobSASQueryParameters({
            containerName,
            blobName,
            permissions: BlobSASPermissions.parse("r"),
            expiresOn: new Date(new Date().valueOf() + 3600 * 1000), // Expira en 1 hora
        }, sharedKeyCredential).toString();

        return `${blobUrl}?${sasToken}`;
    } catch (e) {
        return blobUrl; // Si falla, devuelve la original
    }
};

module.exports = { getSasUrl };