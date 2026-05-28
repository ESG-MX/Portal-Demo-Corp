// Azure AD (Entra ID) app registration settings.
// Replace CLIENT_ID and TENANT_ID with your own app registration values.
// See: https://learn.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app

const CLIENT_ID = "00000000-0000-0000-0000-000000000001";
const TENANT_ID = "00000000-0000-0000-0000-000000000000";

export const msalConfig = {
    auth: {
        clientId:    CLIENT_ID,
        authority:   `https://login.microsoftonline.com/${TENANT_ID}`,
        redirectUri: window.location.origin,
    },
    cache: {
        cacheLocation:          "sessionStorage",
        storeAuthStateInCookie: false,
    }
};

export const loginRequest = {
    scopes: [
        "openid",
        "profile",
        "User.Read",
        `api://${CLIENT_ID}/access_as_user`
    ]
};
