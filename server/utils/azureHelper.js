const { BlobServiceClient, generateBlobSASQueryParameters, BlobSASPermissions, StorageSharedKeyCredential } = require("@azure/storage-blob");

// Extraemos la información de la cadena de conexión que ya tienes en Azure
const connString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const blobServiceClient = BlobServiceClient.fromConnectionString(connString);

const obtenerUrlSegura = (blobUrl) => {
    try {
        if (!blobUrl) return null;
        
        const urlParts = new URL(blobUrl);
        const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME;
        // El nombre del blob es todo lo que sigue después del nombre del contenedor en la URL
        const blobName = urlParts.pathname.replace(`/${containerName}/`, "");

        // Generar permisos de lectura por 10 minutos
        const sasToken = generateBlobSASQueryParameters({
            containerName,
            blobName,
            permissions: BlobSASPermissions.parse("r"),
            expiresOn: new Date(new Date().valueOf() + 10 * 60 * 1000), 
        }, blobServiceClient.credential).toString();

        return `${blobUrl}?${sasToken}`;
    } catch (error) {
        console.error("Error generando SAS:", error);
        return blobUrl;
    }
};

module.exports = { obtenerUrlSegura };